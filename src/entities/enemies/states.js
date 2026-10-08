/* Enemy AI states in which a monster is actively fighting (shared by enemies, the owl and the HUD).
   active = a boss carrying out a multi-step attack; transition = a boss changing phase. */
export const ENGAGED = new Set(['chase', 'windup', 'recover', 'charge', 'flee', 'active', 'transition']);
