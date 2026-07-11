/**
 * Adds grandstands, billboards, mountain ridges, and tree clusters that
 * are specific to this track's aesthetic.
 */

import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export function buildScenery(scene, { samplePts, sampleTangents, ROAD_W, colliders }) {
  // ── 1. Terrain ─────────────────────────────────────────────────────────────
  scene.add(buildTerrain(samplePts));

  // ── 2. Mountains ───────────────────────────────────────────────────────────
  scene.add(buildMountainRidge(520, 50, 55, 96, 0x2a2040, 0x5a4878, 0xc8c0d8, 80, 0.6, 1.3, 0.47, 2.1));
  scene.add(buildMountainRidge(470, 35, 42, 80, 0x3a2848, 0x6a4870, 0xd0c8d8, 60, 0.75, 1.7, 0.6, 1.4));
  scene.add(buildMountainRidge(440, 22, 30, 72, 0x1a1428, 0x3a2840, 0xb0a8c0, 42, 0.9, 2.1, 0.9, 0.55));

  // ── 3. Trees ───────────────────────────────────────────────────────────────
  buildTrees(scene, samplePts, sampleTangents, ROAD_W, colliders);

  // ── 4. Grandstands ─────────────────────────────────────────────────────────
  const startP = samplePts[0];
  const startT = sampleTangents[0];
  const startRight = new THREE.Vector3().crossVectors(startT, UP).normalize();
  const gsRight = startP.clone().addScaledVector(startRight, ROAD_W / 2 + 9);
  const gsLeft = startP.clone().addScaledVector(startRight, -(ROAD_W / 2 + 9));
  const gsRightAngle = -Math.atan2(startT.x, startT.z) + Math.PI;
  const gsLeftAngle  = -Math.atan2(startT.x, startT.z);
  scene.add(buildGrandstand(gsRight, gsRightAngle));
  scene.add(buildGrandstand(gsLeft, gsLeftAngle));

  // Grandstand tiers are 16 units wide along the group's LOCAL x-axis, so the
  // collider offsets must be rotated by the same faceAngle as the mesh —
  // otherwise on a curve (any faceAngle != 0) the circles land somewhere
  // other than where the actual geometry is.
  [[gsRight, gsRightAngle], [gsLeft, gsLeftAngle]].forEach(([pos, angle]) => {
    for (let k = -1; k <= 1; k++) {
      const localX = k * 5;
      colliders.push({
        x: pos.x + localX * Math.cos(angle),
        z: pos.z - localX * Math.sin(angle),
        radius: 3.2,
      });
    }
  });

  // ── 5. Billboards ──────────────────────────────────────────────────────────
  const billboardSpots = [80, 200, 320, 400];
  const billboardTexts = ['APEX TIRES', 'RAPIDFUEL', 'VELOCITY OIL', 'TRACKSIDE'];
  billboardSpots.forEach((i, bi) => {
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    const pos = p.clone().addScaledVector(right, ROAD_W / 2 + 6);
    const angle = -Math.atan2(t.x, t.z) + Math.PI / 2;
    scene.add(buildBillboard(pos, angle, billboardTexts[bi]));

    // The billboard is two separate ground poles at local x = ±3.5, not one
    // solid block — register both, rotated the same way as the poles.
    [-3.5, 3.5].forEach(localX => {
      colliders.push({
        x: pos.x + localX * Math.cos(angle),
        z: pos.z - localX * Math.sin(angle),
        radius: 0.35,
      });
    });
  });
}

// ─── Scenery Helpers ──────────────────────────────────────────────────────────

function makeGridTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  g.addColorStop(0, '#1a3311');
  g.addColorStop(1, '#0c1a08');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const size = 1 + Math.random() * 2.0;
    const green = 45 + Math.random() * 60;
    ctx.fillStyle = `rgba(${green * 0.35}, ${green}, ${green * 0.25}, ${0.12 + Math.random() * 0.2})`;
    ctx.fillRect(x, y, size, size);
  }

  for (let i = 0; i < 100; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 4 + Math.random() * 16;
    const gSoil = ctx.createRadialGradient(x, y, 0, x, y, r);
    gSoil.addColorStop(0, 'rgba(12,8,5,0.4)');
    gSoil.addColorStop(1, 'rgba(12,8,5,0)');
    ctx.fillStyle = gSoil;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80, 80);
  return tex;
}

