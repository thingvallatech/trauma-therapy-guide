# Tool Audio & Visual Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every interactive tool a customizable audio and visual layer — correct audio scheduling, adjustable pan depth and timbre, an ambient noise/drone/binaural bed, multiple motion paths on canvas, full theming, and persisted clinical presets.

**Architecture:** Five new modules under `src/scripts/` provide a shared engine: a single clock owns bilateral phase (audio-authoritative when an AudioContext exists), an audio engine schedules ahead on the Web Audio clock, a canvas visual engine renders motion paths, a preferences module persists settings, and a motion-preference observer replaces four inconsistent reduced-motion implementations. Twelve widgets adopt these in four tiers.

**Tech Stack:** Astro 5 (static), TypeScript, Tailwind CSS v4, Web Audio API, Canvas 2D, three.js (Sandtray only), Vitest (new — logic tests only).

## Global Constraints

- **Nothing autoplays.** `AudioContext` is constructed lazily on first user gesture and suspended on stop. Sound defaults to **off** in every tool, including tools gaining audio for the first time.
- **No tick sound on SUDScale or VOCScale** unless the user explicitly enables it.
- **Binaural beats ship with no evidence copy and no therapeutic claims**, and get no entry in the tools content collection. The functional headphones note stays.
- **Every animation respects reduced motion**, and responds to the setting changing at runtime.
- **`localStorage` failure must never break a tool.** All access wrapped in try/catch with fallback to in-memory defaults.
- **Every Web Audio voice disconnects its nodes on `ended`.**
- **All gain changes ramp** via `setTargetAtTime` (~20ms). Never assign `.value` on a sounding node.
- **Phase 0 = LEFT.** Preserved from the existing timer convention across all motion paths.
- **Stop preserves the beat count on screen**; a fresh Start resets it to 0.
- Shared settings strings go in `src/i18n/ui.ts` under `tools.settings.*`. Tool-specific strings stay in each widget's local `t = {en, es}` object.
- Spanish uses neutral Latin American register, tú forms.
- `npm run verify` must be green before every commit.
- Design tokens: `forest-*`, `bronze-*`, `wood-*` (defined in `src/styles/global.css`). Amber is reserved for functional warnings only.

---

## File Structure

**Create:**
- `src/scripts/bls-clock.ts` — phase accumulation, closed-form beat times, frame-delta clamp
- `src/scripts/motion-pref.ts` — live `prefers-reduced-motion` observer
- `src/scripts/tool-prefs.ts` — versioned localStorage, safe access
- `src/scripts/audio-engine.ts` — graph, lookahead scheduler, voices, ambient bed
- `src/scripts/visual-engine.ts` — path functions + canvas renderer
- `src/data/tool-presets.ts` — built-in presets, per-tool tier map, palettes
- `src/lib/tool-widgets.ts` — single `componentName → Component` map
- `src/components/tools/ToolSettings.astro` — shared collapsible settings panel
- `vitest.config.ts`, `tests/` — logic tests only

**Modify:**
- `src/i18n/ui.ts` — new `tools.settings.*` group (en + es)
- 4 route files — consume `tool-widgets.ts`, pass `warnings` prop
- 12 widgets — adopt the engine per tier
- `package.json` — vitest devDependency + `test` script
- **Delete:** `src/scripts/bls-timer.ts` (replaced by `bls-clock.ts`) once all five consumers migrate

---

## Task 1: Test harness + BLS clock

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/scripts/bls-clock.ts`
- Test: `tests/bls-clock.test.ts`

**Interfaces:**
- Consumes: nothing (foundation task)
- Produces:
```ts
export type BlsSide = 'L' | 'R';
export interface BlsClock {
  start(now: number): void;
  stop(): void;
  isRunning(): boolean;
  tick(now: number): BlsSide[];   // emits beats crossed since last tick
  rebase(now: number): void;      // call on speed change; preserves phase
  getPhase(): number;             // [0,1), 0 = LEFT
  getBeat(): number;
  beatTimeFor(k: number): number; // absolute time-source time of beat k
}
export function createBlsClock(opts: {
  getSpeed: () => number;
  getTotalBeats?: () => number;
}): BlsClock;
export const MAX_FRAME_DELTA = 0.25;
```

Time is in **seconds**, supplied by the caller — `ctx.currentTime` when audio is live, `performance.now() / 1000` otherwise. The clock never reads a clock itself; this is what makes it testable and what keeps audio and visuals on one timebase.

- [ ] **Step 1: Add vitest**

```bash
npm install -D vitest@^3
```

Then in `package.json`, add to `"scripts"` (the `verify` script already runs `npm run test --if-present`, so this wires in automatically):

```json
"test": "vitest run"
```

- [ ] **Step 2: Add vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
```

- [ ] **Step 3: Write the failing tests**

Create `tests/bls-clock.test.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run tests/bls-clock.test.ts`
Expected: FAIL — `Failed to resolve import "../src/scripts/bls-clock"`

- [ ] **Step 5: Implement the clock**

Create `src/scripts/bls-clock.ts`:

```ts
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
      if (delta > MAX_FRAME_DELTA) tBase += delta - MAX_FRAME_DELTA;
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
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run tests/bls-clock.test.ts`
Expected: PASS — 11 tests

- [ ] **Step 7: Verify the build still passes**

Run: `npm run verify`
Expected: tests pass, then Astro builds 113 pages with no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/scripts/bls-clock.ts tests/bls-clock.test.ts
git commit -m "feat(tools): add shared BLS clock with closed-form beat times

Replaces the rAF-internal timer with a clock that takes time from the
caller, so audio (scheduled on ctx.currentTime) and visuals (rAF) share
one timebase and cannot drift. Adds vitest for logic-only tests."
```

---

## Task 2: Live reduced-motion observer

**Files:**
- Create: `src/scripts/motion-pref.ts`
- Test: `tests/motion-pref.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
```ts
export function prefersReducedMotion(): boolean;
export function onReducedMotion(cb: (reduced: boolean) => void): () => void; // returns unsubscribe
```

