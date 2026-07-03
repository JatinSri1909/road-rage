(function(){
"use strict";

const isMobileDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
document.body.classList.toggle('mobile-device', isMobileDevice);
document.body.classList.toggle('desktop-device', !isMobileDevice);

/* ============================= SETUP ============================= */
const renderer = new THREE.WebGLRenderer({ antialias: !isMobileDevice, powerPreference:'high-performance' });
function getViewportSize(){
  const width = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  return { width, height };
}
function resizeRenderer(){
  const { width, height } = getViewportSize();
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth/window.innerHeight, 0.1, 2500);

window.addEventListener('resize', () => {
  resizeRenderer();
});
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', resizeRenderer);
}
resizeRenderer();

function makeSkyTexture(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,512);
  g.addColorStop(0.0,  '#090022');
  g.addColorStop(0.20, '#15003c');
  g.addColorStop(0.42, '#3a0066');
  g.addColorStop(0.60, '#660077');
  g.addColorStop(0.75, '#b30066');
  g.addColorStop(0.88, '#ff3300');
  g.addColorStop(0.95, '#ffaa00');
  g.addColorStop(1.0,  '#ffe600');
  ctx.fillStyle = g; ctx.fillRect(0,0,512,512);

  for (let i = 0; i < 24; i++) {
    const y = 280 + Math.random() * 220;
    const alpha = 0.04 + Math.random() * 0.08;
    ctx.fillStyle = `rgba(255, 0, 128, ${alpha})`;
    ctx.fillRect(0, y, 512, 2 + Math.random() * 3);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.LinearFilter;
  return tex;
}
scene.background = makeSkyTexture();
scene.fog = new THREE.FogExp2(0x15003c, 0.0020);

function makeEnvEquirect(){
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0,0,0,64);
  g.addColorStop(0.0, '#15003c');
  g.addColorStop(0.5, '#b30066');
  g.addColorStop(1.0, '#ffaa00');
  ctx.fillStyle = g; ctx.fillRect(0,0,128,64);
  return new THREE.CanvasTexture(c);
}
const envEquirect = makeEnvEquirect();
envEquirect.mapping = THREE.EquirectangularReflectionMapping;
const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromEquirectangular(envEquirect).texture;
pmremGenerator.dispose();

function makeGlowTexture(){
  const c = document.createElement('canvas'); c.width=32; c.height=32;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(16,16,0,16,16,16);
  g.addColorStop(0,'rgba(255,255,255,1)');
  g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,32,32);
  return new THREE.CanvasTexture(c);
}
const glowTex = makeGlowTexture();
function addGlowSprite(parent, localPos, color, size){
  const mat = new THREE.SpriteMaterial({ map:glowTex, color, transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(size,size,1);
  sprite.position.copy(localPos);
  parent.add(sprite);
  return sprite;
}

function makeRetroSunTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const cx = 256, cy = 256, r = 240;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  g.addColorStop(0.0, '#ff007f');
  g.addColorStop(0.4, '#ff00aa');
  g.addColorStop(0.7, '#ff5e00');
  g.addColorStop(1.0, '#ffff00');
  ctx.fillStyle = g;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.globalCompositeOperation = 'destination-out';
  const numStripes = 12;
  for (let i = 0; i < numStripes; i++) {
    const progress = i / numStripes;
    const stripeY = cy - 20 + progress * (r + 20);
    const stripeHeight = 3 + progress * 15;
    ctx.fillRect(0, stripeY, 512, stripeHeight);
  }
  ctx.restore();
  return new THREE.CanvasTexture(c);
}

const sunGroup = new THREE.Group();
sunGroup.position.set(80, 165, -600);
const retroSunTex = makeRetroSunTexture();
const sunDisc = new THREE.Mesh(
  new THREE.PlaneGeometry(160, 160),
  new THREE.MeshBasicMaterial({ map: retroSunTex, transparent: true, fog: false, depthWrite: false })
);
sunGroup.add(sunDisc);
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

function makeLensFlareTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const hg = ctx.createLinearGradient(0, 128, 256, 128);
  hg.addColorStop(0, 'rgba(255,0,128,0)');
  hg.addColorStop(0.4, 'rgba(255,50,180,0.25)');
  hg.addColorStop(0.5, 'rgba(255,200,240,0.6)');
  hg.addColorStop(0.6, 'rgba(255,50,180,0.25)');
  hg.addColorStop(1, 'rgba(255,0,128,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 122, 256, 12);
  return new THREE.CanvasTexture(c);
}
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

scene.add(new THREE.AmbientLight(0x2a1040, 0.65));
const sunLight = new THREE.DirectionalLight(0xff7a00, 1.6);
sunLight.position.set(80, 180, -100);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048,2048);
sunLight.shadow.camera.left = -220; sunLight.shadow.camera.right = 220;
sunLight.shadow.camera.top = 220; sunLight.shadow.camera.bottom = -220;
sunLight.shadow.camera.far = 500;
scene.add(sunLight);
scene.add(new THREE.HemisphereLight(0x5c0c66, 0x140520, 0.7));

/* ============================= TRACK ============================= */
const controlPts = [
  new THREE.Vector3(0,0,0), new THREE.Vector3(55,0,-15), new THREE.Vector3(105,0,10),
  new THREE.Vector3(130,0,55), new THREE.Vector3(105,0,105), new THREE.Vector3(45,0,130),
  new THREE.Vector3(-25,0,115), new THREE.Vector3(-75,0,140), new THREE.Vector3(-130,0,95),
  new THREE.Vector3(-100,0,35), new THREE.Vector3(-55,0,10), new THREE.Vector3(-60,0,-40),
  new THREE.Vector3(-15,0,-55),
];
const curve = new THREE.CatmullRomCurve3(controlPts, true, 'catmullrom', 0.55);
const ROAD_W = 13;
const SAMPLES = 480;
const samplePts = curve.getSpacedPoints(SAMPLES);
const sampleTangents = [];
for (let i=0;i<samplePts.length;i++){
  const nextPt = samplePts[(i+1)%samplePts.length];
  const prevPt = samplePts[(i-1+samplePts.length)%samplePts.length];
  const t = new THREE.Vector3().subVectors(nextPt, prevPt).normalize();
  sampleTangents.push(t);
}
const UP = new THREE.Vector3(0,1,0);

const curvature = new Float32Array(SAMPLES);
for (let i=0;i<SAMPLES;i++){
  const prev = sampleTangents[(i-6+SAMPLES)%SAMPLES];
  const next = sampleTangents[(i+6)%SAMPLES];
  curvature[i] = 1 - prev.dot(next);
}

function makeGridTexture(){
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256,256,0, 256,256,360);
  g.addColorStop(0, '#1a3311');
  g.addColorStop(1, '#0c1a08');
  ctx.fillStyle = g; ctx.fillRect(0,0,512,512);
  for (let i=0; i<9000; i++) {
    const x = Math.random()*512;
    const y = Math.random()*512;
    const size = 1 + Math.random()*2.0;
    const green = 45 + Math.random()*60;
    ctx.fillStyle = `rgba(${green*0.35}, ${green}, ${green*0.25}, ${0.12 + Math.random()*0.2})`;
    ctx.fillRect(x, y, size, size);
  }
  for (let i=0; i<100; i++) {
    const x = Math.random()*512;
    const y = Math.random()*512;
    const r = 4 + Math.random()*16;
    const gSoil = ctx.createRadialGradient(x,y,0, x,y,r);
    gSoil.addColorStop(0, 'rgba(12,8,5,0.4)');
    gSoil.addColorStop(1, 'rgba(12,8,5,0)');
    ctx.fillStyle = gSoil;
    ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(80,80);
  return tex;
}
const gridTex = makeGridTexture();

function buildTerrain(){
  const size = 1000, seg = 70;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI/2);
  const pos = geo.attributes.position;
  const trackSample = [];
  for (let i=0;i<samplePts.length;i+=2) trackSample.push(samplePts[i]);
  for (let i=0;i<pos.count;i++){
    const x = pos.getX(i), z = pos.getZ(i);
    let minD = Infinity;
    for (let k=0;k<trackSample.length;k++){
      const tp = trackSample[k];
      const dx = tp.x-x, dz = tp.z-z;
      const d = dx*dx+dz*dz;
      if (d<minD) minD = d;
    }
    minD = Math.sqrt(minD);
    const clear = 45, blend = 90;
    const t = THREE.MathUtils.clamp((minD-clear)/blend, 0, 1);
    const noise = (Math.sin(x*0.02)+Math.cos(z*0.025)+Math.sin((x+z)*0.015))*3.4;
    pos.setY(i, noise*t*t);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map:gridTex, roughness:1 }));
  mesh.receiveShadow = true;
  return mesh;
}
scene.add(buildTerrain());

