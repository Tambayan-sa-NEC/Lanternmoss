/* The planet: generates terrain and scenery in a fixed order, animates the environment every frame, and can be
   torn down so another planet can be generated in its place (planet travel).
   ORDER MATTERS in generate(): each step draws from the seeded world rand, and later steps avoid what
   earlier ones placed. Reordering steps changes the whole layout. */
import * as THREE from 'three';
import { WORLD } from '../config/game.js';
import { densityFor } from '../config/settings.js';
import { settings } from '../core/settings.js';
import { clearStaticColliders } from '../physics/colliders.js';
import { Batcher, setSceneryDensity } from '../render/Batcher.js';
import { releasePointsMaterial } from '../render/materials.js';
import { disposeTree, G, part } from '../render/meshes.js';
import { freezeStaticTransforms } from '../render/staticParts.js';
import { scene, setFogColor } from '../render/scene.js';
import { rand, rr, seedWorld } from '../utils/random.js';
import { arcDist, frameQuat, offsetDir, projectTangent, randomDir, tangentFrame } from '../utils/sphere.js';
import { buildPlanet } from './planet.js';
import { isFree, placed } from './placement.js';
import { chunkInstances, decoratePonds, createGrass, createMeadowFlowers, createTallGrass, scatterFlora, WIND } from './scatter.js';
import { CLOUD_AXIS, createClouds, createFireflies, createSky } from './sky.js';
import { addFlat, addPond, bakeTerrain, computeWaterLevel, groundHeight, ponds, setTerrain } from './terrain.js';
import { buildVillage } from './village.js';
import { createWater } from './water.js';
import { Weather } from './weather.js';
import { PlanetMechanics } from '../gameplay/PlanetMechanics.js';
import { LanternView } from './mechanics/lanternView.js';
import { canopyLayout } from './mechanics/lantern.js';
import { configurePhysics, physicsQueries } from './physics.js';
import { archipelagoLayout } from './archipelago.js';
import { coastalWind } from '../render/coastalWind.js';
import { Quests } from '../gameplay/quests/Quests.js';

const V3 = THREE.Vector3;

/** The village centre: where the hero spawns and respawns, and the middle of the monster-free safe zone. */
export const SPAWN_DIR = new V3(0, 1, 0);

const _lightDir = new V3(), _skySun = new V3();

export class World {
  constructor(mechanicOptions) {
    this.spawnDir = SPAWN_DIR;
    this.mechanics = new PlanetMechanics(this, mechanicOptions);
    this.physics = physicsQueries;
    this.sunTan = new V3();           // tangent heading of the golden-hour sun; transported along with the player
  }