Replaces four inconsistent implementations (`BreathPacer:110`, `ButterflyHug:85`, `Sandtray:288`, `BLSVisual:120`, `BLSCombined:121`, and Lightstream's Tailwind `motion-reduce:` variant). None of the current ones respond to the setting changing at runtime.

- [ ] **Step 1: Write the failing test**

Create `tests/motion-pref.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/motion-pref.test.ts`
Expected: FAIL — cannot resolve `../src/scripts/motion-pref`

- [ ] **Step 3: Implement**

Create `src/scripts/motion-pref.ts`:

```ts
/**
 * Single source of truth for `prefers-reduced-motion` across the tools.
 *
 * The tools previously read this four different ways, all of them once at
 * init — so toggling the OS setting mid-session did nothing. This observer
 * reports changes as they happen.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function mediaQuery(): MediaQueryList | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null;
  return window.matchMedia(QUERY);
}

export function prefersReducedMotion(): boolean {
  return mediaQuery()?.matches ?? false;
}

/**
 * Calls `cb` immediately with the current value, then on every change.
 * Returns an unsubscribe function.
 */
export function onReducedMotion(cb: (reduced: boolean) => void): () => void {
  const mql = mediaQuery();
  cb(mql?.matches ?? false);
  if (!mql) return () => {};

  const handler = (e: MediaQueryListEvent | { matches: boolean }) => cb(e.matches);
  mql.addEventListener('change', handler as EventListener);
  return () => mql.removeEventListener('change', handler as EventListener);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/motion-pref.test.ts`
Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add src/scripts/motion-pref.ts tests/motion-pref.test.ts
git commit -m "feat(tools): add live prefers-reduced-motion observer"
```

---

## Task 3: Preferences store

**Files:**
- Create: `src/scripts/tool-prefs.ts`
- Test: `tests/tool-prefs.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
```ts
export const PREFS_VERSION = 1;
export interface ToolPrefs { [key: string]: unknown }
export function loadPrefs<T extends ToolPrefs>(toolId: string, defaults: T): T;
export function savePrefs(toolId: string, prefs: ToolPrefs): void;
export function clearPrefs(toolId: string): void;
export function loadGlobalPrefs<T extends ToolPrefs>(defaults: T): T;
export function saveGlobalPrefs(prefs: ToolPrefs): void;
```

Keys are `ttg:prefs:v1:<toolId>` and `ttg:prefs:v1:global`. Unknown keys in stored data are dropped; missing keys fall back to the default. Any thrown error (Safari private mode, quota, corrupt JSON) degrades to defaults rather than propagating.

- [ ] **Step 1: Write the failing test**

Create `tests/tool-prefs.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadPrefs, savePrefs, clearPrefs, PREFS_VERSION } from '../src/scripts/tool-prefs';

function stubStorage(impl?: Partial<Storage>) {
  const data = new Map<string, string>();
  const store: Storage = {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    get length() { return data.size; },
    ...impl,
  } as Storage;
  vi.stubGlobal('localStorage', store);
  return data;
}

const DEFAULTS = { speed: 1.0, passes: 24, sound: false };

beforeEach(() => vi.unstubAllGlobals());

describe('tool-prefs', () => {
  it('returns defaults when nothing is stored', () => {
    stubStorage();
    expect(loadPrefs('bls-visual', DEFAULTS)).toEqual(DEFAULTS);
  });

  it('round-trips saved values', () => {
    stubStorage();
    savePrefs('bls-visual', { ...DEFAULTS, speed: 1.6 });
    expect(loadPrefs('bls-visual', DEFAULTS).speed).toBe(1.6);
  });

  it('writes under a versioned, namespaced key', () => {
    const data = stubStorage();
    savePrefs('bls-visual', DEFAULTS);
    expect([...data.keys()]).toContain(`ttg:prefs:v${PREFS_VERSION}:bls-visual`);
  });

  it('keeps tools isolated from each other', () => {
    stubStorage();
    savePrefs('bls-visual', { ...DEFAULTS, speed: 1.6 });
    expect(loadPrefs('bls-audio', DEFAULTS).speed).toBe(1.0);
  });

  it('fills in keys added since the value was stored', () => {
    stubStorage();
    savePrefs('bls-visual', { speed: 1.6 });
    const loaded = loadPrefs('bls-visual', DEFAULTS);
    expect(loaded).toEqual({ speed: 1.6, passes: 24, sound: false });
  });

  it('drops stored keys that are no longer known', () => {
    stubStorage();
    savePrefs('bls-visual', { ...DEFAULTS, removedSetting: 'gone' });
    expect(loadPrefs('bls-visual', DEFAULTS)).not.toHaveProperty('removedSetting');
  });

  it('falls back to defaults on corrupt JSON', () => {
    const data = stubStorage();
    data.set(`ttg:prefs:v${PREFS_VERSION}:bls-visual`, '{ not json');
    expect(loadPrefs('bls-visual', DEFAULTS)).toEqual(DEFAULTS);
  });

  it('ignores data written under a different version', () => {
    const data = stubStorage();
    data.set('ttg:prefs:v0:bls-visual', JSON.stringify({ speed: 9 }));
    expect(loadPrefs('bls-visual', DEFAULTS)).toEqual(DEFAULTS);
  });

  it('does not throw when reading is blocked', () => {
    stubStorage({ getItem: () => { throw new Error('SecurityError'); } });
    expect(() => loadPrefs('bls-visual', DEFAULTS)).not.toThrow();
    expect(loadPrefs('bls-visual', DEFAULTS)).toEqual(DEFAULTS);
  });

  it('does not throw when writing is blocked (Safari private mode)', () => {
    stubStorage({ setItem: () => { throw new Error('QuotaExceededError'); } });
    expect(() => savePrefs('bls-visual', DEFAULTS)).not.toThrow();
  });

  it('does not throw when localStorage is absent entirely', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => savePrefs('bls-visual', DEFAULTS)).not.toThrow();
    expect(loadPrefs('bls-visual', DEFAULTS)).toEqual(DEFAULTS);
  });

  it('clears a tool back to defaults', () => {
    stubStorage();
    savePrefs('bls-visual', { ...DEFAULTS, speed: 1.6 });
    clearPrefs('bls-visual');
    expect(loadPrefs('bls-visual', DEFAULTS)).toEqual(DEFAULTS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/tool-prefs.test.ts`
Expected: FAIL — cannot resolve `../src/scripts/tool-prefs`

- [ ] **Step 3: Implement**

Create `src/scripts/tool-prefs.ts`:

```ts
/**
 * Local-only tool preferences. No accounts, no server — consistent with the
 * project's no-database stance.
 *
 * Every access is defensive: Safari private mode throws on write, storage can
 * be disabled entirely, and stored JSON can be corrupt. None of that is
 * allowed to break a tool, so all failures degrade to defaults.
 */

export const PREFS_VERSION = 1;

export type ToolPrefs = Record<string, unknown>;

const GLOBAL_ID = 'global';

function keyFor(toolId: string): string {
  return `ttg:prefs:v${PREFS_VERSION}:${toolId}`;
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // access itself can throw when cookies are blocked
  }
}

/**
 * Merge stored values over `defaults`, keeping only keys the caller still
 * knows about. That gives forward compatibility (new settings appear with
 * their default) and backward compatibility (removed settings are dropped)
 * without a migration step for additive changes.
 */
export function loadPrefs<T extends ToolPrefs>(toolId: string, defaults: T): T {
  const store = storage();
  if (!store) return { ...defaults };

  let raw: string | null;
  try {
    raw = store.getItem(keyFor(toolId));
  } catch {
    return { ...defaults };
  }
  if (!raw) return { ...defaults };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ...defaults };
  }
  if (typeof parsed !== 'object' || parsed === null) return { ...defaults };

  const stored = parsed as ToolPrefs;
  const merged = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (key in stored && stored[key] !== undefined) {
      (merged as ToolPrefs)[key] = stored[key];
    }
  }
  return merged;
}

export function savePrefs(toolId: string, prefs: ToolPrefs): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(keyFor(toolId), JSON.stringify(prefs));
  } catch {
    // Quota exceeded or private mode — preferences simply do not persist.
  }
}

export function clearPrefs(toolId: string): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(keyFor(toolId));
  } catch {
    // Nothing to do.
  }
}

export function loadGlobalPrefs<T extends ToolPrefs>(defaults: T): T {
  return loadPrefs(GLOBAL_ID, defaults);
}

export function saveGlobalPrefs(prefs: ToolPrefs): void {
  savePrefs(GLOBAL_ID, prefs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/tool-prefs.test.ts`
Expected: PASS — 12 tests

- [ ] **Step 5: Commit**

```bash
git add src/scripts/tool-prefs.ts tests/tool-prefs.test.ts
git commit -m "feat(tools): add versioned local preferences store"
```

---

## Task 4: Motion path functions

**Files:**
- Create: `src/scripts/visual-engine.ts` (path functions only; renderer added in Task 5)
- Test: `tests/visual-paths.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
```ts
export type PathName = 'horizontal' | 'infinity' | 'arc' | 'diagonal' | 'wave';
export type EasingName = 'cosine' | 'linear' | 'smootherstep';
export interface Point { x: number; y: number } // both in [-1, 1]
export const PATH_NAMES: readonly PathName[];
export const EASING_NAMES: readonly EasingName[];
export function pathPoint(path: PathName, phase: number, easing?: EasingName): Point;
export function applyEasing(easing: EasingName, t: number): number;
```

**Easing is not decoration.** It shapes the horizontal traversal itself: `phase` is folded
into a triangle wave (0 → 1 → 0 across the cycle), the easing curve is applied to *that*, and
the result becomes `x`. `cosine` reproduces exactly the ease-at-the-edges motion the tools
have today; `linear` gives genuinely constant velocity. Getting this wrong makes the easing
control do nothing, so the tests pin it down.

**Critical invariant, and the reason these are tested:** every path must put its horizontal extremes at phase 0 (x = −1, LEFT) and phase 0.5 (x = +1, RIGHT), so beat events stay aligned with the visual edges no matter which path the user picks.

- [ ] **Step 1: Write the failing test**

Create `tests/visual-paths.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visual-paths.test.ts`
Expected: FAIL — cannot resolve `../src/scripts/visual-engine`

- [ ] **Step 3: Implement the path functions**

Create `src/scripts/visual-engine.ts`:

```ts
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
```

Note: `applyEasing` is declared below `pathPoint` in the file but called from it — function declarations hoist, so ordering is a readability choice, not a constraint. The `y` component of `infinity` and `wave` is deliberately a function of raw phase, not of the eased `x`, so those paths keep their shape as pacing changes.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/visual-paths.test.ts`
Expected: PASS — 27 tests (5 paths × 4 parameterised cases + 7 specific, plus easing)

- [ ] **Step 5: Commit**

```bash
git add src/scripts/visual-engine.ts tests/visual-paths.test.ts
git commit -m "feat(tools): add BLS motion path functions

Five paths (horizontal, infinity, arc, diagonal, wave) all pinned to
left extreme at phase 0 and right at phase 0.5, so switching paths
never desynchronises the audio beat from the visual edge."
```

---

## Task 5: Canvas renderer

**Files:**
- Modify: `src/scripts/visual-engine.ts` (append renderer)

**Interfaces:**
- Consumes: `pathPoint`, `applyEasing`, `PathName`, `EasingName` (Task 4)
- Produces:
```ts
export type TargetShape = 'orb' | 'ring' | 'glow' | 'star' | 'butterfly';
export const TARGET_SHAPES: readonly TargetShape[];
export interface VisualOptions {
  path: PathName;
  easing: EasingName;
  shape: TargetShape;
  size: number;          // px at 1x
  color: string;         // css color
  background: string;    // css color
  glow: number;          // 0..1
  trail: number;         // 0 = none, 1 = longest
  crossfade: boolean;    // reduced-motion mode
}
export interface VisualRenderer {
  render(phase: number): void;
  resize(): void;
  setOptions(next: Partial<VisualOptions>): void;
  destroy(): void;
}
export function createVisualRenderer(canvas: HTMLCanvasElement, opts: VisualOptions): VisualRenderer;
export const DEFAULT_VISUAL_OPTIONS: VisualOptions;
export function contrastRatio(a: string, b: string): number;
```

Rendering is verified by eye in the browser, not unit tested — except `contrastRatio`, which is pure.

- [ ] **Step 1: Write the failing test for the contrast guard**

Append to `tests/visual-paths.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/visual-paths.test.ts`
Expected: FAIL — `contrastRatio is not a function`

- [ ] **Step 3: Append the renderer and contrast guard to `src/scripts/visual-engine.ts`**

```ts
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

  function resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // A resize discards the trail buffer, so repaint the background.
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, width, height);
  }

  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  resize();

  function clearFrame(): void {
    if (opts.trail <= 0) {
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
      grad.addColorStop(1, 'transparent');
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
        grad.addColorStop(1, 'transparent');
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
      window.removeEventListener('resize', onResize);
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run`
Expected: PASS — all suites

- [ ] **Step 5: Verify the build**

Run: `npm run verify`
Expected: green

- [ ] **Step 6: Commit**

```bash
git add src/scripts/visual-engine.ts tests/visual-paths.test.ts
git commit -m "feat(tools): add canvas visual renderer with trails, glow, crossfade

Adds five target shapes, trail-by-background-fade, radial-gradient glow,
a WCAG contrast guard for user-chosen colors, and a crossfade mode that
makes the visual tools usable under prefers-reduced-motion instead of
redirecting the user elsewhere."
```

---

## Task 6: Audio engine — graph, scheduler, voices

**Files:**
- Create: `src/scripts/audio-engine.ts`

**Interfaces:**
- Consumes: `BlsClock` (Task 1)
- Produces:
```ts
export type VoiceName = 'tone' | 'chime' | 'woodblock' | 'marimba' | 'bell' | 'pluck';
export const VOICE_NAMES: readonly VoiceName[];
export type PanMode = 'discrete' | 'sweep';
export interface AudioEngine {
  ensureStarted(): Promise<void>;
  suspend(): void;
  now(): number;
  scheduleBeat(side: 'L' | 'R', when: number): void;
  cancelScheduled(): void;
  setPan(pan: number, when?: number): void;
  playCue(kind: 'tick' | 'advance' | 'complete'): void;
  setOptions(next: Partial<AudioOptions>): void;
  destroy(): void;
}
export interface AudioOptions {
  voice: VoiceName;
  pitch: number;      // Hz
  volume: number;     // 0..1
  panDepth: number;   // 0..1
  panMode: PanMode;
}
export const DEFAULT_AUDIO_OPTIONS: AudioOptions;
export function createAudioEngine(): AudioEngine;
```

- [ ] **Step 1: Create the module**

Create `src/scripts/audio-engine.ts`:

```ts
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
   */
  function playVoice(when: number, pan: number): void {
    if (!ctx || !panner) return;
    const t = Math.max(when, ctx.currentTime);
    const f = opts.pitch;

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

    switch (opts.voice) {
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
        oscillators.forEach((o) => { try { o.stop(); } catch { /* not started */ } });
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

  return {
    async ensureStarted() {
      build();
      if (ctx!.state === 'suspended') await ctx!.resume();
      if (opts.panMode === 'sweep') ensureSweep();
    },

    suspend() {
      teardownSweep();
      this.cancelScheduled();
      ctx?.suspend();
    },

    now: () => ctx?.currentTime ?? 0,

    scheduleBeat(side, when) {
      if (!ctx || opts.panMode === 'sweep') return;
      playVoice(when, side === 'L' ? -opts.panDepth : opts.panDepth);
    },

    cancelScheduled() {
      scheduled.forEach((s) => s.stop());
      scheduled = [];
    },

    setPan(pan, when) {
      if (!ctx || !panner) return;
      panner.pan.setTargetAtTime(pan * opts.panDepth, when ?? ctx.currentTime, RAMP);
    },

    playCue(kind) {
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      const base = opts.pitch;
      const saved = opts.voice;
      opts = { ...opts, voice: 'chime' };
      if (kind === 'tick') {
        opts = { ...opts, voice: 'woodblock' };
        playVoice(t, 0);
      } else if (kind === 'advance') {
        playVoice(t, 0);
      } else {
        // A gentle two-note resolve so the end of a set is unmistakable.
        playVoice(t, 0);
        const savedPitch = opts.pitch;
        opts = { ...opts, pitch: base * 1.5 };
        playVoice(t + 0.18, 0);
        opts = { ...opts, pitch: savedPitch };
      }
      opts = { ...opts, voice: saved };
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
      scheduled.forEach((s) => s.stop());
      scheduled = [];
      ctx?.close();
      ctx = null;
    },
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run verify`
Expected: green (the module is not imported by any page yet, but Astro type-checks it)

- [ ] **Step 3: Commit**

```bash
git add src/scripts/audio-engine.ts
git commit -m "feat(tools): add Web Audio engine with voices and adjustable pan depth

Six timbres, discrete or sweep panning, a master limiter, ramped gain
throughout, and per-voice node cleanup on ended."
```

---

## Task 7: Audio engine — ambient bed

**Files:**
- Modify: `src/scripts/audio-engine.ts`

**Interfaces:**
- Consumes: the engine internals from Task 6
- Produces (added to `AudioEngine`):
```ts
export type NoiseColor = 'white' | 'pink' | 'brown';
export type AmbientKind = 'none' | 'white' | 'pink' | 'brown' | 'drone' | 'binaural';
export interface AmbientOptions {
  kind: AmbientKind;
  volume: number;      // 0..1
  binauralBase: number;  // Hz carrier
  binauralBeat: number;  // 0.5..12 Hz offset
}
export const DEFAULT_AMBIENT_OPTIONS: AmbientOptions;
// on AudioEngine:
setAmbient(next: Partial<AmbientOptions>): void;
```

Per the spec: binaural ships as one sound option among others, with no evidence copy and no therapeutic claims anywhere in the UI.

- [ ] **Step 1: Add the ambient types and defaults near the top of `src/scripts/audio-engine.ts`**

```ts
export type AmbientKind = 'none' | 'white' | 'pink' | 'brown' | 'drone' | 'binaural';

export const AMBIENT_KINDS = ['none', 'white', 'pink', 'brown', 'drone', 'binaural'] as const;

export interface AmbientOptions {
  kind: AmbientKind;
  volume: number;
  binauralBase: number;
  binauralBeat: number;
}

export const DEFAULT_AMBIENT_OPTIONS: AmbientOptions = {
  kind: 'none',
  volume: 0.2,
  binauralBase: 200,
  binauralBeat: 4,
};
```

- [ ] **Step 2: Add noise buffer generation**

```ts
/**
 * Generates a looping noise buffer with a genuine spectral slope — pink at
 * -3dB/octave via Paul Kellett's filter, brown at -6dB/octave via a leaky
 * integrator. Baked into the buffer once so there is no runtime filter cost.
 */
function makeNoiseBuffer(ctx: AudioContext, color: 'white' | 'pink' | 'brown'): AudioBuffer {
  const length = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const out = buffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  let last = 0;

  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;

    if (color === 'white') {
      out[i] = white * 0.5;
    } else if (color === 'pink') {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    } else {
      last = (last + 0.02 * white) / 1.02;
      out[i] = last * 3.5;
    }
  }
  return buffer;
}
```

- [ ] **Step 3: Add ambient state and the `setAmbient` method inside `createAudioEngine`**

Add to the local state declarations:

```ts
let ambient = { ...DEFAULT_AMBIENT_OPTIONS };
let ambientGain: GainNode | null = null;
let ambientNodes: AudioNode[] = [];
```

Add these functions before the returned object:

```ts
function teardownAmbient(): void {
  const dying = ambientNodes;
  ambientNodes = [];
  if (ctx && ambientGain) {
    ambientGain.gain.setTargetAtTime(0, ctx.currentTime, RAMP);
  }
  const gain = ambientGain;
  ambientGain = null;
  window.setTimeout(() => {
    dying.forEach((n) => {
      try { (n as OscillatorNode | AudioBufferSourceNode).stop?.(); } catch { /* not started */ }
      n.disconnect();
    });
    gain?.disconnect();
  }, RAMP * 1000 * 6);
}

function buildAmbient(): void {
  if (!ctx || !limiter || ambient.kind === 'none') return;

  ambientGain = ctx.createGain();
  ambientGain.gain.setValueAtTime(0, ctx.currentTime);
  ambientGain.connect(limiter);

  if (ambient.kind === 'white' || ambient.kind === 'pink' || ambient.kind === 'brown') {
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, ambient.kind);
    src.loop = true;
    src.connect(ambientGain);
    src.start();
    ambientNodes.push(src);
  } else if (ambient.kind === 'drone') {
    // Two slightly detuned saws through a low-pass — soft, non-directional.
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.connect(ambientGain);
    ambientNodes.push(filter);
    for (const detune of [-7, 7]) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(110, ctx.currentTime);
      o.detune.setValueAtTime(detune, ctx.currentTime);
      g.gain.setValueAtTime(0.3, ctx.currentTime);
      o.connect(g).connect(filter);
      o.start();
      ambientNodes.push(o, g);
    }
  } else {
    // Binaural: one oscillator per ear through a channel merger, which gives
    // true channel isolation rather than a pan approximation.
    const merger = ctx.createChannelMerger(2);
    merger.connect(ambientGain);
    ambientNodes.push(merger);
    const freqs = [ambient.binauralBase, ambient.binauralBase + ambient.binauralBeat];
    freqs.forEach((freq, channel) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(freq, ctx!.currentTime);
      g.gain.setValueAtTime(0.5, ctx!.currentTime);
      o.connect(g);
      g.connect(merger, 0, channel);
      o.start();
      ambientNodes.push(o, g);
    });
  }

  ambientGain.gain.setTargetAtTime(ambient.volume, ctx.currentTime, RAMP * 8);
}
```

- [ ] **Step 4: Expose `setAmbient` on the returned object**

```ts
    setAmbient(next) {
      const prevKind = ambient.kind;
      ambient = { ...ambient, ...next };
      if (!ctx) return;

      const structureChanged =
        ambient.kind !== prevKind ||
        next.binauralBase !== undefined ||
        next.binauralBeat !== undefined;

      if (structureChanged) {
        teardownAmbient();
        if (ambient.kind !== 'none') {
          // Wait out the fade so the old layer never clicks against the new one.
          window.setTimeout(() => buildAmbient(), RAMP * 1000 * 7);
        }
      } else if (ambientGain && next.volume !== undefined) {
        ambientGain.gain.setTargetAtTime(ambient.volume, ctx.currentTime, RAMP * 4);
      }
    },
```

Add `setAmbient(next: Partial<AmbientOptions>): void;` to the `AudioEngine` interface, and call `teardownAmbient()` from both `suspend()` and `destroy()`.

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 6: Commit**

```bash
git add src/scripts/audio-engine.ts
git commit -m "feat(tools): add ambient sound bed to audio engine

White/pink/brown noise with genuine spectral slopes, a detuned drone,
and a binaural layer routed per-ear through a channel merger. All fade
in and out; none autoplay."
```

---

## Task 8: Presets, palettes, and tier map

**Files:**
- Create: `src/data/tool-presets.ts`

**Interfaces:**
- Consumes: types from `visual-engine.ts` and `audio-engine.ts`
- Produces:
```ts
export type ToolTier = 'A' | 'B' | 'C' | 'D';
export const TOOL_TIERS: Record<string, ToolTier>;
export interface Palette { id: string; bg: string; surface: string; accent: string; target: string; text: string }
export const PALETTES: readonly Palette[];
export interface BlsPreset { id: string; speed: number; passes: number; voice: VoiceName; path: PathName; panDepth: number }
export const BLS_PRESETS: readonly BlsPreset[];
```

Preset and palette *labels* are not in this file — they live in `ui.ts` as `tools.settings.preset.<id>` and `tools.settings.palette.<id>` so both languages stay together.

- [ ] **Step 1: Create the file**

```ts
import type { VoiceName } from '../scripts/audio-engine';
import type { PathName } from '../scripts/visual-engine';

/**
 * How much of the shared settings surface each tool gets. A motion panel on a
 * button wizard would be noise, so tools opt in by tier rather than uniformly.
 *
 *  A — full: motion, sound, palette, presets
 *  B — motion and sound
 *  C — cue sounds and palette only
 *  D — palette and ambient only (keeps its own bespoke controls)
 */
export type ToolTier = 'A' | 'B' | 'C' | 'D';

export const TOOL_TIERS: Record<string, ToolTier> = {
  BLSVisual: 'A',
  BLSAudio: 'A',
  BLSCombined: 'A',
  BLSTapping: 'B',
  ButterflyHug: 'B',
  BreathPacer: 'B',
  Lightstream: 'B',
  Grounding: 'C',
  Container: 'C',
  SafePlace: 'C',
  FeelingWheel: 'C',
  SUDScale: 'C',
  VOCScale: 'C',
  Sandtray: 'D',
};

export interface Palette {
  id: string;
  bg: string;
  surface: string;
  accent: string;
  target: string;
  text: string;
}

/** `id` maps to a `tools.settings.palette.<id>` label in src/i18n/ui.ts. */
export const PALETTES: readonly Palette[] = [
  { id: 'default',   bg: '#000000', surface: '#122E12', accent: '#FFC107', target: '#FFF8E7', text: '#C8E6C9' },
  { id: 'contrast',  bg: '#000000', surface: '#000000', accent: '#FFFFFF', target: '#FFFFFF', text: '#FFFFFF' },
  { id: 'calm',      bg: '#0A1F0A', surface: '#122E12', accent: '#81C784', target: '#A5D6A7', text: '#C8E6C9' },
  { id: 'warm',      bg: '#1A1210', surface: '#2A1D18', accent: '#E5A100', target: '#F5C46B', text: '#F0E6DC' },
  { id: 'cool',      bg: '#0B1620', surface: '#122534', accent: '#6BB3F5', target: '#BFE1FF', text: '#D6E8F5' },
] as const;

export interface BlsPreset {
  id: string;
  speed: number;
  passes: number;
  voice: VoiceName;
  path: PathName;
  panDepth: number;
}

/**
 * Starting points, not prescriptions. Shapiro describes speed as "as fast as
 * the client can comfortably track" rather than a fixed Hz, so these are the
 * commonly-taught defaults the tools already documented, bundled for one-click
 * recall. `id` maps to a `tools.settings.preset.<id>` label in ui.ts.
 */
export const BLS_PRESETS: readonly BlsPreset[] = [
  { id: 'desensitization', speed: 1.4, passes: 30, voice: 'tone',      path: 'horizontal', panDepth: 0.9 },
  { id: 'installation',    speed: 0.7, passes: 12, voice: 'chime',     path: 'horizontal', panDepth: 0.7 },
  { id: 'resourcing',      speed: 0.5, passes: 8,  voice: 'marimba',   path: 'arc',        panDepth: 0.6 },
  { id: 'child',           speed: 0.8, passes: 16, voice: 'woodblock', path: 'infinity',   panDepth: 0.75 },
] as const;
```

- [ ] **Step 2: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 3: Commit**

```bash
git add src/data/tool-presets.ts
git commit -m "feat(tools): add presets, palettes, and per-tool tier map"
```

---

## Task 9: i18n strings

**Files:**
- Modify: `src/i18n/ui.ts`

**Interfaces:**
- Consumes: preset and palette ids from `tool-presets.ts` (Task 8)
- Produces: `tools.settings.*` translation keys used by `ToolSettings.astro` (Task 10)

Keys go in the flat `'namespace.key'` dictionary matching the existing convention. Insert the English block immediately after the existing `'tools.widgetNotImplemented'` key (around `ui.ts:180`) and the Spanish block at the matching position in the `es` object (around `ui.ts:527`).

- [ ] **Step 1: Add the English keys**

```ts
  // Tool settings panel (shared across all tool widgets)
  'tools.settings.title': 'Settings',
  'tools.settings.show': 'Show settings',
  'tools.settings.hide': 'Hide settings',
  'tools.settings.reset': 'Reset to defaults',
  'tools.settings.resetConfirm': 'Reset?',
  'tools.settings.saved': 'Settings saved on this device',

  'tools.settings.section.preset': 'Preset',
  'tools.settings.section.motion': 'Motion',
  'tools.settings.section.appearance': 'Appearance',
  'tools.settings.section.sound': 'Sound',

  'tools.settings.preset.custom': 'Custom',
  'tools.settings.preset.desensitization': 'Desensitization (faster)',
  'tools.settings.preset.installation': 'Installation (slower)',
  'tools.settings.preset.resourcing': 'Resourcing (gentle)',
  'tools.settings.preset.child': 'Child-friendly',

  'tools.settings.speed': 'Speed (Hz)',
  'tools.settings.passes': 'Passes / set',
  'tools.settings.continuous': 'Continuous',
  'tools.settings.path': 'Movement path',
  'tools.settings.path.horizontal': 'Straight across',
  'tools.settings.path.infinity': 'Figure eight',
  'tools.settings.path.arc': 'Arc',
  'tools.settings.path.diagonal': 'Diagonal',
  'tools.settings.path.wave': 'Wave',
  'tools.settings.easing': 'Pacing',
  'tools.settings.easing.cosine': 'Ease at the edges',
  'tools.settings.easing.linear': 'Constant speed',
  'tools.settings.easing.smootherstep': 'Very smooth',
  'tools.settings.crossfade': 'Fade side to side instead of moving',
  'tools.settings.crossfadeHint': 'Keeps the left-right alternation without sustained motion.',

  'tools.settings.shape': 'Target',
  'tools.settings.shape.orb': 'Circle',
  'tools.settings.shape.ring': 'Ring',
  'tools.settings.shape.glow': 'Soft glow',
  'tools.settings.shape.star': 'Star',
  'tools.settings.shape.butterfly': 'Butterfly',
  'tools.settings.size': 'Size',
  'tools.settings.color': 'Target color',
  'tools.settings.background': 'Background',
  'tools.settings.glow': 'Glow',
  'tools.settings.trail': 'Trail',
  'tools.settings.palette': 'Color theme',
  'tools.settings.palette.default': 'Default',
  'tools.settings.palette.contrast': 'High contrast',
  'tools.settings.palette.calm': 'Low stimulation',
  'tools.settings.palette.warm': 'Warm',
  'tools.settings.palette.cool': 'Cool',
  'tools.settings.contrastWarning': 'This color pairing may be hard to track. A stronger contrast is easier on the eyes.',

  'tools.settings.soundOn': 'Sound',
  'tools.settings.voice': 'Sound',
  'tools.settings.voice.tone': 'Tone',
  'tools.settings.voice.chime': 'Chime',
  'tools.settings.voice.woodblock': 'Woodblock',
  'tools.settings.voice.marimba': 'Marimba',
  'tools.settings.voice.bell': 'Bell',
  'tools.settings.voice.pluck': 'Pluck',
  'tools.settings.pitch': 'Pitch (Hz)',
  'tools.settings.volume': 'Volume',
  'tools.settings.panDepth': 'Left-right separation',
  'tools.settings.panDepthHint': 'Lower values are gentler than full separation.',
  'tools.settings.panMode': 'Sound style',
  'tools.settings.panMode.discrete': 'A beat at each side',
  'tools.settings.panMode.sweep': 'Continuous sweep',
  'tools.settings.endCue': 'Chime at the end of a set',

  'tools.settings.ambient': 'Background sound',
  'tools.settings.ambient.none': 'None',
  'tools.settings.ambient.white': 'White noise',
  'tools.settings.ambient.pink': 'Pink noise',
  'tools.settings.ambient.brown': 'Brown noise',
  'tools.settings.ambient.drone': 'Drone',
  'tools.settings.ambient.binaural': 'Binaural tones',
  'tools.settings.ambientVolume': 'Background level',
  'tools.settings.binauralBase': 'Base pitch (Hz)',
  'tools.settings.binauralBeat': 'Offset (Hz)',
  'tools.settings.headphones': 'Headphones needed for left-right separation.',
```

- [ ] **Step 2: Add the Spanish keys**

Neutral Latin American register, tú forms:

```ts
  // Panel de ajustes de herramientas (compartido)
  'tools.settings.title': 'Ajustes',
  'tools.settings.show': 'Mostrar ajustes',
  'tools.settings.hide': 'Ocultar ajustes',
  'tools.settings.reset': 'Restablecer valores',
  'tools.settings.resetConfirm': '¿Restablecer?',
  'tools.settings.saved': 'Ajustes guardados en este dispositivo',

  'tools.settings.section.preset': 'Preajuste',
  'tools.settings.section.motion': 'Movimiento',
  'tools.settings.section.appearance': 'Apariencia',
  'tools.settings.section.sound': 'Sonido',

  'tools.settings.preset.custom': 'Personalizado',
  'tools.settings.preset.desensitization': 'Desensibilización (más rápido)',
  'tools.settings.preset.installation': 'Instalación (más lento)',
  'tools.settings.preset.resourcing': 'Recursos (suave)',
  'tools.settings.preset.child': 'Para niños',

  'tools.settings.speed': 'Velocidad (Hz)',
  'tools.settings.passes': 'Pases / set',
  'tools.settings.continuous': 'Continuo',
  'tools.settings.path': 'Trayectoria',
  'tools.settings.path.horizontal': 'De lado a lado',
  'tools.settings.path.infinity': 'Figura de ocho',
  'tools.settings.path.arc': 'Arco',
  'tools.settings.path.diagonal': 'Diagonal',
  'tools.settings.path.wave': 'Onda',
  'tools.settings.easing': 'Ritmo',
  'tools.settings.easing.cosine': 'Suave en los extremos',
  'tools.settings.easing.linear': 'Velocidad constante',
  'tools.settings.easing.smootherstep': 'Muy suave',
  'tools.settings.crossfade': 'Alternar con desvanecido en vez de movimiento',
  'tools.settings.crossfadeHint': 'Mantiene la alternancia izquierda-derecha sin movimiento sostenido.',

  'tools.settings.shape': 'Objetivo',
  'tools.settings.shape.orb': 'Círculo',
  'tools.settings.shape.ring': 'Anillo',
  'tools.settings.shape.glow': 'Brillo suave',
  'tools.settings.shape.star': 'Estrella',
  'tools.settings.shape.butterfly': 'Mariposa',
  'tools.settings.size': 'Tamaño',
  'tools.settings.color': 'Color del objetivo',
  'tools.settings.background': 'Fondo',
  'tools.settings.glow': 'Brillo',
  'tools.settings.trail': 'Estela',
  'tools.settings.palette': 'Tema de color',
  'tools.settings.palette.default': 'Predeterminado',
  'tools.settings.palette.contrast': 'Alto contraste',
  'tools.settings.palette.calm': 'Baja estimulación',
  'tools.settings.palette.warm': 'Cálido',
  'tools.settings.palette.cool': 'Frío',
  'tools.settings.contrastWarning': 'Esta combinación de colores puede ser difícil de seguir. Un contraste más fuerte descansa más la vista.',

  'tools.settings.soundOn': 'Sonido',
  'tools.settings.voice': 'Sonido',
  'tools.settings.voice.tone': 'Tono',
  'tools.settings.voice.chime': 'Campanilla',
  'tools.settings.voice.woodblock': 'Caja china',
  'tools.settings.voice.marimba': 'Marimba',
  'tools.settings.voice.bell': 'Campana',
  'tools.settings.voice.pluck': 'Cuerda',
  'tools.settings.pitch': 'Tono (Hz)',
  'tools.settings.volume': 'Volumen',
  'tools.settings.panDepth': 'Separación izquierda-derecha',
  'tools.settings.panDepthHint': 'Los valores bajos son más suaves que la separación total.',
  'tools.settings.panMode': 'Estilo de sonido',
  'tools.settings.panMode.discrete': 'Un pulso en cada lado',
  'tools.settings.panMode.sweep': 'Barrido continuo',
  'tools.settings.endCue': 'Campanilla al terminar el set',

  'tools.settings.ambient': 'Sonido de fondo',
  'tools.settings.ambient.none': 'Ninguno',
  'tools.settings.ambient.white': 'Ruido blanco',
  'tools.settings.ambient.pink': 'Ruido rosa',
  'tools.settings.ambient.brown': 'Ruido marrón',
  'tools.settings.ambient.drone': 'Zumbido',
  'tools.settings.ambient.binaural': 'Tonos binaurales',
  'tools.settings.ambientVolume': 'Nivel de fondo',
  'tools.settings.binauralBase': 'Tono base (Hz)',
  'tools.settings.binauralBeat': 'Diferencia (Hz)',
  'tools.settings.headphones': 'Se necesitan audífonos para la separación izquierda-derecha.',
```

- [ ] **Step 3: Verify both locales have identical key sets**

Run:
```bash
node --input-type=module -e "
const src = await import('./src/i18n/ui.ts').catch(() => null);
" 2>/dev/null || npx tsx -e "
import { ui } from './src/i18n/ui';
const en = Object.keys(ui.en), es = Object.keys(ui.es);
const missing = en.filter(k => !es.includes(k));
const extra = es.filter(k => !en.includes(k));
console.log('missing in es:', missing);
console.log('extra in es:', extra);
if (missing.length || extra.length) process.exit(1);
"
```
Expected: both arrays empty. If `tsx` is unavailable, verify by inspection that each new English key has a Spanish counterpart.

- [ ] **Step 4: Verify the build**

Run: `npm run verify`
Expected: green

- [ ] **Step 5: Commit**

```bash
git add src/i18n/ui.ts
git commit -m "feat(i18n): add tools.settings.* strings for shared settings panel"
```

---

## Task 10: Shared settings panel

**Files:**
- Create: `src/components/tools/ToolSettings.astro`

**Interfaces:**
- Consumes: `TOOL_TIERS`, `PALETTES`, `BLS_PRESETS` (Task 8), `tools.settings.*` (Task 9)
- Produces: markup with stable `data-setting="<name>"` attributes that widgets query. The component renders controls only; **each widget owns its own wiring**, so no global script is attached here.

Sections render conditionally by tier:
- Tier A: preset, motion, appearance, sound
- Tier B: motion, appearance, sound
- Tier C: appearance, sound (cues only — no motion, no BLS voice controls)
- Tier D: appearance (palette), sound (ambient only)

- [ ] **Step 1: Create the component**

```astro
---
import { useTranslations, type Lang, type TranslationKey } from '../../i18n';
import { PALETTES, BLS_PRESETS, TOOL_TIERS, type ToolTier } from '../../data/tool-presets';
import { PATH_NAMES, EASING_NAMES, TARGET_SHAPES } from '../../scripts/visual-engine';
import { VOICE_NAMES, AMBIENT_KINDS } from '../../scripts/audio-engine';

interface Props {
  componentName: string;
  lang?: Lang;
  /** Collapsed by default in fullscreen so it does not compete with the tool. */
  startOpen?: boolean;
}

const { componentName, lang = 'en', startOpen = false } = Astro.props;
const t = useTranslations(lang);
const tier: ToolTier = TOOL_TIERS[componentName] ?? 'C';

/**
 * Only the bilateral tools traverse a path — BreathPacer and Lightstream are
 * step-driven, so a "movement path" or "continuous" control there would be a
 * control that does nothing.
 */
const isBilateral = componentName.startsWith('BLS') || componentName === 'ButterflyHug';

/**
 * The option ids in tool-presets.ts and the engine enums are the suffix of a
 * real key in ui.ts, but TypeScript cannot see that through a template
 * literal — so narrow once here rather than casting at every call site.
 */
const tk = (key: string): string => t(key as TranslationKey);

const showPreset = tier === 'A';
const showMotion = tier === 'A' || tier === 'B';
const showPathControls = showMotion && isBilateral;
const showBlsSound = (tier === 'A' || tier === 'B') && isBilateral;
const showAmbient = true;

const field = 'text-forest-200 text-xs block';
const input = 'w-full accent-bronze-500 mt-1';
const select =
  'w-full mt-1 bg-forest-700 border border-forest-600 text-forest-100 rounded-md text-xs px-2 py-1 ' +
  'focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800';
---

<details
  class="mb-4 border border-forest-600 rounded-lg bg-forest-800/60"
  data-tool-settings
  data-tool-id={componentName}
  data-tier={tier}
  open={startOpen}
>
  <summary
    class="cursor-pointer select-none px-4 py-2 text-forest-100 text-sm font-medium rounded-lg
           focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
  >
    {t('tools.settings.title')}
  </summary>

  <div class="p-4 pt-2 space-y-5">
    {showPreset && (
      <section>
        <h3 class="text-forest-300 text-xs uppercase tracking-wide mb-2">{t('tools.settings.section.preset')}</h3>
        <label class={field}>
          <span class="sr-only">{t('tools.settings.section.preset')}</span>
          <select data-setting="preset" class={select}>
            <option value="custom">{t('tools.settings.preset.custom')}</option>
            {BLS_PRESETS.map((p) => (
              <option value={p.id}>{tk(`tools.settings.preset.${p.id}`)}</option>
            ))}
          </select>
        </label>
      </section>
    )}

    {showPathControls && (
      <section>
        <h3 class="text-forest-300 text-xs uppercase tracking-wide mb-2">{t('tools.settings.section.motion')}</h3>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <label class={field}>
            {t('tools.settings.speed')}
            <input data-setting="speed" type="range" min="0.2" max="2.5" step="0.1" value="1.0" class={input} />
            <span data-value-for="speed" class="block text-center text-forest-100 tabular-nums">1.0</span>
          </label>
          <label class={field}>
            {t('tools.settings.passes')}
            <input data-setting="passes" type="range" min="4" max="60" step="2" value="24" class={input} />
            <span data-value-for="passes" class="block text-center text-forest-100 tabular-nums">24</span>
          </label>
          <label class={field}>
            {t('tools.settings.path')}
            <select data-setting="path" class={select}>
              {PATH_NAMES.map((p) => <option value={p}>{tk(`tools.settings.path.${p}`)}</option>)}
            </select>
          </label>
          <label class={field}>
            {t('tools.settings.easing')}
            <select data-setting="easing" class={select}>
              {EASING_NAMES.map((e) => <option value={e}>{tk(`tools.settings.easing.${e}`)}</option>)}
            </select>
          </label>
          <label class="text-forest-200 text-xs flex items-center gap-2 self-end">
            <input data-setting="continuous" type="checkbox" class="accent-bronze-500" />
            {t('tools.settings.continuous')}
          </label>
          <label class="text-forest-200 text-xs flex items-center gap-2 self-end">
            <input data-setting="crossfade" type="checkbox" class="accent-bronze-500" />
            {t('tools.settings.crossfade')}
          </label>
        </div>
        <p class="text-forest-400 text-xs mt-2">{t('tools.settings.crossfadeHint')}</p>
      </section>
    )}

    <section>
      <h3 class="text-forest-300 text-xs uppercase tracking-wide mb-2">{t('tools.settings.section.appearance')}</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <label class={field}>
          {t('tools.settings.palette')}
          <select data-setting="palette" class={select}>
            {PALETTES.map((p) => <option value={p.id}>{tk(`tools.settings.palette.${p.id}`)}</option>)}
          </select>
        </label>
        {showPathControls && (
          <>
            <label class={field}>
              {t('tools.settings.shape')}
              <select data-setting="shape" class={select}>
                {TARGET_SHAPES.map((s) => <option value={s}>{tk(`tools.settings.shape.${s}`)}</option>)}
              </select>
            </label>
            <label class={field}>
              {t('tools.settings.size')}
              <input data-setting="size" type="range" min="16" max="140" step="4" value="48" class={input} />
              <span data-value-for="size" class="block text-center text-forest-100 tabular-nums">48</span>
            </label>
            <label class={field}>
              {t('tools.settings.glow')}
              <input data-setting="glow" type="range" min="0" max="1" step="0.05" value="0.35" class={input} />
            </label>
            <label class={field}>
              {t('tools.settings.trail')}
              <input data-setting="trail" type="range" min="0" max="1" step="0.05" value="0" class={input} />
            </label>
          </>
        )}
        <label class={field}>
          {t('tools.settings.color')}
          <input data-setting="color" type="color" value="#FFF8E7" class="w-full h-7 mt-1 rounded" />
        </label>
        <label class={field}>
          {t('tools.settings.background')}
          <input data-setting="background" type="color" value="#000000" class="w-full h-7 mt-1 rounded" />
        </label>
      </div>
      <p
        data-contrast-warning
        class="hidden mt-2 p-2 border border-amber-500/50 bg-amber-900/20 rounded-md text-amber-100 text-xs"
        role="status"
      >
        {t('tools.settings.contrastWarning')}
      </p>
    </section>

    <section>
      <h3 class="text-forest-300 text-xs uppercase tracking-wide mb-2">{t('tools.settings.section.sound')}</h3>
      <label class="text-forest-200 text-xs flex items-center gap-2 mb-3">
        <input data-setting="soundOn" type="checkbox" class="accent-bronze-500" />
        {t('tools.settings.soundOn')}
      </label>

      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {showBlsSound && (
          <>
            <label class={field}>
              {t('tools.settings.voice')}
              <select data-setting="voice" class={select}>
                {VOICE_NAMES.map((v) => <option value={v}>{tk(`tools.settings.voice.${v}`)}</option>)}
              </select>
            </label>
            <label class={field}>
              {t('tools.settings.pitch')}
              <input data-setting="pitch" type="range" min="110" max="1200" step="10" value="440" class={input} />
              <span data-value-for="pitch" class="block text-center text-forest-100 tabular-nums">440</span>
            </label>
            <label class={field}>
              {t('tools.settings.panDepth')}
              <input data-setting="panDepth" type="range" min="0" max="1" step="0.05" value="0.85" class={input} />
              <span data-value-for="panDepth" class="block text-center text-forest-100 tabular-nums">85%</span>
            </label>
            <label class={field}>
              {t('tools.settings.panMode')}
              <select data-setting="panMode" class={select}>
                <option value="discrete">{t('tools.settings.panMode.discrete')}</option>
                <option value="sweep">{t('tools.settings.panMode.sweep')}</option>
              </select>
            </label>
          </>
        )}
        <label class={field}>
          {t('tools.settings.volume')}
          <input data-setting="volume" type="range" min="0" max="1" step="0.05" value="0.3" class={input} />
          <span data-value-for="volume" class="block text-center text-forest-100 tabular-nums">30%</span>
        </label>
        {showBlsSound && (
          <label class="text-forest-200 text-xs flex items-center gap-2 self-end">
            <input data-setting="endCue" type="checkbox" checked class="accent-bronze-500" />
            {t('tools.settings.endCue')}
          </label>
        )}
      </div>

      {showAmbient && (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-forest-700">
          <label class={field}>
            {t('tools.settings.ambient')}
            <select data-setting="ambient" class={select}>
              {AMBIENT_KINDS.map((k) => <option value={k}>{tk(`tools.settings.ambient.${k}`)}</option>)}
            </select>
          </label>
          <label class={field}>
            {t('tools.settings.ambientVolume')}
            <input data-setting="ambientVolume" type="range" min="0" max="1" step="0.05" value="0.2" class={input} />
          </label>
          <label class={field} data-binaural-only>
            {t('tools.settings.binauralBase')}
            <input data-setting="binauralBase" type="range" min="80" max="500" step="10" value="200" class={input} />
            <span data-value-for="binauralBase" class="block text-center text-forest-100 tabular-nums">200</span>
          </label>
          <label class={field} data-binaural-only>
            {t('tools.settings.binauralBeat')}
            <input data-setting="binauralBeat" type="range" min="0.5" max="12" step="0.5" value="4" class={input} />
            <span data-value-for="binauralBeat" class="block text-center text-forest-100 tabular-nums">4.0</span>
          </label>
        </div>
      )}

      <p class="text-forest-400 text-xs mt-2">{t('tools.settings.headphones')}</p>
    </section>

    <div class="flex items-center gap-3 pt-2 border-t border-forest-700">
      <button
        type="button"
        data-settings-reset
        class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-xs
               hover:bg-forest-600 transition-colors
               focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
      >
        {t('tools.settings.reset')}
      </button>
      <span class="text-forest-400 text-xs">{t('tools.settings.saved')}</span>
    </div>
  </div>
</details>
```

- [ ] **Step 2: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/ToolSettings.astro
git commit -m "feat(tools): add shared settings panel component

Renders sections by tool tier so a button wizard does not get a motion
panel. Controls only — each widget wires its own behaviour."
```

---

## Task 11: Deduplicate the widget map and route warnings

**Files:**
- Create: `src/lib/tool-widgets.ts`
- Modify: `src/pages/tools/[slug].astro`, `src/pages/tools/[slug]/fullscreen.astro`, `src/pages/es/tools/[slug].astro`, `src/pages/es/tools/[slug]/fullscreen.astro`

**Interfaces:**
- Consumes: nothing
- Produces:
```ts
export const TOOL_WIDGETS: Record<string, unknown>;
export function widgetFor(componentName: string): unknown | null;
```

The map is currently duplicated verbatim in four route files. Every remaining task touches widgets, so this lands before them to avoid four synchronized edits each time.

- [ ] **Step 1: Create the shared map**

Create `src/lib/tool-widgets.ts`:

```ts
/**
 * Single source of truth for `componentName` (from a tool's markdown
 * frontmatter) to its Astro widget. Previously duplicated across all four
 * tool routes — English and Spanish, standard and fullscreen.
 */
import SUDScale from '../components/tools/SUDScale.astro';
import VOCScale from '../components/tools/VOCScale.astro';
import BreathPacer from '../components/tools/BreathPacer.astro';
import Grounding from '../components/tools/Grounding.astro';
import BLSVisual from '../components/tools/BLSVisual.astro';
import BLSAudio from '../components/tools/BLSAudio.astro';
import BLSCombined from '../components/tools/BLSCombined.astro';
import BLSTapping from '../components/tools/BLSTapping.astro';
import Container from '../components/tools/Container.astro';
import SafePlace from '../components/tools/SafePlace.astro';
import Lightstream from '../components/tools/Lightstream.astro';
import ButterflyHug from '../components/tools/ButterflyHug.astro';
import FeelingWheel from '../components/tools/FeelingWheel.astro';
import Sandtray from '../components/tools/Sandtray.astro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_WIDGETS: Record<string, any> = {
  SUDScale, VOCScale, BreathPacer, Grounding,
  BLSVisual, BLSAudio, BLSCombined, BLSTapping,
  Container, SafePlace, Lightstream, ButterflyHug,
  FeelingWheel, Sandtray,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function widgetFor(componentName: string): any | null {
  return TOOL_WIDGETS[componentName] ?? null;
}
```

- [ ] **Step 2: Update all four routes**

In each of the four route files, delete the fourteen widget `import` statements and the local `widgets` map, and replace with:

```ts
import { widgetFor } from '../../lib/tool-widgets';   // adjust depth per file
```

Then replace `const Widget = widgets[tool.data.componentName] ?? null;` with:

```ts
const Widget = widgetFor(tool.data.componentName);
```

Relative import depths: `src/pages/tools/[slug].astro` → `../../lib/tool-widgets`; `src/pages/tools/[slug]/fullscreen.astro` → `../../../lib/tool-widgets`; `src/pages/es/tools/[slug].astro` → `../../../lib/tool-widgets`; `src/pages/es/tools/[slug]/fullscreen.astro` → `../../../../lib/tool-widgets`.

- [ ] **Step 3: Pass warnings into the widget**

Warnings currently exist twice: in each tool's markdown `warnings[]` (rendered by `ToolShell`, which the fullscreen routes never use) and hand-copied into each widget's `t` object. Give widgets the real thing.

In all four routes, change the widget render to pass warnings:

```astro
{Widget ? <Widget lang={lang} warnings={tool.data.warnings} /> : (
```

and in the two fullscreen routes keep the existing `fullscreen={true}` alongside it:

```astro
{Widget ? <Widget lang={lang} fullscreen={true} warnings={tool.data.warnings} /> : (
```

- [ ] **Step 4: Verify the build renders every tool page**

Run: `npm run verify`
Expected: green, 113 pages. If a page reports "Widget not yet implemented", a `componentName` no longer resolves — check the map.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tool-widgets.ts src/pages/tools src/pages/es/tools
git commit -m "refactor(tools): single componentName map, pass warnings to widgets

The map was duplicated across four routes. Widgets now receive the
locale-correct warnings array from frontmatter instead of each widget
hand-copying the strings into its own i18n object."
```

---

## Task 12: BLSVisual — first Tier A adoption

**Files:**
- Modify: `src/components/tools/BLSVisual.astro`

**Interfaces:**
- Consumes: `createBlsClock` (T1), `onReducedMotion` (T2), `loadPrefs`/`savePrefs`/`clearPrefs` (T3), `createVisualRenderer`/`DEFAULT_VISUAL_OPTIONS`/`contrastRatio` (T4/T5), `createAudioEngine` (T6/T7), `ToolSettings.astro` (T10), `PALETTES`/`BLS_PRESETS` (T8)
- Produces: the wiring pattern every later widget follows

This is the reference implementation. Get it right — Tasks 13–17 copy its structure.

- [ ] **Step 1: Replace the markup**

Keep the existing epilepsy warning banner and the props interface, but add `warnings?: string[]`, drop the four bespoke sliders (now in `ToolSettings`), drop the "reduced motion — go elsewhere" notice (crossfade replaces it), and swap the DOM dot for a canvas:

```astro
---
import type { Lang } from '../../i18n';
import ToolSettings from './ToolSettings.astro';

interface Props {
  fullscreen?: boolean;
  lang?: Lang;
  warnings?: string[];
}

const { fullscreen = false, lang = 'en', warnings = [] } = Astro.props;
const containerClass = fullscreen
  ? 'w-full max-w-5xl mx-auto p-4 flex flex-col'
  : 'w-full p-6 bg-forest-800 rounded-lg border border-forest-600';
const trackHeight = fullscreen ? 'h-96' : 'h-64';

const t = {
  en: {
    start: 'Start',
    stop: 'Stop',
    motionNotice: 'This tool uses motion by design. The settings panel can switch it to a side-to-side fade instead.',
    canvasLabel: 'Moving visual target',
  },
  es: {
    start: 'Comenzar',
    stop: 'Detener',
    motionNotice: 'Esta herramienta usa movimiento por diseño. En los ajustes puedes cambiarlo por un desvanecido de lado a lado.',
    canvasLabel: 'Objetivo visual en movimiento',
  },
};
const s = t[lang];
---

<div class:list={[containerClass]} data-bls-visual-widget data-bls-i18n={JSON.stringify({ start: s.start, stop: s.stop })}>
  {warnings.length > 0 && (
    <div class:list={['border border-amber-500/50 bg-amber-900/20 rounded-md text-amber-100 text-xs', fullscreen ? 'mb-2 p-2' : 'mb-4 p-3']}>
      <ul class="list-disc list-inside space-y-1">
        {warnings.map((w) => <li>{w}</li>)}
      </ul>
    </div>
  )}

  <ToolSettings componentName="BLSVisual" lang={lang} startOpen={!fullscreen} />

  <div class:list={['relative w-full rounded-lg overflow-hidden', trackHeight]} data-bls-track>
    <canvas data-bls-canvas class="block w-full h-full" aria-hidden="true"></canvas>
  </div>

  <div class="mt-4 flex items-center gap-3">
    <button
      data-bls-toggle
      class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
    >
      {s.start}
    </button>
    <span data-bls-count class="text-forest-300 text-sm tabular-nums" role="status" aria-live="polite">0 / 24</span>
  </div>
  <p class="text-forest-400 text-xs mt-2">{s.motionNotice}</p>
</div>
```

- [ ] **Step 2: Replace the script**

```astro
<script>
  import { createBlsClock } from '../../scripts/bls-clock';
  import { onReducedMotion } from '../../scripts/motion-pref';
  import { loadPrefs, savePrefs, clearPrefs } from '../../scripts/tool-prefs';
  import { createVisualRenderer, DEFAULT_VISUAL_OPTIONS, contrastRatio } from '../../scripts/visual-engine';
  import { createAudioEngine, DEFAULT_AUDIO_OPTIONS, DEFAULT_AMBIENT_OPTIONS } from '../../scripts/audio-engine';
  import { BLS_PRESETS, PALETTES } from '../../data/tool-presets';

  const TOOL_ID = 'BLSVisual';

  const DEFAULTS = {
    speed: 1.0,
    passes: 24,
    continuous: false,
    crossfade: false,
    preset: 'custom',
    palette: 'default',
    ...DEFAULT_VISUAL_OPTIONS,
    soundOn: false,
    endCue: true,
    ...DEFAULT_AUDIO_OPTIONS,
    ambient: DEFAULT_AMBIENT_OPTIONS.kind,
    ambientVolume: DEFAULT_AMBIENT_OPTIONS.volume,
    binauralBase: DEFAULT_AMBIENT_OPTIONS.binauralBase,
    binauralBeat: DEFAULT_AMBIENT_OPTIONS.binauralBeat,
  };

  document.querySelectorAll('[data-bls-visual-widget]').forEach((root) => {
    const i18n = JSON.parse(root.getAttribute('data-bls-i18n') || '{}');
    const canvas = root.querySelector<HTMLCanvasElement>('[data-bls-canvas]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-bls-toggle]')!;
    const count = root.querySelector<HTMLElement>('[data-bls-count]')!;
    const panel = root.querySelector<HTMLElement>('[data-tool-settings]')!;
    const contrastWarning = panel.querySelector<HTMLElement>('[data-contrast-warning]');

    let prefs = loadPrefs(TOOL_ID, DEFAULTS);
    let systemReducedMotion = false;

    const audio = createAudioEngine();
    const renderer = createVisualRenderer(canvas, {
      path: prefs.path, easing: prefs.easing, shape: prefs.shape,
      size: prefs.size, color: prefs.color, background: prefs.background,
      glow: prefs.glow, trail: prefs.trail,
      crossfade: prefs.crossfade || systemReducedMotion,
    });

    const control = <T extends HTMLElement>(name: string) =>
      panel.querySelector<T>(`[data-setting="${name}"]`);

    /** Push stored prefs into the panel's controls on load. */
    function hydrateControls(): void {
      for (const [key, value] of Object.entries(prefs)) {
        const el = control<HTMLInputElement | HTMLSelectElement>(key);
        if (!el) continue;
        if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(value);
        else el.value = String(value);
        updateReadout(key, value);
      }
      syncBinauralVisibility();
      checkContrast();
    }

    function updateReadout(key: string, value: unknown): void {
      const out = panel.querySelector<HTMLElement>(`[data-value-for="${key}"]`);
      if (!out) return;
      if (key === 'panDepth' || key === 'volume') out.textContent = `${Math.round(Number(value) * 100)}%`;
      else if (key === 'speed' || key === 'binauralBeat') out.textContent = Number(value).toFixed(1);
      else out.textContent = String(value);
    }

    function syncBinauralVisibility(): void {
      const isBinaural = prefs.ambient === 'binaural';
      panel.querySelectorAll<HTMLElement>('[data-binaural-only]').forEach((el) => {
        el.style.display = isBinaural ? '' : 'none';
      });
    }

    function checkContrast(): void {
      if (!contrastWarning) return;
      const ok = contrastRatio(prefs.color, prefs.background) >= 3;
      contrastWarning.classList.toggle('hidden', ok);
    }

    function applyPalette(id: string): void {
      const palette = PALETTES.find((p) => p.id === id);
      if (!palette) return;
      prefs = { ...prefs, background: palette.bg, color: palette.target };
      const bg = control<HTMLInputElement>('background');
      const fg = control<HTMLInputElement>('color');
      if (bg) bg.value = palette.bg;
      if (fg) fg.value = palette.target;
    }

    function applyPreset(id: string): void {
      const preset = BLS_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      prefs = { ...prefs, speed: preset.speed, passes: preset.passes, voice: preset.voice, path: preset.path, panDepth: preset.panDepth };
      (['speed', 'passes', 'voice', 'path', 'panDepth'] as const).forEach((k) => {
        const el = control<HTMLInputElement | HTMLSelectElement>(k);
        if (el) el.value = String(prefs[k]);
        updateReadout(k, prefs[k]);
      });
    }

    function pushToEngines(): void {
      renderer.setOptions({
        path: prefs.path, easing: prefs.easing, shape: prefs.shape,
        size: prefs.size, color: prefs.color, background: prefs.background,
        glow: prefs.glow, trail: prefs.trail,
        crossfade: prefs.crossfade || systemReducedMotion,
      });
      audio.setOptions({
        voice: prefs.voice, pitch: prefs.pitch,
        volume: prefs.soundOn ? prefs.volume : 0,
        panDepth: prefs.panDepth, panMode: prefs.panMode,
      });
      audio.setAmbient({
        kind: prefs.soundOn ? prefs.ambient : 'none',
        volume: prefs.ambientVolume,
        binauralBase: prefs.binauralBase,
        binauralBeat: prefs.binauralBeat,
      });
    }

    // --- clock, scheduling, and the render loop --------------------------

    const clock = createBlsClock({
      getSpeed: () => prefs.speed,
      getTotalBeats: () => (prefs.continuous ? Infinity : prefs.passes),
    });

    let rafId = 0;
    let scheduledThrough = 0;

    /** Audio is authoritative when it exists, so both layers share one timebase. */
    const nowSeconds = () => (prefs.soundOn ? audio.now() : performance.now() / 1000);

    function scheduleAhead(): void {
      if (!prefs.soundOn) return;
      const horizon = nowSeconds() + 0.1;
      let k = Math.max(scheduledThrough, clock.getBeat()) + 1;
      while (clock.beatTimeFor(k) <= horizon) {
        const when = clock.beatTimeFor(k);
        if (!Number.isFinite(when)) break;
        audio.scheduleBeat(k % 2 === 1 ? 'R' : 'L', when);
        scheduledThrough = k;
        k += 1;
      }
    }

    function frame(): void {
      const now = nowSeconds();
      const beats = clock.tick(now);
      if (beats.length) {
        count.textContent = `${clock.getBeat()} / ${prefs.continuous ? '∞' : prefs.passes}`;
      }
      if (prefs.panMode === 'sweep' && prefs.soundOn) {
        const phase = clock.getPhase();
        audio.setPan(-Math.cos(phase * Math.PI * 2));
      }
      scheduleAhead();
      renderer.render(clock.getPhase());

      if (!clock.isRunning()) {
        if (prefs.soundOn && prefs.endCue) audio.playCue('complete');
        stop();
        return;
      }
      rafId = requestAnimationFrame(frame);
    }

    async function start(): Promise<void> {
      if (prefs.soundOn) await audio.ensureStarted();
      pushToEngines();
      scheduledThrough = 0;
      count.textContent = `0 / ${prefs.continuous ? '∞' : prefs.passes}`;
      toggle.textContent = i18n.stop || 'Stop';
      clock.start(nowSeconds());
      if (prefs.soundOn) audio.scheduleBeat('L', nowSeconds() + 0.02);
      rafId = requestAnimationFrame(frame);
    }

    // Stop keeps the current count visible; a fresh Start resets it to 0.
    function stop(): void {
      clock.stop();
      cancelAnimationFrame(rafId);
      toggle.textContent = i18n.start || 'Start';
      audio.suspend();
      renderer.render(0);
    }

    toggle.addEventListener('click', () => (clock.isRunning() ? stop() : void start()));

    // --- settings wiring --------------------------------------------------

    panel.addEventListener('input', (e) => {
      const el = e.target as HTMLInputElement | HTMLSelectElement;
      const name = el.getAttribute('data-setting');
      if (!name) return;

      const value =
        el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked
        : el instanceof HTMLInputElement && el.type === 'range' ? parseFloat(el.value)
        : el.value;

      prefs = { ...prefs, [name]: value };

      if (name === 'palette') applyPalette(String(value));
      if (name === 'preset' && value !== 'custom') applyPreset(String(value));
      // Any manual change to a preset-controlled field means it is no longer that preset.
      if (['speed', 'passes', 'voice', 'path', 'panDepth'].includes(name)) {
        const presetEl = control<HTMLSelectElement>('preset');
        if (presetEl) presetEl.value = 'custom';
        prefs = { ...prefs, preset: 'custom' };
      }
      if (name === 'ambient') syncBinauralVisibility();
      if (name === 'color' || name === 'background' || name === 'palette') checkContrast();

      // Speed changes must rebase the clock or phase jumps, and any audio
      // already queued at the old rate has to be dropped and re-derived.
      if (name === 'speed' && clock.isRunning()) {
        clock.rebase(nowSeconds());
        audio.cancelScheduled();
        scheduledThrough = clock.getBeat();
      }

      updateReadout(name, value);
      pushToEngines();
      savePrefs(TOOL_ID, prefs);
    });

    panel.querySelector('[data-settings-reset]')?.addEventListener('click', () => {
      clearPrefs(TOOL_ID);
      prefs = { ...DEFAULTS };
      hydrateControls();
      pushToEngines();
    });

    onReducedMotion((reduced) => {
      systemReducedMotion = reduced;
      pushToEngines();
      if (!clock.isRunning()) renderer.render(0);
    });

    hydrateControls();
    pushToEngines();
    renderer.render(0);
  });

  // Spacebar toggles the first visual widget on the page, unless a control has focus.
  if (document.querySelector('[data-bls-visual-widget]')) {
    document.addEventListener('keydown', (e) => {
      if (e.key !== ' ') return;
      if (e.target instanceof Element && e.target.closest('button, input, a, select, textarea, summary')) return;
      const toggle = document.querySelector<HTMLButtonElement>('[data-bls-visual-widget] [data-bls-toggle]');
      if (!toggle) return;
      e.preventDefault();
      toggle.click();
    });
  }
</script>
```

- [ ] **Step 3: Verify the build**

Run: `npm run verify`
Expected: green

- [ ] **Step 4: Check it by hand in the browser**

Run: `npm run dev`, open `/tools/bls-visual`, and confirm each of:
- The dot moves left to right and the count increments.
- Changing speed mid-run does not make the dot jump.
- Switching path to "Figure eight" keeps the dot hitting the edges on the beat.
- Enabling sound produces a tone exactly when the dot reaches each edge.
- Trail and glow visibly change the render.
- Setting an OS reduced-motion preference switches to crossfade **without a page reload**.
- Picking a low-contrast color pair shows the amber warning.
- Reloading the page restores every setting.
- "Reset to defaults" returns everything to the original state.

- [ ] **Step 5: Commit**

```bash
git add src/components/tools/BLSVisual.astro
git commit -m "feat(bls-visual): adopt shared audio/visual engine

Canvas rendering with five motion paths, trails, glow, and theming;
audio scheduled on the Web Audio clock rather than fired from rAF; and
crossfade mode so the tool stays usable under reduced motion instead of
redirecting the user elsewhere. Settings persist per device."
```

---

## Task 13: BLSAudio and BLSCombined

**Files:**
- Modify: `src/components/tools/BLSAudio.astro`, `src/components/tools/BLSCombined.astro`

**Interfaces:**
- Consumes: everything Task 12 consumes; follows the identical wiring structure
- Produces: nothing new

`BLSCombined` currently lacks dot size, dot color, continuous mode, and the spacebar shortcut that `BLSVisual` has. Adopting the shared panel closes that gap by construction.

- [ ] **Step 1: Rewrite `BLSAudio.astro`**

Use Task 12's script verbatim with these changes:
- `const TOOL_ID = 'BLSAudio';` and `componentName="BLSAudio"` on `<ToolSettings>`.
- `DEFAULTS.soundOn` is `true` — an audio tool with sound off is broken. This is the single exception to the sound-off-by-default constraint, and it is still gated behind the Start gesture, so nothing autoplays.
- No canvas and no renderer. Delete every `renderer` reference and the `createVisualRenderer` import.
- Keep the existing L/R text indicators (`[data-bls-indicator-l]` / `[data-bls-indicator-r]`), updating them in `frame()` from the beats returned by `clock.tick()`:

```ts
      if (beats.length) {
        const side = beats[beats.length - 1];
        indL.style.opacity = side === 'L' ? '1' : '0.3';
        indR.style.opacity = side === 'R' ? '1' : '0.3';
        count.textContent = `${clock.getBeat()} / ${prefs.continuous ? '∞' : prefs.passes}`;
      }
```

- [ ] **Step 2: Rewrite `BLSCombined.astro`**

Use Task 12's script verbatim with:
- `const TOOL_ID = 'BLSCombined';` and `componentName="BLSCombined"`.
- `DEFAULTS.soundOn` is `true` (same reasoning — audio is the point of the combined tool).
- Keep both the canvas and the audio path exactly as Task 12 has them.
- Add the spacebar handler from Task 12, scoped to `[data-bls-combined-widget]`.

- [ ] **Step 3: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 4: Check both by hand**

`npm run dev`, then `/tools/bls-audio` and `/tools/bls-combined`:
- Audio: tones alternate ears; pan depth at 0 collapses to centre; "Continuous sweep" gives a smoothly panning tone with no clicks.
- Combined: tone and dot-at-edge coincide; changing speed mid-run keeps them coincident.
- Ambient: each of white/pink/brown/drone/binaural is audible and fades in; switching between them never clicks.
- Both fullscreen routes still show the warning banner.

- [ ] **Step 5: Commit**

```bash
git add src/components/tools/BLSAudio.astro src/components/tools/BLSCombined.astro
git commit -m "feat(bls): adopt shared engine in audio and combined tools

Closes BLSCombined's long-standing gap against BLSVisual (size, color,
continuous mode, spacebar) and gives both tools timbre selection,
adjustable pan depth, sweep panning, and the ambient bed."
```

---

## Task 14: Tier B — BLSTapping and ButterflyHug

**Files:**
- Modify: `src/components/tools/BLSTapping.astro`, `src/components/tools/ButterflyHug.astro`
- Delete: `src/scripts/bls-timer.ts`

**Interfaces:**
- Consumes: `createBlsClock`, `onReducedMotion`, `loadPrefs`/`savePrefs`, `createAudioEngine`, `ToolSettings`
- Produces: nothing new

These two are the last consumers of the old `bls-timer.ts`, so it is deleted here.

- [ ] **Step 1: Migrate `BLSTapping.astro`**

- Add `warnings?: string[]` to `Props` and render the banner as in Task 12.
- Add `<ToolSettings componentName="BLSTapping" lang={lang} startOpen={!fullscreen} />`, and delete the bespoke speed and passes sliders.
- Replace `createBlsTimer` with `createBlsClock` plus the rAF loop, `scheduleAhead`, and settings wiring from Task 12, minus the renderer.
- Keep `highlight(side)` for the L/R panels, driven from the beats `clock.tick()` returns.
- Panel highlight colors read from the palette via CSS custom properties on the widget root: set `root.style.setProperty('--tool-accent', palette.accent)` in `applyPalette`, and change the highlight classes to use `bg-[var(--tool-accent)]`.

- [ ] **Step 2: Migrate `ButterflyHug.astro`**

- Same structure. `componentName="ButterflyHug"`, continuous by default (`getTotalBeats: () => Infinity`) — it has no passes control today and should not gain one.
- Replace the hardcoded SVG hex with custom properties so the palette reaches the wings: `fill="var(--tool-wing, #C4A77D)"` at lines 44 and 50, and `fill="var(--tool-body, #8A7049)"` at line 53. Set both in `applyPalette` from `palette.target` and `palette.accent`.
- Replace the one-shot `matchMedia` read at line 85 with `onReducedMotion`, so `flap()` switches between transform and opacity live.
- Add a per-beat tap sound, off by default, using `audio.playCue('tick')` panned by side.

- [ ] **Step 3: Delete the old timer**

```bash
rm src/scripts/bls-timer.ts
```

- [ ] **Step 4: Confirm nothing still imports it**

Run: `grep -rn "bls-timer" src/ || echo "clean"`
Expected: `clean`

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 6: Check by hand**

`/tools/bls-tapping` and `/tools/butterfly-hug`: panels/wings alternate, optional sound follows the side, reduced motion switches to opacity live, palette changes reach the wing fills.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/tools/BLSTapping.astro src/components/tools/ButterflyHug.astro src/scripts/bls-timer.ts
git commit -m "feat(tools): migrate tapping and butterfly hug to shared engine

Removes the last consumers of bls-timer.ts and deletes it. Wing colors
now come from the palette instead of hardcoded SVG hex."
```

---

## Task 15: Tier B — BreathPacer and Lightstream

**Files:**
- Modify: `src/components/tools/BreathPacer.astro`, `src/components/tools/Lightstream.astro`

**Interfaces:**
- Consumes: `onReducedMotion`, `loadPrefs`/`savePrefs`, `createAudioEngine`, `ToolSettings`
- Produces: nothing new

Neither uses the BLS clock — both are step-driven, not phase-driven — so they take the audio, palette, and preferences layers only.

- [ ] **Step 1: BreathPacer**

- Add `<ToolSettings componentName="BreathPacer" lang={lang} />`. The panel already
  suppresses the path, pacing, continuous, and crossfade controls for non-bilateral tools via
  the `isBilateral` check added in Task 10, so BreathPacer gets the appearance and sound
  sections only — it keeps its own pattern and duration buttons.
- Add a per-phase cue in `enterPhase()` (currently `BreathPacer:156`), off by default:

```ts
      if (prefs.soundOn) audio.playCue(p.name === 'Exhale' ? 'advance' : 'tick');
```

- Add a completion chime where `tick()` detects `totalElapsed >= totalSeconds` (`BreathPacer:186`), before calling `stop()`: `if (prefs.soundOn && prefs.endCue) audio.playCue('complete');`
- Replace the one-shot `matchMedia` at line 110 with `onReducedMotion`, re-applying the transition property live rather than only at init.
- Route the circle's `bg-bronze-500/30` and `border-bronze-400` through `var(--tool-accent)`.

- [ ] **Step 2: Lightstream**

- Add `<ToolSettings componentName="Lightstream" lang={lang} />`.
- Replace the Tailwind `motion-reduce:transition-none` at line 103 with `onReducedMotion`, setting `blob.style.transitionDuration` to `'0ms'` when reduced — consistent with every other tool.
- Add a soft cue on each `renderFlow()` step and a completion chime at `showStep('done')`, both off by default.
- The six hardcoded swatch hexes at lines 59-66 stay (they are the tool's meaning, not chrome), but the SVG body outline `#8DB496` at lines 93-97 becomes `var(--tool-accent, #8DB496)`.

- [ ] **Step 3: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 4: Check by hand**

`/tools/breath` and `/tools/lightstream`: phase cues fire when enabled and are silent when not; reduced motion responds live; palette reaches the circle and the body outline.

- [ ] **Step 5: Commit**

```bash
git add src/components/tools/BreathPacer.astro src/components/tools/Lightstream.astro
git commit -m "feat(tools): add sound cues and theming to breath pacer and lightstream

Both now use the shared reduced-motion observer, so the preference
takes effect without a reload."
```

---

## Task 16: Tier C — the six non-motion tools

**Files:**
- Modify: `Grounding.astro`, `Container.astro`, `SafePlace.astro`, `FeelingWheel.astro`, `SUDScale.astro`, `VOCScale.astro`

**Interfaces:**
- Consumes: `loadPrefs`/`savePrefs`, `createAudioEngine`, `ToolSettings`
- Produces: nothing new

These have no motion. They get optional cue sounds and the palette — nothing else.

- [ ] **Step 1: Add the shared panel and audio to each**

For each file, add `<ToolSettings componentName="<Name>" lang={lang} />` after the intro copy, and this script preamble:

```ts
  import { loadPrefs, savePrefs, clearPrefs } from '../../scripts/tool-prefs';
  import { createAudioEngine } from '../../scripts/audio-engine';
  import { PALETTES } from '../../data/tool-presets';

  const TOOL_ID = '<Name>';
  const DEFAULTS = { soundOn: false, volume: 0.3, palette: 'default', ambient: 'none', ambientVolume: 0.2, binauralBase: 200, binauralBeat: 4 };
```

Wire the panel with the same `input` listener and `applyPalette` helper from Task 12 (minus the renderer, clock, preset, and BLS-voice branches).

Cue placement per tool, all gated on `prefs.soundOn` and all requiring `await audio.ensureStarted()` on the first interaction:

| Tool | Cue | Location |
|---|---|---|
| Grounding | `tick` per tap, `advance` on sense-category change, `complete` when finished | `tap()` (`Grounding:116-123`) and the completion branch of `render()` (`Grounding:103-109`) |
| Container | `advance` on each step | inside `showStep()` (`Container:146`) — the single choke point every handler routes through |
| SafePlace | `advance` on each step, `complete` on arrival | `showStep()` (`SafePlace:138-141`), with `complete` on the `data-to-done` handler (`SafePlace:166-174`) |
| FeelingWheel | `advance` when sub-emotions reveal, `tick` on landing on a word | core-button handler (`FeelingWheel:162-179`) and the dynamic secondary handler (`FeelingWheel:170-174`) |
| SUDScale | **none by default** | — |
| VOCScale | **none by default** | — |

- [ ] **Step 2: Honour the SUD/VOC constraint**

For `SUDScale.astro` and `VOCScale.astro`, the panel renders the sound section (ambient is available), but **no per-increment tick is wired to the slider `update()` function**. A noise on every step while someone rates their distress is the wrong instinct. Only the ambient bed and palette apply.

- [ ] **Step 3: Route hardcoded colors through the palette**

`FeelingWheel`'s six emotion hexes (`FeelingWheel:21-51` and the Spanish duplicate at `65-95`) stay — they encode meaning. Change the chrome only: `bg-forest-900` and `border-bronze-500/50` at `FeelingWheel:133-136` become `var(--tool-surface)` and `var(--tool-accent)`.

- [ ] **Step 4: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 5: Check by hand**

Each of the six pages: sound stays silent until explicitly enabled; SUD and VOC produce no tick on slider movement even with sound on; palette changes apply; settings persist.

- [ ] **Step 6: Commit**

```bash
git add src/components/tools/Grounding.astro src/components/tools/Container.astro src/components/tools/SafePlace.astro src/components/tools/FeelingWheel.astro src/components/tools/SUDScale.astro src/components/tools/VOCScale.astro
git commit -m "feat(tools): add optional cue sounds and theming to the step tools

Sound is off by default everywhere. SUDScale and VOCScale deliberately
get no per-increment tick — only the ambient layer and palette."
```

---

## Task 17: Tier D — Sandtray

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

**Interfaces:**
- Consumes: `onReducedMotion`, `loadPrefs`/`savePrefs`, `createAudioEngine`, `ToolSettings`
- Produces: nothing new

Sandtray keeps its own three-region control UI — a persistent bar, a contextual figure toolbar, and a searchable palette. Retrofitting the shared panel over that would be churn. It gains the ambient bed and palette only.

- [ ] **Step 1: Add the ambient layer**

Add `<ToolSettings componentName="Sandtray" lang={lang} />` below the existing controls bar. Tier D renders only the appearance and sound sections, and the sound section shows only volume and ambient (no BLS voice controls, since `showBlsSound` is false for tier D).

- [ ] **Step 2: Expose water and rock colors**

`setSandColor()` exists at `Sandtray:574`, but `uWaterColor` (`0x3b7ea1`) and `uRockColor` (`0x7a7265`) have uniforms ready with no way to change them. Add matching `setWaterColor(hex)` and `setRockColor(hex)` methods and two swatch rows following the existing `data-sand-color` button pattern at `Sandtray:117-121`.

- [ ] **Step 3: Make reduced motion live**

Replace the one-shot read at `Sandtray:288` with `onReducedMotion((reduced) => { this.reducedMotion = reduced; })`, so the water shimmer at `Sandtray:515` freezes and unfreezes without a reload.

- [ ] **Step 4: Lift `confirmable()` into shared code**

`confirmable(btn, label, confirmLabel, action)` at `Sandtray:1092-1109` is a generic arm-then-confirm wrapper, not sandtray-specific. Move it to `src/scripts/confirmable.ts`, export it, and import it back into Sandtray. No behaviour change.

- [ ] **Step 5: Verify**

Run: `npm run verify`
Expected: green

- [ ] **Step 6: Check by hand**

`/tools/sandtray`: ambient sound plays when enabled; water and rock swatches change the terrain; the shimmer freezes when reduced motion is switched on mid-session; Level and Clear still require the two-step confirm.

- [ ] **Step 7: Commit**

```bash
git add src/components/tools/Sandtray.astro src/scripts/confirmable.ts
git commit -m "feat(sandtray): add ambient sound, water/rock colors, live reduced motion

Keeps sandtray's own control layout. Extracts the confirmable() helper
for reuse by other destructive actions."
```

---

## Task 18: Content, docs, and final verification

**Files:**
- Modify: `src/content/tools/bls-audio.md`, `bls-visual.md`, `bls-combined.md` and their `.es.md` counterparts
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: everything
- Produces: the shipped state

- [ ] **Step 1: Update tool descriptions that no longer match**

`bls-visual.md`'s "Parameter defaults" section lists dot size and color as the only appearance controls, and `bls-audio.md` states "Uses hard-panned stereo (full left/full right)" — which is now adjustable and defaults to 85%. Update both, and their `.es.md` counterparts, to describe what the tools actually do.

Do **not** add any binaural entry to the content collection, and do not add evidence copy about it anywhere.

- [ ] **Step 2: Update `CLAUDE.md`**

Under "File Structure", add the new modules. Update the tools line to note the shared engine, and record that preferences persist in localStorage. Add `npm test` to the Commands block.

- [ ] **Step 3: Full verification**

Run: `npm run verify`
Expected: all vitest suites pass, Astro builds 113 pages with no errors.

- [ ] **Step 4: Confirm the safety invariants hold**

Walk each check and confirm before committing:
- Load every tool page fresh. **Nothing produces sound until a control is deliberately enabled and a gesture given.**
- Both fullscreen routes for `bls-visual` and `bls-audio` show their warning banners.
- Toggle OS reduced motion while a tool is running — every animated tool responds without a reload.
- With `localStorage` disabled in browser settings, every tool still loads and runs.
- SUDScale and VOCScale make no sound when the slider moves, even with sound enabled.
- No page has a horizontal scrollbar at 375px width.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools CLAUDE.md
git commit -m "docs: update tool content and project notes for the new engine"
```

---

## Self-Review Notes

**Spec coverage.** Every section of the design maps to a task: audio graph and scheduler → T6; ambient bed → T7; motion paths → T4; canvas renderer, trails, glow, contrast guard, crossfade → T5; clock and drift resolution → T1; preferences and presets → T3, T8; theming → T8 plus per-tool wiring in T12–T17; live reduced motion → T2; structural cleanups → T11 (widget map, warnings prop) and T17 (`confirmable`); i18n → T9; testing → T1, T2, T3, T4, T5; adoption tiers → T12–T17.

**Known sequencing constraint.** T11 must land before T12–T17, because every widget task changes files the four routes render. T1–T10 can proceed in parallel with each other; T12 must complete before T13–T17, since it is the reference implementation those tasks copy.

**Deliberate omission.** Audio timbre and canvas appearance have no unit tests. They are verified by the by-hand checks in each adoption task. Testing that a marimba sounds like a marimba is not something a unit test can do, and asserting on canvas pixel output would lock in incidental rendering details.
