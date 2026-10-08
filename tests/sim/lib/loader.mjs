// Node module hooks for the headless sims: resolve the browser import map ('three', 'three/addons/') to the local
// install (the `three` dev dependency, same version as index.html), and swap the WebGL RenderSystem for a no-op stub.
const threeDir = new URL('../../../node_modules/three/', import.meta.url);
const stub = new URL('stubRender.mjs', import.meta.url).href;

export async function resolve(specifier, context, next) {
  if (specifier === 'three') return { url: new URL('build/three.module.js', threeDir).href, shortCircuit: true };
  if (specifier.startsWith('three/addons/')) return { url: new URL('examples/jsm/' + specifier.slice('three/addons/'.length), threeDir).href, shortCircuit: true };
  const r = await next(specifier, context);
  if (r.url.endsWith('/src/systems/RenderSystem.js')) return { url: stub, shortCircuit: true };
  return r;
}
