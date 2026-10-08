// Houses end to end: door prompt, entering, walking indoors, no combat, furniture, residents, sleeping owners, leaving.
import { boot, imp } from './lib/boot.mjs';
const { ctx } = await imp('core/context.js');
const { Houses, currentInteraction } = await imp('gameplay/Houses.js');
const { dayClock } = await imp('gameplay/dayClock.js');
const { Dialog } = await imp('ui/Dialog.js');
const { cam } = await imp('systems/CameraSystem.js');
const { ROOM_ORIGIN } = await imp('world/interiors.js');
const { DAY } = await imp('config/day.js');
const { arcDist } = await imp('utils/sphere.js');
const { H, step, game } = await boot('witch');
let fails = 0; const check = (ok, m) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${m}`); if (!ok) fails++; };
const P = H.player, houses = game.world.houses;
const at = (x, z) => { Houses.inside.x = x; Houses.inside.z = z; Houses.placeHero(); step(0.05); };
const goIn = i => { P.placeAt(game.world.houses[i].door); step(0.1); const t = currentInteraction(); t?.run(); step(1); return t; };
const goOut = () => { Houses.leave(); step(1); };
step(1);
let t = goIn(0);
check(/Enter Lio's house/.test(t?.label ?? ''), `door prompt: "${t?.label}"`);
check(ctx.indoors === "Lio's house" && P.pos.distanceTo(ROOM_ORIGIN) < 6 && cam.room, 'inside: hero in the room, dollhouse camera on');
check(!ctx.transitioning, 'the fade finished and controls are back');
// walking
const z0 = Houses.inside.z; H.keys.KeyW = true; step(1); H.keys.KeyW = false; step(0.2);
check(Houses.inside.z < z0 - 1.5 && P.motionHs >= 0, `W walks into the room (z ${z0.toFixed(1)} -> ${Houses.inside.z.toFixed(1)})`);
H.keys.KeyW = true; step(4); H.keys.KeyW = false;
check(Math.hypot(Houses.inside.x, Houses.inside.z) <= Houses.inside.room.shape.r + 0.01, 'walls hold (circle room)');
// no combat
const mana = P.mana, shots = ctx.projectiles.length; H.tryCast('bolt'); step(0.1);
check(P.mana === mana && ctx.projectiles.length === shots, 'abilities are off indoors');
// chest
const chest = Houses.inside.room.spots.find(s => s.kind === 'chest'); at(chest.x + 1.0, chest.z);
const coins = P.coins; t = currentInteraction(); check(/chest/.test(t?.label ?? ''), `next to the chest: "${t?.label}"`); t.run(); Dialog.close();
check(P.coins === coins + 12 && P.inventory.count('moonberry') >= 2, 'the chest gives its gift (12 coins, 2 moonberries)');
t = currentInteraction(); t.run(); check(/Empty/.test(Dialog.text), 'only once per adventure'); Dialog.close();
// note (Lio is out by day)
const n = Houses.inside.noteAt; at(n.x + 1.2, n.z); t = currentInteraction();
check(/note/i.test(t?.label ?? ''), 'nobody home by day: a note on the table'); t.run(); check(/busking/.test(Dialog.text), 'the note is from Lio'); Dialog.close();
// leave via the doormat
const e = Houses.inside.room.entrance; at(e.x, e.z - 2); Houses.inside.armed = true; H.keys.KeyS = true; step(1.5); H.keys.KeyS = false; step(1);
check(!ctx.indoors && !P.motion && P.selfCollider.active && arcDist(P.up, houses[0].door) < 2.5, 'stepping onto the doormat leads back outside, by the door');
// Bramble's bookshelf lore
goIn(2); const shelf = Houses.inside.room.spots.find(s => s.kind === 'bookshelf'); at(shelf.x, shelf.z + 1.2);
t = currentInteraction(); t.run(); const lore1 = Dialog.text; Dialog.close(); currentInteraction().run(); const lore2 = Dialog.text; Dialog.close();
check(/Lanternmoss/.test(lore1) && lore1 !== lore2, 'Bramble\'s bookshelf reads his lore, page by page'); goOut();
// a resident
goIn(3); const r = Houses.inside.resident; at(r.x + 1.5, r.z);
t = currentInteraction(); check(/Talk to Granny Thimble/.test(t?.label ?? ''), `resident: "${t?.label}"`); t.run();
check(Dialog.open && Dialog.npc.def.portrait === 'granny', 'Granny talks, with her portrait'); Dialog.close();
const kettle = Houses.inside.room.spots.find(s => s.kind === 'kettle'); P.hp = 20; at(kettle.x - 1.2, kettle.z); currentInteraction().run(); Dialog.close();
check(P.hp >= 50, 'Granny\'s tea heals'); goOut();
// night: owners go inside to bed, and the bed sleeps you to morning
dayClock.t = 0.8 * DAY.length; step(30);
const lio = ctx.npcs.find(x => x.name === 'Lio');
check(lio.asleep && !lio.root.visible, 'at night Lio has gone inside to bed (hidden outdoors)');
goIn(0); check(!!Houses.inside.sleeper, 'and he is asleep in his bed');
const day = dayClock.day, bed = Houses.inside.room.bedAt; P.hp = 10; at(bed.x + 1.6, bed.z + 0.6);
t = currentInteraction(); const sleepT = Houses.inside.room.spots.find(s => s.kind === 'bed');
Houses.use(sleepT); step(1.2);
check(dayClock.day === day + 1 && dayClock.phase === 'morning' && P.hp === P.stats.maxHp, `sleeping: day ${day} -> ${dayClock.day}, morning, fully healed`);
goOut();
// every house on every planet opens and closes cleanly
let ok = 0, total = 0;
for (const planet of [0, 1, 2]) {
  if (planet) { H.goToPlanet(planet); step(1); }
  for (let i = 0; i < game.world.houses.length; i++) { total++; const tt = goIn(i); if (ctx.indoors) ok++; else console.log('   could not enter', planet, i, tt?.label); goOut(); }
}
check(ok === total, `all ${total} houses on the three planets can be entered and left (${ok})`);
check(game.world.houses.length >= 6, 'six houses per planet');
goIn(0); H.goToPlanet(1); step(1);
check(!ctx.indoors && !P.motion && !cam.room, 'changing planet while indoors leaves the house cleanly');
console.log(fails ? `${fails} FAILED` : 'all passed');
