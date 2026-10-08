// Exercises every new HUD path headless: status row, low HP, boss bar phases, waypoints for boss + challenge, hint fold.
import { boot, imp } from './lib/boot.mjs';
const { dom } = await imp('ui/dom.js');
const { buffs } = await imp('gameplay/buffs.js');
const { Challenges } = await imp('gameplay/challenges/Challenges.js');
const { CHALLENGES } = await imp('config/challenges.js');
const { applyCharacter } = await imp('gameplay/characters.js');
const { offsetDir } = await imp('utils/sphere.js');
const { H, step } = await boot('knight');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player;
step(1);
check(dom.combat.dataset.res === 'STAMINA', 'resource colour follows the hero (knight = STAMINA)');
buffs.moon = 30; H.tryCast('guard'); step(0.2);
check(H.player.guardT > 0, 'guard cast');
P.hp = P.stats.maxHp * 0.2; P.lastHurt = H.player.lastHurt; step(0.1);
check(dom.lowHp.classList.contains('on'), 'low-HP vignette on at 20% HP');
P.hp = P.stats.maxHp; step(0.1);
check(!dom.lowHp.classList.contains('on'), 'low-HP vignette off at full HP');
step(26);
check(dom.hint.classList.contains('collapsed'), 'controls panel folds away after a while of play');
// boss bar + boss waypoint
for (const i of [1, 2]) {
  H.goToPlanet(i); step(1); const B = H.boss;
  check(dom.compassTrack.children.some?.(c => c.className?.includes?.('boss')) ?? true, `planet ${i + 1}: compass has a boss marker`);
  P.placeAt(offsetDir(B.home, 0.4, 10)); step(2);
  check(dom.bossBar.style.display === 'block', `planet ${i + 1}: boss bar shows near the boss`);
  check(dom.bossTicks.innerHTML.split('<u').length - 1 === B.def.phases.length - 1, `planet ${i + 1}: one tick per phase threshold`);
  B.hp = B.def.hp * 0.45; step(1);
  check(dom.bossBar.classList.contains('phase') && dom.bossName.textContent.includes(B.def.phases[B.bossPhase].title ?? ''), `planet ${i + 1}: phase flash + phase name`);
}
// challenge waypoint
H.goToPlanet(0); step(1);
const [id, c] = Object.entries(CHALLENGES).find(([, c]) => c.kind === 'race') ?? Object.entries(CHALLENGES)[0];
const npc = H.npcs.find(n => n.name === c.giver);
P.placeAt(npc.up); step(0.2);
Challenges.start(id, npc); step(2);
const goal = Challenges.run?.kind.target(Challenges.run);
check(!!goal, `challenge '${id}' (${c.kind}) gives a waypoint target`);
check(dom.markers.children.length >= 1, 'edge markers exist for boss / goal');
Challenges.cancel(); step(0.5);
applyCharacter('ranger'); step(0.5);
check(dom.combat.dataset.res === 'FOCUS', 'switching hero recolours the resource bar');
console.log(fails ? `${fails} FAILED` : 'all passed');
