// UI update regressions on the real fourth-world test candidate. Edge/SwiftShader; owns port 8140.
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {tidewhisperBrowser} from './lib/tidewhisper-browser.mjs';
const {page,errors,close}=await tidewhisperBrowser({port:8140});
try{
 await page.evaluate(async()=>{
  const L=window.LANTERNMOSS,{ctx}=await import('/src/core/context.js'),{offsetDir,tangentToward}=await import('/src/utils/sphere.js');
  const {dayClock}=await import('/src/gameplay/dayClock.js'),{DAY}=await import('/src/config/day.js');
  L.CharacterSelect.pick('witch');L.begin();L.Tutorial.skip();L.Pets.command('passive');L.goToPlanet('tidewhisper');
  L.player.invuln=1e9;dayClock.t=.4*DAY.length;dayClock.update=()=>{};L.setWeather('clear');ctx.paused=false;L.update(1/60);ctx.paused=true;
  const n=L.npcs.find(n=>n.name==='Marlo');L.player.placeAt(offsetDir(n.up,0,1));L.player.place(L.player.root);n.place(n.root);
  const {resetView,snapCamera,updateCamera,setShowcase}=await import('/src/systems/CameraSystem.js'),{camera}=await import('/src/render/scene.js');
  setShowcase(null);L.player.vel.set(0,0,0);L.player.fwd.copy(tangentToward(L.player.up,n.up));resetView(L.player.fwd);snapCamera(L.player.up,L.player.fwd);updateCamera(1/60);camera.updateMatrixWorld();
  const {dom}=await import('/src/ui/dom.js');dom.challengeResult.classList.remove('show');dom.toast.style.opacity=0;dom.saveNotice.style.visibility='hidden';dom.hint.style.display='none';
 });
 for(const [width,height]of [[1280,720],[1920,1080]]){
  await page.setViewport({width,height});
  const result=await page.evaluate(async()=>{
   const {dom}=await import('/src/ui/dom.js'),{updateOverlay}=await import('/src/ui/overlay.js');
   const hud=await import('/src/ui/hud.js'),{updateWaypoints}=await import('/src/ui/waypoints.js');
   const {setSetting}=await import('/src/core/settings.js'),{rebind}=await import('/src/core/keybinds.js');
   updateOverlay(1);const original=dom.prompt.innerHTML;
   const prompt=new MutationObserver(()=>{}),chips=new MutationObserver(()=>{});prompt.observe(dom.prompt,{childList:true});chips.observe(dom.hud,{childList:true});
   try{
    for(let i=0;i<20;i++)updateOverlay(.3);
    const unchanged={prompt:prompt.takeRecords().length,chips:chips.takeRecords().length};
    window.LANTERNMOSS.player.coins++;updateOverlay(.3);const changedCoins=chips.takeRecords().length>0;
    rebind('interact','KeyY');updateOverlay(.3);const changedKey=dom.prompt.innerHTML.includes('<kbd>Y</kbd>')&&dom.prompt.innerHTML.includes('Marlo');
    const scales=[];for(const scale of [80,100,125]){setSetting('uiScale',scale);hud.applyUiScale();scales.push(hud.uiScale===Number(getComputedStyle(document.documentElement).getPropertyValue('--ui')));}
    setSetting('uiScale',100);hud.applyUiScale();let reads=0;const computed=window.getComputedStyle;window.getComputedStyle=(...args)=>{reads++;return computed(...args);};
    try{updateWaypoints();}finally{window.getComputedStyle=computed;}
    const boxes=[dom.hud,dom.combat,dom.compass].filter(e=>getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {id:e.id,left:r.left,right:r.right,top:r.top,bottom:r.bottom};});
    const {currentInteraction,Houses}=await import('/src/gameplay/Houses.js'),{ctx}=await import('/src/core/context.js');
    return {unchanged,changedCoins,changedKey,scales,reads,original,prompt:dom.prompt.innerHTML,debug:{interaction:currentInteraction()?.label,started:ctx.started,fade:Houses.fade,inside:!!Houses.inside,dialog:window.LANTERNMOSS.Dialog.open},boxes,overflow:document.documentElement.scrollWidth>innerWidth};
   }finally{prompt.disconnect();chips.disconnect();}
  });
  assert.deepEqual(result.unchanged,{prompt:0,chips:0});assert.ok(result.changedCoins);assert.ok(result.changedKey,JSON.stringify({original:result.original,prompt:result.prompt,debug:result.debug}));assert.ok(result.scales.every(Boolean));assert.equal(result.reads,0);assert.equal(result.overflow,false);
  for(const box of result.boxes)assert.ok(box.left>=-1&&box.top>=-1&&box.right<=width+1&&box.bottom<=height+1,`${box.id} stays inside ${width}x${height}`);
  await page.screenshot({path:join(tmpdir(),`lanternmoss-hud-performance-${height}.png`)});
  console.log(`PASS ${width}x${height}: no unchanged prompt/chip mutations; live coins/key/scale updates; no computed-style marker reads or overflow`);
 }
 await page.evaluate(async()=>{const {ctx}=await import('/src/core/context.js');ctx.paused=false;});
 await page.keyboard.press('KeyY');
 assert.ok(await page.evaluate(()=>window.LANTERNMOSS.Dialog.open),'real rebound interaction key opens Marlo dialogue');
 assert.deepEqual(errors,[]);console.log('PASS actual rebound keyboard interaction; zero page/shader errors');
}finally{await close();}
