/* Demon lord boss models: one silhouette (sweeping horns, snout and tusks, spiked pauldrons, a high-collared tattered
   cape, a horned scepter) with a per-planet motif on top. The Winged Demon Lord adds a greatsword, bat wings and the
   'infernal' motif, at a bigger scale. The red dragon (also winged) lives in ./dragon.js and shares addWing.
   def.look = { skin, armor, cape, horn, trim, eye, motif: 'moss' | 'ember' | 'frost' | 'infernal',
                weapon: 'scepter' (default) | 'greatsword', wings: membrane colour (omit = no wings), scale (default 2.9) }
   (config/combat.js, overridden per planet); def.capColor tints the glow (weapon core, chest gem, cape lining).
   Parts: humanoid rig + core (weapon glow, pulsed by the boss behaviour) + cape (swayed by it)
          [+ sword (greatsword pivot), wingL / wingR (wing pivots)]. */
import * as THREE from 'three';
import { addTo, G, part } from '../render/meshes.js';
import { addSkirt, buildHumanoid } from './humanoid.js';

const LOOK = { skin: 0x6a4a7a, armor: 0x2e2638, cape: 0x2a1838, horn: 0xe8dcc4, trim: 0xffd36b, eye: 0xffe066, motif: 'moss' };

/** A horn curling out from the temple, then up and back: tapered segments along a bending path (sx = side). */
function addHorn(head, sx, color, tipColor) {
  const g = new THREE.Group(); g.position.set(sx * 0.27, 0.2, -0.04); g.rotation.x = -0.35; head.add(g);
  const segs = [[1.25, 0.22, 0.1, 0.085], [0.7, 0.22, 0.085, 0.065], [0.15, 0.24, 0.065, 0]];   // [angle from vertical, length, r bottom, r top]
  let x = 0, y = 0;
  segs.forEach(([a, len, rb, rt], i) => {
    const dx = sx * Math.sin(a) * len, dy = Math.cos(a) * len, last = i === segs.length - 1;
    addTo(g, part(last ? G.cone(rb, len, 5) : G.cyl(rt, rb, len, 5), last && tipColor !== undefined ? tipColor : color,
      last && tipColor !== undefined ? { glow: true, intensity: 2.4 } : {}), [x + dx / 2, y + dy / 2, 0], [0, 0, -sx * a]);
    x += dx; y += dy;
  });
  return g;
}

