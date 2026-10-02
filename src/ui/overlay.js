/* World overlay: the floating "E Talk to ..." prompt and the status chips (treats, challenges, active buffs). */
import * as THREE from 'three';
import { CHALLENGES } from '../config/challenges.js';
import { ctx } from '../core/context.js';
import { nearestNPC } from '../entities/npc/NPC.js';
import { Challenges } from '../gameplay/challenges/Challenges.js';
import { buffs } from '../gameplay/buffs.js';
import { camera } from '../render/scene.js';
import { Dialog } from './Dialog.js';
import { dom } from './dom.js';

const _tv = new THREE.Vector3();
let chipsT = 0;

function updatePrompt() {
  const n = !Dialog.open && ctx.started ? nearestNPC(ctx.player, ctx.npcs) : null;
  if (!n) { dom.prompt.style.display = 'none'; return; }
  _tv.copy(n.pos).addScaledVector(n.up, n.height + n.hover + 0.35).project(camera);
  if (_tv.z < 1) {
    dom.prompt.style.display = 'block'; dom.prompt.innerHTML = `<kbd>E</kbd> Talk to ${n.name}${Challenges.tagFor(n)}`;
    dom.prompt.style.left = ((_tv.x * 0.5 + 0.5) * innerWidth) + 'px'; dom.prompt.style.top = ((-_tv.y * 0.5 + 0.5) * innerHeight) + 'px';
  } else dom.prompt.style.display = 'none';
}

/** Chips are rebuilt 4x a second (innerHTML churn every frame isn't needed for countdowns in whole seconds). */
function updateChips(dt) {
  if ((chipsT -= dt) >= 0) return;
  chipsT = 0.25; let h = '';
  if (buffs.buns) h += `<div class="chip">Treats: ${buffs.buns}</div>`;
  const cleared = Challenges.clearedCount();
  if (cleared) h += `<div class="chip" style="background:#fff0c8">Challenges: ${cleared} / ${Object.keys(CHALLENGES).length}</div>`;
  if (buffs.moon > 0) h += `<div class="chip" style="background:#e6ddff">Moon-Hop ${Math.ceil(buffs.moon)}s</div>`;
  if (buffs.feather > 0) h += `<div class="chip" style="background:#d6ffec">Feather-Step ${Math.ceil(buffs.feather)}s</div>`;
  dom.hud.innerHTML = h;
}

export function updateOverlay(dt) { updatePrompt(); updateChips(dt); }
