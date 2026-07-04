/**
 * Viper-X — uses a real imported glTF model instead of the engine's
 * procedural body builder, so it's a genuinely different car rather than a
 * resized/recolored version of Phoenix GT.
 *
 * Model: Ferrari 458 Italia, bundled with three.js's own official examples
 * (mrdoob/three.js, examples/models/gltf/ferrari.glb — the same asset used
 * in the public "webgl_materials_car" example), served from threejs.org.
 * Credit: model by vicent091036 (Sketchfab), as redistributed in the
 * three.js examples repo.
 *
 * See _template/car.js for the full field guide, and entities/car.js's
 * buildModelBody() for how modelUrl/modelScale/modelRotationY are consumed.
 *
 * @type {import('../_template/car.js').CarDefinition}
 */

import stats from './stats.js';

const viperX = {
  id:   'viper-x',
  name: 'Viper-X',

  modelUrl:        'https://threejs.org/examples/models/gltf/ferrari.glb',
  // Tuning knobs — verify these in-browser and adjust:
  //  - modelScale: the model ships at real-world (metre) scale; this engine's
  //    procedural cars are ~4 units long, so start around 1 and rescale to match.
  //  - modelRotationY: if the car renders facing backwards (nose pointing the
  //    wrong way down the track), add Math.PI here.
  //  - modelBadgeY: raise/lower the race-number badge to sit just above the roof.
  modelScale:      1,
  modelRotationY:  Math.PI,
  modelBadgeY:     1.1,

  color:       0xff2447, // body paint
  accentColor: 0x161616, // trim/details

  // Not used for rendering when modelUrl is set (kept so stats.js and any
  // future fallback path still have shape data to reference).
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

export default viperX;