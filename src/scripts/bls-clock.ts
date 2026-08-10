/**
 * Bilateral-stimulation clock shared by every BLS-family tool.
 *
 * Unlike the timer it replaces, this module never reads a clock itself — the
 * caller supplies the current time in seconds. That is what lets audio and
 * visuals share one timebase: when an AudioContext is live the caller passes
 * `ctx.currentTime` (so scheduled tones and the rendered dot cannot drift),
 * and otherwise `performance.now() / 1000`.
 *
 * Phase 0 is the LEFT edge, phase 0.5 the RIGHT. Beats are half-passes and are
 * 1-based; sides alternate R, L, R, ... The initial L action at start belongs
 * to the component, matching the previous convention.
 */

export type BlsSide = 'L' | 'R';

/** Max per-tick delta in seconds; guards against catch-up bursts after rAF pauses. */
export const MAX_FRAME_DELTA = 0.25;

/**
 * Deltas above this are treated as a backgrounded/throttled tab rather than a
 * single slow-but-legitimate tick, and get clamped down to MAX_FRAME_DELTA of
 * progress. Kept separate from MAX_FRAME_DELTA (the amount of progress let
 * through once clamped): callers that drive this clock from discrete events
 * rather than every rAF frame can easily produce sub-second deltas that
 * should still count in full, not be mistaken for a pause.
 */
const CATCHUP_TRIGGER = 1;

export interface BlsClock {
  start(now: number): void;
  stop(): void;
  isRunning(): boolean;
  /** Advance to `now`, returning every beat crossed since the last tick. */
  tick(now: number): BlsSide[];
  /** Re-anchor to `now` preserving current phase. Call whenever speed changes. */
  rebase(now: number): void;
  getPhase(): number;
  getBeat(): number;
  /** Absolute time at which beat `k` lands, assuming speed holds. */
  beatTimeFor(k: number): number;
}

export interface BlsClockOptions {
  /** Current speed in Hz (full L-R-L cycles per second). */
  getSpeed: () => number;
  /** Total beats in a set. Omit or return Infinity for continuous mode. */
  getTotalBeats?: () => number;
}

export function createBlsClock(opts: BlsClockOptions): BlsClock {
  let running = false;
  let tBase = 0;          // time anchor
  let cyclesAtBase = 0;   // accumulated cycles at the anchor
  let lastNow = 0;
  let beat = 0;

  function speed(): number {
    const hz = opts.getSpeed();
    return Number.isFinite(hz) && hz > 0 ? hz : 0;
  }

  function cyclesAt(now: number): number {
    return cyclesAtBase + (now - tBase) * speed();
  }

  return {
    start(now) {
      running = true;
      tBase = now;
      lastNow = now;
      cyclesAtBase = 0;
      beat = 0;
    },

    stop() {
      running = false;
    },

    isRunning: () => running,

    tick(now) {
      if (!running) return [];

      // A backgrounded tab pauses rAF; on refocus the delta can be huge. Shift
      // the anchor forward by the excess so the clamp also holds for
      // beatTimeFor, rather than only for the phase we happen to read here.
      const delta = now - lastNow;
      if (delta > CATCHUP_TRIGGER) tBase += delta - MAX_FRAME_DELTA;
      lastNow = now;

      const emitted: BlsSide[] = [];
      const reached = Math.floor(cyclesAt(now) * 2);
      const total = opts.getTotalBeats ? opts.getTotalBeats() : Infinity;

      while (beat < reached) {
        beat += 1;
        emitted.push(beat % 2 === 1 ? 'R' : 'L');
        if (beat >= total) {
          running = false;
          break;
        }
      }

      // Close the books at `now` using the speed that was in effect for this
      // tick. Anchoring here (rather than only in `rebase`) means a later
      // speed change only affects time from this point forward — `rebase`
      // re-anchoring against a stale `tBase` would otherwise apply the new
      // speed retroactively to the whole elapsed interval and jump the phase.
      cyclesAtBase = cyclesAt(now);
      tBase = now;

      return emitted;
    },

    rebase(now) {
      cyclesAtBase = cyclesAt(now);
      tBase = now;
    },

    getPhase() {
      const c = cyclesAt(lastNow);
      return c - Math.floor(c);
    },

    getBeat: () => beat,

    beatTimeFor(k) {
      const hz = speed();
      if (hz === 0) return Infinity;
      return tBase + (k / 2 - cyclesAtBase) / hz;
    },
  };
}
