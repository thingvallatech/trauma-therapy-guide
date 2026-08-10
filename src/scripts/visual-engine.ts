/**
 * Motion paths and canvas rendering for the visual BLS tools.
 *
 * Every path is parameterised so that phase 0 is the LEFT extreme and phase
 * 0.5 the RIGHT extreme — matching the beat convention in bls-clock.ts. That
 * invariant is what lets a user switch paths without the audio falling out of
 * step with the visual.
 */

export type PathName = 'horizontal' | 'infinity' | 'arc' | 'diagonal' | 'wave';
export type EasingName = 'cosine' | 'linear' | 'smootherstep';

export interface Point {
  /** -1 = left edge, +1 = right edge */
  x: number;
  /** -1 = top, +1 = bottom */
  y: number;
}

export const PATH_NAMES = ['horizontal', 'infinity', 'arc', 'diagonal', 'wave'] as const;
export const EASING_NAMES = ['cosine', 'linear', 'smootherstep'] as const;

const TAU = Math.PI * 2;

/** Vertical excursion of the non-flat paths, as a fraction of half-height. */
const ARC_DEPTH = 0.35;
const DIAGONAL_SLOPE = 0.5;
const WAVE_AMPLITUDE = 0.3;
const INFINITY_DEPTH = 0.5;

/**
 * Fold phase into a triangle wave: 0 at the left edge, 1 at the right, back to
 * 0. Easing is applied to this, which is what makes the pacing control real —
 * shaping the traversal rather than decorating it.
 */
function traverse(phase: number): number {
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}

export function pathPoint(path: PathName, phase: number, easing: EasingName = 'cosine'): Point {
  const t = phase * TAU;
  const x = applyEasing(easing, traverse(phase)) * 2 - 1;

  switch (path) {
    case 'horizontal':
      return { x, y: 0 };

    // Lemniscate of Gerono. Crosses centre at both horizontal extremes and
    // loops opposite ways in each half — the classic light-bar figure-8.
    case 'infinity':
      return { x, y: -Math.sin(2 * t) * INFINITY_DEPTH };

    // Shallow smile: highest at the edges, lowest in the middle.
    case 'arc':
      return { x, y: ARC_DEPTH * (x * x - 1) };

    case 'diagonal':
      return { x, y: x * DIAGONAL_SLOPE };

    // Two vertical oscillations per horizontal pass.
    case 'wave':
      return { x, y: Math.sin(2 * t) * WAVE_AMPLITUDE };
  }
}

export function applyEasing(easing: EasingName, phase: number): number {
  switch (easing) {
    case 'linear':
      return phase;
    // Ease in and out at the edges — natural for eye tracking, and what the
    // tools did before this module existed.
    case 'cosine':
      return 0.5 - 0.5 * Math.cos(phase * Math.PI);
    case 'smootherstep':
      return phase * phase * phase * (phase * (phase * 6 - 15) + 10);
  }
}
