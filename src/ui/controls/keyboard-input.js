/**
 * Reads Arrow keys / WASD for gas/brake/steer, Shift for drift,
 * Space for nitro. Mutates the shared `input` object in-place.
 *
 * @param {object} input — shared input state object
 */
export function initKeyboard(input) {
  const KEYS_LEFT  = new Set(['ArrowLeft',  'a', 'A']);
  const KEYS_RIGHT = new Set(['ArrowRight', 'd', 'D']);
  const KEYS_GAS   = new Set(['ArrowUp',    'w', 'W']);
  const KEYS_BRAKE = new Set(['ArrowDown',  's', 'S']);

  window.addEventListener('keydown', e => {
    if (KEYS_LEFT.has(e.key))  input.left  = true;
    if (KEYS_RIGHT.has(e.key)) input.right = true;
    if (KEYS_GAS.has(e.key))   input.gas   = true;
    if (KEYS_BRAKE.has(e.key)) input.brake = true;
    if (e.key === 'Shift')     input.drift = true;
    if (e.key === ' ')       { input.boost = true; e.preventDefault(); }
  });

  window.addEventListener('keyup', e => {
    if (KEYS_LEFT.has(e.key))  input.left  = false;
    if (KEYS_RIGHT.has(e.key)) input.right = false;
    if (KEYS_GAS.has(e.key))   input.gas   = false;
    if (KEYS_BRAKE.has(e.key)) input.brake = false;
    if (e.key === 'Shift')     input.drift = false;
    if (e.key === ' ')         input.boost = false;
  });
}
