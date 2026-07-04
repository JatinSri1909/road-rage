/**
 * createCarMesh() builds the Three.js group from a CarDefinition's visual
 * parameters. makeCarState() creates the mutable runtime state object used
 * by physics, AI, and the race system.
 *
 * Geometry is shared across all car types; unique shapes come from the
 * shellScale / canopyScale / wheelPositions in each CarDefinition.
 */

import * as THREE from 'three';
import { makeGlowTexture } from '../effects/textures.js';

const glowTex = makeGlowTexture();

// ─── Mesh builder ─────────────────────────────────────────────────────────────

/**
 * @param {import('../content/cars/_template/car.js').CarDefinition} carDef
 * @param {number} bodyColor    Hex colour for paint
 * @param {number} accentColor  Hex colour for stripe accents
 * @param {number} [carNumber]  Optional race number badge
 * @returns {THREE.Group}
 */
export function createCarMesh(carDef, bodyColor, accentColor, carNumber) {
  const { shellScale, canopyScale, wheelPositions } = carDef;
  const group = new THREE.Group();

  const bodyMat   = new THREE.MeshPhysicalMaterial({ color: bodyColor,  metalness: 0.8,  roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0x14181e,   metalness: 0.3,  roughness: 0.1,  clearcoat: 1.0, transparent: true, opacity: 0.72 });
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x0e0f12,   metalness: 0.3,  roughness: 0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde3,   metalness: 1.0,  roughness: 0.2 });
  const glowMat   = new THREE.MeshStandardMaterial({ color: bodyColor,  emissive: bodyColor, emissiveIntensity: 1.8 });

  // Body shell
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bodyMat);
  shell.scale.set(shellScale.x, shellScale.y, shellScale.z);
  shell.position.y = 0.62;
  shell.castShadow = true;
  group.add(shell);

  // Accent stripes
  const stripeMat = new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.3, roughness: 0.4 });
  for (let sz = -1.9; sz <= 1.9; sz += 0.34) {
    if (Math.abs(sz) < 1.2) continue;
    const zn = sz / shellScale.z;
    const surfY = shellScale.y * Math.sqrt(Math.max(0, 1 - zn * zn));
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.38), stripeMat);
    seg.position.set(0, 0.62 + surfY - 0.01, sz);
    group.add(seg);
  }

  // Skirt / diffuser / spoiler
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.16, 3.7), darkMat);
  skirt.position.y = 0.24;
  group.add(skirt);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), canopyMat);
  canopy.scale.set(canopyScale.x, canopyScale.y, canopyScale.z);
  canopy.position.set(0, 1.06, -0.1);
  canopy.castShadow = true;
  group.add(canopy);

  addBox(group, 1.9,  0.08, 0.4, darkMat,  0, 0.3,  2.05);  // splitter
  addBox(group, 1.85, 0.14, 0.32, darkMat, 0, 0.3, -1.95);  // diffuser
  addBox(group, 1.8,  0.1,  0.4, darkMat,  0, 1.12, -1.95, true); // spoiler
  [-0.8, 0.8].forEach(x => addBox(group, 0.1, 0.3, 0.1, darkMat, x, 0.95, -1.95));

  // Fenders
  [[-1.0,0.5,1.3],[1.0,0.5,1.3],[-1.0,0.5,-1.3],[1.0,0.5,-1.3]].forEach(([px,py,pz]) => {
    const fender = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), bodyMat);
    fender.scale.set(0.7, 0.7, 1.0);
    fender.position.set(px, py, pz);
    group.add(fender);
  });

  // Mirrors
  [-1.0, 1.0].forEach(x => addBox(group, 0.12, 0.12, 0.28, bodyMat, x, 0.95, 0.5));

  // Exhausts
  [-0.5, 0.5].forEach(x => {
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 10), chromeMat);
    exhaust.rotation.z = Math.PI / 2;
    exhaust.position.set(x, 0.3, -1.9);
    group.add(exhaust);
  });

  // LED side strips
  [-0.98, 0.98].forEach(x => addBox(group, 0.04, 0.05, 3.5, glowMat, x, 0.16, 0));

  // Wheels
  const wheels = buildWheels(group, wheelPositions, chromeMat);

  // Lights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff4cc, emissive: 0xfff4cc, emissiveIntensity: 1.6 });
  const tailMat  = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.4 });
  [-0.62, 0.62].forEach(x => {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), lightMat);
    hl.position.set(x, 0.62, 2.0); group.add(hl);
    addGlowSprite(group, new THREE.Vector3(x, 0.62, 2.05), 0xfff4cc, 0.4);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.06), tailMat);
    tl.position.set(x, 0.62, -1.98); group.add(tl);
    addGlowSprite(group, new THREE.Vector3(x, 0.62, -2.02), 0xff1744, 0.32);
  });

  // Number badge
  if (carNumber) {
    const bc = document.createElement('canvas'); bc.width = bc.height = 64;
    const bctx = bc.getContext('2d');
    bctx.fillStyle = '#ffffff'; bctx.beginPath(); bctx.arc(32, 32, 30, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = '#0e0f12'; bctx.font = 'bold 40px Arial'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.fillText(String(carNumber), 32, 34);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true }));
    badge.rotation.x = -Math.PI / 2 + 0.2;
    badge.position.set(0, 1.18, 1.0);
    group.add(badge);
  }

  group.userData.wheels = wheels;
  return group;
}

