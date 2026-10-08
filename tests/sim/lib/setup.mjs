// A fake browser for the headless sims: just enough window / document for the game modules to load and run.
// Also seeds the randomness so a sim plays out the same every run: the game's play stream (src/utils/random.js) and,
// separately, Math.random (the sims' own bots, three.js ids). SIM_SEED picks another seed (default 1).
import { register } from 'node:module';
import { mulberry32, seedPlay } from '../../../src/utils/random.js';
register('./loader.mjs', import.meta.url);

export const SIM_SEED = Number(process.env.SIM_SEED ?? 1);
seedPlay(SIM_SEED);
Math.random = mulberry32((SIM_SEED ^ 0x9e3779b9) >>> 0);

function el(tag = 'div') {
  const kids = [];
  const o = {
    tagName: tag.toUpperCase(), style: { setProperty() {}, removeProperty() {} }, dataset: {}, children: kids, _html: '', textContent: '', value: '', width: 300, height: 150,
    classList: { _s: new Set(), add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); }, toggle(c, v) { (v ?? !this._s.has(c)) ? this._s.add(c) : this._s.delete(c); }, contains(c) { return this._s.has(c); } },
    set innerHTML(v) { this._html = v; kids.length = 0; }, get innerHTML() { return this._html; },
    get firstChild() { return kids[0] ?? (kids[0] = el()); }, get lastChild() { return kids[kids.length - 1] ?? (kids[0] = el()); },
    get parentElement() { return this._parent ?? (this._parent = el()); },
    appendChild(c) { kids.push(c); return c; }, after() {}, before() {}, prepend(c) { kids.unshift(c); return c; }, append(...c) { kids.push(...c); }, remove() {}, removeChild() {},
    insertBefore(c) { kids.push(c); return c; }, replaceChildren() { kids.length = 0; },
    querySelector() { return el(); }, querySelectorAll() { return this._all ?? []; }, closest() { return null; }, contains() { return false; },
    addEventListener() {}, removeEventListener() {}, setPointerCapture() {}, focus() {}, blur() {}, click() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 1280, height: 720 }; },
    setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
    offsetWidth: 0, offsetHeight: 0,
    getContext() { return new Proxy({}, { get: (t, k) => (k in t ? t[k] : (t[k] = typeof k === 'string' && /^(measureText)$/.test(k) ? () => ({ width: 10 }) : () => {})), set: (t, k, v) => { t[k] = v; return true; } }); },
  };
  return o;
}

const winListeners = {};
/** Fires a window event the way the browser would (sim only). */
globalThis.__fire = (type, ev = {}) => { for (const fn of winListeners[type] ?? []) fn({ preventDefault() {}, repeat: false, ...ev }); };
globalThis.window = globalThis;
Object.assign(globalThis, {
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  addEventListener(type, fn) { (winListeners[type] ??= []).push(fn); }, removeEventListener() {}, requestAnimationFrame() {}, cancelAnimationFrame() {},
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
});
const byId = new Map();
globalThis.document = {
  body: el('body'), documentElement: el('html'),
  getElementById(id) { if (!byId.has(id)) byId.set(id, el()); return byId.get(id); },
  querySelector() { return el(); }, querySelectorAll() { return []; },
  createElement: el, createElementNS: (ns, t) => el(t), addEventListener() {},
};
