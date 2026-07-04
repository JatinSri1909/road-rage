import * as THREE from 'three';

export function initRenderer(isMobileDevice) {
  const renderer = new THREE.WebGLRenderer({
    antialias: !isMobileDevice,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  document.body.appendChild(renderer.domElement);
  return renderer;
}

export function getViewportSize() {
  const width  = window.visualViewport ? window.visualViewport.width  : window.innerWidth;
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  return { width, height };
}

export function resizeRenderer(renderer, camera) {
  const { width, height } = getViewportSize();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}