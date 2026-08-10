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
} from './tool-prefs';
import { contrastRatio } from './visual-engine';
import { PALETTES, BLS_PRESETS } from '../data/tool-presets';

/** Fields a preset owns; changing any of them by hand demotes the preset to "custom". */
const PRESET_FIELDS = ['speed', 'passes', 'voice', 'path', 'panDepth'] as const;

/**
 * Settings a clinician expects to set once for the whole site, not per tool.
 * These live in the shared `global` bucket so picking "high contrast" in one
 * tool applies everywhere; everything else stays scoped to its own tool.
 */
const GLOBAL_FIELDS = ['palette', 'volume'] as const;

const GLOBAL_DEFAULTS: Record<string, unknown> = { palette: 'default', volume: 0.3 };

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

export function createSettingsController<T extends Record<string, unknown>>(
  root: HTMLElement,
  toolId: string,
  defaults: T,
): SettingsController<T> {
  const panel = root.querySelector<HTMLElement>('[data-tool-settings]');
  // Per-tool prefs first, then let the shared bucket win for the global fields.
  let prefs = { ...loadPrefs(toolId, defaults), ...loadGlobalPrefs(GLOBAL_DEFAULTS) } as T;
  const listeners: Array<(prefs: T, key: string) => void> = [];

  function setPrefs(patch: Record<string, unknown>): void {
    prefs = { ...prefs, ...patch } as T;
  }

  function persist(): void {
    savePrefs(toolId, prefs);
    saveGlobalPrefs(Object.fromEntries(GLOBAL_FIELDS.map((k) => [k, prefs[k]] as const)));
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
    const preset = BLS_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setPrefs({
      speed: preset.speed, passes: preset.passes,
      voice: preset.voice, path: preset.path, panDepth: preset.panDepth,
    });
    PRESET_FIELDS.forEach((k) => setControl(k, prefs[k]));
  }

  /**
   * Populates the panel from `prefs`. Deliberately does not `emit()` — it runs
   * during construction, before the widget has built its engines or subscribed,
   * so there would be nobody to hear it and no engine to receive it. Widgets
   * push the hydrated state to their engines themselves, once, after
   * construction.
   */
  function hydrate(): void {
    Object.entries(prefs).forEach(([key, value]) => setControl(key, value));
    if (typeof prefs.palette === 'string') applyPalette(prefs.palette, false);
    syncBinauralVisibility();
    checkContrast();
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

    setPrefs({ [key]: value });

    if (key === 'palette') applyPalette(String(value), true);
    if (key === 'preset' && value !== 'custom') applyPreset(String(value));
    if ((PRESET_FIELDS as readonly string[]).includes(key)) {
      setPrefs({ preset: 'custom' });
      setControl('preset', 'custom');
    }
    if (key === 'ambient') syncBinauralVisibility();
    if (key === 'color' || key === 'background' || key === 'palette') checkContrast();

    readout(key, value);
    persist();
    emit(key);
  };

  const onReset = () => {
    clearPrefs(toolId);
    prefs = { ...defaults, ...GLOBAL_DEFAULTS } as T;
    persist();
    hydrate();
    emit('reset');
  };

  // `<select>` and checkbox elements fire `input` in modern browsers, but
  // registering `change` as well keeps the panel responsive if a control is
  // ever swapped for one that only fires `change`. The handler is idempotent.
  settingsPanel.addEventListener('input', onInput);
  settingsPanel.addEventListener('change', onInput);
  resetButton?.addEventListener('click', onReset);
  hydrate();

  return {
    get: () => prefs,
    onChange: (cb) => { listeners.push(cb); },
    destroy() {
      settingsPanel.removeEventListener('input', onInput);
      settingsPanel.removeEventListener('change', onInput);
      resetButton?.removeEventListener('click', onReset);
      listeners.length = 0;
    },
  };
}
