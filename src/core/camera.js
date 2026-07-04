import * as THREE from 'three';

const CAM_OFFSET      = new THREE.Vector3(0, 5.2, 9.5);
const CAM_LOOK_OFFSET = new THREE.Vector3(0, 1.2, 4);

// Smoothed camera world position (lerped each frame)
const camPos = new THREE.Vector3();

let _shakeTime      = 0;
let _shakeIntensity = 0;

export function triggerShake(duration, intensity) {
  _shakeTime      = Math.max(_shakeTime, duration);
  _shakeIntensity = Math.max(_shakeIntensity, intensity);
}

export function initCamera() {
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 2500);
  return camera;
}

export function updateCamera(camera, player, dt) {
  const behind = new THREE.Vector3(
    -Math.sin(player.heading) * CAM_OFFSET.z,
    CAM_OFFSET.y,
    -Math.cos(player.heading) * CAM_OFFSET.z
  );
  const desired = new THREE.Vector3(player.pos.x, 0, player.pos.z).add(behind);
  camPos.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.position.copy(camPos);

  if (_shakeTime > 0) {
    _shakeTime -= dt;
    camera.position.x += (Math.random() - 0.5) * _shakeIntensity;
    camera.position.y += (Math.random() - 0.5) * _shakeIntensity;
    camera.position.z += (Math.random() - 0.5) * _shakeIntensity;
    if (_shakeTime <= 0) _shakeIntensity = 0;
  }

  const lookAt = new THREE.Vector3(
    player.pos.x + Math.sin(player.heading) * CAM_LOOK_OFFSET.z,
    CAM_LOOK_OFFSET.y,
    player.pos.z + Math.cos(player.heading) * CAM_LOOK_OFFSET.z
  );
  camera.lookAt(lookAt);

  // FOV zoom-out on boost for speed feel
  const targetFov = player.boosting ? 70 : 62;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt * 3);
  camera.updateProjectionMatrix();
}

/** Called once on race reset to snap camera behind the player immediately. */
export function snapCamera(player) {
  camPos.copy(player.pos).add(new THREE.Vector3(0, 5.2, 9.5));
}