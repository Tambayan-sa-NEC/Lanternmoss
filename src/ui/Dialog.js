/* Anime dialogue box: the speaker's portrait (expression per line), typewriter text with story placeholders
   ({hero} {planet}...), an optional yes/no choice; closes when the hero walks away. A sleeping villager wakes up
   with a yawn first. */
import { ctx } from '../core/context.js';
import { fillStory } from '../gameplay/storyState.js';
import { audio } from '../systems/AudioSystem.js';
import { dom } from './dom.js';
import { guessExpression, portrait } from './portraits.js';

export const Dialog = {
  open: false, npc: null, text: '', shown: 0, acc: 0, choice: null,
  /** Optional hook (npc) => line | null, consulted before the NPC's own chatter (challenges use it). */
  lineProvider: null,
  init() {
    dom.yes.addEventListener('click', () => this.choose(true));
    dom.no.addEventListener('click', () => this.choose(false));
  },
  start(npc) {
    const sleepy = npc.asleep; npc.wake();
    let line = this.lineProvider?.(npc) || npc.nextLine(); this.npc = npc; npc.talking = true; npc.gesture = 1; this.open = true;
    if (sleepy) line = { ...line, t: `*yawn*... Oh! ${line.t}`, e: line.e ?? 'sleepy' };
    dom.dlgName.innerHTML = `${npc.name}<small>${npc.def.title}</small>`; dom.dlgName.style.background = npc.def.color;
    this.say(line);
  },
  /** Show one line. A line may carry a choice { yes, no, onYes, onNo }; the handler may return a follow-up line. */
  say(line) {
    this.text = fillStory(line.t); this.shown = 0; this.acc = 0; this.choice = line.choice || null;
    const kind = this.npc?.def.portrait;
    dom.dlgFace.style.display = kind ? 'block' : 'none';
    if (kind) { dom.dlgFace.innerHTML = portrait(kind, line.e ?? guessExpression(this.text), this.npc.def.color); dom.dialog.classList.add('face'); }
    else dom.dialog.classList.remove('face');
    dom.dlgText.textContent = ''; dom.dlgNext.style.display = 'none'; dom.choices.classList.remove('show');
    if (this.choice) { dom.yes.innerHTML = `<kbd>E</kbd> ${this.choice.yes}`; dom.no.innerHTML = `<kbd>X</kbd> ${this.choice.no}`; }
    dom.dialog.classList.remove('show'); void dom.dialog.offsetWidth; dom.dialog.classList.add('show');
    if (line.a) line.a(this.npc);
  },
  finishTyping() {
    this.shown = this.text.length; dom.dlgText.textContent = this.text;
    if (this.choice) dom.choices.classList.add('show'); else dom.dlgNext.style.display = 'block';
  },
  advance() { if (this.shown < this.text.length) this.finishTyping(); else if (this.choice) this.choose(true); else this.close(); },
  choose(yes) {
    const c = this.choice; if (!this.open || !c) return; this.choice = null;
    const next = (yes ? c.onYes : c.onNo)?.();
    if (next && this.open) this.say(next); else this.close();
  },
  /** Closing with a choice still pending (walking away, casting, fainting) just drops it: no decision is recorded. */
  close() {
    if (this.npc) this.npc.talking = false; this.open = false; this.npc = null; this.choice = null;
    dom.choices.classList.remove('show'); dom.dialog.classList.remove('show');
  },
  update(dt) {
    if (!this.open) return;
    if (ctx.player.pos.distanceTo(this.npc.pos) > 6) { this.close(); return; }
    if (this.shown < this.text.length) {
      this.acc += dt * 45;
      while (this.acc >= 1 && this.shown < this.text.length) { this.acc -= 1; this.shown++; if (this.shown % 3 === 0) audio.blip(); }
      dom.dlgText.textContent = this.text.slice(0, this.shown); if (this.shown >= this.text.length) this.finishTyping();
    }
  },
};