const roadPositions = [], roadUVs = [], roadIndices = [];
for (let i=0;i<samplePts.length;i++){
  const p = samplePts[i];
  const t = sampleTangents[i];
  const right = new THREE.Vector3().crossVectors(t, UP).normalize();
  const l = p.clone().addScaledVector(right, -ROAD_W/2);
  const r = p.clone().addScaledVector(right, ROAD_W/2);
  roadPositions.push(l.x,l.y+0.08,l.z, r.x,r.y+0.08,r.z);
  roadUVs.push(0, i*0.2, 1, i*0.2);
}
for (let i=0;i<samplePts.length;i++){
  const ni = (i+1) % samplePts.length;
  const a=i*2, b=i*2+1, c=ni*2, d=ni*2+1;
  roadIndices.push(a,c,b, b,c,d);
}
const roadGeo = new THREE.BufferGeometry();
roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions,3));
roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roadUVs,2));
roadGeo.setIndex(roadIndices);
roadGeo.computeVertexNormals();

function makeAsphaltTexture(){
  const c = document.createElement('canvas'); c.width=256; c.height=256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1c1d22'; ctx.fillRect(0,0,256,256);
  for (let i=0;i<2500;i++){
    const shade = 15 + Math.random()*25;
    ctx.fillStyle = `rgba(${shade},${shade},${shade+4},0.25)`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 1.5+Math.random()*1.5, 1.5+Math.random()*1.5);
  }
  for (let i=0; i<8; i++) {
    ctx.strokeStyle = `rgba(10,10,12,${0.08 + Math.random()*0.12})`;
    ctx.lineWidth = 4 + Math.random()*12;
    ctx.beginPath();
    ctx.moveTo(Math.random()*256, 0);
    ctx.lineTo(Math.random()*256 + (Math.random()-0.5)*40, 256);
    ctx.stroke();
  }
  for (let i=0;i<3000;i++){
    const alpha = 0.05 + Math.random()*0.08;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(Math.random()*256, Math.random()*256, 1, 1);
  }
  return new THREE.CanvasTexture(c);
}
const asphaltTex = makeAsphaltTexture();
asphaltTex.wrapS = asphaltTex.wrapT = THREE.RepeatWrapping;
asphaltTex.repeat.set(2, samplePts.length*0.06);
const roadMesh = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({
  map:asphaltTex,
  roughness:0.75,
  metalness:0.1,
  bumpMap: asphaltTex,
  bumpScale: 0.015,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -2
}));
roadMesh.receiveShadow = true;
scene.add(roadMesh);

function makeCurbTexture(){
  const c = document.createElement('canvas'); c.width=64; c.height=256;
  const ctx = c.getContext('2d');
  for (let block=0; block<2; block++) {
    const startY = block * 128;
    ctx.fillStyle = block === 0 ? '#b81c2f' : '#dddedb';
    ctx.fillRect(0, startY, 64, 128);
    for (let i=0; i<800; i++) {
      const x = Math.random()*64;
      const y = startY + Math.random()*128;
      const shade = Math.random() < 0.5 ? 0 : 255;
      const size = Math.random() < 0.8 ? 1 : 2;
      ctx.fillStyle = `rgba(${shade},${shade},${shade},${0.05 + Math.random()*0.12})`;
      ctx.fillRect(x, y, size, size);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, startY, 64, 4);
  }
  return new THREE.CanvasTexture(c);
}
const curbTex = makeCurbTexture();
curbTex.wrapS = curbTex.wrapT = THREE.RepeatWrapping;
curbTex.repeat.set(1, samplePts.length*0.12);
function buildCurbRibbon(side){
  const positions=[], uvs=[], indices=[];
  const inner = ROAD_W/2, outer = ROAD_W/2+0.9;
  for (let i=0;i<samplePts.length;i++){
    const p = samplePts[i];
    const t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    const inP = p.clone().addScaledVector(right, side*inner);
    const outP = p.clone().addScaledVector(right, side*outer);
    positions.push(inP.x,0.12,inP.z, outP.x,0.12,outP.z);
    uvs.push(0, i*0.5, 1, i*0.5);
  }
  for (let i=0;i<samplePts.length;i++){
    const ni=(i+1)%samplePts.length;
    const a=i*2,b=i*2+1,c=ni*2,d=ni*2+1;
    if (side>0) indices.push(a,c,b, b,c,d); else indices.push(a,b,c, b,d,c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    map:curbTex,
    roughness:0.8,
    side:THREE.DoubleSide,
    bumpMap:curbTex,
    bumpScale:0.01,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2
  }));
  mesh.receiveShadow = true;
  return mesh;
}
scene.add(buildCurbRibbon(-1));
scene.add(buildCurbRibbon(1));

