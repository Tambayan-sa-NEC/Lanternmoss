/* TERRAIN: the height function shared by the planet mesh, physics and placement.
   A planet's shape (PLANETS[i].terrain: hills, ridges, plateaus) comes from seeded 3D noise, flattened where the
   village, the stone circle, the boss lair and every pond sit (flats), then baked into a cube-map height field so
   groundHeight stays cheap however often physics asks. Ponds carve into it on top.
   Generation order (World.generate): setTerrain -> addFlat / addPond for everything that needs level ground ->
   bakeTerrain -> computeWaterLevel per pond -> anything that samples groundHeight for placement. */
import * as THREE from 'three';
import { PLANET_RADIUS as R, WORLD } from '../config/game.js';
import { clamp, smoothstep } from '../utils/math.js';
import { mulberry32 } from '../utils/random.js';
import { dirAlong, matrixAt, tangentFrame } from '../utils/sphere.js';

export const ponds = [];
const flats = [];
let shape = null, field = null, extent = 0;
const N = WORLD.heightmapRes, ROW = N + 1;

// ---------------------------------------------------------------- seeded gradient noise (improved Perlin)
function permutation(seed) {
  const rng = mulberry32(seed >>> 0), p = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; return perm;
}
const fade = t => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
function grad(h, x, y, z) { const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z; return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); }
function noise3(P, x, y, z) {
  const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = fade(x), v = fade(y), w = fade(z), A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
  return lerp(lerp(lerp(grad(P[AA] & 15, x, y, z), grad(P[BA] & 15, x - 1, y, z), u), lerp(grad(P[AB] & 15, x, y - 1, z), grad(P[BB] & 15, x - 1, y - 1, z), u), v),
    lerp(lerp(grad(P[AA + 1] & 15, x, y, z - 1), grad(P[BA + 1] & 15, x - 1, y, z - 1), u), lerp(grad(P[AB + 1] & 15, x, y - 1, z - 1), grad(P[BB + 1] & 15, x - 1, y - 1, z - 1), u), v), w);
}
/** Fractal noise, roughly -1..1. */
function fbm(P, d, freq, octaves, off) {
  let s = 0, a = 1, f = freq, norm = 0;
  for (let o = 0; o < octaves; o++) { s += a * noise3(P, d.x * f + off, d.y * f + off * 1.7, d.z * f - off); norm += a; a *= 0.5; f *= 2.03; }
  return s / norm * 1.6;
}

/** The planet's own shape at unit direction d, in metres above the base radius (before flats and ponds). */
function shapeAt(d) {
  let h = 0.34 * Math.sin(d.x * 3.1 + 0.7) * Math.sin(d.y * 2.6 + 1.3) + 0.24 * Math.sin(d.z * 4.3 + d.x * 2.1);   // the old gentle wobble
  const s = shape; if (!s) return h;
  if (s.hills) h += s.hills.amp * fbm(s.P, d, s.hills.freq, 4, 11.3);
  if (s.ridges) {                                                   // ridged noise: sharp crests, wide valleys
    let v = 0, a = 1, f = s.ridges.freq, norm = 0;
    for (let o = 0; o < 3; o++) { const n = 1 - Math.abs(noise3(s.P, d.x * f + 3.1, d.y * f - 7.7, d.z * f + 5.3)); v += a * n * n; norm += a; a *= 0.5; f *= 2.1; }
    h += s.ridges.amp * (v / norm - 0.42) * 1.7;
  }
  if (s.plateaus) {                                                 // terraces: flat steps, ramps or cliffs between them
    const p = s.plateaus, n = clamp(fbm(s.P, d, p.freq, 3, -23.9) * 0.5 + 0.5, 0, 1) * p.amp, k = n / p.step, i = Math.floor(k);
    const w = Math.max(0.04, 1 - p.sharp);
    h += (i + smoothstep(1 - w, 1, k - i)) * p.step - p.amp * 0.35;
  }
  return h;
}
function flatMask(d) {
  let m = 1;
  for (const f of flats) { const c = d.dot(f.dir); if (c < f.cull) continue; m = Math.min(m, smoothstep(f.r, f.r + f.fade, Math.acos(Math.min(1, c)) * R)); }
  return m;
}

// ---------------------------------------------------------------- the baked cube-map height field
function faceUV(d) {
  const ax = Math.abs(d.x), ay = Math.abs(d.y), az = Math.abs(d.z);
  if (ax >= ay && ax >= az) return d.x > 0 ? [0, -d.z / ax, d.y / ax] : [1, d.z / ax, d.y / ax];
  if (ay >= az) return d.y > 0 ? [2, d.x / ay, -d.z / ay] : [3, d.x / ay, d.z / ay];
  return d.z > 0 ? [4, d.x / az, d.y / az] : [5, -d.x / az, d.y / az];
}
function faceDir(f, u, v, out) {
  if (f === 0) out.set(1, v, -u); else if (f === 1) out.set(-1, v, u); else if (f === 2) out.set(u, 1, -v);
  else if (f === 3) out.set(u, -1, v); else if (f === 4) out.set(u, v, 1); else out.set(-u, v, -1);
  return out.normalize();
}
function sample(d) {
  const [f, u, v] = faceUV(d), gx = clamp((u + 1) * 0.5 * N, 0, N - 1e-6), gy = clamp((v + 1) * 0.5 * N, 0, N - 1e-6);
  const i = Math.floor(gx), j = Math.floor(gy), tx = gx - i, ty = gy - j, o = f * ROW * ROW + j * ROW + i;
  return lerp(lerp(field[o], field[o + 1], tx), lerp(field[o + ROW], field[o + ROW + 1], tx), ty);
}

