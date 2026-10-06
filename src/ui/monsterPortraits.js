/* Bestiary portraits: each monster's real model (src/models), posed and lit on its own, rendered once by the game's
   renderer into an image the journal can show (and darken into a silhouette for monsters not met yet). Without a
   renderer (the headless test harness) there are no portraits and the journal shows a glyph instead. */
import * as THREE from 'three';
import { COMBAT } from '../config/combat.js';
import { ENEMY_BUILDERS } from '../models/monsters.js';
import { outlineMat } from '../render/materials.js';
import { disposeTree } from '../render/meshes.js';

const SIZE = 256;                  // rendered at this size, shown smaller (the browser's downscale smooths the edges)
const VIEW = { turn: 0.55, lift: 0.18, fov: 30, margin: 1.2 };   // a three-quarter view from a little above
let renderer = null, stage = null;
const cache = new Map();

export function setPortraitRenderer(r) { renderer = r; }

function makeStage() {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff4e6, 0xb6c8a0, 1.4));
  const sun = new THREE.DirectionalLight(0xffe2bc, 2.2); sun.position.set(2, 4, 3); scene.add(sun);
  const target = new THREE.WebGLRenderTarget(SIZE, SIZE); target.texture.colorSpace = THREE.SRGBColorSpace;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SIZE;
  return { scene, camera: new THREE.PerspectiveCamera(VIEW.fov, 1, 0.05, 200), target, canvas, pixels: new Uint8Array(SIZE * SIZE * 4) };
}

/** A data URL of `type`'s portrait (transparent background), or null if it can't be drawn here. */
export function monsterPortrait(type) {
  if (cache.has(type)) return cache.get(type);
  let url = null;
  if (renderer && ENEMY_BUILDERS[type]) {
    try { url = render(type); } catch { url = null; }
  }
  cache.set(type, url);
  return url;
}

function render(type) {
  stage ??= makeStage();
  const { scene, camera, target, canvas, pixels } = stage;
  const model = ENEMY_BUILDERS[type]({ ...COMBAT.enemies[type] }), root = model.root;
  scene.add(root); root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
  const r = Math.max(s.x, s.y, s.z) * 0.5 * VIEW.margin, d = r / Math.sin(THREE.MathUtils.degToRad(VIEW.fov) / 2);
  camera.position.set(Math.sin(VIEW.turn) * d, c.y + d * VIEW.lift, Math.cos(VIEW.turn) * d).add(new THREE.Vector3(c.x, 0, c.z));
  camera.lookAt(c);
  // draw: outlines sized for this picture, a clear background, then put everything back as it was
  const res = outlineMat.uniforms.uRes.value.clone(), clear = renderer.getClearColor(new THREE.Color()), alpha = renderer.getClearAlpha(), prev = renderer.getRenderTarget();
  outlineMat.uniforms.uRes.value.set(SIZE * 1.6, SIZE * 1.6);
  renderer.setRenderTarget(target); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, camera);
  renderer.readRenderTargetPixels(target, 0, 0, SIZE, SIZE, pixels);
  renderer.setRenderTarget(prev); renderer.setClearColor(clear, alpha); outlineMat.uniforms.uRes.value.copy(res);
  scene.remove(root); disposeTree(root);
  // the pixels come bottom row first: flip them into the canvas
  const g = canvas.getContext('2d'), img = g.createImageData(SIZE, SIZE), row = SIZE * 4;
  for (let y = 0; y < SIZE; y++) img.data.set(pixels.subarray((SIZE - 1 - y) * row, (SIZE - y) * row), y * row);
  g.putImageData(img, 0, 0);
  return canvas.toDataURL('image/png');
}