function makeSkidTexture(){
  const c = document.createElement('canvas'); c.width=64; c.height=64;
  const ctx = c.getContext('2d');
  for (let i=0;i<3;i++){
    const g = ctx.createRadialGradient(32,32,0,32,32,26-i*4);
    g.addColorStop(0,'rgba(10,10,12,0.5)'); g.addColorStop(1,'rgba(10,10,12,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.translate(32+ (Math.random()-0.5)*10, 32+(Math.random()-0.5)*10);
    ctx.rotate(Math.random()*Math.PI);
    ctx.scale(1, 0.4);
    ctx.beginPath(); ctx.arc(0,0,26,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  return new THREE.CanvasTexture(c);
}
const skidTex = makeSkidTexture();
const skidMat = new THREE.MeshBasicMaterial({ map:skidTex, transparent:true, depthWrite:false });
for (let s=0; s<14; s++){
  const idx = Math.floor(Math.random()*samplePts.length);
  if (idx < 20) continue;
  const p = samplePts[idx], t = sampleTangents[idx];
  const right = new THREE.Vector3().crossVectors(t, UP).normalize();
  const lateral = (Math.random()-0.5)*ROAD_W*0.6;
  const pos = p.clone().addScaledVector(right, lateral);
  const skid = new THREE.Mesh(new THREE.PlaneGeometry(4+Math.random()*3, 4+Math.random()*3), skidMat);
  skid.rotation.x = -Math.PI/2;
  skid.rotation.z = Math.random()*Math.PI*2;
  skid.position.set(pos.x, 0.09, pos.z);
  scene.add(skid);
}

const dashGeo = new THREE.PlaneGeometry(0.4,2.4);
dashGeo.rotateX(-Math.PI/2);
const dashMat = new THREE.MeshBasicMaterial({
  color:0xf2f2ee,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -4
});
const dashCount = Math.floor(samplePts.length / 6);
const dashMesh = new THREE.InstancedMesh(dashGeo, dashMat, dashCount);
let dashIdx = 0;
const dummyDash = new THREE.Object3D();
for (let i=0;i<samplePts.length;i+=6){
  if (dashIdx >= dashCount) break;
  const p = samplePts[i], t = sampleTangents[i];
  dummyDash.position.set(p.x, 0.14, p.z);
  dummyDash.rotation.set(0, Math.atan2(t.x, t.z), 0);
  dummyDash.scale.set(1, 1, 1);
  dummyDash.updateMatrix();
  dashMesh.setMatrixAt(dashIdx++, dummyDash.matrix);
}
scene.add(dashMesh);

const postGeo = new THREE.BoxGeometry(0.6,1.1,0.6);
const redMat = new THREE.MeshStandardMaterial({ color: 0xc0392b, roughness: 0.6 });
const greyMat = new THREE.MeshStandardMaterial({ color: 0xd8dcd8, roughness: 0.6 });

const totalPosts = Math.floor(samplePts.length / 10) * 2;
const halfPosts = Math.ceil(totalPosts / 2);

const redPostMesh = new THREE.InstancedMesh(postGeo, redMat, halfPosts);
const greyPostMesh = new THREE.InstancedMesh(postGeo, greyMat, halfPosts);
redPostMesh.castShadow = redPostMesh.receiveShadow = true;
greyPostMesh.castShadow = greyPostMesh.receiveShadow = true;

let redIdx = 0, greyIdx = 0;
const dummyPost = new THREE.Object3D();

for (let i=0;i<samplePts.length;i+=10){
  const p = samplePts[i], t = sampleTangents[i];
  const right = new THREE.Vector3().crossVectors(t, UP).normalize();
  const isRed = (Math.floor(i/10)%2===0);
  [-1,1].forEach(side=>{
    const pos = p.clone().addScaledVector(right, side*(ROAD_W/2+1.2));
    dummyPost.position.set(pos.x, 0.55, pos.z);
    dummyPost.rotation.set(0, Math.atan2(t.x, t.z), 0);
    dummyPost.scale.set(1, 1, 1);
    dummyPost.updateMatrix();
    if (isRed) {
      if (redIdx < halfPosts) redPostMesh.setMatrixAt(redIdx++, dummyPost.matrix);
    } else {
      if (greyIdx < halfPosts) greyPostMesh.setMatrixAt(greyIdx++, dummyPost.matrix);
    }
  });
}
scene.add(redPostMesh);
scene.add(greyPostMesh);

function buildGuardrail(side, dist, color, radius, height, metallic){
  const pts = [];
  for (let i=0;i<samplePts.length;i++){
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    pts.push(p.clone().addScaledVector(right, side*dist).setY(height));
  }
  const railCurve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);
  const geo = new THREE.TubeGeometry(railCurve, 360, radius, 6, true);
  const mat = new THREE.MeshStandardMaterial({ color, metalness: metallic?0.75:0.1, roughness: metallic?0.35:0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  return mesh;
}
[-1,1].forEach(side=>{
  scene.add(buildGuardrail(side, ROAD_W/2+1.2, 0xaeb4b8, 0.11, 0.85, true));
  scene.add(buildGuardrail(side, ROAD_W/2+1.2, 0xc0392b, 0.045, 1.05, false));
});

const startP = samplePts[0], startT = sampleTangents[0];
const startRight = new THREE.Vector3().crossVectors(startT, UP).normalize();
function makeGatePost(side){
  const post = new THREE.Mesh(new THREE.BoxGeometry(1,7,1), new THREE.MeshStandardMaterial({color:0x111318}));
  const pos = startP.clone().addScaledVector(startRight, side*(ROAD_W/2+1));
  post.position.set(pos.x, 3.5, pos.z);
  post.rotation.y = Math.atan2(startT.x, startT.z);
  post.castShadow = true;
  return post;
}
scene.add(makeGatePost(-1));
scene.add(makeGatePost(1));
function makeCheckerTexture(){
  const c = document.createElement('canvas'); c.width=64; c.height=16;
  const ctx = c.getContext('2d');
  const cell = 8;
  for (let x=0;x<64;x+=cell){
    for (let y=0;y<16;y+=cell){
      ctx.fillStyle = ((x/cell + y/cell)%2===0) ? '#111318' : '#f2f2ee';
      ctx.fillRect(x,y,cell,cell);
    }
  }
  return new THREE.CanvasTexture(c);
}
const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(ROAD_W+2,0.6,0.6), new THREE.MeshStandardMaterial({ map:makeCheckerTexture(), roughness:0.7 }));
gateBeam.position.set(startP.x, 6.6, startP.z);
gateBeam.rotation.y = Math.atan2(startT.x, startT.z);
scene.add(gateBeam);

function buildMountainRidge(radius, baseHeight, heightScale, segs, colorBase, colorPeak, colorSnow, snowLine, opacity, noiseA, noiseB, noiseC) {
  const positions = [], colors = [];
  const cBase = new THREE.Color(colorBase);
  const cPeak = new THREE.Color(colorPeak);
  const cSnow = new THREE.Color(colorSnow);
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2;
    const a1 = ((i + 1) / segs) * Math.PI * 2;
    const h0 = baseHeight + (Math.sin(i * noiseA) * 0.5 + Math.sin(i * noiseB) * 0.3 + Math.sin(i * noiseC + 2.7) * 0.2) * heightScale;
    const h1 = baseHeight + (Math.sin((i+1) * noiseA) * 0.5 + Math.sin((i+1) * noiseB) * 0.3 + Math.sin((i+1) * noiseC + 2.7) * 0.2) * heightScale;
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
    side: THREE.DoubleSide
  }));
}

scene.add(buildMountainRidge(520, 50, 55, 96, 0x2a2040, 0x5a4878, 0xc8c0d8, 80, 0.6, 1.3, 0.47, 2.1));
scene.add(buildMountainRidge(470, 35, 42, 80, 0x3a2848, 0x6a4870, 0xd0c8d8, 60, 0.75, 1.7, 0.6, 1.4));
scene.add(buildMountainRidge(440, 22, 30, 72, 0x1a1428, 0x3a2840, 0xb0a8c0, 42, 0.9, 2.1, 0.9, 0.55));

function buildTrees(){
  const spots = [];
  for (let i=0;i<samplePts.length;i+=14) spots.push(i);
  const plannedTrees = [];
  spots.forEach((i)=>{
    const p = samplePts[i], t = sampleTangents[i];
    const right = new THREE.Vector3().crossVectors(t, UP).normalize();
    [-1,1].forEach(side=>{
      if (Math.random() < 0.45) return;
      const dist = ROAD_W/2 + 4.5 + Math.random()*10;
      const pos = p.clone().addScaledVector(right, side*dist);
      const scale = 0.8 + Math.random()*0.6;
      const type = Math.random() < 0.5 ? 'pine' : 'deciduous';
      plannedTrees.push({ pos, scale, type, heading: Math.random()*Math.PI*2 });
    });
  });
  const totalTrees = plannedTrees.length;
  if (totalTrees === 0) return;
  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.24, 3.0, 8);
  trunkGeo.translate(0, 1.5, 0);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x422d1b, roughness: 0.95 });
  const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, totalTrees);
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  let totalCones = 0;
  let totalSpheres = 0;
  plannedTrees.forEach(tree => {
    if (tree.type === 'pine') totalCones += 3;
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
        const coneScale = scale * (1 - c*0.22);
        dummy.position.copy(tree.pos).setY(trunkHeight + (c * 0.75 * scale));
        dummy.rotation.set(0, tree.heading, 0);
        dummy.scale.set(coneScale, scale, coneScale);
        dummy.updateMatrix();
        pineMesh.setMatrixAt(coneIdx++, dummy.matrix);
      }
    } else {
      const canopyPositions = [
        new THREE.Vector3(0, trunkHeight + 0.2*scale, 0),
        new THREE.Vector3(0.4*scale, trunkHeight + 0.6*scale, 0.2*scale),
        new THREE.Vector3(-0.4*scale, trunkHeight + 0.5*scale, -0.2*scale),
        new THREE.Vector3(0.2*scale, trunkHeight + 0.8*scale, -0.4*scale),
        new THREE.Vector3(-0.2*scale, trunkHeight + 0.9*scale, 0.3*scale),
      ];
      canopyPositions.forEach((lPos, idx) => {
        const size = (0.7 + Math.random()*0.3) * scale * (idx === 4 ? 0.6 : 0.9);
        const worldPos = tree.pos.clone().add(lPos);
        dummy.position.copy(worldPos);
        dummy.rotation.set(0, tree.heading, 0);
        dummy.scale.set(size, size, size);
        dummy.updateMatrix();
        deciduousMesh.setMatrixAt(sphereIdx++, dummy.matrix);
      });
    }
  });
  scene.add(trunkMesh);
  if (totalCones > 0) scene.add(pineMesh);
  if (totalSpheres > 0) scene.add(deciduousMesh);
}
buildTrees();

function buildGrandstand(pos, faceAngle){
  const g = new THREE.Group();
  const tierMat = new THREE.MeshStandardMaterial({ color:0x9aa0a0, roughness:0.9 });
  for (let t=0;t<4;t++){
    const tier = new THREE.Mesh(new THREE.BoxGeometry(16,0.7,2.2), tierMat);
    tier.position.set(0, 1+t*1.15, -t*1.3);
    tier.castShadow = true; tier.receiveShadow = true;
    g.add(tier);
    for (let c=0;c<14;c++){
      if (Math.random() < 0.35) continue;
      const crowdColor = [0x3a4a6b,0x6b3a3a,0x3a6b4a,0xd8d0c0,0x2a2a30,0x8a7a5a][Math.floor(Math.random()*6)];
      const person = new THREE.Mesh(new THREE.BoxGeometry(0.4,0.55,0.4), new THREE.MeshStandardMaterial({ color:crowdColor, roughness:0.8 }));
      person.position.set(-7+c*1.1, 1.5+t*1.15, -t*1.3);
      g.add(person);
    }
  }
  g.position.copy(pos);
  g.rotation.y = faceAngle;
  return g;
}
const gsRight = startP.clone().addScaledVector(startRight, ROAD_W/2+9);
const gsLeft = startP.clone().addScaledVector(startRight, -(ROAD_W/2+9));
scene.add(buildGrandstand(gsRight, -Math.atan2(startT.x,startT.z)+Math.PI));
scene.add(buildGrandstand(gsLeft, -Math.atan2(startT.x,startT.z)));

