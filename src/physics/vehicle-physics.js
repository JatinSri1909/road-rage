/**
 * Uses a velocity vector split into forward/lateral components with
 * separate grip coefficients for normal driving and drifting.
 * AI uses a simpler speed scalar model in race/ai-driver.js.
 *
 * Exported constants are read by audio.js and the HUD.
 */

import * as THREE from 'three';
import { triggerShake } from '../core/camera.js';
import { spawnParticle } from '../effects/particles.js';
import { updateLapProgress } from '../race/race-state.js';

// ── Physics constants (sourced from content/cars/phoenix-gt/stats.js at runtime)
// These are re-exported so audio.js can normalise speed without importing stats.
export const CAR_MAX_SPEED    = 42;
export const CAR_MAX_REVERSE  = 12;
export const CAR_ACCEL        = 22;
export const CAR_REVERSE_ACCEL = 16;
export const CAR_BRAKE        = 34;
export const CAR_DRAG         = 5.2;
export const CAR_MAX_TURN     = 2.5;
export const GRIP_NORMAL      = 9.0;
export const GRIP_DRIFT       = 1.7;

// TODO: in a future refactor, read these from car.stats instead of hard-coding.
// For now they match phoenix-gt/stats.js exactly.

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Advance player physics by one frame.
 * Mutates player state in-place.
 *
 * @param {object}   player
 * @param {object}   input
 * @param {THREE.Vector3[]} samplePts
 * @param {THREE.Vector3[]} sampleTangents
 * @param {number}   SAMPLES
 * @param {number}   ROAD_W
 * @param {number[]} BOOST_PAD_IDX
 * @param {number}   dt   Delta time (seconds)
 */
export function stepPlayer(player, input, samplePts, sampleTangents, SAMPLES, ROAD_W, BOOST_PAD_IDX, dt) {
  const c = player;
  const forwardDir = new THREE.Vector3(Math.sin(c.heading), 0, Math.cos(c.heading));
  const rightDir   = new THREE.Vector3(Math.cos(c.heading), 0, -Math.sin(c.heading));

  let vF = c.velocity.dot(forwardDir);
  let vR = c.velocity.dot(rightDir);

  const boosting = input.boost && c.nitro > 0;

  // Steering input: joystick axis takes priority over keyboard fallback
  const steerInput = input.steerActive
    ? input.steer
    : (input.left ? 1 : 0) - (input.right ? 1 : 0);

  // Longitudinal acceleration
  let accel = 0;
  if (input.gas)   accel += CAR_ACCEL * (boosting ? 1.7 : 1);
  if (input.brake) accel += (vF > 1 ? -CAR_BRAKE : -CAR_REVERSE_ACCEL);
  vF += accel * dt;
  vF -= Math.sign(vF) * (CAR_DRAG * 0.5 + Math.abs(vF) * 0.03) * dt;
  if (Math.abs(vF) < 0.05) vF = 0;
  vF = THREE.MathUtils.clamp(vF, -CAR_MAX_REVERSE, CAR_MAX_SPEED * (boosting ? 1.28 : 1));

  // Lateral grip
  const grip = input.drift ? GRIP_DRIFT : GRIP_NORMAL;
  vR -= vR * Math.min(1, grip * dt);

  // Steering
  const speedFactor = THREE.MathUtils.clamp(Math.abs(vF) / 7, 0, 1);
  const turnDir     = vF >= 0 ? 1 : -1;
  const turnRate    = CAR_MAX_TURN * speedFactor * (input.drift ? 1.3 : 1);
  c.heading += steerInput * turnRate * dt * turnDir;

  // Integrate position
  c.velocity.copy(forwardDir).multiplyScalar(vF).addScaledVector(rightDir, vR);
  c.pos.addScaledVector(c.velocity, dt);

  // Clamp to track bounds
  const { idx } = nearestSampleIdx(c.pos, c.lastSampleIdx, samplePts, SAMPLES);
  const centerP  = samplePts[idx];
  const tang     = sampleTangents[idx];
  const rightV   = new THREE.Vector3().crossVectors(tang, UP).normalize();
  const rel      = new THREE.Vector3(c.pos.x - centerP.x, 0, c.pos.z - centerP.z);
  const lateral  = rel.dot(rightV);
  const maxLat   = ROAD_W / 2 - 1.1;
  if (lateral > maxLat || lateral < -maxLat) {
    const clamped = THREE.MathUtils.clamp(lateral, -maxLat, maxLat);
    c.pos.x = centerP.x + rightV.x * clamped;
    c.pos.z = centerP.z + rightV.z * clamped;
    const hitSpeed = c.velocity.length();
    c.velocity.multiplyScalar(0.32);
    if (hitSpeed > 9) triggerShake(0.28, Math.min(0.35, hitSpeed * 0.012));
  }

  // Update mesh transform
  c.speed = vF;
  c.mesh.position.set(c.pos.x, 0, c.pos.z);
  c.mesh.rotation.y = c.heading;
  c.mesh.userData.wheels.forEach(w => (w.rotation.x -= vF * dt * 0.6));
  const tilt = -steerInput * speedFactor * (input.drift ? 0.1 : 0.06);
  c.mesh.rotation.z = THREE.MathUtils.lerp(c.mesh.rotation.z, tilt, 0.2);

  // Nitro
  if (boosting) c.nitro = Math.max(0, c.nitro - 42 * dt);
  else          c.nitro = Math.min(100, c.nitro + 9 * dt);
  c.boosting = boosting;

  // Drift smoke
  if (input.drift && Math.abs(vR) > 2.2 && Math.abs(vF) > 4) {
    const rearL = c.pos.clone().addScaledVector(forwardDir, -1.5).addScaledVector(rightDir, -0.85).setY(0.35);
    const rearR = c.pos.clone().addScaledVector(forwardDir, -1.5).addScaledVector(rightDir,  0.85).setY(0.35);
    spawnParticle(rearL, 0xbbbbbb, 0.6, 0.7, forwardDir.clone().multiplyScalar(-1.5).add(rightDir.clone().multiplyScalar(-0.6)), 1.4);
    spawnParticle(rearR, 0xbbbbbb, 0.6, 0.7, forwardDir.clone().multiplyScalar(-1.5).add(rightDir.clone().multiplyScalar( 0.6)), 1.4);
  }

  // Boost exhaust
  if (boosting) {
    const rear = c.pos.clone().addScaledVector(forwardDir, -2.1).setY(0.4);
    spawnParticle(rear, Math.random() < 0.5 ? 0x00e5ff : 0xff2e9a, 0.4, 0.35, forwardDir.clone().multiplyScalar(-6), 0.5);
  }

  updateLapProgress(c, samplePts, sampleTangents, SAMPLES);
}

// ─── Shared helper (also used by collisions.js and ai-driver.js) ──────────────

/**
 * Returns the index of the nearest spline sample to `pos` within a search
 * window centred on `startGuess`. O(window) not O(SAMPLES).
 */
export function nearestSampleIdx(pos, startGuess, samplePts, SAMPLES, window = 40) {
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