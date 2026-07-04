/**
 * Owns the single source of truth for whether the race is running.
 * The main loop reads `raceStarted` / `raceOver` via `getRaceState()`.
 *
 * Key invariant — the `crossedHalfway` flag:
 *   A lap increment is only valid when the car has previously passed the
 *   halfway marker (sample ~240/480). Without this guard, a car that
 *   spawns near index 0 would immediately count a lap. AI cars are
 *   initialised with crossedHalfway = true because they spawn behind
 *   the start line (high sample indices).
 */

import * as THREE from 'three';
import { computeRank, ordinal } from './ranking.js';

// ─── Module state ─────────────────────────────────────────────────────────────

let _allCars   = [];
let _player    = null;
let _samplePts = [];
let _sampleTangents = [];
let _SAMPLES   = 0;
let _BOOST_PAD_IDX = [];

let _raceStarted = false;
let _raceOver    = false;
let _raceTime    = 0;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Call once before the race loop begins. Stores references used by
 * updateLapProgress and checkFinish.
 */
export function initRaceState(allCars, player, samplePts, sampleTangents, SAMPLES, BOOST_PAD_IDX) {
  _allCars         = allCars;
  _player          = player;
  _samplePts       = samplePts;
  _sampleTangents  = sampleTangents;
  _SAMPLES         = SAMPLES;
  _BOOST_PAD_IDX   = BOOST_PAD_IDX;
  _raceStarted     = false;
  _raceOver        = false;
  _raceTime        = 0;
}

/** Enable / disable the race clock (called by countdown.js). */
export function stepRace(started) {
  _raceStarted = started;
}

/** Read-only snapshot for the main loop. */
export function getRaceState() {
  return { raceStarted: _raceStarted, raceOver: _raceOver, raceTime: _raceTime };
}

/**
 * Advance race timer and check for race-end condition.
 * Called every frame from the main loop when raceStarted && !raceOver.
 * @param {number} dt — delta time in seconds
 */
export function tickRace(dt) {
  if (!_raceStarted || _raceOver) return;
  _raceTime += dt;
  checkFinish(_player);
}

/**
 * Update a car's lap counter and track progress index.
 * Called by vehicle-physics.js (player) and ai-driver.js (AI) every frame.
 *
 * @param {object} car
 * @param {THREE.Vector3[]} samplePts
 * @param {THREE.Vector3[]} sampleTangents
 * @param {number} SAMPLES
 */
export function updateLapProgress(car, samplePts, sampleTangents, SAMPLES) {
  const { idx } = _nearestSampleIdx(car.pos, car.lastSampleIdx, samplePts, SAMPLES);
  car.maxSampleIdx = Math.max(car.maxSampleIdx, idx);

  // Mark halfway crossing (guard against immediate lap-count at spawn)
  if (idx > SAMPLES * 0.4 && idx < SAMPLES * 0.6) {
    car.crossedHalfway = true;
  }

  // Detect crossing the finish line (sample 0 region after having passed halfway)
  if (car.lastSampleIdx > SAMPLES * 0.75 && idx < SAMPLES * 0.15 && car.crossedHalfway) {
    if (!car.finished) {
      car.lap += 1;
      car.crossedHalfway = false;
      car.maxSampleIdx = idx;
      if (car.lap > 3) {
        car.finished   = true;
        car.finishTime = _raceTime;
        car.lap        = 3;
      }
    }
  }

  car.lastSampleIdx = idx;
  car.trackIdx      = idx;

  // For ranking: display progress resets to 0 if car hasn't passed halfway yet
  let displayIdx = idx;
  if (!car.crossedHalfway && idx > SAMPLES * 0.5) displayIdx = 0;
  car.progress = (car.lap - 1) * SAMPLES + displayIdx;
}

/** Check whether the player has finished and trigger the finish screen. */
export function checkFinish(player) {
  if (!player.finished || _raceOver) return;
  _raceOver = true;

  const rank = computeRank(player, _allCars);
  const mins = Math.floor(_raceTime / 60);
  const secs = (_raceTime % 60).toFixed(1).padStart(4, '0');

  const finishStats = document.getElementById('finishStats');
  if (finishStats) {
    finishStats.innerHTML = `
      <div style="font-family:'Orbitron',sans-serif;font-size:24px;color:#00e5ff;">
        FINISHED ${ordinal(rank)}
      </div>
      <div>TIME ${String(mins).padStart(2, '0')}:${secs}</div>`;
  }

  setTimeout(() => {
    const overlay  = document.getElementById('overlay');
    const hud      = document.getElementById('hud');
    const startBtn = document.getElementById('startBtn');
    if (overlay)  overlay.classList.remove('hidden');
    if (hud)      hud.classList.add('hidden');
    if (startBtn) startBtn.textContent = 'RACE AGAIN';
  }, 1400);
}

/** Reset all cars and timer back to initial spawn grid values */
export function resetRaceState() {
  _raceTime = 0;
  _raceOver = false;
  _raceStarted = false;

  const player = _player;
  if (player) {
    player.pos.copy(_samplePts[0]);
    player.lastSampleIdx = 0;
    player.maxSampleIdx = 0;
    player.trackIdx = 0;
    player.progress = 0;
    player.heading = Math.atan2(_sampleTangents[0].x, _sampleTangents[0].z);
    if (player.velocity) player.velocity.set(0, 0, 0);
    player.speed = 0;
    player.lap = 1;
    player.finished = false;
    player.finishTime = 0;
    player.nitro = 100;
    player.boosting = false;
    player.crossedHalfway = false;
    player.padFlags.fill(false);

    player.mesh.position.set(player.pos.x, 0, player.pos.z);
    player.mesh.rotation.set(0, player.heading, 0);
  }

  const aiCars = _allCars.slice(1);
  aiCars.forEach((st, idx) => {
    const back = (idx + 1) * 4;
    const spawnIdx = (_samplePts.length - back * 2 + _samplePts.length) % _samplePts.length;
    st.pos.copy(_samplePts[spawnIdx]);
    st.lastSampleIdx = spawnIdx;
    st.maxSampleIdx = spawnIdx;
    st.trackIdx = spawnIdx;
    st.progress = 0;
    st.heading = Math.atan2(_sampleTangents[spawnIdx].x, _sampleTangents[spawnIdx].z);
    st.speed = 0;
    st.lap = 0;
    st.finished = false;
    st.finishTime = 0;
    st.nitro = 100;
    st.boosting = false;
    st.crossedHalfway = true;
    st.laneOffset = (idx - 1) * 3.0;
    st.laneOffsetTarget = st.laneOffset;
    st.laneTimer = Math.random() * 2;
    st.padFlags.fill(false);

    st.mesh.position.set(st.pos.x, 0, st.pos.z);
    st.mesh.rotation.set(0, st.heading, 0);
  });
}


/** Windowed nearest-sample search. Same algorithm as vehicle-physics.js. */
function _nearestSampleIdx(pos, startGuess, samplePts, SAMPLES, window = 40) {
  let best = -1, bestD = Infinity;
  for (let d = -window; d <= window; d++) {
    const idx = ((startGuess + d) % SAMPLES + SAMPLES) % SAMPLES;
    const p   = samplePts[idx];
    const dx  = p.x - pos.x, dz = p.z - pos.z;
    const dist = dx * dx + dz * dz;
    if (dist < bestD) { bestD = dist; best = idx; }
  }
  return { idx: best, dist: Math.sqrt(bestD) };
}
