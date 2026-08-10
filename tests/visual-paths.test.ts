import { describe, it, expect } from 'vitest';
import { pathPoint, applyEasing, PATH_NAMES, EASING_NAMES } from '../src/scripts/visual-engine';

describe('pathPoint', () => {
  it.each(PATH_NAMES)('%s starts at the left edge', (path) => {
    expect(pathPoint(path, 0).x).toBeCloseTo(-1, 5);
  });

  it.each(PATH_NAMES)('%s reaches the right edge at half phase', (path) => {
    expect(pathPoint(path, 0.5).x).toBeCloseTo(1, 5);
  });

  it.each(PATH_NAMES)('%s stays within the unit box', (path) => {
    for (let i = 0; i <= 100; i++) {
      const p = pathPoint(path, i / 100);
      expect(Math.abs(p.x)).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(1.0001);
    }
  });

  it.each(PATH_NAMES)('%s is continuous across the phase wrap', (path) => {
    const end = pathPoint(path, 0.999);
    const start = pathPoint(path, 0);
    expect(Math.abs(end.x - start.x)).toBeLessThan(0.05);
    expect(Math.abs(end.y - start.y)).toBeLessThan(0.05);
  });

  it('keeps horizontal flat on the y axis', () => {
    expect(pathPoint('horizontal', 0.3).y).toBe(0);
  });

  it('makes infinity cross the vertical centre at the edges and the midpoint', () => {
    // A lemniscate crosses the centre line at both horizontal extremes and
    // again where the loops meet — not at the quarter points.
    expect(pathPoint('infinity', 0).y).toBeCloseTo(0, 5);
    expect(pathPoint('infinity', 0.25).y).toBeCloseTo(0, 5);
    expect(pathPoint('infinity', 0.5).y).toBeCloseTo(0, 5);
  });

  it('gives infinity opposite vertical excursions within a single pass', () => {
    const early = pathPoint('infinity', 0.125).y;  // first loop
    const late = pathPoint('infinity', 0.375).y;   // second loop
    expect(Math.sign(early)).toBe(-Math.sign(late));
    expect(Math.abs(early)).toBeGreaterThan(0.1);
  });

  it('pins arc to a mid-pass bulge toward the top, flat at the edges', () => {
    // y = ARC_DEPTH*(x^2 - 1): zero at both edges (x = +-1) and most
    // negative — i.e. toward the top, since -1 is top — where x = 0, which
    // cosine easing puts at the mid-pass phases 0.25 and 0.75. A parabola
    // opening the wrong way (negated ARC_DEPTH) would flip these signs.
    expect(pathPoint('arc', 0).y).toBeCloseTo(0, 5);
    expect(pathPoint('arc', 0.5).y).toBeCloseTo(0, 5);
    expect(pathPoint('arc', 0.25).y).toBeCloseTo(-0.35, 5);
    expect(pathPoint('arc', 0.75).y).toBeCloseTo(-0.35, 5);
  });

  it('pins diagonal y proportional to x with the correct sign', () => {
    // y = x * DIAGONAL_SLOPE. Under cosine easing, phase 1/6 and 1/3 land
    // exactly on x = -0.5 and x = +0.5. A negated slope would flip both
    // signs; a rescaled slope would miss these exact magnitudes.
    expect(pathPoint('diagonal', 1 / 6).y).toBeCloseTo(-0.25, 5);
    expect(pathPoint('diagonal', 1 / 3).y).toBeCloseTo(0.25, 5);
  });

  it('pins wave to two full oscillations per cycle', () => {
    // y = sin(4*pi*phase) * WAVE_AMPLITUDE: peaks at phase 0.125 and 0.625,
    // troughs at 0.375 and 0.875, zero at the quarter points. A halved
    // frequency would peak at 0.25 instead of 0.125; a doubled frequency
    // would already be back at zero by 0.125.
    expect(pathPoint('wave', 0.125).y).toBeCloseTo(0.3, 5);
    expect(pathPoint('wave', 0.375).y).toBeCloseTo(-0.3, 5);
    expect(pathPoint('wave', 0.625).y).toBeCloseTo(0.3, 5);
    expect(pathPoint('wave', 0.875).y).toBeCloseTo(-0.3, 5);
    expect(pathPoint('wave', 0.25).y).toBeCloseTo(0, 5);
  });
});

describe('pathPoint easing', () => {
  it('reproduces the original cosine motion by default', () => {
    // The tools moved as -cos(2*pi*phase) before this module existed; the
    // cosine easing must be exactly that, or existing sessions change feel.
    for (const p of [0.1, 0.3, 0.42, 0.77]) {
      expect(pathPoint('horizontal', p, 'cosine').x).toBeCloseTo(-Math.cos(p * 2 * Math.PI), 6);
    }
  });

  it('moves at constant velocity under linear easing', () => {
    const step = (a: number, b: number) =>
      pathPoint('horizontal', b, 'linear').x - pathPoint('horizontal', a, 'linear').x;
    // Equal phase intervals within a half-pass cover equal distance.
    expect(step(0.0, 0.1)).toBeCloseTo(step(0.3, 0.4), 6);
  });

  it('still pins the edges regardless of easing', () => {
    for (const easing of EASING_NAMES) {
      expect(pathPoint('horizontal', 0, easing).x).toBeCloseTo(-1, 5);
      expect(pathPoint('horizontal', 0.5, easing).x).toBeCloseTo(1, 5);
    }
  });
});

describe('applyEasing', () => {
  it.each(EASING_NAMES)('%s maps 0 to 0 and 1 to 1', (easing) => {
    expect(applyEasing(easing, 0)).toBeCloseTo(0, 6);
    expect(applyEasing(easing, 1)).toBeCloseTo(1, 6);
  });

  it.each(EASING_NAMES)('%s is monotonic', (easing) => {
    let prev = -Infinity;
    for (let i = 0; i <= 50; i++) {
      const v = applyEasing(easing, i / 50);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });

  it('leaves linear unchanged', () => {
    expect(applyEasing('linear', 0.37)).toBeCloseTo(0.37, 6);
  });

  it('makes cosine slower at the edges than in the middle', () => {
    const edgeStep = applyEasing('cosine', 0.05) - applyEasing('cosine', 0);
    const midStep = applyEasing('cosine', 0.55) - applyEasing('cosine', 0.5);
    expect(midStep).toBeGreaterThan(edgeStep);
  });
});

import { contrastRatio } from '../src/scripts/visual-engine';

describe('contrastRatio', () => {
  it('gives the maximum ratio for black on white', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 1);
  });

  it('gives 1 for identical colors', () => {
    expect(contrastRatio('#3a7d44', '#3a7d44')).toBeCloseTo(1, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#FFF8E7', '#0A1F0A')).toBeCloseTo(
      contrastRatio('#0A1F0A', '#FFF8E7'), 5,
    );
  });

  it('accepts 3-digit hex', () => {
    expect(contrastRatio('#fff', '#000')).toBeCloseTo(21, 1);
  });

  it('flags the default warm-white-on-black pairing as high contrast', () => {
    expect(contrastRatio('#FFF8E7', '#000000')).toBeGreaterThan(3);
  });

  it('flags a low-contrast pairing', () => {
    expect(contrastRatio('#333333', '#3a3a3a')).toBeLessThan(3);
  });
});
