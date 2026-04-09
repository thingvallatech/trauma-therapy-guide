# Sandtray "Living Sand" — Design Spec

**Date:** 2026-04-08
**Component:** `src/components/tools/Sandtray.astro`
**Status:** Awaiting user review

---

## Why we're rewriting it

The current sandtray is a flat brown rectangle with eight tabs of emoji buttons. It's functional, but it has nothing to do with the *experience* of sandtray therapy — which is fundamentally **tactile, contemplative, and dimensional**. Specific failures of the current implementation:

1. The "sand" is a CSS gradient. You can't push it, mark it, or leave any record of having been there.
2. Figures are emoji that float above the surface with no shadow, no weight, no settling, no depth cue.
3. Click-to-add-at-center is the wrong interaction. A real sandtray invites you to *choose where*. Drop placement should be intentional.
4. Eight tabs of emoji is a phone keyboard, not a figure collection.
5. There is no "witness moment" — the contemplative pause where you step back and behold what you made.
6. "Conflict" as a peer category is awkward — it's an interpretive bucket masquerading as vocabulary.
7. Cold start: nothing about the visual invites you in.

## What we're building: "Living Sand"

A digital sandtray that **acts like sand**, **frames like a tray**, and **invites contemplation rather than activity**. The tool should feel slow, considered, museum-quiet — coherent with the rest of the site (Lora serif, forest/wood/cream palette).

Three pillars:

### 1. Sand that responds (procedural canvas)
HTML5 `<canvas>` with a height-map (Float32Array, one float per pixel). Drag your finger or cursor across empty sand and you carve a groove. Place a figure and the sand depresses underneath it. Per-pixel shading uses a single virtual light from the upper-left so ridges catch warmth and valleys drop into shadow. No texture files — pure procedural noise + height-based shading.

### 2. A real wooden tray (CSS frame)
Wooden frame around the canvas, built entirely from CSS gradients and box-shadows (no images). Raised inner bevel that casts a shadow onto the sand. The tray is *visually load-bearing* — the user feels like they're looking *into* something rather than at a flat panel.

### 3. Vintage hand-drawn figures, dragged from a palette
~25–30 hand-curated public-domain illustrations (Audubon birds, Haeckel sea creatures, Adolphe Millot natural-history plates, vintage botanical/zoological/woodcut prints) hosted as PNGs in `public/sandtray/figures/`. Figures are dragged from a palette strip directly to where they belong on the sand. They land with a brief settle animation, cast a drop shadow aligned with the light source, and have a subtle random rotation so they feel hand-placed.

---

## Architecture

### File layout

```
public/
  sandtray/
    figures/
      <kebab-case-name>.png    (~25–30 files, ~60–120KB each, transparent BG)
src/
  components/
    tools/
      Sandtray.astro            (rewritten — single file, ~700–900 lines)
  data/
    sandtrayFigures.ts          (figure metadata, single source of truth)
```

### `sandtrayFigures.ts` shape

```ts
export type SandtrayCategory = 'people' | 'animals' | 'plants' | 'earth' | 'shelter';

export interface SandtrayFigure {
  id: string;                   // 'audubon-bluebird'
  src: string;                  // '/sandtray/figures/audubon-bluebird.png'
  alt: { en: string; es: string };
  category: SandtrayCategory;
  defaultScale: number;         // 0.5–1.5; tuned per figure to look right at the same canvas size
  source: string;               // attribution string; not displayed in UI but kept in data file
}

export const figures: SandtrayFigure[] = [ /* ... */ ];

export const categories: { key: SandtrayCategory; label: { en: string; es: string } }[] = [
  { key: 'people',   label: { en: 'People',          es: 'Personas' } },
  { key: 'animals',  label: { en: 'Animals',         es: 'Animales' } },
  { key: 'plants',   label: { en: 'Trees & Plants',  es: 'Árboles y plantas' } },
  { key: 'earth',    label: { en: 'Earth & Water',   es: 'Tierra y agua' } },
  { key: 'shelter',  label: { en: 'Shelter & Symbols', es: 'Refugio y símbolos' } },
];
```

Centralizing figure data here means adding figures later is a one-line edit and the component never needs to change.

### Sandtray.astro structure

Single Astro component, single `<script>` block, vanilla TypeScript. No external dependencies beyond what's already in the project. Sections:

