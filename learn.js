const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];

if('scrollRestoration' in history)history.scrollRestoration='manual';
window.addEventListener('pageshow',()=>{if(!location.hash)scrollTo(0,0);});

function renderBits(){
  const value=$('#bitInput').value||' ';
  const bytes=new TextEncoder().encode(value);
  const bits=[...bytes].flatMap(byte=>byte.toString(2).padStart(8,'0').split(''));
  $('#bitOutput').replaceChildren(...bits.map((bit,index)=>{
    const span=document.createElement('span');span.textContent=bit;span.style.animationDelay=`${Math.min(index*12,260)}ms`;return span;
  }));
  $('#byteSummary').textContent=`${[...value].length} character${[...value].length===1?'':'s'} → ${bytes.length} UTF‑8 byte${bytes.length===1?'':'s'} → ${bytes.length*8} bits`;
}
$('#bitInput').addEventListener('input',renderBits);renderBits();

const devices=$$('[data-device]');
devices.forEach((button,index)=>button.addEventListener('click',()=>{
  devices.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
  $('#natPrivate').textContent=`${button.dataset.ip}:${53142+index*173}`;
  $('#natPublic').textContent=`203.0.113.8:${62001+index}`;
  $('#natExplanation').textContent=`The router remembers that replies to port ${62001+index} belong to the ${button.dataset.device.toLowerCase()}.`;
}));

const dnsCopy=[
  'Your browser first checks addresses it recently remembered.',
  'The recursive resolver checks its shared cache. If the answer is absent, it begins asking other DNS servers.',
  'A root server does not know the final IP. It points the resolver to the servers responsible for the top-level domain, such as .com.',
  'The .com server points toward the authoritative name servers for the requested domain.',
  'The authoritative server returns the record. The resolver caches it for its TTL and gives the IP to your device.'
];
let dnsStep=0;
function showDnsStep(){
  const items=$$('#dnsPath li');items.forEach((item,index)=>item.classList.toggle('active',index===dnsStep));
  $('#dnsExplanation').textContent=dnsCopy[dnsStep];
  const names=['Ask the resolver','Ask a root server','Ask the .com server','Ask the authoritative server','Start again'];
  $('#dnsNext').innerHTML=`${names[dnsStep]} <span aria-hidden="true">→</span>`;
}
$('#dnsNext').addEventListener('click',()=>{dnsStep=(dnsStep+1)%dnsCopy.length;showDnsStep();});showDnsStep();

function renderPackets(){
  const message=$('#packetMessage').value;
  const size=Number($('#packetSize').value);
  $('#packetSizeValue').textContent=size;
  const chunks=[];for(let index=0;index<message.length;index+=size)chunks.push(message.slice(index,index+size));
  $('#packetTray').replaceChildren(...chunks.map((chunk,index)=>{
    const card=document.createElement('div');card.className='packet-card';card.style.animationDelay=`${index*45}ms`;
    const label=document.createElement('small');label.textContent=`Packet ${index+1} of ${chunks.length} · sequence ${index*size}`;
    const content=document.createElement('code');content.textContent=chunk||' ';
    card.append(label,content);return card;
  }));
}
$('#packetMessage').addEventListener('input',renderPackets);$('#packetSize').addEventListener('input',renderPackets);renderPackets();

const motionTimers=new Map();
function clearMotion(name){(motionTimers.get(name)||[]).forEach(clearTimeout);motionTimers.set(name,[]);}
function later(name,callback,delay){const timer=setTimeout(callback,reducedMotion?Math.min(delay,120):delay);motionTimers.set(name,[...(motionTimers.get(name)||[]),timer]);}
function setPhase(element,phase,max=4){for(let index=1;index<=max;index++)element.classList.remove(`phase-${index}`);if(phase)element.classList.add(`phase-${phase}`);}

$('#playTcpHandshake').addEventListener('click',()=>{
  const lab=$('.tcp-handshake-lab');clearMotion('tcp-handshake');setPhase(lab,0,3);
  const statuses=['Sending SYN: the browser asks to open a connection.','The server replies with SYN‑ACK: request received, server ready.','The browser sends ACK. Both sides now consider the connection established.'];
  const clientState=$('#tcpHandshakeStage .exchange-endpoint:first-child small'),serverState=$('#tcpHandshakeStage .server-endpoint small');
  clientState.textContent='Closed';serverState.textContent='Listening';$('#playTcpHandshake').textContent='Replay handshake ▶';
  [0,1,2].forEach(index=>later('tcp-handshake',()=>{setPhase(lab,index+1,3);$('#tcpHandshakeStatus').textContent=statuses[index];if(index===0)clientState.textContent='SYN sent';if(index===1)serverState.textContent='SYN received';if(index===2){clientState.textContent='Established';serverState.textContent='Established';}},index*1050));
  later('tcp-handshake',()=>setPhase(lab,0,3),3500);
});

