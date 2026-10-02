/* The four villagers: looks, where they live (relative to world landmarks), and what they say.
   Each line is { t: text, a?: action(npc) }; actions are small flourishes (emotes, sparkles, buffs, gifts).
   gesture: 'wave' = right arm waves while talking, 'raise' = left arm raised, none = arms keep their pose. */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { burstAt, sparkles } from '../../fx/sparkles.js';
import { buff } from '../../gameplay/buffs.js';
import { giftItem } from '../../gameplay/pickups.js';
import { buildBaker, buildBard, buildSprite, buildWizard } from '../../models/villagers.js';
import { audio } from '../../systems/AudioSystem.js';
import { cam } from '../../systems/CameraSystem.js';
import { mpick, mr } from '../../utils/random.js';
import { dirAlong, offsetDir, tangentToward } from '../../utils/sphere.js';
import { FLOWER_COLORS } from '../../world/scatter.js';

const V3 = THREE.Vector3;
const _tv = new V3();

function starShower() {
  for (let i = 0; i < 6; i++) setTimeout(() => {
    const p = ctx.player.pos.clone().addScaledVector(ctx.player.up, 3.5).add(new V3(mr(-1, 1), mr(-1, 1), mr(-1, 1)).multiplyScalar(1.2));
    sparkles.emit(p, { count: 10, color: mpick([0xfff0a0, 0xbff4ff, 0xffd6f5]), speed: 1.2, up: ctx.player.up, upBias: -1.6, life: 1.4, size: 0.4 }); audio.tone(1200 + i * 150, 0.4, 'sine', 0.03);
  }, i * 120);
}

