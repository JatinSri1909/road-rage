/**
 * Copy from phoenix-gt/stats.js and adjust values.
 * See phoenix-gt/stats.js for a full tuning guide.
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
