import stats from './stats.js';

/**
 * Specter R — a sleek, stealth-focused precision track car that reuses
 * the Ferrari glTF model from three.js examples, but with customized high-grip
 * stats and a signature black & gold paint job.
 *
 * @type {import('../_template/car.js').CarDefinition}
 */
const specterR = {
  id:   'specter-r',
  name: 'Specter R',

  modelUrl:        'https://threejs.org/examples/models/gltf/ferrari.glb',
  modelScale:      1,
  modelRotationY:  Math.PI,
  modelBadgeY:     1.1,

  color:       0x111111, // matte stealth black
  accentColor: 0xd4af37, // metallic gold details

  // We omit nodeMappings to test the default fallback behavior on the Ferrari model

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