$('#dropPacket').addEventListener('click',()=>{
  const stage=$('#tcpRecoveryStage');clearMotion('tcp-recovery');stage.className='tcp-recovery-stage playing';
  $('#tcpStatus').textContent='Packets leave in order. Watch packet 3 disappear halfway.';$('#dropPacket').textContent='Replay packet loss';
  later('tcp-recovery',()=>{stage.className='tcp-recovery-stage loss';$('#tcpStatus').textContent='Packet 3 is missing. The receiver acknowledges the next byte it still needs.';},1300);
  later('tcp-recovery',()=>{stage.className='tcp-recovery-stage retrying';$('#tcpStatus').textContent='The sender retransmits packet 3. TCP can now deliver the complete stream in order.';},2450);
  later('tcp-recovery',()=>{stage.className='tcp-recovery-stage';},3650);
});

let mediumSpeed=200000;
function updateLatency(){
  const distance=Number($('#distanceRange').value),speed=mediumSpeed;
  const rtt=distance*2/speed*1000;
  $('#distanceValue').textContent=`${distance.toLocaleString()} km`;
  $('#latencyResult').textContent=rtt<1?`${rtt.toFixed(2)} ms`:`${Math.round(rtt)} ms`;
}
$('#distanceRange').addEventListener('input',updateLatency);
$$('#mediumSelect [role=option]').forEach(option=>option.addEventListener('click',()=>{
  mediumSpeed=Number(option.dataset.speed);$('#mediumChoice').textContent=option.childNodes[0].textContent.trim();
  $$('#mediumSelect [role=option]').forEach(item=>item.setAttribute('aria-selected',String(item===option)));
  $('#mediumSelect').open=false;updateLatency();
}));updateLatency();

const osiLessons={
  7:['Layer 7 · Application','What the user-facing software understands','HTTP describes web requests, DNS looks up names, and SMTP moves email. This layer is about the meaning and rules of the application conversation.','Writing the actual letter.','HTTP · DNS · SMTP'],
  6:['Layer 6 · Presentation','Make data readable, compact, and protected','This conceptual layer translates formats, compresses data, and represents encryption. In real web stacks, TLS and applications often share these jobs.','Agreeing on a language and sealing the letter.','TLS · UTF‑8 · JPEG'],
  5:['Layer 5 · Session','Keep track of the conversation','It establishes, maintains, and ends a dialogue between applications. Modern protocols often fold this responsibility into TLS, QUIC, or the app itself.','Knowing which letters belong to this conversation.','Sessions · checkpoints · state'],
  4:['Layer 4 · Transport','Deliver data between applications','Ports identify conversations. TCP provides reliable ordered bytes; UDP sends independent datagrams; QUIC provides secure streams over UDP.','Numbering envelopes and noticing one is missing.','TCP · UDP · QUIC · ports'],
  3:['Layer 3 · Network','Move packets between networks','IP supplies global logical addresses. Routers read the destination and select a next hop. A hop limit prevents packets from looping forever.','Writing the city and street on the envelope.','IPv4 · IPv6 · ICMP · routers'],
  2:['Layer 2 · Data link','Cross one local link','Frames use local addresses and error detection on Wi‑Fi or Ethernet. A router removes one frame and creates another for the next link.','The local delivery van for one neighbourhood.','Ethernet · Wi‑Fi · MAC · ARP'],
  1:['Layer 1 · Physical','Turn bits into a real signal','Network hardware represents bits as timed radio, voltage, or light changes. Connectors, frequencies, modulation, and cables live here.','The road, railway, or aircraft carrying the envelope.','Radio · copper · fiber · light']
};
$$('[data-osi]').forEach(button=>button.addEventListener('click',()=>{
  $$('[data-osi]').forEach(item=>item.setAttribute('aria-selected',String(item===button)));
  const [kicker,title,body,analogy,examples]=osiLessons[button.dataset.osi];
  $('#osiKicker').textContent=kicker;$('#osiTitle').textContent=title;$('#osiBody').textContent=body;$('#osiAnalogy').textContent=analogy;$('#osiExamples').textContent=examples;
}));