function buildTerrain(samplePts) {
  const size = 1000, seg = 70;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const trackSample = [];
  for (let i = 0; i < samplePts.length; i += 4) trackSample.push(samplePts[i]);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let minD = Infinity;
    for (let k = 0; k < trackSample.length; k++) {
      const tp = trackSample[k];
      const dx = tp.x - x, dz = tp.z - z;
      const d = dx * dx + dz * dz;
      if (d < minD) minD = d;
    }
    minD = Math.sqrt(minD);
    const clear = 45, blend = 90;
    const t = THREE.MathUtils.clamp((minD - clear) / blend, 0, 1);
    const noise = (Math.sin(x * 0.02) + Math.cos(z * 0.025) + Math.sin((x + z) * 0.015)) * 3.4;
    pos.setY(i, noise * t * t);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: makeGridTexture(), roughness: 1 }));
  mesh.receiveShadow = true;
  return mesh;
}

function buildMountainRidge(radius, baseHeight, heightScale, segs, colorBase, colorPeak, colorSnow, snowLine, opacity, noiseA, noiseB, noiseC) {
  const positions = [], colors = [];
  const cBase = new THREE.Color(colorBase);
  const cPeak = new THREE.Color(colorPeak);

  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const h0 = baseHeight + (Math.sin(i * noiseA) * 0.5 + Math.sin(i * noiseB) * 0.3 + Math.sin(i * noiseC + 2.7) * 0.2) * heightScale;
    const h1 = baseHeight + (Math.sin((i + 1) * noiseA) * 0.5 + Math.sin((i + 1) * noiseB) * 0.3 + Math.sin((i + 1) * noiseC + 2.7) * 0.2) * heightScale;
    const x0 = Math.cos(a0) * radius, z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius, z1 = Math.sin(a1) * radius;

    positions.push(x0, 0, z0, x1, 0, z1, x0, h0, z0);
    positions.push(x1, 0, z1, x1, h1, z1, x0, h0, z0);

    const assignColor = (h) => {
      const t = THREE.MathUtils.clamp(h / (baseHeight + heightScale), 0, 1);
      return new THREE.Color().copy(cBase).lerp(cPeak, t);
    };

    for (let k = 0; k < 2; k++) { colors.push(cBase.r, cBase.g, cBase.b); }
    const c0 = assignColor(h0);
    colors.push(c0.r, c0.g, c0.b);
    colors.push(cBase.r, cBase.g, cBase.b);
    const c1 = assignColor(h1);
    colors.push(c1.r, c1.g, c1.b);
    colors.push(c0.r, c0.g, c0.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    vertexColors: true,
    fog: true,
    side: THREE.DoubleSide,
  }));
}

function buildTrees(scene, samplePts, sampleTangents, ROAD_W, colliders) {
  const spots = [];
  for (let i = 0; i < samplePts.length; i += 14) spots.push(i);
  const plannedTrees = [];
  spots.forEach((i) => {
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    [-1, 1].forEach(side => {
      if (Math.random() < 0.45) return;
      const dist = ROAD_W / 2 + 4.5 + Math.random() * 10;
      const pos = p.clone().addScaledVector(right, side * dist);
      const scale = 0.8 + Math.random() * 0.6;
      const type = Math.random() < 0.5 ? 'pine' : 'deciduous';
      plannedTrees.push({ pos, scale, type, heading: Math.random() * Math.PI * 2 });
    });
  });

  const totalTrees = plannedTrees.length;
  if (totalTrees === 0) return;

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.24, 3.0, 8);
  trunkGeo.translate(0, 1.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422d1b, roughness: 0.95 });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, totalTrees);
  trunkMesh.castShadow = trunkMesh.receiveShadow = true;

  let totalCones = 0, totalSpheres = 0;
  plannedTrees.forEach(t => {
    if (t.type === 'pine') totalCones += 3;
    else totalSpheres += 5;
  });

  const pineGeo = new THREE.ConeGeometry(0.9, 1.5, 8);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1e3f20, roughness: 0.9 });
  const pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, totalCones);
  pineMesh.castShadow = true;

  const deciduousGeo = new THREE.SphereGeometry(1, 8, 8);
  const deciduousMat = new THREE.MeshStandardMaterial({ color: 0x2d4c22, roughness: 0.9 });
  const deciduousMesh = new THREE.InstancedMesh(deciduousGeo, deciduousMat, totalSpheres);
  deciduousMesh.castShadow = true;

  let trunkIdx = 0, coneIdx = 0, sphereIdx = 0;
  const dummy = new THREE.Object3D();

  plannedTrees.forEach(tree => {
    const scale = tree.scale;
    const trunkHeight = 3.0 * scale;
    dummy.position.copy(tree.pos);
    dummy.rotation.set(0, tree.heading, 0);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkMesh.setMatrixAt(trunkIdx++, dummy.matrix);

    if (tree.type === 'pine') {
      for (let c = 0; c < 3; c++) {
        const coneScale = scale * (1 - c * 0.22);
        dummy.position.copy(tree.pos).setY(trunkHeight + (c * 0.75 * scale));
        dummy.rotation.set(0, tree.heading, 0);
        dummy.scale.set(coneScale, scale, coneScale);
        dummy.updateMatrix();
        pineMesh.setMatrixAt(coneIdx++, dummy.matrix);
      }
    } else {
      const canopyPositions = [
        new THREE.Vector3(0, trunkHeight + 0.2 * scale, 0),
        new THREE.Vector3(0.4 * scale, trunkHeight + 0.6 * scale, 0.2 * scale),
        new THREE.Vector3(-0.4 * scale, trunkHeight + 0.5 * scale, -0.2 * scale),
        new THREE.Vector3(0.2 * scale, trunkHeight + 0.8 * scale, -0.4 * scale),
        new THREE.Vector3(-0.2 * scale, trunkHeight + 0.9 * scale, 0.3 * scale),
      ];
      canopyPositions.forEach((lPos, idx) => {
        const size = (0.7 + Math.random() * 0.3) * scale * (idx === 4 ? 0.6 : 0.9);
        const worldPos = tree.pos.clone().add(lPos);
        dummy.position.copy(worldPos);
        dummy.rotation.set(0, tree.heading, 0);
        dummy.scale.set(size, size, size);
        dummy.updateMatrix();
        deciduousMesh.setMatrixAt(sphereIdx++, dummy.matrix);
      });
    }
    colliders.push({ x: tree.pos.x, z: tree.pos.z, radius: 0.35 * tree.scale }); // trunk footprint
  });

  scene.add(trunkMesh);
  if (totalCones > 0)   scene.add(pineMesh);
  if (totalSpheres > 0) scene.add(deciduousMesh);
}

