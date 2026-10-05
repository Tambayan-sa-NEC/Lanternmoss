/* World overlay: the floating "E Talk to ..." prompt and the status chips (planet, time of day, coins, the tracked
   quest, treats, challenges).
   Active buffs show in the HUD's status row (src/ui/hud.js). */
import * as THREE from 'three';
import { CHALLENGES } from '../config/challenges.js';
import { PLANETS } from '../config/planets.js';
import { ctx } from '../core/context.js';
import { dayClock } from '../gameplay/dayClock.js';
import { Challenges } from '../gameplay/challenges/Challenges.js';
import { currentInteraction } from '../gameplay/Houses.js';
import { Quests } from '../gameplay/quests/Quests.js';
import { itemRegistry } from '../items/ItemRegistry.js';
import { camera } from '../render/scene.js';
import { dom } from './dom.js';

const _tv = new THREE.Vector3();
const TREATS = itemRegistry.all().filter(d => d.tags.includes('treat')).map(d => d.id);
let chipsT = 0;

/** The "E ..." bubble over whatever E would use: a villager, a door, furniture (src/gameplay/Houses.js currentInteraction). */
function updatePrompt() {
  const t = currentInteraction();
  if (!t) { dom.prompt.style.display = 'none'; return; }
  _tv.copy(t.at).project(camera);
  if (_tv.z < 1) {
    dom.prompt.style.display = 'block'; dom.prompt.innerHTML = `<kbd>E</kbd> ${t.label}`;
    dom.prompt.style.left = ((_tv.x * 0.5 + 0.5) * innerWidth) + 'px'; dom.prompt.style.top = ((-_tv.y * 0.5 + 0.5) * innerHeight) + 'px';
  } else dom.prompt.style.display = 'none';
}

/** Chips are rebuilt 4x a second (innerHTML churn every frame isn't needed for countdowns in whole seconds). */
function updateChips(dt) {
  if ((chipsT -= dt) >= 0) return;
  chipsT = 0.25; let h = `<div class="chip" style="background:#e8eeff">Planet ${ctx.planet + 1}/${PLANETS.length} · ${PLANETS[ctx.planet].name}</div>`;
  h += `<div class="chip time ${dayClock.phase}">${dayClock.phase === 'night' ? '☾' : '☀'} ${dayClock.label} · Day ${dayClock.day}</div>`;
  h += `<div class="chip coins">✦ ${ctx.player.coins} coins</div>`;
  const q = Quests.trackerInfo();
  if (q) h += `<div class="chip quest"><b>Quest · ${q.title}</b><span>${q.text}${q.progress ? ` <i>${q.progress}</i>` : ''}</span></div>`;
  const treats = TREATS.reduce((n, id) => n + ctx.player.inventory.count(id), 0);
  if (treats) h += `<div class="chip">Treats: ${treats}</div>`;
  const cleared = Challenges.clearedCount();
  if (cleared) h += `<div class="chip" style="background:#fff0c8">Challenges: ${cleared} / ${Object.keys(CHALLENGES).length}</div>`;
  dom.hud.innerHTML = h;
}

export function updateOverlay(dt) { updatePrompt(); updateChips(dt); }
