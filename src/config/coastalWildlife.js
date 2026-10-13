/** Pure ambient schedule, independent of combat and weather. Flood recovery takes priority over shell hiding. */
export function coastalActivity(kind,phase,{near=false,flooded=false}={}) {
  if(kind==='crab')return flooded?'return':near?'hide':phase==='noon'?'scuttle':'idle';
  if(kind==='seal')return flooded?'return':near?'bark':['morning','noon'].includes(phase)?'nap':'loaf';
  return phase==='night'?'swim':'bask';
}
