import { describe, it, expect } from 'vitest';
import { createBlsClock, MAX_FRAME_DELTA, type BlsClock, type BlsSide } from '../src/scripts/bls-clock';

/**
 * Drives the clock from `from` to `to` in 60fps steps, the way all five
 * consumers do (every one calls `tick` inside a requestAnimationFrame
 * callback), collecting the beats emitted along the way.
 *
 * Tests that want to cross a beat boundary must advance this way rather than
 * in one jump: a jump larger than MAX_FRAME_DELTA is, by definition, the
 * stall the catch-up clamp exists to absorb.
 */
function run(clock: BlsClock, from: number, to: number, fps = 60): BlsSide[] {
  const frames = Math.round((to - from) * fps);
  const sides: BlsSide[] = [];
  for (let i = 1; i <= frames; i++) sides.push(...clock.tick(from + i / fps));
  return sides;
}

describe('createBlsClock', () => {
  it('starts at phase 0 (left) with beat 0', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(100);
    expect(clock.getPhase()).toBe(0);
    expect(clock.getBeat()).toBe(0);
  });

  it('reaches phase 0.5 (right) after half a cycle at 1Hz', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(0);
    run(clock, 0, 0.5);
    expect(clock.getPhase()).toBeCloseTo(0.5, 5);
  });

  it('emits R then L as sides alternate', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(0);
    expect(run(clock, 0, 0.5)).toEqual(['R']);
    expect(run(clock, 0.5, 1.0)).toEqual(['L']);
    expect(run(clock, 1.0, 1.5)).toEqual(['R']);
  });

  it('emits every beat crossed within a single long tick', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(0);
    // 0.2s is under the clamp, at 5Hz that is two half-passes
    const fast = createBlsClock({ getSpeed: () => 5 });
    fast.start(0);
    expect(fast.tick(0.2)).toEqual(['R', 'L']);
    expect(clock.getBeat()).toBe(0);
  });

  it('preserves phase across a speed change (no jump)', () => {
    let hz = 1;
    const clock = createBlsClock({ getSpeed: () => hz });
    clock.start(0);
    clock.tick(0.25);
    const before = clock.getPhase();
    hz = 2;
    clock.rebase(0.25);
    expect(clock.getPhase()).toBeCloseTo(before, 10);
  });

  it('advances at the new rate after a rebase', () => {
    let hz = 1;
    const clock = createBlsClock({ getSpeed: () => hz });
    clock.start(0);
    clock.tick(0.25);        // phase 0.25
    hz = 2;
    clock.rebase(0.25);
    clock.tick(0.5);         // +0.25s at 2Hz = +0.5 phase
    expect(clock.getPhase()).toBeCloseTo(0.75, 5);
  });

  it('computes beat times in closed form', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(10);
    // at 1Hz, beat k (a half-pass) lands every 0.5s from start
    expect(clock.beatTimeFor(1)).toBeCloseTo(10.5, 10);
    expect(clock.beatTimeFor(2)).toBeCloseTo(11.0, 10);
    expect(clock.beatTimeFor(3)).toBeCloseTo(11.5, 10);
  });

  it('keeps beatTimeFor consistent after a rebase', () => {
    let hz = 1;
    const clock = createBlsClock({ getSpeed: () => hz });
    clock.start(0);
    clock.tick(0.25);
    hz = 2;
    clock.rebase(0.25);
    // phase 0.25, now at 2Hz: remaining 0.25 phase takes 0.125s
    expect(clock.beatTimeFor(1)).toBeCloseTo(0.375, 10);
  });

  it('clamps a long frame delta so a backgrounded tab does not burst', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(0);
    const sides = clock.tick(10); // 10 seconds elapsed while backgrounded
    expect(sides.length).toBeLessThanOrEqual(1);
    expect(clock.getPhase()).toBeCloseTo(MAX_FRAME_DELTA % 1, 5);
  });

  it('clamps continuously across the catch-up threshold', () => {
    // The clamp used to trigger only above 1s, so deltas in the 0.25-1.0s band
    // passed through in full — the band a real main-thread stall lands in. At
    // the top of the speed range that was a step from 1 beat to 5.
    const below = createBlsClock({ getSpeed: () => 2.5 });
    const above = createBlsClock({ getSpeed: () => 2.5 });
    below.start(0);
    above.start(0);
    const nBelow = below.tick(MAX_FRAME_DELTA - 0.01).length;
    const nAbove = above.tick(MAX_FRAME_DELTA + 0.01).length;
    expect(nAbove).toBeLessThanOrEqual(nBelow + 1);
    expect(above.getPhase()).toBeCloseTo(below.getPhase(), 1);
  });

  it('does not burst on a sub-second stall at the top of the speed range', () => {
    const clock = createBlsClock({ getSpeed: () => 2.5 });
    clock.start(0);
    // 0.99s at 2.5Hz is nearly 5 half-passes if it passes through unclamped.
    expect(clock.tick(0.99)).toEqual(['R']);
  });

  it('stops emitting once the total beat count is reached', () => {
    const clock = createBlsClock({ getSpeed: () => 1, getTotalBeats: () => 2 });
    clock.start(0);
    expect(run(clock, 0, 1.0)).toEqual(['R', 'L']);
    expect(clock.isRunning()).toBe(false);
    expect(clock.tick(1.5)).toEqual([]);
  });

  it('ignores a zero or negative speed rather than running backwards', () => {
    const clock = createBlsClock({ getSpeed: () => 0 });
    clock.start(0);
    expect(clock.tick(1)).toEqual([]);
    expect(clock.getPhase()).toBe(0);
  });
});