export function buildDemonLord(def = {}) {
  const L = { ...LOOK, ...def.look }, glow = def.capColor ?? def.color ?? 0x9b6ad6;
  const dark = new THREE.Color(L.skin).multiplyScalar(0.7).getHex(), armorDk = new THREE.Color(L.armor).multiplyScalar(0.75).getHex();
  const h = buildHumanoid({ skin: L.skin, top: L.armor, hem: armorDk, pants: armorDk, shoes: 0x1a1420, belt: L.trim, sleeve: L.armor, w: 1.3, face: false });
  const hd = h.head;
  // ---- face: heavy brow, slanted glowing eyes, a snout bridging into the muzzle, tusked jaw, pointed ears
  for (const sx of [-1, 1]) {
    addTo(hd, part(G.box(0.24, 0.08, 0.12), dark), [sx * 0.12, 0.11, 0.3], [0.15, 0, sx * 0.38]);
    addTo(hd, part(G.box(0.12, 0.045, 0.04), L.eye, { glow: true, intensity: 3 }), [sx * 0.13, 0.03, 0.34], [0, sx * 0.3, sx * 0.3]);
    addTo(hd, part(G.cone(0.07, 0.26, 4), L.skin), [sx * 0.4, 0.06, -0.04], [0, 0, -sx * 1.15], [1, 1, 0.5]);
  }
  addTo(hd, part(G.box(0.13, 0.1, 0.26), L.skin), [0, -0.01, 0.37], [-0.4, 0, 0]);                          // nose bridge
  addTo(hd, part(G.ico(0.18, 1), L.skin), [0, -0.13, 0.44], [0.12, 0, 0], [1, 0.72, 1.45]);                  // long muzzle
  for (const sx of [-1, 1]) addTo(hd, part(G.box(0.03, 0.025, 0.12), dark), [sx * 0.05, 0.02, 0.44], [-0.4, 0, -sx * 0.25]);   // snarl wrinkles
  addTo(hd, part(G.ico(0.07, 0), dark), [0, -0.07, 0.68], [0, 0, 0], [1.4, 0.8, 1]);                          // nose tip
  for (const sx of [-1, 1]) addTo(hd, part(G.box(0.05, 0.018, 0.02), 0x140a14, { outline: false }), [sx * 0.045, -0.1, 0.715], [0, 0, sx * 0.5]);
  addTo(hd, part(G.box(0.3, 0.09, 0.32), dark), [0, -0.27, 0.38], [0.12, 0, 0]);                               // lower jaw
  for (const sx of [-1, 1]) {
    addTo(hd, part(G.cone(0.04, 0.2, 4), 0xfff6e6), [sx * 0.15, -0.18, 0.52], [-0.2, 0, -sx * 0.35]);       // tusks
    addTo(hd, part(G.cone(0.025, 0.09, 4), 0xfff6e6), [sx * 0.07, -0.24, 0.62], [Math.PI, 0, 0]);            // fangs
  }
  const tip = L.motif === 'ember' ? glow : undefined;
  for (const sx of [-1, 1]) addHorn(hd, sx, L.horn, tip);
  // crown of spikes on an iron band
  addTo(hd, part(new THREE.TorusGeometry(0.36, 0.035, 4, 14), 0x2a2230), [0, 0.2, -0.02], [Math.PI / 2 - 0.1, 0, 0]);
  for (let i = -2; i <= 2; i++) { const a = i * 0.42;
    addTo(hd, part(G.cone(0.05, 0.2 - Math.abs(i) * 0.03, 4), L.trim), [Math.sin(a) * 0.35, 0.33 - Math.abs(i) * 0.02, Math.cos(a) * 0.35 - 0.04], [0.15, 0, -a * 0.35]); }
  // ---- armour: breastplate with a glowing heart gem, spiked pauldrons, clawed gauntlets, a hanging tasset
  addTo(h.body, part(G.ico(0.36, 1), L.armor), [0, 0.86, 0.1], [0, 0, 0], [1.2, 1, 0.85]);
  addTo(h.body, part(G.box(0.36, 0.06, 0.08), L.trim), [0, 1.05, 0.33], [0.3, 0, 0]);
  addTo(h.body, part(G.oct(0.09), glow, { glow: true, intensity: 2.8 }), [0, 0.9, 0.42]);
  for (const sx of [-1, 1]) {
    addTo(h.body, part(G.ico(0.22, 0), L.armor), [sx * 0.47, 1.12, 0], [0, 0, 0], [1.25, 0.8, 1.15]);
    addTo(h.body, part(G.box(0.2, 0.04, 0.3), L.trim), [sx * 0.5, 1.02, 0], [0, 0, -sx * 0.4]);
    for (const [z, len] of [[-0.09, 0.3], [0.09, 0.24]]) addTo(h.body, part(G.cone(0.06, len, 4), L.horn), [sx * 0.58, 1.27, z], [0, 0, -sx * 0.55]);
  }
  for (const arm of [h.armL, h.armR]) {
    addTo(arm, part(G.box(0.17, 0.16, 0.18), armorDk), [0, -0.31, 0]);
    for (const dx of [-0.05, 0.05]) addTo(arm, part(G.cone(0.025, 0.12, 4), L.horn), [dx, -0.5, 0.05], [Math.PI + 0.3, 0, 0]);
  }
  addTo(h.body, part(G.box(0.34, 0.42, 0.04), L.cape), [0, 0.36, 0.56], [-0.12, 0, 0]);
  addTo(h.body, part(G.box(0.14, 0.1, 0.06), L.trim), [0, 0.6, 0.56]);
  // ---- cape: wraps the back from the shoulders and flares to a tattered hem, glow-tinted lining, pointed collar framing the head
  const cape = new THREE.Group(); cape.position.set(0, 1.18, 0); h.body.add(cape);
  const from = Math.PI / 2 + 0.15, span = Math.PI - 0.3, rBot = 0.82;
  addSkirt(cape, 0.5, rBot, 1.05, from, span, L.cape, new THREE.Color(glow).multiplyScalar(0.45).getHex(), [0, -0.52, 0]);
  addTo(cape, part(new THREE.TorusGeometry(0.5, 0.04, 4, 12, span), L.trim), [0, 0, 0], [Math.PI / 2, 0, Math.PI / 2 - from - span]);
  for (let i = 0; i < 7; i++) { const a = from + (i + 0.5) / 7 * span;
    addTo(cape, part(G.cone(0.13, 0.26, 4), L.cape), [Math.sin(a) * rBot, -1.17 + (i % 2) * 0.05, Math.cos(a) * rBot], [0, a, Math.PI], [1, 1, 0.25]); }   // tattered hem
  for (const sx of [-1, 1]) for (const [dx, len, lean] of [[0.26, 0.75, 0.3], [0.42, 0.5, 0.65]])
    addTo(h.body, part(G.cone(0.15, len, 4), L.cape), [sx * dx, 1.18 + len / 2, -0.3], [-0.3, -sx * 0.5, -sx * lean], [1, 1, 0.25]);   // collar spikes
  const extra = {};
  let core;
  if (L.weapon === 'greatsword') ({ core, sword: extra.sword } = addGreatsword(h.armR, L, glow));
  else {
    // ---- scepter: iron shaft, horned head cradling the glowing core
    const staff = new THREE.Group(); staff.position.set(0, -0.42, 0.05); h.armR.add(staff);
    addTo(staff, part(G.cyl(0.05, 0.06, 1.6, 6), 0x2a2230), [0, 0, 0.6], [Math.PI / 2, 0, 0]);
    addTo(staff, part(G.cyl(0.09, 0.07, 0.14, 6), L.trim), [0, 0, 1.24], [Math.PI / 2, 0, 0]);
    for (const sy of [-1, 1]) addTo(staff, part(G.cone(0.06, 0.42, 4), L.horn), [0, sy * 0.16, 1.5], [Math.PI / 2 - sy * 0.55, 0, 0]);
    core = addTo(staff, part(G.ico(0.18, 1), glow, { glow: true, intensity: 2.8 }), [0, 0, 1.47]);
  }
  if (L.wings !== undefined) {
    const o = { span: 2.1, bone: L.horn, skin: L.wings, inner: new THREE.Color(glow).multiplyScalar(0.5).getHex() };
    extra.wingL = addWing(h.body, -1, [-0.22, 1.08, -0.36], o); extra.wingR = addWing(h.body, 1, [0.22, 1.08, -0.36], o);
  }
  MOTIFS[L.motif]?.(h, L, glow, cape);
  h.root.scale.setScalar(L.scale ?? 2.9);
  return { ...h, core, cape, ...extra };
}

