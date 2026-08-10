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