function makeBillboardTexture(text){
  const c = document.createElement('canvas'); c.width=512; c.height=256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#f4f4f0'; ctx.fillRect(0,0,512,256);
  ctx.fillStyle = '#c0392b'; ctx.fillRect(0,0,512,14);
  ctx.fillStyle = '#1a5fb4'; ctx.fillRect(0,242,512,14);
  ctx.fillStyle = '#1a1c22'; ctx.font = 'bold 56px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(text, 256, 128);
  return new THREE.CanvasTexture(c);
}
function buildBillboard(pos, faceAngle, text){
  const g = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color:0x14161c });
  [-3.5,3.5].forEach(x=>{
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,6,8), poleMat);
    pole.position.set(x,3,0); g.add(pole);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(8,4), new THREE.MeshBasicMaterial({ map:makeBillboardTexture(text) }));
  board.position.set(0,5.5,0);
  g.add(board);
  g.position.copy(pos);
  g.rotation.y = faceAngle;
  return g;
}
const billboardSpots = [80, 200, 320, 400];
const billboardTexts = ['APEX TIRES','RAPIDFUEL','VELOCITY OIL','TRACKSIDE'];
billboardSpots.forEach((i, bi)=>{
  const p = samplePts[i], t = sampleTangents[i];
  const right = new THREE.Vector3().crossVectors(t, UP).normalize();
  const pos = p.clone().addScaledVector(right, ROAD_W/2 + 6);
  scene.add(buildBillboard(pos, -Math.atan2(t.x,t.z)+Math.PI/2, billboardTexts[bi]));
});

const BOOST_PAD_IDX = [55, 150, 245, 340, 430];
function makeBoostPadTexture(){
  const c = document.createElement('canvas'); c.width=64; c.height=128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,64,128);
  ctx.fillStyle = 'rgba(240,190,20,0.9)';
  for (let i=0;i<3;i++){
    const y = i*40+10;
    ctx.beginPath();
    ctx.moveTo(8,y+30); ctx.lineTo(32,y); ctx.lineTo(56,y+30); ctx.lineTo(44,y+30); ctx.lineTo(32,y+14); ctx.lineTo(20,y+30);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,20,0.9)'; ctx.lineWidth = 2;
    ctx.stroke();
  }
  return new THREE.CanvasTexture(c);
}
const boostPadTex = makeBoostPadTexture();
function buildBoostPad(idx){
  const p = samplePts[idx], t = sampleTangents[idx];
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9,10), new THREE.MeshBasicMaterial({ map:boostPadTex, transparent:true, depthWrite:false }));
  mesh.rotation.x = -Math.PI/2;
  mesh.rotation.z = -Math.atan2(t.x, t.z);
  mesh.position.set(p.x, 0.05, p.z);
  return mesh;
}
BOOST_PAD_IDX.forEach(idx=> scene.add(buildBoostPad(idx)));

/* ============================= PARTICLES ============================= */
const MAX_PARTICLES = 70;
const particlePool = [];
for (let i=0;i<MAX_PARTICLES;i++){
  const mat = new THREE.SpriteMaterial({ map:glowTex, color:0xffffff, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending });
  const sprite = new THREE.Sprite(mat);
  sprite.visible = false;
  scene.add(sprite);
  particlePool.push({ sprite, life:0, maxLife:1, vel:new THREE.Vector3(), grow:0 });
}
let particleCursor = 0;
function spawnParticle(pos, color, size, life, vel, grow){
  const p = particlePool[particleCursor];
  particleCursor = (particleCursor+1) % MAX_PARTICLES;
  p.sprite.position.copy(pos);
  p.sprite.material.color.setHex(color);
  p.sprite.material.opacity = 0.85;
  p.sprite.scale.set(size,size,1);
  p.sprite.visible = true;
  p.life = life; p.maxLife = life;
  p.vel.copy(vel);
  p.grow = grow || 0;
}
function updateParticles(dt){
  for (let i=0;i<particlePool.length;i++){
    const p = particlePool[i];
    if (p.life <= 0){ if (p.sprite.visible) p.sprite.visible=false; continue; }
    p.life -= dt;
    p.sprite.position.addScaledVector(p.vel, dt);
    const s = p.sprite.scale.x + p.grow*dt;
    p.sprite.scale.set(s,s,1);
    p.sprite.material.opacity = Math.max(0, (p.life/p.maxLife)*0.85);
    if (p.life <= 0) p.sprite.visible = false;
  }
}

/* ============================= CARS ============================= */
function createCarMesh(bodyColor, accentColor, carNumber){
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color:bodyColor, metalness:0.8, roughness:0.15, clearcoat:1.0, clearcoatRoughness:0.05 });
  const canopyMat = new THREE.MeshPhysicalMaterial({ color:0x14181e, metalness:0.3, roughness:0.1, clearcoat:1.0, transparent:true, opacity:0.72 });
  const darkMat = new THREE.MeshStandardMaterial({ color:0x0e0f12, metalness:0.3, roughness:0.6 });
  const chromeMat = new THREE.MeshStandardMaterial({ color:0xd8dde3, metalness:1.0, roughness:0.2 });
  const glowMat = new THREE.MeshStandardMaterial({ color:bodyColor, emissive:bodyColor, emissiveIntensity:1.8 });

  const shell = new THREE.Mesh(new THREE.SphereGeometry(1,24,16), bodyMat);
  shell.scale.set(0.92,0.56,2.05);
  shell.position.y = 0.62;
  shell.castShadow = true;
  group.add(shell);

  const stripeMat = new THREE.MeshStandardMaterial({ color:accentColor, metalness:0.3, roughness:0.4 });
  for (let sz=-1.9; sz<=1.9; sz+=0.34){
    if (Math.abs(sz) < 1.2) continue;
    const zn = sz/2.05;
    const surfY = 0.56*Math.sqrt(Math.max(0, 1-zn*zn));
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.34,0.05,0.38), stripeMat);
    seg.position.set(0, 0.62+surfY-0.01, sz);
    group.add(seg);
  }

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(1.86,0.16,3.7), darkMat);
  skirt.position.y = 0.24;
  group.add(skirt);

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1,20,14), canopyMat);
  canopy.scale.set(0.68,0.44,1.05);
  canopy.position.set(0,1.06,-0.1);
  canopy.castShadow = true;
  group.add(canopy);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(1.9,0.08,0.4), darkMat);
  splitter.position.set(0,0.3,2.05);
  group.add(splitter);
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.85,0.14,0.32), darkMat);
  diffuser.position.set(0,0.3,-1.95);
  group.add(diffuser);

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.8,0.1,0.4), darkMat);
  spoiler.position.set(0,1.12,-1.95); spoiler.castShadow = true;
  group.add(spoiler);
  [-0.8,0.8].forEach(x=>{
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.3,0.1), darkMat);
    strut.position.set(x,0.95,-1.95);
    group.add(strut);
  });

  [[-1.0,0.5,1.3],[1.0,0.5,1.3],[-1.0,0.5,-1.3],[1.0,0.5,-1.3]].forEach(p=>{
    const fender = new THREE.Mesh(new THREE.SphereGeometry(0.42,12,8), bodyMat);
    fender.scale.set(0.7,0.7,1.0);
    fender.position.set(p[0],p[1],p[2]);
    group.add(fender);
  });

  [-1.0,1.0].forEach(x=>{
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.12,0.28), bodyMat);
    mirror.position.set(x,0.95,0.5);
    group.add(mirror);
  });

  [-0.5,0.5].forEach(x=>{
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.09,0.22,10), chromeMat);
    exhaust.rotation.z = Math.PI/2;
    exhaust.position.set(x,0.3,-1.9);
    group.add(exhaust);
  });

  [-0.98,0.98].forEach(x=>{
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.04,0.05,3.5), glowMat);
    strip.position.set(x,0.16,0);
    group.add(strip);
  });

  const wheelGeo = new THREE.CylinderGeometry(0.44,0.44,0.34,18);
  const rimGeo = new THREE.CylinderGeometry(0.25,0.25,0.08,10);
  const discGeo = new THREE.CylinderGeometry(0.3,0.3,0.36,18);
  const wheelMat = new THREE.MeshStandardMaterial({ color:0x0c0c0e, roughness:0.85 });
  const discMat = new THREE.MeshStandardMaterial({ color:0x555a62, metalness:0.7, roughness:0.4 });
  const wheels = [];
  [[-1.05,0.44,1.3],[1.05,0.44,1.3],[-1.05,0.44,-1.3],[1.05,0.44,-1.3]].forEach(pos=>{
    const wheelGroup = new THREE.Group();
    const disc = new THREE.Mesh(discGeo, discMat); disc.rotation.z = Math.PI/2; wheelGroup.add(disc);
    const w = new THREE.Mesh(wheelGeo, wheelMat); w.rotation.z = Math.PI/2; w.castShadow = true; wheelGroup.add(w);
    const rim = new THREE.Mesh(rimGeo, chromeMat); rim.rotation.z = Math.PI/2; rim.position.x = Math.sign(pos[0])*0.2; wheelGroup.add(rim);
    const spokeGeo = new THREE.BoxGeometry(0.04, 0.44, 0.04);
    for (let s=0; s<5; s++){
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.rotation.x = (s * Math.PI * 2) / 5;
      spoke.position.x = Math.sign(pos[0])*0.22;
      wheelGroup.add(spoke);
    }
    const caliperGeo = new THREE.BoxGeometry(0.12, 0.22, 0.12);
    const caliperMat = new THREE.MeshStandardMaterial({ color: 0xff1744, metalness: 0.8, roughness: 0.2 });
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(-Math.sign(pos[0])*0.05, 0.22, 0);
    wheelGroup.add(caliper);
    wheelGroup.position.set(pos[0],pos[1],pos[2]);
    group.add(wheelGroup);
    wheels.push(wheelGroup);
  });

  const lightMat = new THREE.MeshStandardMaterial({ color:0xfff4cc, emissive:0xfff4cc, emissiveIntensity:1.6 });
  const tailMat = new THREE.MeshStandardMaterial({ color:0xff1744, emissive:0xff1744, emissiveIntensity:1.4 });
  [-0.62,0.62].forEach(x=>{
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.13,10,8), lightMat);
    hl.position.set(x,0.62,2.0); group.add(hl);
    addGlowSprite(group, new THREE.Vector3(x,0.62,2.05), 0xfff4cc, 0.4);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.28,0.12,0.06), tailMat);
    tl.position.set(x,0.62,-1.98); group.add(tl);
    addGlowSprite(group, new THREE.Vector3(x,0.62,-2.02), 0xff1744, 0.32);
  });

  if (carNumber){
    const bc = document.createElement('canvas'); bc.width=64; bc.height=64;
    const bctx = bc.getContext('2d');
    bctx.fillStyle = '#ffffff'; bctx.beginPath(); bctx.arc(32,32,30,0,Math.PI*2); bctx.fill();
    bctx.fillStyle = '#0e0f12'; bctx.font = 'bold 40px Arial'; bctx.textAlign='center'; bctx.textBaseline='middle';
    bctx.fillText(String(carNumber), 32, 34);
    const badgeTex = new THREE.CanvasTexture(bc);
    const badge = new THREE.Mesh(new THREE.CircleGeometry(0.3,20), new THREE.MeshBasicMaterial({ map:badgeTex, transparent:true }));
    badge.rotation.x = -Math.PI/2 + 0.2;
    badge.position.set(0,1.18,1.0);
    group.add(badge);
  }

  group.userData.wheels = wheels;
  return group;
}

