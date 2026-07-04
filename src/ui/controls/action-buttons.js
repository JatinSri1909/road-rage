/**
 * The drift and nitro buttons are always visible on mobile but hidden on
 * desktop via CSS. They add the 'active' class for visual feedback.
 *
 * @param {object} input — shared input state object
 */
export function initActionBtns(input) {
  const btnDrift = document.getElementById('btnDrift');
  const btnNitro = document.getElementById('btnNitro');

  _bind(btnDrift, 'drift', input);
  _bind(btnNitro, 'boost', input);
}

function _bind(el, key, input) {
  if (!el) return;
  el.addEventListener('touchstart', e => {
    input[key] = true;
    el.classList.add('active');
    e.preventDefault();
  }, { passive: false });

  const release = () => {
    input[key] = false;
    el.classList.remove('active');
  };
  el.addEventListener('touchend',    release);
  el.addEventListener('touchcancel', release);
}