$('#playTls').addEventListener('click',()=>{
  const lab=$('.tls-motion');clearMotion('tls');setPhase(lab,0);$('#playTls').textContent='Replay TLS setup ▶';
  $('#tlsClientState').textContent='No key';$('#tlsServerState').textContent='Certificate ready';
  const statuses=['ClientHello: the browser offers supported TLS rules and a temporary key share.','Certificate: the server proves the hostname using a signed certificate.','Key agreement: both sides derive the same session secrets without sending the final key.','Protected: HTTP can now travel as authenticated ciphertext.'];
  [0,1,2,3].forEach(index=>later('tls',()=>{
    setPhase(lab,index+1);$('#tlsStatus').textContent=statuses[index];
    if(index===1)$('#tlsClientState').textContent='Identity verified';
    if(index===2){$('#tlsClientState').textContent='Shared key ◆';$('#tlsServerState').textContent='Shared key ◆';}
    if(index===3){$('#tlsClientState').textContent='Encrypted';$('#tlsServerState').textContent='Encrypted';}
  },index*1200));
  later('tls',()=>setPhase(lab,0),5000);
});

const webLessons=[
  ['Step 1','The browser understands the address','It separates the scheme, hostname, port, path, query, and fragment. For https://example.com/learn, “https” selects secure HTTP and “example.com” is the name to resolve.'],
  ['Step 2','DNS finds one or more destination addresses','Caches may answer immediately. Otherwise a recursive resolver follows referrals until it gets an authoritative record. A CDN may return an address chosen for this user and network.'],
  ['Step 3','The endpoints create a transport connection','HTTPS commonly uses TCP for HTTP/1.1 or HTTP/2, or QUIC over UDP for HTTP/3. Ports distinguish this conversation from other apps on the same machines.'],
  ['Step 4','TLS authenticates and creates session keys','The server presents a certificate for the hostname. Both sides agree on temporary keys and switch to authenticated encryption before private HTTP content is sent.'],
  ['Step 5','The browser sends an HTTP request','A method such as GET, a path, and headers explain what resource is wanted and what formats the browser accepts. Cookies may carry session state.'],
  ['Step 6','An edge or origin creates the response','A CDN cache may already have the file. Otherwise load balancers and application servers may query databases, run code, and return a status, headers, and body.'],
  ['Step 7','Bytes become pixels','The browser parses HTML, fetches styles, scripts, fonts, and images, calculates layout, paints pixels, and keeps responding to user input. One page often requires many requests.']
];
let webStep=0,webPlaying=false;
function selectWebStep(step,animate=true){
  webStep=step;const button=$(`[data-web-step="${step}"]`);
  $$('#webSteps li').forEach(item=>item.classList.toggle('active',item.contains(button)));
  const [kicker,title,body]=webLessons[step];
  $('#webStepKicker').textContent=kicker;$('#webStepTitle').textContent=title;$('#webStepBody').textContent=body;
  $('#webPlaybackStatus').textContent=`Step ${step+1} of ${webLessons.length}`;
  const nodes=$$('#webMotion .web-node');nodes.forEach(node=>node.classList.remove('active'));
  const nodeMap=[0,1,2,2,3,3,0];nodes[nodeMap[step]].classList.add('active');
  const motion=$('#webMotion');motion.classList.remove('travel','response');void motion.offsetWidth;
  if(animate&&step>0)motion.classList.add(step===6?'response':'travel');
}
$$('[data-web-step]').forEach(button=>button.addEventListener('click',()=>{webPlaying=false;clearMotion('web');$('#playWebJourney').textContent='Play full journey ▶';selectWebStep(Number(button.dataset.webStep));}));
$('#playWebJourney').addEventListener('click',()=>{
  clearMotion('web');webPlaying=true;$('#playWebJourney').textContent='Restart journey ↻';
  webLessons.forEach((_,index)=>later('web',()=>selectWebStep(index,index>0),index*1350));
  later('web',()=>{webPlaying=false;$('#playWebJourney').textContent='Play again ▶';},webLessons.length*1350);
});
selectWebStep(0,false);

