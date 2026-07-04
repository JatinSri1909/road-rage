/**
 * Returns the geometry data (samplePts, sampleTangents, curvature) that the
 * rest of the engine (physics, AI, minimap) needs. Track-specific scenery is
 * added via trackDef.buildScenery() at the end.
 */

import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

export function buildTrackMesh(scene, trackDef) {
  const { controlPoints, curveTension, samples: SAMPLES, roadWidth: ROAD_W, boostPadIndices: BOOST_PAD_IDX } = trackDef;

  // ── Spline sampling ───────────────────────────────────────────────────────
  const curve      = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', curveTension);
  const samplePts  = curve.getSpacedPoints(SAMPLES);
  const sampleTangents = samplePts.map((_, i) => {
    const next = samplePts[(i + 1) % samplePts.length];
    const prev = samplePts[(i - 1 + samplePts.length) % samplePts.length];
    return new THREE.Vector3().subVectors(next, prev).normalize();
  });

  // Curvature per sample (used by AI look-ahead)
  const curvature = new Float32Array(SAMPLES);
  for (let i = 0; i < SAMPLES; i++) {
    const prev = sampleTangents[(i - 6 + SAMPLES) % SAMPLES];
    const next = sampleTangents[(i + 6) % SAMPLES];
    curvature[i] = 1 - prev.dot(next);
  }

  // ── Road ribbon ───────────────────────────────────────────────────────────
  const roadPositions = [], roadUVs = [], roadIndices = [];
  for (let i = 0; i < samplePts.length; i++) {
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    const l = p.clone().addScaledVector(right, -ROAD_W / 2);
    const r = p.clone().addScaledVector(right,  ROAD_W / 2);
    roadPositions.push(l.x, l.y + 0.08, l.z, r.x, r.y + 0.08, r.z);
    roadUVs.push(0, i * 0.2, 1, i * 0.2);
  }
  for (let i = 0; i < samplePts.length; i++) {
    const ni = (i + 1) % samplePts.length;
    const a = i*2, b = i*2+1, c = ni*2, d = ni*2+1;
    roadIndices.push(a, c, b, b, c, d);
  }
  const roadGeo = new THREE.BufferGeometry();
  roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3));
  roadGeo.setAttribute('uv',       new THREE.Float32BufferAttribute(roadUVs, 2));
  roadGeo.setIndex(roadIndices);
  roadGeo.computeVertexNormals();
  const roadMesh = new THREE.Mesh(roadGeo, makeAsphaltMaterial());
  roadMesh.receiveShadow = true;
  scene.add(roadMesh);

  // ── Curbs ─────────────────────────────────────────────────────────────────
  scene.add(buildCurbRibbon(samplePts, sampleTangents, ROAD_W, -1));
  scene.add(buildCurbRibbon(samplePts, sampleTangents, ROAD_W,  1));

  // ── Skid marks ────────────────────────────────────────────────────────────
  buildSkidMarks(scene, samplePts, sampleTangents, ROAD_W);

  // ── Centre-line dashes ────────────────────────────────────────────────────
  buildDashes(scene, samplePts, sampleTangents, SAMPLES);

  // ── Armco posts ───────────────────────────────────────────────────────────
  buildPosts(scene, samplePts, sampleTangents, ROAD_W, SAMPLES);

  // ── Guardrails ────────────────────────────────────────────────────────────
  [-1, 1].forEach(side => {
    scene.add(buildGuardrail(samplePts, sampleTangents, side, ROAD_W / 2 + 1.2, 0xaeb4b8, 0.11, 0.85, true));
    scene.add(buildGuardrail(samplePts, sampleTangents, side, ROAD_W / 2 + 1.2, 0xc0392b, 0.045, 1.05, false));
  });

  // ── Start/finish gate ─────────────────────────────────────────────────────
  buildStartGate(scene, samplePts, sampleTangents, ROAD_W);

  // ── Boost pads ────────────────────────────────────────────────────────────
  BOOST_PAD_IDX.forEach(idx => scene.add(buildBoostPad(samplePts, sampleTangents, idx)));

  // ── Track-specific scenery ────────────────────────────────────────────────
  if (typeof trackDef.buildScenery === 'function') {
    trackDef.buildScenery(scene, { samplePts, sampleTangents, ROAD_W, UP });
  }

  return { samplePts, sampleTangents, curvature, SAMPLES, ROAD_W, BOOST_PAD_IDX };
}