1. **Frontmatter:** props (`fullscreen`, `lang`), i18n strings table, imports figure data.
2. **Markup:** wood frame → canvas → controls row → palette strip with category chips.
3. **Script:** `class Sandtray` instance per widget, with these subsystems:
   - `SandRenderer` — height map, per-pixel shading, dirty-region redraw
   - `FigureLayer` — DOM-based, drag/drop/resize/remove for placed figures
   - `Palette` — drag-from-palette source
   - `Capture` — composite canvas + figures to PNG
   - `Witness` — fade chrome for contemplation mode

Single file is intentional — matches the existing pattern in `src/components/tools/` (Container, SafePlace, Lightstream all live as one file). If the file grows past ~900 lines I'll reconsider, but the goal is to keep this discoverable.

---

## Subsystem detail

### SandRenderer

**Data:** `Float32Array` sized `width * height` representing height in arbitrary units. Default: filled to a base value (call it `0.5`) with low-amplitude procedural noise (~±0.05) so the resting sand has subtle variation rather than perfect flatness.

**Render loop:**
- Render is *demand-driven* via a `dirty` flag, not a free-running RAF. Idle sand doesn't burn CPU.
- When dirty, walks the height map, computes per-pixel normal from height gradient, dot-products with light direction (from upper-left, normalized), and writes shaded sand color into an `ImageData` buffer. One `putImageData` at the end.
- Color: warm tan base `(232, 217, 168)` modulated by the lighting term and a tiny per-pixel noise component for grain. Highlights brighten toward `(248, 235, 195)`, shadows darken toward `(176, 154, 94)`.
- Dirty rectangles: when only a small region changes (carve, figure-settle), only that rect is recomputed. Full redraw on init/clear.

**Performance budget:**
- Canvas size: ~600–900px wide, ~360–500px tall depending on viewport. Worst case ~450K pixels.
- Per-pixel cost: ~10 arithmetic ops + 4 ImageData writes.
- Full redraw is ~5–15ms on a midrange laptop, ~30–60ms on midrange mobile. Acceptable because full redraws are rare (init + clear). Carving touches a small region (~50px radius brush → ~7800 pixels per stroke step) which redraws in <1ms.
- If full-redraw mobile perf is bad, fallback: render at half resolution and let the canvas CSS-scale up. Defer this until measured.

