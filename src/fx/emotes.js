/* EMOTE BUBBLES: little speech-bubble sprites (heart, star, !, ♪ ...) that pop above a character and float away. */
import * as THREE from 'three';
import { scene } from '../render/scene.js';
import { smoothstep } from '../utils/math.js';

const emoteCache = {};
function emoteTexture(sym, color) {
  const key = sym + color; if (emoteCache[key]) return emoteCache[key];
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.strokeStyle = '#3a2340'; g.lineWidth = 8; g.lineJoin = 'round';
  g.beginPath(); g.arc(64, 58, 44, 0, Math.PI * 2); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(50, 94); g.lineTo(62, 120); g.lineTo(78, 94); g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.arc(64, 58, 40, 0, Math.PI * 2); g.fill();
  g.fillStyle = color; g.strokeStyle = '#3a2340'; g.lineWidth = 5;
  if (sym === 'heart') { g.beginPath(); g.moveTo(64, 84); g.bezierCurveTo(20, 56, 36, 22, 64, 42); g.bezierCurveTo(92, 22, 108, 56, 64, 84); g.fill(); g.stroke(); }
  else if (sym === 'star') { g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 11 : 32, a = i / 8 * Math.PI * 2 - Math.PI / 2; g.lineTo(64 + Math.cos(a) * r, 58 + Math.sin(a) * r); } g.closePath(); g.fill(); g.stroke(); }
  else {
    g.font = 'bold 62px "M PLUS Rounded 1c","Segoe UI Symbol","DejaVu Sans",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.strokeText(sym, 64, 62); g.fillText(sym, 64, 62);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; emoteCache[key] = t; return t;
}

const emotes = [];
/** ent needs pos, up and optionally height / hover (any Walker, the owl, a fish...). */
export function emote(ent, sym, color = '#ff6b9a') {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emoteTexture(sym, color), transparent: true, depthWrite: false, fog: false }));
  s.renderOrder = 5; scene.add(s); emotes.push({ s, ent, t: 0 });
}
export function updateEmotes(dt) {
  for (let i = emotes.length - 1; i >= 0; i--) {
    const e = emotes[i]; e.t += dt; const k = e.t / 1.7;
    e.s.position.copy(e.ent.pos).addScaledVector(e.ent.up, (e.ent.height || 1) + 0.35 + (e.ent.hover || 0) + e.t * 0.35);
    const pop = Math.min(1, e.t / 0.22), back = 1 + 2.7 * Math.pow(pop - 1, 3) + 1.7 * Math.pow(pop - 1, 2);
    e.s.scale.setScalar(0.85 * back); e.s.material.opacity = 1 - smoothstep(0.7, 1, k);
    if (k >= 1) { scene.remove(e.s); e.s.material.dispose(); emotes.splice(i, 1); }
  }
}
