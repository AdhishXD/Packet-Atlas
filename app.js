const canvas = document.querySelector('#globeCanvas');
const ctx = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
function restoreViewport(top) {
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  scrollTo(0, top);
  root.style.scrollBehavior = previousBehavior;
}
function resetInitialScroll() {
  if (!location.hash) restoreViewport(0);
}
window.addEventListener('pageshow', resetInitialScroll);
requestAnimationFrame(resetInitialScroll);

// Buttons update the current view; they never act as navigation. Keep their
// effects anchored to the exact viewport position where the interaction began.
document.addEventListener('click', event => {
  if (!(event.target instanceof Element) || !event.target.closest('button')) return;
  const top = scrollY;
  requestAnimationFrame(() => requestAnimationFrame(() => restoreViewport(top)));
}, true);

const $ = (selector) => document.querySelector(selector);
const searchForm = $('#searchForm');
const queryInput = $('#queryInput');
const targetInput = $('#targetInput');
const traceButton = searchForm.querySelector('.trace-button');
const traceButtonLabel = traceButton.querySelector('span');
const playButton = $('#playButton');
const restartButton = $('#restartButton');
const speedSelect = $('#speedSelect');
const layerItems = [...document.querySelectorAll('.layer-stack li')];
const labLayerButtons = [...document.querySelectorAll('[data-lab-layer]')];
let worldGeo = null;
let lessonQuery = 'How does DNS work?';
let lessonTargetHost = 'search.example';
let lessonTargetIp = '203.0.113.10';
let lessonSourceIp = 'Your public IP';
let lessonBytes = new TextEncoder().encode(lessonQuery);
let lessonCipher = new Uint8Array([0x8f,0x29,0xa4,0x71,0x0c,0xe3,0xb8,0x55]);
let labPinned = false;

fetch('/data/countries-110m.geojson')
  .then(response => response.ok ? response.json() : Promise.reject(new Error('World geometry unavailable')))
  .then(data => { worldGeo = data; })
  .catch(() => { worldGeo = null; });

const places = {};
let livePlaceKeys = [];

const learningStages = [
  { kicker:'Layer 7 · Application', title:'Your question becomes data', description:'The browser turns your text into an HTTPS request and asks DNS where the chosen destination lives.', protocol:'HTTPS · DNS', distance:'0 km', layers:[7], duration:2100 },
  { kicker:'Layers 6 → 1 · Encapsulation', title:'Seven layers add context', description:'TLS protects the message, TCP numbers it, IP addresses it, Wi‑Fi frames it, and physical media carry the bits.', protocol:'TLS · TCP · IP', distance:'0 km', layers:[6,5,4,3,2,1], duration:3200, cascade:'down' },
  { kicker:'Layers 1 → 7 · Decapsulation', title:'Your browser rebuilds the answer', description:'Headers are checked and removed in reverse. TLS decrypts the content and the application renders the result.', protocol:'TCP · TLS · HTTP', distance:'Measured route', layers:[1,2,3,4,5,6,7], duration:3200, cascade:'up', response:true },
  { kicker:'Journey complete', title:'The invisible trip is complete', description:'The exchange can finish in a fraction of a second—this version slows it down so every system stays visible.', protocol:'Response ready', distance:'Measured route', layers:[7], duration:1600, response:true, complete:true }
];
let stages = learningStages;

let state = {
  running:false, paused:false, complete:false, stage:0, stageStart:0, pausedAt:0,
  query:'', speed:1, progress:0, elapsed:0, centerLon:98, centerLat:18,
  targetLon:98, targetLat:18, cameraVelocityLon:0, cameraVelocityLat:0, lastFrame:0
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
}

