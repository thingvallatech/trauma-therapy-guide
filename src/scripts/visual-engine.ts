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

    // Domed arc: flat (y=0) at the edges, bulging toward the top (y<0) in
    // the middle — not a smile, since -1 is top in the Point.y convention.
    case 'arc':
      return { x, y: ARC_DEPTH * (x * x - 1) };

    case 'diagonal':
      return { x, y: x * DIAGONAL_SLOPE };

    // Two vertical oscillations per horizontal pass.
    case 'wave':
      return { x, y: Math.sin(2 * t) * WAVE_AMPLITUDE };

    // A stored preference or a saved preset can outlive the value it names —
    // renaming a path without bumping PREFS_VERSION would otherwise return
    // `undefined` here and throw inside the rAF callback, killing the render
    // loop mid-set with a frozen target and nothing surfaced to the user.
    // Add new paths as their own `case` above; this is a floor, not a home.
    default:
      return { x, y: 0 };
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

    // Same reasoning as `pathPoint`'s default: an unknown stored easing must
    // degrade to identity, not to `undefined` propagating into the renderer.
    default:
      return phase;
  }
}

// ---------------------------------------------------------------------------
// Appearance
// ---------------------------------------------------------------------------

export type TargetShape = 'orb' | 'ring' | 'glow' | 'star' | 'butterfly';

export interface VisualOptions {
  path: PathName;
  easing: EasingName;
  shape: TargetShape;
  /** Target diameter in CSS pixels. */
  size: number;
  color: string;
  background: string;
  /** 0 = flat, 1 = maximum halo. */
  glow: number;
  /** 0 = hard clear each frame, 1 = longest comet. */
  trail: number;
  /** Reduced-motion mode: cross-fade two static targets instead of translating. */
  crossfade: boolean;
}

export const DEFAULT_VISUAL_OPTIONS: VisualOptions = {
  path: 'horizontal',
  easing: 'cosine',
  shape: 'orb',
  size: 48,
  color: '#FFF8E7',
  background: '#000000',
  glow: 0.35,
  trail: 0,
  crossfade: false,
};

export const TARGET_SHAPES = ['orb', 'ring', 'glow', 'star', 'butterfly'] as const;

// ---------------------------------------------------------------------------
// Contrast guard
// ---------------------------------------------------------------------------

