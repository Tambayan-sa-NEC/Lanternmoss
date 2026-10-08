// Boots the real game headless and exposes helpers for the sims.
// wake (default true): planet bosses skip their sealed lair (BossGate) so older fight scripts can go straight at them.
import './setup.mjs';
const G = new URL('../../../src/', import.meta.url).href;
export const imp = p => import(G + p);
export async function boot(hero = 'witch', { wake = true } = {}) {
  const { Game } = await imp('core/Game.js');
  const { CharacterSelect } = await imp('ui/CharacterSelect.js');
  const game = new Game(); game.init();
  CharacterSelect.pick(hero); game.beginGame();
  const H = game.debugHandle();
  if (wake) { H.wakeBoss(); const go = H.goToPlanet; H.goToPlanet = i => { go(i); H.wakeBoss(); }; }
  const step = (secs, each) => { const n = Math.round(secs * 60); for (let i = 0; i < n; i++) { game.update(1 / 60); game.renderSystem.render(); each?.(i / 60); } };
  return { game, H, step };
}