function normalizeLon(value) {
  let lon = value;
  while (lon > 180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}

function project(point, width, height) {
  const radius = Math.min(width * .42, height * .42);
  const cx = width * .47, cy = height * .48;
  const projection = d3.geoOrthographic().translate([cx,cy]).scale(radius).rotate([-state.centerLon,-state.centerLat,0]).clipAngle(90);
  const xy = projection([point.lon,point.lat]) || [cx,cy];
  const visible = d3.geoDistance([state.centerLon,state.centerLat],[point.lon,point.lat]) < Math.PI/2;
  return { x:xy[0], y:xy[1], z:visible ? 1 : -1, radius, cx, cy };
}

function interpolate(a,b,t) {
  const point=d3.geoInterpolate([a.lon,a.lat],[b.lon,b.lat])(t);
  return { lon:point[0],lat:point[1] };
}

function routePointsForStage(stage){
  if(!stage?.from||!stage?.to)return[];
  return[places[stage.from],...(stage.via||[]),places[stage.to]].filter(Boolean);
}

function routeDistanceKm(points){
  let distance=0;
  for(let index=0;index<points.length-1;index++){
    distance+=d3.geoDistance([points[index].lon,points[index].lat],[points[index+1].lon,points[index+1].lat])*6371.0088;
  }
  return distance;
}

function formatDistance(km){
  if(!Number.isFinite(km)||km<=0)return'0 km';
  return`≈ ${Math.round(km).toLocaleString()} km`;
}

function addMappedDistances(journey,targetStage){
  let cumulative=0;
  let outbound=0;
  let includesInferredSpan=false;
  journey.forEach(stage=>{
    const points=routePointsForStage(stage);
    if(points.length>1){
      cumulative+=routeDistanceKm(points);
      if(stage.inferred)includesInferredSpan=true;
    }
    stage.distanceKm=cumulative;
    stage.distance=formatDistance(cumulative);
    if(stage===targetStage)outbound=cumulative;
  });
  journey.outboundDistanceKm=outbound;
  journey.totalMappedDistanceKm=cumulative;
  journey.includesInferredSpan=includesInferredSpan;
  return journey;
}

function routePointAt(points,progress){
  if(points.length<2)return points[0]||{lon:0,lat:0};
  const distances=[];let total=0;
  for(let index=0;index<points.length-1;index++){
    const distance=d3.geoDistance([points[index].lon,points[index].lat],[points[index+1].lon,points[index+1].lat]);
    distances.push(distance);total+=distance;
  }
  let remaining=Math.min(1,Math.max(0,progress))*total;
  for(let index=0;index<distances.length;index++){
    if(remaining<=distances[index]||index===distances.length-1)return interpolate(points[index],points[index+1],distances[index]?remaining/distances[index]:1);
    remaining-=distances[index];
  }
  return points.at(-1);
}

function drawCurve(points, projection, color, lineWidth=1, dash=[], progress=1) {
  ctx.save();
  ctx.strokeStyle=color;
  ctx.lineWidth=lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();
  const coordinates=[];
  const clampedProgress=Math.min(1,Math.max(0,progress)),samples=Math.max(64,(points.length-1)*36);
  for(let index=0;index<=samples;index++){
    const point=routePointAt(points,(index/samples)*clampedProgress);coordinates.push([point.lon,point.lat]);
  }
  d3.geoPath(projection,ctx)({type:'LineString',coordinates});
  ctx.stroke();
  ctx.restore();
}

function drawGlobe(time) {
  const width=canvas.clientWidth, height=canvas.clientHeight;
  ctx.clearRect(0,0,width,height);
  const center=project({lat:0,lon:state.centerLon},width,height);
  const {cx,cy,radius}=center;
  const projection=d3.geoOrthographic().translate([cx,cy]).scale(radius).rotate([-state.centerLon,-state.centerLat,0]).clipAngle(90).precision(.35);
  const path=d3.geoPath(projection,ctx);
  const ocean=ctx.createRadialGradient(cx-radius*.28,cy-radius*.34,radius*.08,cx,cy,radius);
  ocean.addColorStop(0,'#174766');ocean.addColorStop(.48,'#0c2a41');ocean.addColorStop(1,'#03101b');
  ctx.save();ctx.shadowColor='rgba(76,190,255,.3)';ctx.shadowBlur=50;ctx.beginPath();path({type:'Sphere'});ctx.fillStyle=ocean;ctx.fill();ctx.restore();
  ctx.save();ctx.beginPath();path({type:'Sphere'});ctx.clip();

  ctx.beginPath();path(d3.geoGraticule10());ctx.strokeStyle='rgba(125,189,220,.09)';ctx.lineWidth=.7;ctx.stroke();
  if(worldGeo){
    ctx.beginPath();path(worldGeo);ctx.fillStyle='rgba(34,78,82,.78)';ctx.fill();
    ctx.beginPath();path(worldGeo);ctx.strokeStyle='rgba(168,221,222,.34)';ctx.lineWidth=.55;ctx.stroke();
  }

  Object.values(places).forEach(place=>{
    const p=project(place,width,height); if(p.z<=0)return;
    if(place.modeled){
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.PI/4);ctx.fillStyle='rgba(255,184,107,.25)';ctx.fillRect(-5,-5,10,10);ctx.fillStyle='#ffb86b';ctx.fillRect(-2.4,-2.4,4.8,4.8);ctx.restore();
    }else if(place.estimated){
      ctx.strokeStyle='rgba(99,230,255,.9)';ctx.lineWidth=1.3;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.fillStyle='#b9e9f6';ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,Math.PI*2);ctx.fill();
    }else{
      ctx.fillStyle='rgba(163,226,243,.18)';ctx.beginPath();ctx.arc(p.x,p.y,7,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#b9e9f6';ctx.beginPath();ctx.arc(p.x,p.y,2.1,0,Math.PI*2);ctx.fill();
    }
  });

  const stage=stages[state.stage];
  if(stage?.via?.length){
    ctx.save();ctx.font='600 11px -apple-system, BlinkMacSystemFont, sans-serif';ctx.textBaseline='middle';
    stage.via.forEach(waypoint=>{const p=project(waypoint,width,height);if(p.z<=0)return;const label=waypoint.name.replace(' cable landing','');const measure=ctx.measureText(label);ctx.fillStyle='rgba(5,15,24,.82)';ctx.fillRect(p.x+8,p.y-10,measure.width+10,20);ctx.fillStyle='#ffd29b';ctx.fillText(label,p.x+13,p.y);});
    ctx.restore();
  }
  if(state.running||state.complete){
    const completedEnd=state.complete?stages.length:state.stage;
    stages.slice(0,completedEnd).forEach(completed=>{
      if(!completed.from||!completed.to)return;
      const route=routePointsForStage(completed);if(route.length<2)return;
      if(completed.inferred)drawCurve(route,projection,'rgba(174,196,210,.48)',1.5,[4,6]);
      else drawCurve(route,projection,completed.response?'rgba(121,239,189,.52)':'rgba(99,230,255,.5)',2);
    });
  }
  if(state.running && stage && stage.from && stage.to){
    const route=routePointsForStage(stage);
    const eased=reducedMotion?1:state.progress*state.progress*(3-2*state.progress);
    drawCurve(route,projection,stage.response?'rgba(121,239,189,.18)':'rgba(99,230,255,.18)',1.2,[3,5]);
    if(stage.cable)drawCurve(route,projection,'rgba(156,190,205,.3)',1,[4,5],eased);
    drawCurve(route,projection,stage.inferred?'rgba(174,196,210,.75)':stage.response?'rgba(121,239,189,.9)':'rgba(99,230,255,.92)',stage.inferred?1.6:2.4,stage.inferred?[4,6]:[],eased);
    const packet=project(routePointAt(route,eased),width,height);
    if(packet.z>0){
      const color=stage.response?'#79efbd':'#63e6ff';
      ctx.save();ctx.shadowColor=color;ctx.shadowBlur=20;ctx.fillStyle=color;ctx.beginPath();ctx.arc(packet.x,packet.y,4.4,0,Math.PI*2);ctx.fill();ctx.restore();
      const trail=project(routePointAt(route,Math.max(0,eased-.045)),width,height);
      if(trail.z>0){ctx.strokeStyle=color;ctx.globalAlpha=.5;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(trail.x,trail.y);ctx.lineTo(packet.x,packet.y);ctx.stroke();ctx.globalAlpha=1;}
    }
  }else if(state.running&&stage?.at&&places[stage.at]){
    const checkpoint=project(places[stage.at],width,height);
    if(checkpoint.z>0){
      const color=stage.response?'#79efbd':'#63e6ff';
      const pulse=reducedMotion?6:6+Math.sin(time/220)*1.4;
      ctx.save();ctx.globalAlpha=.28;ctx.fillStyle=color;ctx.beginPath();ctx.arc(checkpoint.x,checkpoint.y,pulse+5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;ctx.shadowColor=color;ctx.shadowBlur=18;ctx.beginPath();ctx.arc(checkpoint.x,checkpoint.y,4,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  ctx.restore();
  ctx.strokeStyle='rgba(154,219,242,.28)';ctx.lineWidth=1;ctx.beginPath();path({type:'Sphere'});ctx.stroke();
  const shine=ctx.createLinearGradient(cx-radius,cy-radius,cx+radius,cy+radius);shine.addColorStop(0,'rgba(255,255,255,.11)');shine.addColorStop(.35,'rgba(255,255,255,0)');
  ctx.fillStyle=shine;ctx.beginPath();ctx.arc(cx,cy,radius-1,0,Math.PI*2);ctx.fill();
}

function updateStageUI() {
  const stage=stages[state.stage];
  $('#stageKicker').textContent=stage.kicker;
  $('#stageTitle').textContent=stage.title;
  $('#stageDescription').textContent=stage.description;
  $('#protocolMetric').textContent=stage.protocol;
  $('#distanceMetric').textContent=stage.distance;
  $('#stepCount').textContent=`${state.stage+1} of ${stages.length}`;
  $('#timelineStatus').textContent=stage.title;
  const location=stage.to || stage.at || stage.from;
  if(location) $('#originLabel strong').textContent=places[location].name;
  layerItems.forEach(item=>item.classList.toggle('active',stage.layers.includes(Number(item.dataset.layer))));
  const focusPlace=stage.to ? places[stage.to] : stage.at ? places[stage.at] : null;
  if(focusPlace){state.targetLon=focusPlace.lon;state.targetLat=Math.max(-45,Math.min(55,focusPlace.lat*.58));}
  if(stage.layers?.length&&!labPinned) selectLabLayer(stage.layers[0],false);
}

function buildLiveStages(trace) {
  const measured = trace.hops;
  const responding = measured.filter(hop => hop.ip);
  const newPlaces = {};
  livePlaceKeys.forEach(key => delete places[key]);
  if (Number.isFinite(trace.source?.latitude) && Number.isFinite(trace.source?.longitude)) {
    newPlaces.traceOrigin = {
      name:`Site server · ${trace.source.locationLabel}`,
      lat:trace.source.latitude, lon:trace.source.longitude, type:'server', ip:trace.source.ip
    };
  }
  measured.forEach(hop => {
    if (!Number.isFinite(hop.latitude) || !Number.isFinite(hop.longitude)) return;
    newPlaces[`hop${hop.hop}`] = {
      name: hop.locationLabel || hop.hostname || `Network hop ${hop.hop}`,
      lat: hop.latitude,
      lon: hop.longitude,
      type: hop.ip === trace.targetIp ? 'server' : 'router',
      ip: hop.ip
    };
  });
  const targetEstimate=trace.targetEstimate;
  const targetEstimateUsable=!trace.reachedTarget&&targetEstimate&&['plausible','estimated'].includes(targetEstimate.locationConfidence)&&Number.isFinite(targetEstimate.latitude)&&Number.isFinite(targetEstimate.longitude);
  if(targetEstimateUsable){
    newPlaces.traceTarget={name:`Destination estimate · ${targetEstimate.locationLabel || trace.targetHost}`,lat:targetEstimate.latitude,lon:targetEstimate.longitude,type:'server',ip:trace.targetIp,estimated:true};
  }
  livePlaceKeys = Object.keys(newPlaces);
  Object.assign(places, newPlaces);

  const locatedKeys = measured.filter(hop => Number.isFinite(hop.latitude) && Number.isFinite(hop.longitude)).map(hop => `hop${hop.hop}`);
  const originKey = newPlaces.traceOrigin ? 'traceOrigin' : (locatedKeys[0] || 'chennai');
  let lastLocatedKey = originKey;
  const networkStages = measured.map((hop, index) => {
    const key = `hop${hop.hop}`;
    const hasLocation = Number.isFinite(hop.latitude) && Number.isFinite(hop.longitude);
    const previousLocatedKey = lastLocatedKey;
    if (hasLocation) lastLocatedKey = key;
    const label = hop.locationLabel || (hop.ip ? 'Private or unresolved location' : 'Router did not respond');
    const position = hasLocation
      ? (previousLocatedKey ? { from:previousLocatedKey, to:key } : { at:key })
      : { at:previousLocatedKey || originKey };
    const cable=false;
    const via=[];
    const confidence = hop.locationConfidence === 'plausible' ? 'Latency-compatible approximate location.' : hop.locationConfidence === 'inconsistent' ? hop.locationReason : 'Approximate IP registration location; latency verification was unavailable.';
    return {
      kicker: hop.ip === trace.targetIp ? 'Destination reached' : hop.ip ? `Measured router · hop ${hop.hop}` : `No reply · hop ${hop.hop}`,
      title: hop.ip === trace.targetIp ? `Reached ${trace.targetHost}` : label,
      description: `${hop.ip || 'No public IP returned'}${hop.hostname && hop.hostname !== hop.ip ? ` · ${hop.hostname}` : ''}${hop.isp ? ` · ${hop.isp}` : ''}. ${hasLocation ? confidence : hop.ip ? (hop.locationReason || 'This hop’s physical location could not be resolved, so the globe does not invent a position.') : 'This router did not answer traceroute, so its identity and position remain unknown.'}${hop.rttMs==null?'':` Measured round-trip time: ${hop.rttMs.toFixed(1)} ms.`}`,
      protocol: hop.ip || 'Silent hop',
      distance: '0 km',
      layers: [3,2,1],
      duration: 1750,
      ...position,
      cable,
      via
    };
  });

  const firstKey = originKey;
  const lastKey = locatedKeys.at(-1) || firstKey;
  const visibleEndKey=targetEstimateUsable?'traceTarget':lastKey;
  const lastPlace=places[lastKey],targetPlace=places.traceTarget;
  const targetSharesLastRegion=Boolean(targetEstimateUsable&&lastPlace&&targetPlace&&Math.abs(lastPlace.lat-targetPlace.lat)<.25&&Math.abs(lastPlace.lon-targetPlace.lon)<.25);
  const filteredTargetDescription=Number.isFinite(trace.tcpRttMs)
    ? `UDP traceroute ended at the last responding router, but a TCP test reached ${trace.targetIp} in ${trace.tcpRttMs.toFixed(1)} ms. The dashed span connects known endpoints only; routers inside it remain unknown.`
    : `UDP traceroute ended at the last responding router. The destination IP estimate matches the last visible region, but TCP port 443 did not answer this check, so no hidden routers are invented.`;
  const targetStage=trace.reachedTarget
    ? { kicker:'Destination IP reached', title:`${trace.targetHost} receives the request`, description:`Traceroute reached ${trace.targetIp}. Its marker is an approximate, latency-compatible IP location—not a claim about a specific server building.`, protocol:'HTTPS', distance:`${responding.length} responding hops`, layers:[7,6,5,4], duration:2100, at:lastKey }
    : targetEstimateUsable
      ? { kicker:'Traceroute filtered', title:'The destination stops answering route probes', description:filteredTargetDescription, protocol:Number.isFinite(trace.tcpRttMs)?'TCP 443':'UDP filtered', distance:targetSharesLastRegion?'Same approximate region':'Unobserved gap', layers:[4,3,2,1], duration:2400, ...(targetSharesLastRegion?{at:'traceTarget'}:{from:lastKey,to:'traceTarget',inferred:true}) }
      : { kicker:'Traceroute filtered', title:'The remaining route is unknown', description:`${trace.targetHost} did not answer UDP traceroute and its physical location could not be verified. Packet Atlas stops at the last responding router instead of inventing the missing path.`, protocol:'UDP filtered', distance:'Unknown', layers:[3,2,1], duration:2400, at:lastKey };
  const journey = [
    { ...learningStages[0], title:'Your question becomes an HTTPS request', at:originKey },
    { ...learningStages[1], at:originKey },
    ...networkStages,
    targetStage,
    ...(targetStage.from&&targetStage.to?[{...targetStage,from:targetStage.to,to:targetStage.from,response:true,title:'The response returns through hidden routers',description:'The destination can answer HTTPS even when routers ignore traceroute. This dashed return span connects known endpoints only; its internal hops and exact path are unknown.'}]:[]),
    ...networkStages.slice().reverse().map((stage,index) => {
      const reversePosition=stage.from&&stage.to?{from:stage.to,to:stage.from,via:[...(stage.via||[])].reverse()}:{at:stage.at||firstKey};
      return { ...stage, ...reversePosition, kicker:stage.cable?'Return path model · subsea fiber':`Return path model · step ${index+1}`, title:index===networkStages.length-1?'Returning to the site server':stage.title, description:`Response traffic returns toward the requester. Standard traceroute observes only the outbound direction, so this return path is a model and may differ from the real network.`, response:true };
    }),
    { ...learningStages[2], at:firstKey, description:`The visible return animation is a teaching model from ${places[visibleEndKey]?.name || 'the last known endpoint'}; the real return route can differ and may include hidden routers.` },
    { ...learningStages[3], at:firstKey }
  ];
  return addMappedDistances(journey,targetStage);
}

async function loadLiveTrace(targetHost) {
  $('#routeMode').textContent='Measuring live hops…';
  $('#routeScope').textContent='Waiting for responding routers';
  try {
    const response = await fetch(`/api/trace?target=${encodeURIComponent(targetHost)}`, { headers:{ Accept:'application/json' } });
    if (!response.ok) { const problem=await response.json().catch(()=>({})); throw new Error(problem.detail || `Trace returned ${response.status}`); }
    const trace = await response.json();
    lessonTargetHost=trace.targetHost;
    lessonTargetIp=trace.targetIp;
    lessonSourceIp=trace.source?.ip||lessonSourceIp;
    const activeLesson=Number(labLayerButtons.find(button=>button.getAttribute('aria-selected')==='true')?.dataset.labLayer||7);
    selectLabLayer(activeLesson);
    const hasMeasuredHop=trace.hops?.some(hop => hop.ip);
    const hasTargetEstimate=Number.isFinite(trace.targetEstimate?.latitude)&&Number.isFinite(trace.targetEstimate?.longitude);
    if (!hasMeasuredHop&&!hasTargetEstimate) throw new Error('No responding hops or usable destination estimate');
    stages = buildLiveStages(trace);
    const rejected=trace.hops.filter(hop=>hop.locationConfidence==='inconsistent').length;
    $('#routeMode').textContent='Measured hops · checked locations';
    const mappedDistance=formatDistance(stages.outboundDistanceKm);
    const distanceQualifier=stages.includesInferredSpan?'great-circle lower bound':'great-circle sum';
    $('#routeScope').textContent=`${trace.respondingHops} responding hops · ${trace.source?.locationLabel || 'site server'} → ${trace.targetHost} · ${mappedDistance} outbound ${distanceQualifier} · ${trace.reachedTarget?'destination answered traceroute':'destination filtered traceroute'}${rejected?` · ${rejected} impossible location${rejected===1?'':'s'} hidden`:''}`;
    return true;
  } catch (error) {
    const origin=places.traceOrigin?'traceOrigin':null;
    stages = [
      { ...learningStages[0], at:origin, title:'Your question becomes an HTTPS request' },
      { ...learningStages[1], at:origin },
      { kicker:'Trace unavailable', title:'No physical route was invented', description:`${error.message}. Packet Atlas will not substitute a predefined country or cable path.`, protocol:'No live route', distance:'Unknown', layers:[3], duration:2200, at:origin },
      { ...learningStages[3], at:origin }
    ];
    $('#routeMode').textContent='Trace unavailable';
    $('#routeScope').textContent=error.message;
    return false;
  }
}

const layerLessons={
  7:{icon:'Aa',kicker:'Application data',title:'The browser gives your words structure',description:'The query becomes part of an HTTP request. Headers describe the destination, language, accepted formats, and other context the server needs.',inputLabel:'Your words',outputLabel:'HTTP request',input:()=>lessonQuery,output:()=>`GET /search?q=${encodeURIComponent(lessonQuery)}\nHost: ${lessonTargetHost}\nAccept: text/html`,parts:[['HTTP headers','header-part'],['Query data','payload-part']],changed:'A method, path, and headers surround the query.',why:'Both browser and server now agree on how to interpret the message.',unit:'Data',note:'The example uses an HTTP-style request. HTTP/2 and HTTP/3 encode the same ideas in a more compact form.'},
  6:{icon:'TLS',kicker:'Presentation · TLS',title:'Readable bytes become ciphertext',description:'UTF‑8 first converts characters into bytes. TLS then uses an authenticated cipher so observers can see packet sizes and endpoints, but not the question itself.',inputLabel:'UTF‑8 bytes',outputLabel:'AES‑GCM ciphertext sample',input:()=>hex(lessonBytes,56),output:()=>hex(lessonCipher,72),parts:[['TLS record','header-part'],['Nonce','trailer-part'],['Encrypted query','payload-part'],['Auth tag','trailer-part']],changed:'The readable byte pattern becomes pseudorandom ciphertext plus an authentication tag.',why:'Encryption protects confidentiality; the tag detects tampering.',unit:'TLS record',note:'This is a real local AES‑GCM demonstration with a temporary key. Production TLS 1.3 performs a key exchange and encrypts the complete HTTP record.'},
  5:{icon:'↔',kicker:'Session state',title:'Both endpoints keep the conversation alive',description:'TLS handshake messages negotiate algorithms and shared keys. The connection then maintains state so later records belong to the same secure conversation.',inputLabel:'Handshake',outputLabel:'Established state',input:()=>`ClientHello → ServerHello\nkey agreement + certificate`,output:()=>`session: established\ncipher: AES-256-GCM\nkey: shared, never transmitted`,parts:[['Session ID','header-part'],['TLS state','payload-part']],changed:'A shared connection context is created around the encrypted records.',why:'Messages can be associated with the correct secure conversation.',unit:'Session',note:'The OSI session layer is conceptual; real web stacks often combine this responsibility with TLS and the application.'},
  4:{icon:'TCP',kicker:'Transport · TCP',title:'The encrypted stream is split and numbered',description:'TCP divides the byte stream into segments. Ports identify applications; sequence and acknowledgement numbers keep data ordered and reveal what needs retransmission.',inputLabel:'Encrypted stream',outputLabel:'TCP segment',input:()=>`${lessonCipher.length} encrypted bytes`,output:()=>`src 52144 → dst 443\nseq 184320 · ack 77102\nflags ACK, PSH`,parts:[['TCP header','header-part'],['Seq 184320','header-part'],['TLS record','payload-part']],changed:'Ports, sequence numbers, acknowledgements, flags, and a checksum are added.',why:'The receiver can order segments, control flow, and recover from loss.',unit:'Segment',note:'HTTP/3 uses QUIC over UDP instead of TCP, but it still provides reliable streams, encryption, and congestion control.'},
  3:{icon:'IP',kicker:'Network · IP',title:'The segment receives global addresses',description:'IP adds source and destination addresses plus a hop limit. Routers inspect this header and forward the packet toward the next network.',inputLabel:'TCP segment',outputLabel:'IPv4 packet header',input:()=>`TCP header + ${lessonCipher.length} encrypted bytes`,output:()=>`src ${lessonSourceIp}\ndst ${lessonTargetIp}\nTTL 64 · protocol TCP`,parts:[['IP header','header-part'],['TCP header','header-part'],['Encrypted data','payload-part']],changed:'Source, destination, protocol, length, and time-to-live fields are added.',why:'Routers now know where the packet should go and when to discard a looping packet.',unit:'Packet',note:'The source is the trace server’s public IP; the destination is the address resolved for the website you entered.'},
  2:{icon:'MAC',kicker:'Data link · Ethernet / Wi‑Fi',title:'Each local link wraps the packet in a frame',description:'A frame uses link-local hardware addresses to cross one Wi‑Fi or Ethernet segment. A router removes it and creates a new frame for the next link.',inputLabel:'IP packet',outputLabel:'Local frame',input:()=>`IP packet for ${lessonTargetIp}`,output:()=>`dst MAC 6C:3B:6B:••:••:••\nsrc MAC A4:83:E7:••:••:••\nFCS 0x91C2`,parts:[['MAC header','header-part'],['IP packet','payload-part'],['FCS','trailer-part']],changed:'Next-hop MAC addresses and an error-detection trailer surround the IP packet.',why:'The packet can cross the current physical network and corruption can be detected.',unit:'Frame',note:'MAC addresses change at every routed link. The destination IP generally stays the same unless translation or tunneling occurs.'},
  1:{icon:'01',kicker:'Physical signal',title:'Bits become radio, electricity, or light',description:'The network interface encodes zeros and ones as changes in a physical signal. Wi‑Fi uses radio; copper uses voltage; fiber uses tightly controlled pulses of light.',inputLabel:'Frame bits',outputLabel:'Signal pattern',input:()=>bits(lessonBytes,64),output:()=>`radio symbols → electrical waveform → optical pulses`,parts:[['10110010 01101101','payload-part']],changed:'A logical bitstream becomes timed changes in amplitude, phase, frequency, voltage, or light.',why:'Physical media can carry the frame between network interfaces.',unit:'Bits',note:'The animation is symbolic: real modulation encodes multiple bits per symbol and uses error correction, synchronization, and parallel channels.'}
};

function hex(bytes,limit=64){const value=[...bytes].map(byte=>byte.toString(16).padStart(2,'0')).join(' ');return value.length>limit?`${value.slice(0,limit)}…`:value;}
function bits(bytes,limit=64){const value=[...bytes].map(byte=>byte.toString(2).padStart(8,'0')).join(' ');return value.length>limit?`${value.slice(0,limit)}…`:value;}

async function preparePacketLesson(query,targetHost){
  lessonQuery=query || lessonQuery;lessonBytes=new TextEncoder().encode(lessonQuery);
  if(targetHost){
    try{lessonTargetHost=new URL(targetHost.includes('://')?targetHost:`https://${targetHost}`).hostname||lessonTargetHost;}
    catch{lessonTargetHost=targetHost;}
  }
  try{
    const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
    const iv=crypto.getRandomValues(new Uint8Array(12));
    lessonCipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,lessonBytes));
  }catch{lessonCipher=lessonBytes.map((byte,index)=>byte^(0xa7+index)%256);}
  const selected=Number(labLayerButtons.find(button=>button.getAttribute('aria-selected')==='true')?.dataset.labLayer||7);
  selectLabLayer(selected,false);
}

function selectLabLayer(layer){
  const lesson=layerLessons[layer];if(!lesson)return;
  labLayerButtons.forEach(button=>button.setAttribute('aria-selected',String(Number(button.dataset.labLayer)===layer)));
  $('#labStepLabel').textContent=`Layer ${layer} of 7`;
  $('#labIcon').textContent=lesson.icon;$('#labKicker').textContent=lesson.kicker;$('#labTitle').textContent=lesson.title;$('#labDescription').textContent=lesson.description;
  $('#labInputLabel').textContent=lesson.inputLabel;$('#labOutputLabel').textContent=lesson.outputLabel;$('#labInput').textContent=lesson.input();$('#labOutput').textContent=lesson.output();
  $('#labChanged').textContent=lesson.changed;$('#labWhy').textContent=lesson.why;$('#labUnit').textContent=lesson.unit;$('#labNote').textContent=lesson.note;
  const anatomy=$('#packetAnatomy');anatomy.replaceChildren();
  lesson.parts.forEach(([label,className],index)=>{const part=document.createElement('span');part.className=`packet-part ${className}`;part.textContent=label;part.style.animationDelay=`${index*.055}s`;anatomy.append(part);});
  $('#signalVisual').classList.toggle('visible',layer===1);
  $('#labPrevious').disabled=layer===7;$('#labNext').disabled=layer===1;$('#labNext').innerHTML=layer===1?'At the wire':'Next layer <span>→</span>';
}

function totalDuration() { return stages.reduce((sum,s)=>sum+s.duration,0); }
function beforeDuration(index) { return stages.slice(0,index).reduce((sum,s)=>sum+s.duration,0); }

function animate(now) {
  const dt=state.lastFrame?Math.min(.034,(now-state.lastFrame)/1000):.016;state.lastFrame=now;
  if(state.running && !state.paused && !state.complete){
    const stage=stages[state.stage];
    const elapsed=(now-state.stageStart)*state.speed;
    state.progress=Math.min(1,elapsed/stage.duration);
    state.elapsed=beforeDuration(state.stage)+Math.min(elapsed,stage.duration);
    const whole=Math.min(1,state.elapsed/totalDuration());
    $('#timelineFill').style.width=`${whole*100}%`;
    $('#timelineDot').style.left=`${whole*100}%`;
    $('#timelinePercent').textContent=`${Math.round(whole*100)}%`;
    $('#timeMetric').textContent=`${Math.round(state.elapsed/38)} ms`;
    const activeRoute=routePointsForStage(stage);
    if(activeRoute.length>1){
      const cameraProgress=reducedMotion?1:state.progress*state.progress*(3-2*state.progress);
      const cameraPoint=routePointAt(activeRoute,cameraProgress);
      state.targetLon=cameraPoint.lon;state.targetLat=Math.max(-45,Math.min(55,cameraPoint.lat*.58));
    }
    const lonDelta=normalizeLon(state.targetLon-state.centerLon),latDelta=state.targetLat-state.centerLat;
    if(reducedMotion){state.centerLon=state.targetLon;state.centerLat=state.targetLat;}
    else{
      const response=7.2,damping=2*response;
      state.cameraVelocityLon+=(response*response*lonDelta-damping*state.cameraVelocityLon)*dt;
      state.cameraVelocityLat+=(response*response*latDelta-damping*state.cameraVelocityLat)*dt;
      state.centerLon=normalizeLon(state.centerLon+state.cameraVelocityLon*dt);
      state.centerLat+=state.cameraVelocityLat*dt;
    }
    if(state.progress>=1){
      if(stage.complete){ finishJourney(); }
      else { state.stage++;state.progress=0;state.stageStart=now;updateStageUI(); }
    }
  }
  drawGlobe(now);
  requestAnimationFrame(animate);
}

async function startJourney(query, targetHost, restart=false) {
  if(traceButton.disabled&&!restart)return;
  state.query=query || state.query || 'How does a search travel?';
  labPinned=false;
  preparePacketLesson(state.query,targetHost);
  if (!restart) {
    traceButton.disabled=true;
    traceButton.classList.add('loading');
    searchForm.setAttribute('aria-busy','true');
    traceButtonLabel.textContent='Tracing website…';
    try { await loadLiveTrace(targetHost); }
    finally {
      traceButton.disabled=false;
      traceButton.classList.remove('loading');
      searchForm.removeAttribute('aria-busy');
      traceButtonLabel.textContent='Trace search';
    }
  }
  state.running=true;state.paused=false;state.complete=false;state.stage=0;state.progress=0;state.elapsed=0;state.stageStart=performance.now();state.centerLon=98;state.centerLat=18;state.targetLon=98;state.targetLat=18;state.cameraVelocityLon=0;state.cameraVelocityLat=0;
  playButton.classList.add('playing');playButton.setAttribute('aria-label','Pause simulation');
  $('#answerSection').hidden=true;
  updateStageUI();
}

function finishJourney(){
  state.complete=true;state.running=false;state.progress=1;
  playButton.classList.remove('playing');playButton.setAttribute('aria-label','Replay simulation');
  $('#timelineFill').style.width='100%';$('#timelineDot').style.left='100%';$('#timelinePercent').textContent='100%';
  $('#answerQuestion').textContent=`“${state.query}”`;
  $('#answerText').textContent=answerFor(state.query);
  $('#answerSection').hidden=false;
  if(!reducedMotion) $('#answerSection').animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:450,easing:'cubic-bezier(.2,.8,.2,1)'});
}

