// Real WebGL/input/structure management and reload checks. Owns a temporary server on 8102.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)),port=8102,shots=fileURLToPath(new URL('../docs/screenshots/',import.meta.url));
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});let browser,stderr='';server.stderr.on('data',d=>{stderr+=d;});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error(stderr||`server exited ${c}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720});await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);
  await page.click('[data-act="play"]');
  await page.evaluate(async()=>{
    const {setSetting}=await import('/src/core/settings.js');setSetting('pauseOnBlur',false);setSetting('quality','low');
    const L=window.LANTERNMOSS;L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.player.invuln=10000;
    const {offsetDir,dirAlong,tangentToward}=await import('/src/utils/sphere.js'),{snapBuildingDir}=await import('/src/gameplay/buildingRules.js');
    const {floorFrame}=await import('/src/gameplay/structureRules.js'),{pointer}=await import('/src/systems/InputSystem.js');
    const {snapCamera}=await import('/src/systems/CameraSystem.js');
    window.findFoundation=()=>{for(let r=18;r<120;r+=1.5)for(let a=0;a<6.28;a+=.08){const d=snapBuildingDir(offsetDir(L.planets.world.spawnDir,a,r));if(!L.Building.siteProblem('timberFloor',d,1,{actors:false}))return d;}throw new Error('No foundation');};
    window.preparePiece=(id,turn=0)=>{
      L.BuildingUI.close();L.Building.cancel();L.inventory.clear();L.inventory.insertAt(0,id,1);L.Hotbar.selected=0;L.Hotbar.cd=0;
      const floor=L.Building.list.find(e=>e.record.itemId==='timberFloor'),d=floor?floor.dir:window.findFoundation();
      const normal=floor?floorFrame(L.Building.list,floor).fwd.clone().applyAxisAngle(floor.dir,turn*Math.PI/2):tangentToward(d,offsetDir(d,0,4));
      L.player.placeAt(dirAlong(d,normal,4));L.player.fwd.copy(tangentToward(L.player.up,d));L.player.vy=0;L.player.grounded=true;L.player.jumpBuf=0;pointer.over=false;snapCamera(L.player.up,L.player.fwd);
      window.fixtureAim=d.toArray();
    };
    window.standInside=()=>{const floor=L.Building.list.find(e=>e.record.itemId==='timberFloor'),f=floorFrame(L.Building.list,floor);const d=L.Building.list.some(e=>e.record.itemId==='homeBed')?f.center.clone().addScaledVector(f.right,-.65).addScaledVector(f.fwd,1.25).normalize():floor.dir;L.player.placeAt(d);L.player.vy=0;L.player.vel.set(0,0,0);snapCamera(L.player.up,f.fwd);};
  });
  const place=async(id,turn=0)=>{
    await page.evaluate((id,turn)=>window.preparePiece(id,turn),id,turn);await page.keyboard.press('Digit1');await page.waitForFunction(()=>window.LANTERNMOSS.Building.active);
    await page.evaluate(()=>{const a=window.LANTERNMOSS.Building.active;a.pointerMode=true;a.cursor=window.LANTERNMOSS.player.up.clone().fromArray(window.fixtureAim);});
    for(let i=0;i<turn;i++)await page.keyboard.press('KeyY');
    await page.waitForFunction(()=>!window.LANTERNMOSS.Building.active.problem,{timeout:15000});await page.keyboard.press('Enter');
    await page.waitForFunction(()=>!window.LANTERNMOSS.Building.active);
  };
  await place('timberFloor',1);
  await place('timberDoorway',0);await place('timberWall',2);await place('timberWindow',1);await place('timberWall',3);await place('timberRoof');
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Building.list.length),6);
  await page.waitForFunction(()=>document.getElementById('cresult').getAnimations().every(a=>a.playState==='finished'));
  await page.evaluate(async()=>{const L=window.LANTERNMOSS,{floorFrame}=await import('/src/gameplay/structureRules.js'),{dirAlong,tangentToward}=await import('/src/utils/sphere.js'),{cam,snapCamera,updateCamera}=await import('/src/systems/CameraSystem.js');const f=floorFrame(L.Building.list,L.Building.list[0]);L.player.placeAt(dirAlong(f.root.dir,f.fwd,6));L.player.fwd.copy(tangentToward(L.player.up,f.root.dir));snapCamera(L.player.up,L.player.fwd);cam.dist=10;updateCamera(.1);L.Building.updateStructureView(cam.fwd);});
  await page.screenshot({path:shots+'structures-exterior.jpg',type:'jpeg',quality:85});
  console.log('PASS real hotbar preview, rotation and Enter build a floor, four panels and supported roof');

  await page.evaluate(()=>window.standInside());
  await page.waitForFunction(()=>!window.LANTERNMOSS.Building.list.find(e=>e.record.itemId==='timberRoof').parts.root.visible);
  const support=await page.evaluate(async()=>{const L=window.LANTERNMOSS,{supportHeight}=await import('/src/physics/colliders.js');return{r:L.player.r,h:supportHeight(L.player.up)};});assert.ok(Math.abs(support.r-support.h)<.02);
  await page.screenshot({path:shots+'structures-interior.jpg',type:'jpeg',quality:85});
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.BuildingUI.isOpen);
  const ids=await page.evaluate(()=>Object.fromEntries(window.LANTERNMOSS.Building.list.map(e=>[e.record.itemId+(e.record.itemId==='timberWall'?e.record.turn:''),e.record.id])));
  await page.click(`[data-build-piece="${ids.timberWall3}"]`);await page.click('[data-build-pickup]');
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.BuildingUI.isOpen);await page.click(`[data-build-piece="${ids.timberWall2}"]`);await page.click('[data-build-pickup]');
  assert.match(await page.$eval('.building-panel [role="status"]',e=>e.textContent),/roof/);
  await page.click(`[data-build-piece="${ids.timberFloor}"]`);await page.click(`[data-build-piece="${ids.timberRoof}"]`);await page.click('[data-build-pickup]');
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('timberRoof')),1);
  await place('timberWall',3);await place('timberRoof');await page.evaluate(()=>window.standInside());await page.keyboard.press('KeyE');
  const bounds=async()=>page.$eval('.building-panel',e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,sw:e.scrollWidth,cw:e.clientWidth}));
  let b=await bounds();assert.ok(b.top>=18&&b.bottom<=702);assert.equal(b.sw,b.cw);
  await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('#building-menu')));
  await page.setViewport({width:1920,height:1080});b=await bounds();assert.ok(b.top>=18&&b.bottom<=1062);assert.equal(b.sw,b.cw);await page.keyboard.press('Escape');
  console.log('PASS inside floor support/cutaway, attached-piece UI, safe roof dependency pickup, focus and 720p/1080p layout');

  // A real movement key takes the hero out through the doorway; cutaways restore automatically.
  await page.evaluate(()=>window.standInside());await page.keyboard.down('KeyW');
  await page.waitForFunction(async()=>{const L=window.LANTERNMOSS,{floorFrame}=await import('/src/gameplay/structureRules.js'),f=floorFrame(L.Building.list,L.Building.list.find(e=>e.record.itemId==='timberFloor'));return L.player.pos.clone().sub(f.center).dot(f.fwd)>2.6;},{timeout:20000});await page.keyboard.up('KeyW');
  await page.waitForFunction(()=>window.LANTERNMOSS.Building.list.find(e=>e.record.itemId==='timberRoof').parts.root.visible);
  // Verify the storage panel's support-floor link stays reachable on a compact viewport.
  await page.evaluate(async()=>{
    const L=window.LANTERNMOSS,{floorFrame}=await import('/src/gameplay/structureRules.js'),{dirAlong}=await import('/src/utils/sphere.js');
    const f=floorFrame(L.Building.list,L.Building.list.find(e=>e.record.itemId==='timberFloor'));L.inventory.clear();
    for(const [id,x,z] of [['homeBed',-.4,-.4],['storageChest',1.1,1.1]]){
      const d=f.center.clone().addScaledVector(f.right,x).addScaledVector(f.fwd,z).normalize();L.player.placeAt(dirAlong(f.root.dir,f.fwd,4));L.inventory.add(id,1);const r=L.Building.place(id,d);if(!r.ok)throw new Error(r.message);
    }
    L.inventory.add('wood',5);window.standInside();L.BuildingUI.open(L.Building.list.find(e=>e.store));
  });
  await page.setViewport({width:1280,height:720});b=await bounds();assert.ok(b.top>=18&&b.bottom<=702);assert.equal(b.sw,b.cw);
  await page.click('[data-build-transfer="deposit"][data-slot="9"]');
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Building.list.find(e=>e.store).store.count('wood')),5);
  await page.click(`[data-build-piece="${ids.timberFloor}"]`);assert.match(await page.$eval('#building-title',e=>e.textContent),/Floor/);await page.keyboard.press('Escape');
  console.log('PASS floor-mounted storage transfers and reachable support-floor navigation at 720p');
  await page.evaluate(()=>window.standInside());assert.ok(await page.evaluate(()=>window.LANTERNMOSS.saves.save().ok));
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await page.click('[data-act="continue"]');await page.waitForFunction(()=>window.LANTERNMOSS.Building.list.length===8);
  const continued=await page.evaluate(async()=>{const L=window.LANTERNMOSS,{supportHeight}=await import('/src/physics/colliders.js');return{r:L.player.r,h:supportHeight(L.player.up),roof:L.Building.list.find(e=>e.record.itemId==='timberRoof').parts.root.visible,wood:L.Building.list.find(e=>e.store).store.count('wood')};});
  assert.ok(Math.abs(continued.r-continued.h)<.02);assert.equal(continued.roof,false);assert.equal(continued.wood,5);assert.deepEqual(errors,[]);
  console.log('All structure browser checks passed: real doorway movement, automatic exterior restoration and reload Continue on the built floor; no page errors.');
} finally {if(browser)await browser.close();server.kill();}
