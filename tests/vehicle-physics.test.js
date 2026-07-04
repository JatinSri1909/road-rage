import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { nearestSampleIdx } from '../src/physics/vehicle-physics.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Build a circle of evenly-spaced sample points. */
function makeSamplePts(n, radius = 100) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (i / n) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  });
}

// ── nearestSampleIdx ──────────────────────────────────────────────────────────

describe('nearestSampleIdx', () => {
  const SAMPLES = 48;
  const pts     = makeSamplePts(SAMPLES, 100);

  it('returns the correct closest sample when pos is exactly on a sample point', () => {
    const targetIdx = 12;
    const pos       = pts[targetIdx].clone();
    const { idx }   = nearestSampleIdx(pos, targetIdx, pts, SAMPLES);
    expect(idx).toBe(targetIdx);
  });

  it('returns a nearby index when pos is between two sample points', () => {
    const a = pts[20].clone();
    const b = pts[21].clone();
    const midPos = new THREE.Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    const { idx } = nearestSampleIdx(midPos, 20, pts, SAMPLES);
    expect([20, 21]).toContain(idx);
  });

  it('wraps correctly at the end of the sample array (near index 0)', () => {
    // Position near index 0, but start guess is near SAMPLES - 1
    const pos         = pts[0].clone();
    const startGuess  = SAMPLES - 2;
    const { idx }     = nearestSampleIdx(pos, startGuess, pts, SAMPLES);
    expect(idx).toBe(0);
  });

  it('dist is approximately 0 when pos is exactly on a sample point', () => {
    const targetIdx = 5;
    const pos       = pts[targetIdx].clone();
    const { dist }  = nearestSampleIdx(pos, targetIdx, pts, SAMPLES);
    expect(dist).toBeCloseTo(0, 3);
  });

  it('dist is positive when pos is between sample points', () => {
    const a     = pts[10].clone();
    const b     = pts[11].clone();
    const mid   = new THREE.Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    const { dist } = nearestSampleIdx(mid, 10, pts, SAMPLES);
    expect(dist).toBeGreaterThan(0);
  });
});
