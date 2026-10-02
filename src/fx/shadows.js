/* Blob shadows under moving things (cheap and very "anime"). */
import * as THREE from 'three';
import { scene } from '../render/scene.js';
import { frameQuat } from '../utils/sphere.js';
import { groundHeight } from '../world/terrain.js';

const shadowGeo = new THREE.CircleGeometry(1, 14).rotateX(-Math.PI / 2);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x4a2a50, transparent: true, opacity: 0.26, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });

export function makeShadow(s) { const m = new THREE.Mesh(shadowGeo, shadowMat); m.userData.s = s; m.renderOrder = 1; scene.add(m); return m; }
/** alt = height above the ground; the shadow shrinks as its owner rises. */
export function updateShadow(m, up, fwd, alt) {
  m.position.copy(up).multiplyScalar(groundHeight(up) + 0.07); frameQuat(up, fwd, m.quaternion);
  m.scale.setScalar(m.userData.s * Math.max(0.35, 1 - alt * 0.13));
}