/** Two-handed greatsword in the right fist, blade along the pivot's +z (the behaviour pitches the pivot for its swings).
    Returns the pivot and the crossguard gem (core). */
function addGreatsword(arm, L, glow) {
  const sword = new THREE.Group(); sword.position.set(0, -0.42, 0.05); arm.add(sword);
  addTo(sword, part(G.cyl(0.045, 0.05, 0.42, 6), 0x2a1a22), [0, 0, -0.02], [Math.PI / 2, 0, 0]);       // grip
  addTo(sword, part(G.oct(0.08), L.trim), [0, 0, -0.26]);                                             // pommel
  addTo(sword, part(G.box(0.12, 0.62, 0.1), L.trim), [0, 0, 0.22]);                                    // crossguard
  for (const sy of [-1, 1]) addTo(sword, part(G.cone(0.05, 0.22, 4), L.horn), [0, sy * 0.38, 0.28], [sy > 0 ? 0.5 : Math.PI - 0.5, 0, 0]);
  addTo(sword, part(G.box(0.07, 0.24, 1.75), 0x3a3440), [0, 0, 1.15]);                                // blade
  addTo(sword, part(G.box(0.075, 0.06, 1.5), glow, { glow: true, intensity: 2.4 }), [0, 0, 1.08]);  // burning rune line
  addTo(sword, part(G.cone(0.12, 0.34, 4), 0x3a3440), [0, 0, 2.18], [Math.PI / 2, Math.PI / 4, 0], [0.6, 1, 1]);
  const core = addTo(sword, part(G.ico(0.11, 1), glow, { glow: true, intensity: 3 }), [0, 0, 0.22]);
  return { sword, core };
}

