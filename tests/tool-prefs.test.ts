import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadPrefs, savePrefs, clearPrefs, PREFS_VERSION,
  loadGlobalPrefs, saveGlobalPrefs,
  loadUserPresets, saveUserPreset, deleteUserPreset, MAX_USER_PRESETS,
} from '../src/scripts/tool-prefs';

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

describe('global prefs bucket', () => {
  it('round-trips a global value', () => {
    stubStorage();
    saveGlobalPrefs({ palette: 'high-contrast', volume: 0.5 });
    expect(loadGlobalPrefs({ palette: 'default', volume: 0.3 })).toEqual({
      palette: 'high-contrast', volume: 0.5,
    });
  });

  it('shares one key across all tools', () => {
    const data = stubStorage();
    saveGlobalPrefs({ palette: 'high-contrast' });
    expect([...data.keys()]).toEqual([`ttg:prefs:v${PREFS_VERSION}:global`]);
  });

  // The bug this pins: Sandtray declares `volume` but deliberately not
  // `palette`, so a whole-object write from there erased a site-wide palette
  // choice made in BLSVisual.
  it('merges rather than replacing, so a tool writing a subset keeps other keys', () => {
    stubStorage();
    saveGlobalPrefs({ palette: 'high-contrast', volume: 0.3 });
    saveGlobalPrefs({ volume: 0.8 }); // a tool that has no palette setting
    expect(loadGlobalPrefs({ palette: 'default', volume: 0.3 })).toEqual({
      palette: 'high-contrast', volume: 0.8,
    });
  });

  it('still writes the caller fields when the stored bucket is corrupt', () => {
    const data = stubStorage();
    data.set(`ttg:prefs:v${PREFS_VERSION}:global`, '{ not json');
    saveGlobalPrefs({ volume: 0.8 });
    expect(loadGlobalPrefs({ volume: 0.3 }).volume).toBe(0.8);
  });

  it('does not throw when storage is blocked', () => {
    stubStorage({ setItem: () => { throw new Error('QuotaExceededError'); } });
    expect(() => saveGlobalPrefs({ volume: 0.8 })).not.toThrow();
  });
});

describe('user presets', () => {
  it('starts empty', () => {
    stubStorage();
    expect(loadUserPresets('BLSVisual')).toEqual([]);
  });

  it('round-trips a saved preset', () => {
    stubStorage();
    const result = saveUserPreset('BLSVisual', 'Client A', { speed: 1.4, path: 'infinity' });
    expect(result.persisted).toBe(true);
    const presets = loadUserPresets('BLSVisual');
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Client A');
    expect(presets[0].values.speed).toBe(1.4);
  });

  it('keeps presets isolated per tool', () => {
    stubStorage();
    saveUserPreset('BLSVisual', 'Client A', { speed: 1.4 });
    expect(loadUserPresets('BreathPacer')).toEqual([]);
  });

  it('overwrites a preset saved under an existing name rather than duplicating', () => {
    stubStorage();
    saveUserPreset('BLSVisual', 'Client A', { speed: 1.0 });
    const { presets } = saveUserPreset('BLSVisual', 'Client A', { speed: 1.8 });
    expect(presets).toHaveLength(1);
    expect(presets[0].values.speed).toBe(1.8);
  });

  it('treats names case-insensitively and trims whitespace when matching', () => {
    stubStorage();
    saveUserPreset('BLSVisual', 'Client A', { speed: 1.0 });
    const { presets } = saveUserPreset('BLSVisual', '  client a  ', { speed: 1.8 });
    expect(presets).toHaveLength(1);
  });

  it('rejects an empty or whitespace-only name without saving', () => {
    stubStorage();
    expect(saveUserPreset('BLSVisual', '   ', { speed: 1 }).presets).toEqual([]);
    expect(loadUserPresets('BLSVisual')).toEqual([]);
  });

  it('caps the number of stored presets', () => {
    stubStorage();
    for (let i = 0; i < MAX_USER_PRESETS + 5; i++) {
      saveUserPreset('BLSVisual', `p${i}`, { speed: i });
    }
    expect(loadUserPresets('BLSVisual')).toHaveLength(MAX_USER_PRESETS);
  });

  it('drops the oldest when the cap is reached', () => {
    stubStorage();
    for (let i = 0; i < MAX_USER_PRESETS + 1; i++) {
      saveUserPreset('BLSVisual', `p${i}`, { speed: i });
    }
    const names = loadUserPresets('BLSVisual').map((p) => p.name);
    expect(names).not.toContain('p0');
    expect(names).toContain(`p${MAX_USER_PRESETS}`);
  });

  it('deletes by name', () => {
    stubStorage();
    saveUserPreset('BLSVisual', 'Client A', { speed: 1 });
    saveUserPreset('BLSVisual', 'Client B', { speed: 2 });
    const { presets, persisted } = deleteUserPreset('BLSVisual', 'Client A');
    expect(persisted).toBe(true);
    expect(presets.map((p) => p.name)).toEqual(['Client B']);
  });

  it('survives corrupt stored data', () => {
    const data = stubStorage();
    data.set('ttg:presets:v1:BLSVisual', '{ not json');
    expect(loadUserPresets('BLSVisual')).toEqual([]);
  });

  it('does not throw when storage is blocked', () => {
    stubStorage({ setItem: () => { throw new Error('QuotaExceededError'); } });
    expect(() => saveUserPreset('BLSVisual', 'Client A', { speed: 1 })).not.toThrow();
  });

  // The bug this pins: a blocked write used to return the presets array
  // unconditionally, so callers could not tell a save actually failed and
  // told the clinician "saved" while nothing persisted.
  it('reports persisted: false when the underlying write throws, without throwing itself', () => {
    stubStorage({ setItem: () => { throw new Error('QuotaExceededError'); } });
    let result: ReturnType<typeof saveUserPreset>;
    expect(() => { result = saveUserPreset('BLSVisual', 'Client A', { speed: 1 }); }).not.toThrow();
    expect(result!.persisted).toBe(false);
  });

  it('reports persisted: false for a delete whose write throws', () => {
    stubStorage();
    saveUserPreset('BLSVisual', 'Client A', { speed: 1 });
    // Storage now goes bad (e.g. quota hit mid-session) — reads still work,
    // but the delete's write must fail loudly-to-the-caller, not silently.
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    let result: ReturnType<typeof deleteUserPreset>;
    expect(() => { result = deleteUserPreset('BLSVisual', 'Client A'); }).not.toThrow();
    expect(result!.persisted).toBe(false);
  });

  it('reports persisted: false when storage is absent entirely', () => {
    vi.stubGlobal('localStorage', undefined);
    const result = saveUserPreset('BLSVisual', 'Client A', { speed: 1 });
    expect(result.persisted).toBe(false);
  });
});
