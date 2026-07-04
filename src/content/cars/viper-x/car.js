/**
 * Viper-X — a lower, longer, narrower shell than Phoenix GT for a sleeker
 * sports-car silhouette. See _template/car.js for the full shape guide.
 *
 * @type {import('../_template/car.js').CarDefinition}
 */

import stats from './stats.js';

const viperX = {
  id:   'viper-x',
  name: 'Viper-X',

  // Narrower and lower than Phoenix GT, slightly longer — sleeker profile.
  shellScale:   { x: 0.82, y: 0.48, z: 2.18 },

  canopyScale:  { x: 0.6,  y: 0.38, z: 1.15 },

  // Slightly longer wheelbase to match the longer shell.
  wheelPositions: [
    [-1.0, 0.44,  1.42],
    [ 1.0, 0.44,  1.42],
    [-1.0, 0.44, -1.42],
    [ 1.0, 0.44, -1.42],
  ],

  stats,
};

export default viperX;