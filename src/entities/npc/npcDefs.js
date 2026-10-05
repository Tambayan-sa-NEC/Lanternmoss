/* The villagers: four who travel with you from planet to planet (createNpcDefs) and one local on each later planet
   (createLocalDefs): looks, where they spend each part of the day, and what they say.
   Each line is { t: text, a?: action(npc), e?: expression, when?: s => bool, once?: true }:
     a     a small flourish (emotes, sparkles, buffs, gifts)
     e     portrait expression (src/ui/portraits.js); guessed from the text when omitted
     when  only said while true; s = storyState() (planet, hero, level, bosses, phase, night...: src/gameplay/storyState.js)
     once  said once per adventure, the first time it applies (story reactions); text may use {hero} {planet} {level} ...
   places = named spots { dir, wander (radius to stroll) }; schedule = day phase -> place (config/day.js). They sleep at
   night unless sleeps: false. gesture: 'wave' = right arm waves while talking, 'raise' = left arm raised.
   portrait = face drawn in the dialogue box; headR / hat size and limit the outfit each planet adds (models/villagers.js). */
import * as THREE from 'three';
import { ctx } from '../../core/context.js';
import { emote } from '../../fx/emotes.js';
import { burstAt, sparkles } from '../../fx/sparkles.js';
import { buff } from '../../gameplay/buffs.js';
import { giftItem } from '../../gameplay/pickups.js';
import { buildBaker, buildBard, buildSmith, buildSnowKeeper, buildSprite, buildWizard } from '../../models/villagers.js';
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

const place = (dir, wander = 0) => ({ dir, wander });

