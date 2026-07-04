/**
 * initMinimap(samplePts) pre-computes the track bounds once.
 * drawMinimap(allCars, player) is called every frame.
 *
 * The minimap only needs the 2-D (x, z) projection; Y is ignored.
 */

let mmCanvas, mmCtx;
let mmBounds = null;

/**
 * @param {THREE.Vector3[]} samplePts
 */
export function initMinimap(samplePts) {
  mmCanvas = document.getElementById('minimapCanvas');
  if (!mmCanvas) return;
  mmCtx = mmCanvas.getContext('2d');
  _computeBounds(samplePts);
}

/**
 * @param {object[]} allCars
 * @param {object}   player
 */
export function drawMinimap(allCars, player) {
  if (!mmCtx || !mmBounds) return;

  mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);

  // Draw track outline — fetch from the stored bounds
  mmCtx.strokeStyle = 'rgba(0,229,255,0.6)';
  mmCtx.lineWidth   = 3;
  mmCtx.beginPath();
  mmBounds._pts.forEach((p, i) => {
    const [x, y] = _project(p);
    if (i === 0) mmCtx.moveTo(x, y); else mmCtx.lineTo(x, y);
  });
  mmCtx.closePath();
  mmCtx.stroke();

  // Draw car dots
  allCars.forEach(car => {
    const [x, y] = _project(car.pos);
    const color  = '#' + car.color.toString(16).padStart(6, '0');
    mmCtx.fillStyle = color;
    mmCtx.beginPath();
    mmCtx.arc(x, y, car === player ? 4.5 : 3, 0, Math.PI * 2);
    mmCtx.fill();
  });
}

// ─── Private ──────────────────────────────────────────────────────────────────

function _computeBounds(samplePts) {
  let minX = Infinity, maxX = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  samplePts.forEach(p => {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  });
  // Store pts reference so drawMinimap can re-draw the outline
  mmBounds = { minX, maxX, minZ, maxZ, _pts: samplePts };
}

function _project(p) {
  const pad = 10;
  const w   = mmCanvas.width  - pad * 2;
  const h   = mmCanvas.height - pad * 2;
  const x   = pad + (p.x - mmBounds.minX) / (mmBounds.maxX - mmBounds.minX) * w;
  const y   = pad + (p.z - mmBounds.minZ) / (mmBounds.maxZ - mmBounds.minZ) * h;
  return [x, mmCanvas.height - y];
}
