/* Every element the game talks to, looked up once (index.html is parsed before modules run). */
const $ = id => document.getElementById(id);

export const dom = {
  hintSkills: $('hint-skills'),
  hud: $('hud'), prompt: $('prompt'), toast: $('toast'),
  // combat HUD
  hpBar: document.querySelector('.bar.hp'), mpBar: document.querySelector('.bar.mp'), xpBar: document.querySelector('.bar.xp'),
  spells: $('spells'), enemyBars: $('ebars'), reticle: $('reticle'), hurt: $('hurt'),
  // dialogue
  dialog: $('dialog'), dlgName: $('dlg-name'), dlgText: $('dlg-text'), dlgNext: $('dlg-next'),
  choices: $('dlg-choices'), yes: document.querySelector('#dlg-choices .yes'), no: document.querySelector('#dlg-choices .no'),
  // challenges
  challenge: $('challenge'), challengeResult: $('cresult'),
  // character select
  start: $('start'), cards: $('cards'), go: $('go'),
};

/** Restarts a one-shot CSS animation class on an element. */
export function flashEl(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
