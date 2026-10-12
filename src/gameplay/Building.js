import * as THREE from 'three';
import { foundationProblem, structureBoxes, updateStructureView } from './structurePlacement.js';
import { pieceConflict, pieceFootprint, pieceMatrix, resolveStructure, restoredStructureCandidate, structureRemovalProblem } from './structureRules.js';
import { BUILDING, PLACEABLES } from '../config/placeables.js';
import { HOTBAR } from '../config/items.js';
import { WORLD } from '../config/game.js';
import { ctx } from '../core/context.js';
import { cancelAim } from '../combat/aiming.js';
import { groundUnderScreen } from '../combat/area.js';
import { Inventory } from '../inventory/Inventory.js';
import { transferStack, quickStack } from '../inventory/storage.js';
import { addCollider, removeCollider, colliders, dynColliders } from '../physics/colliders.js';
import { disposeTree } from '../render/meshes.js';
import { scene } from '../render/scene.js';
import { pointer } from '../systems/InputSystem.js';
import { audio } from '../systems/AudioSystem.js';
import { InventoryUI } from '../ui/InventoryUI.js';
import { toast } from '../ui/toast.js';
import { arcDist, dirAlong, matrixAt, offsetDir } from '../utils/sphere.js';
import { placed } from '../world/placement.js';
import { groundHeight, ponds, slopeAt } from '../world/terrain.js';
import { buildPlaceable } from '../world/placeables.js';
import { buildingFootprint, buildingForward, footprintsOverlap, snapBuildingDir } from './buildingRules.js';
import { ACTION_HANDLERS } from './itemUse.js';
import { Farm } from './Farm.js';
import { Stations } from './Stations.js';
import { Home } from './Home.js';
import { Challenges } from './challenges/Challenges.js';
import { Gathering } from './Gathering.js';
import { Fishing } from './Fishing.js';

