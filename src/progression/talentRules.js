/* TALENT RULES (config/talents.js): points, what can be learned, a saved state's validation and the hero's kit with
   talents applied. Pure (no scene / DOM), unit-tested in tests/talents.test.mjs. ranks = { talentId: rank }. */
import { TALENTS } from '../config/talents.js';
import { LEVELING } from '../config/leveling.js';

/** Points a hero has earned by `level` (derived, never stored). */
export function pointsEarned(level, P = TALENTS.points) {
  return level < P.firstAt ? 0 : Math.floor((Math.min(level, LEVELING.maxLevel) - P.firstAt) / P.every) + 1;
}

/** Points spent on `ranks` in `tree`. */
export function pointsSpent(tree, ranks) {
  return tree.talents.reduce((n, t) => n + (ranks[t.id] ?? 0) * t.cost, 0);
}

/** Why talent `id` can't take another rank (a sentence), or null when it can. */
export function learnProblem(tree, ranks, id, level) {
  const t = tree.talents.find(x => x.id === id); if (!t) return 'There is no such talent.';
  if ((ranks[id] ?? 0) >= t.max) return `${t.name} is already at its highest rank.`;
  const missing = t.needs.filter(n => !(ranks[n] > 0)).map(n => tree.talents.find(x => x.id === n)?.name ?? n);
  if (missing.length) return `Learn ${missing.join(' and ')} first.`;
  if (pointsEarned(level) - pointsSpent(tree, ranks) < t.cost) return 'Not enough talent points: you get one every two levels.';
  return null;
}

/** ranks after one more rank of `id` (unchanged if it can't be learned). */
export function learn(tree, ranks, id, level) { return learnProblem(tree, ranks, id, level) ? ranks : { ...ranks, [id]: (ranks[id] ?? 0) + 1 }; }

/** A saved state made safe: known talents only, ranks within 1..max, prerequisites met and no more points spent than
    `level` has earned. Talents are re-learned in tree order, so anything that no longer fits is dropped. */
export function cleanTalents(value, tree, level) {
  const raw = value && typeof value === 'object' && value.ranks && typeof value.ranks === 'object' ? value.ranks : {};
  let ranks = {};
  for (const t of tree.talents) {
    const want = Number.isInteger(raw[t.id]) ? Math.min(raw[t.id], t.max) : 0;
    for (let r = 0; r < want; r++) { const next = learn(tree, ranks, t.id, level); if (next === ranks) break; ranks = next; }
  }
  return { ranks };
}

/** The hero's ability table with talents applied: a new object, the base untouched. With no ranks, the base itself. */
export function talentKit(abilities, tree, ranks) {
  if (!tree.talents.some(t => ranks[t.id] > 0)) return abilities;
  const kit = Object.fromEntries(Object.entries(abilities).map(([id, s]) => [id, { ...s }]));
  for (const t of tree.talents) {
    const r = ranks[t.id] ?? 0; if (!r) continue;
    for (const m of t.mods) {
      const s = kit[m.ability]; if (!s) continue;
      if ('set' in m) s[m.key] = m.set;
      else if ('mul' in m) s[m.key] = (s[m.key] ?? 0) * (1 + m.mul * r);
      else if ('add' in m) s[m.key] = (s[m.key] ?? 0) + m.add * r;
    }
  }
  return kit;
}

/** Problems with a tree's data (a list of sentences): unknown abilities or keys, bad ranks, needs or rows. */
export function validateTree(tree, abilities) {
  const out = [], ids = new Set(tree.talents.map(t => t.id));
  if (ids.size !== tree.talents.length) out.push('Two talents share an id.');
  for (const t of tree.talents) {
    if (!t.name || !t.text) out.push(`${t.id}: needs a name and text.`);
    if (!Number.isInteger(t.max) || t.max < 1 || t.max > 3) out.push(`${t.id}: max must be 1-3.`);
    if (!Number.isInteger(t.cost) || t.cost < 1) out.push(`${t.id}: cost must be at least 1.`);
    if (!Number.isInteger(t.row) || t.row < 1) out.push(`${t.id}: row must be 1 or more.`);
    for (const n of t.needs) {
      const need = tree.talents.find(x => x.id === n);
      if (!need) out.push(`${t.id}: needs an unknown talent ${n}.`);
      else if (need.row >= t.row) out.push(`${t.id}: needs ${n}, which is not on an earlier row.`);
    }
    for (const m of t.mods) {
      if (!abilities[m.ability]) out.push(`${t.id}: unknown ability ${m.ability}.`);
      else if (!('set' in m) && typeof abilities[m.ability][m.key] !== 'number') out.push(`${t.id}: ${m.ability}.${m.key} is not a number to change.`);
      if (['add', 'mul', 'set'].filter(k => k in m).length !== 1) out.push(`${t.id}: each mod needs exactly one of add, mul or set.`);
    }
  }
  return out;
}
