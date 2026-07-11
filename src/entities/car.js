/**
 * createCarMesh() builds the Three.js group from a CarDefinition's visual
 * parameters. makeCarState() creates the mutable runtime state object used
 * by physics, AI, and the race system.
 *
 * Cars either use a procedural body ('gt' / 'muscle' — built from THREE
 * primitives, see buildGTBody / buildMuscleBody) or a real imported glTF
 * model (set `modelUrl` on the CarDefinition — see buildModelBody). Because
 * loading a model is async, createCarMesh() is async for every car; callers
 * must `await` it.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeGlowTexture } from '../effects/textures.js';

const glowTex = makeGlowTexture();

// The bundled Ferrari model is Draco-compressed, so GLTFLoader needs a
// DRACOLoader to decode its mesh data. Pointed at Google's public decoder
// CDN so we don't have to vendor the decoder files ourselves.
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
const gltfCache = new Map(); // url -> Promise<GLTF>, so multiple cars sharing a model only fetch once

function loadGLTF(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, gltfLoader.loadAsync(url));
  }
  return gltfCache.get(url);
}

/**
 * Kicks off a model's download+decode ahead of time (e.g. while the player
 * is still on the car-select screen) so createCarMesh() hits the cache
 * instead of blocking Start on a fresh fetch. Safe to call on cars that
 * don't use a model — it's a no-op then.
 * @param {import('../content/cars/_template/car.js').CarDefinition} carDef
 */
export function preloadCarModel(carDef) {
  if (carDef.modelUrl) loadGLTF(carDef.modelUrl);
}

// ─── Mesh builder ─────────────────────────────────────────────────────────────

/**
 * @param {import('../content/cars/_template/car.js').CarDefinition} carDef
 * @param {number} bodyColor    Hex colour for paint
 * @param {number} accentColor  Hex colour for stripe/trim accents
 * @param {number} [carNumber]  Optional race number badge
 * @returns {Promise<THREE.Group>}
 */
export async function createCarMesh(carDef, bodyColor, accentColor, carNumber) {
  const { shellScale, canopyScale, wheelPositions, bodyStyle = 'gt' } = carDef;

  // Real imported model (e.g. Viper-X) — completely different pipeline from
  // the procedural bodies below: load once, clone per instance, recolor by
  // named mesh, and pull the wheel groups out by name for wheel-spin.
  if (carDef.modelUrl) {
    return buildModelBody(carDef, bodyColor, accentColor, carNumber);
  }

  const group = new THREE.Group();

  const bodyMat   = new THREE.MeshPhysicalMaterial({ color: bodyColor,  metalness: 0.8,  roughness: 0.15, clearcoat: 1.0, clearcoatRoughness: 0.05 });
  const canopyMat = new THREE.MeshPhysicalMaterial({ color: 0x14181e,   metalness: 0.3,  roughness: 0.1,  clearcoat: 1.0, transparent: true, opacity: 0.72 });
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x0e0f12,   metalness: 0.3,  roughness: 0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8dde3,   metalness: 1.0,  roughness: 0.2 });
  const glowMat   = new THREE.MeshStandardMaterial({ color: bodyColor,  emissive: bodyColor, emissiveIntensity: 1.8 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.3, roughness: 0.4 });

  // Body construction diverges completely by style — a rounded GT shell vs.
  // an angular boxy muscle-car body — so cars are actually distinguishable,
  // not just the same blob at different scales.
  if (bodyStyle === 'muscle') {
    buildMuscleBody(group, shellScale, canopyScale, bodyMat, canopyMat, darkMat, stripeMat);
  } else {
    buildGTBody(group, shellScale, canopyScale, bodyMat, canopyMat, darkMat, stripeMat);
  }

  // Mirrors
  [-1.0, 1.0].forEach(x => addBox(group, 0.12, 0.12, 0.28, bodyMat, x, 0.95, 0.5));

  // Exhausts — quad pipes on the muscle car, dual pipes on the GT
  if (bodyStyle === 'muscle') {
    [-0.65, -0.28, 0.28, 0.65].forEach(x => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 20), chromeMat);
      exhaust.rotation.z = Math.PI / 2;
      exhaust.position.set(x, 0.26, -1.9 * (shellScale.z / 2.05));
      group.add(exhaust);
    });
  } else {
    [-0.5, 0.5].forEach(x => {
      const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.22, 20), chromeMat);
      exhaust.rotation.z = Math.PI / 2;
      exhaust.position.set(x, 0.3, -1.9);
      group.add(exhaust);
    });
  }

  // LED side strips
  [-0.98, 0.98].forEach(x => addBox(group, 0.04, 0.05, 3.5, glowMat, x, 0.16, 0));

  // Wheels
  const wheels = buildWheels(group, wheelPositions, chromeMat);

  // Lights
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xfff4cc, emissive: 0xfff4cc, emissiveIntensity: 1.6 });
  const tailMat  = new THREE.MeshStandardMaterial({ color: 0xff1744, emissive: 0xff1744, emissiveIntensity: 1.4 });
  [-0.62, 0.62].forEach(x => {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), lightMat);
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
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true }));
    badge.rotation.x = -Math.PI / 2 + 0.2;
    badge.position.set(0, 1.18, 1.0);
    group.add(badge);
  }

  // Smooth the geometries of all curved meshes (wheels, canopy, body shell, etc.)
  group.traverse(node => {
    if (node.isMesh && node.geometry) {
      const isBox = node.geometry.type.startsWith('BoxGeometry') || node.geometry.type.startsWith('BoxBufferGeometry');
      if (!isBox) {
        node.geometry = node.geometry.clone();
        node.geometry.deleteAttribute('normal');
        node.geometry = BufferGeometryUtils.mergeVertices(node.geometry);
        node.geometry.computeVertexNormals();
      }
    }
  });

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
 * @param {import('../content/cars/_template/stats.js').CarStats} [stats] Player's car physics params (unused for AI)
 * @returns {object}
 */
