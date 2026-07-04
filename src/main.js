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

import { isMobileDevice, applyDeviceClasses } from './core/device.js';
import { initRenderer, resizeRenderer }         from './core/renderer.js';
import { initScene }                            from './core/scene.js';
import { initCamera }                           from './core/camera.js';
import { initAudio, updateAudio }               from './core/audio.js';
import { startLoop }                            from './core/loop.js';

import { loadTrack }   from './content/tracks/index.js';
import { loadCar }     from './content/cars/index.js';

import { buildTrackMesh }  from './entities/track-builder.js';
import { createCarMesh }   from './entities/car.js';
import { makeCarState }    from './entities/car.js';

import { initParticles, updateParticles } from './effects/particles.js';

import { initKeyboard }    from './ui/controls/keyboard-input.js';
import { initJoystick }    from './ui/controls/touch-joystick.js';
import { initActionBtns }  from './ui/controls/action-buttons.js';

import { initHUD, updateHUD, resetHUDTimer }     from './ui/hud.js';
import { initMinimap, drawMinimap } from './ui/minimap.js';
import { initOverlay }             from './ui/overlay.js';

import { initRaceState, stepRace, checkFinish, getRaceState, resetRaceState } from './race/race-state.js';
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

// Track — default to sunset-grid; future: swap via menu selection
const trackDef = await loadTrack('sunset-grid');
const { samplePts, sampleTangents, curvature, SAMPLES, ROAD_W, BOOST_PAD_IDX } =
  buildTrackMesh(scene, trackDef);

// Cars
const playerCarDef = await loadCar('phoenix-gt');
const playerMesh   = createCarMesh(playerCarDef, 0x00e5ff, 0x0a2530, 1);
scene.add(playerMesh);
const player = makeCarState(playerMesh, 0x00e5ff, samplePts, sampleTangents, BOOST_PAD_IDX);

const aiColors  = [0xff2e9a, 0xffb020, 0x8aff4d];
const aiCarDef  = await loadCar('phoenix-gt');
const aiCars    = aiColors.map((color, idx) => {
  const mesh = createCarMesh(aiCarDef, color, 0x1a1a1a, idx + 2);
  scene.add(mesh);
  const st = makeCarState(mesh, color, samplePts, sampleTangents, BOOST_PAD_IDX, idx);
  return st;
});
const allCars = [player, ...aiCars];

// Particles
initParticles(scene);

// Input
const input = { left:false, right:false, gas:false, brake:false, drift:false, boost:false, steer:0, steerActive:false };
initKeyboard(input);
if (isMobileDevice) {
  initJoystick(input);
  initActionBtns(input);
}

// HUD + Minimap
initHUD();
initMinimap(samplePts);

// Race
initRaceState(allCars, player, samplePts, sampleTangents, SAMPLES, BOOST_PAD_IDX);

// Overlay / start button
initOverlay({
  onStart: async () => {
    if (!window._audioReady) { initAudio(); window._audioReady = true; }
    resetRaceState();
    resetHUDTimer();
    initCountdown(() => stepRace(true));
  },
});

// ─── Main loop ────────────────────────────────────────────────────────────────

startLoop((dt) => {
  const { raceStarted, raceOver } = getRaceState();

  if (raceStarted && !raceOver) {
    stepPlayer(player, input, samplePts, sampleTangents, SAMPLES, ROAD_W, BOOST_PAD_IDX, dt);
    aiCars.forEach(c => stepAI(c, allCars, samplePts, sampleTangents, curvature, SAMPLES, dt));
    resolveCarCollisions(allCars, player);
    checkBoostPads(allCars, samplePts, SAMPLES, BOOST_PAD_IDX);
    checkFinish(player);
    updateHUD(player, allCars, dt);
    drawMinimap(allCars, player);
  }

  updateParticles(dt);
  updateCamera(camera, player, dt);
  updateAudio(player, raceStarted, raceOver, input);

  renderer.render(scene, camera);
});