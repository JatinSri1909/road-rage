/**
 * Pure functions — no side effects, no DOM, no Three.js imports.
 * This makes them trivial to unit-test (see tests/ranking.test.js).
 *
 * Ranking priority (highest → lowest):
 *   1. Finished cars rank higher than unfinished cars.
 *   2. Among finished cars: earlier finish time wins.
 *   3. Among unfinished cars: higher `progress` value wins.
 *      (progress = (lap - 1) * SAMPLES + currentTrackIdx)
 */

/**
 * Returns `true` if car `a` is ahead of car `b`.
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
export function isBetter(a, b) {
  if (a.finished !== b.finished) return a.finished;
  if (a.finished && b.finished)  return a.finishTime < b.finishTime;
  return (a.progress || 0) > (b.progress || 0);
}

/**
 * Returns the 1-based race position of `target` among `allCars`.
 * @param {object}   target
 * @param {object[]} allCars
 * @returns {number}
 */
export function computeRank(target, allCars) {
  let rank = 1;
  for (const car of allCars) {
    if (car !== target && isBetter(car, target)) rank++;
  }
  return rank;
}

/**
 * Converts a 1-based rank number to an ordinal string (1 → '1ST', etc.).
 * @param {number} n
 * @returns {string}
 */
export function ordinal(n) {
  return ['', '1ST', '2ND', '3RD', '4TH'][n] || `${n}TH`;
}
