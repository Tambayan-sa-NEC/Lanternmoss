/* ---------------------------------------------------------------------
   DUSKHOLLOW'S LANTERN AND ENDLESS DUSK (TODO 30a).
   Runtime: src/world/mechanics/lantern.js (the planet mechanic), src/fx/glowmoss.js (the footprints).
   The world never goes fully black: darkness feeds src/render/lighting.js, which keeps a minimum ambient and the
   ink outlines, so the lowest quality preset stays readable. An empty lantern only shrinks your light; it never hurts.
     dusk      the endless dusk. The day clock still turns, as brighter and dimmer dusk:
               day / night  darkness (0 = the open surface as it always was, 1 = a cave) at the brightest point of the
                            day and at the darkest point of the night, eased between them by the day fraction
               deepDark     extra darkness the deep-dark weather may ask for later (30c), as a share of what is left
     canopy    the giant lumen caps overhead. Authored gaps let starlight through (see planets/duskhollow.js):
               cover        darkness multiplier under the closed canopy (1 = the full dusk above)
               gapCover     multiplier in the middle of a gap of starlight
               villageCover multiplier in the village gap, the world's safe light
               fade         metres over which a gap blends back into the closed canopy
     oil       the belt lantern's fuel, shown as the Oil bar beside Energy and saved per planet:
               max / start  tank size and the oil a hero arrives with
               burn         oil per second of play while the lantern is lit outdoors (not indoors, in menus, in a
                            cave or while the game is paused). About one adventure day of light per full tank
               refillStep   the oil one ordinary refill gives (glowcaps, firefly jars and lumen oil arrive in 30b/30c)
     light     the light the lantern casts, handed to the hero's shared local light (RENDER.localLight):
               radius / intensity       with oil in the tank
               emberRadius / emberIntensity   the small, safe glow an empty lantern shrinks to
               lowOil       share of the tank below which the Oil bar warns and the flame starts to gutter
               flicker      how much the lit radius breathes, as a share of it
     foot      the glowmoss carpet lighting up in your footprints, the world's signature effect:
               max          hard cap on live prints (one instanced draw call; scenery density scales it down)
               spacing      metres walked between prints      life  seconds a print stays, fading out
               radius       size of a print in metres          lift  how far it floats over the ground
               color / glow colour of the lit moss and how strongly it burns over the ground
   --------------------------------------------------------------------- */

export const LANTERN = {
  dusk: { day: 0.42, night: 0.78, deepDark: 0.35 },
  canopy: { cover: 1, gapCover: 0.35, villageCover: 0.12, fade: 14 },
  oil: { max: 100, start: 100, burn: 0.34, refillStep: 25 },
  light: { radius: 7.5, intensity: 0.95, emberRadius: 2.8, emberIntensity: 0.4, lowOil: 0.2, flicker: 0.05 },
  foot: { max: 24, spacing: 1.15, life: 4.5, radius: 0.7, lift: 0.07, color: 0x7cf0c0, glow: 1.5 },
};