const CAR_MAX_SPEED = 42;
const CAR_MAX_REVERSE = 12;
const CAR_ACCEL = 22;
const CAR_REVERSE_ACCEL = 16;
const CAR_BRAKE = 34;
const CAR_DRAG = 5.2;
const CAR_MAX_TURN = 2.5;
const CAR_COLLISION_RADIUS = 1.55;
const GRIP_NORMAL = 9.0;
const GRIP_DRIFT = 1.7;

function makeCarState(mesh, color){
  return {
    mesh, color,
    pos: samplePts[0].clone(),
    heading: Math.atan2(sampleTangents[0].x, sampleTangents[0].z),
    speed: 0,
    lap: 1,
    lastSampleIdx: 0,
    maxSampleIdx: 0,
    trackIdx: 0,
    finished: false,
    finishTime: 0,
    padFlags: new Array(BOOST_PAD_IDX.length).fill(false),
    crossedHalfway: false,
    nitro: 100,
    boosting: false,
  };
}

const player = makeCarState(createCarMesh(0x00e5ff, 0x0a2530, 1), 0x00e5ff);
player.velocity = new THREE.Vector3();
scene.add(player.mesh);

const aiColors = [0xff2e9a, 0xffb020, 0x8aff4d];
const aiCars = aiColors.map((c,idx)=>{
  const st = makeCarState(createCarMesh(c, 0x1a1a1a, idx+2), c);
  const back = (idx+1)*4;
  const startIdx = (SAMPLES - back*2) % SAMPLES;
  st.pos = samplePts[startIdx].clone();
  st.lastSampleIdx = startIdx; st.maxSampleIdx = startIdx;
  st.heading = Math.atan2(sampleTangents[startIdx].x, sampleTangents[startIdx].z);
  st.baseSpeed = 35 + idx*3.2 + Math.random()*5;
  st.lap = 0;
  st.laneOffset = (idx-1)*3.0;
  st.laneOffsetTarget = st.laneOffset;
  st.laneTimer = Math.random()*2;
  st.crossedHalfway = true;
  scene.add(st.mesh);
  return st;
});
const allCars = [player, ...aiCars];

/* ============================= INPUT ============================= */
const input = {
  left:false,
  right:false,
  gas:false,
  brake:false,
  drift:false,
  boost:false,
  steer:0,
  steerActive:false,
  driveValue:0,
  driveActive:false,
};

// Keyboard
window.addEventListener('keydown', e=>{
  if (['ArrowLeft','a','A'].includes(e.key)) input.left = true;
  if (['ArrowRight','d','D'].includes(e.key)) input.right = true;
  if (['ArrowUp','w','W'].includes(e.key)) input.gas = true;
  if (['ArrowDown','s','S'].includes(e.key)) input.brake = true;
  if (e.key === 'Shift') input.drift = true;
  if (e.key === ' ') { input.boost = true; e.preventDefault(); }
});
window.addEventListener('keyup', e=>{
  if (['ArrowLeft','a','A'].includes(e.key)) input.left = false;
  if (['ArrowRight','d','D'].includes(e.key)) input.right = false;
  if (['ArrowUp','w','W'].includes(e.key)) input.gas = false;
  if (['ArrowDown','s','S'].includes(e.key)) input.brake = false;
  if (e.key === 'Shift') input.drift = false;
  if (e.key === ' ') input.boost = false;
});

// Touch buttons helper
function bindHold(id, key){
  const el = document.getElementById(id);
  if (!el) return;
  let activePointer = null;
  const on = ev=>{
    ev.preventDefault();
    activePointer = ev.pointerId;
    input[key] = true;
    el.classList.add('active');
    if (el.setPointerCapture) el.setPointerCapture(ev.pointerId);
  };
  const off = ev=>{
    if (activePointer !== null && ev.pointerId !== activePointer) return;
    activePointer = null;
    input[key] = false;
    el.classList.remove('active');
  };
  el.addEventListener('pointerdown', on);
  el.addEventListener('pointerup', off);
  el.addEventListener('pointercancel', off);
  el.addEventListener('pointerleave', off);
}

bindHold('btnDrift','drift');
bindHold('btnNos','boost');
bindHold('btnGas','gas');
bindHold('btnBrake','brake');

/* ============================= GYROSCOPE STEERING ============================= */
let gyroEnabled = false;
let gyroOffset = 0;
let gyroRaw = 0;

function handleOrientation(e) {
  if (!e.gamma) return;
  // gamma: left/right tilt (-90 to 90)
  gyroRaw = e.gamma;
  let val = (gyroRaw - gyroOffset) / 25; // sensitivity
  val = THREE.MathUtils.clamp(val, -1, 1);
  input.steer = val;
  input.steerActive = Math.abs(val) > 0.05;
}

async function requestGyroPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      const response = await DeviceOrientationEvent.requestPermission();
      if (response === 'granted') {
        gyroEnabled = true;
        window.addEventListener('deviceorientation', handleOrientation);
      }
    } catch (e) {
      console.warn('Gyro permission denied', e);
    }
  } else {
    gyroEnabled = true;
    window.addEventListener('deviceorientation', handleOrientation);
  }
}

