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
