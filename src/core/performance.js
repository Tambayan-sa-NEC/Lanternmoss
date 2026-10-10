/** Real render cadence, independent of clamped simulation dt, pause and hit-stop. */
export class FrameStats {
  constructor(capacity = 120) { this.capacity = capacity; this.frames = []; this.last = null; }
  record(start, renderMs, counters) {
    const frameMs = this.last === null ? 0 : start - this.last;
    this.last = start;
    if (frameMs <= 0 || frameMs > 1000) { this.frames.length = 0; return; }
    this.frames.push({ frameMs, renderMs, ...counters });
    if (this.frames.length > this.capacity) this.frames.shift();
  }
  reset() { this.last = null; this.frames.length = 0; }
  snapshot() {
    if (!this.frames.length) return null;
    const mean = key => this.frames.reduce((sum, f) => sum + f[key], 0) / this.frames.length;
    const frameMs = mean('frameMs'), sorted = this.frames.map(f => f.frameMs).sort((a, b) => a - b);
    return { fps: 1000 / frameMs, frameMs, p95FrameMs: sorted[Math.ceil(sorted.length * 0.95) - 1],
      renderMs: mean('renderMs'), ...Object.fromEntries(['calls', 'triangles', 'points', 'lines'].map(key =>
        [key, Math.max(...this.frames.map(f => f[key]))])) };
  }
}
