/**
 * Creates the scene, sky background, environment map, and lighting.
 * These are global to all tracks. Track-specific scenery (terrain, trees,
 * grandstands, billboards) lives in content/tracks/<name>/scenery.js instead.
 */

import * as THREE from 'three';
import { makeSkyTexture, makeEnvEquirect, makeRetroSunTexture, makeLensFlareTexture, makeGlowTexture } from '../effects/textures.js';

export function initScene(renderer) {
  const scene = new THREE.Scene();

  scene.background = makeSkyTexture();
  scene.fog = new THREE.FogExp2(0x15003c, 0.0020);

  // Environment map for physical material reflections (MeshPhysicalMaterial clearcoat)
  const envEquirect = makeEnvEquirect();
  envEquirect.mapping = THREE.EquirectangularReflectionMapping;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  scene.environment = pmremGenerator.fromEquirectangular(envEquirect).texture;
  pmremGenerator.dispose();

  // Retro Sun
  const sunGroup = new THREE.Group();
  sunGroup.position.set(80, 165, -600);
  
  const retroSunTex = makeRetroSunTexture();
  const sunDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshBasicMaterial({ map: retroSunTex, transparent: true, fog: false, depthWrite: false })
  );
  sunGroup.add(sunDisc);

  const glowTex = makeGlowTexture();

  const coronaMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff007f, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const corona = new THREE.Sprite(coronaMat);
  corona.scale.set(320, 320, 1);
  corona.position.z = -1;
  sunGroup.add(corona);

  const auraMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffa000, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const aura = new THREE.Sprite(auraMat);
  aura.scale.set(450, 450, 1);
  aura.position.z = -2;
  sunGroup.add(aura);

  const flareMat = new THREE.SpriteMaterial({ map: makeLensFlareTexture(), transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const flareSprite = new THREE.Sprite(flareMat);
  flareSprite.scale.set(320, 320, 1);
  flareSprite.position.z = 1;
  sunGroup.add(flareSprite);

  [0.3, 0.52, 0.72].forEach((t, i) => {
    const artifactColors = [0xff00a0, 0x00e5ff, 0xffaa00];
    const artifactMat = new THREE.SpriteMaterial({ map: glowTex, color: artifactColors[i], transparent: true, opacity: 0.12 + i * 0.04, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const artifact = new THREE.Sprite(artifactMat);
    const size = 12 + i * 10;
    artifact.scale.set(size, size, 1);
    artifact.position.set(-t * 140, -t * 80, 2);
    sunGroup.add(artifact);
  });

  scene.add(sunGroup);

  // Lighting
  scene.add(new THREE.AmbientLight(0x2a1040, 0.65));

  const sunLight = new THREE.DirectionalLight(0xff7a00, 1.6);
  sunLight.position.set(80, 180, -100);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(1024, 1024);
  sunLight.shadow.camera.left   = -220;
  sunLight.shadow.camera.right  =  220;
  sunLight.shadow.camera.top    =  220;
  sunLight.shadow.camera.bottom = -220;
  sunLight.shadow.camera.far    = 500;
  scene.add(sunLight);

  scene.add(new THREE.HemisphereLight(0x5c0c66, 0x140520, 0.7));

  return scene;
}