/** Starts a planet: its shape (PLANETS[i].terrain) and noise seed. Forgets the previous planet's flats and field. */
export function setTerrain(cfg, seed) {
  shape = cfg ? { ...cfg, P: permutation(seed ^ 0x7e11a1) } : null; flats.length = 0; field = null; extent = 0;
}
/** Keeps the ground level within r of dir (blending back to the planet's shape over `fade` metres). Before bakeTerrain. */
export function addFlat(dir, r, fadeM) { flats.push({ dir: dir.clone().normalize(), r, fade: fadeM, cull: Math.cos(Math.min(Math.PI, (r + fadeM + 1) / R)) }); }
/** Samples the shape (with its flats) into the height field. */
export function bakeTerrain() {
  field = new Float32Array(6 * ROW * ROW); const d = new THREE.Vector3(); extent = 0;
  for (let f = 0; f < 6; f++) for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) {
    faceDir(f, i / N * 2 - 1, j / N * 2 - 1, d);
    const h = shapeAt(d) * flatMask(d); field[f * ROW * ROW + j * ROW + i] = h; extent = Math.max(extent, Math.abs(h));
  }
}
/** The highest the ground rises above (or sinks below) the base radius, in metres. */
export function maxRelief() { return extent + 0.6; }

export function groundHeight(d) {
  let h = R + (field ? sample(d) : shapeAt(d));
  for (const p of ponds) {
    const c = d.dot(p.dir); if (c < p.cull) continue;
    const a = Math.acos(Math.min(1, c)) * R; h -= p.depth * (1 - smoothstep(p.inner, p.r + 0.6, a));   // banks gentle enough to walk out of
  }
  return h;
}

const _g1 = new THREE.Vector3(), _g2 = new THREE.Vector3(), _gs = new THREE.Vector3();
/** Uphill direction (tangent, written to out) and steepness (rise per metre) of the ground at d. */
export function terrainGradient(d, out = new THREE.Vector3()) {
  const [t1, t2] = tangentFrame(d), e = 0.5;
  const h1 = groundHeight(_gs.copy(d).addScaledVector(t1, e / R).normalize()) - groundHeight(_gs.copy(d).addScaledVector(t1, -e / R).normalize());
  const h2 = groundHeight(_gs.copy(d).addScaledVector(t2, e / R).normalize()) - groundHeight(_gs.copy(d).addScaledVector(t2, -e / R).normalize());
  out.copy(_g1.copy(t1).multiplyScalar(h1)).add(_g2.copy(t2).multiplyScalar(h2)).divideScalar(2 * e);
  const k = out.length(); if (k > 1e-6) out.divideScalar(k);
  return k;
}
/** How steep the ground is at d (rise per metre). */
export function slopeAt(d) { return terrainGradient(d, _g1); }

export function addPond(dir, r, depth = 1.8) {
  const p = { dir: dir.clone().normalize(), r, depth, inner: r - Math.max(2.2, depth * 1.5), cull: Math.cos((r + 0.8) / R), fish: [], jumpCool: 3 };
  ponds.push(p); return p;
}
/** Water level = just below the lowest shore point on the rim, measured along the pond's normal. */
export function computeWaterLevel(p) {
  let lo = Infinity; const [t1, t2] = tangentFrame(p.dir);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2; const t = t1.clone().multiplyScalar(Math.cos(a)).addScaledVector(t2, Math.sin(a));
    const d = dirAlong(p.dir, t, p.r); lo = Math.min(lo, groundHeight(d) * d.dot(p.dir));
  }
  p.water = lo - 0.08; p.t1 = t1; p.t2 = t2; p.center = p.dir.clone().multiplyScalar(p.water);
}
/** The water at direction d: { pond, level (distance from the planet centre to the surface along d), depth } or null. */
export function waterAt(d) {
  for (const p of ponds) {
    if (p.water === undefined) continue;
    const c = d.dot(p.dir); if (c < p.cull) continue;
    if (Math.acos(Math.min(1, c)) * R > p.r + 0.4) continue;
    const level = p.water / c, depth = level - groundHeight(d);
    if (depth > 0.05) return { pond: p, level, depth };
  }
  return null;
}

/** Matrix placing an object on the ground at direction dir, rotated by yaw about the surface normal. */
export function surfM(dir, yaw = 0, s = 1, lift = 0) {
  const [t1, t2] = tangentFrame(dir);
  const fwd = t1.multiplyScalar(Math.cos(yaw)).addScaledVector(t2, Math.sin(yaw));
  return matrixAt(dir.clone().multiplyScalar(groundHeight(dir) + lift), dir, fwd, s);
}
export function surfMFacing(dir, fwd, s = 1, lift = 0) { return matrixAt(dir.clone().multiplyScalar(groundHeight(dir) + lift), dir, fwd, s); }
