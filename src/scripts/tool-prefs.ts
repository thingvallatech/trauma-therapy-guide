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

/**
 * A clinician's own saved settings for a specific client, kept separate from
 * `ttg:prefs:*` so that resetting settings and deleting saved presets stay
 * different intents — "Reset to defaults" must never silently destroy this.
 */
export interface UserPreset {
  name: string;
  values: Record<string, unknown>;
}

/** Bounded so a long-lived browser profile cannot grow this without limit. */
export const MAX_USER_PRESETS = 20;

function presetKeyFor(toolId: string): string {
  return `ttg:presets:v${PREFS_VERSION}:${toolId}`;
}

export function loadUserPresets(toolId: string): UserPreset[] {
  const store = storage();
  if (!store) return [];
  let raw: string | null;
  try {
    raw = store.getItem(presetKeyFor(toolId));
  } catch {
    return [];
  }
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is UserPreset =>
        typeof p === 'object' && p !== null &&
        typeof (p as UserPreset).name === 'string' &&
        typeof (p as UserPreset).values === 'object' && (p as UserPreset).values !== null,
    );
  } catch {
    return [];
  }
}

function writeUserPresets(toolId: string, presets: UserPreset[]): UserPreset[] {
  const store = storage();
  if (store) {
    try {
      store.setItem(presetKeyFor(toolId), JSON.stringify(presets));
    } catch {
      // Storage unavailable — the preset simply does not persist.
    }
  }
  return presets;
}

/** Saves under `name`, replacing any existing preset with the same name. */
export function saveUserPreset(
  toolId: string,
  name: string,
  values: Record<string, unknown>,
): UserPreset[] {
  const trimmed = name.trim();
  if (!trimmed) return loadUserPresets(toolId);

  const existing = loadUserPresets(toolId);
  const match = trimmed.toLowerCase();
  const without = existing.filter((p) => p.name.trim().toLowerCase() !== match);
  const next = [...without, { name: trimmed, values: { ...values } }];
  // Oldest first, so slicing from the end keeps the most recently saved.
  return writeUserPresets(toolId, next.slice(-MAX_USER_PRESETS));
}

export function deleteUserPreset(toolId: string, name: string): UserPreset[] {
  const match = name.trim().toLowerCase();
  const next = loadUserPresets(toolId).filter(
    (p) => p.name.trim().toLowerCase() !== match,
  );
  return writeUserPresets(toolId, next);
}