// ─── Road materials ───────────────────────────────────────────────────────────

function makeAsphaltMaterial() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c1d22'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const shade = 15 + Math.random() * 25;
    ctx.fillStyle = `rgba(${shade},${shade},${shade+4},0.25)`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 1.5+Math.random()*1.5, 1.5+Math.random()*1.5);
  }
  for (let i = 0; i < 8; i++) {
    ctx.strokeStyle = `rgba(10,10,12,${0.08+Math.random()*0.12})`;
    ctx.lineWidth = 4 + Math.random() * 12;
    ctx.beginPath(); ctx.moveTo(Math.random()*256, 0); ctx.lineTo(Math.random()*256, 256); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.75, metalness: 0.1, bumpMap: tex, bumpScale: 0.015, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
}

// ─── Track furniture builders ─────────────────────────────────────────────────

function buildCurbRibbon(samplePts, sampleTangents, ROAD_W, side) {
  const positions = [], uvs = [], indices = [];
  const inner = ROAD_W / 2, outer = ROAD_W / 2 + 0.9;
  for (let i = 0; i < samplePts.length; i++) {
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    const inP  = p.clone().addScaledVector(right, side * inner);
    const outP = p.clone().addScaledVector(right, side * outer);
    positions.push(inP.x, 0.12, inP.z, outP.x, 0.12, outP.z);
    uvs.push(0, i * 0.5, 1, i * 0.5);
  }
  for (let i = 0; i < samplePts.length; i++) {
    const ni = (i + 1) % samplePts.length;
    const a = i*2, b = i*2+1, c = ni*2, d = ni*2+1;
    if (side > 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const ctx = c.getContext('2d');
  [0, 1].forEach(block => {
    ctx.fillStyle = block === 0 ? '#b81c2f' : '#dddedb';
    ctx.fillRect(0, block * 128, 64, 128);
  });
  const curbTex = new THREE.CanvasTexture(c);
  curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;
  curbTex.repeat.set(1, samplePts.length * 0.12);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  mesh.receiveShadow = true;
  return mesh;
}

function buildSkidMarks(scene, samplePts, sampleTangents, ROAD_W) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32,32,0,32,32,26);
  g.addColorStop(0,'rgba(10,10,12,0.5)'); g.addColorStop(1,'rgba(10,10,12,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const skidTex = new THREE.CanvasTexture(c);
  const skidMat = new THREE.MeshBasicMaterial({ map: skidTex, transparent: true, depthWrite: false });
  for (let s = 0; s < 14; s++) {
    const idx = Math.floor(Math.random() * samplePts.length);
    if (idx < 20) continue;
    const p = samplePts[idx], t = sampleTangents[idx];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    const lateral = (Math.random() - 0.5) * ROAD_W * 0.6;
    const pos = p.clone().addScaledVector(right, lateral);
    const skid = new THREE.Mesh(new THREE.PlaneGeometry(4 + Math.random() * 3, 4 + Math.random() * 3), skidMat);
    skid.rotation.x = -Math.PI / 2;
    skid.rotation.z = Math.random() * Math.PI * 2;
    skid.position.set(pos.x, 0.09, pos.z);
    scene.add(skid);
  }
}

function buildDashes(scene, samplePts, sampleTangents, SAMPLES) {
  const dashGeo = new THREE.PlaneGeometry(0.4, 2.4);
  dashGeo.rotateX(-Math.PI / 2);
  const dashCount = Math.floor(samplePts.length / 6);
  const dashMesh  = new THREE.InstancedMesh(dashGeo, new THREE.MeshBasicMaterial({ color: 0xf2f2ee, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }), dashCount);
  const dummy = new THREE.Object3D();
  let di = 0;
  for (let i = 0; i < samplePts.length; i += 6) {
    if (di >= dashCount) break;
    const p = samplePts[i], t = sampleTangents[i];
    dummy.position.set(p.x, 0.14, p.z);
    dummy.rotation.set(0, Math.atan2(t.x, t.z), 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    dashMesh.setMatrixAt(di++, dummy.matrix);
  }
  scene.add(dashMesh);
}

function buildPosts(scene, samplePts, sampleTangents, ROAD_W, SAMPLES) {
  const postGeo   = new THREE.BoxGeometry(0.6, 1.1, 0.6);
  const totalPosts = Math.floor(samplePts.length / 10) * 2;
  const half       = Math.ceil(totalPosts / 2);
  const redMesh    = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 }), half);
  const greyMesh   = new THREE.InstancedMesh(postGeo, new THREE.MeshStandardMaterial({ color: 0xd8dcd8, roughness: 0.6 }), half);
  redMesh.castShadow = redMesh.receiveShadow = greyMesh.castShadow = greyMesh.receiveShadow = true;
  let ri = 0, gi = 0;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < samplePts.length; i += 10) {
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    const isRed = (Math.floor(i / 10) % 2 === 0);
    [-1, 1].forEach(side => {
      const pos = p.clone().addScaledVector(right, side * (ROAD_W / 2 + 1.2));
      dummy.position.set(pos.x, 0.55, pos.z);
      dummy.rotation.set(0, Math.atan2(t.x, t.z), 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      if (isRed && ri < half) redMesh.setMatrixAt(ri++, dummy.matrix);
      else if (!isRed && gi < half) greyMesh.setMatrixAt(gi++, dummy.matrix);
    });
  }
  scene.add(redMesh);
  scene.add(greyMesh);
}

