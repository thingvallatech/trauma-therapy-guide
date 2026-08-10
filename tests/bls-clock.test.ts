import { describe, it, expect } from 'vitest';
import { createBlsClock, MAX_FRAME_DELTA } from '../src/scripts/bls-clock';

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
    clock.tick(0.5);
    expect(clock.getPhase()).toBeCloseTo(0.5, 5);
  });

  it('emits R then L as sides alternate', () => {
    const clock = createBlsClock({ getSpeed: () => 1 });
    clock.start(0);
    expect(clock.tick(0.5)).toEqual(['R']);
    expect(clock.tick(1.0)).toEqual(['L']);
    expect(clock.tick(1.5)).toEqual(['R']);
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

  it('stops emitting once the total beat count is reached', () => {
    const clock = createBlsClock({ getSpeed: () => 1, getTotalBeats: () => 2 });
    clock.start(0);
    clock.tick(0.5);
    clock.tick(1.0);
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
