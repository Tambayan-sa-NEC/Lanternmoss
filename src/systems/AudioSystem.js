/* AUDIO (procedural, WebAudio): soft pad, wind-chimes and every sound effect. All sounds are synthesized
   PLACEHOLDERS: to use real samples, swap the body of the matching method. Nothing plays until init() runs
   from a user gesture (browsers block audio before that); every method is a no-op until then. */
import { mpick } from '../utils/random.js';

export const audio = {
  ctx: null, master: null, fx: null, music: null, muted: false, ducked: false, pad: null, battleOn: false, battleTimer: null,
  vol: { master: 1, music: 1, sfx: 1 },      // player volume settings (0..1), see setVolumes
  init() {
    if (this.ctx) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    const ctx = this.ctx = new C(); this.master = ctx.createGain(); this.master.gain.value = this.level(); this.master.connect(ctx.destination);
    const delay = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain(); delay.delayTime.value = 0.36; fb.gain.value = 0.38; wet.gain.value = 0.4;
    delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(this.master);
    this.fx = ctx.createGain(); this.fx.gain.value = this.vol.sfx; this.fx.connect(this.master); this.fx.connect(delay);
    this.music = ctx.createGain(); this.music.gain.value = this.vol.music; this.music.connect(this.master); this.music.connect(delay);
    const pad = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 850;
    pad.gain.setValueAtTime(0, ctx.currentTime); pad.gain.linearRampToValueAtTime(0.055, ctx.currentTime + 5); lp.connect(pad); pad.connect(this.music); this.pad = pad;
    [130.81, 196.0, 261.63, 329.63, 392.0].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 10; g.gain.value = 0.22;
      lfo.frequency.value = 0.05 + i * 0.031; lg.gain.value = 0.18; lfo.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(lp); o.start(); lfo.start(); });
    const chime = () => { setTimeout(() => { if (this.battleOn) { chime(); return; } const s = [523.25, 587.33, 659.25, 783.99, 880, 1046.5]; const f = mpick(s);
      this.tone(f, 2.4, 'sine', 0.03, 0, 0, this.music); if (Math.random() < 0.5) this.tone(f * 1.5, 2, 'sine', 0.018, 0.2, 0, this.music); chime(); }, 2500 + Math.random() * 5000); };
    chime();
  },
  tone(freq, dur = 0.5, type = 'sine', vol = 0.08, when = 0, slide = 0, out = this.fx) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.05);
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
  noise(dur = 0.3, vol = 0.08, freq = 1000, when = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + when;
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
  splash(big = true) { this.noise(big ? 0.45 : 0.15, big ? 0.1 : 0.03, 2400); if (big) this.tone(300, 0.25, 'sine', 0.035, 0.02, 0.55); },
  /** A creaky lid, then a glittering run (grander for the boss chest). */
  chestOpen(grand = false) {
    this.tone(140, 0.3, 'sawtooth', 0.025, 0, 1.6); this.noise(0.18, 0.04, 1800);
    const notes = grand ? [523, 659, 784, 1047, 1319, 1568] : [784, 988, 1175, 1568];
    notes.forEach((f, i) => this.tone(f, 0.5, 'sine', 0.04, 0.18 + i * 0.07));
  },
  chestLocked() { this.tone(220, 0.07, 'square', 0.03); this.tone(200, 0.07, 'square', 0.03, 0.09); this.noise(0.1, 0.04, 1200, 0.02); },
  unlock() { this.tone(1800, 0.05, 'square', 0.025); this.tone(1200, 0.08, 'triangle', 0.03, 0.08); },
  howl() { this.tone(520, 0.9, 'sine', 0.04, 0, 1.35); this.tone(700, 0.7, 'sine', 0.02, 0.5, 0.8); },
  /** A tiny voice-like chirp when a hero is picked: voice = CHARACTERS[id].profile.voice { pitch, slide }. */
  heroCue({ pitch, slide }) {
    this.tone(pitch, 0.12, 'triangle', 0.06, 0, slide); this.tone(pitch * 1.26, 0.22, 'sine', 0.05, 0.11, slide * 0.92);
    this.noise(0.05, 0.02, 3200);
  },
  achievement() { [659, 784, 988, 1319].forEach((f, i) => this.tone(f, i === 3 ? 0.9 : 0.25, 'triangle', 0.05, i * 0.11)); this.tone(1976, 0.8, 'sine', 0.02, 0.45); },
  coin() { this.tone(1320, 0.09, 'square', 0.025); this.tone(1760, 0.16, 'sine', 0.035, 0.07); },
  // --- ranger sfx ---
  bowShot() { this.tone(190, 0.14, 'triangle', 0.05, 0, 0.55); this.noise(0.1, 0.04, 4200); },
  // --- ultimates ---
  meteorCall() { this.tone(220, 1.1, 'sawtooth', 0.025, 0, 2.2); this.noise(1.1, 0.05, 1200); },
  meteorImpact() { this.noise(1.2, 0.22, 700); this.tone(55, 0.9, 'sine', 0.14, 0, 0.5); this.tone(90, 0.6, 'square', 0.03, 0.02, 0.5); },
  leapSlam() { this.noise(0.8, 0.2, 600); this.tone(70, 0.7, 'sine', 0.13, 0, 0.45); this.tone(1400, 0.2, 'square', 0.02, 0, 0.6); },
  arrowRain() { for (let i = 0; i < 6; i++) this.noise(0.12, 0.04, 4500, i * 0.09); this.tone(900, 0.5, 'triangle', 0.02, 0.1, 0.5); },
  // --- dragon + demon lord ---
  bite() { this.noise(0.12, 0.1, 1800); this.tone(150, 0.15, 'square', 0.04, 0, 0.5); },
  tailSweep() { this.noise(0.45, 0.1, 1400); },
  wingBeat() { [0, 0.22].forEach(w => this.noise(0.25, 0.09, 500, w)); },
  fireBreath(dur = 1.8) { this.noise(dur, 0.09, 1500); this.tone(110, dur, 'sawtooth', 0.02, 0, 0.8); },
  doomCharge() { this.tone(110, 1.9, 'sawtooth', 0.03, 0, 3); this.tone(55, 1.9, 'sine', 0.05, 0, 2); },
  doomSlam() { this.noise(1.4, 0.26, 500); this.tone(40, 1.2, 'sine', 0.16, 0, 0.5); this.tone(180, 0.5, 'square', 0.04, 0, 0.3); },
  phaseShift() { this.roar(); this.tone(60, 1.6, 'sawtooth', 0.05, 0.1, 0.4); this.noise(1.5, 0.12, 900); },
  // --- boss + planet travel (procedural placeholders) ---
  roar() { this.tone(80, 0.9, 'sawtooth', 0.05, 0, 0.6); this.tone(120, 0.7, 'square', 0.025, 0.05, 0.7); this.noise(0.8, 0.12, 700); },
  warp() { [392, 523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.9, 'sine', 0.04, i * 0.12, 1.5)); this.noise(1.2, 0.04, 5000); },
  /** Boss-fight music: the cozy pad fades down and a drum and bass ostinato takes over (off = back to the pad). */
  battle(on) {
    if (on === this.battleOn) return; this.battleOn = on;
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.pad?.gain.setTargetAtTime(on ? 0.01 : 0.055, t, on ? 0.6 : 2);
    clearInterval(this.battleTimer); this.battleTimer = null;
    if (!on) return;
    const bass = [110, 110, 130.81, 98, 110, 110, 146.83, 123.47]; let step = 0;
    this.battleTimer = setInterval(() => {
      if (!this.battleOn) return; const i = step++ % 16;
      if (i % 4 === 0) this.tone(70, 0.28, 'sine', 0.11, 0, 0.45, this.music);                   // kick
      if (i % 8 === 4) this.noise(0.14, 0.045, 1800);                                           // snare
      if (i % 2 === 0) this.tone(bass[(i / 2) % 8], 0.32, 'triangle', 0.05, 0, 0, this.music);   // bass
      if (i === 14) this.tone(bass[step % 8] * 4, 0.5, 'sawtooth', 0.012, 0, 1.01, this.music);
    }, 190);
  },
  /** Output level from the master volume, the mute toggle and pause ducking. */
  level() { return this.muted ? 0 : 0.55 * this.vol.master * (this.ducked ? 0.3 : 1); },
  applyLevels() {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.level(), t, 0.1); this.music.gain.setTargetAtTime(this.vol.music, t, 0.1); this.fx.gain.setTargetAtTime(this.vol.sfx, t, 0.1);
  },
  /** Player volume settings, 0..1 each. */
  setVolumes(master, music, sfx) { this.vol = { master, music, sfx }; this.applyLevels(); },
  /** Quieter while the game is paused. */
  duck(on) { this.ducked = on; this.applyLevels(); },
  /** Mutes / unmutes everything; returns the new muted state. */
  toggle() { this.muted = !this.muted; this.applyLevels(); return this.muted; },
};
