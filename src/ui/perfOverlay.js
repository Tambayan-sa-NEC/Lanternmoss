import { settings } from '../core/settings.js';
import { dom } from './dom.js';

/** Throttled DOM work; telemetry still measures every rendered frame while paused. */
export class PerfOverlay {
  constructor() { this.next = 0; }
  update(stats, now) {
    dom.perfOverlay.hidden = !settings.perfOverlay;
    if (!settings.perfOverlay || now < this.next) return;
    this.next = now + 250;
    const s = stats.snapshot();
    dom.perfOverlay.textContent = s ? `${s.fps.toFixed(1)} FPS · ${s.frameMs.toFixed(1)} ms/frame\n` +
      `p95 ${s.p95FrameMs.toFixed(1)} ms · render CPU ${s.renderMs.toFixed(1)} ms\n` +
      `${s.calls.toLocaleString()} calls · ${s.triangles.toLocaleString()} triangles\n` +
      `${s.points.toLocaleString()} points · ${s.lines.toLocaleString()} lines` : 'Measuring frames…';
  }
}
