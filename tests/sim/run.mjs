// Runs the headless gameplay sims (tests/sim/*.sim.mjs), each in its own process, a few at a time, and sums up.
//   npm run sim                      every check sim (not the reports)
//   npm run sim -- bosses combat     only these (file names without .sim.mjs)
//   npm run sim -- balance           the balance report (TODO 23): time to kill and damage taken, per hero and planet
//   npm run sim -- --verbose         print every sim's full output, not just its result and failures
//   SIM_SEED=7 npm run sim           another seed (default 1); the same seed always plays out the same
// Report sims (REPORTS) measure numbers rather than pass / fail: they're slow, so they run only when named, and they
// always print their full output.
// Exit code 1 if any sim failed. Needs the `three` dev dependency (npm install).
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('.', import.meta.url));
const REPORTS = new Set(['balance']);
const TIMEOUT = 15 * 60 * 1000;
const args = process.argv.slice(2), verbose = args.includes('--verbose'), wanted = args.filter(a => !a.startsWith('--'));
const all = readdirSync(dir).filter(f => f.endsWith('.sim.mjs')).map(f => f.slice(0, -'.sim.mjs'.length)).sort();
const unknown = wanted.filter(w => !all.includes(w));
if (unknown.length) { console.error(`No such sim: ${unknown.join(', ')}. Sims: ${all.join(', ')}`); process.exit(2); }
const names = wanted.length ? wanted : all.filter(n => !REPORTS.has(n));
const jobs = Math.max(1, Math.min(names.length, availableParallelism() - 1, 6));

function run(name) {
  return new Promise(done => {
    const t0 = Date.now(); let out = '';
    const child = spawn(process.execPath, [`${name}.sim.mjs`], { cwd: dir, env: process.env });
    const timer = setTimeout(() => { out += `\nFAIL  timed out after ${TIMEOUT / 60000} min`; child.kill(); }, TIMEOUT);
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
    child.on('close', code => { clearTimeout(timer); done({ name, code, out: out.trimEnd(), secs: (Date.now() - t0) / 1000 }); });
  });
}

console.log(`Running ${names.length} sim${names.length > 1 ? 's' : ''} (seed ${process.env.SIM_SEED ?? 1}, ${jobs} at a time)\n`);
const queue = [...names], results = [];
await Promise.all(Array.from({ length: jobs }, async () => {
  while (queue.length) {
    const r = await run(queue.shift()); results.push(r);
    const lines = r.out.split('\n'), ok = r.code === 0;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${r.name.padEnd(16)} ${r.secs.toFixed(0).padStart(4)} s   ${REPORTS.has(r.name) ? 'report:' : lines[lines.length - 1]}`);
    if (verbose || REPORTS.has(r.name)) console.log(r.out.replace(/^/gm, '      | '));
    else if (!ok) console.log(lines.filter(l => /FAIL|Error|error:|at file:/.test(l)).slice(0, 12).map(l => `      | ${l}`).join('\n'));
  }
}));
const failed = results.filter(r => r.code !== 0);
console.log(`\n${failed.length ? `${failed.length} of ${results.length} sims FAILED: ${failed.map(r => r.name).join(', ')}` : `all ${results.length} sims passed`}`);
process.exit(failed.length ? 1 : 0);
