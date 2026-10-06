/* A tool in the hero's hand while it's being used (gathering, fishing, farming): the item's own model on the right
   arm, with the hero's weapon (the witch's staff, the warrior's axe) tucked away meanwhile. */
import { buildHeldModel } from '../models/items.js';
import { disposeTree } from '../render/meshes.js';

const STOWED = ['staff', 'axe'];

/** Puts the tool `def` (an item definition) in the hero's right hand. */
export function holdTool(P, def) {
  if (P.heldTool?.userData.itemId === def.id) return;
  releaseTool(P);
  const g = buildHeldModel(def); g.userData.itemId = def.id;
  g.scale.setScalar(1.8); g.position.set(0, -0.48, 0.1); g.rotation.set(Math.PI / 2, 0, Math.PI / 2);   // handle in the fist, head pointing ahead
  P.armR.add(g); P.heldTool = g;
  for (const k of STOWED) if (P[k]) P[k].visible = false;
}

/** Back to the hero's own weapon. */
export function releaseTool(P) {
  if (!P.heldTool) return;
  P.heldTool.parent?.remove(P.heldTool); disposeTree(P.heldTool); P.heldTool = null;
  for (const k of STOWED) if (P[k]) P[k].visible = true;
}
