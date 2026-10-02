/* The single Three.js scene and camera every visual object is added to. */
import * as THREE from 'three';
import { RENDER } from '../config/render.js';

export const PIXEL_RATIO = Math.min(window.devicePixelRatio || 1, RENDER.maxPixelRatio);
export const FOG_COLOR = new THREE.Color(RENDER.fog.color);

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_COLOR, RENDER.fog.near, RENDER.fog.far);

export const camera = new THREE.PerspectiveCamera(RENDER.fov, innerWidth / innerHeight, RENDER.near, RENDER.far);
