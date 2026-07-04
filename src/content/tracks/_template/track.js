/**
 * USAGE:
 *   1. Copy this entire folder to content/tracks/your-track-name/
 *   2. Rename and fill in the controlPoints below to define your circuit
 *   3. Adjust roadWidth / boostPadIndices to match your layout
 *   4. Register your track in content/tracks/index.js
 *   5. Build scenery in scenery.js (optional, but recommended)
 *
 * SPLINE TIPS:
 *   - Use 8–14 control points for a lap-length circuit
 *   - Keep the last point 10–30 units from the first to avoid a kink
 *     at the join (CatmullRom is closed with `true` in track-builder)
 *   - Place control points on a flat Y=0 plane unless you want hills
 *   - Minimum straight length before a boost pad: ~15 world units
 *
 * @typedef {Object} TrackDefinition
 * @property {import('three').Vector3[]} controlPoints
 * @property {number}                    tension         — 0 = loose, 1 = tight corners
 * @property {number}                    roadWidth       — full road width in world units
 * @property {number}                    samples         — spline resolution (default 480)
 * @property {number[]}                  boostPadIndices — sample indices for boost pads
 */

import * as THREE from 'three';

/** @type {TrackDefinition} */
const templateTrack = {
  controlPoints: [
    new THREE.Vector3(  0, 0,   0),
    new THREE.Vector3( 60, 0,  -10),
    new THREE.Vector3(100, 0,   50),
    new THREE.Vector3( 60, 0,  110),
    new THREE.Vector3(  0, 0,  130),
    new THREE.Vector3(-60, 0,  110),
    new THREE.Vector3(-100, 0,  50),
    new THREE.Vector3(-60, 0,  -10),
  ],
  tension:        0.5,
  roadWidth:      13,
  samples:        480,
  boostPadIndices: [60, 180, 300, 420],
};

export default templateTrack;
