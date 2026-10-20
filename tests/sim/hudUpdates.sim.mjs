import assert from 'node:assert/strict';
import {boot,imp} from './lib/boot.mjs';
const {H}=await boot('witch',{wake:false}); H.Tutorial.skip(); H.Pets.command('passive');
const {dom}=await imp('ui/dom.js'),{updateOverlay}=await imp('ui/overlay.js');
const hud=await imp('ui/hud.js'),{updateWaypoints}=await imp('ui/waypoints.js');
const {setSetting}=await imp('core/settings.js'),{rebind,resetBinds}=await imp('core/keybinds.js');
const {offsetDir}=await imp('utils/sphere.js');
const npc=H.npcs[0];H.player.placeAt(offsetDir(npc.up,0,1));
function countWrites(el){
 const descriptor=Object.getOwnPropertyDescriptor(el,'innerHTML');let count=0;
 Object.defineProperty(el,'innerHTML',{configurable:true,get(){return descriptor.get.call(this);},set(value){count++;descriptor.set.call(this,value);}});
 return ()=>count;
}
const prompts=countWrites(dom.prompt),chips=countWrites(dom.hud);
updateOverlay(1);assert.match(dom.prompt.innerHTML,/Talk to/);const prompt=dom.prompt.innerHTML,initialPrompt=prompts(),initialChips=chips();
for(let i=0;i<20;i++)updateOverlay(.3);
assert.equal(prompts(),initialPrompt);assert.equal(chips(),initialChips);
H.player.coins++;updateOverlay(.3);assert.equal(chips(),initialChips+1);assert.ok(dom.hud.innerHTML.includes(`${H.player.coins} coins`));
rebind('interact','KeyY');updateOverlay(.3);assert.notEqual(dom.prompt.innerHTML,prompt);assert.match(dom.prompt.innerHTML,/<kbd>Y<\/kbd>/);resetBinds();
H.player.placeAt(offsetDir(H.player.up,0,40));updateOverlay(.3);assert.equal(dom.prompt.style.display,'none');
H.player.placeAt(offsetDir(npc.up,0,1));updateOverlay(.3);assert.equal(dom.prompt.style.display,'block');assert.equal(dom.prompt.innerHTML,prompt);
console.log('PASS unchanged prompt/chips preserve DOM; coin changes, rebound interaction and hide/return refresh correctly');
for(const [width,height,scale]of [[1280,720,100],[1920,1080,150],[960,540,60]]){
 globalThis.innerWidth=width;globalThis.innerHeight=height;setSetting('uiScale',scale);hud.applyUiScale();
 const expected=Number((Math.max(.75,Math.min(1.3,Math.min(width/1280,height/720)))*scale/100).toFixed(3));assert.equal(hud.uiScale,expected);
}
let reads=0;const original=getComputedStyle;globalThis.getComputedStyle=(...args)=>{reads++;return original(...args);};
updateWaypoints();assert.equal(reads,0);globalThis.getComputedStyle=original;
console.log('PASS marker scale tracks viewport/settings with no computed-style reads');
