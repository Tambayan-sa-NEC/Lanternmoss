// TODO 15: per-planet trees, grass and wildflowers that sway with the weather; weather spells per planet (fog, light,
// rain / snow / ash); wild animals (frogs by ponds, skittish deer, hopping bunnies), a rare creature to befriend for a
// charm, flocks, lake koi; the Hydra and the Basilisk mini bosses; pet swapping and the dragontoad.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { PLANETS } = await imp('config/planets.js');
const { WEATHER_KINDS } = await imp('config/weather.js');
const { RENDER } = await imp('config/render.js');
const { WIND } = await imp('world/scatter.js');
const { scene } = await imp('render/scene.js');
const { ponds } = await imp('world/terrain.js');
const { rareTarget } = await imp('entities/wildlife/wildlife.js');
const { Flock } = await imp('entities/wildlife/Bird.js');
const { damageEnemy } = await imp('combat/damage.js');
const { Pets } = await imp('gameplay/Pets.js');
const { Journal } = await imp('gameplay/Journal.js');
const { arcDist, dirAlong, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { H, step, game } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player, keys = H.keys, W = () => game.world;
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const kill = e => { for (let i = 0; i < 400 && e.alive; i++) { e.invulnerable = false; damageEnemy(e, 40); step(1 / 60); } };
step(1);

// ---------------- each planet's trees, animals and weather
for (let i = 0; i < 3; i++) {
  if (i) { H.goToPlanet(i); step(0.5); }
  const p = PLANETS[i], grown = W().trees, kinds = Object.keys(grown);
  check(kinds.length >= 3 && kinds.every(k => p.flora.trees[k]), `${p.name}: its own trees (${kinds.map(k => `${k} ${grown[k]}`).join(', ')})`);
  const want = new Set(p.wildlife.critters.map(c => c[0])), have = new Set(ctx.critters.map(c => c.defKey));
  check([...want].every(k => have.has(k)) && have.has(p.wildlife.rare), `${p.name}: its animals (${[...want].join(', ')}) and a rare ${p.wildlife.rare}`);
  check(ctx.birds.some(b => b instanceof Flock) === (p.wildlife.flocks > 0), `${p.name}: flocks overhead`);
  const rolls = new Set(); for (let k = 0; k < 60; k++) rolls.add(W().weather.roll());
  check([...rolls].every(k => p.weather[k]), `${p.name}: weather only from its own mix (${[...rolls].join(', ')})`);
  check(ctx.enemies.some(e => e.def.miniBoss), `${p.name}: a mini boss out in the wilds (${ctx.enemies.filter(e => e.def.miniBoss).map(e => e.def.name.split(',')[0]).join(', ')})`);
}
H.goToPlanet(0); step(0.5);

// ---------------- weather
const wx = W().weather;
H.setWeather('clear'); step(0.5); const fog0 = scene.fog.far, light0 = W().sun.intensity, wind0 = WIND.uWind.value;
H.setWeather('storm'); step(0.5);
check(scene.fog.far < fog0 * 0.6 && W().sun.intensity < light0 * 0.8, `a storm closes the fog in and dims the light (fog ${fog0.toFixed(0)} -> ${scene.fog.far.toFixed(0)})`);
check(wx.layers.rain.visible && wx.layers.rain.material.uniforms.uIntensity.value > 0.5 && !wx.layers.snow.visible, 'rain falls (and no snow)');
check(WIND.uWind.value > wind0 * 2, `the grass leans harder in the wind (${wind0.toFixed(2)} -> ${WIND.uWind.value.toFixed(2)})`);
let flashed = false; for (let i = 0; i < 20 * 60 && !flashed; i++) { step(1 / 60); if (wx.flash > 0.5) flashed = true; }
check(flashed, 'lightning flashes in a storm');
{ const { dom } = await imp('ui/dom.js'); check(/Storm/.test(dom.hud.innerHTML), `the time chip shows it (${wx.label})`); }
wx.set('fog'); step(1); check(wx.k < 1 && wx.k > 0, 'the next spell blends in over a few seconds');
step(10); check(wx.kind === 'fog' && scene.fog.far < RENDER.fog.far * 0.4, 'fog rolls in');
H.setWeather('clear'); step(0.3);

// ---------------- animals
const deer = ctx.critters.find(c => c.kind === 'deer');
P.placeAt(dirAlong(deer.up, tangentFrame(deer.up)[0], 7.5)); deer.cool = 0; step(0.5);
check(deer.state === 'flee', `a deer bolts from 7.5 m away (${deer.state})`);
const bunny = ctx.critters.find(c => c.kind === 'bunny' && !c.rare); bunny.state = 'wander'; bunny.timer = 5; let hopped = false;
for (let i = 0; i < 120; i++) { step(1 / 60); if (bunny.vy > 1) hopped = true; }
check(hopped, 'bunnies hop as they go');
const frogs = ctx.critters.filter(c => c.kind === 'frog');
check(frogs.length && frogs.every(f => ponds.some(p => arcDist(f.home, p.dir) < p.r + 3)), `frogs live by the ponds (${frogs.length})`);
check(ponds.filter(p => p.r >= 8).every(p => p.fish.some(f => f.root.scale.x > 1.5)), 'every lake has a big golden koi');
const flock = ctx.birds.find(b => b instanceof Flock); step(0.2);
check(flock.birds[0].root.position.length() - 72 > 12, 'flocks wheel high overhead');

// ---------------- the rare creature
const rare = ctx.critters.find(c => c.rare);
P.placeAt(dirAlong(rare.up, tangentFrame(rare.up)[0], 9)); step(0.2);
const toward = () => { const t = tangentToward(P.up, rare.up); H.cam.fwd.copy(t); };
toward(); keys.KeyW = true; keys.ShiftLeft = true; for (let i = 0; i < 40; i++) { toward(); step(1 / 60); } keys.KeyW = false; keys.ShiftLeft = false;
check(rare.state === 'flee', `running at the ${rare.rare.name} scares it off`);
step(4); rare.state = 'idle'; rare.timer = 2;
P.placeAt(dirAlong(rare.up, tangentFrame(rare.up)[0], 2)); P.vel.set(0, 0, 0); step(0.3);
const t = rareTarget(); check(t && /Befriend/.test(t.label) && rare.state === 'sit', `walk up slowly: it sits for you ("${t?.label}")`);
t?.run(); step(0.3);
const slot = H.inventory.find(rare.rare.gift), s = slot >= 0 ? H.inventory.getSlot(slot) : null;
check(s && s.props?.rarity === 'legendary', `befriended: a Legendary ${rare.rare.gift}`);
check(rare.away > 0 && !rare.root.visible && Journal.data.stats.rareFriends >= 1, 'it slips away for a while (and the journal notes it)');
rare.away = 0.01; step(0.2); check(rare.root.visible, 'later it turns up somewhere else');

// ---------------- the Hydra
const hydra = ctx.enemies.find(e => e.type === 'hydra'), lake = ponds.filter(p => p.r >= 6).sort((a, b) => arcDist(b.dir, W().spawnDir) - arcDist(a.dir, W().spawnDir))[0];
check(arcDist(hydra.home, lake.dir) < lake.r + 6, 'the Hydra keeps to the far lake\'s bank');
check(hydra.necks.filter(n => n.pivot.visible).length === 3, 'it starts with three heads');
P.placeAt(dirAlong(hydra.up, tangentFrame(hydra.up)[0], 8)); P.invuln = 99; step(0.2); hydra.aggro(); step(0.5);
damageEnemy(hydra, hydra.def.hp * 0.4); step(0.5);
check(hydra.necks.filter(n => n.pivot.visible).length === 4, 'below two-thirds it grows a fourth head');
const items0 = ctx.worldItems.length; kill(hydra); step(1);
check(!hydra.alive && ctx.worldItems.length > items0, `beaten: it leaves a rare haul (${ctx.worldItems.length - items0} items)`);
check(Pets.unlocked.has('dragontoad') && Journal.data.stats.minibosses >= 1, 'the dragontoad egg hatches (and the journal counts a mini boss)');

// ---------------- pets: swap with N, the dragontoad
const before = Pets.id; press('KeyN'); step(0.1);
check(Pets.id !== before && ctx.companion.petId === Pets.id, `N swaps to the next pet (${before} -> ${Pets.id})`);
press('KeyN'); check(Pets.swapCool > 0, 'with a short wait between swaps');
Pets.choose('dragontoad'); step(0.2);
check(ctx.companion.petId === 'dragontoad' && ctx.companion.wingL, 'the dragontoad comes out (wings and all)');
let toadHop = false; P.placeAt(dirAlong(P.up, tangentFrame(P.up)[0], 6)); for (let i = 0; i < 90; i++) { step(1 / 60); if (ctx.companion.vy > 1) toadHop = true; }
check(toadHop, 'it hops after you');
const foes = [0, 1, 2].map(i => H.spawnEnemy('goblin', 2.5)); step(0.1); for (const f of foes) f.hp = 500;
Pets.abilityCd = 0; Pets.useAbility(); step(0.05);
check(foes.filter(f => f.stunT > 0.5 && f.hp < 500).length >= 2, 'Bellow: monsters close by are hurt and stunned');
for (const f of foes) f.vanish();

// ---------------- the Basilisk
H.goToPlanet(1); step(0.5);
const bas = ctx.enemies.find(e => e.type === 'basilisk');
P.placeAt(dirAlong(bas.up, tangentFrame(bas.up)[0], 9)); P.invuln = 0; P.hp = P.stats.maxHp; step(0.2);
const gaze = async lookAt => {
  bas.aggro(); bas.state = 'chase'; bas.cool = 0; bas.moveCd = {}; bas.lastAttack = 'whip';
  for (let i = 0; i < 400 && !(bas.state === 'windup' && bas.attack === 'gaze'); i++) { bas.cool = 0; for (const k of ['whip', 'lunge']) bas.moveCd[k] = 9; step(1 / 60); }
  for (let i = 0; i < 240 && bas.state === 'windup'; i++) { P.fwd.copy(tangentToward(P.up, bas.up)); if (!lookAt) P.fwd.negate(); P.invuln = 0; step(1 / 60); }
  step(0.05); return P.petrifyT > 0;
};
check(await gaze(true), 'the Basilisk\'s gaze turns a hero facing it to stone');
const pos = P.up.clone(); keys.KeyW = true; step(0.5); keys.KeyW = false;
check(arcDist(pos, P.up) < 0.05 && document.body.classList.contains('petrified'), 'stone can\'t move (and the screen greys)');
step(2); bas.moveCd = {};
check(!(await gaze(false)), 'turning your back on it keeps you safe');
console.log(fails ? `${fails} FAILED` : 'all passed');