  /** planet: an entry of PLANETS (config/planets.js): its seed drives the layout, its palette the colours. */
  generate(planet) {
    if (!this.mechanics.accepts(planet)) throw new Error(`Unknown planet mechanic: ${planet.mechanic}`);
    this.mechanics.exit();
    this.coast = planet.terrain?.archipelago ? archipelagoLayout(planet.terrain.archipelago, this.spawnDir) : null;
    this.canopy = planet.canopy ? canopyLayout(planet.canopy, this.spawnDir) : null;   // Duskhollow's gaps of starlight (30a/30b)
    configurePhysics(this.coast ? { ...planet.physics, waterRegions: [{ id: 'lagoon', dir: this.coast.lagoon.dir.toArray(), radius: this.coast.lagoon.radius,
      level: planet.physics.seaLevel, maxLevel: planet.physics.seaMaxLevel }] } : planet.physics);
    this.planet = planet; this.objects = []; this.ownMaterials = [];
    const { palette } = planet;
    seedWorld(planet.seed); setFogColor(palette.fog);
    this.hemi = new THREE.HemisphereLight(0xd6dcff, 0xb6dc8e, 1.15);
    this.sun = new THREE.DirectionalLight(0xffd9a6, 2.35);
    this.add(this.hemi, this.sun, this.sun.target);

    // the planet's shape, then everything that needs level ground (the village, the stones, the boss lair, the ponds and
    // lakes) before the height field is baked; ponds carve into it after
    const spawnDir = this.spawnDir, F = WORLD.flats;
    setTerrain(planet.terrain, planet.seed);
    this.farmDir = null;
    if (this.coast) {
      this.pond1 = { dir: offsetDir(spawnDir, -0.55, 36), r: 4.3 }; // shore anchor for travelling villagers; no inland pond
      this.stoneCenter = this.coast.stoneCenter; this.lairDir = this.coast.lagoon.dir;
      this.outerHouses = this.coast.outerHouses; this.farmDir = this.coast.farmDir;
      placed.push({ dir: spawnDir.clone(), r: 3 }, { dir: this.stoneCenter, r: 6.8 });
      addFlat(spawnDir, 27, 10, 4.5); addFlat(this.stoneCenter, 9, 5, 4.5);
      addFlat(this.farmDir, 7, 3, 4.5);
      this.outerHouses.forEach(dir => addFlat(dir, 5, 5, 4.5));
      if(planet.resources?.coastal){
        this.coast.pearlBeach=offsetDir(this.coast.islands[5].dir,1.8,this.coast.islands[5].radius*.9);
        addFlat(this.coast.pearlBeach,4,3); // exposed at low water, flooded at high; future Ironclaw site
      }
    } else {
      this.pond1 = addPond(offsetDir(spawnDir, -0.55, 13), 4.3);
      this.stoneCenter = offsetDir(spawnDir, 2.75, 40);
      this.lairDir = offsetDir(spawnDir, rand() * Math.PI * 2, rr(...WORLD.lairArc));
      placed.push({ dir: spawnDir.clone(), r: 3 }, { dir: this.stoneCenter, r: 6.8 });
      const pondSpot = (pr, minFromVillage) => {
        for (let i = 0; i < 300; i++) {
          const d = randomDir();
          if (arcDist(d, spawnDir) > minFromVillage && arcDist(d, this.lairDir) > F.lair[0] + pr + 4 && isFree(d, pr + 8)
            && ponds.every(p => arcDist(d, p.dir) > p.r + pr + 16)) return d;
        }
        return null;
      };
      for (const pr of [3.7, 5.0, 4.2, 3.4, 4.6]) { const d = pondSpot(pr, 22); if (d) addPond(d, pr); }
      for (let i = 0; i < (planet.terrain?.lakes ?? 0); i++) { const pr = rr(8, 11), d = pondSpot(pr, 34); if (d) addPond(d, pr, 3.2); }
      addFlat(spawnDir, ...F.village); addFlat(this.stoneCenter, ...F.stones); addFlat(this.lairDir, ...F.lair);
      for (const p of ponds) addFlat(p.dir, p.r + 3, 7);
      this.outerHouses = [];                                             // a hamlet beyond the square, each house on level ground
      for (let k = 0; k < 3; k++) for (let i = 0; i < 200; i++) {
        const d = offsetDir(spawnDir, rand() * Math.PI * 2, rr(30, 58));
        if (isFree(d, 5) && arcDist(d, this.stoneCenter) > 14 && this.outerHouses.every(o => arcDist(o, d) > 14)) { this.outerHouses.push(d); addFlat(d, 5, 6); break; }
      }
    }
    bakeTerrain();
    ponds.forEach(computeWaterLevel);

    this.add(freezeStaticTransforms(buildPlanet(palette)));            // baked terrain is static; placement may sample it now

    const B = new Batcher({ cellSize: 48 });
    this.pier=null;this.lighthouseLamp=null;
    if(planet.village?.coastal)this.coast.highWater=planet.physics.seaMaxLevel;
    Object.assign(this, buildVillage(B, spawnDir, this.stoneCenter, this.outerHouses,planet.village?.coastal?this.coast:null));
    if(this.lighthouseLamp)this.add(this.lighthouseLamp);
    if (this.farmDir) placed.push({ dir: this.farmDir, r: 7 }); // keep scattered solids out of the protected plot site
    B.decorative = true; decoratePonds(B); B.decorative = false;
    this.spots = { trees: [], rocks: [] };                            // every tree and rock, to chop and mine (gameplay/Gathering.js)
    this.trees = scatterFlora(B, planet.flora, this.spots, { canopy: this.canopy });   // { kind: count }
    this.scenery = freezeStaticTransforms(B.build()); this.add(this.scenery);
    const fl = planet.flora ?? {}, grass = createGrass(palette.grass, fl.grass ?? 1), tall = createTallGrass(fl.tallGrass ?? palette.grass, spawnDir, fl.tallCount ?? 1);
    const [stems, heads] = createMeadowFlowers(fl.flowers ?? [0xff8fb1, 0x8ff0ff, 0xffd36b, 0xc5a6ff], fl.meadow ?? 1);
    this.grass = [grass, tall, stems, heads].map(mesh => freezeStaticTransforms(chunkInstances(mesh))); this.add(...this.grass);

    this.water = createWater(palette.water, o => { this.add(o); this.ownMaterials.push(o.material); });
    this.waterMat = this.water.material; this.add(...this.water.meshes);

    // floating crystal above the stone circle
    this.crystal = part(G.oct(0.45), 0x9ff3ff, { glow: true, intensity: 1.9 });
    this.crystal.scale.set(1, 1.6, 1); this.add(this.crystal);
    this.crystalBase = this.stoneCenter.clone().multiplyScalar(groundHeight(this.stoneCenter) + 2.3);
    this.crystal.quaternion.copy(frameQuat(this.stoneCenter, tangentFrame(this.stoneCenter)[0]));

    this.sky = createSky(palette.sky); this.add(this.sky);
    this.clouds = createClouds(); this.add(this.clouds);
    this.fireflies = createFireflies(); this.add(this.fireflies);
    this.weather = new Weather(planet.weather, palette, o => this.add(o));
    this.ownMaterials.push(...this.weather.materials, this.sky.material, this.waterMat, grass.material, tall.material, stems.material, heads.material, this.fireflies.material);   // the rest are shared caches

    this.fireflyCount = this.fireflies.geometry.attributes.position.count;
    this.viewerPos = this.spawnDir.clone().multiplyScalar(groundHeight(this.spawnDir));
    this.applyDensity(); this.resetSun();
    this.mechanics.enter(planet);
    this.lantern = planet.mechanic === 'lantern' ? new LanternView(densityFor('scenery', settings)) : null;   // Duskhollow's dusk, belt lantern and glowmoss (30a)
    this.syncPhysics();
  }

