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
  if (!source || !Number.isFinite(source.latitude) || !Number.isFinite(source.longitude) || !Number.isFinite(hop.rttMs)) {
    return { ...hop, locationConfidence:'estimated', locationReason:'IP registration estimate; latency was unavailable for a physical plausibility check.' };
  }
  const geoDistanceKm = haversineKm(source, hop);
  // Light travels about 200 km/ms in fiber. RTT includes the return trip and routing overhead,
  // so RTT × 100 km is a generous one-way ceiling; the margin accommodates noisy measurements.
  const maximumPlausibleKm = Math.max(350, hop.rttMs * 135 + 250);
  if (geoDistanceKm <= maximumPlausibleKm) {
    return { ...hop, geoDistanceKm, maximumPlausibleKm, locationConfidence:'plausible', locationReason:'Approximate IP location is physically compatible with the measured round-trip time.' };
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

async function geolocate(ip) {
  if (isPrivateIp(ip)) return { private:true, locationLabel:'Private network' };
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { signal:AbortSignal.timeout(5000) });
    if (!response.ok) return {};
    const data = await response.json();
    if (!data.success) return {};
    return {
      latitude:data.latitude, longitude:data.longitude,
      locationLabel:[data.city,data.region,data.country].filter(Boolean).join(', '),
      isp:data.connection?.isp || data.connection?.org || null
    };
  } catch { return {}; }
}

async function locateTraceSource() {
  try {
    const response = await fetch('https://ipwho.is/', { signal:AbortSignal.timeout(5000) });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data.success) return null;
    return {
      ip:data.ip, latitude:data.latitude, longitude:data.longitude,
      locationLabel:[data.city,data.region,data.country].filter(Boolean).join(', '),
      isp:data.connection?.isp || data.connection?.org || null
    };
  } catch { return null; }
}

async function tracePayload(requestedTarget) {
  const targetHost = normalizeTarget(requestedTarget);
  const destination = await lookup(targetHost, { family:4 });
  if (isPrivateIp(destination.address)) throw new Error('The destination must resolve to a public IPv4 address');
  const sourcePromise = locateTraceSource();
  const targetGeoPromise = geolocate(destination.address);
  const tcpRttPromise = measureTcpRtt(destination.address);
  let hops;
  try { hops = parseTrace(await runTraceroute(destination.address)); }
  catch { hops = [{ hop:1, ip:destination.address, rttMs:null, limited:true }]; }
  const source = await sourcePromise;
  const geolocated = await Promise.all(hops.map(async hop => ({ ...hop, ...(hop.ip ? await geolocate(hop.ip) : {}) })));
  const assessed = geolocated.map(hop => assessLocation(source, hop));
  const reachedTarget = assessed.some(hop => hop.ip === destination.address && !hop.limited);
  const lastRespondingIndex = assessed.reduce((last,hop,index) => hop.ip ? index : last, -1);
  const located = lastRespondingIndex < 0 ? assessed.slice(0,1) : assessed.slice(0, Math.min(assessed.length, lastRespondingIndex + (reachedTarget ? 1 : 2)));
  const tcpRttMs = await tcpRttPromise;
  const targetEstimate = reachedTarget
    ? assessed.find(hop => hop.ip === destination.address)
    : assessLocation(source, { ip:destination.address, rttMs:tcpRttMs, ...(await targetGeoPromise) });
  return {
    targetHost, targetIp:destination.address, traceOrigin:'site-server', source,
    respondingHops:located.filter(hop => hop.ip).length,
    reachedTarget,
    probeProtocol:'UDP traceroute',
    tcpRttMs,
    targetEstimate,
    note:'Traceroute is measured from the site server. IP locations are estimates and are removed from the map when measured latency makes them physically impossible.',
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
