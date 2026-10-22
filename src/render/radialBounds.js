/* Conservative rotation-independent bounds around a rig's origin. No authored size guesses: every geometry's
   full sphere, local translation and largest scale contributes. Current animated translations/scales are read
   each time; complete immutable branches may cache their radius. Visibility never shrinks a bound. */
const immutable = new WeakMap();
export function radialBounds(node) {
  const cached = immutable.get(node); if (cached !== undefined) return cached;
  let radius = 0;
  if (node.geometry) {
    // A deliberately unbounded draw must retain its old rendering behavior.
    if (node.frustumCulled === false || node.isSkinnedMesh || node.morphTargetInfluences?.length) return Infinity;
    const source = node.isInstancedMesh ? node : node.geometry;
    if (!source.boundingSphere) source.computeBoundingSphere();
    const sphere = source.boundingSphere;
    if (sphere && !sphere.isEmpty()) radius = sphere.center.length() + sphere.radius;
  }
  for (const child of node.children) {
    const scale = Math.max(Math.abs(child.scale.x), Math.abs(child.scale.y), Math.abs(child.scale.z));
    const bound = radialBounds(child);
    if (!Number.isFinite(bound)) return Infinity;
    radius = Math.max(radius, child.position.length() + scale * bound);
  }
  return radius;
}
export function cacheRadialBounds(root) {
  immutable.delete(root); immutable.set(root, radialBounds(root));
}