const quizBank=[
  ['Which system translates a domain name into an IP address?',['NAT','DNS','TLS'],1,'DNS is the distributed naming system that returns address records.'],
  ['What does a router normally inspect to choose the next hop?',['The page text','Your password','The destination IP'],2,'Routers forward using the destination IP prefix and their routing table.'],
  ['Which measurement is a time, not a distance?',['RTT','Kilometres','Cable length'],0,'Round-trip time is measured in milliseconds.'],
  ['What does TCP do after data is lost?',['Changes the domain','Retransmits missing data','Turns off TLS'],1,'Sequence numbers and acknowledgements reveal gaps so TCP can retransmit.'],
  ['Which medium usually carries intercontinental internet traffic?',['Submarine fiber','AM radio','Copper telephone wire'],0,'Most intercontinental data crosses optical fiber on the seabed.'],
  ['What is the job of DHCP on a home network?',['Encrypt web pages','Assign network settings','Choose BGP routes'],1,'DHCP supplies an IP address, gateway, DNS resolver, and related settings.'],
  ['Why does NAT keep a translation table?',['To map replies to the correct private device','To store websites','To verify certificates'],0,'The table maps public ports back to private address-and-port pairs.'],
  ['What does a DNS TTL control?',['Packet size','How long an answer may be cached','Wi‑Fi signal strength'],1,'TTL tells resolvers how long they may reuse a cached answer.'],
  ['Which OSI layer handles IP routing?',['Layer 7 · Application','Layer 4 · Transport','Layer 3 · Network'],2,'The network layer provides IP addressing and routing.'],
  ['Which OSI layer turns frames into radio, voltage, or light?',['Layer 1 · Physical','Layer 3 · Network','Layer 6 · Presentation'],0,'The physical layer represents bits as signals.'],
  ['What is the second message in TCP’s three-way handshake?',['ACK only','SYN‑ACK','ClientHello'],1,'The server answers the client SYN with SYN plus ACK.'],
  ['What does a TLS certificate primarily help a browser verify?',['The server’s claimed hostname and identity','The exact cable route','The user’s Wi‑Fi password'],0,'Certificate chains bind a public key to the hostname.'],
  ['Which statement about HTTPS is true?',['It hides all metadata','It encrypts HTTP content and detects tampering','It guarantees anonymity'],1,'TLS protects content and integrity, but endpoints and timing can remain visible.'],
  ['What is a CDN edge?',['A nearby server that can cache content','A home router feature','A DNS root server'],0,'CDNs serve cached content from distributed edge locations.'],
  ['Why can traceroute show an asterisk for a hop?',['That router did not answer the probe','The internet ended','The packet has no IP address'],0,'Routers can filter, deprioritize, or ignore traceroute probes while forwarding traffic.'],
  ['Can traceroute prove which submarine cable carried a packet?',['Always','Only with IPv6','No, not by itself'],2,'Exact cable selection requires operator telemetry that traceroute does not provide.'],
  ['What does a port number identify?',['A conversation or service on a device','A country','A fiber color'],0,'Ports let transport protocols deliver data to the right application conversation.'],
  ['Why can the return route differ from the request route?',['Internet routing can be asymmetric','TCP reverses every IP address','DNS blocks symmetry'],0,'Networks make independent routing decisions in each direction.']
];
let currentQuiz=[];
function shuffled(values){return [...values].sort(()=>Math.random()-.5);}
function renderQuiz(){
  currentQuiz=shuffled(quizBank).slice(0,6);$('#quizResult').textContent='';
  $('#quizQuestions').replaceChildren(...currentQuiz.map((question,index)=>{
    const [prompt,answers,correct]=question;const field=document.createElement('fieldset');field.dataset.answer=String(correct);field.style.animationDelay=`${index*45}ms`;
    const legend=document.createElement('legend');legend.textContent=`${index+1}. ${prompt}`;field.append(legend);
    answers.forEach((answer,answerIndex)=>{const label=document.createElement('label');const input=document.createElement('input');input.type='radio';input.name=`quiz-${index}`;input.value=String(answerIndex);label.append(input,document.createTextNode(answer));field.append(label);});return field;
  }));
}
$('#newQuiz').addEventListener('click',renderQuiz);
$('#quizForm').addEventListener('submit',event=>{
  event.preventDefault();let score=0;
  $$('#quizQuestions fieldset').forEach((field,index)=>{
    const selected=field.querySelector('input:checked')?.value;const correct=selected===field.dataset.answer;if(correct)score++;
    field.classList.toggle('correct',correct);field.classList.toggle('incorrect',!correct);
    field.querySelectorAll('input').forEach(input=>{input.disabled=true;});
    if(!correct){const note=document.createElement('small');note.className='answer-note';note.textContent=currentQuiz[index][3];field.append(note);}
  });
  $('#quizResult').textContent=`${score} of ${currentQuiz.length} correct. ${score===currentQuiz.length?'Excellent—generate a new set to keep practising.':'Review the explanations, then try a fresh set.'}`;
});
renderQuiz();

const chapters=$$('.chapter');
const railLinks=$$('.course-rail nav a');
const chapterObserver=new IntersectionObserver(entries=>{
  const visible=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
  if(!visible)return;
  const number=Number(visible.target.dataset.chapter);
  railLinks.forEach(link=>link.classList.toggle('active',link.hash===`#${visible.target.id}`));
  $('#progressLabel').textContent=`Chapter ${number} of ${chapters.length}`;
  $('#courseProgress').style.width=`${number/chapters.length*100}%`;
},{rootMargin:'-20% 0px -55% 0px',threshold:[0,.15,.4]});
chapters.forEach(chapter=>chapterObserver.observe(chapter));
