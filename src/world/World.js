/* The planet: generates terrain and scenery in a fixed order, and animates the environment every frame.
   ORDER MATTERS in generate(): each step draws from the seeded world rand, and later steps avoid what
   earlier ones placed. Reordering steps changes the whole layout. */
import * as THREE from 'three';
import { Batcher } from '../render/Batcher.js';
import { G, part } from '../render/meshes.js';
import { scene } from '../render/scene.js';
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

  generate() {
    this.hemi = new THREE.HemisphereLight(0xd6dcff, 0xb6dc8e, 1.15);
    this.sun = new THREE.DirectionalLight(0xffd9a6, 2.35);
    scene.add(this.hemi, this.sun, this.sun.target);

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

    scene.add(buildPlanet());

    const B = new Batcher();
    Object.assign(this, buildVillage(B, spawnDir, this.stoneCenter));   // houses, houseA, cottage
    decoratePonds(B);
    scatterFlora(B);
    scene.add(B.build());
    scene.add(createGrass());

    const water = createWater(); this.waterMat = water.material; scene.add(...water.meshes);

    // floating crystal above the stone circle
    this.crystal = part(G.oct(0.45), 0x9ff3ff, { glow: true, intensity: 1.9 });
    this.crystal.scale.set(1, 1.6, 1); scene.add(this.crystal);
    this.crystalBase = this.stoneCenter.clone().multiplyScalar(groundHeight(this.stoneCenter) + 2.3);
    this.crystal.quaternion.copy(frameQuat(this.stoneCenter, tangentFrame(this.stoneCenter)[0]));

    this.sky = createSky(); scene.add(this.sky);
    this.clouds = createClouds(); scene.add(this.clouds);
    this.fireflies = createFireflies(); scene.add(this.fireflies);

    this.resetSun();
  }

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