function calibrateGyro() {
  gyroOffset = gyroRaw;
}

/* ============================= HELPERS ============================= */
function nearestSampleIdx(pos, startGuess){
  let best = -1, bestD = Infinity;
  const win = 40;
  for (let d=-win; d<=win; d++){
    const idx = ((startGuess + d) % SAMPLES + SAMPLES) % SAMPLES;
    const p = samplePts[idx];
    const dx = p.x-pos.x, dz = p.z-pos.z;
    const dist = dx*dx+dz*dz;
    if (dist < bestD){ bestD = dist; best = idx; }
  }
  return { idx:best, dist:Math.sqrt(bestD) };
}

let raceTime = 0;

function updateLapProgress(car){
  const { idx, dist } = nearestSampleIdx(car.pos, car.lastSampleIdx);
  car.maxSampleIdx = Math.max(car.maxSampleIdx, idx);
  if (idx > SAMPLES * 0.4 && idx < SAMPLES * 0.6) {
    car.crossedHalfway = true;
  }
  if (car.lastSampleIdx > SAMPLES*0.75 && idx < SAMPLES*0.15 && car.crossedHalfway){
    if (!car.finished){
      car.lap += 1;
      car.crossedHalfway = false;
      car.maxSampleIdx = idx;
      if (car.lap > 3){
        car.finished = true;
        car.finishTime = raceTime;
        car.lap = 3;
      }
    }
  }
  car.lastSampleIdx = idx;
  car.roadDist = dist;
  car.trackIdx = idx;
  let displayIdx = idx;
  if (!car.crossedHalfway && idx > SAMPLES * 0.5) {
    displayIdx = 0;
  }
  car.progress = (car.lap - 1) * SAMPLES + displayIdx;
}

let shakeTime = 0, shakeIntensity = 0;
function triggerShake(t, i){ shakeTime = Math.max(shakeTime,t); shakeIntensity = Math.max(shakeIntensity,i); }

function resolveCarCollisions(){
  for (let i=0;i<allCars.length;i++){
    for (let j=i+1;j<allCars.length;j++){
      const a = allCars[i], b = allCars[j];
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const dist = Math.sqrt(dx*dx+dz*dz);
      const minDist = CAR_COLLISION_RADIUS*2;
      if (dist > 0.0001 && dist < minDist){
        const nx = dx/dist, nz = dz/dist;
        const overlap = minDist - dist;
        a.pos.x -= nx*overlap*0.5; a.pos.z -= nz*overlap*0.5;
        b.pos.x += nx*overlap*0.5; b.pos.z += nz*overlap*0.5;
        a.mesh.position.x = a.pos.x; a.mesh.position.z = a.pos.z;
        b.mesh.position.x = b.pos.x; b.mesh.position.z = b.pos.z;

        const aSpd = a.velocity ? a.velocity.length() : Math.abs(a.speed);
        const bSpd = b.velocity ? b.velocity.length() : Math.abs(b.speed);
        const impact = THREE.MathUtils.clamp((aSpd+bSpd)/30, 0, 1);

        if (a.velocity){ a.velocity.multiplyScalar(1-0.45*impact); a.velocity.addScaledVector(new THREE.Vector3(-nx,0,-nz), 2*impact); }
        else { a.speed *= (1-0.45*impact); }
        if (b.velocity){ b.velocity.multiplyScalar(1-0.45*impact); b.velocity.addScaledVector(new THREE.Vector3(nx,0,nz), 2*impact); }
        else { b.speed *= (1-0.45*impact); }

        if ((a===player || b===player) && impact > 0.2){
          triggerShake(0.22, Math.min(0.3, impact*0.4));
          const mid = new THREE.Vector3((a.pos.x+b.pos.x)/2, 0.6, (a.pos.z+b.pos.z)/2);
          for (let k=0;k<5;k++){
            const ang = Math.random()*Math.PI*2;
            spawnParticle(mid, 0xffb020, 0.35, 0.4, new THREE.Vector3(Math.cos(ang)*3,1.5,Math.sin(ang)*3), -0.6);
          }
        }
      }
    }
  }
}

function checkBoostPads(){
  allCars.forEach(car=>{
    BOOST_PAD_IDX.forEach((padIdx, pi)=>{
      let diff = Math.abs(car.trackIdx - padIdx);
      diff = Math.min(diff, SAMPLES - diff);
      if (diff < 4){
        if (!car.padFlags[pi]){
          car.padFlags[pi] = true;
          applyBoostPad(car);
        }
      } else if (diff > 10){
        car.padFlags[pi] = false;
      }
    });
  });
}
function applyBoostPad(car){
  const forwardDir = new THREE.Vector3(Math.sin(car.heading),0,Math.cos(car.heading));
  if (car.velocity){ car.velocity.addScaledVector(forwardDir, 11); car.nitro = Math.min(100, car.nitro+30); }
  else { car.speed = Math.min(car.speed+11, CAR_MAX_SPEED*1.3); }
  for (let k=0;k<8;k++){
    const ang = Math.random()*Math.PI*2, r = 0.3+Math.random()*0.6;
    spawnParticle(
      car.pos.clone().add(new THREE.Vector3(Math.cos(ang)*r,0.5,Math.sin(ang)*r)),
      Math.random()<0.5?0x00e5ff:0xff2e9a, 0.5, 0.5,
      new THREE.Vector3(Math.cos(ang)*2,2,Math.sin(ang)*2), 0.8
    );
  }
}

/* ============================= PHYSICS ============================= */
function stepPlayer(dt){
  const c = player;
  const forwardDir = new THREE.Vector3(Math.sin(c.heading),0,Math.cos(c.heading));
  const rightDir = new THREE.Vector3(Math.cos(c.heading),0,-Math.sin(c.heading));

  let vF = c.velocity.dot(forwardDir);
  let vR = c.velocity.dot(rightDir);

  const boosting = input.boost && c.nitro > 0;
  
  // Steering: gyro first, then keyboard fallback
  let steerInput = 0;
  if (input.steerActive) {
    steerInput = input.steer;
  } else {
    steerInput = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  }
  
  const gasInput = input.gas ? 1 : 0;
  const brakeInput = input.brake ? 1 : 0;
  
  let accel = 0;
  if (gasInput > 0) accel += CAR_ACCEL*(boosting?1.7:1) * gasInput;
  if (brakeInput > 0) accel += (vF > 1 ? -CAR_BRAKE : -CAR_REVERSE_ACCEL) * brakeInput;
  vF += accel*dt;

  vF -= Math.sign(vF) * (CAR_DRAG*0.5 + Math.abs(vF)*0.03) * dt;
  if (Math.abs(vF) < 0.05) vF = 0;

  const maxFwd = CAR_MAX_SPEED * (boosting?1.28:1);
  vF = THREE.MathUtils.clamp(vF, -CAR_MAX_REVERSE, maxFwd);

  const grip = input.drift ? GRIP_DRIFT : GRIP_NORMAL;
  vR -= vR * Math.min(1, grip*dt);

  const speedFactor = THREE.MathUtils.clamp(Math.abs(vF)/7, 0, 1);
  const turnDir = vF >= 0 ? 1 : -1;
  const turnRate = CAR_MAX_TURN * speedFactor * (input.drift?1.3:1);
  c.heading += steerInput*turnRate*dt*turnDir;

  c.velocity.copy(forwardDir).multiplyScalar(vF).addScaledVector(rightDir, vR);
  c.pos.addScaledVector(c.velocity, dt);

  const { idx } = nearestSampleIdx(c.pos, c.lastSampleIdx);
  const centerP = samplePts[idx];
  const tang = sampleTangents[idx];
  const rightV = new THREE.Vector3().crossVectors(tang, UP).normalize();
  const rel = new THREE.Vector3(c.pos.x-centerP.x, 0, c.pos.z-centerP.z);
  const lateral = rel.dot(rightV);
  const maxLat = ROAD_W/2 - 1.1;
  if (lateral > maxLat || lateral < -maxLat){
    const clamped = THREE.MathUtils.clamp(lateral, -maxLat, maxLat);
    c.pos.x = centerP.x + rightV.x*clamped;
    c.pos.z = centerP.z + rightV.z*clamped;
    const hitSpeed = c.velocity.length();
    c.velocity.multiplyScalar(0.32);
    if (hitSpeed > 9) triggerShake(0.28, Math.min(0.35, hitSpeed*0.012));
  }

  c.speed = vF;
  c.mesh.position.set(c.pos.x,0,c.pos.z);
  c.mesh.rotation.y = c.heading;
  c.mesh.userData.wheels.forEach(w=> w.rotation.x -= vF*dt*0.6);
  const tilt = -steerInput*speedFactor*(input.drift?0.1:0.06);
  c.mesh.rotation.z = THREE.MathUtils.lerp(c.mesh.rotation.z, tilt, 0.2);

  if (boosting) c.nitro = Math.max(0, c.nitro - 42*dt);
  else c.nitro = Math.min(100, c.nitro + 9*dt);
  c.boosting = boosting;

  if (input.drift && Math.abs(vR) > 2.2 && Math.abs(vF) > 4){
    const rearL = c.pos.clone().addScaledVector(forwardDir,-1.5).addScaledVector(rightDir,-0.85); rearL.y=0.35;
    const rearR = c.pos.clone().addScaledVector(forwardDir,-1.5).addScaledVector(rightDir,0.85); rearR.y=0.35;
    spawnParticle(rearL, 0xbbbbbb, 0.6, 0.7, forwardDir.clone().multiplyScalar(-1.5).add(rightDir.clone().multiplyScalar(-0.6)), 1.4);
    spawnParticle(rearR, 0xbbbbbb, 0.6, 0.7, forwardDir.clone().multiplyScalar(-1.5).add(rightDir.clone().multiplyScalar(0.6)), 1.4);
  }
  if (boosting){
    const rear = c.pos.clone().addScaledVector(forwardDir,-2.1); rear.y=0.4;
    spawnParticle(rear, Math.random()<0.5?0x00e5ff:0xff2e9a, 0.4, 0.35, forwardDir.clone().multiplyScalar(-6), 0.5);
  }

  updateLapProgress(c);
}

