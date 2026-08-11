/**
 * Binds the shared `ToolSettings.astro` panel to the preferences store.
 *
 * Nine widgets need the same hydrate → readout → palette → preset → persist
 * wiring. Copying it into each would be roughly a thousand lines of
 * duplication, so the controller owns every interaction with the panel markup
 * — reading `[data-setting]` controls, writing `[data-value-for]` readouts,
 * applying palettes and presets, showing the contrast warning, persisting, and
 * resetting — and each widget wires only what is specific to it: its engines
 * and its render loop.
 *
 * It knows nothing about audio or canvas. Widgets subscribe via `onChange`.
 */

import {
  loadPrefs, savePrefs, clearPrefs, loadGlobalPrefs, saveGlobalPrefs,
  loadUserPresets, saveUserPreset, deleteUserPreset, type UserPreset,
} from './tool-prefs';
import { contrastRatio } from './visual-engine';
import { PALETTES, BLS_PRESETS } from '../data/tool-presets';

/**
 * Fields a built-in preset owns; changing one by hand demotes the select to
 * "Custom". The BLS default — the only preset table that exists today, but
 * passed in rather than assumed so a non-BLS tool can bring its own.
 */
const BLS_PRESET_FIELDS = ['speed', 'passes', 'voice', 'path', 'panDepth'] as const;

/**
 * Settings a clinician expects to set once for the whole site, not per tool.
 * These live in the shared `global` bucket so picking "high contrast" in one
 * tool applies everywhere; everything else stays scoped to its own tool.
 */
const GLOBAL_FIELDS = ['palette', 'volume'] as const;

/** Readouts that read as a percentage rather than a raw 0..1 value. */
const PERCENT_READOUTS = ['panDepth', 'volume', 'ambientVolume'];
/** Readouts that need a decimal place to show the step size is meaningful. */
const DECIMAL_READOUTS = ['speed', 'binauralBeat'];

/** Below this WCAG ratio a target is genuinely hard to track against its background. */
const MIN_CONTRAST = 3;

export interface SettingsController<T extends Record<string, unknown>> {
  get(): T;
  onChange(cb: (prefs: T, changedKey: string) => void): void;
  destroy(): void;
}

/**
 * A built-in preset is `{ id }` plus whatever fields it sets. Only `id` is
 * structural here; the fields are read through `presetFields`, which is what
 * lets a tool with a different set of preset-owned settings reuse this.
 */
export interface PresetDefinition {
  id: string;
}

export interface SettingsControllerOptions {
  /** Built-in preset table offered by the panel. Defaults to the BLS presets. */
  presets?: readonly PresetDefinition[];
  /** Fields those presets own. Must line up with `presets`. */
  presetFields?: readonly string[];
}