function parseHex(color: string): [number, number, number] {
  let hex = color.trim().replace('#', '');
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function relativeLuminance(color: string): number {
  const channels = parseHex(color).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * The same colour at zero alpha, for the outer stop of a glow gradient.
 * The CSS keyword `transparent` is `rgba(0, 0, 0, 0)`, so fading to it fades
 * through black — invisible against the dark built-in palettes, but a grey
 * halo darkening outward for anyone who picks a light background, which is
 * the inverse of a glow and a common high-contrast preference.
 */
function fadeOut(color: string): string {
  const [r, g, b] = parseHex(color);
  return `rgba(${r}, ${g}, ${b}, 0)`;
}

/**
 * WCAG contrast ratio, used to warn (never block) when a chosen
 * target/background pair would be hard to track.
 */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export interface VisualRenderer {
  render(phase: number): void;
  resize(): void;
  setOptions(next: Partial<VisualOptions>): void;
  destroy(): void;
}

export function createVisualRenderer(
  canvas: HTMLCanvasElement,
  initial: VisualOptions,
): VisualRenderer {
  const ctx = canvas.getContext('2d')!;
  let opts = { ...initial };
  let width = 0;
  let height = 0;
  let lastDpr = 0;

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    // Reallocating the backing store clears the canvas, so skip the work when
    // nothing that affects it has actually changed. `lastDpr` starts at 0, so
    // the construction-time call always goes through.
    if (rect.width === width && rect.height === height && dpr === lastDpr) return;
    width = rect.width;
    height = rect.height;
    lastDpr = dpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A resize discards the trail buffer, so repaint the background.
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }

  const onResize = () => resize();
  // The window event alone is not enough: a canvas laid out at zero size when
  // this runs (a collapsed panel, a flex parent that has not settled) would
  // never re-scale, and neither would one resized by layout rather than by the
  // viewport. Observing the element itself covers both. The window listener
  // stays for the one case the observer misses — device pixel ratio changing
  // while the CSS box does not, e.g. dragging the window to another display.
  const observer =
    typeof ResizeObserver === 'function' ? new ResizeObserver(() => resize()) : null;
  observer?.observe(canvas);
  window.addEventListener('resize', onResize);
  resize();

  function clearFrame(): void {
    // Crossfade forces the hard clear regardless of `trail`. Both targets are
    // drawn at fixed positions every frame, so a fading clear never takes the
    // "off" one down — it is re-composited before the fade can bite, and the
    // alternation contrast collapses. (At trail=1, 1Hz, the off target is
    // still ~55% lit at the far end of a half-pass.) Crossfade is forced on by
    // `prefers-reduced-motion` whatever the stored trail is, so a reduced-
    // motion user who once picked a trail would silently lose the bilateral
    // signal. A comet trail is meaningless when nothing translates anyway.
    if (opts.trail <= 0 || opts.crossfade) {
      ctx.fillStyle = opts.background;
      ctx.fillRect(0, 0, width, height);
      return;
    }
    // Fading the background rather than storing N positions gives a natural
    // comet falloff for free. trail=1 fades slowest.
    const alpha = 0.35 * (1 - opts.trail) + 0.02;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  function drawTarget(cx: number, cy: number, alpha: number): void {
    const r = opts.size / 2;
    ctx.globalAlpha = alpha;

    if (opts.glow > 0) {
      const glowR = r * (1 + opts.glow * 2.5);
      const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, glowR);
      grad.addColorStop(0, opts.color);
      grad.addColorStop(1, fadeOut(opts.color));
      ctx.globalAlpha = alpha * opts.glow;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = alpha;
    }

    ctx.fillStyle = opts.color;
    ctx.strokeStyle = opts.color;

    switch (opts.shape) {
      case 'orb':
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
        break;

      case 'ring':
        ctx.lineWidth = Math.max(2, r * 0.22);
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.85, 0, TAU);
        ctx.stroke();
        break;

      case 'glow': {
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, opts.color);
        grad.addColorStop(1, fadeOut(opts.color));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TAU);
        ctx.fill();
        break;
      }

      case 'star': {
        const points = 5;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
          const radius = i % 2 === 0 ? r : r * 0.45;
          const a = (i / (points * 2)) * TAU - Math.PI / 2;
          const px = cx + Math.cos(a) * radius;
          const py = cy + Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }

      case 'butterfly': {
        // Two mirrored teardrops — matches the butterfly-hug motif.
        for (const dir of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.bezierCurveTo(
            cx + dir * r * 1.4, cy - r * 1.2,
            cx + dir * r * 1.3, cy + r * 0.9,
            cx, cy,
          );
          ctx.fill();
        }
        break;
      }
    }

    ctx.globalAlpha = 1;
  }

  function render(phase: number): void {
    clearFrame();
    const margin = opts.size * 0.6;
    const halfW = Math.max(0, width / 2 - margin);
    const halfH = Math.max(0, height / 2 - margin);

    if (opts.crossfade) {
      // Reduced motion: nothing translates. Two fixed targets cross-fade, so
      // bilateral alternation survives without sustained movement.
      const t = applyEasing(opts.easing, phase < 0.5 ? phase * 2 : (1 - phase) * 2);
      drawTarget(width / 2 - halfW, height / 2, 1 - t);
      drawTarget(width / 2 + halfW, height / 2, t);
      return;
    }

    const point = pathPoint(opts.path, phase, opts.easing);
    drawTarget(width / 2 + point.x * halfW, height / 2 + point.y * halfH, 1);
  }

  return {
    render,
    resize,
    setOptions(next) {
      const backgroundChanged = next.background !== undefined && next.background !== opts.background;
      opts = { ...opts, ...next };
      if (backgroundChanged) {
        ctx.fillStyle = opts.background;
        ctx.fillRect(0, 0, width, height);
      }
    },
    destroy() {
      observer?.disconnect();
      window.removeEventListener('resize', onResize);
    },
  };
}
