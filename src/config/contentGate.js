/* Release acceptance is pure; tests inject actual runtime registrations, not a duplicate allow-list.
   The shipped Act I worlds retain their historical content mix. Every other world meets the expansion checklist. */
import { populationProblem, validatePlanetCatalog } from './planetRules.js';
import { PERFORMANCE_REFERENCE, referenceProfile, referenceRenderer } from './render.js';
const ORIGINALS = new Set(['lanternmoss', 'emberfall', 'frostveil']);
const positive = n => Number.isFinite(n) && n > 0;
const unique = values => [...new Set(values)];
/** On a 60 Hz browser clock even an empty page can measure a p95 just over 16.67 ms. A world passes if its p95 is
    no worse than the target or the empty-page clock measured in the same run. The clock only counts when it is a real
    60 Hz clock (median within 5% of the target), so a slow display or broken calibration cannot loosen the budget. */
export function frameLimitMs(target, clock) {
  const genuine = clock?.samples >= 120 && positive(clock.medianMs) && positive(clock.p95Ms)
    && Math.abs(clock.medianMs - target) <= target * 0.05;
  return genuine ? Math.max(target, clock.p95Ms) : target;
}
export function contentProblems(p, catalog, r) {
  const errors = [], require = (ok, message) => { if (!ok) errors.push(`${p.id}: ${message}`); };
  const legacy = p.act === 1 && ORIGINALS.has(p.id), moon = p.id === 'lanternMoon' && p.secret === true;
  const levels = p.expectedLevel;
  require(Array.isArray(levels) && levels.length === 2 && levels.every(n => Number.isInteger(n) && n >= 1 && n <= r.maxLevel) && levels[0] <= levels[1], 'expectedLevel must fit the level cap');
  require(Number.isInteger(p.lowLevel) && p.lowLevel >= 1 && p.lowLevel <= r.maxLevel, 'low-level challenge must fit the level cap');
  require(['hp','damage','speed','cooldown','xp'].every(k => positive(p.scale?.[k])), 'scale needs positive hp/damage/speed/cooldown/xp');
  require(!!p.arrival && !!p.tagline, 'arrival and tagline are required');
  const enemy = (type, kind) => {
    const def = r.enemies[type]; require(!!def, `unknown enemy ${type}`); if (!def) return;
    require(typeof r.models[type] === 'function', `missing body builder ${type}`);
    const behavior = def.behavior ?? def.ai;
    require(['melee','ranged','hopper'].includes(behavior) || typeof r.behaviors[behavior]?.think === 'function', `unregistered behavior ${behavior}`);
    if (def.ai === 'boss' || def.miniBoss) require(typeof r.behaviors[behavior]?.think === 'function', `missing fight module ${type}`);
    require(!!r.bestiary[type]?.blurb && Array.isArray(r.bestiary[type]?.counters) && r.bestiary[type].counters.length > 0, `missing bestiary page ${type}`);
    if (kind === 'boss') require(def.ai === 'boss' && !def.miniBoss, 'planet boss must be a boss AI');
    if (kind === 'mini') require(def.miniBoss === true, `not a mini boss ${type}`);
    if (kind === 'regular') require(def.ai !== 'boss' && !def.miniBoss && !def.object, `invalid regular enemy ${type}`);
  };
  const roster = p.roster ?? [], types = unique(roster.map(g => g.type));
  for (const g of roster) { enemy(g.type, 'regular'); require(Number.isInteger(g.groups ?? 1) && positive(g.groups ?? 1) && Number.isInteger(g.size ?? g.count) && positive(g.size ?? g.count), `invalid population for ${g.type}`); }
  enemy(p.boss?.type, 'boss'); (p.miniBosses ?? []).forEach(m => enemy(m.type, 'mini'));
  for (const attack of Object.values(r.enemies[p.boss?.type]?.attacks ?? {})) for (const type of attack.types ?? []) enemy(type, 'regular');
  const item = id => require(r.items.has(id), `unknown item ${id}`);
  item(p.boss?.trophy); item(p.material);
  require(Array.isArray(p.forage), 'forage must be an explicit array for world generation');
  for (const f of p.forage ?? []) { item(f.item); require(positive(f.count), `invalid forage count ${f.item}`); }
  for (const c of p.chests ?? []) require(!!r.chests[c.kind] && Number.isInteger(c.count) && positive(c.count), `invalid chest ${c.kind}`);
  const trees = Object.entries(p.flora?.trees ?? {}).filter(([,n]) => positive(n)).map(([id]) => id);
  trees.forEach(id => require(!!r.trees[id] && typeof r.treeModels[id] === 'function', `unregistered tree ${id}`));
  const critters = unique((p.wildlife?.critters ?? []).map(([id]) => id));
  for (const [id,n] of p.wildlife?.critters ?? []) require(!!r.critters[id] && Number.isInteger(n) && positive(n), `unknown critter or count ${id}`);
  const rare = r.critters[p.wildlife?.rare]; require(!!rare?.rare, 'a registered rare creature is required'); if (rare?.rare) item(rare.rare.gift);
  const weather = Object.keys(p.weather ?? {}).filter(id => positive(p.weather[id])); weather.forEach(id => require(!!r.weather[id], `unknown weather ${id}`));
  const nodes = [...p.resources?.nodes ?? [], ...p.resources?.rare ?? []];
  for (const [id,n] of nodes) {
    const node = r.nodes[id]; require(!!node && Number.isInteger(n) && positive(n), `unknown node or count ${id}`);
    for (const [drop] of [...node?.drops ?? [], ...node?.extra ?? []]) item(drop);
  }
  const locals = p.npcs?.locals ?? [];
  locals.forEach(n => {
    require(typeof r.locals[n.look] === 'function', `unknown local appearance ${n.look}`);
    require(!!n.name && !!r.houses[n.home] && Array.isArray(n.lines) && n.lines.length > 0 && n.lines.every(line => !!line.t), `invalid local ${n.name}`);
    require(p.houses?.[n.home]?.owner === n.name, `local home ownership missing for ${n.name}`);
  });
  for (const house of Object.values(p.houses ?? {})) for (const [id] of house?.gift?.items ?? []) item(id);
  for (const quest of Object.values(r.quests).filter(q => locals.some(n => n.name === q.giver))) {
    for (const [id] of [...quest.give ?? [], ...quest.reward?.items ?? []]) item(id);
    for (const step of quest.steps ?? []) {
      if (step.item) item(step.item);
      if (step.enemy && step.enemy !== 'any') require(!!r.enemies[step.enemy], `unknown quest enemy ${step.enemy}`);
      if (step.planet != null) require(typeof step.planet === 'string' ? catalog.some(other => other.id === step.planet) : !!catalog[step.planet], 'unknown quest planet');
      if (step.to) require(r.travelers.includes(step.to) || locals.some(n => n.name === step.to), `unknown quest recipient ${step.to}`);
    }
  }
  const summon = p.boss?.summon ?? {};
  if (summon.level != null) require(Number.isInteger(summon.level) && summon.level >= 1 && summon.level <= r.maxLevel, 'unreachable summon level');
  if (summon.quest) require(!!r.quests[summon.quest], `unknown summon quest ${summon.quest}`);
  if (summon.sigils) item(summon.sigils.item);
  if (summon.seals) { const seal = r.enemies[summon.seals.type]; require(seal?.object === true && typeof r.models[summon.seals.type] === 'function' && !!r.behaviors[seal?.behavior ?? seal?.ai], 'unregistered lair seal'); }
  const theme = r.music[p.music]; require(!!theme && theme.pad?.every(positive) && theme.pad.length > 0 && theme.notes?.every(positive) && theme.notes.length > 0 && theme.interval?.length === 2 && positive(theme.interval[0]) && theme.interval[1] >= theme.interval[0], 'registered music theme is required');
  if (p.mechanic != null) require(r.mechanicKnown(p.mechanic), `unregistered mechanic ${p.mechanic}`);
  const physics = p.physics ?? {};
  require(physics.gravity == null || positive(physics.gravity) && physics.gravity >= 0.05 && physics.gravity <= 4, 'invalid planet gravity');
  require(physics.seaLevel == null || Number.isFinite(physics.seaMaxLevel ?? physics.seaLevel) && physics.seaLevel <= (physics.seaMaxLevel ?? physics.seaLevel), 'sea must fit its maximum');
  require(physics.waterOffset == null || Number.isFinite(physics.waterOffset) && physics.waterOffset <= (physics.waterMaxOffset ?? physics.waterOffset), 'pond offset must fit its maximum');
  for (const key of ['seaLevel','seaMaxLevel']) require(physics[key] == null || Number.isFinite(physics[key]) && physics[key] >= r.radius - 24 && physics[key] <= r.radius + 24, `invalid physics ${key}`);
  for (const key of ['waterOffset','waterMaxOffset']) require(physics[key] == null || Number.isFinite(physics[key]) && Math.abs(physics[key]) <= 12, `invalid physics ${key}`);
  const ceiling = r.ceilings[p.id]; require(positive(ceiling?.calls) && positive(ceiling?.triangles), 'render budget is required');
  const previous = catalog.slice(0, catalog.findIndex(other => other.id === p.id)).filter(other => other.released && !other.secret).at(-1);
  require(populationProblem({ ...p, roster }, previous) === null, 'roster population does not meet its floor');
  if (legacy) return errors;
  const others = catalog.filter(other => other.id !== p.id);
  const elsewhere = new Set(others.flatMap(other => (other.roster ?? []).map(g => g.type)));
  require(types.filter(type => !elsewhere.has(type)).length >= 3 && types.filter(type => elsewhere.has(type)).length <= 2, 'three exclusive regular types and at most two returning types are required');
  const exclusive = types.filter(type => !elsewhere.has(type)).map(type => r.models[type]);
  require(new Set(exclusive).size >= 3 && exclusive.every(build => ![...elsewhere].some(type => r.models[type] === build)), 'exclusive enemies need distinct body builders');
  const bossDef = r.enemies[p.boss?.type], bossModule = r.behaviors[bossDef?.behavior ?? bossDef?.ai];
  require(!!bossModule && !others.some(other => {
    const def = r.enemies[other.boss?.type], module = r.behaviors[def?.behavior ?? def?.ai];
    return other.boss?.type === p.boss?.type || module === bossModule;
  }), 'a unique planet boss module is required');
  require(moon ? (p.miniBosses ?? []).length === 0 && p.farm === false && p.caves === false && p.population?.min >= 1 : (p.miniBosses ?? []).length >= 1 && p.farm !== false, 'mini boss/farm checklist or explicit Moon exceptions are required');
  require(trees.length >= 2 && critters.length >= 2, 'two tree kinds and two critter kinds are required');
  const otherRare = new Set(others.map(other => other.wildlife?.rare)); require(!otherRare.has(p.wildlife?.rare), 'the rare creature must be unique');
  require(!others.some(other => other.material === p.material), 'the material must be unique');
  const otherWeather = new Set(others.flatMap(other => Object.keys(other.weather ?? {}))); require(weather.some(id => !otherWeather.has(id)), 'a unique weather kind is required');
  require((p.resources?.rare ?? []).some(([id]) => r.nodes[id]?.rare === true), 'a rare vein is required');
  require(locals.some(n => Object.values(r.quests).some(q => q.giver === n.name && q.title && q.steps?.length > 0 && (q.planet === p.id || q.planet === catalog.findIndex(world => world.id === p.id)))), 'a local villager with a planet quest is required');
  require(r.travelers.every(name => !!p.npcs?.arrivals?.[name]?.t), 'first-arrival lines for every traveler are required');
  require(!others.some(other => other.music === p.music), 'a unique music theme is required');
  require(p.mechanic != null && r.mechanicKnown(p.mechanic), 'a registered planet mechanic is required');
  if (p.secret) {
    require(p.unlock?.bosses?.length > 0 && p.unlock.bosses.every(id => catalog.some(other => other.id === id)), 'secret unlock needs known prerequisite worlds');
    require((p.unlock?.rareGifts ?? []).every(id => r.items.has(id)), 'unknown rare gift in secret unlock');
  }
  const report = r.releases[p.id];
  require(referenceProfile(report), 'release performance needs the Acer RTX 4050 at 1080p High');
  require(report?.dirty === false && /^[a-f0-9]{40}$/i.test(report?.candidateCommit ?? ''), 'release performance needs a committed clean candidate');
  require(report?.gpuTiming === false, 'release performance timing must exclude diagnostic GPU query/readback overhead');
  require(report?.browser?.headless === false, 'desktop release performance timing needs a visible browser on the reference machine');
  const frameLimit = frameLimitMs(r.targetFrameMs, report?.frameClock);
  const rows = report?.rows ?? [], keys = new Set(rows.map(row => `${row.hero}/${row.seed}/${row.scene}`));
  const expected = PERFORMANCE_REFERENCE.heroes.flatMap(hero => PERFORMANCE_REFERENCE.seeds.flatMap(seed =>
    PERFORMANCE_REFERENCE.scenes.map(scene => `${hero}/${seed}/${scene}`)));
  require(rows.length === expected.length && keys.size === expected.length && expected.every(key => keys.has(key)),
    'release performance needs every hero, both seeds and all three scenes exactly once');
  for (const row of rows) {
    require(referenceRenderer(row.gpu) && row.quality === PERFORMANCE_REFERENCE.quality
      && row.drawingBuffer?.[0] === PERFORMANCE_REFERENCE.viewport[0] && row.drawingBuffer?.[1] === PERFORMANCE_REFERENCE.viewport[1]
      && row.samples >= 90 && positive(row.p95FrameMs) && row.p95FrameMs <= frameLimit
      && positive(row.calls) && row.calls <= ceiling?.calls && positive(row.triangles) && row.triangles <= ceiling?.triangles,
      `performance fixture ${row.hero}/${row.seed}/${row.scene} must pass its hardware/frame/draw budget`);
  }
  return errors;
}

export function assertReleasedContent(catalog, registries) {
  validatePlanetCatalog(catalog);
  const errors = catalog.filter(p => p.released).flatMap(p => contentProblems(p, catalog, registries));
  if (errors.length) throw new Error(errors.join('\n'));
}
