/* The planet: generates terrain and scenery in a fixed order, animates the environment every frame, and can be
   torn down so another planet can be generated in its place (planet travel).
   ORDER MATTERS in generate(): each step draws from the seeded world rand, and later steps avoid what
   earlier ones placed. Reordering steps changes the whole layout. */
import * as THREE from 'three';
import { clearStaticColliders } from '../physics/colliders.js';
import { Batcher } from '../render/Batcher.js';
import { releasePointsMaterial } from '../render/materials.js';
import { disposeTree, G, part } from '../render/meshes.js';
import { scene, setFogColor } from '../render/scene.js';
import { seedWorld } from '../utils/random.js';
import { arcDist, frameQuat, offsetDir, projectTangent, randomDir, tangentFrame } from '../utils/sphere.js';
import { buildPlanet } from './planet.js';
import { isFree, placed } from './placement.js';
import { decoratePonds, createGrass, scatterFlora } from './scatter.js';
import { CLOUD_AXIS, createClouds, createFireflies, createSky } from './sky.js';
import { addPond, computeWaterLevel, groundHeight, ponds } from './terrain.js';
import { buildVillage } from './village.js';
import { createWater } from './water.js';

const V3 = THREE.Vector3;

/** The village centre: where the hero spawns and respawns, and the middle of the monster-free safe zone. */
export const SPAWN_DIR = new V3(0, 1, 0);

const _lightDir = new V3(), _skySun = new V3();

export class World {
  constructor() {
    this.spawnDir = SPAWN_DIR;
    this.sunTan = new V3();           // tangent heading of the golden-hour sun; transported along with the player
  }

  /** planet: an entry of PLANETS (config/planets.js): its seed drives the layout, its palette the colours. */
  generate(planet) {
    this.planet = planet; this.objects = []; this.ownMaterials = [];
    const { palette } = planet;
    seedWorld(planet.seed); setFogColor(palette.fog);
    this.hemi = new THREE.HemisphereLight(0xd6dcff, 0xb6dc8e, 1.15);
    this.sun = new THREE.DirectionalLight(0xffd9a6, 2.35);
    this.add(this.hemi, this.sun, this.sun.target);

    // ponds first: they carve the terrain everything else stands on
    const spawnDir = this.spawnDir;
    this.pond1 = addPond(offsetDir(spawnDir, -0.55, 13), 4.3);
    this.stoneCenter = offsetDir(spawnDir, 2.75, 40);
    placed.push({ dir: spawnDir.clone(), r: 3 }, { dir: this.stoneCenter, r: 6.8 });
    for (const pr of [3.7, 5.0]) {
      for (let i = 0; i < 200; i++) {
        const d = randomDir();
        if (arcDist(d, spawnDir) > 22 && isFree(d, pr + 8) && ponds.every(p => arcDist(d, p.dir) > p.r + pr + 16)) { addPond(d, pr); break; }
      }
    }
    ponds.forEach(computeWaterLevel);

    this.add(buildPlanet(palette));

    const B = new Batcher();
    Object.assign(this, buildVillage(B, spawnDir, this.stoneCenter));   // houses, houseA, cottage
    decoratePonds(B);
    scatterFlora(B);
    this.add(B.build());
    const grass = createGrass(palette.grass); this.add(grass);

    const water = createWater(palette.water); this.waterMat = water.material; this.add(...water.meshes);

    // floating crystal above the stone circle
    this.crystal = part(G.oct(0.45), 0x9ff3ff, { glow: true, intensity: 1.9 });
    this.crystal.scale.set(1, 1.6, 1); this.add(this.crystal);
    this.crystalBase = this.stoneCenter.clone().multiplyScalar(groundHeight(this.stoneCenter) + 2.3);
    this.crystal.quaternion.copy(frameQuat(this.stoneCenter, tangentFrame(this.stoneCenter)[0]));

    this.sky = createSky(palette.sky); this.add(this.sky);
    this.clouds = createClouds(); this.add(this.clouds);
    this.fireflies = createFireflies(); this.add(this.fireflies);
    this.ownMaterials.push(this.sky.material, this.waterMat, grass.material, this.fireflies.material);   // the rest are shared caches

    this.resetSun();
  }

  /** Adds generated objects to the scene and remembers them for dispose(). */
  add(...objects) { scene.add(...objects); this.objects.push(...objects); }

  /** Removes everything generate() created and forgets the terrain, placement and scenery colliders. */
  dispose() {
    for (const o of this.objects) { scene.remove(o); disposeTree(o); }
    for (const m of this.ownMaterials) { releasePointsMaterial(m); m.dispose(); }
    this.objects = []; this.ownMaterials = [];
    ponds.length = 0; placed.length = 0; clearStaticColliders();
  }

  /** Time-of-day light (gameplay/dayClock.js light()): sun colour and strength, ambient strength. */
  setDaylight({ sun, sunIntensity, ambient }) { this.sun.color.copy(sun); this.sun.intensity = sunIntensity; this.hemi.intensity = ambient; }

  /** Puts the sun back at its starting bearing over the village. */
  resetSun() {
    const [t1, t2] = tangentFrame(this.spawnDir);
    this.sunTan.copy(t1).multiplyScalar(0.62).addScaledVector(t2, 0.78).normalize();
  }

  /** Golden-hour sun that travels with the player so every side of the planet is cozy; sky and ambient animation. */
  update(dt, time, player, viewUp, camera) {
    projectTangent(this.sunTan, player.up).normalize();
    _lightDir.copy(player.up).multiplyScalar(0.95).add(this.sunTan).normalize();
    this.sun.position.copy(player.pos).addScaledVector(_lightDir, 50); this.sun.target.position.copy(player.pos);
    this.hemi.position.copy(player.up);
    _skySun.copy(viewUp).multiplyScalar(0.2).add(this.sunTan).normalize();
    const su = this.sky.material.uniforms; su.uUp.value.copy(viewUp); su.uSun.value.copy(_skySun); su.uTime.value = time;
    this.sky.position.copy(camera.position);
    this.fireflies.material.uniforms.uTime.value = time; this.waterMat.uniforms.uTime.value = time;
    this.clouds.rotateOnWorldAxis(CLOUD_AXIS, dt * 0.008);
    this.crystal.position.copy(this.crystalBase).addScaledVector(this.stoneCenter, Math.sin(time * 1.4) * 0.25); this.crystal.rotateY(dt * 0.9);
  }
}
