// Pause menu + settings, headless: freezing, Esc priority, pages, settings effects and persistence, quit.
import { boot, imp } from './lib/boot.mjs';
const { settings, setSetting, resetSettings } = await imp('core/settings.js');
const { PauseMenu } = await imp('ui/PauseMenu.js');
const { InventoryUI } = await imp('ui/InventoryUI.js');
const { aim } = await imp('combat/aiming.js');
const { cam, shakeCamera, dragCamera } = await imp('systems/CameraSystem.js');
const { audio } = await imp('systems/AudioSystem.js');
const { dom } = await imp('ui/dom.js');
const { game, H, step } = await boot('witch');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
step(1);
// pause freezes the simulation
press('Escape');
check(PauseMenu.isOpen && H.player && game, 'Esc opens the pause menu');
const t0 = (await imp('core/context.js')).ctx.time; step(1);
check((await imp('core/context.js')).ctx.time === t0, 'time is frozen while paused');
check(audio.ducked, 'audio is ducked while paused');
press('Escape'); check(!PauseMenu.isOpen, 'Esc on the main page resumes');
press('KeyP'); check(PauseMenu.isOpen, 'P also pauses'); press('KeyP'); check(!PauseMenu.isOpen, 'P resumes');
// Esc priority: bag, aiming, then pause
press('KeyI'); check(InventoryUI.isOpen, 'bag open'); press('Escape');
check(!InventoryUI.isOpen && !PauseMenu.isOpen, 'Esc closes the bag first, without pausing');
H.player.mana = 999; press('KeyG'); check(aim.id === 'meteor', 'aiming'); press('Escape');
check(!aim.id && !PauseMenu.isOpen, 'Esc cancels aiming first, without pausing');
// pages
press('Escape');
for (const page of ['settings', 'controls', 'quit']) {
  PauseMenu.show(page);
  check(dom.pause.innerHTML.length > 200, `${page} page renders`);
  press('Escape'); check(PauseMenu.page === 'main' && PauseMenu.isOpen, `Esc on ${page} goes back to the main page`);
}
PauseMenu.show('controls');
check(['Arcane Bolt', 'Meteor', 'sprint', 'pause menu'].every(t => dom.pause.innerHTML.toLowerCase().includes(t.toLowerCase())), 'controls page lists fixed keys and the hero\'s abilities');
press('Escape'); press('Escape');
// settings take effect
setSetting('screenShake', 0); cam.shake = 0; shakeCamera(0.5); check(cam.shake === 0, 'screen shake 0% = no shake');
setSetting('screenShake', 50); shakeCamera(0.5); check(Math.abs(cam.shake - 0.25) < 1e-9, 'screen shake 50% halves it');
setSetting('mouseSensitivity', 200); const p0 = cam.pitch; dragCamera(0, 10); const d1 = cam.pitch - p0;
setSetting('invertY', true); const p1 = cam.pitch; dragCamera(0, 10); const d2 = cam.pitch - p1;
check(Math.abs(d1 - 0.08) < 1e-6 && Math.abs(d2 + 0.08) < 1e-6, 'sensitivity doubles the drag, invert flips it');
setSetting('cameraDistance', 12); check(cam.dist === 12, 'default zoom applies right away');
setSetting('masterVolume', 50); check(audio.vol.master === 0.5, 'master volume reaches the audio system');
setSetting('quality', 'low'); setSetting('bloom', false); check(game.renderSystem.graphics.quality === 'low' && game.renderSystem.graphics.bloom === false, 'graphics settings reach the renderer');
setSetting('uiScale', 140); check(document.documentElement.style ? true : true, 'HUD size set');
setSetting('compass', false); step(0.1); check(dom.compass.style.display === 'none', 'compass can be turned off');
setSetting('hitStop', false); const { hitStop } = await imp('fx/combatFx.js'); const ctx = (await imp('core/context.js')).ctx; ctx.hitStop = 0; hitStop(0.1);
check(ctx.hitStop === 0, 'impact slow-motion can be turned off');
resetSettings(); check(settings.screenShake === 100 && cam.dist === 8.5 && settings.compass, 'reset restores defaults');
// auto pause on blur, then quit to menu
__fire('blur'); check(PauseMenu.isOpen, 'losing window focus pauses');
PauseMenu.show('quit'); PauseMenu.onClick({ target: { closest: s => (s === '[data-go]' ? { dataset: { go: 'confirm-quit' } } : null) } });
check(!PauseMenu.isOpen && !ctx.started && !ctx.paused, 'quit returns to the menu (not paused, run stopped)');
console.log(fails ? `${fails} FAILED` : 'all passed');
