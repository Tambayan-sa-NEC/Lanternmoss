import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowVC, outlineMat, toonVC } from './materials.js';
import { cacheRadialBounds } from './radialBounds.js';

const frozenUpdates = new WeakMap();
function updateFrozenWorld(force) {
  // Every descendant has an immutable local matrix. A clean branch under an unchanged parent is already current.
  if (force || this.matrixWorldNeedsUpdate) frozenUpdates.get(this).call(this, force);
}
/** Only for complete geometry-baked branches whose local transforms, geometry bounds and child list never animate. Moving parents
    still force fresh world matrices; explicit updateWorldMatrix queries retain Three's normal behavior. */
export function freezeStaticTransforms(root) {
  root.traverse(node => { node.updateMatrix(); node.matrixAutoUpdate = false; });
  cacheRadialBounds(root);
  if (!frozenUpdates.has(root)) { frozenUpdates.set(root, root.updateMatrixWorld); root.updateMatrixWorld = updateFrozenWorld; }
  return root;
}

/** Merge static part() models, baking colour and local transforms. Keep independently hidden fruit separate. */
export function batchParts(parent, exclude = null) {
  parent.updateMatrixWorld(true);
  const inverse = parent.matrixWorld.clone().invert(), buckets = new Map(), originals = [];
  for (const child of parent.children) {
    if (child === exclude || exclude?.has?.(child)) continue;
    originals.push(child);
    child.traverse(mesh => {
      if (!mesh.isMesh) return;
      const material = mesh.material === outlineMat ? outlineMat : mesh.material.isMeshToonMaterial ? toonVC : glowVC;
      const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const key of Object.keys(g.attributes)) if (!['position', 'normal'].includes(key)) g.deleteAttribute(key);
      g.applyMatrix4(inverse.clone().multiply(mesh.matrixWorld));
      if (material !== outlineMat) {
        const color = mesh.material.color, colors = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < colors.length; i += 3) colors.set([color.r, color.g, color.b], i);
        g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      }
      if (!buckets.has(material)) buckets.set(material, []);
      buckets.get(material).push(g);
    });
  }
  const group = new THREE.Group();
  for (const [material, geometries] of buckets) {
    group.add(new THREE.Mesh(mergeGeometries(geometries), material));
    for (const g of geometries) g.dispose();
  }
  for (const child of originals) { parent.remove(child); child.traverse(o => o.geometry?.dispose()); }
  parent.add(group); return group;
}

/** Batch the rigid decoration between a model's named animation pivots. All returned Object3D references (and
    extra pivots) keep their identity and ancestors. Mutable/transparent/custom materials and hidden nodes stay
    separate. Builders must expose every independently animated part; a pincer stored in userData goes in extra. */
export function batchRigidParts(parts, extra = []) {
  const keep = new Set(), owned = new Set(), root = parts.root;
  const preserve = node => {
    if (Array.isArray(node)) { node.forEach(preserve); return; }
    if (node?.isMaterial) { owned.add(node); return; }
    if (!node?.isObject3D) return;
    for (let p = node; p; p = p.parent) { keep.add(p); if (p === root) break; }
  };
  Object.values(parts).forEach(preserve); preserve(extra);
  root.traverse(node => { for (const material of node.userData.ownedMaterials ?? []) owned.add(material); });
  root.traverse(node => {
    const m = node.material;
    if (!node.visible || (!node.isGroup && !node.isMesh) || (node.isMesh && (node.isInstancedMesh
      || (m !== outlineMat && (!m || Array.isArray(m) || owned.has(m) || m.transparent || m.opacity !== 1
        || m.vertexColors || m.map || m.side !== THREE.FrontSide || !(m.isMeshToonMaterial || m.isMeshBasicMaterial)))))) preserve(node);
  });
  for (const pivot of keep) if (pivot.isGroup && pivot.children.some(child => !keep.has(child)))
    freezeStaticTransforms(batchParts(pivot, keep));
  return parts;
}
