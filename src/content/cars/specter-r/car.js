import stats from './stats.js';

/**
 * Specter R — a sleek, stealth-focused precision track car that uses
 * the engine's procedural muscle body builder with a signature black & gold paint job.
 *
 * @type {import('../_template/car.js').CarDefinition}
 */
const specterR = {
  id:   'specter-r',
  name: 'Specter R',

  bodyStyle:   'muscle',
  color:       0x111111, // matte stealth black
  accentColor: 0xd4af37, // metallic gold details

  shellScale:   { x: 0.82, y: 0.48, z: 2.18 },
  canopyScale:  { x: 0.6,  y: 0.38, z: 1.15 },
  wheelPositions: [
    [-1.0, 0.44,  1.42],
    [ 1.0, 0.44,  1.42],
    [-1.0, 0.44, -1.42],
    [ 1.0, 0.44, -1.42],
  ],

  stats,
};

export default specterR;

