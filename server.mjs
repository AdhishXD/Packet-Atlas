import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { lookup } from 'node:dns/promises';
import { spawn } from 'node:child_process';
import net from 'node:net';

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const maxHops = Math.min(Number(process.env.TRACE_MAX_HOPS || 18), 24);
const traceTimeoutMs = Math.min(Math.max(Number(process.env.TRACE_TIMEOUT_MS || 9000), 3000), 20000);
const allowedOrigin = String(process.env.ALLOWED_ORIGIN || '').replace(/\/$/, '');
const geoCache = new Map();
const geoCacheTtlMs = 6 * 60 * 60 * 1000;

const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml',
  '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp'
};

function runTraceroute(host) {
  return new Promise((resolve, reject) => {
    const args = process.platform === 'darwin'
      ? ['-n','-q','1','-m',String(maxHops),'-w','1',host]
      : ['-n','-q','1','-m',String(maxHops),'-w','1',host];
    const child = spawn('traceroute', args, { stdio:['ignore','pipe','pipe'] });
    let output = '', error = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), traceTimeoutMs);
    child.stdout.on('data', chunk => output += chunk);
    child.stderr.on('data', chunk => error += chunk);
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timer);
      if (!output && code) reject(new Error(error || `traceroute exited ${code}`));
      else resolve(output);
    });
  });
}

function measureTcpRtt(host, port=443) {
  return new Promise(resolve => {
    const started = performance.now();
    const socket = net.createConnection({ host, port });
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(5000, () => finish(null));
    socket.once('connect', () => finish(performance.now() - started));
    socket.once('error', error => {
      const elapsed = performance.now() - started;
      finish(['ECONNREFUSED','ECONNRESET'].includes(error.code) && elapsed < 1500 ? elapsed : null);
    });
  });
}

function parseTrace(text) {
  return text.split('\n').map(line => {
    const number = line.match(/^\s*(\d+)\s+/);
    if (!number) return null;
    const ip = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/);
    const rtt = line.match(/([\d.]+)\s*ms/);
    return { hop:Number(number[1]), ip:ip?.[0] || null, rttMs:rtt ? Number(rtt[1]) : null };
  }).filter(Boolean);
}

function isPrivateIp(ip) {
  if (!ip || net.isIP(ip) !== 4) return true;
  const [a,b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19));
}

function normalizeTarget(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Choose a public destination hostname for this trace');
  let hostname = raw;
  try { hostname = new URL(raw.includes('://') ? raw : `https://${raw}`).hostname; }
  catch { throw new Error('Enter a valid public hostname, such as wikipedia.org'); }
  hostname = hostname.toLowerCase().replace(/\.$/, '');
  if (hostname.length > 253 || !hostname.includes('.') || !/^[a-z0-9.-]+$/.test(hostname) || hostname.split('.').some(label => !label || label.length > 63 || label.startsWith('-') || label.endsWith('-'))) {
    throw new Error('Enter a valid public hostname, such as wikipedia.org');
  }
  return hostname;
}

