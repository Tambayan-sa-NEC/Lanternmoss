/* Every element the game talks to, looked up once (index.html is parsed before modules run). */
const $ = id => document.getElementById(id);

export const dom = {
  hint: $('hint'), hintSkills: $('hint-skills'),
  hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  // combat HUD
  hpBar: document.querySelector('.bar.hp'), mpBar: document.querySelector('.bar.mp'), xpBar: document.querySelector('.bar.xp'),
  spells: $('spells'), enemyBars: $('ebars'), reticle: $('reticle'), hurt: $('hurt'), aimHint: $('aimhint'),
  combat: $('combat'), status: $('status'), level: document.querySelector('#combat .lvl b'), tip: $('tip'), lowHp: $('lowhp'),
  compass: $('compass'), compassTrack: document.querySelector('#compass .track'), markers: $('markers'),
  // dialogue
  dialog: $('dialog'), dlgName: $('dlg-name'), dlgText: $('dlg-text'), dlgNext: $('dlg-next'),
  choices: $('dlg-choices'), yes: document.querySelector('#dlg-choices .yes'), no: document.querySelector('#dlg-choices .no'),
  // challenges, banner, boss, planet travel
  challenge: $('challenge'), challengeResult: $('cresult'),
  bossBar: $('bossbar'), bossName: document.querySelector('#bossbar .bn'), bossFill: document.querySelector('#bossbar .bb i'),
  bossLag: document.querySelector('#bossbar .bb b'), bossTicks: document.querySelector('#bossbar .ticks'), bossPct: document.querySelector('#bossbar .pct'),
  fade: $('fade'),
  // inventory
  inventory: $('inventory'), invGrid: document.querySelector('#inventory .inv-grid'), invDetail: document.querySelector('#inventory .inv-detail'),
  invCount: document.querySelector('#inventory .inv-count'), invUse: document.querySelector('#inventory .inv-use'),
  invDrop: document.querySelector('#inventory .inv-drop'), invClose: document.querySelector('#inventory .inv-close'), invMsg: document.querySelector('#inventory .inv-msg'),
  // character select
  start: $('start'), cards: $('cards'), go: $('go'),
};

/** Restarts a one-shot CSS animation class on an element. */
export function flashEl(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