export function makeCarState(mesh, color, samplePts, sampleTangents, BOOST_PAD_IDX, aiIndex, stats) {
  const isAI = aiIndex !== undefined;
  
  // Staggered grid indices:
  // AI 0 -> Slot 1 (gridIndex 0)
  // AI 1 -> Slot 2 (gridIndex 1)
  // Player -> Slot 3 (gridIndex 2)
  // AI 2 -> Slot 4 (gridIndex 3)
  const gridIndex = isAI ? (aiIndex < 2 ? aiIndex : 3) : 2;
  const SAMPLES = samplePts.length;

  const spawnIdx = (SAMPLES - 6 - gridIndex * 6 + SAMPLES) % SAMPLES;
  const side = (gridIndex % 2 === 0) ? 1 : -1;
  const initialLaneOffset = side * 2.5;

  const p = samplePts[spawnIdx], t = sampleTangents[spawnIdx];
  const right = new THREE.Vector3().crossVectors(t, new THREE.Vector3(0, 1, 0)).normalize();
  const startPos = p.clone().addScaledVector(right, initialLaneOffset);

  const state = {
    mesh,
    color,
    stats:        stats || null, // per-car physics params (player only; AI uses its own speed model)
    pos:          startPos,
    heading:      Math.atan2(t.x, t.z),
    speed:        0,
    lap:          0, // Everyone starts behind the start line, so lap starts at 0
    lastSampleIdx:  spawnIdx,
    maxSampleIdx:   spawnIdx,
    trackIdx:       spawnIdx,
    progress:       (0 - 1) * SAMPLES + spawnIdx, // Initial progress is negative because they are behind start line
    finished:       false,
    finishTime:     0,
    padFlags:       new Array(BOOST_PAD_IDX.length).fill(false),
    crossedHalfway: true, // Everyone starts behind the start line, so crossedHalfway is true
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
    state.laneOffset        = initialLaneOffset;
    state.laneOffsetTarget  = initialLaneOffset;
    state.laneTimer         = Math.random() * 2;
  }

  // Set initial mesh transform
  mesh.position.set(state.pos.x, 0, state.pos.z);
  mesh.rotation.y = state.heading;

  return state;
}

// ─── Body builders ────────────────────────────────────────────────────────────

/**
 * Rounded GT coupe: sphere-based shell + bubble canopy + ducktail spoiler +
 * round fender bulges. This is the original "Phoenix GT" body.
 */