export function createNpcDefs({ spawnDir, stoneCenter, cottage, pond1 }) {
  return [
    { name: 'Old Bramble', title: 'Wizard', color: '#8a6ae0', build: buildWizard, height: 2.75, radius: 0.6,
      gesture: 'raise',
      dir: dirAlong(stoneCenter, tangentToward(stoneCenter, spawnDir), 3.3),
      anim: (n) => { n.orb.scale.setScalar(1 + Math.sin(ctx.time * 3) * 0.12); if (Math.random() < 0.05) { n.orb.getWorldPosition(_tv); sparkles.emit(_tv, { count: 1, color: 0x9ff3ff, speed: 0.5, life: 0.8, size: 0.25 }); } },
      lines: [
        { t: 'Ah, a traveler! Mind the moss. It hums on full moons, and it is terribly off-key.' },
        { t: 'Watch closely now... Fizzle... POP! Hm. That was supposed to be a dove.', a: n => { n.orb.getWorldPosition(_tv); burstAt(_tv.clone(), n.up, 0x9ff3ff, 50); emote(n, 'star', '#8ff0ff'); } },
        { t: 'I once turned my teapot into a toad. It still brews an excellent chamomile, oddly.' },
        { t: 'These standing stones remember every footstep. Yours are... enthusiastic.' },
        { t: 'Hold still. There: a Moon-Hop charm. Your jumps will feel lighter for a while.', a: () => buff('moon', 20, 'Moon-Hop! Jumps are floatier for 20s') },
        { t: "Walk far enough in any direction and you'll end up right back here. Planets are funny like that." },
        { t: 'The fireflies? Retired stars. They prefer the quiet life down here.' },
        { t: 'Hmm? No, the hat is not negotiable. The hat is load-bearing.' },
        { t: "Let's ask the sky what it thinks of you... Ooh, glittery. A good omen!", a: () => starShower() },
      ] },
    { name: 'Pim', title: 'Baker', color: '#f2915f', build: buildBaker, height: 2.25, radius: 0.62, gesture: 'wave',
      dir: dirAlong(cottage.door, new V3().crossVectors(cottage.fwd, cottage.door).normalize(), 1.9),
      lines: [
        { t: "Fresh from the oven! Here, take a honey-moss bun. Careful, it's still warm.", a: n => giftItem(n, 'honeyBun') },
        { t: 'The secret ingredient is a pinch of starlight. And butter. Mostly butter.' },
        { t: 'Dough needs patience. So do cats who keep stealing the dough.' },
        { t: "If you smell cinnamon on the breeze, that's me. Or the fox. Honestly, hard to say." },
        { t: 'I leave the window open so the birds can smell breakfast. They leave reviews. Chirpy ones.' },
        { t: "*humming* La la la... oh! I didn't see you there! Hello, hello!", a: n => { emote(n, '!', '#ff8a3d'); n.vy = 4; n.grounded = false; } },
        { t: "A warm loaf for a warm heart. That's my motto this week. Last week it was 'no crumbs in bed'." },
        { t: 'Try a moonberry tart! The crows gave it four stars.', a: n => giftItem(n, 'moonberryTart') },
      ] },
    { name: 'Lio', title: 'Wandering Bard', color: '#5fae55', build: buildBard, height: 2.15, radius: 0.55, wander: 14,
      dir: offsetDir(spawnDir, 1.3, 5),
      lines: [
        { t: '♪ Round and round the little world, the lanterns glow, the clouds unfurl~ ♪', a: n => { audio.melody(); for (let i = 0; i < 4; i++) setTimeout(() => emote(n, '♪', '#7a6cff'), i * 450); } },
        { t: 'Every path on this planet leads back to a song. And also back to here, geographically.' },
        { t: "Care for a tune? This one's called 'Ode to a Sleepy Cat'.", a: n => { audio.melody(true); emote(n, '♪', '#7a6cff'); setTimeout(() => emote(n, 'z', '#7a6cff'), 1500); } },
        { t: "I've walked around the world eleven times. My boots insist it's twelve." },
        { t: 'The fish in the pond are my toughest critics. Not once have they clapped.' },
        { t: "A rhyme for 'planet'... granite? No. Pomegranate! ...I'll workshop it." },
        { t: 'Hey, dance with me! One, two... spin! ♪', a: n => { n.spin = 1.2; audio.melody(); emote(ctx.player, '♪', '#ff6b9a');
          sparkles.emit(ctx.player.pos.clone().addScaledVector(ctx.player.up, 1), { count: 30, color: 0xffd6f5, speed: 2.5, up: ctx.player.up, life: 1, size: 0.3 }); } },
        { t: 'A bard without an audience is just someone humming at a tree. Thanks for listening!', a: n => emote(n, 'heart') },
      ] },
    { name: 'Fern', title: 'Forest Sprite', color: '#4fc4a0', build: buildSprite, height: 1.25, radius: 0.45, hover: 1.1, gesture: 'wave',
      dir: dirAlong(pond1.dir, tangentToward(pond1.dir, spawnDir), pond1.r + 2.3),
      anim: (n) => { const f = Math.sin(ctx.time * 26) * 0.5; n.wingL.rotation.y = f; n.wingR.rotation.y = -f;
        if (Math.random() < 0.08) sparkles.emit(n.root.position.clone().addScaledVector(n.up, 0.5), { count: 1, color: mpick([0xcffaff, 0xffd6f5, 0xfff0a0]), speed: 0.4, life: 1, size: 0.22 }); },
      lines: [
        { t: "Tee-hee! You're so big up close! Do you get dizzy all the way up there?" },
        { t: 'I painted all the glowing flowers myself. One petal at a time!' },
        { t: "Here: Feather-Step! You'll run like the wind for a little while~", a: () => buff('feather', 20, 'Feather-Step! Faster running for 20s') },
        { t: 'Shhh... the mushrooms are napping.', a: n => emote(n, 'z', '#7a6cff') },
        { t: 'Catch me if you can! ...Just kidding, I can fly!', a: n => { n.loop = 2.2; audio.sparkle(); } },
        { t: "The moss told me a secret about you. I can't say what! But it was nice." },
        { t: "Did you know the fox's tail is made of leftover sunset?" },
        { t: 'Bloom, bloom, bloom~! Hee, now you are sparkly too.', a: () => { for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28;
          const p = ctx.player.pos.clone().addScaledVector(cam.fwd, Math.cos(a) * 1.4).addScaledVector(new V3().crossVectors(cam.fwd, ctx.player.up), Math.sin(a) * 1.4).addScaledVector(ctx.player.up, 0.3);
          sparkles.emit(p, { count: 3, color: mpick(FLOWER_COLORS), speed: 1, up: ctx.player.up, upBias: 1.4, life: 1.3, size: 0.32 }); } audio.sparkle(); } },
      ] },
  ];
}