function answerFor(query){
  const q=query.toLowerCase();
  if(q.includes('dns')) return 'DNS is the internet’s naming system: resolvers translate a human-readable domain into the IP address that routers can use.';
  if(q.includes('ocean')||q.includes('cable')) return 'Most intercontinental traffic travels as light through fiber-optic cables on the seabed. Armored sections protect shallow-water landings; repeaters amplify signals across long distances.';
  if(q.includes('osi')) return 'The OSI model separates network communication into seven conceptual layers, from application data down to physical signals, making complex systems easier to reason about and troubleshoot.';
  if(q.includes('tcp')) return 'TCP creates a reliable byte stream using sequence numbers, acknowledgements, flow control, and retransmission when packets are lost.';
  return `A real search service would now return results for “${query}”. This study prototype keeps the text in your browser and visualizes the network journey instead of contacting a search server.`;
}

searchForm.addEventListener('submit',(event)=>{event.preventDefault();const query=queryInput.value.trim(),target=targetInput.value.trim();if(!query){queryInput.focus({preventScroll:true});return;}if(!target){targetInput.focus({preventScroll:true});return;}startJourney(query,target);});
document.querySelectorAll('[data-query]').forEach(button=>button.addEventListener('click',()=>{queryInput.value=button.dataset.query;targetInput.value=button.dataset.target;startJourney(button.dataset.query,button.dataset.target);}));
playButton.addEventListener('click',()=>{
  if(state.complete||!state.running){startJourney(queryInput.value.trim()||state.query,targetInput.value.trim(),true);return;}
  if(state.paused){state.paused=false;state.stageStart=performance.now()-state.pausedAt/state.speed;playButton.classList.add('playing');playButton.setAttribute('aria-label','Pause simulation');}
  else{state.paused=true;state.pausedAt=state.progress*stages[state.stage].duration;playButton.classList.remove('playing');playButton.setAttribute('aria-label','Resume simulation');$('#timelineStatus').textContent='Paused';}
});
restartButton.addEventListener('click',()=>startJourney(queryInput.value.trim()||state.query,targetInput.value.trim(),true));
speedSelect.addEventListener('change',()=>{const old=state.speed;const elapsed=performance.now()-state.stageStart;state.speed=Number(speedSelect.value);state.stageStart=performance.now()-(elapsed*old/state.speed);});
$('#traceAgain').addEventListener('click',()=>{queryInput.value='';queryInput.focus({preventScroll:true});});

