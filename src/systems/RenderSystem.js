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
    // Photo mode (PHOTO.filters / PHOTO.frames, by index) grades and frames the image here, so the saved file has them.
    this.paperPass = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uFilter: { value: 0 }, uFrame: { value: 0 }, uAspect: { value: innerWidth / innerHeight } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime, uFilter, uFrame, uAspect; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
        float box(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main(){ vec4 c = texture2D(tDiffuse, vUv); float d = length(vUv - 0.5);
          c.rgb *= mix(1.0, 0.8, smoothstep(0.38, 0.85, d));
          c.rgb *= vec3(1.03, 0.99, 0.95);
          float l = dot(c.rgb, vec3(0.299, 0.587, 0.114));
          if (uFilter > 0.5 && uFilter < 1.5) c.rgb = mix(vec3(l), c.rgb, 1.12) * vec3(1.09, 1.0, 0.84);                 // warm
          else if (uFilter > 1.5 && uFilter < 2.5) c.rgb = mix(vec3(l), c.rgb, 0.5) * vec3(0.5, 0.62, 0.95);              // night
          else if (uFilter > 2.5) c.rgb = mix(mix(vec3(l), c.rgb, 0.78), vec3(1.0, 0.95, 0.96), 0.24);                 // pastel
          vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);                                                                     // height = 1
          if (uFrame > 0.5 && uFrame < 1.5) {                                                                            // polaroid
            vec2 b = vec2(uAspect * 0.5 - 0.04, 0.5 - 0.04); float yc = 0.045;                                          // a deeper bottom edge
            float e = box(p - vec2(0.0, yc), b - vec2(0.0, yc), 0.004);
            vec3 paper = vec3(0.98, 0.965, 0.93) - hash(floor(vUv * 900.0)) * 0.02;
            c.rgb = mix(c.rgb * (1.0 - 0.25 * smoothstep(-0.012, 0.0, e)), paper, smoothstep(0.0, 0.0015, e));
          } else if (uFrame > 1.5) {                                                                                     // storybook ink
            float e = box(p, vec2(uAspect * 0.5 - 0.03, 0.47), 0.06);
            vec3 ink = vec3(0.227, 0.137, 0.251), page = vec3(1.0, 0.91, 0.8);
            c.rgb = mix(c.rgb, ink, smoothstep(-0.009, -0.006, e));
            c.rgb = mix(c.rgb, page * (0.94 + hash(floor(vUv * 500.0)) * 0.06), smoothstep(0.0, 0.002, e));
          }
          c.rgb += (hash(floor(vUv * vec2(640.0, 400.0)) + floor(uTime * 10.0)) - 0.5) * 0.02;
          gl_FragColor = c; }`,
    });
    composer.addPass(this.paperPass);
    composer.addPass(new OutputPass());
  }

  /** Matches the viewport: camera aspect, buffers, outline pixel width and point-sprite scale. */
  resize() {
    const w = innerWidth, h = innerHeight; camera.aspect = w / h; camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h); this.paperPass.uniforms.uAspect.value = w / h;
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

  /** Photo mode's colour grade and border (indices into PHOTO.filters / PHOTO.frames; 0 = none). */
  setPhotoLook(filter = 0, frame = 0) { this.paperPass.uniforms.uFilter.value = filter; this.paperPass.uniforms.uFrame.value = frame; }
  /** Draws a fresh frame and copies the canvas in the same task (the drawing buffer isn't preserved): a PNG Blob. */
  capture(time) {
    this.render(time);
    return new Promise((resolve, reject) => this.canvas.toBlob(b => (b ? resolve(b) : reject(new Error('capture failed'))), 'image/png'));
  }

  render(time) {
    const start = performance.now(); this.renderer.info.reset();
    cullActors(camera);
    this.paperPass.uniforms.uTime.value = time; this.composer.render();
    this.stats.record(start, performance.now() - start, this.renderer.info.render);
    this.overlay.update(this.stats, start);
  }
}
