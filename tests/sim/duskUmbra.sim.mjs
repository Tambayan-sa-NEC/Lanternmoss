// TODO 30h (Umbra, the Moth of the Last Light): Duskhollow's boss in the borrowed development slot (the world stays
// unreleased). She dives at the brightest light there is: light an arena lantern and she crashes into it, stunned
// and open; light nothing and she comes for the hero's own belt lantern instead. Her wingbeat puts every light out,
// takes oil and calls shadelings; from 50% she drinks a lantern dry for good and fogs the hero's own light. The
// gate is level 11 and Wick's quest, a faint resets the fight, and the Dusk Crown comes out of her treasure.
import assert from 'node:assert/strict';
import { installDuskUmbraFixture } from './lib/duskUmbraFixture.mjs';
import { boot, imp } from './lib/boot.mjs';
const fixture = installDuskUmbraFixture();
const { game, H, step } = await boot('witch', { wake: false });
const { ctx } = await imp('core/context.js');
const { dayClock } = await imp('gameplay/dayClock.js'), { DAY } = await imp('config/day.js');
const { COMBAT } = await imp('config/combat.js');
const { ARENA_WALLS } = await imp('config/bossSummon.js');
const { damageEnemy } = await imp('combat/damage.js');
const { encounterEvents } = await imp('combat/events.js');
const { currentInteraction } = await imp('gameplay/Houses.js');
const { Quests } = await imp('gameplay/quests/Quests.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { describeSummon } = await imp('gameplay/BossGate.js');
const { brightest, isCrashed, litLamps, lampsOf, startMove } = await imp('entities/enemies/behaviors/boss/umbra.js');
const { isDrained, isLit } = await imp('entities/enemies/behaviors/arenaLamp.js');
const { arcDist, offsetDir } = await imp('utils/sphere.js');
const P = H.player, U = COMBAT.enemies.umbra;
const lamp = () => H.Mechanics.active.instance;
const boss = () => ctx.boss;
const lamps = () => ctx.enemies.filter(e => e.type === 'arenaLantern' && e.alive);
const pass = m => console.log(`PASS  ${m}`);
const phase = f => { dayClock.skip((f * DAY.length - dayClock.t + DAY.length) % DAY.length || DAY.length, 'test'); step(0.1); };
const heal = () => { P.hp = P.stats.maxHp; };
const live = secs => step(secs, heal);
const hurts = [];
encounterEvents.addEventListener('playerhurt', e => hurts.push(e.detail.source));
/** Starts one named move through the kit's own path (begin + wind-up) and lets it land. */
const cast = (b, id) => { startMove(b, id); live(b.def.attacks[id].windup + 0.3); };
/** Stands at an arena lantern and lights it through the real prompt. */
const lightLampAt = l => {
  P.placeAt(offsetDir(l.up, 0.6, 1.4)); P.vel.set(0, 0, 0); live(0.2);
  const t = currentInteraction();
  assert.match(t?.label ?? '', /Light the arena lantern/, `the prompt offers it (${t?.label})`);
  t.run(); live(0.15);
  return isLit(l);
};

try {
  H.Tutorial.skip(); H.goToPlanet('lanternmoss'); H.Pets.command('passive'); phase(0.4); heal();

  // ---- the gate Wick's quest opens -----------------------------------------------------------------------------
  const b0 = boss();
  assert.ok(b0 && b0.type === 'umbra', 'Duskhollow has its boss');
  P.level = 10;
  assert.deepEqual(Object.fromEntries(H.BossGate.requirements().map(r => [r.kind, r.done])), { level: false, quest: false });
  const lines = describeSummon(H.BossGate.summon);
  assert.ok(lines.some(t => /level 11/.test(t)) && lines.some(t => /Wick/.test(t)), `the lair says what is needed: ${lines.join(' / ')}`);
  assert.equal(H.BossGate.state, 'sealed');
  P.level = 11; Quests.st('oldRoad').status = 'done'; live(0.3);
  assert.ok(H.BossGate.met && H.BossGate.state === 'ready', 'level 11 and the three moonwells open her lair');
  assert.equal(H.PLANETS[0].boss.arena.wall, 'moonfire');
  assert.ok(ARENA_WALLS.moonfire, 'and the ring around it is pale moonfire');
  pass('Umbra sleeps behind level 11 and Wick\'s quest, inside a ring of moonfire');

  // ---- she wakes with her bait standing ---------------------------------------------------------------------------
  H.wakeBoss(); live(1);
  const b = boss();
  assert.equal(H.BossGate.state, 'awake');
  assert.equal(lamps().length, U.lanterns.count, 'her arena lanterns stand around the lair');
  assert.ok(lamps().every(l => !isLit(l)), 'all of them dark to begin with');
  assert.ok(b.hover > 3, `and she is in the air (${b.hover.toFixed(1)} m)`);
  assert.ok(lamps().every(l => arcDist(l.up, b.home) < U.lanterns.at + 4), 'they ring the lair, not the valley');
  pass(`she wakes in the air with ${U.lanterns.count} arena lanterns standing dark around her`);

  // ---- with nothing lit, the brightest light is the hero ------------------------------------------------------------
  lamp().refill(1e6);
  P.placeAt(offsetDir(b.home, 0, 6)); live(0.3);
  assert.equal(brightest(b).lamp, null, 'nothing brighter than the hero is burning');
  assert.ok(brightest(b).hero, 'so she is coming for them');
  P.invuln = 0; const before = hurts.length;
  cast(b, 'dive');
  assert.ok(!isCrashed(b), 'a dive at the hero does not crash her');
  assert.ok(hurts.length > before, 'it just hurts');
  pass('with nothing else burning, the brightest light is your own lantern, and she dives at you');

  // ---- light one and she crashes into it instead ----------------------------------------------------------------------
  const oilBefore = lamp().status.oil;
  const bait = lamps()[0];
  assert.ok(lightLampAt(bait), 'a lit belt lantern lights an arena lantern');
  assert.ok(lamp().status.oil < oilBefore, `which costs a little oil (${oilBefore.toFixed(0)} -> ${lamp().status.oil.toFixed(0)})`);
  assert.equal(brightest(b).lamp, bait, 'and now that is the brightest thing in the ring');
  b.state = 'chase'; b.cool = 0; b.moveCd = {}; b.lastAttack = null;
  live(1 / 60);
  assert.equal(b.attack, 'dive', 'a lit bait draws her next chosen move before she can randomly snuff it');
  P.placeAt(offsetDir(b.home, 3.1, 9)); live(0.2);                      // well clear of the lantern
  cast(b, 'dive');
  assert.ok(isCrashed(b), 'she dives into the lantern and crashes');
  assert.ok(!isLit(bait), 'which puts that lantern out');
  // the damage window itself, read from the rule rather than from two hp deltas a pet's mark could colour
  const scaleCrashed = b.behavior.damageScale(b);
  const downHp = b.hp;
  damageEnemy(b, 100);
  assert.ok(b.hp < downHp, 'she takes hits while she is down');
  b.crashT = 0; live(0.2);                                              // let her up again
  assert.ok(scaleCrashed > b.behavior.damageScale(b), `a crashed moth takes more (${scaleCrashed} vs ${b.behavior.damageScale(b)})`);
  live(0.6);
  assert.ok(!isCrashed(b) && b.hover > 1, 'and she is back in the air afterwards');
  pass('a lit arena lantern takes the dive instead of the hero: she crashes into it, stunned and worth more');

  // ---- the wingbeat puts everything out ----------------------------------------------------------------------------
  for (const l of lamps()) if (!isLit(l) && !isDrained(l)) { l.relightT = 0; }
  lamp().refill(1e6);
  const second = lamps().find(l => !isDrained(l));
  lightLampAt(second);
  const oil = lamp().status.oil, shadesBefore = (b.shades ?? []).length;
  P.placeAt(offsetDir(b.home, 1.2, 4)); P.invuln = 0; live(0.2);
  cast(b, 'gust');
  assert.equal(litLamps(b).length, 0, 'a wingbeat puts every arena lantern out');
  assert.ok(lamp().status.oil < oil, `and takes oil out of the tank (${oil.toFixed(0)} -> ${lamp().status.oil.toFixed(0)})`);
  assert.ok((b.shades ?? []).length > shadesBefore, 'shadelings come out of the dark it leaves');
  assert.ok((b.shades ?? []).length <= U.snuff.maxShades, `never more than ${U.snuff.maxShades} of them`);
  assert.ok(second.relightT > 0, 'a snuffed lantern needs a moment before it lights again');
  P.placeAt(offsetDir(second.up, 0.6, 1.4)); live(0.2);
  assert.match(currentInteraction()?.label ?? '', /smouldering/, 'and the prompt says so');
  pass('her wingbeat puts out every lantern, drains the tank and calls shadelings out of the dark');

  // ---- from 50% she drinks the light ---------------------------------------------------------------------------------
  damageEnemy(b, Math.max(1, b.hp - b.def.hp * 0.45)); live(0.4);
  assert.equal(b.bossPhase, 1, 'Drinking the light');
  const standing = lampsOf(b).filter(l => !isDrained(l)).length;
  cast(b, 'drink');
  live(0.2);
  assert.equal(lampsOf(b).filter(l => !isDrained(l)).length, standing - U.feed.drains, 'each feed drains a lantern for good');
  const drained = lampsOf(b).find(isDrained);
  drained.relightT = 0; lamp().refill(1e6);
  P.placeAt(offsetDir(drained.up, 0.6, 1.4)); live(0.2);
  const t = currentInteraction();
  assert.ok(!t || !/Light the arena lantern/.test(t.label), 'a drained lantern never lights again');
  assert.ok(P.blindK < 1, `and her scales hang on the hero, pressing their light in (${P.blindK})`);
  const lit = lamp().status.radius;
  live(U.feed.fog + 0.5);
  assert.equal(P.blindK, 1, 'the fog clears by itself');
  assert.ok(lit > 0);
  pass(`from half health she drinks a lantern dry for good and fogs the hero for ${U.feed.fog}s`);

  // Repeated feeds must leave a usable bait lantern for the crash counter.
  while (lampsOf(b).filter(l => !isDrained(l)).length > 1) { cast(b, 'drink'); live(0.2); }
  const lastBait = lampsOf(b).find(l => !isDrained(l));
  cast(b, 'drink'); live(0.2);
  assert.equal(lampsOf(b).filter(l => !isDrained(l)).length, 1, 'repeated feeds leave one bait lantern');
  lastBait.relightT = 0; lamp().refill(1e6);
  assert.ok(lightLampAt(lastBait), 'the final lantern can still be lit after repeated feeds');
  lastBait.lit = false;
  pass('repeated feeds leave one usable bait lantern for the crash counter');

  // ---- the fight is still winnable in the dark, for every hero -------------------------------------------------------
  lamp().burn(1e6);
  for (const l of lamps()) if (isLit(l)) l.lit = false;
  P.placeAt(offsetDir(b.home, 2, 5)); P.invuln = 0; heal();
  let hurtWhileHelpless = false;
  const seen = { n: hurts.length };
  live(3);
  if (hurts.length > seen.n && !b.alive) hurtWhileHelpless = true;
  assert.equal(lamp().status.lit, false, 'the tank is empty and every lantern is out');
  const darkHp = b.hp; damageEnemy(b, 200);
  assert.ok(b.hp < darkHp, 'she can still be hit in the dark: darkness is never a wall');
  assert.ok(!hurtWhileHelpless);
  live(4); P.invuln = 1e4; heal();                                      // out of the fire for this part: it is about lighting, not damage
  assert.ok(!P.dead, 'the hero is on their feet for the hero-by-hero check');
  for (const hero of ['witch', 'knight', 'ranger']) {
    applyCharacter(hero); lamp().refill(1e6); heal(); P.invuln = 1e4;
    const l = lamps().find(x => !isDrained(x) && !isLit(x));
    l.relightT = 0;
    assert.ok(lightLampAt(l), `${hero} can light the bait: the counter needs a lantern, not a spell`);
    l.lit = false;
  }
  applyCharacter('witch');
  pass('an empty lantern never walls the fight off, and all three heroes can light the bait');

  // ---- a faint puts the fight back, and Continue remembers ------------------------------------------------------------
  P.hp = 1; P.invuln = 0; damageEnemy(b, 0);
  const { hurtPlayer } = await imp('combat/damage.js');
  hurtPlayer(999, P.pos, 0, { source: b, lethal: true });
  live(0.3);
  assert.ok(P.dead, 'the hero faints');
  live(4);
  assert.ok(!P.dead, 'and comes back');
  live(1);
  assert.ok(boss().alive, 'she is still there');
  assert.ok(H.saves.save().ok); assert.ok(H.saves.continue()); phase(0.4);
  assert.ok(boss(), 'Continue rebuilds the fight');
  assert.ok(ctx.enemies.filter(e => e.type === 'arenaLantern').every(e => !isLit(e)),
    'with her lanterns dark again: a save can never leave the bait burning');
  assert.equal(P.blindK, 1, 'and no fog carried across');
  pass('a faint and a Continue both put the fight back, with the bait dark and the hero clear-sighted');

  // ---- beaten: the Dusk Crown ------------------------------------------------------------------------------------------
  const final = boss();
  H.wakeBoss(); live(0.5);
  damageEnemy(final, final.def.hp * 3);
  live(1);
  assert.ok(!final.alive, 'she goes down');
  assert.equal(ctx.enemies.filter(e => e.type === 'arenaLantern' && e.alive).length, 0, 'and her lanterns go with her');
  assert.equal(P.blindK, 1, 'the fog lifts');
  assert.equal(H.PLANETS[0].boss.trophy, 'duskCrown');
  assert.ok(H.items.get('duskCrown'), 'the Dusk Crown is a real item');
  pass('beaten, she leaves the ring empty and her crown behind');
  console.log('all passed');
} finally { H.Mechanics.exit(); fixture.restore(); }
