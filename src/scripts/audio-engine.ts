/**
 * Shared Web Audio engine for the tools.
 *
 * Two things this fixes about the previous implementation:
 *
 * 1. Pulses were fired from inside the requestAnimationFrame callback, so
 *    audio timing jittered with frame drops. Here events are scheduled ahead
 *    against `ctx.currentTime`, which is sample-accurate.
 * 2. Panning was hardcoded to hard left/right. Hard panning is fatiguing for
 *    many clients, so pan depth is now adjustable.
 *
 * The context is created lazily on a user gesture and suspended on stop —
 * nothing in this site autoplays.
 */

export type VoiceName = 'tone' | 'chime' | 'woodblock' | 'marimba' | 'bell' | 'pluck';
export type PanMode = 'discrete' | 'sweep';

export const VOICE_NAMES = ['tone', 'chime', 'woodblock', 'marimba', 'bell', 'pluck'] as const;

export interface AudioOptions {
  voice: VoiceName;
  pitch: number;
  volume: number;
  panDepth: number;
  panMode: PanMode;
}

export const DEFAULT_AUDIO_OPTIONS: AudioOptions = {
  voice: 'tone',
  pitch: 440,
  volume: 0.3,
  panDepth: 0.85,
  panMode: 'discrete',
};

/** Gain ramp time constant. Every level change uses this; nothing steps. */
const RAMP = 0.02;

export interface AudioEngine {
  ensureStarted(): Promise<void>;
  suspend(): void;
  /** Current audio-clock time in seconds, or 0 before the context exists. */
  now(): number;
  scheduleBeat(side: 'L' | 'R', when: number): void;
  /** Drop queued-but-unplayed events. Called when speed changes. */
  cancelScheduled(): void;
  setPan(pan: number, when?: number): void;
  playCue(kind: 'tick' | 'advance' | 'complete'): void;
  setOptions(next: Partial<AudioOptions>): void;
  destroy(): void;
}

