/** New enemy definitions may land before their world releases; journal goals grow only with playable content. */
export function releasedEnemyTypes(catalog, enemies) {
  const types = new Set(['slimeling']); // the original slime's child is not a roster entry
  for (const p of catalog.filter(p => p.released)) {
    for (const g of p.roster ?? []) types.add(g.type);
    for (const m of p.miniBosses ?? []) types.add(m.type);
    if (p.boss?.type) types.add(p.boss.type);
  }
  const queue = [...types];
  for (let i = 0; i < queue.length; i++) for (const move of Object.values(enemies[queue[i]]?.attacks ?? {}))
    for (const type of move.types ?? []) if (!types.has(type)) { types.add(type); queue.push(type); }
  return types;
}
