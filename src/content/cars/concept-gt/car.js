import stats from './stats.js';

/**
 * Concept GT — uses the open-source CC0 CarConcept glTF model from the
 * Khronos Group sample assets repository.
 *
 * Model URL: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept
 *
 * @type {import('../_template/car.js').CarDefinition}
 */
const conceptGT = {
  id:   'concept-gt',
  name: 'Concept GT',

  modelUrl:        'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/CarConcept/glTF-Binary/CarConcept.glb',
  modelScale:      0.82,
  modelRotationY:  0,
  modelBadgeY:     1.1,

  color:       0x00ffcc, // neon turquoise body paint
  accentColor: 0x1a1a2e, // dark space blue details

  // Node mappings for CarConcept.glb
  nodeMappings: {
    body: [
      'BodyRearPanelsColor1',
      'BodyDoorRColor1',
      'BodyDoorLColor1',
      'BodyRoofPanel',
      'BodyHood',
      'BodyDoorRMirrorColor1',
      'BodyDoorLMirrorColor1'
    ],
    trim: [
      'BodyPanelsColor2',
      'BodyDoorRColor2',
      'BodyDoorLColor2',
      'BodyPillars',
      'BodyUnderside',
      'BodyDoorRMirrorColor2',
      'BodyDoorLMirrorColor2'
    ],
    glass: [
      'BodyWindshield',
      'BodyWindowsRearSides',
      'BodyRearwindow',
      'BodyDoorRWindow',
      'BodyDoorLWindow'
    ],
    rims: [
      'WheelFrontLRim',
      'WheelFrontRRim',
      'WheelRearLRim',
      'WheelRearRRim'
    ],
    wheels: [
      'WheelFrontL',
      'WheelFrontR',
      'WheelRearL',
      'WheelRearR'
    ]
  },

  shellScale:   { x: 0.9, y: 0.5, z: 2.1 },
  canopyScale:  { x: 0.7, y: 0.4, z: 1.1 },
  wheelPositions: [
    [-1.0, 0.44,  1.3],
    [ 1.0, 0.44,  1.3],
    [-1.0, 0.44, -1.3],
    [ 1.0, 0.44, -1.3],
  ],

  stats,
};

export default conceptGT;
