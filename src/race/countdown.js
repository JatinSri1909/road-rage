/**
 * initCountdown(onComplete) animates the countdown element and calls
 * `onComplete` when the sequence finishes (at which point race-state
 * enables the physics loop).
 */

/**
 * @param {() => void} onComplete — called when GO! fades out and race begins
 */
export function initCountdown(onComplete) {
  const countdownEl = document.getElementById('countdown');
  const hud         = document.getElementById('hud');
  if (!countdownEl) { onComplete(); return; }

  hud?.classList.remove('hidden');

  let count = 3;
  countdownEl.textContent  = count;
  countdownEl.style.display = 'flex';

  const iv = setInterval(() => {
    count -= 1;
    if (count > 0) {
      countdownEl.textContent = count;
    } else if (count === 0) {
      countdownEl.textContent = 'GO!';
    } else {
      clearInterval(iv);
      countdownEl.style.display = 'none';
      onComplete();
    }
  }, 800);
}
