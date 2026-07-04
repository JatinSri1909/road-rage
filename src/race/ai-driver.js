/**
 * Each AI car tracks the spline with a lookahead target point and uses
 * rubber-banding to stay competitive with the player. Lane weaving is
 * handled via a periodic timer to add variety and prevent convoys.
 *
 * AI cars do NOT use the full velocity-vector model (see vehicle-physics.js).
 * They drive on rails: heading is steered toward a lookahead point,
 * speed is a lerped scalar. This is intentional — it's cheaper and
 * controllable enough for a 3-car field.
 *
 * Rubber-band tuning history (don't blindly tighten):
 *   gap / 1400 felt fair at baseSpeed ≈ 35–44. Below /1000 they feel
 *   magnetic; above /2000 they fall too far behind on straights.
 */

import * as THREE from 'three';
import { nearestSampleIdx } from '../physics/vehicle-physics.js';
import { updateLapProgress } from './race-state.js';
import { spawnParticle } from '../effects/particles.js';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Advance a single AI car's state by one frame.
 * Mutates `car` in-place.
 *
 * @param {object}        car
 * @param {object[]}      allCars        — used for blocking detection
 * @param {THREE.Vector3[]} samplePts
 * @param {THREE.Vector3[]} sampleTangents
 * @param {Float32Array}  curvature      — pre-computed per-sample curvature
 * @param {number}        SAMPLES
 * @param {number}        dt             — delta time in seconds
 */
export function stepAI(car, allCars, samplePts, sampleTangents, curvature, SAMPLES, dt) {
  if (car.finished) return;

  const { idx } = nearestSampleIdx(car.pos, car.lastSampleIdx, samplePts, SAMPLES);

  // ── Lane weave ────────────────────────────────────────────────────────────
  car.laneTimer -= dt;
  if (car.laneTimer <= 0) {
    car.laneTimer = 1.4 + Math.random() * 1.6;

    // Check if a car ahead is blocking the current lane
    let blocked = false;
    allCars.forEach(other => {
      if (other === car) return;
      const dx = other.pos.x - car.pos.x;
      const dz = other.pos.z - car.pos.z;
      const forwardDist = Math.sin(car.heading) * dx + Math.cos(car.heading) * dz;
      const otherLane   = other.laneOffsetTarget !== undefined ? other.laneOffsetTarget : 0;
      const lateralGap  = Math.abs(car.laneOffsetTarget - otherLane);
      if (forwardDist > 0 && forwardDist < 9 && lateralGap < 2.2) blocked = true;
    });

    if (blocked) {
      car.laneOffsetTarget = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2.5);
    } else if (Math.random() < 0.3) {
      car.laneOffsetTarget = (Math.random() - 0.5) * 5;
    }
  }
  car.laneOffset += (car.laneOffsetTarget - car.laneOffset) * Math.min(1, dt * 1.2);

  // ── Steering toward lookahead ─────────────────────────────────────────────
  const targetIdx  = (idx + 6) % SAMPLES;
  const tp         = samplePts[targetIdx];
  const tt         = sampleTangents[targetIdx];
  const right      = new THREE.Vector3().crossVectors(tt, UP).normalize();
  const targetPos  = tp.clone().addScaledVector(right, car.laneOffset);

  const dx             = targetPos.x - car.pos.x;
  const dz             = targetPos.z - car.pos.z;
  const desiredHeading = Math.atan2(dx, dz);
  let   diff           = desiredHeading - car.heading;
  while (diff >  Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += THREE.MathUtils.clamp(diff, -2.9 * dt, 2.9 * dt);

  // ── Speed: curvature + rubber-band ───────────────────────────────────────
  const lookIdx     = (idx + 14) % SAMPLES;
  const curveFactor = THREE.MathUtils.clamp(1 - curvature[lookIdx] * 1.15, 0.62, 1);

  // Rubber band: pull AI toward player's progress.
  // See tuning note at top of file before changing the divisor.
  const player = allCars[0]; // player is always index 0
  const gap    = (player.progress || 0) - (car.progress || 0);
  const rubber = THREE.MathUtils.clamp(1 + gap / 1400, 1.0, 1.15);

  // AI nitro: activate on long straights, deactivate in corners
  const straightSection = curvature[lookIdx] < 0.015;
  if (straightSection && car.nitro > 25 && Math.random() < 0.1) car.boosting = true;
  if (curvature[lookIdx] > 0.035) car.boosting = false;

  if (car.boosting) {
    car.nitro = Math.max(0, car.nitro - 30 * dt);
    if (car.nitro <= 0) car.boosting = false;
  } else {
    car.nitro = Math.min(100, car.nitro + 10 * dt);
  }

  const dynamicTarget = car.baseSpeed * curveFactor * rubber * (car.boosting ? 1.25 : 1.0);
  car.speed = THREE.MathUtils.lerp(car.speed, dynamicTarget, dt * 2.4);

  // ── Integrate position ────────────────────────────────────────────────────
  car.pos.x += Math.sin(car.heading) * car.speed * dt;
  car.pos.z += Math.cos(car.heading) * car.speed * dt;

  car.mesh.position.set(car.pos.x, 0, car.pos.z);
  car.mesh.rotation.y = car.heading;
  car.mesh.userData.wheels?.forEach(w => (w.rotation.x -= car.speed * dt * 0.6));

  // Boost exhaust particles
  if (car.boosting) {
    const forwardDir = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const rear = car.pos.clone().addScaledVector(forwardDir, -2.1).setY(0.4);
    spawnParticle(
      rear,
      Math.random() < 0.5 ? car.color : 0xff2e9a,
      0.4, 0.35,
      forwardDir.clone().multiplyScalar(-6),
      0.5
    );
  }

  updateLapProgress(car, samplePts, sampleTangents, SAMPLES);
}