export function createAudioEngine(): AudioEngine {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let limiter: DynamicsCompressorNode | null = null;
  let panner: StereoPannerNode | null = null;
  let sweepOsc: OscillatorNode | null = null;
  let sweepGain: GainNode | null = null;
  let opts = { ...DEFAULT_AUDIO_OPTIONS };
  let scheduled: Array<{ stop: () => void }> = [];

  function build(): void {
    if (ctx) return;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctor();

    // Brick-wall-ish limiter so no combination of BLS plus ambient layers can
    // clip into someone's headphones.
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.25;

    master = ctx.createGain();
    master.gain.value = opts.volume;

    panner = ctx.createStereoPanner();

    panner.connect(master).connect(limiter).connect(ctx.destination);
  }

  /**
   * Builds one short, self-terminating voice. Every node disconnects on
   * `ended` — the previous implementation leaked its oscillators.
   *
   * `override` lets `playCue` borrow a different voice/pitch for a single
   * note without touching the shared `opts` (see note on `playCue` below).
   */
  function playVoice(when: number, pan: number, override?: { voice?: VoiceName; pitch?: number }): void {
    if (!ctx || !panner) return;
    const t = Math.max(when, ctx.currentTime);
    const voice = override?.voice ?? opts.voice;
    const f = override?.pitch ?? opts.pitch;

    const out = ctx.createGain();
    const localPan = ctx.createStereoPanner();
    localPan.pan.setValueAtTime(pan, t);
    out.connect(localPan).connect(master!);

    const nodes: AudioNode[] = [out, localPan];
    let duration = 0.2;

    const env = (peak: number, attack: number, decay: number) => {
      out.gain.setValueAtTime(0, t);
      out.gain.linearRampToValueAtTime(peak, t + attack);
      out.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
      duration = attack + decay + 0.02;
    };

    const osc = (type: OscillatorType, freq: number, gain: number, detune = 0) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      o.detune.setValueAtTime(detune, t);
      g.gain.setValueAtTime(gain, t);
      o.connect(g).connect(out);
      nodes.push(o, g);
      return o;
    };

    const oscillators: OscillatorNode[] = [];
    // Non-oscillator sources (currently just the woodblock's noise burst)
    // that also need to be silenced on early cancellation, but shouldn't
    // drive the `last.onended` cleanup timing below — their duration is much
    // shorter than the envelope's.
    const extraSources: AudioScheduledSourceNode[] = [];

    switch (voice) {
      case 'tone':
        oscillators.push(osc('sine', f, 1));
        env(1, 0.01, 0.14);
        break;

      case 'chime':
        oscillators.push(osc('sine', f, 1), osc('sine', f * 2, 0.35), osc('sine', f * 3.01, 0.12));
        env(0.9, 0.005, 0.6);
        break;

      case 'woodblock': {
        oscillators.push(osc('triangle', f * 2.2, 0.8));
        const noise = ctx.createBufferSource();
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.03), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
        noise.buffer = buf;
        const nf = ctx.createBiquadFilter();
        nf.type = 'bandpass';
        nf.frequency.setValueAtTime(f * 3, t);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.5, t);
        noise.connect(nf).connect(ng).connect(out);
        noise.start(t);
        nodes.push(noise, nf, ng);
        extraSources.push(noise);
        env(0.9, 0.001, 0.09);
        break;
      }

      case 'marimba':
        oscillators.push(osc('triangle', f, 1), osc('sine', f * 4, 0.15));
        env(0.85, 0.004, 0.35);
        break;

      case 'bell':
        oscillators.push(osc('sine', f, 1), osc('sine', f * 2.76, 0.4), osc('sine', f * 5.4, 0.15));
        env(0.8, 0.003, 1.1);
        break;

      case 'pluck':
        oscillators.push(osc('sawtooth', f, 0.7));
        env(0.75, 0.002, 0.25);
        break;
    }

    oscillators.forEach((o) => {
      o.start(t);
      o.stop(t + duration);
    });

    const last = oscillators[oscillators.length - 1];
    const cleanup = () => nodes.forEach((n) => { try { n.disconnect(); } catch { /* already gone */ } });
    if (last) last.onended = cleanup;
    else window.setTimeout(cleanup, duration * 1000 + 50);

    const entry = {
      stop: () => {
        [...oscillators, ...extraSources].forEach((o) => { try { o.stop(); } catch { /* not started */ } });
        cleanup();
      },
    };
    scheduled.push(entry);
    // Keep the queue from growing without bound over a long session.
    if (scheduled.length > 32) scheduled = scheduled.slice(-32);
  }

  function ensureSweep(): void {
    if (!ctx || sweepOsc) return;
    sweepOsc = ctx.createOscillator();
    sweepGain = ctx.createGain();
    sweepOsc.type = 'sine';
    sweepOsc.frequency.setValueAtTime(opts.pitch, ctx.currentTime);
    sweepGain.gain.setValueAtTime(0, ctx.currentTime);
    sweepGain.gain.setTargetAtTime(1, ctx.currentTime, RAMP);
    sweepOsc.connect(sweepGain).connect(panner!);
    sweepOsc.start();
  }

  function teardownSweep(): void {
    if (!sweepOsc || !ctx) return;
    sweepGain?.gain.setTargetAtTime(0, ctx.currentTime, RAMP);
    const osc = sweepOsc;
    const gain = sweepGain;
    sweepOsc = null;
    sweepGain = null;
    window.setTimeout(() => {
      try { osc.stop(); } catch { /* already stopped */ }
      osc.disconnect();
      gain?.disconnect();
    }, RAMP * 1000 * 5);
  }

  /** Drop queued-but-unplayed events. Shared by `cancelScheduled` and `suspend`/`destroy`. */
  function stopScheduled(): void {
    scheduled.forEach((s) => s.stop());
    scheduled = [];
  }

  return {
    async ensureStarted() {
      build();
      if (ctx!.state === 'suspended') await ctx!.resume();
      if (opts.panMode === 'sweep') ensureSweep();
    },

    suspend() {
      teardownSweep();
      stopScheduled();
      ctx?.suspend();
    },

    now: () => ctx?.currentTime ?? 0,

    scheduleBeat(side, when) {
      if (!ctx || opts.panMode === 'sweep') return;
      playVoice(when, side === 'L' ? -opts.panDepth : opts.panDepth);
    },

    cancelScheduled: stopScheduled,

    setPan(pan, when) {
      if (!ctx || !panner) return;
      panner.pan.setTargetAtTime(pan * opts.panDepth, when ?? ctx.currentTime, RAMP);
    },

    // Borrows a different voice/pitch per note via `playVoice`'s override
    // param rather than mutating the shared `opts` — see note above
    // `playVoice`. That sidesteps having to restore `opts` afterwards, which
    // the mutate-in-place version could skip if a call ever threw.
    playCue(kind) {
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      const pitch = opts.pitch;
      if (kind === 'tick') {
        playVoice(t, 0, { voice: 'woodblock' });
      } else if (kind === 'advance') {
        playVoice(t, 0, { voice: 'chime' });
      } else {
        // A gentle two-note resolve so the end of a set is unmistakable.
        playVoice(t, 0, { voice: 'chime' });
        playVoice(t + 0.18, 0, { voice: 'chime', pitch: pitch * 1.5 });
      }
    },

    setOptions(next) {
      const prevMode = opts.panMode;
      opts = { ...opts, ...next };
      if (ctx && master && next.volume !== undefined) {
        master.gain.setTargetAtTime(opts.volume, ctx.currentTime, RAMP);
      }
      if (ctx && sweepOsc && next.pitch !== undefined) {
        sweepOsc.frequency.setTargetAtTime(opts.pitch, ctx.currentTime, RAMP);
      }
      if (ctx && opts.panMode !== prevMode) {
        if (opts.panMode === 'sweep') ensureSweep(); else teardownSweep();
      }
    },

    destroy() {
      teardownSweep();
      stopScheduled();
      ctx?.close();
      ctx = null;
    },
  };
}
