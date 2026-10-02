/* AUDIO (procedural, WebAudio): soft pad, wind-chimes and every sound effect. All sounds are synthesized
   PLACEHOLDERS: to use real samples, swap the body of the matching method. Nothing plays until init() runs
   from a user gesture (browsers block audio before that); every method is a no-op until then. */
import { mpick } from '../utils/random.js';

export const audio = {
  ctx: null, master: null, fx: null, muted: false,
  init() {
    if (this.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C(); this.master = ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(ctx.destination);
    const delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(); delay.delayTime.value = 0.36; fb.gain.value = 0.38; wet.gain.value = 0.4;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.master);
    this.fx = ctx.createGain(); this.fx.connect(this.master); this.fx.connect(delay);
    const pad = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850;
    pad.gain.setValueAtTime(0, ctx.currentTime); pad.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 5); lp.connect(pad); pad.connect(this.master);
    [130.81, 196.0, 261.63, 329.63, 392.0].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 10; g.gain.value = 0.22;
      lfo.frequency.value = 0.05 + i * 0.031; lg.gain.value = 0.18; lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(lp); o.start(); lfo.start(); });
    const chime = () => { setTimeout(() => { const s = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; const f = mpick(s);
      this.tone(f, 2.4, 'sine', 0.03); if (Math.random() < 0.5) this.tone(f * 1.5, 2, 'sine', 0.018, 0.2); chime(); }, 2500 + Math.random() * 5000); };
    chime();
  },
  tone(freq, dur = 0.5, type = 'sine', vol = 0.08, when = 0, slide = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.fx); o.start(t); o.stop(t + dur + 0.05);
  },
  jump() { this.tone(330, 0.18, 'sine', 0.05, 0, 1.9); },
  land() { this.tone(160, 0.12, 'sine', 0.05, 0, 0.6); },
  blip() { this.tone(640 + Math.random() * 160, 0.05, 'triangle', 0.018); },
  sparkle() { [1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.04, i * 0.07)); },
  chirp() { this.tone(2200 + Math.random() * 600, 0.08, 'sine', 0.02, 0, 1.4); this.tone(2600, 0.07, 'sine', 0.015, 0.1, 1.3); },
  bark() { this.tone(420, 0.1, 'square', 0.025, 0, 0.7); },
  meow() { this.tone(700, 0.35, 'triangle', 0.03, 0, 1.25); },
  plip() { this.tone(900, 0.15, 'sine', 0.04, 0, 0.5); },
  // --- combat sfx (procedural placeholders: swap for samples later) ---
  noise(dur = 0.3, vol = 0.08, freq = 1000) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    if (!this._nb) { this._nb = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate); const d = this._nb.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain(); src.buffer = this._nb;
    f.type = 'lowpass'; f.frequency.setValueAtTime(freq, t); f.frequency.exponentialRampToValueAtTime(Math.max(60, freq * 0.25), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.fx); src.start(t); src.stop(t + dur + 0.05);
  },
  castBolt() { this.tone(880, 0.16, 'triangle', 0.05, 0, 1.7); this.tone(1760, 0.1, 'sine', 0.025, 0.02); },
  castFire() { this.noise(0.4, 0.07, 1800); this.tone(260, 0.3, 'triangle', 0.04, 0, 1.8); },
  explode() { this.noise(0.7, 0.16, 900); this.tone(110, 0.5, 'sine', 0.1, 0, 0.4); },
  nova() { [1568, 1319, 1047, 784].forEach((f, i) => this.tone(f, 0.6, 'sine', 0.04, i * 0.04)); this.noise(0.5, 0.05, 4000); },
  blink() { this.tone(500, 0.25, 'sine', 0.06, 0, 3); this.tone(1500, 0.2, 'triangle', 0.02, 0.08, 0.5); },
  hitEnemy() { this.tone(260 + Math.random() * 60, 0.09, 'square', 0.02, 0, 0.6); },
  enemyDie() { this.tone(520, 0.35, 'triangle', 0.045, 0, 0.35); this.noise(0.3, 0.05, 2500); },
  hurt() { this.tone(240, 0.28, 'triangle', 0.08, 0, 0.5); },
  faint() { [523, 440, 349, 262].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.06, i * 0.18)); },
  fizzle() { this.tone(160, 0.08, 'square', 0.015); },
  hoot() { this.tone(430, 0.22, 'sine', 0.05, 0, 0.9); this.tone(390, 0.4, 'sine', 0.05, 0.3, 0.85); },
  owlStrike() { this.noise(0.15, 0.05, 3000); this.tone(1200, 0.08, 'triangle', 0.025, 0, 0.6); },
  slam() { this.noise(0.6, 0.18, 500); this.tone(70, 0.6, 'sine', 0.12, 0, 0.5); },
  growl() { this.tone(95, 0.6, 'sawtooth', 0.025, 0, 0.8); },
  swipe() { this.noise(0.12, 0.05, 3500); },
  charge() { this.tone(300, 0.7, 'sine', 0.03, 0, 2.5); },
  wispShot() { this.tone(700, 0.25, 'triangle', 0.035, 0, 0.5); },
  squish() { this.tone(180, 0.12, 'sine', 0.035, 0, 1.8); },
  melody(slow = false) { const n = slow ? [392, 330, 294, 262, 294, 330, 262] : [523, 587, 659, 784, 659, 587, 523, 440, 523, 659, 784];
    n.forEach((f, i) => this.tone(f, slow ? 0.7 : 0.45, 'triangle', 0.07, i * (slow ? 0.38 : 0.2))); },
  // --- knight + wolf sfx ---
  clang() { this.tone(1400, 0.18, 'square', 0.03, 0, 0.7); this.tone(2100, 0.3, 'sine', 0.03, 0.02); },
  whoosh() { this.noise(0.25, 0.08, 2600); },
  howl() { this.tone(520, 0.9, 'sine', 0.04, 0, 1.35); this.tone(700, 0.7, 'sine', 0.02, 0.5, 0.8); },
  /** Mutes / unmutes everything; returns the new muted state. */
  toggle() { this.muted = !this.muted; if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.55, this.ctx.currentTime, 0.1); return this.muted; },
};
