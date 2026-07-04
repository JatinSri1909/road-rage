/**
 * The joystick uses a relative-delta drag model: the knob position
 * is always relative to where the finger first touched (not the
 * container centre). This avoids the "dead zone" problem where
 * touching off-centre starts with no input.
 *
 * Axis mapping:
 *   X → steer (negative = left, positive = right)
 *   Y → gas (up) / brake (down)
 *
 * @param {object} input — shared input state object
 */
export function initJoystick(input) {
  const joyContainer = document.getElementById('joyContainer');
  const joyKnob      = document.getElementById('joyKnob');
  if (!joyContainer || !joyKnob) return;

  let joyActive     = false;
  let activeTouchId = null;
  let dragStart     = { x: 0, y: 0 };
  let maxRadius     = 50;

  joyContainer.addEventListener('touchstart', e => {
    // Ignore if a joystick touch is already tracked (e.g. a stray second
    // finger landing on the joystick while steering) — first touch wins.
    if (joyActive) return;

    const touch = e.changedTouches[0]; // the touch that just started, not touches[0]
    activeTouchId = touch.identifier;
    joyActive     = true;

    const rect  = joyContainer.getBoundingClientRect();
    // Anchor at container centre, not touch point, to give full range
    dragStart.x = rect.left + rect.width  / 2;
    dragStart.y = rect.top  + rect.height / 2;
    maxRadius   = rect.width / 2;
    _handleMove(touch);
    e.preventDefault();
  }, { passive: false });

  window.addEventListener('touchmove', e => {
    if (!joyActive) return;
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      if (t.identifier === activeTouchId) {
        _handleMove(t);
        e.preventDefault();
        break;
      }
    }
  }, { passive: false });

  const reset = () => {
    joyActive     = false;
    activeTouchId = null;
    joyKnob.style.transform = 'translate(0px, 0px)';
    input.steer       = 0;
    input.steerActive = false;
    input.gas         = false;
    input.brake       = false;
    input.left        = false;
    input.right       = false;
  };

  const handleTouchEnd = e => {
    if (!joyActive) return;
    // Only reset if the joystick's OWN touch is among the ones that ended —
    // other fingers lifting (nitro, drift, etc.) must not affect the joystick.
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchId) {
        reset();
        break;
      }
    }
  };

  window.addEventListener('touchend',    handleTouchEnd);
  window.addEventListener('touchcancel', handleTouchEnd);

  function _handleMove(touch) {
    let dx   = touch.clientX - dragStart.x;
    let dy   = touch.clientY - dragStart.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d > maxRadius) { dx = (dx / d) * maxRadius; dy = (dy / d) * maxRadius; }

    joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;

    const normX = dx / maxRadius;
    const normY = dy / maxRadius;

    // Steering (continuous axis for smooth control)
    input.steer       = -normX;
    input.steerActive = Math.abs(normX) > 0.05;

    // Boolean fallbacks (used by physics when steerActive is false)
    input.left  = normX < -0.15;
    input.right = normX >  0.15;

    // Gas / brake: auto-accelerate when touching the joystick unless pulling down to brake
    input.gas   = normY < 0.25;
    input.brake = normY >= 0.25;
  }
}