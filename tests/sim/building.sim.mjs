import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
import { readFileSync } from 'node:fs';
const { game, H, step } = await boot('witch', { wake:false });
const { ctx } = await imp('core/context.js');
const { PLACEABLES } = await imp('config/placeables.js');
const { RECIPES } = await imp('config/crafting.js');
const { bagCommands } = await imp('gameplay/bagCommands.js');
const { useItemInSlot } = await imp('gameplay/itemUse.js');
const { Houses, currentInteraction } = await imp('gameplay/Houses.js');
const { arcDist, offsetDir, dirAlong, tangentFrame } = await imp('utils/sphere.js');
const { buildingForward, snapBuildingDir } = await imp('gameplay/buildingRules.js');
const { cameraBlocked, resolveCollisions, camColliders } = await imp('physics/colliders.js');
const { placed } = await imp('world/placement.js');
const { groundHeight } = await imp('world/terrain.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { DAY } = await imp('config/day.js');
const { parseSave } = await imp('core/save.js');
const B=H.Building, P=H.player, inv=H.inventory, cmd=bagCommands(inv);
const standNear = dir => { for(let a=0;a<6.28;a+=0.5) { const d=offsetDir(dir,a,2.4); if(H.colliders.every(c=>!c.active||arcDist(d,c.dir)>c.r+P.radius)) { P.placeAt(d); P.vel.set(0,0,0); return; } } P.placeAt(offsetDir(dir,0,2.4)); };
const find = (id, turn=0) => {
  for(let ring=18;ring<95;ring+=1.5) for(let a=0;a<6.28;a+=0.09) {
    const d=snapBuildingDir(offsetDir(game.world.spawnDir,a,ring));
    if(!B.siteProblem(id,d,turn,{actors:false})) { standNear(d); if(!B.siteProblem(id,d,turn)) return d; }
  }
  throw new Error(`No buildable ${id} on ${ctx.planetId}`);
};
const put = (id, turn=0) => { const dir=find(id,turn); inv.add(id,1); const n=inv.count(id); assert.ok(B.place(id,dir,turn).ok,id); assert.equal(inv.count(id),n-1); return B.list.at(-1); };
const travel = id => { H.BuildingUI.close(); H.InventoryUI.close(); P.placeAt(H.Portals.gate.dir); assert.ok(H.Portals.travel(id)); step(2); assert.equal(ctx.planetId,id); };

// Every acquisition is an actual player craft, at the right station.
for(const id of Object.keys(PLACEABLES)) {
  inv.clear(); const r=RECIPES.find(r=>r.result===id); for(const [m,n] of r.needs) inv.add(m,n);
  if(r.station) P.placeAt(H.Stations.list.find(s=>s.id===r.station).dir);
  assert.ok(cmd.craft(r).ok,`craft ${id}`); assert.equal(inv.count(id),1);
}
inv.clear();
console.log('PASS all 13 placeables can be crafted from real materials, with station requirements');

const entries = Object.keys(PLACEABLES).map((id,i)=>put(id,i%4));
const chest=entries.find(e=>e.store), plot=entries.find(e=>e.plot), fence=entries.find(e=>e.record.itemId==='gardenFence');
assert.equal(B.list.length,13); assert.equal(H.Farm.plots.filter(p=>p.building).length,1); assert.equal(H.Stations.list.filter(s=>s.building).length,4);
for (let a=0;a<6.28;a+=0.1) { P.placeAt(offsetDir(chest.dir,a,1.3)); if (currentInteraction()?.label.includes('Storage Chest')) break; } assert.match(currentInteraction().label,/Storage Chest/); currentInteraction().run(); assert.equal(ctx.paused,true); H.BuildingUI.close(); assert.equal(ctx.paused,false);
for(const e of entries.filter(e=>e.colliders.length)) {
  const c=e.colliders[0], pos=c.dir.clone().multiplyScalar(groundHeight(c.dir)); resolveCollisions(pos,P.radius,P.selfCollider);
  assert.ok(arcDist(pos.normalize(),c.dir)>c.r+P.radius-0.06,`${e.record.itemId} blocks walkers`);
  assert.ok(cameraBlocked(c.dir.clone().multiplyScalar(groundHeight(c.dir)+Math.min(0.5,PLACEABLES[e.record.itemId].height*0.5))),`${e.record.itemId} blocks camera`);
}
assert.equal(entries.find(e=>e.record.itemId==='stonePath').colliders.length,0); assert.equal(plot.colliders.length,0);
assert.ok(B.lights.length <= 4);
const fp0=fence.colliders.map(c=>c.dir.toArray()); assert.equal(fp0.length,5);
console.log('PASS all pieces place/rotate; solids block movement and camera; paths, rugs and plots stay walk-through; E opens paused management');

standNear(chest.dir); inv.clear(); inv.add('wood',20); inv.add('emberAxe',1,{rarity:'rare',enchantment:'emberRune'});
assert.equal(B.transfer(chest,'deposit',inv.find('wood'),1),1); assert.equal(B.quickStack(),19);
assert.equal(B.transfer(chest,'deposit',inv.find('emberAxe')),1); assert.equal(chest.store.count('wood'),20);
assert.equal(B.remove(chest).ok,false); assert.deepEqual(chest.store.getSlot(chest.store.find('emberAxe')).props,{rarity:'rare',enchantment:'emberRune'});
inv.clear(); inv.add('stone',inv.size*inv.registry.get('stone').maxStack); const savedChest=chest.store.toJSON(); assert.equal(B.transfer(chest,'withdraw',0),0); assert.deepEqual(chest.store.toJSON(),savedChest);
assert.equal(B.remove(chest).ok,false); inv.clear(); assert.equal(B.transfer(chest,'withdraw',chest.store.find('emberAxe')),1); assert.equal(inv.count('emberAxe'),1);
assert.equal(B.transfer(chest,'deposit',inv.find('emberAxe')),1);
console.log('PASS quick-stack, exact and whole-stack storage transfers preserve item data; full bag/occupied chest cannot lose items');

const invalid=[game.world.spawnDir, game.world.lairDir, game.world.houses[0].door, H.Portals.gate.dir, H.ponds[0].dir, placed.find(p=>p.r===0.6).dir, chest.dir];
const { slopeAt } = await imp('world/terrain.js');
let cliff=null; for(let r=38;r<140&&!cliff;r+=3) for(let a=0;a<6.28;a+=.13) { const d=offsetDir(game.world.spawnDir,a,r); if(slopeAt(d)>.4 && /flatter/.test(B.siteProblem('stonePath',d,0,{actors:false})??'')) { cliff=d; break; } }
assert.ok(cliff,'a steep footprint is refused'); invalid.push(cliff);
inv.add('stonePath',1); const qty=inv.count('stonePath');
for(const d of invalid) { P.placeAt(offsetDir(d,0,2)); assert.equal(B.place('stonePath',d).ok,false); assert.equal(inv.count('stonePath'),qty); }
const clear=find('homeTable'); P.placeAt(clear); inv.add('homeTable',1); assert.match(B.place('homeTable',clear).message,/Step clear/); assert.equal(inv.count('homeTable'),1);
P.dead=true; assert.equal(B.start('homeTable').ok,false); P.dead=false;
console.log('PASS squares, paths, lairs, doors, gate, water, overlaps and actor footprints refuse placement without consumption');

// Preview cancellation never consumes items; an actual hotbar/bag use starts it outdoors.
standNear(clear); assert.ok(useItemInSlot(inv,inv.find('homeTable')).ok); assert.ok(B.active); const mana=P.mana; H.tryCast('bolt'); assert.equal(P.mana,mana,'preview blocks combat'); B.rotate(); assert.equal(B.active.turn,1); B.toggleGrid(); assert.equal(B.active.grid,false); B.cancel(); assert.equal(inv.count('homeTable'),1);
inv.clear(); inv.add('hoe',1); inv.add('wateringCan',1); inv.add('carrotSeeds',1);
P.placeAt(plot.dir); H.Hotbar.selected=inv.find('hoe'); H.Farm.till(plot.plot); step(2); assert.equal(plot.plot.s.tilled,true);
H.Farm.plant(plot.plot); assert.equal(plot.plot.s.crop,'carrot'); H.Hotbar.selected=inv.find('wateringCan'); H.Farm.water(plot.plot); step(2); assert.equal(plot.plot.s.watered,true);
assert.equal(B.remove(plot).ok,false); const growth=plot.plot.s.growth; H.Farm.growBy(10); assert.ok(plot.plot.s.growth>growth);
for(const e of entries.filter(e=>e.station)) {
  standNear(e.dir); P.placeAt(offsetDir(e.dir,0,1.3)); assert.equal(H.Stations.here(),e.station.id);
  const r=RECIPES.find(r=>r.station===e.station.id&&!r.discovery&&!r.hero&&(!r.fuel)); inv.clear(); for(const [m,n] of r.needs)inv.add(m,n); P.coins=10000;
  assert.ok(cmd.craft(r).ok,`craft at placed ${e.station.id}`);
}
console.log('PASS preview start/rotation/grid/cancel, all four placed stations craft, and placed plots till/plant/water/grow');

const bed=entries.find(e=>e.record.itemId==='homeBed'); standNear(bed.dir); dayClock.t=DAY.length*0.8; Object.assign(P,{hp:10,mana:5,energy:2}); Houses.rest(true); step(1.2);
assert.equal(dayClock.phase,'morning'); assert.equal(P.hp,P.stats.maxHp); assert.equal(P.mana,P.stats.maxMana); assert.ok(P.energy>99);
assert.ok(H.saves.save().ok); const before=B.toJSON(), colliderCount=camColliders.length;
assert.ok(H.saves.continue()); assert.deepEqual(B.toJSON(),before); assert.equal(camColliders.length,colliderCount);
H.planets.defeated.add('lanternmoss'); travel('emberfall'); assert.equal(B.list.length,0); put('homeLamp'); put('storageChest'); const ember=B.toJSON();
H.planets.defeated.add('emberfall'); travel('frostveil'); assert.equal(B.list.length,0); put('gardenFence',3); const frost=B.toJSON();
travel('lanternmoss'); assert.deepEqual(B.toJSON(),before); travel('emberfall'); assert.deepEqual(B.toJSON(),ember); travel('frostveil'); assert.deepEqual(B.toJSON(),frost);
const returned=B.list[0]; standNear(returned.dir); inv.clear(); inv.add('stone',inv.size*inv.registry.get('stone').maxStack); assert.equal(B.remove(returned).ok,false); inv.clear(); const cs=camColliders.length; assert.ok(B.remove(returned).ok); assert.equal(inv.count('gardenFence'),1); assert.equal(camColliders.length,cs-5);
console.log('PASS own outdoor bed, Continue, separate builds/storage/crops on all three planets, and full-bag pickup/collider cleanup');
const fixture=parseSave(readFileSync(new URL('../fixtures/save-v1.json',import.meta.url),'utf8')); assert.ok(H.saves.importData(fixture.data)); assert.equal(B.list.length,0);
game.resetRun(); assert.equal(B.list.length,0); assert.equal(H.Farm.plots.some(p=>p.building),false); assert.equal(H.Stations.list.some(s=>s.building),false);
console.log('PASS legacy saves and fresh adventures contain no ghost pieces, extra stations or farm plots');
console.log('all passed');
