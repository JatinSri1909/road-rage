/**
 * Exports the spline control points, road parameters, and the indices
 * of boost pad positions on the track. The scenery (trees, grandstands,
 * billboards, mountains) lives in scenery.js and is built by
 * entities/track-builder.js.
 *
 * @typedef {Object} TrackDefinition
 * @property {import('three').Vector3[]} controlPoints   — CatmullRom spline knots
 * @property {number}                    tension          — spline tension (0–1)
 * @property {number}                    roadWidth        — full road width in world units
 * @property {number}                    samples          — number of spline samples
 * @property {number[]}                  boostPadIndices  — sample indices for boost pads
 */

import * as THREE from 'three';
import { buildScenery } from './scenery.js';

/** @type {TrackDefinition} */
const sunsetGrid = {
  controlPoints: [
    new THREE.Vector3(0,   0,   0),
    new THREE.Vector3(55,  0, -15),
    new THREE.Vector3(105, 0,  10),
    new THREE.Vector3(130, 0,  55),
    new THREE.Vector3(105, 0, 105),
    new THREE.Vector3(45,  0, 130),
    new THREE.Vector3(-25, 0, 115),
    new THREE.Vector3(-75, 0, 140),
    new THREE.Vector3(-130,0,  95),
    new THREE.Vector3(-100,0,  35),
    new THREE.Vector3(-55, 0,  10),
    new THREE.Vector3(-60, 0, -40),
    new THREE.Vector3(-15, 0, -55),
  ],
  tension:        0.55,
  roadWidth:      13,
  samples:        480,
  boostPadIndices: [55, 150, 245, 340, 430],
  buildScenery,
};

export default sunsetGrid;