function buildGuardrail(samplePts, sampleTangents, side, dist, color, radius, height, metallic) {
  const pts = samplePts.map((p, i) => {
    const right = new THREE.Vector3().crossVectors(sampleTangents[i], UP).normalize();
    return p.clone().addScaledVector(right, side * dist).setY(height);
  });
  const railCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(railCurve, 160, radius, 4, true);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: metallic ? 0.75 : 0.1, roughness: metallic ? 0.35 : 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}

function buildStartGate(scene, samplePts, sampleTangents, ROAD_W) {
  const startP  = samplePts[0];
  const startT  = sampleTangents[0];
  const right   = new THREE.Vector3().crossVectors(startT, UP).normalize();
  const postMat = new THREE.MeshStandardMaterial({ color: 0x111318 });
  [-1, 1].forEach(side => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(1, 7, 1), postMat);
    const pos  = startP.clone().addScaledVector(right, side * (ROAD_W / 2 + 1));
    post.position.set(pos.x, 3.5, pos.z);
    post.rotation.y = Math.atan2(startT.x, startT.z);
    post.castShadow = true;
    scene.add(post);
  });
  // Checker beam
  const cc = document.createElement('canvas'); cc.width = 64; cc.height = 16;
  const cctx = cc.getContext('2d');
  for (let x = 0; x < 64; x += 8) {
    for (let y = 0; y < 16; y += 8) {
      cctx.fillStyle = ((x/8 + y/8) % 2 === 0) ? '#111318' : '#f2f2ee';
      cctx.fillRect(x, y, 8, 8);
    }
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W + 2, 0.6, 0.6), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(cc), roughness: 0.7 }));
  beam.position.set(startP.x, 6.6, startP.z);
  beam.rotation.y = Math.atan2(startT.x, startT.z);
  scene.add(beam);
}

function buildBoostPad(samplePts, sampleTangents, idx) {
  const p = samplePts[idx], t = sampleTangents[idx];
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 64, 128);
  ctx.fillStyle = 'rgba(240,190,20,0.9)';
  for (let i = 0; i < 3; i++) {
    const y = i * 40 + 10;
    ctx.beginPath(); ctx.moveTo(8,y+30); ctx.lineTo(32,y); ctx.lineTo(56,y+30); ctx.lineTo(44,y+30); ctx.lineTo(32,y+14); ctx.lineTo(20,y+30); ctx.closePath(); ctx.fill();
  }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 10), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -Math.atan2(t.x, t.z);
  mesh.position.set(p.x, 0.05, p.z);
  return mesh;
}