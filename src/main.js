/**
 * Responsibility: initialise every subsystem in the correct order and hand off
 * to the game loop. Nothing game-logic specific lives here; this file is just
 * the wiring diagram.
 *
 * Order matters:
 *   1. Device detection (needed by renderer + controls)
 *   2. Renderer + Scene + Camera  (core/)
 *   3. Track content             (content/tracks/)
 *   4. Cars + Physics state      (content/cars/ + entities/)
 *   5. UI / Controls             (ui/)
 *   6. Race state                (race/)
 *   7. Audio                     (core/audio.js)
 *   8. Main loop                 (core/loop.js)
 */

import * as THREE from 'three';
import { isMobileDevice, applyDeviceClasses } from './core/device.js';
import { initRenderer, resizeRenderer }         from './core/renderer.js';
import { initScene }                            from './core/scene.js';
import { initCamera }                           from './core/camera.js';
import { initAudio, updateAudio }               from './core/audio.js';
import { startLoop }                            from './core/loop.js';

import { loadTrack, getTrackIds }   from './content/tracks/index.js';
import { loadCar, getCarIds } from './content/cars/index.js';

import { buildTrackMesh }  from './entities/track-builder.js';
import { createCarMesh }   from './entities/car.js';
import { makeCarState }    from './entities/car.js';
import { preloadCarModel } from './entities/car.js';

import { initParticles, updateParticles } from './effects/particles.js';

import { initKeyboard }    from './ui/controls/keyboard-input.js';
import { initJoystick }    from './ui/controls/touch-joystick.js';
import { initActionBtns }  from './ui/controls/action-buttons.js';

import { initHUD, updateHUD, resetHUDTimer }     from './ui/hud.js';
import { initMinimap, drawMinimap } from './ui/minimap.js';
import { initOverlay, showLoading, hideLoading, showSetupScreen } from './ui/overlay.js';
import { initCarSelect }           from './ui/car-select.js';
import { initTrackSelect }         from './ui/track-select.js';
import { initColorSelect, updateFactoryOptionColors } from './ui/color-select.js';

import { initRaceState, stepRace, tickRace, getRaceState, resetRaceState } from './race/race-state.js';
import { initCountdown }  from './race/countdown.js';
import { stepPlayer }     from './physics/vehicle-physics.js';
import { stepAI }         from './race/ai-driver.js';
import { resolveCarCollisions, checkBoostPads } from './physics/collision.js';
import { updateCamera }   from './core/camera.js';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

applyDeviceClasses();

const renderer = initRenderer(isMobileDevice);
const scene    = initScene(renderer);
const camera   = initCamera();

resizeRenderer(renderer, camera);
window.addEventListener('resize', () => resizeRenderer(renderer, camera));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => resizeRenderer(renderer, camera));
}

