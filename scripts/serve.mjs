// Minimal static file server for local play (browsers refuse to load ES modules from file://).
// Zero dependencies. Usage: node scripts/serve.mjs [port]   (default 8080, or the PORT env var)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { PROBE_PATTERN, ROOT, serverPort } from './server-utils.mjs';

const root = ROOT;
const port = serverPort(undefined, true);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost'), urlPath = decodeURIComponent(url.pathname);
    if (urlPath === '/__lanternmoss/stop') {
      const nonce = url.searchParams.get('nonce');
      if (req.method !== 'POST' || !PROBE_PATTERN.test(nonce ?? '')) { res.writeHead(403).end('Forbidden'); return; }
      const token = await readFile(join(root, nonce), 'utf8');
      if (req.headers['x-lanternmoss-stop'] !== token) { res.writeHead(403).end('Forbidden'); return; }
      res.once('finish', () => { server.close(); server.closeAllConnections?.(); });
      res.writeHead(202, { 'Content-Type': 'application/json' }).end(JSON.stringify({ stopping: true, token }));
      return;
    }
    let file = normalize(join(root, urlPath));
    if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('Forbidden'); return; }   // no escaping the project folder
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE'
    ? `Port ${port} is already in use. Run npm stop${port === 8080 ? '' : ` -- ${port}`} to stop this project's server, or choose another port.`
    : error.message);
  process.exitCode = 1;
});
server.listen(port, () => console.log(`Lanternmoss running at http://localhost:${server.address().port}/`));
