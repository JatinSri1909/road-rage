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

// ── Physics defaults (used as a fallback if a car has no stats attached) ──────
// Real values now come from each car's own stats.js (see content/cars/*/stats.js),
// read from `player.stats` at the top of stepPlayer(). These constants stay as
// the safety fallback and are what audio.js uses for its speed normalisation.
export const CAR_MAX_SPEED    = 42;
export const CAR_MAX_REVERSE  = 12;
export const CAR_ACCEL        = 22;
export const CAR_REVERSE_ACCEL = 16;
export const CAR_BRAKE        = 34;
export const CAR_DRAG         = 5.2;
export const CAR_MAX_TURN     = 2.5;
export const GRIP_NORMAL      = 9.0;
export const GRIP_DRIFT       = 1.7;

export const DEFAULT_STATS = {
  maxSpeed:     CAR_MAX_SPEED,
  maxReverse:   CAR_MAX_REVERSE,
  accel:        CAR_ACCEL,
  reverseAccel: CAR_REVERSE_ACCEL,
  brake:        CAR_BRAKE,
  drag:         CAR_DRAG,
  maxTurn:      CAR_MAX_TURN,
  gripNormal:   GRIP_NORMAL,
  gripDrift:    GRIP_DRIFT,
};

// Nitro boost multipliers — applied on top of whichever car's own stats are active.
export const BOOST_SPEED_MULTIPLIER = 1.28;
export const BOOST_ACCEL_MULTIPLIER = 1.7;

/** Real top speed in km/h for a given car's stats, including nitro boost. */
export function getTopSpeedKmh(stats) {
  return (stats || DEFAULT_STATS).maxSpeed * BOOST_SPEED_MULTIPLIER * 3.6;
}

const UP = new THREE.Vector3(0, 1, 0);

// Reusable scratch vectors to avoid per-frame GC pressure
const _forwardDir  = new THREE.Vector3();
const _rightDir    = new THREE.Vector3();
const _rightV      = new THREE.Vector3();
const _rel         = new THREE.Vector3();
const _rearL       = new THREE.Vector3();
const _rearR       = new THREE.Vector3();
const _rear        = new THREE.Vector3();
const _velScratch  = new THREE.Vector3();
const _velScratch2 = new THREE.Vector3();
const _velScratch3 = new THREE.Vector3();

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
  const s = c.stats || DEFAULT_STATS; // per-car physics parameters
  const forwardDir = _forwardDir.set(Math.sin(c.heading), 0, Math.cos(c.heading));
  const rightDir   = _rightDir.set(Math.cos(c.heading), 0, -Math.sin(c.heading));

  let vF = c.velocity.dot(forwardDir);
  let vR = c.velocity.dot(rightDir);

  const boosting = input.boost && c.nitro > 0;

  // Steering input: joystick axis takes priority over keyboard fallback
  const steerInput = input.steerActive
    ? input.steer
    : (input.left ? 1 : 0) - (input.right ? 1 : 0);

  // Longitudinal acceleration
  let accel = 0;
  if (input.gas)   accel += s.accel * (boosting ? BOOST_ACCEL_MULTIPLIER : 1);
  if (input.brake) accel += (vF > 1 ? -s.brake : -s.reverseAccel);
  vF += accel * dt;
  vF -= Math.sign(vF) * (s.drag * 0.5 + Math.abs(vF) * 0.03) * dt;
  if (Math.abs(vF) < 0.05) vF = 0;
  vF = THREE.MathUtils.clamp(vF, -s.maxReverse, s.maxSpeed * (boosting ? BOOST_SPEED_MULTIPLIER : 1));

  // Lateral grip
  const grip = input.drift ? s.gripDrift : s.gripNormal;
  vR -= vR * Math.min(1, grip * dt);

  // Steering
  const speedFactor = THREE.MathUtils.clamp(Math.abs(vF) / 7, 0, 1);
  const turnDir     = vF >= 0 ? 1 : -1;
  const turnRate    = s.maxTurn * speedFactor * (input.drift ? 1.3 : 1);
  c.heading += steerInput * turnRate * dt * turnDir;

  // Integrate position
  c.velocity.copy(forwardDir).multiplyScalar(vF).addScaledVector(rightDir, vR);
  c.pos.addScaledVector(c.velocity, dt);

  // Track bounds: the curb is drivable-over (slows the car like rough
  // ground) — only the guardrail beyond it is a solid, impassable wall.
  const { idx } = nearestSampleIdx(c.pos, c.lastSampleIdx, samplePts, SAMPLES);
  const centerP  = samplePts[idx];
  const tang     = sampleTangents[idx];
  const rightV   = _rightV.crossVectors(tang, UP).normalize();
  const rel      = _rel.set(c.pos.x - centerP.x, 0, c.pos.z - centerP.z);
  const lateral  = rel.dot(rightV);
  const absLat   = Math.abs(lateral);

  const CAR_HALF_WIDTH = 1.0; // approx. half the car's physical footprint

const roadHalf     = ROAD_W / 2;
const curbOuter     = roadHalf + 0.9;               // matches buildCurbRibbon's outer edge
const guardrailLat  = roadHalf + 1.2;               // must match track-builder.js's guardrail dist
const wallLat       = guardrailLat - CAR_HALF_WIDTH; // stop the car's BODY before the rail, not its centre

if (absLat > roadHalf) {
  const offRoadT = THREE.MathUtils.clamp((absLat - roadHalf) / (curbOuter - roadHalf), 0, 1);
  c.velocity.multiplyScalar(1 - offRoadT * 0.6 * Math.min(1, dt * 6));
}

if (absLat > wallLat) {
  // Hard boundary — clamps the car's centre so its body can never reach the
  // guardrail mesh, avoiding any visual intersection.
  const clamped = THREE.MathUtils.clamp(lateral, -wallLat, wallLat);
  c.pos.x = centerP.x + rightV.x * clamped;
  c.pos.z = centerP.z + rightV.z * clamped;

  // Only cancel the velocity component pushing further INTO the wall —
  // forward/tangential speed is untouched. This is what actually fixes the
  // "stuck, have to reverse" feeling: the old code multiplied the WHOLE
  // velocity by 0.55 every single frame in contact, which compounds to
  // near-zero in a few frames. This only kills the outward component once
  // per frame, so the car can still drive along the rail at speed.
  const outward = c.velocity.dot(rightV) * Math.sign(lateral);
  if (outward > 0) c.velocity.addScaledVector(rightV, -outward * Math.sign(lateral));

  const hitSpeed = c.velocity.length();
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
    const rearL = _rearL.copy(c.pos).addScaledVector(forwardDir, -1.5).addScaledVector(rightDir, -0.85).setY(0.35);
    const rearR = _rearR.copy(c.pos).addScaledVector(forwardDir, -1.5).addScaledVector(rightDir,  0.85).setY(0.35);
    spawnParticle(rearL, 0xbbbbbb, 0.6, 0.7, _velScratch.copy(forwardDir).multiplyScalar(-1.5).addScaledVector(rightDir, -0.6), 1.4);
    spawnParticle(rearR, 0xbbbbbb, 0.6, 0.7, _velScratch2.copy(forwardDir).multiplyScalar(-1.5).addScaledVector(rightDir, 0.6), 1.4);
  }

  // Boost exhaust
  if (boosting) {
    const rear = _rear.copy(c.pos).addScaledVector(forwardDir, -2.1).setY(0.4);
    spawnParticle(rear, Math.random() < 0.5 ? 0x00e5ff : 0xff2e9a, 0.4, 0.35, _velScratch3.copy(forwardDir).multiplyScalar(-6), 0.5);
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