export function createNpcDefs({ spawnDir, stoneCenter, cottage, pond1, houses }) {
  const stones = dirAlong(stoneCenter, tangentToward(stoneCenter, spawnDir), 3.3), square = (a, r = 4.5) => offsetDir(spawnDir, a, r);
  return [
    { name: 'Old Bramble', title: 'Wizard', color: '#8a6ae0', build: buildWizard, height: 2.75, radius: 0.6,
      gesture: 'raise', portrait: 'wizard', headR: 0.34, hat: true,
      dir: stones,
      places: { home: place(houses[2].door), stones: place(stones, 2.5), square: place(square(3.9), 3) },
      schedule: { morning: 'stones', noon: 'square', evening: 'stones', night: 'home' },
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
        // ---- reactions to your adventure
        { once: true, when: s => s.hero === 'witch', t: 'A fellow spellcaster! Point that staff somewhere else, mine has a temper.', e: 'happy' },
        { once: true, when: s => s.hero === 'knight', t: "That axe is nearly as big as my hat. Nearly. Don't let it get ideas." },
        { once: true, when: s => s.hero === 'ranger', t: 'An elf! Then you can hear the moss humming too. Lucky you. Unlucky ears.' },
        { once: true, when: s => s.level >= 5, t: 'Level {level} already? The stones are humming your name. Off-key, but with feeling.', e: 'excited' },
        { once: true, when: s => s.planet === 1, t: "So you toppled Gloomcap AND carried an old wizard across the stars. Emberfall tastes of cinnamon and danger." },
        { once: true, when: s => s.planet === 2, t: 'Frostveil. My beard has opinions about this cold, {hero}. None of them polite.', e: 'sad' },
        { once: true, when: s => s.bosses >= 2, t: 'Two dark kings down. One more, and the lanterns of every world will sing together.', e: 'excited' },
        { when: s => s.night, t: 'Shh... the stars are reading tonight. Out loud, if you listen very carefully.', e: 'thinking' },
      ] },
    { name: 'Pim', title: 'Baker', color: '#f2915f', build: buildBaker, height: 2.25, radius: 0.62, gesture: 'wave',
      portrait: 'baker', headR: 0.36, hat: true,
      dir: dirAlong(cottage.door, new V3().crossVectors(cottage.fwd, cottage.door).normalize(), 1.9),
      places: { bakery: place(dirAlong(cottage.door, new V3().crossVectors(cottage.fwd, cottage.door).normalize(), 1.9), 1.5), square: place(square(0.5), 2) },
      schedule: { morning: 'bakery', noon: 'square', evening: 'bakery', night: 'bakery' },
      lines: [
        { t: "Fresh from the oven! Here, take a honey-moss bun. Careful, it's still warm.", a: n => giftItem(n, 'honeyBun') },
        { t: 'The secret ingredient is a pinch of starlight. And butter. Mostly butter.' },
        { t: 'Dough needs patience. So do cats who keep stealing the dough.' },
        { t: "If you smell cinnamon on the breeze, that's me. Or the fox. Honestly, hard to say." },
        { t: 'I leave the window open so the birds can smell breakfast. They leave reviews. Chirpy ones.' },
        { t: "*humming* La la la... oh! I didn't see you there! Hello, hello!", a: n => { emote(n, '!', '#ff8a3d'); n.vy = 4; n.grounded = false; } },
        { t: "A warm loaf for a warm heart. That's my motto this week. Last week it was 'no crumbs in bed'." },
        { t: 'Try a moonberry tart! The crows gave it four stars.', a: n => giftItem(n, 'moonberryTart') },
        { once: true, when: s => s.hero === 'knight', t: 'A big strong warrior like you needs two buns. At least. Doctor\'s orders. I am not a doctor.' },
        { once: true, when: s => s.level >= 3, t: "You look stronger, {hero}! It's the buns. It's always the buns.", e: 'excited' },
        { once: true, when: s => s.planet === 1, t: 'Emberfall ovens heat themselves! I could bake a pie on a pebble here.', e: 'excited' },
        { once: true, when: s => s.planet === 2, t: 'Brr! Even my dough is shivering. A warm bun for the road, {hero}?', e: 'sad' },
      ] },
    { name: 'Lio', title: 'Wandering Bard', color: '#5fae55', build: buildBard, height: 2.15, radius: 0.55,
      portrait: 'bard', headR: 0.36, hat: true,
      dir: offsetDir(spawnDir, 1.3, 5),
      places: { home: place(houses[0].door), square: place(offsetDir(spawnDir, 1.3, 5), 12),
        pond: place(dirAlong(pond1.dir, tangentToward(pond1.dir, spawnDir).applyAxisAngle(pond1.dir, 1.2), pond1.r + 2.5), 2.5),
        stones: place(dirAlong(stoneCenter, tangentToward(stoneCenter, spawnDir), 5.5), 3) },
      schedule: { morning: 'square', noon: 'pond', evening: 'stones', night: 'home' },
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
        { once: true, when: s => s.bosses >= 1, t: "I'm writing 'The Ballad of the {hero} and the Moss King'. I rhymed 'Gloomcap' with 'doom nap'. Thoughts?", e: 'excited' },
        { once: true, when: s => s.planet === 1, t: 'New planet, new chords! Everything here sounds a little bit... toasted.' },
        { once: true, when: s => s.planet === 2, t: 'My lute strings keep freezing into icicles. Very crisp notes, though.', e: 'surprised' },
        { once: true, when: s => s.bosses >= 2, t: 'A moss king AND a dragon? The ballad needs a third act... and a much bigger lute.', e: 'excited' },
        { when: s => s.phase === 'evening', t: 'Evening is my favourite. The lanterns hum the harmony for free. ♪' },
      ] },
    { name: 'Fern', title: 'Forest Sprite', color: '#4fc4a0', build: buildSprite, height: 1.25, radius: 0.45, hover: 1.1, gesture: 'wave',
      portrait: 'sprite', headR: 0.26,
      dir: dirAlong(pond1.dir, tangentToward(pond1.dir, spawnDir), pond1.r + 2.3),
      places: { pond: place(dirAlong(pond1.dir, tangentToward(pond1.dir, spawnDir), pond1.r + 2.3), 3), flowers: place(square(2.8, 7), 5) },
      schedule: { morning: 'pond', noon: 'flowers', evening: 'pond', night: 'pond' },
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
        { once: true, when: s => s.hero === 'ranger', t: 'Your hair is the colour of moonlight! Can I braid flowers into it? ...Later! Hee~', e: 'excited' },
        { once: true, when: s => s.level >= 5, t: "You're so strong now! The moss says so. The moss is never wrong~" },
        { once: true, when: s => s.planet === 1, t: "Ooh, it's warm here! My wings feel all toasty~" },
        { once: true, when: s => s.planet === 2, t: 'Snow! It looks like the flowers turned into sugar!', e: 'excited' },
        { when: s => s.night, t: 'At night the mushrooms tell glowing stories. Shh, listen~', e: 'thinking' },
      ] },
  ];
}