// Track and car configuration loading
(async () => {
  // Outer closure variables updated on every race start
  let samplePts = [], sampleTangents = [], curvature = new Float32Array(0);
  let SAMPLES = 0, ROAD_W = 0, BOOST_PAD_IDX = [];
  let trackGroup = new THREE.Group();
  scene.add(trackGroup);

  // Load every registered track and car up front so the setup screen has names/stats ready.
  const trackDefs = await Promise.all(getTrackIds().map(loadTrack));
  const carDefs = await Promise.all(getCarIds().map(loadCar));

  // Start downloading/decoding any model-based car (e.g. Viper-X's glTF) ahead of time
  carDefs.forEach(preloadCarModel);

  let selectedTrackId = getTrackIds()[0];
  let selectedCarDef = carDefs[0];
  let selectedColorPreset = null;

  let playerMesh = null;
  const aiMeshes = [];
  let player, aiCars, allCars, input;

  // Build function called on START RACE
  const buildGameScene = async () => {
    // 1. Rebuild track mesh
    scene.remove(trackGroup);
    trackGroup = new THREE.Group();
    scene.add(trackGroup);

    const activeTrackDef = await loadTrack(selectedTrackId);
    const buildResult = buildTrackMesh(trackGroup, activeTrackDef);
    samplePts = buildResult.samplePts;
    sampleTangents = buildResult.sampleTangents;
    curvature = buildResult.curvature;
    SAMPLES = buildResult.SAMPLES;
    ROAD_W = buildResult.ROAD_W;
    BOOST_PAD_IDX = buildResult.BOOST_PAD_IDX;

    // 2. Clear old vehicle meshes from scene
    if (playerMesh) scene.remove(playerMesh);
    aiMeshes.forEach(mesh => scene.remove(mesh));
    aiMeshes.length = 0;

    // 3. Build player car using final resolved paint colors (Factory or Custom Preset)
    const finalPrimary = (selectedColorPreset && selectedColorPreset.primary !== null)
      ? selectedColorPreset.primary
      : selectedCarDef.color;
    const finalAccent = (selectedColorPreset && selectedColorPreset.accent !== null)
      ? selectedColorPreset.accent
      : selectedCarDef.accentColor;

    playerMesh = await createCarMesh(selectedCarDef, finalPrimary, finalAccent, 1);
    scene.add(playerMesh);
    player = makeCarState(playerMesh, finalPrimary, samplePts, sampleTangents, BOOST_PAD_IDX, undefined, selectedCarDef.stats);

    // 4. Build AI cars
    const aiColors = [0xff2e9a, 0xffb020, 0x8aff4d];
    aiCars = await Promise.all(aiColors.map(async (color, idx) => {
      const aiCarDef = carDefs[(idx + 1) % carDefs.length];
      const mesh = await createCarMesh(aiCarDef, color, 0x1a1a1a, idx + 2);
      scene.add(mesh);
      aiMeshes.push(mesh);
      return makeCarState(mesh, color, samplePts, sampleTangents, BOOST_PAD_IDX, idx, aiCarDef.stats);
    }));
    allCars = [player, ...aiCars];

    // Update minimap sizes and bounds
    initMinimap(samplePts);
  };

  // Initialize setup screen pickers
  initTrackSelect({
    tracks: trackDefs,
    trackIds: getTrackIds(),
    onSelect: (trackId) => { selectedTrackId = trackId; },
  });

  initCarSelect({
    cars: carDefs,
    onSelect: (car) => {
      selectedCarDef = car;
      updateFactoryOptionColors(car);
    },
  });

  initColorSelect({
    onSelect: (preset) => { selectedColorPreset = preset; },
  });

  // Align factory swatch paint to starting car selection
  updateFactoryOptionColors(selectedCarDef);

  // Build default track layout on page load for background display
  const initialTrackDef = trackDefs[0];
  const initialResult = buildTrackMesh(trackGroup, initialTrackDef);
  samplePts = initialResult.samplePts;
  sampleTangents = initialResult.sampleTangents;
  curvature = initialResult.curvature;
  SAMPLES = initialResult.SAMPLES;
  ROAD_W = initialResult.ROAD_W;
  BOOST_PAD_IDX = initialResult.BOOST_PAD_IDX;

  let gameBuilt = false;
  let hudInitialized = false;

  initOverlay({
    onStartEngine: async () => {
      showSetupScreen();
    },
    onStart: async () => {
      // Show loading screen while compiling track and vehicle meshes
      showLoading('Preparing Circuit & Vehicles...');
      await buildGameScene();
      hideLoading();

      // 5. Particles (initialized once)
      if (!gameBuilt) {
        initParticles(scene);
      }

      // 6. Input (initialized once)
      if (!input) {
        input = { left:false, right:false, gas:false, brake:false, drift:false, boost:false, steer:0, steerActive:false };
        initKeyboard(input);
        if (isMobileDevice) {
          initJoystick(input);
          initActionBtns(input);
        }
      }

      // 7. HUD
      if (!hudInitialized) {
        initHUD();
        hudInitialized = true;
      }

      // 8. Race State
      initRaceState(allCars, player, samplePts, sampleTangents, SAMPLES, BOOST_PAD_IDX);

      // 9. Hand off to loop (called once)
      if (!gameBuilt) {
        gameBuilt = true;

        startLoop((dt) => {
          const { raceStarted, raceOver } = getRaceState();

          if (raceStarted && !raceOver) {
            stepPlayer(player, input, samplePts, sampleTangents, SAMPLES, ROAD_W, BOOST_PAD_IDX, dt);
            aiCars.forEach(c => stepAI(c, allCars, samplePts, sampleTangents, curvature, SAMPLES, dt));
            resolveCarCollisions(allCars, player);
            checkBoostPads(allCars, samplePts, SAMPLES, BOOST_PAD_IDX);
            tickRace(dt);
            updateHUD(player, allCars, dt);
            drawMinimap(allCars, player);
          }

          updateParticles(dt);
          updateCamera(camera, player, dt);
          updateAudio(player, raceStarted, raceOver, input);

          renderer.render(scene, camera);
        });
      }

      if (!window._audioReady) { initAudio(); window._audioReady = true; }
      resetRaceState();
      resetHUDTimer();
      initCountdown(() => stepRace(true));
    },
  });
})();