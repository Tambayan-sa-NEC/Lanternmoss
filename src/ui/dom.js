/* Every element the game talks to, looked up once (index.html is parsed before modules run). */
const $ = id => document.getElementById(id);

export const dom = {
  hint: $('hint'), hintKeys: $('hint-keys'), hintHide: document.querySelector('#hint .hide-tip'), hintMini: document.querySelector('#hint .mini'),
  hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  // combat HUD
  hpBar: document.querySelector('.bar.hp'), mpBar: document.querySelector('.bar.mp'), xpBar: document.querySelector('.bar.xp'),
  spells: $('spells'), hotbar: $('hotbar'), heldName: $('heldname'), center: $('center'), skills: $('skills'), enemyBars: $('ebars'), reticle: $('reticle'), hurt: $('hurt'), aimHint: $('aimhint'),
  combat: $('combat'), status: $('status'), level: document.querySelector('#combat .lvl b'), tip: $('tip'), lowHp: $('lowhp'),
  compass: $('compass'), compassTrack: document.querySelector('#compass .track'), markers: $('markers'),
  // dialogue
  dialog: $('dialog'), dlgFace: $('dlg-face'), dlgName: $('dlg-name'), dlgText: $('dlg-text'), dlgNext: $('dlg-next'),
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
  invHint: document.querySelector('#inventory .inv-hint'),
  // character select
  start: $('start'), cards: $('cards'), go: $('go'), selBack: $('selback'), heroDetail: $('hero-detail'),
  selHead: $('selhead'), selKeys: $('selkeys'), petCards: $('pet-cards'), petDetail: $('pet-detail'),
  // pet menu (during play)
  petMenu: $('petmenu'),
  // title screen
  title: $('title'), titleMenu: document.querySelector('#title .tmenu'), campaign: document.querySelector('#title .campaign'),
  // pause menu
  pause: $('pause'), shop: $('shop'),
};

/** Restarts a one-shot CSS animation class on an element. */
export function flashEl(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
