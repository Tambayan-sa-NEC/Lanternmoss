/* HOW DUSKHOLLOW'S LANTERN LOOKS (TODO 30a). The rules live in lantern.js; this is what the World draws for them,
   the same split the tide uses between its mechanic and the World's water.
   Every frame it hands the mechanic's darkness to the shared local light (render/lighting.js), which dims the sun,
   sky and fog but keeps its minimum ambient and the ink outlines, so the lowest preset stays readable. The hero's
   carried light becomes the belt lantern: its radius and strength come from the tank, and an empty lantern shrinks
   to a safe ember rather than going out. Walking lights the glowmoss (fx/glowmoss.js).
   A cave owns the darkness while the hero is in one (gameplay/Dungeons.js), so the view stands back there. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { Glowmoss } from '../../fx/glowmoss.js';
import { LocalLights } from '../../render/lighting.js';
import { addTo, disposeTree, G, part } from '../../render/meshes.js';
import { activeLantern } from './lantern.js';
import { clamp } from '../../utils/math.js';

/** The small lantern hanging from the hero's belt: a glass body around a flame that drops when the oil runs out. */
function buildBeltLantern() {
  const group = new THREE.Group();
  for (const y of [0.1, -0.1]) addTo(group, part(G.cyl(0.07, 0.07, 0.03, 6), 0x4a3a2a), [0, y, 0]);
  for (const sx of [-1, 1]) addTo(group, part(G.box(0.015, 0.2, 0.015), 0x4a3a2a), [sx * 0.055, 0, 0]);
  addTo(group, part(new THREE.TorusGeometry(0.045, 0.012, 4, 8, Math.PI), 0x4a3a2a), [0, 0.12, 0]);
  const flame = addTo(group, part(G.oct(0.055), 0xffe6a0, { glow: true, intensity: 2.6 }), [0, 0, 0]);
  return { group, flame };
}

export class LanternView {
  constructor(density = 1) {
    this.moss = new Glowmoss(); this.moss.applyDensity(density);
    this.belt = buildBeltLantern(); this.attached = null;
  }
  /** After the world's daylight and before LocalLights.update, which picks up the darkness set here. */
  update(dt, player) {
    const lamp = activeLantern(); if (!lamp || ctx.room) return;     // in a cave the cave owns the dark
    const s = lamp.status;
    LocalLights.setDarkness(s.darkness);
    const hero = LocalLights.heroLight;
    // a fog of Umbra's scales (30h) presses the carried light in while it hangs on the hero; transient, never saved
    const blind = clamp(player?.blindK ?? 1, 0.1, 1);
    if (hero) { hero.source.radius = s.radius * blind; hero.source.intensity = s.intensity; }
    if (player) {                                                   // the lantern hangs clear of the witch's skirt and the knight's coat
      if (this.attached !== player.body) { player.body?.add(this.belt.group); this.belt.group.position.set(0.44, 0.62, 0.06); this.attached = player.body; }
      this.belt.flame.scale.setScalar(s.lit ? 1 : 0.45);
      this.moss.track(player.up, player.fwd, player.grounded && !player.swimming && !s.indoors);
    }
    this.moss.update(dt);
  }
  applyDensity(density) { this.moss.applyDensity(density); }
  /** Live prints, for the checks. */
  get prints() { return this.moss.lit; }
  dispose() {
    LocalLights.setDarkness(0);
    this.moss.dispose();
    this.belt.group.removeFromParent(); disposeTree(this.belt.group);
    this.belt = null; this.attached = null;
  }
}
