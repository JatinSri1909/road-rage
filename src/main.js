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
import { initOverlay }             from './ui/overlay.js';
import { initCarSelect }           from './ui/car-select.js';

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

// Track — default to sunset-grid; future: swap via menu selection
(async () => {
  const trackDef = await loadTrack('sunset-grid');
  const { samplePts, sampleTangents, curvature, SAMPLES, ROAD_W, BOOST_PAD_IDX } =
    buildTrackMesh(scene, trackDef);

  // Load every registered car up front so the picker has names/stats ready.
  // Adding a new car is purely a content/cars/ change — nothing here needs
  // to know how many cars exist.
  const carDefs = await Promise.all(getCarIds().map(loadCar));

  // Start downloading/decoding any model-based car (e.g. Viper-X's glTF)
  // right away, while the player is still on the car-select screen — so by
  // the time they hit Start, createCarMesh() hits the cache instead of
  // blocking on a fresh fetch + Draco decode.
  carDefs.forEach(preloadCarModel);

  let selectedCarDef = carDefs[0];
  initCarSelect({
    cars: carDefs,
    onSelect: (car) => { selectedCarDef = car; },
  });

  // Player/AI/HUD/loop are built once, the first time the player hits Start —
  // by then `selectedCarDef` reflects whatever they actually picked.
  let gameBuilt = false;
  let player, aiCars, allCars, input;

  initOverlay({
    onStart: async () => {
      if (!gameBuilt) {
        gameBuilt = true;
        document.getElementById('carSelect')?.classList.add('hidden');

        // Player — uses whichever car was selected in the garage screen,
        // including that car's own paint/accent colors. createCarMesh is
        // async because model-based cars (e.g. Viper-X) load a glTF file.
        const playerMesh = await createCarMesh(selectedCarDef, selectedCarDef.color, selectedCarDef.accentColor, 1);
        scene.add(playerMesh);
        player = makeCarState(playerMesh, selectedCarDef.color, samplePts, sampleTangents, BOOST_PAD_IDX, undefined, selectedCarDef.stats);

        // AI — distribute different registered cars to make the race look diverse.
        const aiColors = [0xff2e9a, 0xffb020, 0x8aff4d];
        aiCars = await Promise.all(aiColors.map(async (color, idx) => {
          const aiCarDef = carDefs[(idx + 1) % carDefs.length];
          const mesh = await createCarMesh(aiCarDef, color, 0x1a1a1a, idx + 2);
          scene.add(mesh);
          return makeCarState(mesh, color, samplePts, sampleTangents, BOOST_PAD_IDX, idx, aiCarDef.stats);
        }));
        allCars = [player, ...aiCars];

        // Particles
        initParticles(scene);

        // Input
        input = { left:false, right:false, gas:false, brake:false, drift:false, boost:false, steer:0, steerActive:false };
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

        // ─── Main loop (started once, first Start click only) ──────────────────

        startLoop((dt) => {
          const { raceStarted, raceOver } = getRaceState();

          if (raceStarted && !raceOver) {
            stepPlayer(player, input, samplePts, sampleTangents, SAMPLES, ROAD_W, BOOST_PAD_IDX, dt);
            aiCars.forEach(c => stepAI(c, allCars, samplePts, sampleTangents, curvature, SAMPLES, dt));
            resolveCarCollisions(allCars, player);
            checkBoostPads(allCars, samplePts, SAMPLES, BOOST_PAD_IDX);
            tickRace(dt); // advances the race clock AND checks player finish — this was missing, so finishTime was always 0
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