function buildGrandstand(pos, faceAngle) {
  const g = new THREE.Group();
  const tierMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a0, roughness: 0.9 });
  
  const peopleData = [];
  for (let t = 0; t < 4; t++) {
    const tier = new THREE.Mesh(new THREE.BoxGeometry(16, 0.7, 2.2), tierMat);
    tier.position.set(0, 1 + t * 1.15, -t * 1.3);
    tier.castShadow = tier.receiveShadow = true;
    g.add(tier);

    for (let c = 0; c < 14; c++) {
      if (Math.random() < 0.35) continue;
      const crowdColor = [0x3a4a6b, 0x6b3a3a, 0x3a6b4a, 0xd8d0c0, 0x2a2a30, 0x8a7a5a][Math.floor(Math.random() * 6)];
      peopleData.push({
        x: -7 + c * 1.1,
        y: 1.5 + t * 1.15,
        z: -t * 1.3,
        color: crowdColor
      });
    }
  }

  if (peopleData.length > 0) {
    const personGeo = new THREE.BoxGeometry(0.4, 0.55, 0.4);
    const personMat = new THREE.MeshStandardMaterial({ roughness: 0.8 });
    const instMesh = new THREE.InstancedMesh(personGeo, personMat, peopleData.length);
    instMesh.castShadow = true;
    
    const dummy = new THREE.Object3D();
    const colorObj = new THREE.Color();
    peopleData.forEach((p, idx) => {
      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      instMesh.setMatrixAt(idx, dummy.matrix);
      instMesh.setColorAt(idx, colorObj.setHex(p.color));
    });
    g.add(instMesh);
  }

  g.position.copy(pos);
  g.rotation.y = faceAngle;
  return g;
}

function makeBillboardTexture(text) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#c0392b'; ctx.fillRect(0, 0, 512, 14);
  ctx.fillStyle = '#1a5fb4'; ctx.fillRect(0, 242, 512, 14);
  ctx.fillStyle = '#1a1c22'; ctx.font = 'bold 56px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 128);
  return new THREE.CanvasTexture(c);
}

function buildBillboard(pos, faceAngle, text) {
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x14161c });
  [-3.5, 3.5].forEach(x => {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 6, 8), poleMat);
    pole.position.set(x, 3, 0); g.add(pole);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), new THREE.MeshBasicMaterial({ map: makeBillboardTexture(text) }));
  board.position.set(0, 5.5, 0);
  g.add(board);
  g.position.copy(pos);
  g.rotation.y = faceAngle;
  return g;
}
