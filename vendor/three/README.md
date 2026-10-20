# Vendored Three.js r160

The browser build the game loads through the importmap in `index.html`. It lives here instead of a CDN so the
published game keeps working for a player whose network blocks jsdelivr.net, and so a release is reproducible.

- `three.module.js` — `node_modules/three/build/three.module.js`, unminified, byte-identical to the package.
- `addons/` — the transitive closure of the six `three/addons/` modules the game imports (post-processing passes,
  their shaders, and `BufferGeometryUtils`), copied from `node_modules/three/examples/jsm/`. Nothing else is copied.
- `LICENSE` — Three.js is MIT; the copy travels with the code.

Node tests and simulations do not use these files: they import `three` from `node_modules`, pinned by the
`three` devDependency in `package.json`.

To refresh after changing that devDependency, re-copy the same paths and check whether the addon closure grew:
the six entry points are `postprocessing/{EffectComposer,OutputPass,RenderPass,ShaderPass,UnrealBloomPass}.js`
and `utils/BufferGeometryUtils.js`.
