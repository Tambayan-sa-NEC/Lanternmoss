import assert from 'node:assert/strict';
import { boot, imp } from './lib/boot.mjs';
const { game, H } = await boot('witch', { wake:false });
const { contentRegistry } = await import('./lib/contentRegistry.mjs');
const { assertReleasedContent } = await imp('config/contentGate.js');
const { PLANET_CATALOG } = await imp('config/planets.js');
const { gainXp } = await imp('progression/experience.js');
const { xpToNext } = await imp('progression/leveling.js');
const { QUESTS }=await imp('config/quests.js');
const { Quests }=await imp('gameplay/quests/Quests.js');
assertReleasedContent(PLANET_CATALOG,contentRegistry());
console.log('PASS  released content passes actual behavior/body/tree/NPC/music registries, reference checks and render budgets');
H.Tutorial.skip(); H.player.invuln=10000; H.player.level=10; H.player.xp=0;
gainXp(xpToNext(10)); assert.equal(H.player.level,11); assert.ok(H.player.stats.maxHp>100);
assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); assert.equal(H.player.level,11);
gainXp(1000000); assert.equal(H.player.level,16); assert.equal(H.player.xp,0);
assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); assert.equal(H.player.level,16);
const before=H.player.toJSON(); gainXp(100); assert.deepEqual(H.player.toJSON(),before);
console.log('PASS  real level-10 XP resumes progression, level-11/16 Continue restores stats, and cap ignores surplus');
QUESTS.probeIdQuest={giver:'Gate Tester',planet:'lanternmoss',steps:[{kind:'talk',to:'Gate Tester'}]};
try {
  assert.equal(Quests.offerable({name:'Gate Tester'}),'probeIdQuest');
  QUESTS.probeIdQuest.planet='tidewhisper';assert.equal(Quests.offerable({name:'Gate Tester'}),null);
} finally { delete QUESTS.probeIdQuest; delete Quests.state.probeIdQuest; }
console.log('PASS  new quest origins accept stable released planet ids and refuse unfinished worlds');
const starting=PLANET_CATALOG[0], farm=starting.farm;
try { starting.farm=false;game.planets.spawnResources();assert.equal(H.Farm.plots.length,0); }
finally { starting.farm=farm;game.planets.spawnResources(); }
assert.ok(H.Farm.plots.length>0);console.log('PASS  explicit no-farm configuration skips village plots and restores ordinary-world defaults');
game.world.dispose(); console.log('all passed');