// ─── State factory ────────────────────────────────────────────────────────────

/**
 * Creates the mutable runtime state for a car.
 * @param {THREE.Group} mesh
 * @param {number}      color
 * @param {THREE.Vector3[]} samplePts
 * @param {THREE.Vector3[]} sampleTangents
 * @param {number[]}    BOOST_PAD_IDX
 * @param {number}      [aiIndex]   If provided, offsets spawn position for AI grid
 * @returns {object}
 */
export function makeCarState(mesh, color, samplePts, sampleTangents, BOOST_PAD_IDX, aiIndex) {
  const isAI = aiIndex !== undefined;
  let spawnIdx = 0;
  if (isAI) {
    const back = (aiIndex + 1) * 4;
    spawnIdx = (samplePts.length - back * 2 + samplePts.length) % samplePts.length;
  }

  const state = {
    mesh,
    color,
    pos:          samplePts[spawnIdx].clone(),
    heading:      Math.atan2(sampleTangents[spawnIdx].x, sampleTangents[spawnIdx].z),
    speed:        0,
    lap:          isAI ? 0 : 1,
    lastSampleIdx:  spawnIdx,
    maxSampleIdx:   spawnIdx,
    trackIdx:       spawnIdx,
    progress:       0,
    finished:       false,
    finishTime:     0,
    padFlags:       new Array(BOOST_PAD_IDX.length).fill(false),
    crossedHalfway: isAI,  // AI spawns past start line so treat as already crossed
    nitro:          100,
    boosting:       false,
  };

  // Player-only: velocity vector model
  if (!isAI) {
    state.velocity = new THREE.Vector3();
  }

  // AI-only: lane weaving state
  if (isAI) {
    state.baseSpeed         = 35 + aiIndex * 3.2 + Math.random() * 5;
    state.laneOffset        = (aiIndex - 1) * 3.0;
    state.laneOffsetTarget  = state.laneOffset;
    state.laneTimer         = Math.random() * 2;
  }

  // Set initial mesh transform
  mesh.position.set(state.pos.x, 0, state.pos.z);
  mesh.rotation.y = state.heading;

  return state;
}

// ─── Local helpers ────────────────────────────────────────────────────────────

function addBox(group, w, h, d, mat, x, y, z, castShadow = false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  if (castShadow) mesh.castShadow = true;
  group.add(mesh);
  return mesh;
}

function addGlowSprite(parent, localPos, color, size) {
  const mat = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size, size, 1);
  sprite.position.copy(localPos);
  parent.add(sprite);
  return sprite;
}

function buildWheels(group, wheelPositions, chromeMat) {
  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.34, 18);
  const rimGeo   = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 10);
  const discGeo  = new THREE.CylinderGeometry(0.3,  0.3,  0.36, 18);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.85 });
  const discMat  = new THREE.MeshStandardMaterial({ color: 0x555a62, metalness: 0.7, roughness: 0.4 });
  const calMat   = new THREE.MeshStandardMaterial({ color: 0xff1744, metalness: 0.8, roughness: 0.2 });

  return wheelPositions.map(([px, py, pz]) => {
    const wg = new THREE.Group();
    const disc = new THREE.Mesh(discGeo, discMat);   disc.rotation.z = Math.PI/2; wg.add(disc);
    const w    = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI/2; w.castShadow = true; wg.add(w);
    const rim  = new THREE.Mesh(rimGeo, chromeMat);  rim.rotation.z = Math.PI/2; rim.position.x = Math.sign(px)*0.2; wg.add(rim);
    const spokeGeo = new THREE.BoxGeometry(0.04, 0.44, 0.04);
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.rotation.x = (s * Math.PI * 2) / 5;
      spoke.position.x = Math.sign(px) * 0.22;
      wg.add(spoke);
    }
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), calMat);
    caliper.position.set(-Math.sign(px)*0.05, 0.22, 0);
    wg.add(caliper);
    wg.position.set(px, py, pz);
    group.add(wg);
    return wg;
  });
}