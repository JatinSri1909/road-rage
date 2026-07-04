import * as THREE from 'three';
import { triggerShake } from '../core/camera.js';
import { spawnParticle } from '../effects/particles.js';

const CAR_COLLISION_RADIUS = 1.55;

// Reusable scratch vectors to avoid per-frame GC pressure
const _mid          = new THREE.Vector3();
const _sparkVel     = new THREE.Vector3();
const _impulse      = new THREE.Vector3();
const _dir          = new THREE.Vector3();
const _particlePos  = new THREE.Vector3();
const _particleVel  = new THREE.Vector3();

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

      a.pos.x -= nx * overlap * 0.5; a.pos.z -= nz * overlap * 0.5;
      b.pos.x += nx * overlap * 0.5; b.pos.z += nz * overlap * 0.5;
      a.mesh.position.set(a.pos.x, 0, a.pos.z);
      b.mesh.position.set(b.pos.x, 0, b.pos.z);

      const aSpd   = a.velocity ? a.velocity.length() : Math.abs(a.speed);
      const bSpd   = b.velocity ? b.velocity.length() : Math.abs(b.speed);
      const impact = THREE.MathUtils.clamp((aSpd + bSpd) / 30, 0, 1);

      applyCollisionImpulse(a, -nx, -nz, impact);
      applyCollisionImpulse(b,  nx,  nz, impact);

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

function applyCollisionImpulse(car, nx, nz, impact) {
  if (car.velocity) {
    car.velocity.multiplyScalar(1 - 0.45 * impact);
    car.velocity.add(_impulse.set(nx * 2 * impact, 0, nz * 2 * impact));
  } else {
    car.speed *= (1 - 0.45 * impact);
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