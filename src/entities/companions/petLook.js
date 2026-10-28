/* A pet's body as a still model, with no behaviour (TODO 35): the pet asleep in the cottage pet basket. Built from the
   same builders as the live bodies (FlyingPet, WalkingPet via Critter), so it is the same pet, outfit and all. */
import { CRITTER_DEFS } from '../../config/critters.js';
import { PETS } from '../../config/pets.js';
import { COASTAL_BUILDERS } from '../../models/coastalCreatures.js';
import { buildOwl, buildQuad, buildToad, buildWhelp, buildWispPet } from '../../models/creatures.js';

const FLYERS = { owl: buildOwl, wisp: () => buildWispPet(), whelp: buildWhelp };

/** { root, head, ... } for pet `id`: a flyer's model, or the critter look its walking body uses. */
export function buildPetLook(id) {
  const p = PETS[id];
  if (p.body === 'fly') return FLYERS[p.model]();
  const def = CRITTER_DEFS[p.model];
  return (COASTAL_BUILDERS[def.build] ?? (def.build === 'toad' ? buildToad : buildQuad))(def);
}
