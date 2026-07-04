import { describe, it, expect } from 'vitest';
import { isBetter, computeRank, ordinal } from '../src/race/ranking.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCar(overrides = {}) {
  return {
    finished:    false,
    finishTime:  0,
    progress:    0,
    lap:         1,
    ...overrides,
  };
}

// ── isBetter ─────────────────────────────────────────────────────────────────

describe('isBetter', () => {
  it('a finished car beats an unfinished car', () => {
    const finished   = makeCar({ finished: true, finishTime: 120 });
    const unfinished = makeCar({ finished: false, progress: 9999 });
    expect(isBetter(finished, unfinished)).toBe(true);
    expect(isBetter(unfinished, finished)).toBe(false);
  });

  it('among finished cars, earlier finish time wins', () => {
    const fast = makeCar({ finished: true, finishTime: 80 });
    const slow = makeCar({ finished: true, finishTime: 90 });
    expect(isBetter(fast, slow)).toBe(true);
    expect(isBetter(slow, fast)).toBe(false);
  });

  it('among unfinished cars, higher progress wins', () => {
    const ahead  = makeCar({ progress: 500 });
    const behind = makeCar({ progress: 300 });
    expect(isBetter(ahead, behind)).toBe(true);
    expect(isBetter(behind, ahead)).toBe(false);
  });

  it('equal progress returns false (no advantage)', () => {
    const a = makeCar({ progress: 400 });
    const b = makeCar({ progress: 400 });
    expect(isBetter(a, b)).toBe(false);
  });
});

// ── computeRank ───────────────────────────────────────────────────────────────

describe('computeRank', () => {
  it('solo car is always 1st', () => {
    const car  = makeCar({ progress: 0 });
    expect(computeRank(car, [car])).toBe(1);
  });

  it('player at front of 4-car field is 1st', () => {
    const player = makeCar({ progress: 900 });
    const ai1    = makeCar({ progress: 600 });
    const ai2    = makeCar({ progress: 400 });
    const ai3    = makeCar({ progress: 200 });
    const all    = [player, ai1, ai2, ai3];
    expect(computeRank(player, all)).toBe(1);
  });

  it('player at back of 4-car field is 4th', () => {
    const player = makeCar({ progress: 100 });
    const ai1    = makeCar({ progress: 900 });
    const ai2    = makeCar({ progress: 700 });
    const ai3    = makeCar({ progress: 500 });
    const all    = [player, ai1, ai2, ai3];
    expect(computeRank(player, all)).toBe(4);
  });

  it('finished player beats all unfinished AI regardless of progress', () => {
    const player = makeCar({ finished: true, finishTime: 150 });
    const ai1    = makeCar({ progress: 99999 });
    const ai2    = makeCar({ progress: 99999 });
    const all    = [player, ai1, ai2];
    expect(computeRank(player, all)).toBe(1);
  });
});

// ── ordinal ───────────────────────────────────────────────────────────────────

describe('ordinal', () => {
  it.each([
    [1, '1ST'],
    [2, '2ND'],
    [3, '3RD'],
    [4, '4TH'],
    [5, '5TH'],
  ])('ordinal(%i) === %s', (n, expected) => {
    expect(ordinal(n)).toBe(expected);
  });
});
