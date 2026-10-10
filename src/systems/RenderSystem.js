/* RENDERER + POST-PROCESSING: bloom on HDR colours, then a soft storybook finish (warm vignette + animated paper grain). */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { RENDER } from '../config/render.js';
import { QUALITY_PIXEL_RATIO } from '../config/settings.js';
import { outlineMat, setPointScale } from '../render/materials.js';
import { camera, PIXEL_RATIO, scene } from '../render/scene.js';
import { FrameStats } from '../core/performance.js';
import { PerfOverlay } from '../ui/perfOverlay.js';
import { cullActors } from '../render/actorCulling.js';

export class RenderSystem {
  constructor() {
    const renderer = this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(PIXEL_RATIO);
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;           // keep flat, saturated anime fills
    document.body.prepend(renderer.domElement);
    this.canvas = renderer.domElement;
    renderer.info.autoReset = false; // count the entire composer, including bloom and output passes
    this.stats = new FrameStats(); this.overlay = new PerfOverlay();
    document.addEventListener('visibilitychange', () => this.stats.reset());

    const dbs = renderer.getDrawingBufferSize(new THREE.Vector2());
    const composer = this.composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(dbs.x, dbs.y, { type: THREE.HalfFloatType, samples: 4 }));
    composer.addPass(new RenderPass(scene, camera));
    const { strength, radius, threshold } = RENDER.bloom;
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), strength, radius, threshold); composer.addPass(this.bloomPass);
    this.paperPass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        void main(){ vec4 c = texture2D(tDiffuse, vUv); float d = length(vUv - 0.5);
          c.rgb *= mix(1.0, 0.8, smoothstep(0.38, 0.85, d));
          c.rgb *= vec3(1.03, 0.99, 0.95);
          c.rgb += (hash(floor(vUv * vec2(640.0, 400.0)) + floor(uTime * 10.0)) - 0.5) * 0.02;
          gl_FragColor = c; }`,
    });
    composer.addPass(this.paperPass);
    composer.addPass(new OutputPass());
  }

  /** Matches the viewport: camera aspect, buffers, outline pixel width and point-sprite scale. */
  resize() {
    const w = innerWidth, h = innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
    const db = this.renderer.getDrawingBufferSize(new THREE.Vector2()); outlineMat.uniforms.uRes.value.copy(db);
    const scale = db.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    setPointScale(scale);
  }

  /** Graphics settings: quality (render resolution), bloom on / off, outline width (CSS pixels). */
  applyGraphics({ quality, bloom, outlineWidth }) {
    const pr = Math.min(QUALITY_PIXEL_RATIO[quality] ?? PIXEL_RATIO, window.devicePixelRatio || 1, RENDER.maxPixelRatio);
    if (pr !== this.renderer.getPixelRatio()) { this.renderer.setPixelRatio(pr); this.composer.setPixelRatio(pr); this.resize(); }
    this.bloomPass.enabled = bloom;
    outlineMat.uniforms.uWidth.value = outlineWidth * pr; outlineMat.visible = outlineWidth > 0;
  }

  render(time) {
    const start = performance.now(); this.renderer.info.reset();
    cullActors(camera);
    this.paperPass.uniforms.uTime.value = time; this.composer.render();
    this.stats.record(start, performance.now() - start, this.renderer.info.render);
    this.overlay.update(this.stats, start);
  }
}
