import * as THREE from 'three';
import { triggerShake } from '../core/camera.js';
import { spawnParticle } from '../effects/particles.js';

const CAR_COLLISION_RADIUS = 1.55;
const RESTITUTION = 0.35; // 0 = cars just stop dead on impact, 1 = perfectly bouncy
const STATIC_HIT_RADIUS_PAD = 1.0; // ≈ car half-width, added to each collider's own radius

// Reusable scratch vectors to avoid per-frame GC pressure
const _mid          = new THREE.Vector3();
const _sparkVel     = new THREE.Vector3();
const _aVel         = new THREE.Vector3();
const _bVel         = new THREE.Vector3();
const _particlePos  = new THREE.Vector3();
const _particleVel  = new THREE.Vector3();
const _dir          = new THREE.Vector3();

export function resolveStaticCollisions(car, colliders, isPlayer) {
  for (let i = 0; i < colliders.length; i++) {
    const col = colliders[i];
    const dx = car.pos.x - col.x, dz = car.pos.z - col.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const minDist = col.radius + STATIC_HIT_RADIUS_PAD;

    if (dist <= 0.0001 || dist >= minDist) continue;

    const nx = dx / dist, nz = dz / dist;
    const overlap = minDist - dist;

    // Static prop = infinite mass — only the car moves, and it moves out fully.
    car.pos.x += nx * overlap;
    car.pos.z += nz * overlap;
    car.mesh.position.set(car.pos.x, 0, car.pos.z);

    // Cancel only the velocity component driving the car INTO the prop —
    // same trick as the guardrail fix, so cars scrape past at reduced speed
    // instead of stopping dead or getting stuck needing a reverse.
    const vel = getVelocityVector(car, _aVel);
    const inward = -(vel.x * nx + vel.z * nz);
    if (inward > 0) applyImpulse(car, nx * inward, nz * inward);

    if (isPlayer && inward > 9) triggerShake(0.22, Math.min(0.3, inward * 0.012));
  }
}

export function resolveCarCollisions(allCars, player) {
  for (let i = 0; i < allCars.length; i++) {
    for (let j = i + 1; j < allCars.length; j++) {
      const a = allCars[i], b = allCars[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = CAR_COLLISION_RADIUS * 2;

      if (dist <= 0.0001 || dist >= minDist) continue;

      const nx = dx / dist, nz = dz / dist;
      const overlap = minDist - dist;

      // Positional correction: cars are solid and may never overlap.
      a.pos.x -= nx * overlap * 0.5; a.pos.z -= nz * overlap * 0.5;
      b.pos.x += nx * overlap * 0.5; b.pos.z += nz * overlap * 0.5;
      a.mesh.position.set(a.pos.x, 0, a.pos.z);
      b.mesh.position.set(b.pos.x, 0, b.pos.z);

      // Real velocity vectors (AI cars track scalar speed + heading instead).
      const aVel = getVelocityVector(a, _aVel);
      const bVel = getVelocityVector(b, _bVel);

      // Closing speed along the collision normal — this is the only
      // component a rigid-body impact actually cancels/bounces. The
      // tangential (sliding-past) component is left untouched, so a
      // glancing side-swipe barely affects forward speed.
      const relNormalSpeed = (bVel.x - aVel.x) * nx + (bVel.z - aVel.z) * nz;
      if (relNormalSpeed > 0) continue; // already separating, no impulse needed

      const impulseMag = -(1 + RESTITUTION) * relNormalSpeed / 2; // equal-mass, 2-body
      applyImpulse(a, -nx * impulseMag, -nz * impulseMag);
      applyImpulse(b,  nx * impulseMag,  nz * impulseMag);

      const impact = THREE.MathUtils.clamp(-relNormalSpeed / 22, 0, 1);
      if ((a === player || b === player) && impact > 0.2) {
        triggerShake(0.22, Math.min(0.3, impact * 0.4));
        const mid = _mid.set((a.pos.x + b.pos.x) / 2, 0.6, (a.pos.z + b.pos.z) / 2);
        for (let k = 0; k < 5; k++) {
          const ang = Math.random() * Math.PI * 2;
          spawnParticle(mid, 0xffb020, 0.35, 0.4, _sparkVel.set(Math.cos(ang) * 3, 1.5, Math.sin(ang) * 3), -0.6);
        }
      }
    }
  }
}

function getVelocityVector(car, out) {
  if (car.velocity) return out.copy(car.velocity);
  return out.set(Math.sin(car.heading) * car.speed, 0, Math.cos(car.heading) * car.speed);
}

function applyImpulse(car, ix, iz) {
  if (car.velocity) {
    car.velocity.x += ix;
    car.velocity.z += iz;
  } else {
    // Scalar-speed AI cars: project the impulse onto their own heading so
    // they realistically slow/speed up on impact without gaining sideways drift.
    car.speed = Math.max(0, car.speed + ix * Math.sin(car.heading) + iz * Math.cos(car.heading));
  }
}

export function checkBoostPads(allCars, samplePts, SAMPLES, BOOST_PAD_IDX) {
  allCars.forEach(car => {
    BOOST_PAD_IDX.forEach((padIdx, pi) => {
      let diff = Math.abs(car.trackIdx - padIdx);
      diff = Math.min(diff, SAMPLES - diff);
      if (diff < 4) {
        if (!car.padFlags[pi]) { car.padFlags[pi] = true; applyBoostPad(car); }
      } else if (diff > 10) {
        car.padFlags[pi] = false;
      }
    });
  });
}

function applyBoostPad(car) {
  const dir = _dir.set(Math.sin(car.heading), 0, Math.cos(car.heading));
  if (car.velocity) {
    car.velocity.addScaledVector(dir, 11);
    car.nitro = Math.min(100, car.nitro + 30);
  } else {
    car.speed = Math.min(car.speed + 11, 42 * 1.3);
  }
  for (let k = 0; k < 8; k++) {
    const ang = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.6;
    spawnParticle(
      _particlePos.copy(car.pos).add(_particleVel.set(Math.cos(ang) * r, 0.5, Math.sin(ang) * r)),
      Math.random() < 0.5 ? 0x00e5ff : 0xff2e9a, 0.5, 0.5,
      _particleVel.set(Math.cos(ang) * 2, 2, Math.sin(ang) * 2), 0.8
    );
  }
}