/** A bat wing on a pivot (sx = side) reaching out along +x * sx: bony leading edge with a clawed wrist, three finger
    bones and a scalloped membrane in the pivot's XY plane. Animate the pivot: rotation.y swings it back (folded), .z lifts it. */
export function addWing(parent, sx, at, { span = 2.4, bone = 0x2a1a22, skin = 0x5a1a24, inner = 0x8a2a30 } = {}) {
  const pivot = new THREE.Group(); pivot.position.set(...at); parent.add(pivot);
  const V = (x, y) => new THREE.Vector2(x * sx * span, y * span);
  const wrist = [0.42, 0.4], tips = [[1, 0.24], [0.8, -0.2], [0.52, -0.44]], notches = [[0.7, 0.03], [0.48, -0.16], [0.26, -0.3]];
  const pts = [V(0, 0.06), V(...wrist)]; tips.forEach((t, i) => pts.push(V(...t), V(...notches[i]))); pts.push(V(0.04, -0.2));
  const membrane = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.035 * span, bevelEnabled: false }).translate(0, 0, -0.0175 * span);
  addTo(pivot, part(membrane, skin), [0, 0, 0]);
  const panel = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(p => p.clone().multiplyScalar(0.8))), { depth: 0.04 * span, bevelEnabled: false });
  addTo(pivot, part(panel.translate(0, 0, -0.02 * span), inner, { outline: false }), [0.04 * sx * span, -0.02 * span, 0]);   // darker inner panel
  const boneTo = (a, b, r) => {
    const dx = (b[0] - a[0]) * sx * span, dy = (b[1] - a[1]) * span, len = Math.hypot(dx, dy);
    addTo(pivot, part(G.cyl(r * 0.7, r, len, 5), bone), [a[0] * sx * span + dx / 2, a[1] * span + dy / 2, 0], [0, 0, Math.atan2(dy, dx) - Math.PI / 2]);
  };
  boneTo([0, 0.06], wrist, 0.06 * span);
  for (const t of tips) boneTo(wrist, t, 0.035 * span);
  addTo(pivot, part(G.cone(0.04 * span, 0.16 * span, 4), 0xf3e6c8), [wrist[0] * sx * span, (wrist[1] + 0.07) * span, 0]);   // wrist claw
  return pivot;
}

