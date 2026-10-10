import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowVC, outlineMat, toonVC } from './materials.js';

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
