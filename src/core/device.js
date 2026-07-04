/**
 * Kept as a tiny standalone module so every other module can import
 * `isMobileDevice` without pulling in renderer or scene dependencies.
 */

export const isMobileDevice =
  window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export function applyDeviceClasses() {
  document.body.classList.toggle('mobile-device', isMobileDevice);
  document.body.classList.toggle('desktop-device', !isMobileDevice);
}