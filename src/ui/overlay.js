/**
 * Manages the #overlay element that shows before the race starts and after
 * it finishes. Handles mobile fullscreen + orientation locking so the
 * game always launches in landscape.
 *
 * Mobile orientation gotcha:
 *   screen.orientation.lock() is async and can reject on unsupported
 *   browsers (notably iOS Safari). We catch silently. If the device is
 *   still in portrait after the lock attempt, we show a "Rotate device"
 *   prompt and listen for orientationchange to auto-start.
 */

const _isMobile = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

let _onStart = null;
let _pendingMobileStart = false;

/**
 * @param {{ onStart: () => Promise<void> }} options
 */
export function initOverlay({ onStart }) {
  _onStart = onStart;

  const startBtn = document.getElementById('startBtn');
  startBtn?.addEventListener('click', _handleStart, { passive: true });

  window.addEventListener('orientationchange', _handleOrientationChange);

  // Quit to menu when user exits fullscreen mid-race (mobile back button)
  document.addEventListener('fullscreenchange',       _handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', _handleFullscreenChange);

  // Quit to menu if device rotates to portrait during a race
  window.addEventListener('resize', _handleResizeQuit);
}

// ─── Private handlers ─────────────────────────────────────────────────────────

async function _handleStart() {
  if (_isMobile) {
    await _enterMobilePresentation();
    if (!_isLandscape()) {
      _pendingMobileStart = true;
      const finishStats = document.getElementById('finishStats');
      if (finishStats) finishStats.innerHTML = '<div>Rotate to landscape to start.</div>';
      document.getElementById('overlay')?.classList.remove('hidden');
      return;
    }
  }
  _pendingMobileStart = false;
  document.getElementById('overlay')?.classList.add('hidden');
  _onStart?.();
}

function _handleOrientationChange() {
  if (!_pendingMobileStart) return;
  if (_isLandscape()) {
    _pendingMobileStart = false;
    document.getElementById('overlay')?.classList.add('hidden');
    setTimeout(() => _onStart?.(), 150);
  }
}

function _handleFullscreenChange() {
  const overlay = document.getElementById('overlay');
  const raceActive = overlay?.classList.contains('hidden');
  if (raceActive && !document.fullscreenElement && !document.webkitFullscreenElement) {
    _forceQuitToMenu();
  }
}

function _handleResizeQuit() {
  const overlay = document.getElementById('overlay');
  if (overlay?.classList.contains('hidden') && !_isLandscape()) {
    _forceQuitToMenu();
  }
}

function _forceQuitToMenu() {
  const overlay  = document.getElementById('overlay');
  const hud      = document.getElementById('hud');
  const startBtn = document.getElementById('startBtn');
  overlay?.classList.remove('hidden');
  hud?.classList.add('hidden');
  if (startBtn) startBtn.textContent = 'START RACE';

  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  if (document.webkitFullscreenElement) document.webkitExitFullscreen?.();
}

async function _enterMobilePresentation() {
  if (document.fullscreenElement == null && document.documentElement.requestFullscreen) {
    try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); } catch (_) {}
  }
  if (screen.orientation?.lock) {
    try { await screen.orientation.lock('landscape'); } catch (_) {}
  }
}

function _isLandscape() {
  return window.matchMedia('(orientation: landscape)').matches;
}