export const Building = {
  lights: [], list: [], active: null, world: null, callbacks: {},
  setup(world) { this.clear(); this.world = world; },
  toJSON() { return this.list.map(e => ({ ...e.record, ...(e.store ? { slots: e.store.toJSON() } : {}) })); },
  load(data) {
    this.clear();
    const pending=structuredClone(data); let progress=true;
    // Foundations first; connected cells and dependent panels/contents may appear in any save order.
    pending.sort((a,b)=>(PLACEABLES[a.itemId].structure==='floor'?0:1)-(PLACEABLES[b.itemId].structure==='floor'?0:1));
    while(progress&&pending.length) {
      progress=false;
      for(let i=0;i<pending.length;) {
        const record=pending[i],dir=new THREE.Vector3(...record.dir),candidate=restoredStructureCandidate(this.list,record);
        if(!candidate.problem&&candidate.dir.distanceTo(dir)<.00001&&!this.siteProblem(record.itemId,dir,record.turn,{actors:false,candidate})) {
          this.install(record);pending.splice(i,1);progress=true;
        } else i++;
      }
    }
  },
  clear() { this.cancel(); for (const e of [...this.list]) this.uninstall(e); this.list = []; for (const light of this.lights) { scene.remove(light); light.dispose(); } this.lights = []; },
  available() { return ctx.started && !ctx.player.dead && !ctx.indoors && !ctx.transitioning && !ctx.cutscene && !Challenges.run && !Gathering.job && !Fishing.active; },
  canEdit(e) { return this.available() && this.list.includes(e) && arcDist(ctx.player.up, e.dir) < BUILDING.reach; },
  changed() { audio.plip(); this.callbacks.save?.(); },
  samples(id, dir, turn) {
    const r = PLACEABLES[id].radius;
    return [dir, ...Array.from({ length: 8 }, (_, i) => offsetDir(dir, i * Math.PI / 4 + turn * Math.PI / 2, r))];
  },
  baseHeight(id, dir, turn) { return Math.max(...this.samples(id, dir, turn).map(d => groundHeight(d) / d.dot(dir))) + 0.025; },
  siteProblem(id, dir, turn = 0, { actors = true, candidate = null } = {}) {
    const def = Object.hasOwn(PLACEABLES, id) ? PLACEABLES[id] : null;
    if (!def || !dir?.isVector3 || !dir.toArray().every(Number.isFinite) || Math.abs(dir.length() - 1) > 0.001) return 'Choose a spot on the ground.';
    if (!this.world) return 'Start an adventure first.';
    candidate ??= resolveStructure(this.list,id,dir,turn);
    if(candidate.problem)return candidate.problem;
    const attachment=candidate.structure, record={id:0,itemId:id,dir:dir.toArray(),turn,structure:attachment};
    const foundation=foundationProblem(this,{...candidate,itemId:id});if(foundation)return foundation;
    const fp = pieceFootprint(this.list,record), overlap = (d, r) => fp.some(p => arcDist(p.dir, d) < p.r + r);
    if (overlap(this.world.spawnDir, 6)) return 'Keep the village square clear.';
    if (overlap(this.world.lairDir, WORLD.flats.lair[0] + 4) || ctx.enemies.some(e => (e.isMiniBoss || e.portalId) && e.home && overlap(e.home, 10))) return 'Keep boss and mini-boss lairs clear.';
    if (overlap(this.world.stoneCenter, 8)) return 'Keep the standing-stone circle clear.';
    if (this.world.houses.some(h => overlap(h.door, 2.2))) return 'Keep house doors clear.';
    if (placed.some(p => overlap(p.dir, p.r))) return 'Keep village paths and scenery clear.';
    if (Farm.center && overlap(Farm.center, 8) || Stations.center && overlap(Stations.center, 5)) return 'Keep the village farm and crafting corner clear.';
    if (this.callbacks.gate?.() && overlap(this.callbacks.gate(), 3)) return 'Keep the lantern gate clear.';
    if (ponds.some(p => overlap(p.dir, p.r + 1))) return 'Choose dry ground away from water.';
    const samples = this.samples(id, dir, turn), heights = samples.map(d => groundHeight(d));
    if (!attachment?.floor && !attachment?.root && (samples.some(d => slopeAt(d) > BUILDING.maxSlope) || Math.max(...heights) - Math.min(...heights) > BUILDING.maxRelief)) return 'Choose flatter ground for this piece.';
    if (colliders.some(c => c.active && !c.building && overlap(c.dir, c.r + 0.08))) return 'That spot is occupied by scenery.';
    if (this.list.some(e => { const conflict=pieceConflict(this.list,record,e.record); return conflict ?? footprintsOverlap(fp,pieceFootprint(this.list,e.record)); })) return 'A placed piece already occupies that spot.';
    if (actors && def.structure!=='roof' && dynColliders.some(c => c.active && overlap(c.dir, c.r + 0.1))) return 'Step clear and keep people and creatures out of the spot.';
    return null;
  },
  place(id, dir, turn = 0, { candidate = null } = {}) {
    if (!this.available() || ctx.paused || ctx.inventoryOpen) return { ok: false, message: 'Build outside while standing, with menus closed and no activity in progress.' };
    if (this.list.length >= BUILDING.limit) return { ok: false, message: `This planet has reached its ${BUILDING.limit}-piece limit. Pick up a piece first.` };
    if (!Object.hasOwn(PLACEABLES, id) || !ctx.player.inventory.count(id)) return { ok: false, message: 'Craft and bring this placeable first.' };
    if (!dir || arcDist(ctx.player.up, dir) > BUILDING.range) return { ok: false, message: 'Move closer to that spot.' };
    turn = Number.isInteger(turn) ? ((turn % 4) + 4) % 4 : 0;
    candidate ??= resolveStructure(this.list,id,dir,turn); dir=candidate.dir; turn=candidate.turn;
    if (arcDist(ctx.player.up,dir)>BUILDING.range)return {ok:false,message:'Move closer to that snapped spot.'};
    const problem = this.siteProblem(id, dir, turn,{candidate}); if (problem) return { ok: false, message: problem };
    const record = { id: Math.max(0, ...this.list.map(e => e.record.id)) + 1, itemId: id, dir: dir.toArray(), turn: ((Math.floor(turn) % 4) + 4) % 4 };
    if (candidate.structure)record.structure=candidate.structure;
    if (PLACEABLES[id].farm) record.plot = { tilled: false, crop: null, growth: 0, watered: false };
    const e = this.install(record);
    if (!ctx.player.inventory.remove(id, 1)) { this.uninstall(e); return { ok: false, message: 'The item is no longer in your bag.' }; }
    this.changed(); return { ok: true, message: `Placed ${PLACEABLES[id].name}.` };
  },
  install(record) {
    const def = PLACEABLES[record.itemId], dir = new THREE.Vector3(...record.dir), parts = buildPlaceable(record.itemId);
    parts.root.matrixAutoUpdate = false;
    const baseHeight=this.baseHeight(record.itemId,dir,record.turn);
    parts.root.matrix.copy(pieceMatrix(this.list,record,baseHeight) ?? matrixAt(dir.clone().multiplyScalar(baseHeight),dir,buildingForward(dir,record.turn)));
    scene.add(parts.root);
    const e = { record, dir, parts, baseHeight, colliders: [] }; this.list.push(e);
    if (def.structure) { e.colliders=structureBoxes(e); e.colliders.forEach(c=>{c.building=true;}); }
    else if (def.solid) for (const p of buildingFootprint(record.itemId, dir, record.turn)) {
      const c = addCollider(p.dir, def.fence ? p.r : def.solid, { r: def.fence ? p.r + 0.04 : def.solid + 0.08, top: def.height });
      c.building = true; e.colliders.push(c);
    }
    if (def.storage) { e.store = new Inventory(BUILDING.storageSlots); e.store.load(record.slots); }
    if (def.crafting) {
      e.station = { id: def.crafting, def: Stations.definitions[def.crafting], dir, fwd: buildingForward(dir, record.turn), parts, puffT: 0, building: true };
      Stations.list.push(e.station);
    }
    if (def.farm) { e.plot = { dir, s: record.plot, parts, stage: -1, up: dir, building: true }; Farm.plots.push(e.plot); Farm.look(e.plot); }
    this.updateLights(); return e;
  },
  uninstall(e) {
    if (e.station) Stations.list = Stations.list.filter(s => s !== e.station);
    if (e.plot) Farm.plots = Farm.plots.filter(p => p !== e.plot);
    e.colliders.forEach(removeCollider); scene.remove(e.parts.root); disposeTree(e.parts.root); e.parts.soil?.dispose();
    this.list = this.list.filter(x => x !== e);
  },
  remove(e) {
    if (!this.canEdit(e)) return { ok: false, message: 'Stand beside your piece to pick it up.' };
    const dependency=structureRemovalProblem(this.list,e,ctx.player.up);if(dependency)return {ok:false,message:dependency};
    if (e.store && e.store.freeSlots() !== e.store.size) return { ok: false, message: 'Empty this chest before picking it up.' };
    if (e.plot?.s.crop) return { ok: false, message: 'Harvest this crop before picking up its plot.' };
    if (ctx.player.inventory.spaceFor(e.record.itemId) < 1) return { ok: false, message: 'Make room in your bag first.' };
    ctx.player.inventory.add(e.record.itemId, 1); this.uninstall(e); this.changed();
    return { ok: true, message: 'Returned the piece to your bag.' };
  },
  transfer(e, direction, slot, quantity = Infinity) {
    if (!this.canEdit(e) || !e.store) return 0;
    const bag = ctx.player.inventory, n = direction === 'deposit' ? transferStack(bag, e.store, slot, quantity) : transferStack(e.store, bag, slot, quantity);
    if (n) this.changed(); return n;
  },
  quickStack() {
    if (!this.available()) return 0;
    const stores = this.list.filter(e => e.store && this.canEdit(e)).map(e => e.store);
    const n = quickStack(ctx.player.inventory, stores, HOTBAR.size); if (n) this.changed(); return n;
  },
  nearest() { return this.list.map(e => ({ e, d: arcDist(ctx.player.up, e.dir) })).filter(x => x.d < BUILDING.reach).sort((a, b) => a.d - b.d)[0] ?? null; },
  target() {
    if (!this.available() || this.active) return null;
    const near = this.nearest(); if (!near) return null;
    return { dist: near.d - 0.1, label: `Manage ${PLACEABLES[near.e.record.itemId].name}`, at: near.e.dir.clone().multiplyScalar(groundHeight(near.e.dir) + 1.6), run: () => this.callbacks.open?.(near.e) };
  },
  start(id) {
    if (!this.available() || ctx.paused || !Object.hasOwn(PLACEABLES, id)) return { ok: false, message: 'Place this outside with no activity in progress, or furnish it inside your cottage.' };
    if (!ctx.player.inventory.count(id)) return { ok: false, message: 'Bring this placeable in your bag first.' };
    this.cancel(); cancelAim(); InventoryUI.close();
    const parts = buildPlaceable(id), material = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, depthTest: false, color: 0x72e6ad });
    parts.root.traverse(o => { if (o.isLight) o.visible = false; if (o.isMesh) o.material = material; });
    const ring = new THREE.Mesh(new THREE.RingGeometry(PLACEABLES[id].radius, PLACEABLES[id].radius + 0.045, 32), material); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; parts.root.add(ring);
    parts.root.traverse(o => { if (o.isMesh) o.renderOrder = 20; });
    parts.root.matrixAutoUpdate = false; scene.add(parts.root);
    ctx.building = true;
    this.active = { id, turn: 0, grid: true, parts, material, dir: null, problem: '' }; this.update();
    return { ok: true, message: '' };
  },
  cancel() {
    if (this.active) { scene.remove(this.active.parts.root); disposeTree(this.active.parts.root); this.active.parts.soil?.dispose(); this.active.material.dispose(); }
    this.active = null; ctx.building = false; this.callbacks.preview?.(null);
  },
  rotate() { if (this.active) { this.active.turn = (this.active.turn + 1) % 4; this.update(); } },
  toggleGrid() { if (this.active) { this.active.grid = !this.active.grid; this.update(); } },
  confirm() {
    const a = this.active; if (!a) return;
    const result = this.place(a.id,a.dir,a.candidate.turn,{candidate:a.candidate}); toast(result.message);
    if (result.ok && !ctx.player.inventory.count(a.id)) this.cancel(); else this.update();
    return result;
  },
  updateStructureView(cameraForward) { updateStructureView(this,ctx.indoors ? this.world.spawnDir : ctx.player.up,cameraForward); },
  updateLights() {
    const lamps = ctx.indoors ? [] : this.list.filter(e => e.record.itemId === 'homeLamp').map(e => ({ e, d: arcDist(ctx.player.up, e.dir) })).filter(x => x.d < 12).sort((a, b) => a.d - b.d).slice(0, BUILDING.lightLimit);
    if (lamps.length && !this.lights.length) for (let i = 0; i < BUILDING.lightLimit; i++) { const light = new THREE.PointLight(0xffd36b, 3, 7, 2); this.lights.push(light); scene.add(light); }
    this.lights.forEach((light, i) => { light.visible = !!lamps[i]; if (lamps[i]) light.position.set(0,1.5,0).applyMatrix4(lamps[i].e.parts.root.matrix); });
  },
  update() {
    this.updateLights();
    const a = this.active; if (!a) return;
    if (!this.available() || ctx.inventoryOpen || !ctx.player.inventory.count(a.id)) { this.cancel(); return; }
    if (ctx.paused) { a.parts.root.visible = false; this.callbacks.preview?.(null); return; }
    a.parts.root.visible = true;
    const hit = pointer.over ? groundUnderScreen(pointer.x, pointer.y) : null;
    if (hit) { a.cursor = hit; a.pointerMode = true; }
    const raw = hit ?? (a.pointerMode ? a.cursor : dirAlong(ctx.player.up, ctx.player.fwd, 4));
    const candidate=resolveStructure(this.list,a.id,a.grid ? snapBuildingDir(raw) : raw.clone(),a.turn);
    a.dir=candidate.dir; a.candidate=candidate;
    a.problem = arcDist(ctx.player.up, a.dir) > BUILDING.range ? 'Move closer: build within 8 metres.' : this.siteProblem(a.id,a.dir,candidate.turn,{candidate});
    a.material.color.setHex(a.problem ? 0xf36b7e : 0x72e6ad);
    const record={id:0,itemId:a.id,dir:a.dir.toArray(),turn:candidate.turn,structure:candidate.structure};
    a.parts.root.matrix.copy(pieceMatrix(this.list,record,this.baseHeight(a.id,a.dir,candidate.turn)+.025) ?? matrixAt(a.dir.clone().multiplyScalar(this.baseHeight(a.id,a.dir,candidate.turn)+.025),a.dir,buildingForward(a.dir,candidate.turn)));
    this.callbacks.preview?.(a);
  },
};
ACTION_HANDLERS.place = (inventory, slot) => Building.start(inventory.getSlot(slot)?.itemId);
ACTION_HANDLERS.furnish = (inventory, slot) => ctx.indoors ? Home.place(inventory.getSlot(slot)?.itemId) : Building.start(inventory.getSlot(slot)?.itemId);
