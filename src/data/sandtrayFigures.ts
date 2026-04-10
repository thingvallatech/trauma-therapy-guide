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
  // Skeleton characters (KayKit Character Pack Skeletons)
  {
    id: 'skeleton-warrior',
    modelPath: '/sandtray/models/Skeleton_Warrior.glb',
    alt: { en: 'Skeleton', es: 'Esqueleto' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'skeleton-mage',
    modelPath: '/sandtray/models/Skeleton_Mage.glb',
    alt: { en: 'Dark mage', es: 'Mago oscuro' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'skeleton-rogue',
    modelPath: '/sandtray/models/Skeleton_Rogue.glb',
    alt: { en: 'Shadow', es: 'Sombra' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'skeleton-minion',
    modelPath: '/sandtray/models/Skeleton_Minion.glb',
    alt: { en: 'Minion', es: 'Esbirro' },
    category: 'people',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  // Additional shelter props (KayKit Dungeon Remastered)
  {
    id: 'shelter-chest-gold',
    modelPath: '/sandtray/models/chest_gold.glb',
    alt: { en: 'Gold chest', es: 'Cofre dorado' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-bed',
    modelPath: '/sandtray/models/bed_decorated.gltf.glb',
    alt: { en: 'Bed', es: 'Cama' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-chair',
    modelPath: '/sandtray/models/chair.gltf.glb',
    alt: { en: 'Chair', es: 'Silla' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'shelter-table',
    modelPath: '/sandtray/models/table_long.gltf.glb',
    alt: { en: 'Table', es: 'Mesa' },
    category: 'shelter',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  // Earth & symbols (KayKit Dungeon Remastered)
  {
    id: 'earth-candle',
    modelPath: '/sandtray/models/candle_lit.gltf.glb',
    alt: { en: 'Candle', es: 'Vela' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-coin',
    modelPath: '/sandtray/models/coin_stack_large.gltf.glb',
    alt: { en: 'Coins', es: 'Monedas' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-key',
    modelPath: '/sandtray/models/key.gltf.glb',
    alt: { en: 'Key', es: 'Llave' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-feast-a',
    modelPath: '/sandtray/models/plate_food_A.gltf.glb',
    alt: { en: 'Feast', es: 'Banquete' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-feast-b',
    modelPath: '/sandtray/models/plate_food_B.gltf.glb',
    alt: { en: 'Food', es: 'Comida' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-bottle',
    modelPath: '/sandtray/models/bottle_A_green.gltf.glb',
    alt: { en: 'Potion', es: 'Poción' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-pillar',
    modelPath: '/sandtray/models/pillar.gltf.glb',
    alt: { en: 'Pillar', es: 'Pilar' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-banner-blue',
    modelPath: '/sandtray/models/banner_blue.gltf.glb',
    alt: { en: 'Blue banner', es: 'Estandarte azul' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-banner-green',
    modelPath: '/sandtray/models/banner_green.gltf.glb',
    alt: { en: 'Green banner', es: 'Estandarte verde' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  {
    id: 'earth-sword',
    modelPath: '/sandtray/models/sword_shield.gltf.glb',
    alt: { en: 'Sword & shield', es: 'Espada y escudo' },
    category: 'earth',
    defaultScale: 1.0,
    source: 'KayKit by Kay Lousberg (CC0)',
  },
  // Quaternius Ultimate Modular Characters (CC0) — everyday people
  { id: 'q-casual-f',   modelPath: '/sandtray/models/quat-Casual_Female.gltf',       alt: { en: 'Girl',      es: 'Chica' },       category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-casual-m',   modelPath: '/sandtray/models/quat-Casual_Male.gltf',         alt: { en: 'Boy',       es: 'Chico' },       category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-casual2-f',  modelPath: '/sandtray/models/quat-Casual2_Female.gltf',      alt: { en: 'Woman',     es: 'Mujer' },       category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-doctor-f',   modelPath: '/sandtray/models/quat-Doctor_Female_Young.gltf',  alt: { en: 'Doctor',    es: 'Doctora' },     category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-doctor-m',   modelPath: '/sandtray/models/quat-Doctor_Male_Young.gltf',    alt: { en: 'Doctor',    es: 'Doctor' },      category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-worker-f',   modelPath: '/sandtray/models/quat-Worker_Female.gltf',       alt: { en: 'Worker',    es: 'Trabajadora' }, category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-worker-m',   modelPath: '/sandtray/models/quat-Worker_Male.gltf',         alt: { en: 'Builder',   es: 'Constructor' }, category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-chef',       modelPath: '/sandtray/models/quat-Chef_Female.gltf',         alt: { en: 'Chef',      es: 'Chef' },        category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-elder-f',    modelPath: '/sandtray/models/quat-OldClassy_Female.gltf',    alt: { en: 'Elder',     es: 'Anciana' },     category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-elder-m',    modelPath: '/sandtray/models/quat-OldClassy_Male.gltf',      alt: { en: 'Elder',     es: 'Anciano' },     category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  // Quaternius — fantasy/adventure characters
  { id: 'q-wizard',     modelPath: '/sandtray/models/quat-Wizard.gltf',              alt: { en: 'Wizard',    es: 'Mago' },        category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-witch',      modelPath: '/sandtray/models/quat-Witch.gltf',               alt: { en: 'Witch',     es: 'Bruja' },       category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-elf',        modelPath: '/sandtray/models/quat-Elf.gltf',                 alt: { en: 'Elf',       es: 'Elfo' },        category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-ninja',      modelPath: '/sandtray/models/quat-Ninja_Male.gltf',          alt: { en: 'Ninja',     es: 'Ninja' },       category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-pirate',     modelPath: '/sandtray/models/quat-Pirate_Male.gltf',         alt: { en: 'Pirate',    es: 'Pirata' },      category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-cowboy',     modelPath: '/sandtray/models/quat-Cowboy_Male.gltf',         alt: { en: 'Cowboy',    es: 'Vaquero' },     category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-viking',     modelPath: '/sandtray/models/quat-Viking_Male.gltf',         alt: { en: 'Viking',    es: 'Vikingo' },     category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-goblin',     modelPath: '/sandtray/models/quat-Goblin_Male.gltf',         alt: { en: 'Goblin',    es: 'Duende' },      category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-zombie',     modelPath: '/sandtray/models/quat-Zombie_Male.gltf',         alt: { en: 'Zombie',    es: 'Zombi' },       category: 'people', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  // Quaternius Ultimate Animated Animals (CC0)
  { id: 'q-dog-husky',  modelPath: '/sandtray/models/quat-Husky.gltf',               alt: { en: 'Dog',       es: 'Perro' },       category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-dog-shiba',  modelPath: '/sandtray/models/quat-ShibaInu.gltf',            alt: { en: 'Shiba Inu', es: 'Shiba Inu' },   category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-dog-pug',    modelPath: '/sandtray/models/quat-Pug.gltf',                 alt: { en: 'Pug',       es: 'Pug' },         category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-fox',        modelPath: '/sandtray/models/quat-Fox.gltf',                 alt: { en: 'Fox',       es: 'Zorro' },       category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-wolf',       modelPath: '/sandtray/models/quat-Wolf.gltf',                alt: { en: 'Wolf',      es: 'Lobo' },        category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-horse',      modelPath: '/sandtray/models/quat-Horse.gltf',               alt: { en: 'Horse',     es: 'Caballo' },     category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-cow',        modelPath: '/sandtray/models/quat-Cow.gltf',                 alt: { en: 'Cow',       es: 'Vaca' },        category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-deer',       modelPath: '/sandtray/models/quat-Deer.gltf',                alt: { en: 'Deer',      es: 'Ciervo' },      category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-stag',       modelPath: '/sandtray/models/quat-Stag.gltf',                alt: { en: 'Stag',      es: 'Ciervo macho' },category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-bull',       modelPath: '/sandtray/models/quat-Bull.gltf',                alt: { en: 'Bull',      es: 'Toro' },        category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-donkey',     modelPath: '/sandtray/models/quat-Donkey.gltf',              alt: { en: 'Donkey',    es: 'Burro' },       category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
  { id: 'q-alpaca',     modelPath: '/sandtray/models/quat-Alpaca.gltf',              alt: { en: 'Alpaca',    es: 'Alpaca' },      category: 'animals', defaultScale: 1.0, source: 'Quaternius (CC0)' },
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