function openSheet(title,body){
  $('#sheetTitle').textContent=title;$('#sheetBody').textContent=body;$('#sheetScrim').hidden=false;$('#aboutPanel').hidden=false;$('#infoButton').setAttribute('aria-expanded','true');
  if(!reducedMotion) $('#aboutPanel').animate([{opacity:0,transform:'translate(-50%,-47%) scale(.97)',filter:'blur(8px)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',filter:'blur(0)'}],{duration:350,easing:'cubic-bezier(.2,.8,.2,1)'});
  $('#closeSheet').focus({preventScroll:true});
}
function closeSheet(){ $('#sheetScrim').hidden=true;$('#aboutPanel').hidden=true;$('#infoButton').setAttribute('aria-expanded','false');$('#infoButton').focus({preventScroll:true}); }
$('#infoButton').addEventListener('click',()=>openSheet('A model, not a packet capture','Packet Atlas keeps every query in your browser. It animates a representative journey so you can study encapsulation, addressing, routing, physical media, server processing, and decapsulation without collecting traffic.'));
$('#closeSheet').addEventListener('click',closeSheet);$('#sheetScrim').addEventListener('click',closeSheet);
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#aboutPanel').hidden)closeSheet();});

const topics={
  local:['Inside the local network','Your device uses ARP or neighbor discovery to find the gateway, wraps IP packets in local frames, and sends them over Wi‑Fi or Ethernet. The router may translate a private address to a public one using NAT.'],
  dns:['DNS is a distributed directory','A recursive resolver checks its cache, then may ask root, top-level-domain, and authoritative name servers. The answer includes a time-to-live so it can be reused for a while.'],
  cable:['Glass fiber on the seabed','Cable ships survey a safe route, lower the cable onto deep ocean floor, and bury or armor it near coasts. Optical repeaters along long spans keep the light signal readable.'],
  server:['The response may follow another route','Servers often answer through a CDN edge. TCP or QUIC manages delivery, TLS protects the content, and the browser parses bytes into HTML, styles, images, and pixels.']
};
document.querySelectorAll('.learn-more').forEach(button=>button.addEventListener('click',()=>openSheet(...topics[button.dataset.topic])));
$('#expandLayers').addEventListener('click',()=>{const expanded=$('#expandLayers').getAttribute('aria-expanded')==='true';$('#expandLayers').setAttribute('aria-expanded',String(!expanded));$('#expandLayers').textContent=expanded?'View all 7':'Showing 7 layers';layerItems.forEach(item=>item.style.display='grid');});
labLayerButtons.forEach(button=>button.addEventListener('click',()=>{labPinned=true;selectLabLayer(Number(button.dataset.labLayer));}));
$('#labPrevious').addEventListener('click',()=>{labPinned=true;const layer=Number(labLayerButtons.find(button=>button.getAttribute('aria-selected')==='true')?.dataset.labLayer||7);selectLabLayer(Math.min(7,layer+1),false);});
$('#labNext').addEventListener('click',()=>{labPinned=true;const layer=Number(labLayerButtons.find(button=>button.getAttribute('aria-selected')==='true')?.dataset.labLayer||7);selectLabLayer(Math.max(1,layer-1),false);});

new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();
preparePacketLesson(lessonQuery);
requestAnimationFrame(animate);
