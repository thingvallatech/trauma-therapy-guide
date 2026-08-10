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
