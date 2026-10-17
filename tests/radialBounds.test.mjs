import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { radialBounds, cacheRadialBounds } from '../src/render/radialBounds.js';

test('rotation-independent bounds contain every vertex through translated, rotated, scaled and hidden poses', () => {
  const root = new THREE.Group(), arm = new THREE.Group(), hand = new THREE.Mesh(new THREE.BoxGeometry(2,3,4));
  root.add(arm); arm.add(hand); hand.position.set(4,1,-2); hand.visible = false;
  for (let i=0;i<30;i++) {
    arm.position.set(Math.sin(i)*2, Math.cos(i), i/10); arm.rotation.set(i*.7,i*.2,i*.3); arm.scale.set(.3+i/10,2,.7);
    hand.rotation.set(i*.4,i*.8,i*.6); hand.scale.set(-2,.4,1);
    root.updateMatrixWorld(true); const radius = radialBounds(root), p = new THREE.Vector3(), attr=hand.geometry.attributes.position;
    for(let v=0;v<attr.count;v++)assert.ok(p.fromBufferAttribute(attr,v).applyMatrix4(hand.matrixWorld).length()<=radius+1e-9);
  }
});

test('immutable radii avoid descendant walks while moving ancestors still contribute their current scale/translation', () => {
  const root=new THREE.Group(), rigid=new THREE.Group(), mesh=new THREE.Mesh(new THREE.SphereGeometry(1));
  root.add(rigid);rigid.add(mesh);mesh.position.x=3;cacheRadialBounds(rigid);
  const cached=radialBounds(rigid);
  let queries=0; const original=mesh.position.length;mesh.position.length=function(){queries++;return original.call(this);};
  assert.equal(radialBounds(root),cached);rigid.position.x=5;rigid.scale.setScalar(2);assert.equal(radialBounds(root),5+2*cached);assert.equal(queries,0);
});

test('instances use their complete object bounds and unbounded/skinned/morph draws disable branch culling', () => {
  const root=new THREE.Group(), mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),2);
  mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(50,0,0));mesh.setMatrixAt(1,new THREE.Matrix4().makeTranslation(-50,0,0));root.add(mesh);
  assert.ok(radialBounds(root)>=50);
  mesh.frustumCulled=false;assert.equal(radialBounds(root),Infinity);
  mesh.frustumCulled=true;mesh.isSkinnedMesh=true;assert.equal(radialBounds(root),Infinity);
  mesh.isSkinnedMesh=false;mesh.morphTargetInfluences=[0];assert.equal(radialBounds(root),Infinity);
});
