/**
 * Sandtray figure collection — single source of truth.
 *
 * Figures are GLB/GLTF 3D models sourced from the KayKit asset packs by
 * Kay Lousberg (CC0), downloaded into public/sandtray/models/ via
 * scripts/sandtray-fetch-models.sh.
 *
 * Adding a new figure: drop the processed GLB into public/sandtray/models/,
 * add an entry below, run `npm run build` to validate.
 */

export type SandtrayCategory = 'people' | 'animals' | 'plants' | 'earth' | 'shelter';

export interface SandtrayFigure {
  /** Stable id used as data key. Kebab-case. */
  id: string;
  /** Public path to the GLB/GLTF, e.g. '/sandtray/models/Knight.glb'. */
  modelPath: string;
  /** Bilingual short name, used as alt text and aria-label. */
  alt: { en: string; es: string };
  category: SandtrayCategory;
  /** Default scale in Three.js world units. 1.0 is the model's native size. */
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
 * The figure collection. Populated from the KayKit starter set downloaded
 * by scripts/sandtray-fetch-models.sh.
 *
 * Constraints (validated by validateSandtrayFigures below):
 * - All ids unique
 * - Every modelPath points under /sandtray/models/ and ends in .glb or .gltf
 * - defaultScale in [0.2, 5.0]
 * - alt.en and alt.es are non-empty
 */
export const sandtrayFigures: SandtrayFigure[] = [
  {
    id: 'knight',
    modelPath: '/sandtray/models/Knight.glb',
    alt: { en: 'Knight', es: 'Caballero' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'mage',
    modelPath: '/sandtray/models/Mage.glb',
    alt: { en: 'Mage', es: 'Mago' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'rogue',
    modelPath: '/sandtray/models/Rogue.glb',
    alt: { en: 'Rogue', es: 'Pícaro' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'barbarian',
    modelPath: '/sandtray/models/Barbarian.glb',
    alt: { en: 'Warrior', es: 'Guerrero' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'rogue-hooded',
    modelPath: '/sandtray/models/Rogue_Hooded.glb',
    alt: { en: 'Traveler', es: 'Viajero' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-chest',
    modelPath: '/sandtray/models/chest.glb',
    alt: { en: 'Treasure chest', es: 'Cofre' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-doorway',
    modelPath: '/sandtray/models/wall_doorway.glb',
    alt: { en: 'Doorway', es: 'Puerta' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-torch',
    modelPath: '/sandtray/models/torch.gltf.glb',
    alt: { en: 'Torch', es: 'Antorcha' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-barrel',
    modelPath: '/sandtray/models/barrel_large.gltf.glb',
    alt: { en: 'Barrel', es: 'Barril' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
];

/** Dev-time invariant check. Throws if data is malformed. */
export function validateSandtrayFigures(figs: SandtrayFigure[] = sandtrayFigures): void {
  const seen = new Set<string>();
  for (const f of figs) {
    if (seen.has(f.id)) throw new Error(`Duplicate sandtray figure id: ${f.id}`);
    seen.add(f.id);
    if (!f.modelPath.startsWith('/sandtray/models/')) {
      throw new Error(`Figure ${f.id} modelPath must live under /sandtray/models/`);
    }
    if (!f.modelPath.endsWith('.glb') && !f.modelPath.endsWith('.gltf')) {
      throw new Error(`Figure ${f.id} modelPath must be .glb or .gltf`);
    }
    if (f.defaultScale < 0.2 || f.defaultScale > 5.0) {
      throw new Error(`Figure ${f.id} defaultScale ${f.defaultScale} out of range`);
    }
    if (!f.alt.en.trim() || !f.alt.es.trim()) {
      throw new Error(`Figure ${f.id} missing alt text`);
    }
  }
}
