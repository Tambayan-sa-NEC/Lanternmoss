/* DUSKHOLLOW'S ENDLESS DUSK AND BELT LANTERN (TODO 30a, config/lantern.js).
   Pure rules only, like every mechanic: the day clock still turns here, as brighter and dimmer dusk. duskAt() reads
   the calendar, the authored canopy gaps (planets/duskhollow.js) let starlight through, and the product of the two is
   the darkness this mechanic asks for. Its presentation -- the shared local light, the lantern on the hero's belt and
   the glowmoss trail -- lives in lanternView.js, which the World owns, exactly as the World owns the tide's water.
   Oil is the single saved field. It burns while you actually play this world outdoors, never indoors, in a cave, in a
   menu, or over skipped and away time, so sleeping through a night can never empty the tank. An empty lantern only
   shrinks to a small safe ember: nothing here damages the hero.
   activeLantern() is the live instance, for the view, the HUD and later encounters. */
import { LANTERN } from '../../config/lantern.js';
import { DAY } from '../../config/day.js';
import { clamp, smoothstep } from '../../utils/math.js';
import { arcDist, offsetDir } from '../../utils/sphere.js';

/** The authored canopy: its gaps of starlight resolved around the village, which sits in one of its own. */
export function canopyLayout(config, spawn) {
  const c = { ...LANTERN.canopy, ...config };
  return { ...c, villageDir: spawn.clone(),
    gaps: (c.gaps ?? []).map(g => ({ ...g, dir: offsetDir(spawn, g.angle, g.distance) })) };
}
/** How much of the dusk reaches direction d: 1 under the closed canopy, less in a gap, least in the village. */
export function canopyCover(d, layout) {
  let cover = layout.cover;
  const open = (dir, radius, floor) => {
    const k = smoothstep(radius, radius + layout.fade, arcDist(d, dir));
    cover = Math.min(cover, floor + (layout.cover - floor) * k);
  };
  if (layout.village > 0) open(layout.villageDir, layout.village, layout.villageCover);
  for (const gap of layout.gaps) open(gap.dir, gap.radius, gap.gapCover ?? layout.gapCover);
  return clamp(cover, 0, 1);
}
/** The dusk above the canopy at a moment of the adventure calendar: brightest at midday, deepest at midnight. */
export function duskAt(seconds, config = LANTERN.dusk) {
  const frac = ((seconds / DAY.length) % 1 + 1) % 1;
  const night = (1 - Math.cos((frac - 0.5) * Math.PI * 2)) / 2;      // 0 at midday, 1 at midnight
  return { frac, night, level: config.day + (config.night - config.day) * night,
    label: night >= 0.6 ? 'Deep dusk' : night <= 0.25 ? 'Pale dusk' : 'Dusk' };
}

const number = (v, max) => typeof v === 'number' && Number.isFinite(v) ? clamp(v, 0, max) : null;
let live = null;
export const activeLantern = () => live;

export const lantern = {
  clean(value) { return { oil: number(value?.oil, LANTERN.oil.max) ?? LANTERN.oil.start }; },

  create(env) {
    let state = lantern.clean(null), time = 0;
    const layout = canopyLayout(env.planet.canopy, env.world.spawnDir);
    const O = LANTERN.oil, L = LANTERN.light;

    const place = () => env.player?.up ?? env.world.spawnDir;        // where the hero stands, for darkness and the HUD
    /** The light the lantern gives right now: full while there is oil, a small safe ember when it is empty. */
    const beam = () => {
      const lit = state.oil > 0, gutter = lit ? 1 - L.flicker * (0.5 - 0.5 * Math.cos(time * 7.3)) : 1;
      return { lit, radius: (lit ? L.radius : L.emberRadius) * gutter, intensity: (lit ? L.intensity : L.emberIntensity) * gutter };
    };

    const instance = {
      get layout() { return layout; },
      /** Everything the view, the HUD and the chip need; darkness is 0 indoors, where the light is already safe. */
      get status() {
        const b = beam(), dusk = duskAt(env.clock()), cover = canopyCover(place(), layout);
        return { oil: state.oil, max: O.max, lit: b.lit, radius: b.radius, intensity: b.intensity, cover,
          darkness: env.indoors ? 0 : clamp(cover * dusk.level, 0, 1),
          label: cover <= layout.villageCover + 1e-6 ? 'Village light' : cover < layout.cover ? 'Starlight gap' : dusk.label,
          low: state.oil / O.max < L.lowOil, indoors: !!env.indoors };
      },
      /** Pours oil in (glowcaps, firefly jars and lumen oil arrive in 30b/30c); returns what the tank took. */
      refill(amount = O.refillStep) {
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        const before = state.oil; state.oil = clamp(before + amount, 0, O.max);
        return state.oil - before;
      },
      /** Burns oil directly (a snuffer's theft in 30f, or a scripted scene); never takes the hero below empty. */
      burn(amount) {
        if (!Number.isFinite(amount) || amount <= 0) return 0;
        const before = state.oil; state.oil = clamp(before - amount, 0, O.max);
        return before - state.oil;
      },

      load(value) { state = lantern.clean(value); },
      toJSON() { return { oil: state.oil }; },
      /** Skipped and away time move the dusk on, but never burn oil: sleeping can't leave you in the dark. */
      advance() {},
      enter() { live = instance; },
      update(dt) {
        time += dt;
        if (!env.indoors && state.oil > 0) state.oil = clamp(state.oil - O.burn * dt, 0, O.max);
      },
      exit() { if (live === instance) live = null; },
    };
    return instance;
  },
};
