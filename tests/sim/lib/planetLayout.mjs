// Persisted ids refer to these generated positions: compare against the pre-extraction v1 campaign.
import { createHash } from 'node:crypto';

export function planetLayout(game, H, ctx) {
  const dir = v => v.toArray().map(n => +n.toFixed(8));
  const data = {
    trees: game.world.spots.trees.map(s => [s.kind, s.s, s.r, dir(s.dir)]),
    rocks: game.world.spots.rocks.map(s => [s.s, s.r, dir(s.dir)]),
    nodes: H.Gathering.nodes.map(n => [n.id, n.kind, dir(n.up)]),
    chests: H.Chests.list.map(c => [c.id, c.kind, dir(c.up)]),
    boss: dir(H.boss.home), minis: ctx.enemies.filter(e => e.portalId).map(e => [e.portalId, dir(e.home)]),
    farm: H.Farm.plots.map(p => dir(p.dir)), houses: game.world.houses.map(h => dir(h.door)),
    portal: dir(H.Portals.gate.dir),
  };
  return { digest: createHash('sha256').update(JSON.stringify(data)).digest('hex'),
    nodes: data.nodes.length, chests: data.chests.length, trees: data.trees.length };
}
