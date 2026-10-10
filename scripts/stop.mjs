// Stop only the server serving this checkout. A temporary random file proves directory ownership.
import { execFile } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { PROBE_PREFIX, ROOT, serverPort } from './server-utils.mjs';

const run = promisify(execFile), sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function listening(port) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(2000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('timeout', () => { socket.destroy(); reject(new Error('Timed out checking the server.')); });
    socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve(false) : reject(error));
  });
}
async function request(url, options) {
  return fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(3000) });
}
async function stopLegacyWindows(port, url, token) {
  const provesRoot = async () => { const response = await request(url); return response.ok && await response.text() === token; };
  if (!await provesRoot()) throw new Error(`Port ${port} is serving another project; nothing was stopped.`);
  if (process.platform !== 'win32') throw new Error('This older server needs Ctrl+C once; subsequent starts support npm stop.');
  // The old Windows server has no shutdown endpoint. Verify both port owner and serve.mjs before terminating it.
  const owner = String.raw`
    $taskOwners = @(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($taskOwners.Count -ne 1) { throw 'No unique listener for this port' }
    $taskProcess = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $taskOwners[0])
    if ($taskProcess.Name -ne 'node.exe' -or $taskProcess.CommandLine -notmatch 'scripts[\\/]serve\.mjs(?:[" ]|$)') { throw 'The listener is not the project Node server' }
  `;
  const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${owner}\n$taskOwners[0]`], { windowsHide: true });
  const pid = Number(stdout.trim());
  if (!Number.isSafeInteger(pid) || pid <= 0 || !await provesRoot()) throw new Error('Server ownership changed; nothing was stopped.');
  await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${owner}\nif ($taskOwners[0] -ne ${pid}) { throw 'Port owner changed' }\nStop-Process -Id ${pid} -Force`], { windowsHide: true });
}
async function stop() {
  const port = serverPort();
  if (!await listening(port)) { console.log(`No project server running on port ${port}.`); return; }
  const nonce = PROBE_PREFIX + randomUUID(), file = join(ROOT, nonce), token = randomBytes(32).toString('hex');
  await writeFile(file, token, { flag: 'wx' });
  try {
    const base = `http://127.0.0.1:${port}`;
    const response = await request(`${base}/__lanternmoss/stop?nonce=${nonce}`, { method: 'POST', headers: { 'x-lanternmoss-stop': token } });
    const ack = response.status === 202 ? await response.json().catch(() => null) : null;
    if (ack?.stopping !== true || ack.token !== token) await stopLegacyWindows(port, `${base}/${nonce}`, token);
    const deadline = Date.now() + 5000;
    while (await listening(port)) { if (Date.now() >= deadline) throw new Error(`Port ${port} has not closed.`); await sleep(100); }
    console.log(`Stopped this project's server on port ${port}.`);
  } finally { await unlink(file); }
}
try { await stop(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
