// Repeat the existing level-8 bots on two seeds. --check enforces timing bands, beyond the access-only sim pass labels:
// each boss row, and each hero's regular-roster median (docs/balance.md); single monsters are reported, not checked.
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BALANCE } from '../src/config/balance.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const jobs=[1,7].flatMap(seed=>['coastalDuels','ironclawDuels','mirelureDuels'].flatMap(sim=>['witch','knight','ranger'].map(hero=>({seed,sim,hero}))));
const rows=[],queue=[...jobs];
await Promise.all(Array.from({length:3},async()=>{
  while(queue.length){
    const job=queue.shift();
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,[`tests/sim/${job.sim}.sim.mjs`,job.hero],{cwd:root,env:{...process.env,SIM_SEED:String(job.seed)}});
      let output='';child.stdout.on('data',d=>{output+=d;});child.stderr.on('data',d=>{output+=d;});child.once('error',reject);
      const timer=setTimeout(()=>{child.kill();},15*60*1000);
      child.once('close',code=>{clearTimeout(timer);const line=output.split('\n').find(l=>l.startsWith('RESULT '));
        if(code!==0||!line)reject(new Error(`${JSON.stringify(job)}: ${output}`));else resolve(JSON.parse(line.slice(7)));});
    });
    const fights=result.fights??{[job.sim==='ironclawDuels'?'ironclaw':'mirelure']:result};
    for(const [type,fight]of Object.entries(fights)){
      const target=BALANCE.seconds[type==='ironclaw'?'miniBoss':type==='mirelure'?'boss':'monster'];
      const withinTarget=fight.time!=null&&!fight.deaths&&fight.time>=target[0]&&fight.time<=target[1];
      // docs/balance.md: the monster band applies to the roster median; single armoured/evasive types may run longer.
      const row={seed:job.seed,hero:job.hero,type,...fight,target,withinTarget,monster:job.sim==='coastalDuels',checked:job.sim!=='coastalDuels'||!!fight.deaths||fight.time==null};rows.push(row);
      console.log(`${withinTarget?'PASS':row.checked?'OUTSIDE TARGET':'outside (median-checked)'} ${job.seed}/${job.hero}/${type}: ${fight.time}s, target ${target.join('-')}s`);
    }
  }
}));
for(const seed of [1,7])for(const hero of ['witch','knight','ranger']){
  const fights=rows.filter(r=>r.seed===seed&&r.hero===hero&&r.monster),times=fights.map(r=>r.deaths||r.time==null?Infinity:r.time).sort((a,b)=>a-b);
  const time=times[(times.length-1)>>1],target=BALANCE.seconds.monster,withinTarget=time>=target[0]&&time<=target[1];
  rows.push({seed,hero,type:'monsterMedian',time,of:fights.map(r=>r.type),target,withinTarget,checked:true});
  console.log(`${withinTarget?'PASS':'OUTSIDE TARGET'} ${seed}/${hero}/roster median: ${time}s, target ${target.join('-')}s`);
}
rows.sort((a,b)=>a.seed-b.seed||a.hero.localeCompare(b.hero)||a.type.localeCompare(b.type));
const report={measuredAt:new Date().toISOString(),candidateCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  dirty:!!execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:root,encoding:'utf8'}).trim(),
  profile:'level 8, starting equipment, default pet, HP top-ups; counter-based bots include approach time',
  accepted:rows.every(r=>!r.checked||r.withinTarget),rows};
writeFileSync(new URL('../docs/tidewhisper-balance.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
const checked=rows.filter(r=>r.checked);
console.log(`${report.accepted?'PASS':'NO-GO'}: ${checked.filter(r=>!r.withinTarget).length}/${checked.length} checked rows outside timing bands (per-monster rows are informational)`);
if(process.argv.includes('--check')&&!report.accepted)process.exitCode=1;