function buildGTBody(group, shellScale, canopyScale, bodyMat, canopyMat, darkMat, stripeMat) {
  // Body shell
  const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), bodyMat);
  shell.scale.set(shellScale.x, shellScale.y, shellScale.z);
  shell.position.y = 0.62;
  shell.castShadow = true;
  group.add(shell);

  // Accent stripes
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
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 30), canopyMat);
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
    const fender = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 16), bodyMat);
    fender.scale.set(0.7, 0.7, 1.0);
    fender.position.set(px, py, pz);
    group.add(fender);
  });
}

/**
 * Angular muscle car: flat-topped box hull + raked fastback windshield +
 * hood scoop + boxy fender flares + a wide rear wing on tall struts.
 * Deliberately built from different primitives (boxes, not spheres) so the
 * silhouette reads as a different car at a glance, not just a resized shell.
 */
function buildMuscleBody(group, shellScale, canopyScale, bodyMat, canopyMat, darkMat, stripeMat) {
  const hullW = shellScale.x * 2.05;
  const hullH = shellScale.y * 1.35;
  const hullL = shellScale.z * 1.85;

  // Main hull — low, flat-topped slab instead of a rounded shell
  const hull = new THREE.Mesh(new THREE.BoxGeometry(hullW, hullH, hullL), bodyMat);
  hull.position.y = hullH / 2 + 0.14;
  hull.castShadow = true;
  group.add(hull);
  const hullTopY = hull.position.y + hullH / 2;

  // Raked fastback windshield — a flat angled pane instead of a bubble canopy
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(canopyScale.x * 1.7, canopyScale.y * 1.1, canopyScale.z * 1.9), canopyMat);
  canopy.position.set(0, hullTopY + canopyScale.y * 0.35, -0.15);
  canopy.rotation.x = 0.22;
  canopy.castShadow = true;
  group.add(canopy);

  // Center racing stripes
  [-0.16, 0.16].forEach(x => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, hullL * 0.96), stripeMat);
    stripe.position.set(x, hullTopY + 0.02, 0);
    group.add(stripe);
  });

  // Hood scoop
  addBox(group, 0.5, 0.14, 0.6, darkMat, 0, hullTopY + 0.08, hullL * 0.28);

  // Front splitter + canards
  addBox(group, hullW * 1.02, 0.08, 0.36, darkMat, 0, 0.16, hullL / 2 + 0.1);
  [-hullW / 2 + 0.15, hullW / 2 - 0.15].forEach(x => addBox(group, 0.3, 0.05, 0.22, darkMat, x, 0.2, hullL / 2 + 0.15));

  // Rear diffuser
  addBox(group, hullW * 0.98, 0.14, 0.3, darkMat, 0, 0.16, -hullL / 2 - 0.08);

  // Wide rear wing on tall struts — bigger and further back than the GT's ducktail
  [-hullW / 2 + 0.3, hullW / 2 - 0.3].forEach(x => addBox(group, 0.08, 0.5, 0.08, darkMat, x, hullTopY + 0.25, -hullL / 2 + 0.1));
  addBox(group, hullW * 0.92, 0.08, 0.42, darkMat, 0, hullTopY + 0.55, -hullL / 2 + 0.05, true);

  // Boxy fender flares (front + rear) instead of round bulges
  [
    [-hullW / 2 - 0.02, 0.42,  hullL / 2 - 0.35],
    [ hullW / 2 + 0.02, 0.42,  hullL / 2 - 0.35],
    [-hullW / 2 - 0.02, 0.42, -hullL / 2 + 0.35],
    [ hullW / 2 + 0.02, 0.42, -hullL / 2 + 0.35],
  ].forEach(([px, py, pz]) => addBox(group, 0.22, 0.4, 0.7, bodyMat, px, py, pz));

  // Side skirts
  addBox(group, hullW * 0.15, 0.12, hullL * 0.7, darkMat, -hullW / 2 - 0.05, 0.2, 0);
  addBox(group, hullW * 0.15, 0.12, hullL * 0.7, darkMat,  hullW / 2 + 0.05, 0.2, 0);
}

