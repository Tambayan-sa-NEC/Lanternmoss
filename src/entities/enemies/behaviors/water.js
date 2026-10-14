/* Shared water rules for the sea monsters (drifter, amphibian). They read the same live sea / lagoon / pond queries as
   every Walker, so the tide, a drained lagoon or a time skip changes their world the moment it happens.
     fence:    a water monster that was in water last frame can't step out of it (it's put back where it was wet);
               if its last wet spot has dried up, the water left it instead: it's stranded.
     stranded: on dry or too-shallow ground by accident; it crawls to the nearest deep-enough water (steerToWater)
               and recovers as soon as there's enough water under it again (the tide coming back counts). */
import { WORLD } from '../../../config/game.js';
import { emote } from '../../../fx/emotes.js';
import { damp } from '../../../utils/math.js';
import { offsetDir, projectTangent, tangentToward, turnToward } from '../../../utils/sphere.js';
import { groundHeight, waterAt } from '../../../world/terrain.js';

export const depthAt = up => waterAt(up)?.depth ?? 0;

/** The closest point (rings of 1.5 m out to maxR) with at least minDepth of water, or null. */
export function nearestWater(up, minDepth, maxR = 18) {
  if (depthAt(up) >= minDepth) return up.clone();
  for (let r = 1.5; r <= maxR; r += 1.5) for (let a = 0; a < 6.28; a += 0.35) {
    const d = offsetDir(up, a, r); if (depthAt(d) >= minDepth) return d;
  }
  return null;
}

/** Ground speed to ask for so the monster really moves at `speed` (Walkers wade / swim slower in water). */
export function waterSpeed(e, speed) {
  const W = WORLD.water; return speed / (e.waterDepth > 0.15 ? (e.swimming ? W.swim : W.wade) : 1);
}

export function resetWater(e) { e.stranded = false; e.wasWet = true; e.lastWet = (e.lastWet ?? e.home.clone()).copy(e.up); e.toWater = null; }

/** After a move: keeps e in water of at least minDepth unless `free` (it chose to leave it), else marks it stranded.
    Returns true when e is in such water now. */
export function waterFence(e, minDepth, free = false) {
  let wet = depthAt(e.up) >= minDepth;
  if (!wet && !free && !e.stranded && e.wasWet) {
    if (depthAt(e.lastWet) >= minDepth) {                     // it swam into the shallows: back to where it was
      e.up.copy(e.lastWet); e.r = groundHeight(e.up); e.pos.copy(e.up).multiplyScalar(e.r); projectTangent(e.fwd, e.up).normalize();
      if (e.state === 'wander') e.fwd.negate();
      wet = true;
    }
  }
  if (wet) { if (e.stranded) { e.stranded = false; e.toWater = null; emote(e, '♪', '#9fe8ff'); } e.lastWet.copy(e.up); }
  else if (!free && !e.stranded) { e.stranded = true; e.toWater = nearestWater(e.up, minDepth + 0.25) ?? e.home.clone(); e.hideTele(); emote(e, '!', '#ffd24a'); }
  e.wasWet = wet;
  return wet;
}

/** Movement for a stranded monster (or one heading back to the sea): toward e.toWater at `speed`. */
export function steerToWater(e, dt, speed) {
  if (!e.toWater) return 0;
  const to = tangentToward(e.up, e.toWater); turnToward(e.fwd, to, e.up, damp(6, dt)); e.move.copy(to);
  return waterSpeed(e, speed);
}