export function createSettingsController<T extends Record<string, unknown>>(
  root: HTMLElement,
  toolId: string,
  defaults: T,
  options: SettingsControllerOptions = {},
): SettingsController<T> {
  const presets = options.presets ?? BLS_PRESETS;
  const presetFields: readonly string[] = options.presetFields ?? BLS_PRESET_FIELDS;

  /**
   * The shared bucket's defaults come from this widget's own `defaults`, not
   * from a module constant. A hardcoded pair would let one widget push a value
   * it never declared into the bucket every other tool reads.
   */
  const globalFields = GLOBAL_FIELDS.filter((k) => k in defaults);
  const globalDefaults = Object.fromEntries(globalFields.map((k) => [k, defaults[k]] as const));

  const panel = root.querySelector<HTMLElement>('[data-tool-settings]');
  // Per-tool prefs first, then let the shared bucket win for the global fields.
  let prefs = { ...loadPrefs(toolId, defaults), ...loadGlobalPrefs(globalDefaults) } as T;
  const listeners: Array<(prefs: T, key: string) => void> = [];

  function setPrefs(patch: Record<string, unknown>): void {
    prefs = { ...prefs, ...patch } as T;
  }

  function persist(): void {
    savePrefs(toolId, prefs);
    saveGlobalPrefs(Object.fromEntries(globalFields.map((k) => [k, prefs[k]] as const)));
  }

  // A widget may render without the panel (a fullscreen variant that hides it,
  // or a tier that opts out); the controller still serves stored prefs so
  // behaviour stays consistent.
  if (!panel) {
    return { get: () => prefs, onChange: (cb) => { listeners.push(cb); }, destroy: () => {} };
  }

  const settingsPanel = panel;
  const contrastWarning = settingsPanel.querySelector<HTMLElement>('[data-contrast-warning]');
  const resetButton = settingsPanel.querySelector<HTMLElement>('[data-settings-reset]');

  // Saved-preset controls only exist for tier A tools (the panel renders the
  // section conditionally), so every lookup below is optional and every
  // handler bails quietly when its element is absent — same defensive style
  // as the rest of this controller.
  const userPresetGroup = settingsPanel.querySelector<HTMLOptGroupElement>('[data-user-preset-group]');
  const presetNameInput = settingsPanel.querySelector<HTMLInputElement>('[data-preset-name]');
  const presetSaveButton = settingsPanel.querySelector<HTMLElement>('[data-preset-save]');
  const presetDeleteButton = settingsPanel.querySelector<HTMLElement>('[data-preset-delete]');
  const presetStatusEl = settingsPanel.querySelector<HTMLElement>('[data-preset-status]');
  const presetSection = settingsPanel.querySelector<HTMLElement>('[data-preset-section]');
  const presetI18n: Record<string, string> = (() => {
    if (!presetSection) return {};
    try {
      const parsed: unknown = JSON.parse(presetSection.getAttribute('data-preset-i18n') || '{}');
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
    } catch {
      return {};
    }
  })();

  const control = (name: string) =>
    settingsPanel.querySelector<HTMLInputElement | HTMLSelectElement>(`[data-setting="${name}"]`);

  function readout(key: string, value: unknown): void {
    const out = settingsPanel.querySelector<HTMLElement>(`[data-value-for="${key}"]`);
    if (!out) return;
    if (PERCENT_READOUTS.includes(key)) {
      out.textContent = `${Math.round(Number(value) * 100)}%`;
    } else if (DECIMAL_READOUTS.includes(key)) {
      out.textContent = Number(value).toFixed(1);
    } else {
      out.textContent = String(value);
    }
  }

  function setControl(key: string, value: unknown): void {
    const el = control(key);
    if (!el) return;
    if (el instanceof HTMLInputElement && el.type === 'checkbox') el.checked = Boolean(value);
    else el.value = String(value);
    readout(key, value);
  }

  function syncBinauralVisibility(): void {
    const isBinaural = prefs.ambient === 'binaural';
    settingsPanel.querySelectorAll<HTMLElement>('[data-binaural-only]').forEach((el) => {
      el.style.display = isBinaural ? '' : 'none';
    });
  }

  function checkContrast(): void {
    if (!contrastWarning) return;
    const fg = prefs.color as string | undefined;
    const bg = prefs.background as string | undefined;
    if (!fg || !bg) return;
    contrastWarning.classList.toggle('hidden', contrastRatio(fg, bg) >= MIN_CONTRAST);
  }

  /**
   * Palettes drive CSS custom properties, so tools without a canvas are themed
   * too.
   *
   * `adoptColors` is false on hydrate: the palette id and the individual
   * target/background colors are separate stored preferences, so re-applying
   * the palette's colors at load would silently discard a color the user picked
   * by hand after choosing that palette. Only an explicit palette *change*
   * takes the palette's own colors.
   */
  function applyPalette(id: string, adoptColors: boolean): void {
    const palette = PALETTES.find((p) => p.id === id);
    if (!palette) return;
    root.style.setProperty('--tool-bg', palette.bg);
    root.style.setProperty('--tool-surface', palette.surface);
    root.style.setProperty('--tool-accent', palette.accent);
    root.style.setProperty('--tool-target', palette.target);
    root.style.setProperty('--tool-text', palette.text);
    if (!adoptColors) return;
    setPrefs({ background: palette.bg, color: palette.target });
    setControl('background', palette.bg);
    setControl('color', palette.target);
  }

  function applyPreset(id: string): void {
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    // Read through `presetFields` rather than named properties, so the table
    // and the field list are the only things a different tool has to supply.
    const source = preset as unknown as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    presetFields.forEach((k) => {
      if (k in source) patch[k] = source[k];
    });
    setPrefs(patch);
    Object.keys(patch).forEach((k) => setControl(k, prefs[k]));
  }

  /**
   * Whether editing `key` by hand should demote the select to "Custom".
   *
   * A built-in preset only claims the fields it sets, so changing an unrelated
   * one leaves its name honest. A *saved* preset snapshots every setting, so
   * any edit makes the name a lie — and, worse, re-saving under that name would
   * capture something different from what the panel is showing.
   */
  function demotesPreset(key: string): boolean {
    const active = prefs.preset;
    if (typeof active !== 'string' || active === 'custom') return false;
    if (active.startsWith('user:')) return true;
    return presetFields.includes(key);
  }

  /**
   * A clinician's own saved presets live in `localStorage`, not at build
   * time, so the `<optgroup>` for them is populated here rather than by
   * `ToolSettings.astro`. Called on hydrate and after every save/delete so
   * the list, and its visibility, stay in sync with storage.
   */
  function refreshUserPresetOptions(): UserPreset[] {
    const presets = loadUserPresets(toolId);
    if (userPresetGroup) {
      userPresetGroup.innerHTML = '';
      presets.forEach((p) => {
        const opt = document.createElement('option');
        opt.value = `user:${p.name}`;
        opt.textContent = p.name;
        userPresetGroup.appendChild(opt);
      });
      userPresetGroup.hidden = presets.length === 0;
    }
    return presets;
  }

  /**
   * Applies every field of a saved preset that the tool still has a setting
   * for. A preset saved before a settings change may carry a key that no
   * longer exists — silently dropping it (rather than writing it into
   * `prefs` anyway) keeps a stale key from resurrecting itself or reaching
   * an engine that no longer expects it.
   */
  function applyUserPreset(name: string): void {
    const preset = loadUserPresets(toolId).find((p) => p.name === name);
    if (!preset) return;
    const patch: Record<string, unknown> = {};
    Object.entries(preset.values).forEach(([key, value]) => {
      if (!(key in defaults)) return;
      patch[key] = value;
    });
    setPrefs(patch);
    Object.keys(patch).forEach((key) => setControl(key, prefs[key]));
    // A saved preset snapshots every setting, `palette` included, so applying
    // one has to push the palette through to the `--tool-*` custom properties
    // as well — otherwise `persist()` writes the new palette to the shared
    // bucket (every *other* tool adopts it) while the tool in front of the
    // user keeps the previous palette's colours until reload.
    //
    // `adoptColors` is false for the same reason it is on hydrate: the
    // snapshot carries its own `color`/`background`, already applied above.
    if (typeof patch.palette === 'string') applyPalette(patch.palette, false);
    syncBinauralVisibility();
    checkContrast();
  }

  function setPresetStatus(message: string): void {
    if (presetStatusEl) presetStatusEl.textContent = message;
  }

  function updatePresetDeleteVisibility(): void {
    if (!presetDeleteButton) return;
    presetDeleteButton.hidden = !(typeof prefs.preset === 'string' && prefs.preset.startsWith('user:'));
  }

  /**
   * Populates the panel from `prefs`. Deliberately does not `emit()` — it runs
   * during construction, before the widget has built its engines or subscribed,
   * so there would be nobody to hear it and no engine to receive it. Widgets
   * push the hydrated state to their engines themselves, once, after
   * construction.
   */
  function hydrate(): void {
    // Populate the saved-preset options — and validate the stored selection
    // against them — before the loop below writes `prefs.preset` into the
    // `<select>`. Otherwise a `user:` value with no matching `<option>` (the
    // preset was deleted, e.g. from another tab) would silently fail to
    // select anything, leaving the panel showing "Custom" while `prefs`
    // still thinks a deleted preset is active.
    const userPresets = refreshUserPresetOptions();
    if (typeof prefs.preset === 'string' && prefs.preset.startsWith('user:')) {
      const name = prefs.preset.slice('user:'.length);
      if (!userPresets.some((p) => p.name === name)) prefs = { ...prefs, preset: 'custom' } as T;
    }

    Object.entries(prefs).forEach(([key, value]) => setControl(key, value));
    if (typeof prefs.palette === 'string') applyPalette(prefs.palette, false);
    syncBinauralVisibility();
    checkContrast();
    updatePresetDeleteVisibility();
  }

  function emit(key: string): void {
    listeners.forEach((cb) => cb(prefs, key));
  }

  const onInput = (e: Event) => {
    const el = e.target as HTMLInputElement | HTMLSelectElement;
    const key = el.getAttribute('data-setting');
    if (!key) return;

    const value =
      el instanceof HTMLInputElement && el.type === 'checkbox' ? el.checked
      : el instanceof HTMLInputElement && el.type === 'range' ? parseFloat(el.value)
      : el.value;

    // `input` and `change` are both bound (see below), so most controls report
    // twice. Bailing on an unchanged value collapses that to one update, and
    // also skips the redundant storage write when a slider re-reports the
    // value it already had.
    if (prefs[key] === value) return;

    // Any settings change makes a lingering "Preset saved"/"Preset deleted"
    // message stale, including switching the preset select itself.
    setPresetStatus('');
    setPrefs({ [key]: value });

    if (key === 'palette') applyPalette(String(value), true);
    if (key === 'preset') {
      const strValue = String(value);
      if (strValue.startsWith('builtin:')) applyPreset(strValue.slice('builtin:'.length));
      else if (strValue.startsWith('user:')) applyUserPreset(strValue.slice('user:'.length));
      updatePresetDeleteVisibility();
    }
    if (key !== 'preset' && demotesPreset(key)) {
      setPrefs({ preset: 'custom' });
      setControl('preset', 'custom');
      updatePresetDeleteVisibility();
    }
    if (key === 'ambient') syncBinauralVisibility();
    if (key === 'color' || key === 'background' || key === 'palette') checkContrast();

    readout(key, value);
    persist();
    emit(key);
  };

  const onReset = () => {
    clearPrefs(toolId); // per-tool settings only — saved presets live under their own key
    // The global fields are drawn from `defaults` too, so this restores them
    // as well; `persist()` below writes them back to the shared bucket.
    prefs = { ...defaults };
    persist();
    setPresetStatus('');
    hydrate();
    emit('reset');
  };

  const onPresetSave = () => {
    const name = presetNameInput?.value.trim() ?? '';
    if (!name) {
      setPresetStatus(presetI18n.nameNeeded ?? '');
      return;
    }
    const existedBefore = loadUserPresets(toolId).some(
      (p) => p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    // A preset must not record which preset was selected when it was saved —
    // that would be self-referential the moment it is applied.
    const { preset: _preset, ...snapshot } = prefs;
    const { persisted } = saveUserPreset(toolId, name, snapshot);
    refreshUserPresetOptions();
    if (presetNameInput) presetNameInput.value = '';
    // Storage refused the write: the named preset does not exist to select
    // (there is no matching `<option>`, and it will not survive a reload), so
    // the panel stays on whatever preset was active rather than claiming this
    // one is now saved. The settings the clinician configured are untouched
    // either way — nothing to reapply, only the save itself failed.
    if (!persisted) {
      setPresetStatus(presetI18n.notSaved ?? '');
      return;
    }
    setPrefs({ preset: `user:${name}` });
    setControl('preset', prefs.preset);
    updatePresetDeleteVisibility();
    setPresetStatus(existedBefore ? (presetI18n.overwritten ?? '') : (presetI18n.saved ?? ''));
    persist();
  };

  const onPresetDelete = () => {
    if (typeof prefs.preset !== 'string' || !prefs.preset.startsWith('user:')) return;
    const name = prefs.preset.slice('user:'.length);
    const { persisted } = deleteUserPreset(toolId, name);
    refreshUserPresetOptions();
    // If the write failed, the preset is still sitting in storage exactly as
    // it was — switching the panel to "custom" here would tell the clinician
    // it's gone when it isn't.
    if (!persisted) {
      setPresetStatus(presetI18n.notDeleted ?? '');
      return;
    }
    setPrefs({ preset: 'custom' });
    setControl('preset', 'custom');
    updatePresetDeleteVisibility();
    setPresetStatus(presetI18n.deleted ?? '');
    persist();
  };

  // `<select>` and checkbox elements fire `input` in modern browsers, but
  // registering `change` as well keeps the panel responsive if a control is
  // ever swapped for one that only fires `change`. The handler is idempotent.
  settingsPanel.addEventListener('input', onInput);
  settingsPanel.addEventListener('change', onInput);
  resetButton?.addEventListener('click', onReset);
  presetSaveButton?.addEventListener('click', onPresetSave);
  presetDeleteButton?.addEventListener('click', onPresetDelete);
  hydrate();

  return {
    get: () => prefs,
    onChange: (cb) => { listeners.push(cb); },
    destroy() {
      settingsPanel.removeEventListener('input', onInput);
      settingsPanel.removeEventListener('change', onInput);
      resetButton?.removeEventListener('click', onReset);
      presetSaveButton?.removeEventListener('click', onPresetSave);
      presetDeleteButton?.removeEventListener('click', onPresetDelete);
      listeners.length = 0;
    },
  };
}
