/**
 * Owns all DOM reads/writes for the racing HUD (lap counter, timer,
 * position, speedometer needle, nitro bar). Minimap is handled
 * separately in minimap.js.
 *
 * initHUD() caches element references once.
 * updateHUD(player, allCars, dt) is called every frame.
 */

import * as THREE from 'three';
import { computeRank, ordinal } from '../race/ranking.js';
import { getTopSpeedKmh, DEFAULT_STATS } from '../physics/vehicle-physics.js';

// Cached DOM references
let lapNumEl, posLineEl, timeNumEl, needleEl, speedNumEl, nitroFillEl;
let _raceTime = 0;

export function initHUD() {
  lapNumEl    = document.getElementById('lapNum');
  posLineEl   = document.getElementById('posLineText');
  timeNumEl   = document.getElementById('timeNum');
  needleEl    = document.getElementById('needle');
  speedNumEl  = document.getElementById('speedNum');
  nitroFillEl = document.getElementById('nitroFill');
}

/**
 * @param {object}   player
 * @param {object[]} allCars
 * @param {number}   dt
 */
export function updateHUD(player, allCars, dt) {
  _raceTime += dt;

  // Lap counter
  if (lapNumEl) lapNumEl.textContent = Math.min(player.lap, 3);

  // Race timer
  if (timeNumEl) {
    const mins = Math.floor(_raceTime / 60);
    const secs = (_raceTime % 60).toFixed(1).padStart(4, '0');
    timeNumEl.textContent = `${String(mins).padStart(2, '0')}:${secs}`;
  }

  // Position
  if (posLineEl) posLineEl.textContent = ordinal(computeRank(player, allCars));

  // Speedometer — gauge max matches this car's real top speed (with nitro boost),
  // so faster cars actually show a higher reading instead of clipping at 150.
  const topSpeedKmh   = getTopSpeedKmh(player.stats || DEFAULT_STATS);
  const kmh           = Math.abs(player.speed) * 3.6;
  const displaySpeed  = Math.min(Math.round(kmh), Math.round(topSpeedKmh));
  if (speedNumEl) speedNumEl.textContent = displaySpeed;

  const frac  = THREE.MathUtils.clamp(displaySpeed / topSpeedKmh, 0, 1);
  const angle = -120 + frac * 240;
  if (needleEl) needleEl.style.transform = `translateX(-50%) rotate(${angle}deg)`;

  // Nitro bar
  if (nitroFillEl) nitroFillEl.style.width = player.nitro + '%';
}

/** Reset the internal race timer (called when a new race begins). */
export function resetHUDTimer() {
  _raceTime = 0;
}