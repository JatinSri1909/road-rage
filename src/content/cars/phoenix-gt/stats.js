/**
 * These values are read by vehicle-physics.js at runtime.
 * Tweak here to adjust feel without touching engine code.
 *
 * TUNING GUIDE:
 *   maxSpeed       — top speed in m/s (~42 ≈ 151 km/h). Keep ≤ 55 or
 *                    AI rubber-band math breaks down.
 *   accel          — forward acceleration force. Raising above 30 makes
 *                    the car feel too snappy off the line.
 *   brake          — braking deceleration. Should be > accel for good feel.
 *   drag           — rolling resistance. Lower = more gliding at speed.
 *   maxTurn        — max angular velocity (rad/s). Above 3.0 feels twitchy.
 *   gripNormal     — lateral grip coefficient (higher = less sliding).
 *   gripDrift      — lateral grip while drift button held (lower = more slide).
 *
 * @typedef {Object} CarStats
 * @property {number} maxSpeed
 * @property {number} maxReverse
 * @property {number} accel
 * @property {number} reverseAccel
 * @property {number} brake
 * @property {number} drag
 * @property {number} maxTurn
 * @property {number} gripNormal
 * @property {number} gripDrift
 */

/** @type {CarStats} */
const stats = {
  maxSpeed:    42,
  maxReverse:  12,
  accel:       22,
  reverseAccel: 16,
  brake:       34,
  drag:        5.2,
  maxTurn:     2.5,
  gripNormal:  9.0,
  gripDrift:   1.7,
};

export default stats;
