// Real WebGL/input/storage checks. Uses an isolated test server; requires local puppeteer-core and Edge/CHROME.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
const root=fileURLToPath(new URL('..',import.meta.url)), port=8101, shots=fileURLToPath(new URL('../docs/screenshots/',import.meta.url));
const server=spawn(process.execPath,['scripts/serve.mjs',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser, stderr=''; server.stderr.on('data',d=>{stderr+=d;});
try {
  await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);server.once('exit',c=>reject(new Error(stderr||`server exited ${c}`)));});
  browser=await puppeteer.launch({executablePath:process.env.CHROME??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const page=await browser.newPage(), errors=[]; page.on('pageerror',e=>errors.push(String(e))); page.setDefaultTimeout(90000);
  await page.setViewport({width:1280,height:720}); await page.goto(`http://localhost:${port}/`,{waitUntil:'networkidle0'}); await page.waitForFunction(()=>window.LANTERNMOSS);
  await page.click('[data-act="play"]');
  await page.evaluate(async()=>{
    const {setSetting}=await import('/src/core/settings.js');setSetting('pauseOnBlur',false);setSetting('quality','low');
    const L=window.LANTERNMOSS;L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip(); L.player.invuln=10000;
    // Fixture helper finds legal land; all placement/rotation/confirmation below uses real controls.
    const {offsetDir,tangentToward,arcDist}=await import('/src/utils/sphere.js');
    const {snapBuildingDir}=await import('/src/gameplay/buildingRules.js');
    const {pointer}=await import('/src/systems/InputSystem.js');
    const {snapCamera}=await import('/src/systems/CameraSystem.js');
    window.prepareBuild=async id=>{
      L.BuildingUI.close();L.InventoryUI.close();L.Building.cancel();L.inventory.clear();L.inventory.insertAt(0,id,2);L.Hotbar.selected=0;L.Hotbar.cd=0;
      for(let r=18;r<95;r+=1.5)for(let a=0;a<6.28;a+=.08){
        const d=snapBuildingDir(offsetDir(L.planets.world.spawnDir,a,r));
        if([0,1,2,3].some(turn=>L.Building.siteProblem(id,d,turn,{actors:false})))continue;
        const p=offsetDir(d,a,4);L.player.placeAt(p);L.player.fwd.copy(tangentToward(p,d));L.player.vel.set(0,0,0);
        pointer.over=false; snapCamera(L.player.up,L.player.fwd);L.update(.01);
        if(!L.Building.siteProblem(id,d))return;
      }
      throw new Error(`No buildable ${id}`);
    };
    window.approachPiece=async id=>{
      const {currentInteraction}=await import('/src/gameplay/Houses.js');
      const e=L.Building.list.find(e=>e.record.itemId===id);
      for(let a=0;a<6.28;a+=.1){L.player.placeAt(offsetDir(e.dir,a,1.4));L.player.vel.set(0,0,0);if(currentInteraction()?.label.includes((await import('/src/config/placeables.js')).PLACEABLES[id].name)){snapCamera(L.player.up,tangentToward(L.player.up,e.dir));return;}}
      throw new Error(`Cannot approach ${id}`);
    };
  });
  const prepare=async id=>{await page.evaluate(id=>window.prepareBuild(id),id);await page.keyboard.press('Digit1');await page.waitForFunction(()=>window.LANTERNMOSS.Building.active);};
  await prepare('gardenFence');await page.keyboard.press('KeyY');await page.keyboard.press('KeyU');
  assert.deepEqual(await page.evaluate(()=>{const a=window.LANTERNMOSS.Building.active;return[a.turn,a.grid];}),[1,false]);
  await page.keyboard.press('Escape'); assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('gardenFence')),2);
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.PauseMenu.isOpen),false);
  await prepare('gardenFence'); await page.keyboard.press('KeyY');
  await page.waitForFunction(()=>!window.LANTERNMOSS.Building.active.problem,{timeout:15000});
  await page.waitForFunction(()=>document.getElementById('cresult').getAnimations().every(a=>a.playState==='finished'));
  await page.evaluate(async()=>{const {cam,updateCamera}=await import('/src/systems/CameraSystem.js');cam.fwd.applyAxisAngle(cam.up,.55);updateCamera(.1);});
  await page.screenshot({path:shots+'building-preview.jpg',type:'jpeg',quality:85});
  await page.keyboard.press('Enter'); assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Building.list.length),1);
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('gardenFence')),1);
  await page.keyboard.press('Escape');
  console.log('PASS hotbar preview, real rotation/grid keys, cancel without consumption, green preview and Enter placement');

  // Invalid ghost in the village square cannot consume a piece.
  await prepare('stonePath');
  await page.evaluate(async()=>{const L=window.LANTERNMOSS,{offsetDir,tangentToward}=await import('/src/utils/sphere.js'),{pointer}=await import('/src/systems/InputSystem.js');const d=L.planets.world.spawnDir;L.player.placeAt(offsetDir(d,0,4));L.player.fwd.copy(tangentToward(L.player.up,d));pointer.over=false;L.Building.active.pointerMode=false;L.Building.update();});
  await page.keyboard.press('Enter'); assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('stonePath')),2);
  assert.match(await page.$eval('#building-preview span',e=>e.textContent),/square/);await page.keyboard.press('Escape');
  console.log('PASS red preview explains protected ground and Enter refuses it without consuming an item');

  await prepare('storageChest');await page.waitForFunction(()=>!window.LANTERNMOSS.Building.active.problem,{timeout:15000});await page.keyboard.press('KeyE');await page.keyboard.press('Escape');
  await page.evaluate(()=>window.approachPiece('storageChest'));await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.BuildingUI.isOpen);
  await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('#building-menu')));await page.keyboard.press('Escape');
  await page.evaluate(()=>{const L=window.LANTERNMOSS;L.inventory.clear();L.inventory.insertAt(9,'wood',12);L.inventory.insertAt(10,'stone',8);L.inventory.insertAt(11,'emberAxe',1,{rarity:'rare',enchantment:'emberRune'});});
  await page.keyboard.press('KeyE');await page.waitForFunction(()=>window.LANTERNMOSS.BuildingUI.isOpen);
  await page.click('[data-build-quantity]');await page.click('[data-build-transfer="deposit"][data-slot="9"]');
  assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Building.list.find(e=>e.store).store.count('wood')),1);
  await page.click('[data-build-stack]');assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('wood')),0);
  await page.click('[data-build-transfer="deposit"][data-slot="11"]');assert.equal(await page.evaluate(()=>window.LANTERNMOSS.inventory.count('emberAxe')),0);
  await page.click('[data-build-pickup]');assert.ok(await page.evaluate(()=>window.LANTERNMOSS.BuildingUI.isOpen));assert.match(await page.$eval('.building-panel [role="status"]',e=>e.textContent),/Empty/);
  const bounds=async()=>page.$eval('.building-panel',e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,sw:e.scrollWidth,cw:e.clientWidth}));
  let b=await bounds();assert.ok(b.top>=18&&b.bottom<=702);assert.equal(b.sw,b.cw);
  await page.screenshot({path:shots+'building-storage.jpg',type:'jpeg',quality:85});
  await page.setViewport({width:1920,height:1080});b=await bounds();assert.ok(b.top>=18&&b.bottom<=1062);assert.equal(b.sw,b.cw);
  await page.click('[data-build-sort]');await page.keyboard.press('Escape');
  console.log('PASS real E management, trapped keyboard focus, exact/quick-stack/gear transfers, occupied-chest pickup refusal, sorting and 720p/1080p bounds');

  // Starting from the bag closes it; pointer ground aiming and a real left click place a path.
  await page.setViewport({width:1280,height:720});
  await page.evaluate(()=>window.prepareBuild('stonePath')); await page.keyboard.press('KeyI');
  await page.click('[data-bag-sort]');
  const bagBounds=await page.$eval('#inventory',e=>({top:e.getBoundingClientRect().top,bottom:e.querySelector('.inv-detail').getBoundingClientRect().bottom}));
  assert.ok(bagBounds.top>=0&&bagBounds.bottom<=720,`bag fits: ${JSON.stringify(bagBounds)}`);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Digit1');
  await page.waitForFunction(()=>window.LANTERNMOSS.Building.active&&!window.LANTERNMOSS.Building.active.problem);
  const point=await page.evaluate(async()=>{const L=window.LANTERNMOSS,{camera}=await import('/src/render/scene.js'),{groundHeight}=await import('/src/world/terrain.js');
    const a=L.Building.active,d=a.dir.clone().multiplyScalar(groundHeight(a.dir)+.03).project(camera);return{x:(d.x+1)*innerWidth/2,y:(1-d.y)*innerHeight/2};});
  await page.mouse.move(point.x,point.y);
  await page.waitForFunction(()=>window.LANTERNMOSS.Building.active.pointerMode&&!window.LANTERNMOSS.Building.active.problem);
  await page.mouse.click(point.x,point.y);assert.equal(await page.evaluate(()=>window.LANTERNMOSS.Building.list.length),3);
  await page.keyboard.press('Escape');
  console.log('PASS bag sorting layout and real pointer aiming / left-click placement');
  assert.ok(await page.evaluate(()=>window.LANTERNMOSS.saves.save().ok));
  await page.reload({waitUntil:'networkidle0'});await page.waitForFunction(()=>window.LANTERNMOSS);await page.click('[data-act="continue"]');
  await page.waitForFunction(()=>window.LANTERNMOSS.Building.list.length===3);
  const saved=await page.evaluate(()=>{const L=window.LANTERNMOSS,e=L.Building.list.find(e=>e.store);return{wood:e.store.count('wood'),gear:e.store.getSlot(e.store.find('emberAxe')).props,turn:L.Building.list.find(e=>e.record.itemId==='gardenFence').record.turn};});
  assert.deepEqual(saved,{wood:12,gear:{rarity:'rare',enchantment:'emberRune'},turn:1});
  assert.deepEqual(errors,[]);console.log('All building browser checks passed; real page reload/Continue preserves builds and chest data, with no page errors.');
} finally {if(browser)await browser.close();server.kill();}
