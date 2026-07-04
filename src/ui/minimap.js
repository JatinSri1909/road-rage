/**
 * initMinimap(samplePts) pre-computes the track bounds once.
 * drawMinimap(allCars, player) is called every frame.
 *
 * The minimap only needs the 2-D (x, z) projection; Y is ignored.
 */

let mmCanvas, mmCtx, offscreenCanvas;
let mmBounds = null;

/**
 * @param {THREE.Vector3[]} samplePts
 */
export function initMinimap(samplePts) {
  mmCanvas = document.getElementById('minimapCanvas');
  if (!mmCanvas) return;
  mmCtx = mmCanvas.getContext('2d');
  _computeBounds(samplePts);

  // Pre-render the track outline to offscreen canvas
  offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = mmCanvas.width;
  offscreenCanvas.height = mmCanvas.height;
  const oCtx = offscreenCanvas.getContext('2d');
  oCtx.strokeStyle = 'rgba(0,229,255,0.6)';
  oCtx.lineWidth   = 3;
  oCtx.beginPath();
  mmBounds._pts.forEach((p, i) => {
    const [x, y] = _project(p);
    if (i === 0) oCtx.moveTo(x, y); else oCtx.lineTo(x, y);
  });
  oCtx.closePath();
  oCtx.stroke();
}

/**
 * @param {object[]} allCars
 * @param {object}   player
 */
export function drawMinimap(allCars, player) {
  if (!mmCtx || !mmBounds) return;

  mmCtx.clearRect(0, 0, mmCanvas.width, mmCanvas.height);

  // Draw cached track outline
  if (offscreenCanvas) {
    mmCtx.drawImage(offscreenCanvas, 0, 0);
  }

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
