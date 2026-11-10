import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { lookup } from 'node:dns/promises';
import { spawn } from 'node:child_process';
import net from 'node:net';

const port = Number(process.env.PORT || 4173);
const root = process.cwd();
const targetHost = process.env.TRACE_TARGET || 'www.google.com';
const maxHops = Math.min(Number(process.env.TRACE_MAX_HOPS || 18), 24);

const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml'
};

function runTraceroute(host) {
  return new Promise((resolve, reject) => {
    const args = process.platform === 'darwin'
      ? ['-n','-q','1','-m',String(maxHops),'-w','1',host]
      : ['-n','-q','1','-m',String(maxHops),'-w','1',host];
    const child = spawn('traceroute', args, { stdio:['ignore','pipe','pipe'] });
    let output = '', error = '';
    const timer = setTimeout(() => child.kill('SIGTERM'), 30000);
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
  return a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
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

async function tracePayload() {
  const destination = await lookup(targetHost, { family:4 });
  const sourcePromise = locateTraceSource();
  let hops;
  try { hops = parseTrace(await runTraceroute(destination.address)); }
  catch { hops = [{ hop:1, ip:destination.address, rttMs:null, limited:true }]; }
  const located = await Promise.all(hops.map(async hop => ({ ...hop, ...(hop.ip ? await geolocate(hop.ip) : {}) })));
  return {
    targetHost, targetIp:destination.address, traceOrigin:'site-server', source:await sourcePromise,
    respondingHops:located.filter(hop => hop.ip).length,
    note:'Traceroute is measured from the site server. IP geolocation is approximate; silent and private hops cannot be physically located.',
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
  if (req.url?.startsWith('/api/trace')) {
    try {
      const payload = await tracePayload();
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