/**
 * Loads (and caches) a real glTF car model and returns an engine-ready group.
 *
 * Uses the free Ferrari 458 Italia model bundled with three.js's own
 * official examples (mrdoob/three.js, examples/models/gltf/ferrari.glb —
 * the same asset used in the public "webgl_materials_car" example), served
 * straight from threejs.org so no binary asset needs to live in this repo.
 * Credit: Ferrari 458 Italia model by vicent091036 (Sketchfab), as bundled
 * and redistributed in the three.js examples.
 *
 * The model's node names ('body', 'rim_fl/fr/rl/rr', 'trim', 'glass',
 * 'wheel_fl/fr/rl/rr') come straight from that example, which is how we know
 * what to recolor and which nodes to spin as wheels.
 *
 * @param {import('../content/cars/_template/car.js').CarDefinition} carDef
 * @param {number} bodyColor
 * @param {number} accentColor
 * @param {number} [carNumber]
 * @returns {Promise<THREE.Group>}
 */
async function buildModelBody(carDef, bodyColor, accentColor, carNumber) {
  const gltf = await loadGLTF(carDef.modelUrl);

  // Clone so every car instance (player + each AI racer) gets its own
  // independent scene graph and materials — the cached gltf.scene must stay
  // pristine since loadGLTF() is shared across all instances.
  const root = gltf.scene.children[0].clone(true);
  root.traverse(node => {
    if (node.isMesh) {
      if (node.material) {
        if (Array.isArray(node.material)) {
          node.material = node.material.map(m => {
            const cloned = m.clone();
            cloned.flatShading = false;
            cloned.needsUpdate = true;
            return cloned;
          });
        } else {
          node.material = node.material.clone();
          node.material.flatShading = false;
          node.material.needsUpdate = true;
        }
      }
      if (node.geometry) {
        node.geometry = node.geometry.clone();
        node.geometry.deleteAttribute('normal');
        node.geometry = BufferGeometryUtils.mergeVertices(node.geometry);
        node.geometry.computeVertexNormals();
      }
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });

  const mappings = carDef.nodeMappings || {
    body: ['body'],
    trim: ['trim'],
    rims: ['rim_fl', 'rim_fr', 'rim_rl', 'rim_rr'],
    glass: ['glass'],
    wheels: ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']
  };

  const getObjects = (names) => {
    if (!names) return [];
    const arr = Array.isArray(names) ? names : [names];
    return arr.map(name => root.getObjectByName(name)).filter(Boolean);
  };

  getObjects(mappings.body).forEach(node => {
    if (node.material) node.material.color.setHex(bodyColor);
  });

  getObjects(mappings.trim).forEach(node => {
    if (node.material) node.material.color.setHex(accentColor);
  });

  getObjects(mappings.rims).forEach(node => {
    if (node.material) {
      node.material.metalness = 1.0;
      node.material.roughness = 0.25;
    }
  });

  getObjects(mappings.glass).forEach(node => {
    if (node.material) {
      node.material.transparent = true;
      node.material.opacity = 0.6;
    }
  });

  const wheels = getObjects(mappings.wheels);

  // Model units/orientation rarely match this engine's out of the box —
  // modelScale/modelRotationY are tuning knobs on the CarDefinition.
  // If the car looks backwards in-game, add Math.PI to modelRotationY.
  const group = new THREE.Group();
  root.scale.setScalar(carDef.modelScale ?? 1);
  root.rotation.y = carDef.modelRotationY ?? 0;
  group.add(root);

  // Number badge — same visual as the procedural cars, positioned above
  // roughly where the roofline sits; nudge modelBadgeY if it clips the roof.
  if (carNumber) {
    const bc = document.createElement('canvas'); bc.width = bc.height = 64;
    const bctx = bc.getContext('2d');
    bctx.fillStyle = '#ffffff'; bctx.beginPath(); bctx.arc(32, 32, 30, 0, Math.PI * 2); bctx.fill();
    bctx.fillStyle = '#0e0f12'; bctx.font = 'bold 40px Arial'; bctx.textAlign = 'center'; bctx.textBaseline = 'middle';
    bctx.fillText(String(carNumber), 32, 34);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.3, 32), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(bc), transparent: true }));
    badge.rotation.x = -Math.PI / 2 + 0.2;
    badge.position.set(0, carDef.modelBadgeY ?? 1.2, 1.0);
    group.add(badge);
  }

  group.userData.wheels = wheels;
  return group;
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
  const wheelGeo = new THREE.CylinderGeometry(0.44, 0.44, 0.34, 32);
  const rimGeo   = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 20);
  const discGeo  = new THREE.CylinderGeometry(0.3,  0.3,  0.36, 32);
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