  /** Adds generated objects to the scene and remembers them for dispose(). */
  add(...objects) { if (!objects.length) return; scene.add(...objects); this.objects.push(...objects); }
  /** Called after mechanic rules change, before actors/fish update. Does not consume placement randomness. */
  syncPhysics() { this.water?.sync(); }

  /** Changes only render counts; never regenerates a planet or consumes its seeded placement stream. */
  applyDensity() {
    setSceneryDensity(this.scenery, densityFor('scenery', settings));
    this.lantern?.applyDensity(densityFor('scenery', settings));       // a mechanic's own scenery (Duskhollow's glowmoss trail)
    for (const group of this.grass) group.traverse(mesh => {
      if (!mesh.isInstancedMesh) return;
      mesh.count = Math.floor(mesh.userData.fullCount * densityFor('grass', settings)); mesh.visible = mesh.count > 0;
    });
    const count = Math.floor(this.fireflyCount * densityFor('particle', settings));
    this.fireflies.geometry.setDrawRange(0, count); this.fireflies.visible = count > 0;
    this.weather.applyDensity(densityFor('weather', settings));
    this.updateGrassVisibility();
  }
  updateGrassVisibility() {
    for (const group of this.grass) for (const mesh of group.children) {
      mesh.visible = mesh.count > 0 && mesh.boundingSphere.center.distanceTo(this.viewerPos) - mesh.boundingSphere.radius <= 24 + 26 * densityFor('grass', settings);
    }
  }

  /** Removes everything generate() created and forgets the terrain, placement and scenery colliders. */
  dispose() {
    this.mechanics.exit();
    this.lantern?.dispose(); this.lantern = null;
    for(const shoal of this.seaLife??[])shoal.dispose();this.seaLife=[];
    this.weather?.dispose();
    for (const o of this.objects) { scene.remove(o); disposeTree(o); }
    for (const m of this.ownMaterials) { releasePointsMaterial(m); m.dispose(); }
    this.objects = []; this.ownMaterials = [];
    ponds.length = 0; placed.length = 0; clearStaticColliders();
    this.water = null; configurePhysics();
  }

  /** Time-of-day light (gameplay/dayClock.js light()): sun colour and strength, ambient strength. */
  setDaylight({ sun, sunIntensity, ambient }) {
    const w = this.weather?.now.light ?? 1, flash = this.weather?.flash ?? 0;   // the weather dims it; lightning flashes
    this.sun.color.copy(sun); this.sun.intensity = sunIntensity * w + flash * 2; this.hemi.intensity = ambient * (0.75 + 0.25 * w) + flash * 2.5;
  }

  /** Puts the sun back at its starting bearing over the village. */
  resetSun() {
    const [t1, t2] = tangentFrame(this.spawnDir);
    this.sunTan.copy(t1).multiplyScalar(0.62).addScaledVector(t2, 0.78).normalize();
  }

  /** Golden-hour sun that travels with the player so every side of the planet is cozy; sky and ambient animation. */
  update(dt, time, player, viewUp, camera) {
    if(this.lighthouseLamp)this.lighthouseLamp.visible=Quests.state.darkLighthouse?.status==='done';
    projectTangent(this.sunTan, player.up).normalize();
    _lightDir.copy(player.up).multiplyScalar(0.95).add(this.sunTan).normalize();
    this.sun.position.copy(player.pos).addScaledVector(_lightDir, 50); this.sun.target.position.copy(player.pos);
    this.hemi.position.copy(player.up);
    _skySun.copy(viewUp).multiplyScalar(0.2).add(this.sunTan).normalize();
    const su = this.sky.material.uniforms; su.uUp.value.copy(viewUp); su.uSun.value.copy(_skySun); su.uTime.value = time;
    this.sky.position.copy(camera.position);
    this.fireflies.material.uniforms.uTime.value = time; this.waterMat.uniforms.uTime.value = time; WIND.uTime.value = time; coastalWind.time.value=time;
    this.clouds.rotateOnWorldAxis(CLOUD_AXIS, dt * 0.008 * (1 + (this.weather?.now.wind ?? 0) * 2));
    this.weather.update(dt, time, player, this.sky);
    this.waterMat.uniforms.uSquall.value=this.weather.now.whitecaps??0;
    this.viewerPos.copy(player.pos); this.updateGrassVisibility();
    this.crystal.position.copy(this.crystalBase).addScaledVector(this.stoneCenter, Math.sin(time * 1.4) * 0.25); this.crystal.rotateY(dt * 0.9);
    this.lantern?.update(dt, player);                                  // after the daylight, before LocalLights reads the darkness
  }
}
