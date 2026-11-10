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

let tcpBusy=false;
$('#dropPacket').addEventListener('click',()=>{
  if(tcpBusy)return;tcpBusy=true;
  const third=$$('#tcpTrack i')[2];third.className='lost';
  $('#tcpStatus').textContent='Packets 1, 2, and 4 arrived. The gap tells the receiver that sequence 3 is missing.';
  $('#dropPacket').disabled=true;
  setTimeout(()=>{
    third.className='retry';$('#tcpStatus').textContent='The sender retransmits packet 3. TCP can now deliver the complete stream in order.';
  },reducedMotion?50:1100);
  setTimeout(()=>{
    third.className='';$('#dropPacket').disabled=false;$('#dropPacket').textContent='Drop packet 3 again';tcpBusy=false;
  },reducedMotion?180:2600);
});

function updateLatency(){
  const distance=Number($('#distanceRange').value),speed=Number($('#mediumSelect').value);
  const rtt=distance*2/speed*1000;
  $('#distanceValue').textContent=`${distance.toLocaleString()} km`;
  $('#latencyResult').textContent=rtt<1?`${rtt.toFixed(2)} ms`:`${Math.round(rtt)} ms`;
}
$('#distanceRange').addEventListener('input',updateLatency);$('#mediumSelect').addEventListener('change',updateLatency);updateLatency();

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

const webLessons=[
  ['Step 1','The browser understands the address','It separates the scheme, hostname, port, path, query, and fragment. For https://example.com/learn, “https” selects secure HTTP and “example.com” is the name to resolve.'],
  ['Step 2','DNS finds one or more destination addresses','Caches may answer immediately. Otherwise a recursive resolver follows referrals until it gets an authoritative record. A CDN may return an address chosen for this user and network.'],
  ['Step 3','The endpoints create a transport connection','HTTPS commonly uses TCP for HTTP/1.1 or HTTP/2, or QUIC over UDP for HTTP/3. Ports distinguish this conversation from other apps on the same machines.'],
  ['Step 4','TLS authenticates and creates session keys','The server presents a certificate for the hostname. Both sides agree on temporary keys and switch to authenticated encryption before private HTTP content is sent.'],
  ['Step 5','The browser sends an HTTP request','A method such as GET, a path, and headers explain what resource is wanted and what formats the browser accepts. Cookies may carry session state.'],
  ['Step 6','An edge or origin creates the response','A CDN cache may already have the file. Otherwise load balancers and application servers may query databases, run code, and return a status, headers, and body.'],
  ['Step 7','Bytes become pixels','The browser parses HTML, fetches styles, scripts, fonts, and images, calculates layout, paints pixels, and keeps responding to user input. One page often requires many requests.']
];
$$('[data-web-step]').forEach(button=>button.addEventListener('click',()=>{
  $$('#webSteps li').forEach(item=>item.classList.toggle('active',item.contains(button)));
  const [kicker,title,body]=webLessons[Number(button.dataset.webStep)];
  $('#webStepKicker').textContent=kicker;$('#webStepTitle').textContent=title;$('#webStepBody').textContent=body;
}));

$('#quizForm').addEventListener('submit',event=>{
  event.preventDefault();let score=0;
  $$('#quizForm fieldset').forEach((field,index)=>{
    const selected=field.querySelector('input:checked')?.value;
    const correct=selected===field.dataset.answer;if(correct)score++;
    field.classList.toggle('correct',correct);field.classList.toggle('incorrect',Boolean(selected&&!correct));
    field.querySelectorAll('input').forEach(input=>{input.disabled=true;});
  });
  const messages=['Start with the highlighted chapters, then try again.','Good start—review DNS, routing, RTT, and TCP.','You have the core journey. Revisit the orange questions.','Excellent. You can explain the journey from name to answer.'];
  $('#quizResult').textContent=`${score} of 4 correct. ${messages[Math.min(score,3)]}`;
});

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
