/**
 * This file is a placeholder for an alternative steering mode that reads
 * DeviceOrientationEvent (gyroscope) instead of the joystick drag delta.
 *
 * STATUS: Not yet implemented. The joystick (touch-joystick.js) is the
 * active mobile steering method. Wire this in when you want tilt support.
 *
 * Implementation notes:
 *   - Request DeviceOrientationEvent permission on iOS 13+ via
 *     `DeviceOrientationEvent.requestPermission()` inside a user gesture.
 *   - Map `event.gamma` (left/right tilt, range –90…90°) to input.steer.
 *   - A deadzone of ±3° and a sensitivity multiplier are recommended.
 *   - Store a `baseGamma` captured at calibration (button press) so the
 *     player can hold the phone at a comfortable angle and steer relative
 *     to that neutral position.
 */

/**
 * @param {object} input — shared input state object
 */
export function initSteeringWheel(input) {
  // TODO: implement gyroscope steering
  console.warn('[steering-wheel] Not yet implemented. Using joystick fallback.');
}
