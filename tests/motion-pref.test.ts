import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prefersReducedMotion, onReducedMotion } from '../src/scripts/motion-pref';

function stubMatchMedia(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  const mql = {
    matches,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.delete(cb),
  };
  vi.stubGlobal('window', { matchMedia: () => mql });
  return {
    emit(next: boolean) {
      mql.matches = next;
      listeners.forEach((cb) => cb({ matches: next }));
    },
    listenerCount: () => listeners.size,
  };
}

beforeEach(() => vi.unstubAllGlobals());

describe('motion-pref', () => {
  it('reports the current preference', () => {
    stubMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
  });

  it('returns false when matchMedia is unavailable (SSR)', () => {
    vi.stubGlobal('window', undefined);
    expect(prefersReducedMotion()).toBe(false);
  });

  it('invokes the callback immediately with the current value', () => {
    stubMatchMedia(true);
    const cb = vi.fn();
    onReducedMotion(cb);
    expect(cb).toHaveBeenCalledWith(true);
  });

  it('invokes the callback when the preference changes at runtime', () => {
    const media = stubMatchMedia(false);
    const cb = vi.fn();
    onReducedMotion(cb);
    media.emit(true);
    expect(cb).toHaveBeenLastCalledWith(true);
  });

  it('stops notifying after unsubscribe', () => {
    const media = stubMatchMedia(false);
    const cb = vi.fn();
    const off = onReducedMotion(cb);
    off();
    expect(media.listenerCount()).toBe(0);
    media.emit(true);
    expect(cb).toHaveBeenCalledTimes(1); // only the immediate call
  });
});
