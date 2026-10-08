// TODO 14: aiming follows the hero's facing (not the camera); bosses sleep in sealed lairs until their conditions are
// met (level, seals, elites' sigils, a quest, night), wake in a sequence, fight inside an arena ring; villagers hint.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { BossGate } = await imp('gameplay/BossGate.js');
const { tryCast } = await imp('combat/casting.js');
const { aim, nudgeAim, cancelAim } = await imp('combat/aiming.js');
const { targeting } = await imp('combat/targeting.js');
const { damageEnemy } = await imp('combat/damage.js');
const { gainXp } = await imp('progression/experience.js');
const { audio } = await imp('systems/AudioSystem.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { JournalUI } = await imp('ui/JournalUI.js');
const { DAY } = await imp('config/day.js');
const { ARENA, SUMMON } = await imp('config/bossSummon.js');
const { arcDist, dirAlong, tangentFrame, tangentToward } = await imp('utils/sphere.js');
const { H, step } = await boot('witch', { wake: false });
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player, keys = H.keys;
const kill = e => { for (let i = 0; i < 300 && e.alive; i++) { e.invulnerable = false; damageEnemy(e, 60); step(1 / 60); } };
const walk = (dir, secs) => { keys.KeyW = true; for (let i = 0; i < secs * 60; i++) { H.cam.fwd.copy(tangentToward(P.up, dir)); step(1 / 60); } keys.KeyW = false; step(0.2); };
step(1);

// ---------------- aiming follows the hero, not the camera
const field = dirAlong(BossGate.lair, tangentFrame(BossGate.lair)[0], 6); P.placeAt(field); step(0.3);
const [t1, t2] = tangentFrame(P.up); P.fwd.copy(t1); H.cam.fwd.copy(t2); H.cam.lastDrag = 1e9; step(0.05);
const ahead = H.spawnEnemy('goblin', 0.1); ahead.placeAt?.(dirAlong(P.up, t1, 7));
const A = H.spawnEnemy('goblin', 0.1), B = H.spawnEnemy('goblin', 0.1);
for (const [e, t] of [[A, t1], [B, t2]]) { e.up.copy(dirAlong(P.up, t, 7)); e.home.copy(e.up); e.r = P.r; e.pos.copy(e.up).multiplyScalar(e.r); e.stunT = 99; }
ahead.vanish(); step(0.1); P.fwd.copy(t1);
check(targeting.aim === A, 'the soft lock-on picks the monster the hero faces, not the one the camera looks at');
P.mana = P.stats.maxMana; const n0 = ctx.projectiles.length; tryCast('bolt'); const bolt = ctx.projectiles[n0];
check(!!bolt && bolt.dir.dot(tangentToward(P.up, A.up)) > 0.95, 'Arcane Bolt flies where the hero faces');
A.vanish(); B.vanish(); step(0.2); P.fwd.copy(t1); P.mana = P.stats.maxMana; H.Pets.command('passive');
tryCast('meteor'); step(0.05);
const m0 = aim.target.clone(), d0 = arcDist(P.up, m0);
check(aim.id === 'meteor' && tangentToward(P.up, m0).dot(t1) > 0.95, `the Meteor marker sits ahead of the hero (${d0.toFixed(1)} m)`);
H.cam.fwd.applyAxisAngle(P.up, 1.4); step(0.1);
check(arcDist(aim.target, m0) < 0.05, 'turning the camera leaves the marker where it is');
nudgeAim(1); nudgeAim(1); step(0.05);
check(arcDist(P.up, aim.target) > d0 + 1, `the wheel moves it farther (${arcDist(P.up, aim.target).toFixed(1)} m)`);
cancelAim(); step(0.1);

// ---------------- Gloomcap: level + thorn seals
const boss = ctx.boss, G = BossGate;
check(G.state === 'sealed' && boss.dormant && boss.hidden && !boss.root.visible, 'Gloomcap sleeps, hidden, in its sealed lair');
const hp0 = boss.hp; damageEnemy(boss, 50); check(boss.hp === hp0, 'a sleeping boss can\'t be hurt');
check(G.seals.length === 3 && G.seals.every(s => arcDist(s.up, G.lair) < SUMMON.sealRing + 1), 'three thorn seals stand around the lair');
const chip = G.chipHtml(); check(/sealed/.test(chip) && /level 2/.test(chip) && /0\/3/.test(chip), 'the status chip lists what\'s needed');
const hint = G.lineFor(ctx.npcs[0]); check(hint && /level/i.test(hint.t), `a villager hints at it ("${hint?.t.slice(0, 60)}...")`);
check(G.waypoints().some(w => w.key === 'boss' && /sealed/.test(w.label)), 'the compass points at the sealed lair');
P.placeAt(G.lair); step(1); check(G.state === 'sealed' && !ctx.cutscene, 'walking into the lair early does nothing');
P.placeAt(dirAlong(G.lair, tangentFrame(G.lair)[0], 40)); step(0.2);
for (const s of G.seals) kill(s); step(0.2);
check(G.requirements().find(r => r.kind === 'seals').done && G.seals.every(e => !e.alive), 'the seals are broken');
gainXp(40); step(0.3);
check(G.state === 'ready', `level 2 too: the lair stirs (${G.state})`);
P.invuln = 0; const outside = P.up.clone(); P.placeAt(dirAlong(G.lair, tangentFrame(G.lair)[0], SUMMON.trigger - 1)); step(0.1);
check(G.state === 'summoning' && ctx.cutscene && audio.battleOn !== undefined, 'stepping into the lair begins the waking sequence');
const before = P.up.clone(); keys.KeyW = true; step(1); keys.KeyW = false;
check(arcDist(before, P.up) < 0.05 && P.invuln > 0, 'during it the hero can\'t move or be hurt');
step(SUMMON.sequence);
check(G.state === 'awake' && !boss.dormant && !boss.hidden && boss.root.visible && !ctx.cutscene, 'Gloomcap rises and the fight begins');
step(1.5);
check(G.posts[0].post.visible && G.ringK > 0.9, 'a ring of thorns closes the arena');
walk(outside, 6);
check(arcDist(P.up, G.lair) <= ARENA.radius + 0.2, `the ring holds the hero in (${arcDist(P.up, G.lair).toFixed(1)} m from the centre, ring at ${ARENA.radius})`);
kill(boss); step(2);
check(G.state === 'beaten' && G.ringK < 0.2, 'Gloomcap falls: the ring drops');
const praise = G.lineFor(ctx.npcs[1]); check(praise && /Gloomcap/.test(praise.t), 'villagers cheer afterwards');

// ---------------- Pyrrhax: level + sigils from elites
H.goToPlanet(1); step(1);
check(G.state === 'sealed' && G.elites.length === 4 && G.elites.every(e => e.elite && e.def.hp > e.def.hp / 2.6 + 1 && e.halo), 'Emberfall has four golden elites');
check(G.waypoints().filter(w => w.key.startsWith('elite')).length === 4, 'the compass marks the elites while sigils are needed');
const el = G.elites[0]; P.placeAt(dirAlong(el.up, tangentFrame(el.up)[0], 3)); step(0.2); kill(el); step(1); { const w = ctx.worldItems.find(x => x.itemId === 'emberSigil'); check(!!w, 'an elite drops an Ember Sigil'); if (w) { P.placeAt(w.up); step(1.5); } }
check(H.inventory.count('emberSigil') === 1, `and it's picked up (${H.inventory.count('emberSigil')})`);
H.inventory.add('emberSigil', 2); P.level = Math.max(P.level, 4); step(0.3);
check(G.state === 'ready', 'three sigils and level 4: Pyrrhax stirs');
P.placeAt(dirAlong(G.lair, tangentFrame(G.lair)[0], SUMMON.trigger - 1)); step(0.2);
check(G.state === 'summoning' && H.inventory.count('emberSigil') === 0, 'the sigils are offered at the lair');
step(SUMMON.sequence + 0.5); check(G.state === 'awake', 'Pyrrhax wakes');

// ---------------- Malgrath: level + a quest + night
H.goToPlanet(2); step(1);
P.level = Math.max(P.level, 6); dayClock.t = 0.4 * DAY.length; step(0.3);
check(G.state === 'sealed' && /Warm Hearts/.test(G.chipHtml()), 'Malgrath wants Tuva\'s quest done');
Quests.st('frostHearts').status = 'done'; step(0.3);
check(G.state === 'sealed' && /night/.test(G.chipHtml()), '...and the night');
dayClock.t = 0.85 * DAY.length; step(0.3); check(G.state === 'ready', 'at night he stirs');
dayClock.t = 1.05 * DAY.length; step(0.3); check(G.state === 'sealed', 'and sinks back if morning comes first');
// ---------------- the bestiary: lore and what wakes a boss
H.Journal.data.seen.pyrrhax = true; JournalUI.open('bestiary'); JournalUI.page = 'pyrrhax'; JournalUI.render();
check(/To wake it/.test(JournalUI.body.innerHTML) && /Ember Sigil/.test(JournalUI.body.innerHTML) && /Lore/.test(JournalUI.body.innerHTML), 'the bestiary has its lore and what wakes it');
JournalUI.close();
H.goToPlanet(0); step(0.5); H.wakeBoss(); step(0.2);
check(ctx.boss.root.visible && !ctx.boss.hidden && G.state === 'awake', 'the debug wake shows the boss straight away');
console.log(fails ? `${fails} FAILED` : 'all passed');
