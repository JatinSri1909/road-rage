/**
 * Exports the visual parameters used by entities/car.js to build the
 * Three.js mesh, and re-exports stats from stats.js for the physics system.
 *
 * @typedef {Object} CarDefinition
 * @property {string}  id            — must match the registry key in content/cars/index.js
 * @property {string}  name          — human-readable display name
 * @property {{ x: number, y: number, z: number }} shellScale    — body shell scale
 * @property {{ x: number, y: number, z: number }} canopyScale   — canopy scale
 * @property {[number, number, number][]}           wheelPositions — [x, y, z] per wheel
 * @property {import('./stats.js').CarStats}        stats
 */

import stats from './stats.js';

/** @type {CarDefinition} */
const phoenixGT = {
  id:   'phoenix-gt',
  name: 'Phoenix GT',

  // Body shell proportions (x=width, y=height, z=length multipliers on unit sphere)
  shellScale:   { x: 0.92, y: 0.56, z: 2.05 },

  // Canopy (windscreen bubble)
  canopyScale:  { x: 0.68, y: 0.44, z: 1.05 },

  // [x, y, z] world-space offsets for each wheel (front-left, front-right, rear-left, rear-right)
  wheelPositions: [
    [-1.05, 0.44,  1.3],
    [ 1.05, 0.44,  1.3],
    [-1.05, 0.44, -1.3],
    [ 1.05, 0.44, -1.3],
  ],

  stats,
};

export default phoenixGT;
