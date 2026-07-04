/**
 * Viper-X: a lighter, faster car that trades grip for top speed.
 * Higher maxSpeed/accel than Phoenix GT, but lower grip means it's
 * easier to lose the back end in corners — a riskier, twitchier drive.
 *
 * See _template/stats.js for the full tuning guide.
 *
 * @type {import('../_template/stats.js').CarStats}
 */
const stats = {
  maxSpeed:    47,
  maxReverse:  11,
  accel:       25,
  reverseAccel: 15,
  brake:       31,
  drag:        4.4,
  maxTurn:     2.7,
  gripNormal:  7.6,
  gripDrift:   1.5,
};

export default stats;