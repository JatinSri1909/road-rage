/**
 * USAGE:
 *   1. Copy this entire folder to content/cars/your-car-name/
 *   2. Update `id`, `name`, and the mesh parameters below
 *   3. Tune physics in stats.js
 *   4. Register in content/cars/index.js — one line, done
 *
 * MESH PARAMETER GUIDE:
 *   shellScale   — controls the body shell ellipsoid. x=width, y=height, z=length.
 *                  Typical ranges: x 0.7–1.1, y 0.4–0.7, z 1.6–2.5
 *   canopyScale  — the windscreen bubble. Keep y < shellScale.y.
 *   wheelPositions — [x, y, z] local offsets from group centre.
 *                  x: ±1.0–1.2 (track width), y: ~0.44 (wheel radius),
 *                  z: ±1.1–1.5 (wheelbase).
 *
 * @typedef {Object} CarDefinition
 * @property {string}  id
 * @property {string}  name
 * @property {{ x: number, y: number, z: number }} shellScale
 * @property {{ x: number, y: number, z: number }} canopyScale
 * @property {[number, number, number][]}           wheelPositions
 * @property {import('./stats.js').CarStats}        stats
 */

import stats from './stats.js';

/** @type {CarDefinition} */
const templateCar = {
  id:   'template-car',     // ← change to your car's ID
  name: 'Template Car',     // ← change to display name

  shellScale:   { x: 0.92, y: 0.56, z: 2.05 },
  canopyScale:  { x: 0.68, y: 0.44, z: 1.05 },
  wheelPositions: [
    [-1.05, 0.44,  1.3],
    [ 1.05, 0.44,  1.3],
    [-1.05, 0.44, -1.3],
    [ 1.05, 0.44, -1.3],
  ],
  stats,
};

export default templateCar;
