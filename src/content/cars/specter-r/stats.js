/**
 * Specter R: A track-focused version of the Ferrari model.
 * Highly agile, with exceptional grip and steering responsiveness,
 * trading off top speed for superior cornering capability.
 *
 * @type {import('../_template/stats.js').CarStats}
 */
const stats = {
  maxSpeed:    44, // moderate top speed
  maxReverse:  10,
  accel:       24,
  reverseAccel: 14,
  brake:       35, // strong brakes
  drag:        4.2,
  maxTurn:     3.2, // high turn rate
  gripNormal:  8.5, // exceptional grip
  gripDrift:   2.2, // higher drift grip
};

export default stats;