/** The villager who lives only on planet `planet` (none on the first planet): they stay behind when you travel on. */
export function createLocalDefs({ spawnDir, stoneCenter, houses }, planet) {
  const home = houses[3 + (planet % 3)]?.door ?? offsetDir(spawnDir, 4.8, 9);
  if (planet === 1) return [
    { name: 'Cinder', title: 'Ember Smith', color: '#e0682a', build: buildSmith, height: 2.3, radius: 0.62, gesture: 'raise',
      portrait: 'smith', headR: 0.36, hat: true, local: true,
      dir: offsetDir(spawnDir, 3.6, 6.5),
      places: { home: place(home), forge: place(offsetDir(spawnDir, 3.6, 6.5), 1.5), square: place(offsetDir(spawnDir, 5.3, 4.5), 3) },
      schedule: { morning: 'forge', noon: 'forge', evening: 'square', night: 'home' },
      anim: n => { n.armR.rotation.x = -0.4 - Math.max(0, Math.sin(ctx.time * 4)) * 0.6 * (n.talking || n.speed > 0.3 ? 0 : 1); },   // hammering
      lines: [
        { t: 'Welcome to Emberfall, traveller. Mind the ponds: they bite.' },
        { t: 'Pyrrhax sleeps on the far side. Big, red, hot temper, worse breath.', e: 'thinking' },
        { t: "When the dragon lifts its head and its throat glows, get behind it. Fire only goes where it's looking." },
        { t: 'If it spreads its wings, it means to land on you. Be somewhere else when it does.', e: 'surprised' },
        { t: 'My hammer and I have an understanding. I swing, it sings.' },
        { t: 'Ramhorns charge in straight lines. Step aside and let a tree say hello to them.' },
        { once: true, when: s => s.hero === 'knight', t: 'That axe! Who forged it? Hmph. Decent work. I would have made it heavier.', e: 'thinking' },
        { when: s => s.night, t: "The forge stays warm all night. So do I, if I'm honest. Smiths run hot.", e: 'sleepy' },
      ] },
  ];
  if (planet === 2) return [
    { name: 'Tuva', title: 'Snow Keeper', color: '#6fa8dc', build: buildSnowKeeper, height: 2.3, radius: 0.66, gesture: 'wave',
      portrait: 'snowkeeper', headR: 0.36, hat: true, local: true,
      dir: dirAlong(stoneCenter, tangentToward(stoneCenter, spawnDir), 5.5),
      places: { home: place(home), lookout: place(dirAlong(stoneCenter, tangentToward(stoneCenter, spawnDir), 5.5), 2), square: place(offsetDir(spawnDir, 1.9, 4.5), 3) },
      schedule: { morning: 'lookout', noon: 'square', evening: 'lookout', night: 'home' },
      anim: n => n.lanternGlow.rotation.z = Math.sin(ctx.time * 2) * 0.15,
      lines: [
        { t: "You came all this way? Then you're braver than the wind. And the wind is very brave.", e: 'surprised' },
        { t: 'Malgrath lifts his great sword before the killing blow. If the ground glows red under you, leave. Do not argue with it.', e: 'thinking' },
        { t: 'When he takes to the sky, watch the snow. Every circle that appears is a promise he means to keep.' },
        { t: 'My lantern has never gone out. Not once. I talk to it at night so it stays awake.' },
        { t: 'Thornmoles tremble the ground before they bite. Feel it in your boots, then jump away.' },
        { once: true, when: s => s.bosses >= 2, t: 'You beat a dragon? Then perhaps... perhaps the demon lord can fall too.', e: 'excited' },
        { when: s => s.night, t: 'The aurora is out. It only dances for people who are kind to snow.', e: 'happy' },
      ] },
  ];
  return [];
}