/** Per-planet details layered on the shared demon lord. */
const MOTIFS = {
  /** Malgrath: a second, greater pair of horns, molten crimson cracks, burning shoulder spikes and a spiked halo of fire. */
  infernal(h, L, glow) {
    for (const sx of [-1, 1]) addHorn(h.head, sx, L.horn, glow).scale.setScalar(1.7);
    for (const [x, y, r] of [[-0.14, 0.78, 0.6], [0.12, 0.74, -0.5], [0.05, 1.0, 0.9], [-0.06, 0.62, -0.2], [0.18, 0.92, 0.2]])
      addTo(h.body, part(G.box(0.025, 0.22, 0.02), glow, { glow: true, intensity: 2.6 }), [x, y, 0.4], [0, 0, r]);
    for (const sx of [-1, 1]) for (const [dz, len] of [[-0.08, 0.36], [0.08, 0.26]])
      addTo(h.body, part(G.cone(0.07, len, 4), glow, { glow: true, intensity: 2.2 }), [sx * 0.46, 1.32 + len / 2, dz], [0, 0, -sx * 0.2]);
    const halo = new THREE.Group(); halo.position.set(0, 0.25, -0.42); h.head.add(halo);
    addTo(halo, part(new THREE.TorusGeometry(0.52, 0.03, 4, 20), glow, { glow: true, intensity: 2 }), [0, 0, 0]);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2;
      addTo(halo, part(G.cone(0.05, 0.22, 4), glow, { glow: true, intensity: 2.2 }), [Math.cos(a) * 0.62, Math.sin(a) * 0.62, 0], [0, 0, a - Math.PI / 2]); }
  },
  /** Gloomcap: a mossy mantle and glowing toadstools sprouting from the crown and pauldrons. */
  moss(h, L, glow) {
    const moss = [0x5f8a4a, 0x6f9a5a, 0x7fae64];
    for (let i = 0; i < 7; i++) { const a = (i / 6 - 0.5) * 2.6;
      addTo(h.body, part(G.ico(0.13 + (i % 2) * 0.03, 0), moss[i % 3]), [Math.sin(a) * 0.36, 1.16, Math.cos(a) * 0.2 - 0.12]); }
    const shroom = (parent, p, s) => { const g = new THREE.Group(); g.position.set(...p); g.scale.setScalar(s); parent.add(g);
      addTo(g, part(G.cyl(0.03, 0.04, 0.12, 5), 0xf2e6d8), [0, 0.06, 0]);
      addTo(g, part(G.hemi(0.09, 7, 3), glow, { glow: true, intensity: 2 }), [0, 0.11, 0]); };
    for (const [x, z, s] of [[-0.14, 0.24, 1], [0.16, 0.22, 0.8], [0, -0.26, 1.1]]) shroom(h.head, [x, 0.26, z], s);
    for (const sx of [-1, 1]) shroom(h.body, [sx * 0.42, 1.24, 0.12], 1.2);
  },
  /** Cindercap: molten cracks across the breastplate and embers flickering on the pauldrons (horn tips glow too). */
  ember(h, L, glow) {
    for (const [x, y, r] of [[-0.14, 0.78, 0.6], [0.12, 0.74, -0.5], [0.05, 1.0, 0.9], [-0.06, 0.62, -0.2]])
      addTo(h.body, part(G.box(0.025, 0.2, 0.02), glow, { glow: true, intensity: 2.6 }), [x, y, 0.4], [0, 0, r]);
    for (const sx of [-1, 1]) for (const [dz, len] of [[-0.06, 0.3], [0.06, 0.22]])
      addTo(h.body, part(G.cone(0.07, len, 4), glow, { glow: true, intensity: 2.2 }), [sx * 0.44, 1.3 + len / 2, dz], [0, 0, -sx * 0.15]);
  },
  /** Rimecap: tall ice crystals in the crown, shards on the shoulders and a frost-white fur trim on the cape. */
  frost(h, L, glow) {
    const ice = 0xdff6ff;
    for (const [a, len] of [[0.21, 0.42], [-0.21, 0.42], [0.63, 0.32], [-0.63, 0.32], [1.05, 0.24], [-1.05, 0.24]])
      addTo(h.head, part(G.cone(0.055, len, 4), ice), [Math.sin(a) * 0.36, 0.2 + len / 2, Math.cos(a) * 0.36 - 0.04], [0.15, 0, -a * 0.4]);
    for (const sx of [-1, 1]) for (const [dz, len, tilt] of [[-0.08, 0.4, 0.4], [0.08, 0.28, 0.75]])
      addTo(h.body, part(G.oct(0.08), ice), [sx * 0.5, 1.3, dz], [0, 0, -sx * tilt], [0.6, len / 0.16, 0.6]);
    for (let i = 0; i < 6; i++) addTo(h.body, part(G.ico(0.11, 0), 0xf4fbff), [(i - 2.5) * 0.15, 1.2, -0.36]);
  },
};
