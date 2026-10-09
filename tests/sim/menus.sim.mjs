// Title screen -> character select -> game -> pause -> quit back to the title, driven by key events.
import './lib/setup.mjs';
const G = new URL('../../src/', import.meta.url).href;
{ // the title menu's four buttons, as in index.html
  const qs = document.querySelector, menu = qs();
  menu._all = ['play', 'settings', 'controls', 'credits'].map(act => { const b = document.createElement('button'); b.dataset.act = act; return b; });
  document.querySelector = sel => (sel === '#title .tmenu' ? menu : qs(sel));
}
const { Game } = await import(G + 'core/Game.js');
const { MainMenu } = await import(G + 'ui/MainMenu.js');
const { PauseMenu } = await import(G + 'ui/PauseMenu.js');
const { CharacterSelect } = await import(G + 'ui/CharacterSelect.js');
const { ctx } = await import(G + 'core/context.js');
const { cam } = await import(G + 'systems/CameraSystem.js');
const game = new Game(); game.init();
const step = s => { for (let i = 0; i < s * 60; i++) { game.update(1 / 60); game.renderSystem.render(); } };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
step(3);
check(MainMenu.screen === 'title' && !ctx.started, 'starts on the title screen');
check(Math.abs(cam.dist - 13) < 1.5, `wide showcase orbit on the title (dist ${cam.dist.toFixed(1)})`);
press('ArrowDown'); check(MainMenu.focus === 1, 'arrow keys move the menu focus');
press('Enter'); check(PauseMenu.isOpen && PauseMenu.panel && PauseMenu.page === 'settings', 'Settings opens as a panel over the title');
check(!ctx.paused, 'no pausing involved on the title');
press('Escape'); check(!PauseMenu.isOpen && MainMenu.screen === 'title', 'Esc closes the panel, back on the title');
for (const [i, page] of [[2, 'controls'], [3, 'credits']]) { MainMenu.setFocus(i); press('Enter'); check(PauseMenu.page === page && PauseMenu.panel, `${page} panel opens`); press('Escape'); }
MainMenu.setFocus(0); press('Enter');
check(MainMenu.screen === 'select' && CharacterSelect.visible, 'Play goes to character select');
step(3); { const { camera } = await import(G + 'render/scene.js'); const d = camera.position.distanceTo(ctx.player.pos); check(d < 6, `camera moves in close for selection (${d.toFixed(1)} m)`); }
press('Escape'); check(MainMenu.screen === 'title', 'Esc on character select goes back to the title');
press('Enter'); press('ArrowRight'); press('Enter'); press('Enter');
check(ctx.started && MainMenu.screen === null, `Enter picks a hero and starts (${ctx.player.charId})`);
step(2); ctx.player.level = 3;
press('Escape'); check(PauseMenu.isOpen && !PauseMenu.panel && ctx.paused, 'in play, Esc pauses');
PauseMenu.show('quit'); PauseMenu.onClick({ target: { closest: s => (s === '[data-go]' ? { dataset: { go: 'confirm-quit' } } : null) } });
check(MainMenu.screen === 'title' && !ctx.started && !ctx.paused, 'Quit to menu lands on the title screen');
check(ctx.player.level === 1 && ctx.planet === 0, 'and the adventure was reset');
press('Enter'); check(PauseMenu.page === 'new', 'New Adventure confirms before replacing the save');
PauseMenu.handlers.onNew(); check(MainMenu.screen === 'select', 'confirmed New Adventure opens selection');
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