function stepAI(car, dt){
  if (car.finished) return;
  const { idx } = nearestSampleIdx(car.pos, car.lastSampleIdx);

  car.laneTimer -= dt;
  if (car.laneTimer <= 0){
    car.laneTimer = 1.4 + Math.random()*1.6;
    let blocked = false;
    allCars.forEach(other=>{
      if (other === car) return;
      const dx = other.pos.x-car.pos.x, dz = other.pos.z-car.pos.z;
      const fdist = Math.sin(car.heading)*dx + Math.cos(car.heading)*dz;
      const otherLane = (other.laneOffsetTarget !== undefined) ? other.laneOffsetTarget : 0;
      const ldist = Math.abs(car.laneOffsetTarget - otherLane);
      if (fdist > 0 && fdist < 9 && ldist < 2.2) blocked = true;
    });
    if (blocked) car.laneOffsetTarget = (Math.random()<0.5?-1:1) * (2+Math.random()*2.5);
    else if (Math.random() < 0.3) car.laneOffsetTarget = (Math.random()-0.5)*5;
  }
  car.laneOffset += (car.laneOffsetTarget - car.laneOffset) * Math.min(1, dt*1.2);

  const targetIdx = (idx+6) % SAMPLES;
  const p = samplePts[targetIdx];
  const t = sampleTangents[targetIdx];
  const right = new THREE.Vector3().crossVectors(t, UP).normalize();
  const targetPos = p.clone().addScaledVector(right, car.laneOffset);

  const dx = targetPos.x-car.pos.x, dz = targetPos.z-car.pos.z;
  const desiredHeading = Math.atan2(dx, dz);
  let diff = desiredHeading - car.heading;
  while (diff > Math.PI) diff -= Math.PI*2;
  while (diff < -Math.PI) diff += Math.PI*2;
  car.heading += THREE.MathUtils.clamp(diff, -2.9*dt, 2.9*dt);

  const lookIdx = (idx+14) % SAMPLES;
  const curveFactor = THREE.MathUtils.clamp(1 - curvature[lookIdx]*1.15, 0.62, 1);
  const gap = (player.progress||0) - (car.progress||0);
  const rubber = THREE.MathUtils.clamp(1 + gap/1400, 1.0, 1.15);

  const straightSection = curvature[lookIdx] < 0.015;
  if (straightSection && car.nitro > 25 && Math.random() < 0.1) {
    car.boosting = true;
  }
  if (curvature[lookIdx] > 0.035) {
    car.boosting = false;
  }

  if (car.boosting) {
    car.nitro = Math.max(0, car.nitro - 30 * dt);
    if (car.nitro <= 0) car.boosting = false;
  } else {
    car.nitro = Math.min(100, car.nitro + 10 * dt);
  }

  const dynamicTarget = car.baseSpeed * curveFactor * rubber * (car.boosting ? 1.25 : 1.0);
  car.speed = THREE.MathUtils.lerp(car.speed, dynamicTarget, dt*2.4);

  car.pos.x += Math.sin(car.heading)*car.speed*dt;
  car.pos.z += Math.cos(car.heading)*car.speed*dt;

  car.mesh.position.set(car.pos.x,0,car.pos.z);
  car.mesh.rotation.y = car.heading;
  car.mesh.userData.wheels.forEach(w=> w.rotation.x -= car.speed*dt*0.6);

  if (car.boosting) {
    const forwardDir = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const rear = car.pos.clone().addScaledVector(forwardDir, -2.1);
    rear.y = 0.4;
    spawnParticle(rear, Math.random() < 0.5 ? car.color : 0xff2e9a, 0.4, 0.35, forwardDir.clone().multiplyScalar(-6), 0.5);
  }

  updateLapProgress(car);
}

/* ============================= CAMERA ============================= */
const camOffset = new THREE.Vector3(0,5.2,9.5);
const camLookOffset = new THREE.Vector3(0,1.2,4);
const camPos = new THREE.Vector3().copy(player.pos);
function updateCamera(dt){
  const behind = new THREE.Vector3(
    -Math.sin(player.heading)*camOffset.z,
    camOffset.y,
    -Math.cos(player.heading)*camOffset.z
  );
  const desired = new THREE.Vector3(player.pos.x,0,player.pos.z).add(behind);
  camPos.lerp(desired, 1 - Math.pow(0.001, dt));
  camera.position.copy(camPos);

  if (shakeTime > 0){
    shakeTime -= dt;
    camera.position.x += (Math.random()-0.5)*shakeIntensity;
    camera.position.y += (Math.random()-0.5)*shakeIntensity;
    camera.position.z += (Math.random()-0.5)*shakeIntensity;
    if (shakeTime <= 0) shakeIntensity = 0;
  }

  const lookAt = new THREE.Vector3(
    player.pos.x + Math.sin(player.heading)*camLookOffset.z,
    camLookOffset.y,
    player.pos.z + Math.cos(player.heading)*camLookOffset.z
  );
  camera.lookAt(lookAt);

  const targetFov = player.boosting ? 70 : 62;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, dt*3);
  camera.updateProjectionMatrix();
}

/* ============================= MINIMAP ============================= */
const mmCanvas = document.getElementById('minimapCanvas');
const mmCtx = mmCanvas.getContext('2d');
let mmBounds = null;
function computeBounds(){
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  samplePts.forEach(p=>{
    minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x);
    minZ=Math.min(minZ,p.z); maxZ=Math.max(maxZ,p.z);
  });
  mmBounds = { minX,maxX,minZ,maxZ };
}
computeBounds();
function mmProject(p){
  const pad = 10;
  const w = mmCanvas.width - pad*2, h = mmCanvas.height - pad*2;
  const x = pad + (p.x-mmBounds.minX)/(mmBounds.maxX-mmBounds.minX)*w;
  const y = pad + (p.z-mmBounds.minZ)/(mmBounds.maxZ-mmBounds.minZ)*h;
  return [x, mmCanvas.height - y];
}
function drawMinimap(){
  mmCtx.clearRect(0,0,mmCanvas.width,mmCanvas.height);
  mmCtx.strokeStyle = 'rgba(0,229,255,0.6)';
  mmCtx.lineWidth = 3;
  mmCtx.beginPath();
  samplePts.forEach((p,i)=>{
    const [x,y] = mmProject(p);
    if (i===0) mmCtx.moveTo(x,y); else mmCtx.lineTo(x,y);
  });
  mmCtx.closePath();
  mmCtx.stroke();
  allCars.forEach(c=>{
    const [x,y] = mmProject(c.pos);
    mmCtx.fillStyle = '#' + c.color.toString(16).padStart(6,'0');
    mmCtx.beginPath();
    mmCtx.arc(x,y, c===player?4.5:3, 0, Math.PI*2);
    mmCtx.fill();
  });
}

