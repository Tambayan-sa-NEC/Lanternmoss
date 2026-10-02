/* requestAnimationFrame loop with a clamped timestep (a stalled tab never produces a huge physics step). */
import * as THREE from 'three';

const MAX_DT = 1 / 30;

export class GameLoop {
  /** update(dt) advances the simulation; render() draws it. */
  constructor(update, render) { this.update = update; this.render = render; this.clock = new THREE.Clock(); }
  start() {
    const frame = () => {
      requestAnimationFrame(frame);
      const dt = Math.min(this.clock.getDelta(), MAX_DT);
      this.update(dt); this.render();
    };
    frame();
  }
}
