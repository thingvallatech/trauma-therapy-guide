/**
 * Shared bilateral-stimulation (BLS) timer used by the BLS-family tools
 * (BLSVisual, BLSAudio, BLSCombined, BLSTapping, ButterflyHug).
 *
 * Driven by requestAnimationFrame with elapsed-time phase accumulation:
 * - Speed is re-read every frame via `getSpeed()`, so moving the speed
 *   slider mid-run takes effect immediately (no jump in phase or count).
 * - Per-frame delta time is clamped, so a backgrounded tab (where rAF is
 *   paused) does not cause a burst of catch-up beats on refocus.
 *
 * Conventions shared by all tools:
 * - `start()` resets the beat count to 0 and begins a fresh set.
 * - `stop()` halts the timer and preserves state; components keep the
 *   current count visible on screen.
 * - Phase 0 corresponds to the LEFT side. Components perform their initial
 *   "L" action (pulse/highlight/flap) themselves on start; subsequent beats
 *   alternate starting with R (beat 1 = R, beat 2 = L, ...).
 */

export type BlsSide = 'L' | 'R';

export interface BlsTimerOptions {
  /** Current speed in Hz (full L-R-L cycles per second). Read every frame. */
  getSpeed: () => number;
  /**
   * Called every animation frame with the current cycle phase in [0, 1).
   * Phase 0 = left edge, phase 0.5 = right edge. Use for smooth motion.
   */
  onFrame?: (phase: number) => void;
  /**
   * Called once per completed half-pass. `beat` is 1-based; sides alternate
   * R, L, R, ... (the initial L action at start is the component's job).
   */
  onBeat?: (side: BlsSide, beat: number) => void;
  /**
   * Total beats in a set. Return Infinity (or omit) for continuous mode.
   * Read on every beat, so changing it mid-run takes effect immediately.
   */
  getTotalBeats?: () => number;
  /** Called when the beat count reaches the total. The timer stops itself first. */
  onSetComplete?: () => void;
}

export interface BlsTimer {
  /** Begin a fresh set: beat count resets to 0. No-op if already running. */
  start: () => void;
  /** Halt the timer, preserving the current beat count. */
  stop: () => void;
  isRunning: () => boolean;
  getBeat: () => number;
}

/** Max per-frame delta in seconds; guards against catch-up bursts after rAF pauses. */
const MAX_FRAME_DELTA = 0.25;

export function createBlsTimer(opts: BlsTimerOptions): BlsTimer {
  let running = false;
  let rafId = 0;
  let lastTs = 0;
  let cycles = 0; // accumulated full cycles (fractional)
  let beat = 0; // completed half-passes

  function frame(ts: number): void {
    if (!running) return;
    if (lastTs === 0) lastTs = ts;
    const dt = Math.min((ts - lastTs) / 1000, MAX_FRAME_DELTA);
    lastTs = ts;

    const hz = opts.getSpeed();
    if (Number.isFinite(hz) && hz > 0) cycles += dt * hz;

    if (opts.onFrame) opts.onFrame(cycles % 1);

    const reached = Math.floor(cycles * 2);
    while (beat < reached) {
      beat += 1;
      const side: BlsSide = beat % 2 === 1 ? 'R' : 'L';
      if (opts.onBeat) opts.onBeat(side, beat);
      const total = opts.getTotalBeats ? opts.getTotalBeats() : Infinity;
      if (beat >= total) {
        running = false;
        if (opts.onSetComplete) opts.onSetComplete();
        return;
      }
    }

    rafId = requestAnimationFrame(frame);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTs = 0;
      cycles = 0;
      beat = 0;
      rafId = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
      lastTs = 0;
    },
    isRunning: () => running,
    getBeat: () => beat,
  };
}

/**
 * Shared short stereo pulse used by the audio-capable BLS tools.
 * `pan` is -1 (left) to 1 (right).
 */
export function playBlsPulse(
  ctx: AudioContext,
  pan: number,
  frequency: number,
  volume: number
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const panner = ctx.createStereoPanner();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  panner.pan.value = pan;
  gain.gain.value = 0;
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
  osc.connect(gain).connect(panner).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.2);
}
