import { toonVC } from './materials.js';
import { patchLocalLight } from './lighting.js';
export const coastalWind={time:{value:0}};
export const kelpVC=toonVC.clone();
kelpVC.onBeforeCompile=shader=>{
  patchLocalLight(shader);   // its own patch replaces the toon prototype's, so it chains the local light itself
  shader.uniforms.uCoastalTime=coastalWind.time;
  shader.vertexShader='uniform float uCoastalTime;\n'+shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec3 n=normalize(position);vec3 side=cross(n,vec3(0.0,1.0,0.1));
    transformed+=side*sin(uCoastalTime*1.3+position.z*.8)*min(0.35,max(0.0,length(position)-70.5)*0.12);`);
};
kelpVC.customProgramCacheKey=()=> 'coastalKelp-local';
