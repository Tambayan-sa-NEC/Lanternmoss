// Browser acceptance for Act II groundwork. Owns port 8106; does not release any future content.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';
import { shotPath } from './shots.mjs';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8106;
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',code=>reject(new Error(stderr||`server exited ${code}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.LANTERNMOSS);
  await page.evaluate(async()=>{const {setSetting}=await import('/src/core/settings.js');setSetting('quality','low');setSetting('pauseOnBlur',false);});
  for(const [width,height] of [[1280,720],[1920,1080]]) {
    await page.setViewport({width,height});
    const title=await page.evaluate(()=>{
      const el=document.querySelector('#title .campaign'),box=el.getBoundingClientRect();
      return {names:[...el.querySelectorAll('.planet strong')].map(e=>e.textContent),acts:[...el.querySelectorAll('.act-label')].map(e=>e.textContent),
        planned:[...el.querySelectorAll('.planned')].length,actions:el.querySelectorAll('button,a').length,
        fits:box.left>=0&&box.right<=innerWidth&&box.bottom<=innerHeight,text:el.textContent};
    });
    assert.deepEqual(title.names,['Lanternmoss','Emberfall','Frostveil','Tidewhisper','Duskhollow','?']);
    assert.deepEqual(title.acts,['Act I','Act II']);assert.equal(title.planned,3);assert.equal(title.actions,0);assert.ok(title.fits);
    assert.ok(!title.text.includes('Nyxra')&&!title.text.includes('Lantern Moon'));
    await page.screenshot({path:join(tmpdir(),`lanternmoss-act-two-${height}.png`)});
    if(height===1080)await page.screenshot({path:shotPath('title'),type:'jpeg',quality:88});
  }
  console.log('PASS  720p/1080p low-preset title previews, masked secret, planned labels and footer bounds; refreshed title screenshot');
  await page.click('[data-act="play"]');await page.evaluate(async()=>{
    const L=window.LANTERNMOSS;L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;
    const {gainXp}=await import('/src/progression/experience.js'),{xpToNext}=await import('/src/progression/leveling.js');
    L.player.level=10;L.player.xp=0;gainXp(xpToNext(10));if(L.player.level!==11||!L.saves.save().ok)throw new Error('Level-11 save failed');
  });
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  assert.match(await page.$eval('#title',e=>e.textContent),/level 11/);await page.click('[data-act="continue"]');
  await page.waitForFunction(async()=>window.LANTERNMOSS.player.level===11&&(await import('/src/core/context.js')).ctx.started);
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{gainXp}=await import('/src/progression/experience.js');gainXp(1e9);
    if(L.player.level!==16||L.player.xp!==0||!L.saves.save().ok)throw new Error('Cap-16 save failed');
  });
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await page.click('[data-act="continue"]');
  await page.waitForFunction(()=>window.LANTERNMOSS.player.level===16);
  const old=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{parseSave}=await import('/src/core/save.js');
    const raw=await(await fetch('/tests/fixtures/save-v1.json')).json();raw.systems.player.level=10;raw.systems.player.xp=0;
    const parsed=parseSave(JSON.stringify(raw));if(!parsed.ok||!L.saves.restore(parsed.data))throw new Error('Old v1 restore failed');
    const {gainXp}=await import('/src/progression/experience.js'),{xpToNext}=await import('/src/progression/leveling.js');gainXp(xpToNext(10));
    const {ACHIEVEMENTS}=await import('/src/config/achievements.js');
    return {level:L.player.level,planet:L.planetId,futureAwards:ACHIEVEMENTS.filter(a=>['fiveWorlds','tideBoss','duskBoss','moonBoss'].includes(a.id)).length,
      original:ACHIEVEMENTS.find(a=>a.id==='allBosses').goal.bosses};
  });
  assert.equal(old.level,11);assert.equal(old.planet,'emberfall');assert.equal(old.futureAwards,0);assert.deepEqual(old.original,['gloomcap','pyrrhax','malgrath']);
  console.log('PASS  real level 10→11→16 progression and reload Continue; old v1 resumes XP and original awards stay intact');
  await page.evaluate(()=>{const L=window.LANTERNMOSS;L.player.invuln=10000;L.inventory.add('wayfarerKey',99);L.player.placeAt(L.Portals.gate.dir);});
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.PortalUI.isOpen);
  assert.deepEqual(await page.$$eval('[data-destination]',els=>els.map(e=>e.dataset.destination)),['lanternmoss','emberfall','frostveil']);
  const secret=await page.evaluate(async()=>{
    const L=window.LANTERNMOSS;L.PortalUI.close();const {ACHIEVEMENTS}=await import('/src/config/achievements.js');
    ACHIEVEMENTS.push({id:'browserSecretProbe',group:'Firsts',icon:'boss',name:'Spoiler probe',text:'Spoiler text',secret:true,goal:{bosses:['never']}});
    try{L.JournalUI.open();const html=L.JournalUI.achievementsHtml();return !html.includes('Spoiler probe')&&!html.includes('Spoiler text');}
    finally{ACHIEVEMENTS.pop();L.JournalUI.close();}
  });
  assert.ok(secret);assert.deepEqual(errors,[]);console.log('PASS  actual portal picker exposes only released worlds despite keys; secret achievement text masks correctly; zero page errors');
} finally {
  server.kill();server.stdout?.destroy();server.stderr?.destroy();server.unref();
  if(browser){let timeout;try{await Promise.race([browser.close(),new Promise(resolve=>{timeout=setTimeout(()=>{
    const child=browser.process();child?.kill();browser.disconnect();for(const stream of child?.stdio??[])stream?.destroy?.();child?.unref();resolve();
  },10000);})]);}finally{clearTimeout(timeout);}}
}