/* ============================= RACE STATE / HUD ============================= */
let raceStarted = false;
let raceOver = false;
const lapNumEl = document.getElementById('lapNum');
const posLineEl = document.getElementById('posLineText');
const timeNumEl = document.getElementById('timeNum');
const needleEl = document.getElementById('needle');
const speedNumEl = document.getElementById('speedNum');
const nitroFillEl = document.getElementById('nitroFill');

function ordinal(n){ return ['','1ST','2ND','3RD','4TH'][n] || (n+'TH'); }

function isBetter(c, other){
  if (c.finished !== other.finished) return c.finished;
  if (c.finished && other.finished) return c.finishTime < other.finishTime;
  return (c.progress||0) > (other.progress||0);
}
function computeRank(target){
  let rank = 1;
  for (let i=0;i<allCars.length;i++){
    const c = allCars[i];
    if (c === target) continue;
    if (isBetter(c, target)) rank++;
  }
  return rank;
}

function updateHUD(dt){
  lapNumEl.textContent = Math.min(player.lap,3);
  const mins = Math.floor(raceTime/60);
  const secs = (raceTime%60).toFixed(1).padStart(4,'0');
  timeNumEl.textContent = `${String(mins).padStart(2,'0')}:${secs}`;

  const rank = computeRank(player);
  posLineEl.textContent = ordinal(rank);

  const kmh = Math.abs(player.speed) * 3.6;
  const displayedSpeed = Math.min(Math.round(kmh), 150);
  speedNumEl.textContent = displayedSpeed;
  const frac = THREE.MathUtils.clamp(displayedSpeed / 150, 0, 1);
  const angle = -120 + frac*240;
  needleEl.style.transform = `translateX(-50%) rotate(${angle}deg)`;

  nitroFillEl.style.width = player.nitro + '%';

  drawMinimap();
}

/* ============================= AUDIO ============================= */
let audioCtx, osc, osc2, gainNode;
function initAudio(){
  try{
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    osc = audioCtx.createOscillator();
    osc2 = audioCtx.createOscillator();
    const filter = audioCtx.createBiquadFilter();
    gainNode = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 96;
    osc2.type = 'triangle';
    osc2.frequency.value = 192;
    osc2.detune.value = -8;
    filter.type = 'lowpass';
    filter.frequency.value = 1180;
    filter.Q.value = 0.55;
    gainNode.gain.value = 0.0;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gainNode).connect(audioCtx.destination);
    osc.start();
    osc2.start();
  }catch(e){}
}
function updateAudio(){
  if (!osc) return;
  const speedFrac = THREE.MathUtils.clamp(Math.abs(player.speed)/CAR_MAX_SPEED, 0, 1);
  const movingNow = raceStarted && !raceOver && speedFrac > 0.01;
  const drivingNow = movingNow || input.gas || input.brake || input.boost || input.driveActive;
  const targetFreq = 88 + speedFrac * 78 + (player.boosting ? 14 : 0);
  const targetGain = movingNow ? (0.045 + speedFrac * 0.060) : 0.0;
  const boostAccent = player.boosting ? 0.016 : 0.0;
  osc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.03);
  osc2.frequency.setTargetAtTime(targetFreq * 2, audioCtx.currentTime, 0.03);
  gainNode.gain.setTargetAtTime(drivingNow ? targetGain + boostAccent : 0.0, audioCtx.currentTime, 0.05);
}

/* ============================= COUNTDOWN / START ============================= */
const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const countdownEl = document.getElementById('countdown');
const hud = document.getElementById('hud');
const finishStats = document.getElementById('finishStats');
let pendingMobileStart = false;

function isLandscapeMode(){
  return window.matchMedia('(orientation: landscape)').matches;
}

async function enterMobilePresentation(){
  if (!isMobileDevice) return;
  if (document.fullscreenElement == null && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (e) {}
  }
  if (screen.orientation && screen.orientation.lock) {
    try { await screen.orientation.lock('landscape'); } catch (e) {}
  }
}

function beginRace(){
  overlay.classList.add('hidden');
  finishStats.innerHTML = '';
  resetRace();
  runCountdown();
}

function resetRace(){
  raceTime = 0; raceOver = false;
  input.steer = 0;
  input.steerActive = false;
  input.driveValue = 0;
  input.driveActive = false;
  input.gas = false;
  input.brake = false;
  input.drift = false;
  input.boost = false;
  
  player.pos.copy(samplePts[0]); player.lastSampleIdx=0; player.maxSampleIdx=0;
  player.heading = Math.atan2(sampleTangents[0].x, sampleTangents[0].z);
  player.velocity.set(0,0,0);
  player.speed = 0; player.lap = 1; player.finished = false; player.finishTime = 0;
  player.nitro = 100; player.boosting = false;
  player.crossedHalfway = false;
  player.padFlags = new Array(BOOST_PAD_IDX.length).fill(false);
  player.trackIdx = 0; player.progress = 0;
  
  player.mesh.position.set(player.pos.x, 0, player.pos.z);
  player.mesh.rotation.set(0, player.heading, 0);

  aiCars.forEach((st,idx)=>{
    const back = (idx+1)*4;
    const startIdx = (SAMPLES - back*2) % SAMPLES;
    st.pos = samplePts[startIdx].clone();
    st.lastSampleIdx = startIdx; st.maxSampleIdx = startIdx;
    st.heading = Math.atan2(sampleTangents[startIdx].x, sampleTangents[startIdx].z);
    st.speed = 0; st.lap = 0; st.finished = false; st.finishTime = 0;
    st.nitro = 100; st.boosting = false;
    st.crossedHalfway = true;
    st.laneOffset = (idx-1)*3.0; st.laneOffsetTarget = st.laneOffset; st.laneTimer = Math.random()*2;
    st.padFlags = new Array(BOOST_PAD_IDX.length).fill(false);
    st.trackIdx = startIdx; st.progress = (st.lap - 1) * SAMPLES + startIdx;

    st.mesh.position.set(st.pos.x, 0, st.pos.z);
    st.mesh.rotation.set(0, st.heading, 0);
  });
  camPos.copy(player.pos).add(new THREE.Vector3(0,5.2,9.5));
}

function runCountdown(){
  hud.classList.remove('hidden');
  countdownEl.style.display = 'flex';
  let n = 3;
  countdownEl.textContent = n;
  const iv = setInterval(()=>{
    n -= 1;
    if (n>0) countdownEl.textContent = n;
    else if (n===0) countdownEl.textContent = 'GO!';
    else {
      clearInterval(iv);
      countdownEl.style.display = 'none';
      raceStarted = true;
      // Calibrate gyro when race starts so holding device naturally = center
      if (gyroEnabled) calibrateGyro();
    }
  }, 800);
}

async function handleStart(){
  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();

  if (isMobileDevice) {
    await enterMobilePresentation();
    await requestGyroPermission();
    if (!isLandscapeMode()) {
      pendingMobileStart = true;
      finishStats.innerHTML = '<div>Rotate to landscape to start.</div>';
      overlay.classList.remove('hidden');
      return;
    }
  }

  pendingMobileStart = false;
  beginRace();
}

startBtn.addEventListener('click', handleStart, { passive:true });

window.addEventListener('orientationchange', ()=>{
  if (!pendingMobileStart) return;
  if (isLandscapeMode()) {
    pendingMobileStart = false;
    setTimeout(beginRace, 150);
  }
});

function checkFinish(){
  if (player.finished && !raceOver){
    raceOver = true;
    const rank = computeRank(player);
    const mins = Math.floor(raceTime/60);
    const secs = (raceTime%60).toFixed(1).padStart(4,'0');
    finishStats.innerHTML = `
      <div style="font-family:'Orbitron',sans-serif;font-size:24px;color:#00e5ff;">FINISHED ${ordinal(rank)}</div>
      <div>TIME ${String(mins).padStart(2,'0')}:${secs}</div>`;
    setTimeout(()=>{
      overlay.classList.remove('hidden');
      hud.classList.add('hidden');
      startBtn.textContent = 'RACE AGAIN';
    }, 1400);
  }
}

/* ============================= MAIN LOOP ============================= */
let lastT = performance.now();
function animate(now){
  requestAnimationFrame(animate);
  let dt = (now - lastT) / 1000;
  lastT = now;
  dt = Math.min(dt, 0.05);

  if (raceStarted && !raceOver){
    raceTime += dt;
    stepPlayer(dt);
    aiCars.forEach(c=>stepAI(c, dt));
    resolveCarCollisions();
    checkBoostPads();
    checkFinish();
  }
  updateParticles(dt);
  updateCamera(dt);
  if (raceStarted) updateHUD(dt);
  updateAudio();

  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

})();