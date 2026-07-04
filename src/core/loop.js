/**
 * Calls the provided tick callback each frame with a capped delta time.
 * Keeping this separate means main.js stays readable and the loop itself
 * is trivially testable / replaceable (e.g. fixed-timestep in future).
 */

const MAX_DT = 0.05; // ~20 fps floor; prevents spiral-of-death on tab switch

export function startLoop(tick) {
  let lastT = performance.now();

  function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastT) / 1000, MAX_DT);
    lastT = now;
    tick(dt);
  }

  requestAnimationFrame(animate);
}