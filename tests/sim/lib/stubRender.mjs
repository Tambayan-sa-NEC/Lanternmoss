// Stand-in for src/systems/RenderSystem.js: no WebGL, just keeps the camera matrices current.
import { camera } from '../../../src/render/scene.js';
export class RenderSystem {
  constructor() { this.canvas = document.createElement('canvas'); }
  resize() { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  render() { camera.updateMatrixWorld(); }
  applyGraphics(s) { this.graphics = { ...s }; }
}
