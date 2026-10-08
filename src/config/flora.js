/* FLORA: the kinds of tree a planet can grow (PLANETS[i].flora.trees picks among them). */

/** Tree kinds (drawn by src/world/props.js TREE_BUILDERS) and each one's collider (r = trunk, cam = the crown the camera avoids),
    all at scale 1; name = what the chopping prompt calls it, wood: false = an axe can't chop it (src/gameplay/Gathering.js).
    Which kinds grow where: PLANETS[i].flora.trees (config/planets.js). */
export const TREE_KINDS = {
  blossom:  { name: 'blossom tree', r: 0.42, cam: { r: 1.8, base: 2.2, top: 4.9 } },
  pine:     { name: 'pine', r: 0.42, cam: { r: 1.3, base: 1.1, top: 5 } },
  shroom:   { name: 'mushroom tree', r: 0.5, cam: { r: 1.9, base: 2.7, top: 3.9 } },
  oak:      { name: 'oak', r: 0.5, cam: { r: 2.1, base: 2.0, top: 5.2 } },
  willow:   { name: 'willow', r: 0.45, cam: { r: 2.2, base: 1.4, top: 4.6 } },
  birch:    { name: 'birch', r: 0.3, cam: { r: 1.2, base: 2.6, top: 6.2 } },
  crystal:  { name: 'crystal spire', r: 0.45, cam: { r: 1.2, base: 0.6, top: 3.6 }, wood: false },
  ember:    { name: 'ember tree', r: 0.45, cam: { r: 1.7, base: 2.0, top: 4.6 } },
  snowpine: { name: 'snowy pine', r: 0.42, cam: { r: 1.4, base: 0.9, top: 5.6 } },
};
