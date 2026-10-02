/* The single Three.js scene and camera every visual object is added to. */
import * as THREE from 'three';
import { RENDER } from '../config/render.js';

export const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
/** Shared by reference with the outline and water shaders, so setFogColor() recolours them too. */
export const FOG_COLOR = new THREE.Color();

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, RENDER.fog.near, RENDER.fog.far);

export const camera = new THREE.PerspectiveCamera(RENDER.fov, innerWidth / innerHeight, RENDER.near, RENDER.far);

export function setFogColor(hex) { FOG_COLOR.set(hex); scene.fog.color.set(hex); }
