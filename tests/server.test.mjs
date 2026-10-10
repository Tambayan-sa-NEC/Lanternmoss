import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { copyFile, mkdtemp, mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT, serverPort } from '../scripts/server-utils.mjs';

const scripts = ['serve.mjs', 'stop.mjs', 'server-utils.mjs'];
async function fixture(t, legacy = false) {
  const dir = await mkdtemp(join(tmpdir(), 'lanternmoss-server-'));
  assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, 'scripts'));
  for (const file of scripts) await copyFile(join(ROOT, 'scripts', file), join(dir, 'scripts', file));
  await writeFile(join(dir, 'index.html'), '<h1>server fixture</h1>');
  if (legacy) await writeFile(join(dir, 'scripts', 'serve.mjs'), `
    import {createServer} from 'node:http'; import {readFile} from 'node:fs/promises';
    const root=new URL('../',import.meta.url);
    const server=createServer(async(req,res)=>{try{res.end(await readFile(new URL('.'+req.url,root)))}catch{res.writeHead(404).end()}});
    server.listen(0,()=>console.log('http://localhost:'+server.address().port+'/'));
  `);
  return dir;
}
async function start(t, dir) {
  const child = spawn(process.execPath, [join(dir, 'scripts', 'serve.mjs'), '0'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const done = once(child, 'exit'); t.after(async () => { if (child.exitCode === null) child.kill(); await done; });
  const port = await new Promise((resolve, reject) => {
    let output = ''; const timeout = setTimeout(() => reject(new Error('Server startup timed out')), 10000);
    child.stdout.on('data', data => { output += data; const match = output.match(/localhost:(\d+)/); if (match) { clearTimeout(timeout); resolve(Number(match[1])); } });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', () => { clearTimeout(timeout); if (!output.includes('localhost:')) reject(new Error('Server exited before listening')); });
  });
  return { child, done, port, base: `http://127.0.0.1:${port}` };
}
function stop(dir, port) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [join(dir, 'scripts', 'stop.mjs'), String(port)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let output = ''; child.stdout.on('data', data => output += data); child.stderr.on('data', data => output += data);
    child.on('error', reject); child.on('exit', code => resolve({ code, output }));
  });
}

test('server port validation rejects unsafe and invalid values', () => {
  for (const port of ['', -1, 0, 65536, '8080; exit', 1.5, NaN]) assert.throws(() => serverPort(port));
  assert.equal(serverPort('8080'), 8080); assert.equal(serverPort(0, true), 0);
});
test('stop shuts down the matching server, frees its port, cleans probes and is repeatable', { timeout: 20000 }, async t => {
  const dir = await fixture(t), { port, done, base } = await start(t, dir);
  assert.equal(await (await fetch(base)).text(), '<h1>server fixture</h1>');
  const result = await stop(dir, port); assert.equal(result.code, 0, result.output); assert.match(result.output, /Stopped/);
  await done;
  const repeat = await stop(dir, port); assert.equal(repeat.code, 0); assert.match(repeat.output, /No project server/);
  assert.ok(!(await readdir(dir)).some(file => file.startsWith('.lanternmoss-stop-')));
});
test('stop refuses a different checkout on the same port', { timeout: 20000 }, async t => {
  const dir = await fixture(t), other = await fixture(t), { base, port, child } = await start(t, other);
  const result = await stop(dir, port); assert.equal(result.code, 1); assert.match(result.output, /another project/);
  assert.equal(child.exitCode, null); assert.equal((await fetch(base)).status, 200);
  assert.ok(!(await readdir(dir)).some(file => file.startsWith('.lanternmoss-stop-')));
});
test('unauthenticated and malformed shutdown requests leave the server running', { timeout: 20000 }, async t => {
  const dir = await fixture(t), { base } = await start(t, dir);
  assert.equal((await fetch(`${base}/__lanternmoss/stop`)).status, 403);
  assert.equal((await fetch(`${base}/__lanternmoss/stop?nonce=../index.html`, { method: 'POST' })).status, 403);
  const nonce = '.lanternmoss-stop-12345678-1234-1234-1234-123456789abc'; await writeFile(join(dir, nonce), 'secret');
  assert.equal((await fetch(`${base}/__lanternmoss/stop?nonce=${nonce}`, { method: 'POST', headers: { 'x-lanternmoss-stop': 'wrong' } })).status, 403);
  assert.equal((await fetch(base)).status, 200);
});
test('stop supports the pre-command Windows server with an absolute script path', { skip: process.platform !== 'win32', timeout: 25000 }, async t => {
  const dir = await fixture(t, true), { port, done } = await start(t, dir);
  const result = await stop(dir, port); assert.equal(result.code, 0, result.output); await done;
  assert.ok(!(await readdir(dir)).some(file => file.startsWith('.lanternmoss-stop-')));
});
