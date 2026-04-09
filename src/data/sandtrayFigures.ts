/**
 * Sandtray figure collection — single source of truth.
 *
 * Figures are vintage public-domain color plates (Audubon, Haeckel, Köhler, Redouté,
 * Millot, Greenaway, Crane, etc.) sourced from Wikimedia Commons / Smithsonian /
 * Biodiversity Heritage Library and processed via scripts/sandtray-figures.py.
 *
 * Adding a new figure: drop the processed PNG into public/sandtray/figures/, add
 * an entry below, run `npm run build` to validate.
 */

export type SandtrayCategory = 'people' | 'animals' | 'plants' | 'earth' | 'shelter';

export interface SandtrayFigure {
  /** Stable id used as data key. Kebab-case. */
  id: string;
  /** Public path to the PNG, e.g. '/sandtray/figures/audubon-bluebird.png'. */
  src: string;
  /** Bilingual short name, used as alt text and aria-label. */
  alt: { en: string; es: string };
  category: SandtrayCategory;
  /** Render scale at canvas resolution. 1.0 ≈ 96px on the long edge. Tune per figure. */
  defaultScale: number;
  /** Attribution string. Recorded for the data file; not displayed in the UI. */
  source: string;
}

export interface SandtrayCategoryDef {
  key: SandtrayCategory;
  label: { en: string; es: string };
}

export const sandtrayCategories: SandtrayCategoryDef[] = [
  { key: 'people',  label: { en: 'People',            es: 'Personas' } },
  { key: 'animals', label: { en: 'Animals',           es: 'Animales' } },
  { key: 'plants',  label: { en: 'Trees & Plants',    es: 'Árboles y plantas' } },
  { key: 'earth',   label: { en: 'Earth & Water',     es: 'Tierra y agua' } },
  { key: 'shelter', label: { en: 'Shelter & Symbols', es: 'Refugio y símbolos' } },
];

/**
 * The figure collection. Populated by scripts/sandtray-figures.py output.
 *
 * Constraints (validated by validateSandtrayFigures below):
 * - All ids unique
 * - Every src points under /sandtray/figures/
 * - defaultScale in [0.4, 2.0]
 * - alt.en and alt.es are non-empty
 */
export const sandtrayFigures: SandtrayFigure[] = [];

/** Dev-time invariant check. Throws if data is malformed. */
export function validateSandtrayFigures(figs: SandtrayFigure[] = sandtrayFigures): void {
  const seen = new Set<string>();
  for (const f of figs) {
    if (seen.has(f.id)) throw new Error(`Duplicate sandtray figure id: ${f.id}`);
    seen.add(f.id);
    if (!f.src.startsWith('/sandtray/figures/')) {
      throw new Error(`Figure ${f.id} src must live under /sandtray/figures/`);
    }
    if (f.defaultScale < 0.4 || f.defaultScale > 2.0) {
      throw new Error(`Figure ${f.id} defaultScale ${f.defaultScale} out of range`);
    }
    if (!f.alt.en.trim() || !f.alt.es.trim()) {
      throw new Error(`Figure ${f.id} missing alt text`);
    }
  }
}