**Carving:**
- Pointer down on empty sand → `carving = true`.
- Pointer move → for each step, lower height in a circular brush (radius ~30px, Gaussian falloff) by `~0.08` units, clamped to a minimum (so you can't carve through to infinity). Mark dirty rect.
- Pointer up → `carving = false`.
- Carving on the *trail* between move events is interpolated so fast moves don't leave dotted lines.

**Figure-induced depression:**
- When a figure is placed, lower the sand in an ellipse roughly matching the figure's footprint by a small constant. This is what makes figures look *placed* rather than floating.
- When a figure is removed, restore its footprint to local average (a soft "smooth back").

### FigureLayer

DOM-based, layered above the canvas. Each placed figure is an `<img>` wrapped in a `<button>` (focusable, accessible) with absolute positioning, CSS transform for rotation/scale, and a `filter: drop-shadow(...)` aligned with the sand light source so the figure casts a shadow that *matches* the sand lighting.

**State per figure:**
```ts
{
  id: string;          // unique instance id
  figureId: string;    // references sandtrayFigures.ts entry
  x: number; y: number;
  rotation: number;    // degrees, ±8 random on placement
  scale: number;       // user-adjustable, default from figure metadata
}
```

**Interactions:**
- **Drag:** pointerdown on figure → drag → pointerup releases. Bring-to-front on grab.
- **Resize:** wheel/pinch over a focused figure scales it ±5% per tick, clamped 0.4–2.0.
- **Remove:** long-press (500ms), or `Backspace`/`Delete` while focused. Long-press is more deliberate than the original double-tap, which felt accident-prone.
- **Keyboard:** Tab to focus figures; arrow keys nudge by 4px; `+`/`-` resize; `Backspace`/`Delete` removes.
- **Settle animation:** on placement, scale 0.8 → 1.0 with `cubic-bezier(0.2, 0.8, 0.2, 1.05)` over 220ms. Skipped under `prefers-reduced-motion`.

**Boundary clamping:** figures are kept inside the tray's inner bevel, accounting for their current scale.

### Palette

Below the canvas. Two rows:

1. **Category chips** — five chips (People, Animals, Trees & Plants, Earth & Water, Shelter & Symbols). Selecting a chip filters the strip below. "All" is the default.
2. **Figure strip** — horizontally scrollable row of ~64×64 swatches showing each figure on a transparent background. Each swatch is a button with the figure's alt text as `aria-label`.

**Interactions:**
- **Drag:** pointerdown on a swatch starts a drag. A semi-transparent ghost element follows the cursor. On pointerup over the canvas, a new figure is created at that position. On pointerup elsewhere, the drag is cancelled.
- **Click fallback:** plain click adds the figure to the canvas with a small random offset from center. This preserves the original tap-to-add behavior for users who can't drag.
- **Keyboard:** Enter/Space on a focused swatch acts as click.

### Witness mode ("Step back")

A button labeled "Step back". When tapped:
- The palette, category chips, instructions, and all controls fade to `opacity: 0` over 600ms (or instantly under `prefers-reduced-motion`).
- The wood frame and canvas remain visible, centered, with the rest of the page background shown beneath them.
- Tap anywhere returns to the active state.
- This is the *contemplative pause* — distinct from making.

Implementation: a class on the widget root; CSS transitions handle the fade.

### Capture

A "Save image" button composites the canvas + DOM figures into a single PNG.

Approach:
1. Create an offscreen canvas at the same size as the sand canvas.
2. Draw the sand canvas into it via `drawImage`.
3. For each placed figure, `drawImage` the figure's PNG with translate/rotate/scale matching its DOM transform.
4. `canvas.toDataURL('image/png')` → trigger download via a synthesized anchor click.

The figure PNGs are same-origin (`/sandtray/figures/`), so no CORS issues. We will preload all figures on first interaction so capture doesn't race image loads.

### Reset / Clear

Two distinct buttons (separate concerns):
- **Level the sand** — resets the height map to its initial noisy-flat state. Removes carves and figure depressions, but leaves figures in place.
- **Clear tray** — removes all figures *and* levels the sand. Returns to start state.

---

## Figure curation plan

~25–30 figures across five categories. All public domain. All sourced from one of:

- **Wikimedia Commons** (direct File: URLs)
- **Smithsonian Open Access** (open.si.edu)
- **Biodiversity Heritage Library** (biodiversitylibrary.org)
- **Rawpixel public domain collection** (rawpixel.com/public-domain)

Stylistic priority: **single-specimen, white or near-white background, hand-drawn or hand-painted, pre-1930 origin** (US public domain cutoff is published before 1930 as of 2025–26).

### Target figure list (initial)

| Category | Figures | Source preference |
|---|---|---|
| **People** (5) | woman, man, child, elder, family group | vintage children's primer engravings, Edwardian woodcuts |
| **Animals** (8) | dog, cat, horse, bird (Audubon), fish, butterfly, rabbit, deer | Audubon, Haeckel, Brehm's *Tierleben*, vintage zoological plates |
| **Trees & Plants** (6) | oak/tree, pine, flower, mushroom, fern, vine | Haeckel, vintage botanical plates, Köhler's *Medizinal-Pflanzen* |
| **Earth & Water** (5) | stone/boulder, mountain, wave, sun, moon | woodcut, Hokusai-style wave, alchemical sun/moon |
| **Shelter & Symbols** (6) | house, door, ship, heart, star, key | woodcut house, vintage map ship, alchemical/symbolic engravings |

**Total: 30 figures.** Adjustable up or down based on what I can actually source cleanly.

### Sourcing process

For each figure:
1. Identify a candidate via Wikimedia Commons / Smithsonian search.
2. Verify license is public domain (not CC-BY or similar requiring attribution in UI — though I'll record attribution in the data file regardless).
3. `curl` the file into `public/sandtray/figures/`.
4. If background isn't already transparent, use ImageMagick to convert near-white to transparent (`convert in.jpg -fuzz 12% -transparent white out.png`) and resize to a sensible width (~400px).
5. Add an entry to `sandtrayFigures.ts` with id, src, alt, category, defaultScale, source.

I will **show you the curated set** before final commit so you can veto any that feel wrong, off-tone, or visually inconsistent.

### What if sourcing comes up short?

If I can't get clean cutouts for some figures, I'll either:
- Substitute a different specimen in the same category, or
- Ship with fewer figures (minimum viable: 4 per category × 5 categories = 20 figures), and add more in a follow-up.

I will not paper over a missing figure with emoji or placeholder art. If we ship fewer, we ship fewer.

---

## Interactions summary (user-facing)

| Action | Gesture |
|---|---|
| Add a figure | Drag from palette to where you want it. Or click for center placement. |
| Move a figure | Drag it on the sand. |
| Resize a figure | Mouse wheel over it, or pinch on touch. |
| Rotate a figure | (deferred — see "out of scope") |
| Remove a figure | Long-press, or focus + Delete. |
| Carve the sand | Drag your finger/cursor on empty sand. |
| Level the sand | Tap "Level the sand". |
| Clear everything | Tap "Clear tray". |
| Step back | Tap "Step back". Tap again to return. |
| Save a picture | Tap "Save image". |

---

## i18n

English and Spanish parity for all UI strings, following the existing pattern in the codebase (JSON-stringified `data-*` attribute, parsed in script). Spanish translations to be drafted alongside English; reviewed during implementation.

Figure `alt` text is bilingual in `sandtrayFigures.ts`.

---

## Accessibility

- Canvas has `role="application"` and `aria-label` describing it as a sandtray.
- Each placed figure is a focusable `<button>` with descriptive `aria-label` from its alt text + position.
- Palette swatches are buttons.
- All controls have visible focus rings (existing `focus:ring-bronze-500` pattern).
- Keyboard support for figure manipulation: Tab to focus, arrow keys to nudge, +/- to resize, Delete to remove.
- `prefers-reduced-motion` disables settle animation and any other movement.
- Color contrast on all controls meets WCAG AA against the wood-frame backdrop.
- Long-press to remove includes a brief visual cue (figure dims) so users know they're holding correctly.

---

## Out of scope (YAGNI)

Explicitly *not* in this rewrite:

- **Mood prompts / starter scenes.** The blank tray is the invitation.
- **Themes / time of day.** Adds modal complexity, no clinical benefit.
- **Sound.** Asset overhead, autoplay UX issues, accessibility complications.
- **Undo timeline / snapshots.** Capture is enough.
- **Multi-layer / depth (sky/below sand).** Conceptually rich but UX-confusing.
- **Rotation gesture for figures.** Random placement rotation is enough; manual rotation needs another control surface (handle, two-finger gesture) and adds complexity disproportionate to value. Defer.
- **Figure metadata reveal.** No tooltips showing the figure's name or source — that breaks the contemplative posture.
- **Saving / loading scenes.** Privacy by default; no persistence.

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Per-pixel canvas perf on midrange mobile | Demand-driven redraw + dirty rects. Half-res fallback if measured worst-case is bad. |
| Figure sourcing eats session time | Timebox curation to a defined slice. Ship with whatever clean cutouts I have, minimum 20 figures. |
| Background removal fails on some images | Pick images that are already isolated. Fall back to ImageMagick fuzz transparency. Discard images that don't cut cleanly rather than ship muddy. |
| Mobile pointer event quirks | Use Pointer Events API consistently, test touch and mouse paths, set `touch-action: none` on the canvas. |
| Bundle size from PNGs | Optimize each PNG (palette quantization, ~60–120KB each). Total budget: ~3MB for figures. Acceptable for a tool page. |
| Single file growing too large | If `Sandtray.astro` exceeds ~900 lines, extract `SandRenderer` into a typed module under `src/lib/sandtray/`. Defer until measured. |

---

## Acceptance criteria

The rewrite ships when:

1. The sand is a procedural canvas with visible carving and lighting. Dragging on empty sand leaves a visible groove that persists.
2. The wood frame visibly contains the sand (raised bevel, inset shadow on inner edge).
3. At least 20 vintage public-domain figures across 5 categories are available in the palette.
4. Figures can be dragged from the palette to a chosen location on the sand.
5. Placed figures cast shadows aligned with the sand lighting.
6. Placed figures depress the sand under them.
7. Figures can be moved, resized, and removed.
8. "Step back" fades the chrome to leave only the tray.
9. "Save image" downloads a PNG of the current scene.
10. "Level the sand" and "Clear tray" work as described.
11. English and Spanish UI strings render correctly via the existing `lang` prop pattern.
12. The widget passes basic keyboard + screen-reader checks.
13. No emoji anywhere in the rewritten component or its content file.
14. The associated `src/content/tools/sandtray.md` is updated to match the new interactions.

---

## Out-of-scope changes that the rewrite *will* touch anyway

- `src/content/tools/sandtray.md` — rewrite the "How to use it" section to match new interactions, and the "Clinical notes" to mention the vintage figure aesthetic and capture feature.
- `src/content/tools/sandtray.es.md` — same, in Spanish.

No other files should be touched unless something downstream is broken by removing the emoji palette.