function haversineKm(a, b) {
  const radians = degrees => degrees * Math.PI / 180;
  const lat1 = radians(a.latitude), lat2 = radians(b.latitude);
  const dLat = lat2 - lat1, dLon = radians(b.longitude - a.longitude);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function assessLocation(source, hop) {
  if (!Number.isFinite(hop.latitude) || !Number.isFinite(hop.longitude)) return hop;
  if (hop.geoEvidence?.status !== 'consensus') {
    return {
      ...hop,
      reportedLatitude:hop.latitude,
      reportedLongitude:hop.longitude,
      reportedLocationLabel:hop.locationLabel,
      latitude:null,
      longitude:null,
      locationLabel:'Physical location unverified',
      locationConfidence:'unverified',
      locationReason:hop.geoEvidence?.reason || 'Fewer than two independent IP-location sources agreed, so this point is not plotted.'
    };
  }
  if (!source || !Number.isFinite(source.latitude) || !Number.isFinite(source.longitude) || !Number.isFinite(hop.rttMs)) {
    return { ...hop, locationConfidence:'consensus', locationReason:`${hop.geoEvidence.reason} Latency was unavailable for a physical plausibility check.` };
  }
  const geoDistanceKm = haversineKm(source, hop);
  // Light travels about 200 km/ms in fiber. RTT includes the return trip and routing overhead,
  // so RTT × 100 km is a generous one-way ceiling; the margin accommodates noisy measurements.
  const maximumPlausibleKm = Math.max(350, hop.rttMs * 135 + 250);
  if (geoDistanceKm <= maximumPlausibleKm) {
    return { ...hop, geoDistanceKm, maximumPlausibleKm, locationConfidence:'verified-estimate', locationReason:`${hop.geoEvidence.reason} The coordinate is also physically compatible with the measured round-trip time.` };
  }
  return {
    ...hop,
    reportedLatitude:hop.latitude,
    reportedLongitude:hop.longitude,
    reportedLocationLabel:hop.locationLabel,
    latitude:null,
    longitude:null,
    locationLabel:'Physical location uncertain',
    geoDistanceKm,
    maximumPlausibleKm,
    locationConfidence:'inconsistent',
    locationReason:`The IP database reports ${hop.locationLabel || 'a distant location'}, but ${hop.rttMs.toFixed(1)} ms RTT cannot physically cover about ${Math.round(geoDistanceKm).toLocaleString('en-US')} km. Latency only constrains this hop to roughly ${Math.round(maximumPlausibleKm).toLocaleString('en-US')} route-km from the trace origin, so the reported point is not plotted.`
  };
}

function normalizeGeo(source, data) {
  const latitude=Number(data.latitude ?? data.lat);
  const longitude=Number(data.longitude ?? data.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    source, latitude, longitude,
    city:data.city || null,
    region:data.region || data.region_name || null,
    country:data.country_name || data.country || null,
    countryCode:data.country_code || data.country_code2 || null,
    isp:data.org || data.connection?.isp || data.connection?.org || null,
    asn:data.asn || data.connection?.asn || null
  };
}

async function fetchJson(url) {
  try {
    const response=await fetch(url,{ signal:AbortSignal.timeout(5000), headers:{ 'User-Agent':'Packet-Atlas/1.0 educational tracer' } });
    if(!response.ok)return null;
    return await response.json();
  } catch { return null; }
}

async function geolocate(ip) {
  if (isPrivateIp(ip)) return { private:true, locationLabel:'Private network' };
  const cached=geoCache.get(ip);
  if(cached&&Date.now()-cached.savedAt<geoCacheTtlMs)return cached.value;
  const encoded=encodeURIComponent(ip);
  const [who,api]=await Promise.all([
    fetchJson(`https://ipwho.is/${encoded}`),
    fetchJson(`https://ipapi.co/${encoded}/json/`)
  ]);
  const samples=[
    who?.success === false ? null : normalizeGeo('IPWho',who || {}),
    api?.error ? null : normalizeGeo('IPAPI',api || {})
  ].filter(Boolean);
  if(!samples.length)return { geoEvidence:{ status:'missing',providers:[],reason:'No IP-location source returned a usable coordinate.' } };
  const primary=samples[0];
  const base={
    latitude:primary.latitude,longitude:primary.longitude,
    locationLabel:[primary.city,primary.region,primary.country].filter(Boolean).join(', '),
    isp:primary.isp,asn:primary.asn,countryCode:primary.countryCode
  };
  if(samples.length<2){
    const value={...base,geoEvidence:{status:'single-source',providers:samples.map(item=>item.source),reason:`Only ${primary.source} returned a coordinate; one database is not enough to claim a physical location.`}};
    geoCache.set(ip,{savedAt:Date.now(),value});return value;
  }
  const disagreementKm=haversineKm(samples[0],samples[1]);
  if(disagreementKm>250){
    const value={...base,geoEvidence:{status:'disputed',providers:samples.map(item=>item.source),disagreementKm,reason:`IPWho and IPAPI disagree by about ${Math.round(disagreementKm).toLocaleString('en-US')} km, so Packet Atlas withholds the coordinate.`}};
    geoCache.set(ip,{savedAt:Date.now(),value});return value;
  }
  const value={...base,geoEvidence:{status:'consensus',providers:samples.map(item=>item.source),disagreementKm,reason:`IPWho and IPAPI agree within about ${Math.max(1,Math.round(disagreementKm)).toLocaleString('en-US')} km.`}};
  geoCache.set(ip,{savedAt:Date.now(),value});return value;
}

function deliveryNetworkLabel(value='') {
  const text=String(value).toLowerCase();
  const matches=[['akamai','Akamai'],['cloudflare','Cloudflare'],['fastly','Fastly'],['cloudfront','Amazon CloudFront'],['amazon','Amazon Web Services'],['imperva','Imperva'],['edgecast','Edgio'],['google','Google'],['microsoft','Microsoft Azure'],['cdn','a CDN']];
  return matches.find(([needle])=>text.includes(needle))?.[1] || null;
}

async function locateTraceSource() {
  const discovery=await fetchJson('https://ipwho.is/');
  if(!discovery?.success || !discovery.ip)return null;
  const location=await geolocate(discovery.ip);
  if(!Number.isFinite(location.latitude)||!Number.isFinite(location.longitude))return null;
  return {ip:discovery.ip,...location};
}

async function tracePayload(requestedTarget) {
  const targetHost = normalizeTarget(requestedTarget);
  const destination = await lookup(targetHost, { family:4 });
  if (isPrivateIp(destination.address)) throw new Error('The destination must resolve to a public IPv4 address');
  const sourcePromise = locateTraceSource();
  const targetGeoPromise = geolocate(destination.address);
  const tcpRttPromise = Promise.all([measureTcpRtt(destination.address,443),measureTcpRtt(destination.address,80)]);
  let hops;
  try { hops = parseTrace(await runTraceroute(destination.address)); }
  catch { hops = [{ hop:1, ip:destination.address, rttMs:null, limited:true }]; }
  const source = await sourcePromise;
  const geolocated = await Promise.all(hops.map(async hop => ({ ...hop, ...(hop.ip ? await geolocate(hop.ip) : {}) })));
  const assessed = geolocated.map(hop => assessLocation(source, hop));
  const reachedTarget = assessed.some(hop => hop.ip === destination.address && !hop.limited);
  const lastRespondingIndex = assessed.reduce((last,hop,index) => hop.ip ? index : last, -1);
  const located = lastRespondingIndex < 0 ? assessed.slice(0,1) : assessed.slice(0, Math.min(assessed.length, lastRespondingIndex + (reachedTarget ? 1 : 2)));
  const tcpMeasurements=await tcpRttPromise;
  const reachablePorts=[443,80].map((webPort,index)=>({webPort,rttMs:tcpMeasurements[index]})).filter(item=>Number.isFinite(item.rttMs));
  const fastestTcp=reachablePorts.sort((a,b)=>a.rttMs-b.rttMs)[0] || null;
  const tcpRttMs=fastestTcp?.rttMs ?? null;
  const targetEstimate = reachedTarget
    ? assessed.find(hop => hop.ip === destination.address)
    : assessLocation(source, { ip:destination.address, rttMs:tcpRttMs, ...(await targetGeoPromise) });
  const deliveryNetwork=deliveryNetworkLabel(`${targetEstimate?.isp || ''} ${targetEstimate?.asn || ''}`);
  const proximityExplanation=deliveryNetwork&&Number.isFinite(tcpRttMs)&&tcpRttMs<35
    ? ` A ${tcpRttMs.toFixed(1)} ms TCP connection from ${source?.locationLabel || 'the trace server'} indicates a nearby ${deliveryNetwork} edge, not the website owner’s origin country.`
    : '';
  const targetExplanation=targetEstimate?.locationConfidence === 'verified-estimate'
    ? `${targetEstimate.locationReason} DNS resolved ${targetHost} to ${destination.address}${deliveryNetwork ? ` on ${deliveryNetwork}` : ''}. ${deliveryNetwork ? 'That coordinate is likely a nearby delivery edge; the website’s protected origin server may be in another country and cannot be inferred from traceroute.' : 'This is an approximate location for the resolved IP, not proof of a particular building or the website owner’s headquarters.'}`
    : `${targetEstimate?.locationReason || 'The destination location could not be independently verified.'} DNS resolved ${targetHost} to ${destination.address}${deliveryNetwork ? ` on ${deliveryNetwork}` : ''}, but the combined evidence is not strong enough to plot a physical endpoint.${proximityExplanation}`;
  return {
    targetHost, targetIp:destination.address, traceOrigin:'site-server', source,
    respondingHops:located.filter(hop => hop.ip).length,
    reachedTarget,
    probeProtocol:'UDP traceroute',
    tcpRttMs,
    tcpPort:fastestTcp?.webPort || null,
    targetEstimate,
    deliveryNetwork,
    targetExplanation,
    note:'Traceroute is measured from the site server. A point is plotted only when two IP-location sources agree and measured latency does not make it physically impossible.',
    hops:located
  };
}

async function serveFile(req,res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const safePath = normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(root, safePath);
  if (!filePath.startsWith(root)) { res.writeHead(403);res.end('Forbidden');return; }
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type':mime[extname(filePath)] || 'application/octet-stream', 'Cache-Control':'no-cache' });
    res.end(body);
  } catch { res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });res.end('Not found'); }
}

const server = http.createServer(async (req,res) => {
  const requestOrigin = String(req.headers.origin || '').replace(/\/$/, '');
  const corsAllowed = allowedOrigin === '*' || (allowedOrigin && requestOrigin === allowedOrigin);
  if (corsAllowed) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin === '*' ? '*' : requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(corsAllowed ? 204 : 403);
    res.end();
    return;
  }
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
    res.end(JSON.stringify({ ok:true, traceroute:true }));
    return;
  }
  if (req.url?.startsWith('/api/trace')) {
    try {
      const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const payload = await tracePayload(requestUrl.searchParams.get('target'));
      res.writeHead(200, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' });
      res.end(JSON.stringify(payload));
    } catch (error) {
      res.writeHead(503, { 'Content-Type':'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error:'Live trace unavailable', detail:error.message }));
    }
    return;
  }
  await serveFile(req,res);
});

server.listen(port, () => console.log(`Packet Atlas running at http://localhost:${port}`));
