// The journal: bestiary (meet, defeat), counters, firsts, Legendary finds (no double count), the three boss
// challenges, rewards + the unlock event, saving to localStorage, and the screen (tabs, pausing, from the pause menu).
const store = new Map();
globalThis.localStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { boot, imp } = await import('./lib/boot.mjs');
const { ctx } = await imp('core/context.js');
const { emit, gameEvents } = await imp('core/events.js');
const { Journal } = await imp('gameplay/Journal.js');
const { JournalUI } = await imp('ui/JournalUI.js');
const { PauseMenu } = await imp('ui/PauseMenu.js');
const { damageEnemy, hurtPlayer } = await imp('combat/damage.js');
const { sanitizeJournal, statValue } = await imp('gameplay/journalRules.js');
const { JOURNAL_KEY } = await imp('config/achievements.js');
const { game, H, step } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const press = code => { __fire('keydown', { code }); __fire('keyup', { code }); };
const got = []; gameEvents.addEventListener('achievement', e => got.push(e.detail.achievement.id));
const J = () => Journal.data;
const kill = e => { for (let i = 0; i < 400 && e.alive; i++) { e.invulnerable = false; damageEnemy(e, 50); step(1 / 60); } };

Journal.clear(); step(0.5);
check(J().pets.wolf && J().pets.owl && !J().pets.fox, 'the starter pets count as found');
// ---- the bestiary
const far = H.spawnEnemy('ogre', 12); step(1.2);
check(J().seen.ogre && !J().defeated.ogre, 'meeting an ogre adds its page (not yet defeated)');
const g = H.spawnEnemy('goblin', 4); step(0.1); const coins = ctx.player.coins; kill(g); step(0.2);
check(J().defeated.goblin === 1 && J().stats.monsters === 1, 'defeating a goblin counts it');
check(got.includes('firstBlood') && J().unlocked.firstBlood && ctx.player.coins >= coins + 5, `First Steps unlocks, with its reward (${got.join(', ')})`);
far.vanish();
// ---- counters and firsts
emit('chestopened', { kind: 'common', planet: 0 }); emit('crafted', { itemId: 'glowTonic', qty: 1 }); emit('questcomplete', { id: 'x' });
check(J().stats.chests === 1 && J().stats.crafted === 1 && J().stats.quests === 1 && J().unlocked.firstChest && J().unlocked.firstCraft, 'chests, crafting and quests count; their firsts unlock');
H.Pets.unlock('fox'); check(J().pets.fox, 'a pet found is noted');
const inv = H.inventory; inv.add('emberRing', 1, { rarity: 'legendary' });
check(statValue(J(), 'legendary') === 1 && J().unlocked.firstLegendary && J().found.emberRing, 'a Legendary piece: The Real Treasure, and the item in the collection');
const slot = inv.find('emberRing'), s = inv.removeFromSlot(slot, 1); inv.add(s.itemId, 1, s.props);
check(statValue(J(), 'legendary') === 1, 'taking it out and putting it back doesn\'t count it twice');
// ---- boss challenges
async function bossFight({ hit = false, pet = false } = {}) {
  const b = ctx.boss; H.player.placeAt(b.up); H.Pets.command('passive'); step(0.1);
  b.aggro(); step(0.3);
  if (!Journal.fight) return 'no fight';
  if (hit) { ctx.player.invuln = 0; hurtPlayer(5, b.pos); }
  if (pet) damageEnemy(b, 5, { source: 'pet' });
  kill(b); step(0.5); return b.alive ? 'alive' : 'won';
}
Journal.clear(); got.length = 0;
let r = await bossFight();
check(r === 'won' && J().flags.flawless && J().flags.petless && J().flags.underdog, `a clean, petless, level-${ctx.player.level} boss win: all three challenges (${r}; ${Object.keys(J().flags).join(', ')})`);
check(['firstBoss', 'flawless', 'petless', 'underdog'].every(id => got.includes(id)), `their achievements unlock (${got.join(', ')})`);
check(J().defeated.gloomcap === 1 && J().stats.bosses === 1 && J().stats.monsters === 0, 'the boss is counted as a boss, not a monster');
game.resetRun(); H.CharacterSelect.pick('knight'); H.wakeBoss(); step(1); Journal.clear(); ctx.player.level = 1;
r = await bossFight({ hit: true, pet: true });
check(r === 'won' && !J().flags.flawless && !J().flags.petless && J().flags.underdog, 'hit once and helped by the pet: only Underdog');
game.resetRun(); H.CharacterSelect.pick('knight'); H.wakeBoss(); step(1); Journal.clear(); ctx.player.level = 6;
r = await bossFight();
check(r === 'won' && !J().flags.underdog && J().flags.flawless, 'at level 6 it is no underdog win');
ctx.player.level = 1;
// ---- saving
step(2);
const saved = JSON.parse(store.get(JOURNAL_KEY) ?? 'null');
check(saved && JSON.stringify(sanitizeJournal(saved)) === JSON.stringify(sanitizeJournal(J())), 'saved to localStorage, and loads back the same');
// ---- the screen
step(0.5); press('KeyJ');
check(JournalUI.isOpen && ctx.paused, 'J opens the journal and pauses');
for (const t of ['achievements', 'bestiary', 'collection']) { JournalUI.setTab(t); check(JournalUI.body.innerHTML.length > 200, `the ${t} tab renders`); }
JournalUI.tab = 'bestiary'; JournalUI.page = 'malgrath'; JournalUI.render(); check(JournalUI.body.innerHTML.includes('???'), 'an unmet boss is a mystery');
JournalUI.page = 'gloomcap'; JournalUI.render(); check(JournalUI.body.innerHTML.includes('Gloomcap') && JournalUI.body.innerHTML.includes('Lanternmoss'), 'a beaten boss has its page, stats and home');
press('KeyJ'); check(!JournalUI.isOpen && !ctx.paused, 'J closes it and play resumes');
PauseMenu.open(); JournalUI.open(); press('Escape');
check(!JournalUI.isOpen && PauseMenu.isOpen && ctx.paused, 'opened from the pause menu, closing it goes back there');
PauseMenu.close();
console.log(fails ? `${fails} FAILED` : 'all passed');
process.exitCode = fails ? 1 : 0;
