# Sandtray "Living Sand" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite `src/components/tools/Sandtray.astro` so it acts like a real sandtray: procedural HTML5 canvas sand with carving and lighting, a wooden tray frame, and a palette of vintage public-domain raster figures dragged onto the surface. Replace all emoji.

**Architecture:** Single Astro component, vanilla TypeScript, no new framework dependencies. Sand is an HTML5 `<canvas>` driven by a `Float32Array` height map with per-pixel directional shading; figures are DOM `<button><img>` elements layered above the canvas (chosen for accessibility). Figure data lives in `src/data/sandtrayFigures.ts`. Asset processing is a one-time Python/Pillow script in `scripts/`.

**Tech Stack:**
- Astro 5 + TypeScript (existing)
- HTML5 Canvas 2D + `ImageData`
- Tailwind 4 + inline CSS gradients (wood frame)
- Python 3.9 + Pillow (one-time asset processing only)
- curl (fetching public-domain source images)

**Verification model:** This project has no test framework and adding one for a single visual widget is overkill. Each task ends with a manual dev-server check and/or `npm run build` to verify nothing broke. Pure math (shading, brush) is verified by careful inline review and visual output.

**Spec:** `docs/superpowers/specs/2026-04-08-sandtray-living-sand-design.md`

---

## File Structure

**Created:**
- `public/sandtray/figures/*.png` (~25–30 transparent PNGs, ~60–120KB each)
- `src/data/sandtrayFigures.ts` (figure metadata, single source of truth)
- `scripts/sandtray-figures.py` (one-time asset fetcher/processor)
- `scripts/sandtray-figures.json` (curated source list — input to the script)

**Rewritten:**
- `src/components/tools/Sandtray.astro` (full rewrite, ~700–900 lines)
- `src/content/tools/sandtray.md` (How to use it section + clinical notes)
- `src/content/tools/sandtray.es.md` (same, Spanish)

**Untouched:** Everything else. The rewrite is contained to the component and its content files.

---

## Task 1: Scaffolding

Create the directories and empty data file. Remove the old Sandtray.astro ground state and replace with a "hello sand" placeholder that proves the page still loads.

**Files:**
- Create: `public/sandtray/figures/.gitkeep`
- Create: `src/data/sandtrayFigures.ts`
- Modify: `src/components/tools/Sandtray.astro` (skeleton replacement)

- [ ] **Step 1: Create the figures directory**

```bash
mkdir -p public/sandtray/figures
touch public/sandtray/figures/.gitkeep
```

- [ ] **Step 2: Create the figure data file**

Write `src/data/sandtrayFigures.ts`:

```ts
export type SandtrayCategory = 'people' | 'animals' | 'plants' | 'earth' | 'shelter';

export interface SandtrayFigure {
  /** Stable id used as data key. Kebab-case. */
  id: string;
  /** Public path to the PNG, e.g. '/sandtray/figures/audubon-bluebird.png'. */
  src: string;
  /** Bilingual short name, used as alt text and aria-label. */
  alt: { en: string; es: string };
  category: SandtrayCategory;
  /** Render scale at canvas resolution. 1.0 = ~96px on the long edge. Tune per figure. */
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
 * The figure collection. Populated by Task 7.
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
```

- [ ] **Step 3: Replace Sandtray.astro with a placeholder skeleton**

Overwrite `src/components/tools/Sandtray.astro` entirely:

```astro
---
import type { Lang } from '../../i18n';
import { sandtrayCategories } from '../../data/sandtrayFigures';

interface Props {
  fullscreen?: boolean;
  lang?: Lang;
}

const { fullscreen = false, lang = 'en' } = Astro.props;

const containerClass = fullscreen
  ? "w-full max-w-5xl mx-auto p-4"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";

const t = {
  en: { placeholder: 'Sandtray (under construction)' },
  es: { placeholder: 'Bandeja de arena (en construcción)' },
};
const s = t[lang];
---

<div class:list={[containerClass]} data-sandtray-widget>
  <p class="text-forest-200">{s.placeholder}</p>
  <p class="text-forest-400 text-xs mt-2">categories: {sandtrayCategories.map(c => c.key).join(', ')}</p>
</div>
```

- [ ] **Step 4: Verify build still works**

```bash
npm run build
```

Expected: build succeeds. No type errors. Dist generated.

- [ ] **Step 5: Commit**

```bash
git add public/sandtray/figures/.gitkeep src/data/sandtrayFigures.ts src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): scaffold figure data + placeholder component"
```

---

## Task 2: SandRenderer — height map and base shading

Build the procedural sand canvas with directional lighting. No carving or figures yet — just *static, beautifully-shaded sand* in a plain rectangle. This proves the rendering pipeline works.

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

- [ ] **Step 1: Replace the placeholder markup with the canvas + script**

Overwrite `src/components/tools/Sandtray.astro` with this version. The renderer is fully self-contained.

```astro
---
import type { Lang } from '../../i18n';
import { sandtrayCategories } from '../../data/sandtrayFigures';

interface Props {
  fullscreen?: boolean;
  lang?: Lang;
}

const { fullscreen = false, lang = 'en' } = Astro.props;

const containerClass = fullscreen
  ? "w-full max-w-5xl mx-auto p-4 flex flex-col"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600 flex flex-col";

const t = {
  en: { canvasAriaLabel: 'Sandtray canvas' },
  es: { canvasAriaLabel: 'Lienzo de bandeja de arena' },
};
const s = t[lang];
---

<div class:list={[containerClass]} data-sandtray-widget>
  <div data-sandtray-frame class="relative w-full" style="
    padding: 18px;
    border-radius: 14px;
    background:
      linear-gradient(180deg, #6b4a25 0%, #8a5f31 14%, #6e4922 50%, #8a5f31 86%, #5b3c1d 100%),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 6px);
    background-blend-mode: multiply;
    box-shadow:
      0 1px 0 rgba(255,235,200,0.25) inset,
      0 -2px 0 rgba(0,0,0,0.35) inset,
      0 18px 30px -12px rgba(0,0,0,0.55);
  ">
    <canvas
      data-sandtray-canvas
      class="block w-full rounded-md touch-none select-none"
      style="
        height: 24rem;
        box-shadow:
          0 0 0 2px #3a2611 inset,
          0 6px 14px rgba(0,0,0,0.35) inset,
          0 -2px 6px rgba(255,235,200,0.18) inset;
      "
      aria-label={s.canvasAriaLabel}
    ></canvas>
  </div>
</div>

<script>
  // ----- SandRenderer -----
  // Procedural sand with height-map shading. Demand-driven redraw.

  type Rect = { x: number; y: number; w: number; h: number };

  class SandRenderer {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    width = 0;
    height = 0;
    heights!: Float32Array;     // length = width * height
    grain!: Float32Array;       // per-pixel static noise, length = width * height
    imageData!: ImageData;
    dirty: Rect | null = null;

    // Light direction (normalized). From upper-left, pointing down-right into the page.
    // Components: lx, ly, lz. Larger lz = flatter lighting.
    readonly lx = -0.55;
    readonly ly = -0.55;
    readonly lz = 0.62;

    // Base sand color and lighting modulation range.
    readonly baseR = 224;
    readonly baseG = 204;
    readonly baseB = 156;
    readonly hiR = 250;
    readonly hiG = 235;
    readonly hiB = 195;
    readonly loR = 158;
    readonly loB = 80;
    readonly loG = 134;

    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('2D canvas context unavailable');
      this.ctx = ctx;
    }

    /** (Re)allocate buffers to match the current canvas pixel size. */
    resize(): void {
      const rect = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = Math.max(1, Math.round(rect.width * dpr));
      this.height = Math.max(1, Math.round(rect.height * dpr));
      this.canvas.width = this.width;
      this.canvas.height = this.height;
      this.heights = new Float32Array(this.width * this.height);
      this.grain = new Float32Array(this.width * this.height);
      this.imageData = this.ctx.createImageData(this.width, this.height);
      this.seed();
      this.markDirtyAll();
      this.render();
    }

    /** Seed the height map with low-frequency noise so resting sand isn't perfectly flat. */
    seed(): void {
      const w = this.width, h = this.height;
      // Cheap value-noise approximation: a few sinusoidal layers + per-pixel grain.
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const n =
            Math.sin(x * 0.013 + y * 0.009) * 0.018 +
            Math.sin(x * 0.027 - y * 0.021) * 0.012 +
            Math.sin(x * 0.005 + y * 0.041) * 0.008;
          this.heights[y * w + x] = 0.5 + n;
          // Per-pixel grain stays static across the lifetime of the canvas.
          this.grain[y * w + x] = (Math.random() - 0.5) * 0.04;
        }
      }
    }

    markDirtyAll(): void {
      this.dirty = { x: 0, y: 0, w: this.width, h: this.height };
    }

    markDirtyRect(x: number, y: number, w: number, h: number): void {
      const rx = Math.max(0, Math.floor(x));
      const ry = Math.max(0, Math.floor(y));
      const rw = Math.min(this.width - rx, Math.ceil(w));
      const rh = Math.min(this.height - ry, Math.ceil(h));
      if (rw <= 0 || rh <= 0) return;
      if (!this.dirty) {
        this.dirty = { x: rx, y: ry, w: rw, h: rh };
        return;
      }
      // Union with existing dirty rect.
      const x1 = Math.min(this.dirty.x, rx);
      const y1 = Math.min(this.dirty.y, ry);
      const x2 = Math.max(this.dirty.x + this.dirty.w, rx + rw);
      const y2 = Math.max(this.dirty.y + this.dirty.h, ry + rh);
      this.dirty = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    /** Shade and write pixels in the dirty rect. */
    render(): void {
      if (!this.dirty) return;
      const w = this.width;
      const data = this.imageData.data;
      const heights = this.heights;
      const grain = this.grain;
      const { x: rx, y: ry, w: rw, h: rh } = this.dirty;
      const x2 = rx + rw;
      const y2 = ry + rh;

      const lx = this.lx, ly = this.ly, lz = this.lz;
      // Height-to-world scale factor for normal computation. Larger = more dramatic shading.
      const slope = 6.0;

      for (let y = ry; y < y2; y++) {
        for (let x = rx; x < x2; x++) {
          const i = y * w + x;

          // Sample neighbors with edge clamp.
          const xl = x > 0 ? x - 1 : x;
          const xr = x < w - 1 ? x + 1 : x;
          const yu = y > 0 ? y - 1 : y;
          const yd = y < this.height - 1 ? y + 1 : y;

          const dzdx = (heights[y * w + xr] - heights[y * w + xl]) * slope;
          const dzdy = (heights[yd * w + x] - heights[yu * w + x]) * slope;

          // Surface normal (unnormalized): (-dzdx, -dzdy, 1)
          const nx = -dzdx;
          const ny = -dzdy;
          const nz = 1;
          const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
          const nnx = nx * invLen;
          const nny = ny * invLen;
          const nnz = nz * invLen;

          // Lambert dot product, clamped.
          let lit = nnx * lx + nny * ly + nnz * lz;
          if (lit < 0) lit = 0;
          if (lit > 1) lit = 1;

          // Gentle ambient floor so shadows aren't black.
          const shade = 0.55 + lit * 0.45;

          // Modulate base color toward highlight when bright, toward lo when dim.
          const g = grain[i];
          let r = this.baseR * shade + (this.hiR - this.baseR) * Math.max(0, shade - 0.85) * 4;
          let gC = this.baseG * shade + (this.hiG - this.baseG) * Math.max(0, shade - 0.85) * 4;
          let b = this.baseB * shade + (this.hiB - this.baseB) * Math.max(0, shade - 0.85) * 4;

          // Pull toward lo color in dark regions.
          const dark = Math.max(0, 0.7 - shade);
          r -= dark * (this.baseR - this.loR) * 1.4;
          gC -= dark * (this.baseG - this.loG) * 1.4;
          b -= dark * (this.baseB - this.loB) * 1.4;

          // Per-pixel grain.
          r += g * 255;
          gC += g * 255;
          b += g * 255;

          const di = i * 4;
          data[di] = r < 0 ? 0 : r > 255 ? 255 : r;
          data[di + 1] = gC < 0 ? 0 : gC > 255 ? 255 : gC;
          data[di + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
          data[di + 3] = 255;
        }
      }

      // putImageData supports a dirty subrect.
      this.ctx.putImageData(this.imageData, 0, 0, rx, ry, rw, rh);
      this.dirty = null;
    }
  }

  // ----- Bootstrap -----
  const widgets = document.querySelectorAll<HTMLElement>('[data-sandtray-widget]');
  widgets.forEach((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>('[data-sandtray-canvas]');
    if (!canvas) return;
    const renderer = new SandRenderer(canvas);
    renderer.resize();
    // Re-render on viewport resize (debounced).
    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => renderer.resize(), 150);
    });
  });
</script>
```

- [ ] **Step 2: Run dev and verify visually**

```bash
npm run dev
```

Open `http://localhost:4321/tools/sandtray` (or the Spanish path). Expected:
- A wooden frame surrounds a sand-colored area.
- The sand has subtle ripples from the seeded noise — it should look slightly uneven, lit from upper-left, *not* a flat color.
- No console errors.

If the sand looks flat, increase `slope` in the renderer. If too contrasty, lower it. If grain looks like static noise, reduce the grain amplitude in `seed()`.

- [ ] **Step 3: Run build to verify type-safety**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): procedural sand canvas with directional shading"
```

---

## Task 3: Carving — sand responds to drag

Add pointer events that lower the height map under the cursor. Dragging on empty sand should leave a visible groove.

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

- [ ] **Step 1: Add a `carve` method to `SandRenderer`**

Inside the `SandRenderer` class, after `render()`, add:

```ts
    /**
     * Carve sand at canvas-pixel coordinates. Brush is a circular Gaussian falloff.
     * @param cx canvas pixel x
     * @param cy canvas pixel y
     * @param radius brush radius in canvas pixels
     * @param strength how much to lower the height per call (0..1)
     */
    carve(cx: number, cy: number, radius: number, strength: number): void {
      const w = this.width, h = this.height;
      const x0 = Math.max(0, Math.floor(cx - radius));
      const y0 = Math.max(0, Math.floor(cy - radius));
      const x1 = Math.min(w - 1, Math.ceil(cx + radius));
      const y1 = Math.min(h - 1, Math.ceil(cy + radius));
      const r2 = radius * radius;
      const sigma2 = (radius * 0.55) * (radius * 0.55);
      const minH = 0.05;

      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const dx = x - cx;
          const dy = y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 > r2) continue;
          const falloff = Math.exp(-d2 / (2 * sigma2));
          const i = y * w + x;
          const next = this.heights[i] - strength * falloff;
          this.heights[i] = next < minH ? minH : next;
        }
      }
      // Dirty a slightly expanded rect so neighboring shading updates.
      this.markDirtyRect(x0 - 1, y0 - 1, (x1 - x0) + 3, (y1 - y0) + 3);
    }

    /** Convert client (event.clientX/Y) to canvas pixel coords. */
    clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
      const rect = this.canvas.getBoundingClientRect();
      const sx = this.width / rect.width;
      const sy = this.height / rect.height;
      return {
        x: (clientX - rect.left) * sx,
        y: (clientY - rect.top) * sy,
      };
    }
```

- [ ] **Step 2: Wire pointer events for carving**

Replace the bootstrap `widgets.forEach((root) => { ... })` block with:

```ts
  const widgets = document.querySelectorAll<HTMLElement>('[data-sandtray-widget]');
  widgets.forEach((root) => {
    const canvas = root.querySelector<HTMLCanvasElement>('[data-sandtray-canvas]');
    if (!canvas) return;
    const renderer = new SandRenderer(canvas);
    renderer.resize();

    let resizeTimer: number | null = null;
    window.addEventListener('resize', () => {
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => renderer.resize(), 150);
    });

    // ----- Carving interaction -----
    let carving = false;
    let lastX = 0;
    let lastY = 0;

    function carveStep(clientX: number, clientY: number): void {
      const { x, y } = renderer.clientToCanvas(clientX, clientY);
      // Brush radius scales with canvas resolution.
      const radius = Math.max(18, renderer.width * 0.05);
      // If we have a previous point, interpolate so fast moves don't dot-stitch.
      if (lastX !== 0 || lastY !== 0) {
        const dx = x - lastX;
        const dy = y - lastY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const steps = Math.max(1, Math.floor(dist / (radius * 0.4)));
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          renderer.carve(lastX + dx * t, lastY + dy * t, radius, 0.06);
        }
      } else {
        renderer.carve(x, y, radius, 0.06);
      }
      lastX = x;
      lastY = y;
      renderer.render();
    }

    canvas.addEventListener('pointerdown', (e) => {
      // Ignore right-click and middle-click.
      if (e.button !== 0) return;
      e.preventDefault();
      carving = true;
      lastX = 0;
      lastY = 0;
      canvas.setPointerCapture(e.pointerId);
      carveStep(e.clientX, e.clientY);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!carving) return;
      carveStep(e.clientX, e.clientY);
    });

    function endCarve(e: PointerEvent): void {
      if (!carving) return;
      carving = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
    }

    canvas.addEventListener('pointerup', endCarve);
    canvas.addEventListener('pointercancel', endCarve);
    canvas.addEventListener('pointerleave', (e) => {
      // Don't end carve on leave — pointer capture keeps events flowing. But if not captured, end.
      if (!canvas.hasPointerCapture(e.pointerId)) endCarve(e);
    });
  });
```

- [ ] **Step 3: Verify carving in dev**

`npm run dev`. Drag across the sand. Expected:
- A visible darker groove appears under the drag path.
- Stops carving when you release.
- No console errors. No flicker. Smooth following.

If the groove is invisible, increase `strength` (currently 0.06) or `slope` in render.
If carving is too aggressive, lower `strength`.

- [ ] **Step 4: Run build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): drag-to-carve sand with brush falloff"
```

---

## Task 4: FigureLayer with placeholder rectangles

Add a DOM-based layer for placed figures, drag/move/remove behavior, and a placeholder palette of colored rectangles. Real images come in a later task. This task verifies the *interaction* model end-to-end.

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

- [ ] **Step 1: Add markup for the figure overlay and a placeholder palette**

Replace the `<div data-sandtray-widget>` markup block (the entire markup section, *not* the script) with:

```astro
<div class:list={[containerClass]} data-sandtray-widget>
  <div data-sandtray-frame class="relative w-full" style="
    padding: 18px;
    border-radius: 14px;
    background:
      linear-gradient(180deg, #6b4a25 0%, #8a5f31 14%, #6e4922 50%, #8a5f31 86%, #5b3c1d 100%),
      repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 6px);
    background-blend-mode: multiply;
    box-shadow:
      0 1px 0 rgba(255,235,200,0.25) inset,
      0 -2px 0 rgba(0,0,0,0.35) inset,
      0 18px 30px -12px rgba(0,0,0,0.55);
  ">
    <div data-sandtray-stage class="relative w-full" style="height: 24rem;">
      <canvas
        data-sandtray-canvas
        class="absolute inset-0 block w-full h-full rounded-md touch-none select-none"
        style="
          box-shadow:
            0 0 0 2px #3a2611 inset,
            0 6px 14px rgba(0,0,0,0.35) inset,
            0 -2px 6px rgba(255,235,200,0.18) inset;
        "
        aria-label={s.canvasAriaLabel}
      ></canvas>
      <div
        data-sandtray-figures
        class="absolute inset-0 pointer-events-none"
        aria-label="Placed figures"
      ></div>
    </div>
  </div>

  <div class="mt-4 flex flex-wrap gap-2" data-sandtray-palette aria-label="Figure palette">
    <button data-placeholder-figure data-color="#9a6b3f" class="w-12 h-12 rounded border border-forest-600" style="background:#9a6b3f"></button>
    <button data-placeholder-figure data-color="#3d6b4a" class="w-12 h-12 rounded border border-forest-600" style="background:#3d6b4a"></button>
    <button data-placeholder-figure data-color="#6b4a85" class="w-12 h-12 rounded border border-forest-600" style="background:#6b4a85"></button>
    <button data-placeholder-figure data-color="#85553d" class="w-12 h-12 rounded border border-forest-600" style="background:#85553d"></button>
  </div>
</div>
```

Also update the `t` table:

```ts
const t = {
  en: {
    canvasAriaLabel: 'Sandtray canvas',
    figuresLabel: 'Placed figures',
    paletteLabel: 'Figure palette',
  },
  es: {
    canvasAriaLabel: 'Lienzo de bandeja de arena',
    figuresLabel: 'Figuras colocadas',
    paletteLabel: 'Paleta de figuras',
  },
};
```

(And use `s.figuresLabel` / `s.paletteLabel` in the markup above instead of the literal strings — replace the `aria-label="Placed figures"` and `aria-label="Figure palette"` with `aria-label={s.figuresLabel}` / `aria-label={s.paletteLabel}`.)

- [ ] **Step 2: Add a `FigureLayer` class to the script**

Inside the `<script>`, after the `SandRenderer` class definition, add:

```ts
  // ----- FigureLayer -----
  // DOM-based, layered above the canvas. Figures are <button> elements.

  interface PlacedFigure {
    el: HTMLButtonElement;
    x: number;       // canvas-pixel center x
    y: number;       // canvas-pixel center y
    rotation: number;
    scale: number;
    naturalW: number; // figure intrinsic width in canvas pixels at scale=1
    naturalH: number; // figure intrinsic height in canvas pixels at scale=1
  }

  class FigureLayer {
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    renderer: SandRenderer;
    figures: PlacedFigure[] = [];

    constructor(container: HTMLElement, canvas: HTMLCanvasElement, renderer: SandRenderer) {
      this.container = container;
      this.canvas = canvas;
      this.renderer = renderer;
    }

    /**
     * Add a figure with a solid background color (placeholder until Task 7).
     * cx/cy are canvas-pixel coordinates.
     */
    addPlaceholder(cx: number, cy: number, color: string): PlacedFigure {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'absolute pointer-events-auto rounded-sm cursor-grab focus:outline-none focus:ring-2 focus:ring-bronze-500';
      el.style.background = color;
      el.style.border = '1px solid rgba(0,0,0,0.3)';
      el.style.willChange = 'transform';
      el.style.touchAction = 'none';
      // Drop shadow that matches the canvas light direction (upper-left source → lower-right shadow).
      el.style.filter = 'drop-shadow(4px 6px 4px rgba(0,0,0,0.45))';

      const naturalW = 64;
      const naturalH = 64;
      const fig: PlacedFigure = {
        el, x: cx, y: cy, rotation: (Math.random() * 16 - 8), scale: 1,
        naturalW, naturalH,
      };
      this.figures.push(fig);
      this.container.appendChild(el);
      this.applyTransform(fig);
      this.attachHandlers(fig);
      this.depressSandUnder(fig);
      // Settle animation
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        el.animate(
          [{ transform: this.transformFor(fig, 0.8) }, { transform: this.transformFor(fig, 1) }],
          { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1.05)', fill: 'none' },
        );
      }
      return fig;
    }

    private transformFor(fig: PlacedFigure, scaleMul = 1): string {
      // Position and size in *display* pixels (the container is the same size as the canvas display).
      // We work in canvas pixels and convert via the canvas display ratio.
      const rect = this.canvas.getBoundingClientRect();
      const sxToDisplay = rect.width / this.renderer.width;
      const dispW = fig.naturalW * fig.scale * sxToDisplay;
      const dispH = fig.naturalH * fig.scale * sxToDisplay;
      const dispX = fig.x * sxToDisplay - dispW / 2;
      const dispY = fig.y * sxToDisplay - dispH / 2;
      // Use top/left for layout and a transform for rotation+settle scale.
      fig.el.style.left = `${dispX}px`;
      fig.el.style.top = `${dispY}px`;
      fig.el.style.width = `${dispW}px`;
      fig.el.style.height = `${dispH}px`;
      return `rotate(${fig.rotation}deg) scale(${scaleMul})`;
    }

    private applyTransform(fig: PlacedFigure): void {
      fig.el.style.transform = this.transformFor(fig);
    }

    /** Lower the sand under the figure's footprint to make it look placed. */
    private depressSandUnder(fig: PlacedFigure): void {
      const rx = (fig.naturalW * fig.scale) / 2;
      const ry = (fig.naturalH * fig.scale) / 2;
      const radius = Math.max(rx, ry) * 0.7;
      this.renderer.carve(fig.x, fig.y, radius, 0.025);
      this.renderer.render();
    }

    private attachHandlers(fig: PlacedFigure): void {
      const el = fig.el;
      let dragging = false;
      let startX = 0, startY = 0;
      let origX = 0, origY = 0;
      let pointerMoved = false;
      let longPressTimer: number | null = null;

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragging = true;
        pointerMoved = false;
        startX = e.clientX;
        startY = e.clientY;
        origX = fig.x;
        origY = fig.y;
        el.setPointerCapture(e.pointerId);
        // Bring to front
        this.container.appendChild(el);
        // Start long-press timer
        if (longPressTimer !== null) window.clearTimeout(longPressTimer);
        longPressTimer = window.setTimeout(() => {
          if (!pointerMoved) this.remove(fig);
        }, 500);
      });

      el.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!pointerMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
          pointerMoved = true;
          if (longPressTimer !== null) {
            window.clearTimeout(longPressTimer);
            longPressTimer = null;
          }
        }
        if (pointerMoved) {
          const rect = this.canvas.getBoundingClientRect();
          const sxToCanvas = this.renderer.width / rect.width;
          fig.x = origX + dx * sxToCanvas;
          fig.y = origY + dy * sxToCanvas;
          this.clamp(fig);
          this.applyTransform(fig);
        }
      });

      const endDrag = (e: PointerEvent) => {
        if (!dragging) return;
        dragging = false;
        try { el.releasePointerCapture(e.pointerId); } catch {}
        if (longPressTimer !== null) {
          window.clearTimeout(longPressTimer);
          longPressTimer = null;
        }
      };
      el.addEventListener('pointerup', endDrag);
      el.addEventListener('pointercancel', endDrag);

      // Wheel to resize when the figure has focus.
      el.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.05 : 0.95;
        fig.scale = Math.max(0.4, Math.min(2.0, fig.scale * delta));
        this.applyTransform(fig);
      }, { passive: false });

      // Keyboard
      el.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 12 : 4;
        if (e.key === 'ArrowLeft')  { fig.x -= step; this.clamp(fig); this.applyTransform(fig); e.preventDefault(); }
        if (e.key === 'ArrowRight') { fig.x += step; this.clamp(fig); this.applyTransform(fig); e.preventDefault(); }
        if (e.key === 'ArrowUp')    { fig.y -= step; this.clamp(fig); this.applyTransform(fig); e.preventDefault(); }
        if (e.key === 'ArrowDown')  { fig.y += step; this.clamp(fig); this.applyTransform(fig); e.preventDefault(); }
        if (e.key === '+' || e.key === '=') { fig.scale = Math.min(2.0, fig.scale * 1.1); this.applyTransform(fig); e.preventDefault(); }
        if (e.key === '-')                  { fig.scale = Math.max(0.4, fig.scale * 0.9); this.applyTransform(fig); e.preventDefault(); }
        if (e.key === 'Backspace' || e.key === 'Delete') { this.remove(fig); e.preventDefault(); }
      });
    }

    private clamp(fig: PlacedFigure): void {
      const halfW = (fig.naturalW * fig.scale) / 2;
      const halfH = (fig.naturalH * fig.scale) / 2;
      fig.x = Math.max(halfW, Math.min(this.renderer.width - halfW, fig.x));
      fig.y = Math.max(halfH, Math.min(this.renderer.height - halfH, fig.y));
    }

    remove(fig: PlacedFigure): void {
      fig.el.remove();
      this.figures = this.figures.filter((f) => f !== fig);
    }

    clear(): void {
      for (const f of this.figures) f.el.remove();
      this.figures = [];
    }

    /** Re-apply transforms (e.g. after canvas resize). */
    relayout(): void {
      for (const f of this.figures) this.applyTransform(f);
    }
  }
```

- [ ] **Step 3: Wire the FigureLayer and the placeholder palette**

Inside the `widgets.forEach` block, after the carving wiring, add:

```ts
    // ----- Figure layer -----
    const figContainer = root.querySelector<HTMLElement>('[data-sandtray-figures]');
    if (!figContainer) return;
    const figureLayer = new FigureLayer(figContainer, canvas, renderer);

    // Re-layout figures on resize
    window.addEventListener('resize', () => {
      window.setTimeout(() => figureLayer.relayout(), 200);
    });

    // ----- Placeholder palette: drag from a color swatch to the canvas -----
    const placeholderButtons = root.querySelectorAll<HTMLButtonElement>('[data-placeholder-figure]');
    placeholderButtons.forEach((btn) => {
      const color = btn.getAttribute('data-color') || '#888';

      // Click fallback: add at center
      btn.addEventListener('click', (e) => {
        // If this was the end of a drag, ignore.
        if ((btn as any).__draggedJustNow) {
          (btn as any).__draggedJustNow = false;
          return;
        }
        e.preventDefault();
        const cx = renderer.width / 2 + (Math.random() - 0.5) * 80;
        const cy = renderer.height / 2 + (Math.random() - 0.5) * 60;
        figureLayer.addPlaceholder(cx, cy, color);
      });

      // Drag from palette to canvas
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const ghost = document.createElement('div');
        ghost.style.position = 'fixed';
        ghost.style.left = '0';
        ghost.style.top = '0';
        ghost.style.width = '48px';
        ghost.style.height = '48px';
        ghost.style.background = color;
        ghost.style.border = '1px solid rgba(0,0,0,0.3)';
        ghost.style.borderRadius = '4px';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.8';
        ghost.style.transform = `translate(${e.clientX - 24}px, ${e.clientY - 24}px)`;
        ghost.style.zIndex = '9999';
        document.body.appendChild(ghost);

        let moved = false;

        const onMove = (ev: PointerEvent) => {
          moved = true;
          ghost.style.transform = `translate(${ev.clientX - 24}px, ${ev.clientY - 24}px)`;
        };
        const onUp = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          ghost.remove();
          if (!moved) return; // Let the click handler run.
          (btn as any).__draggedJustNow = true;
          // Was the release over the canvas?
          const cRect = canvas.getBoundingClientRect();
          if (
            ev.clientX >= cRect.left && ev.clientX <= cRect.right &&
            ev.clientY >= cRect.top && ev.clientY <= cRect.bottom
          ) {
            const { x, y } = renderer.clientToCanvas(ev.clientX, ev.clientY);
            figureLayer.addPlaceholder(x, y, color);
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
    });
```

- [ ] **Step 4: Verify in dev**

`npm run dev` and visit the page. Expected:
- Four colored swatches below the tray.
- Click a swatch → a colored rectangle appears near the center of the tray, slightly rotated, with a drop shadow, sitting in a small depression in the sand.
- Drag a swatch to a specific spot → rectangle appears there.
- Drag a placed rectangle around → it moves with the cursor and clamps inside the tray.
- Long-press (~500ms) on a rectangle without moving → rectangle disappears.
- Tab to focus a rectangle, arrow keys nudge, +/- resizes, Delete removes.
- Sand grooves persist when figures are placed on top.

- [ ] **Step 5: Run build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): figure layer with drag/move/resize/remove + placeholder palette"
```

---

## Task 5: Witness mode, capture, and reset controls

Add the three "second voice" features. These are small additions to the existing component.

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

- [ ] **Step 1: Add the controls row to the markup**

Just before the closing `</div>` of the outermost `data-sandtray-widget` div, add:

```astro
  <div class="mt-3 flex flex-wrap gap-2 items-center">
    <button
      data-sandtray-witness
      class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
    >
      {s.stepBack}
    </button>
    <button
      data-sandtray-capture
      class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
    >
      {s.saveImage}
    </button>
    <button
      data-sandtray-level
      class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
    >
      {s.levelSand}
    </button>
    <button
      data-sandtray-clear
      class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors focus:outline-none focus:ring-2 focus:ring-bronze-500 focus:ring-offset-2 focus:ring-offset-forest-800"
    >
      {s.clearTray}
    </button>
  </div>
```

Add a `data-sandtray-chrome` attribute to the container div for the palette + controls so witness mode can fade them — wrap the palette and controls together:

```astro
  <div data-sandtray-chrome class="contents">
    <!-- existing palette div -->
    <!-- existing controls div -->
  </div>
```

(Or apply the chrome class to *both* the palette and the controls separately and toggle each. Pick whichever is cleaner. Below assumes we add `data-sandtray-chrome` to both elements individually.)

- [ ] **Step 2: Extend the i18n strings**

```ts
const t = {
  en: {
    canvasAriaLabel: 'Sandtray canvas',
    figuresLabel: 'Placed figures',
    paletteLabel: 'Figure palette',
    stepBack: 'Step back',
    returnToTray: 'Return to tray',
    saveImage: 'Save image',
    levelSand: 'Level the sand',
    clearTray: 'Clear tray',
  },
  es: {
    canvasAriaLabel: 'Lienzo de bandeja de arena',
    figuresLabel: 'Figuras colocadas',
    paletteLabel: 'Paleta de figuras',
    stepBack: 'Da un paso atrás',
    returnToTray: 'Volver a la bandeja',
    saveImage: 'Guardar imagen',
    levelSand: 'Aplanar la arena',
    clearTray: 'Limpiar bandeja',
  },
};
```

Add the i18n strings to the data attribute on the widget root:

```astro
<div class:list={[containerClass]} data-sandtray-widget data-sandtray-i18n={JSON.stringify({
  stepBack: s.stepBack,
  returnToTray: s.returnToTray,
})}>
```

- [ ] **Step 3: Wire witness mode**

Inside `widgets.forEach`, after the figure layer wiring, add:

```ts
    // ----- Witness mode -----
    const i18n = JSON.parse(root.getAttribute('data-sandtray-i18n') || '{}');
    const chromeEls = root.querySelectorAll<HTMLElement>('[data-sandtray-chrome]');
    const witnessBtn = root.querySelector<HTMLButtonElement>('[data-sandtray-witness]');
    let witnessing = false;

    function setWitness(on: boolean): void {
      witnessing = on;
      chromeEls.forEach((el) => {
        el.style.transition = 'opacity 600ms ease';
        el.style.opacity = on ? '0' : '1';
        el.style.pointerEvents = on ? 'none' : '';
      });
      if (witnessBtn) witnessBtn.textContent = on ? i18n.returnToTray : i18n.stepBack;
    }

    witnessBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      setWitness(!witnessing);
    });
    // Tap anywhere outside the canvas to exit witness mode.
    document.addEventListener('click', (e) => {
      if (!witnessing) return;
      const target = e.target as HTMLElement;
      if (target === witnessBtn) return;
      if (canvas.contains(target)) return;
      setWitness(false);
    });
```

Mark the controls row and the palette with `data-sandtray-chrome`:

```astro
<div data-sandtray-chrome class="mt-4 flex flex-wrap gap-2" data-sandtray-palette aria-label={s.paletteLabel}>
  ...
</div>
<div data-sandtray-chrome class="mt-3 flex flex-wrap gap-2 items-center">
  ...
</div>
```

- [ ] **Step 4: Wire level + clear**

```ts
    // ----- Level + clear -----
    root.querySelector<HTMLButtonElement>('[data-sandtray-level]')?.addEventListener('click', () => {
      renderer.seed();
      renderer.markDirtyAll();
      renderer.render();
    });

    root.querySelector<HTMLButtonElement>('[data-sandtray-clear]')?.addEventListener('click', () => {
      figureLayer.clear();
      renderer.seed();
      renderer.markDirtyAll();
      renderer.render();
    });
```

- [ ] **Step 5: Wire capture (save as PNG)**

Add a `capture` method to `FigureLayer`:

```ts
    /**
     * Composite the canvas + DOM figures into a fresh PNG and trigger download.
     * Note: this version draws solid-color placeholders. Task 8 swaps in real images.
     */
    async capture(filename = 'sandtray.png'): Promise<void> {
      const out = document.createElement('canvas');
      out.width = this.renderer.width;
      out.height = this.renderer.height;
      const octx = out.getContext('2d');
      if (!octx) return;

      // 1. Draw the sand canvas.
      octx.drawImage(this.canvas, 0, 0, out.width, out.height);

      // 2. Draw each placed figure as a rotated rectangle (placeholder).
      for (const fig of this.figures) {
        const w = fig.naturalW * fig.scale;
        const h = fig.naturalH * fig.scale;
        octx.save();
        octx.translate(fig.x, fig.y);
        octx.rotate((fig.rotation * Math.PI) / 180);
        // Drop shadow
        octx.shadowColor = 'rgba(0,0,0,0.45)';
        octx.shadowBlur = 8;
        octx.shadowOffsetX = 4;
        octx.shadowOffsetY = 6;
        octx.fillStyle = (fig.el.style.background || '#888');
        octx.fillRect(-w / 2, -h / 2, w, h);
        octx.restore();
      }

      const url = out.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
```

Wire the capture button:

```ts
    root.querySelector<HTMLButtonElement>('[data-sandtray-capture]')?.addEventListener('click', () => {
      figureLayer.capture('sandtray.png');
    });
```

- [ ] **Step 6: Verify in dev**

- "Step back" → palette + controls fade out, leaving only the tray + figures.
- Click anywhere outside the canvas → returns to active state.
- "Save image" → downloads `sandtray.png` showing the current sand + figures.
- "Level the sand" → grooves and depressions vanish, figures stay.
- "Clear tray" → figures gone, sand reset.

- [ ] **Step 7: Build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): witness mode, capture, level, clear controls"
```

---

## Task 6: Asset processing script

Build the one-time Python script that fetches public-domain images and processes them into transparent PNGs ready for the figure palette. We test the script with one or two images before committing to a full collection in Task 7.

**Files:**
- Create: `scripts/sandtray-figures.py`
- Create: `scripts/sandtray-figures.json`

- [x] **Step 1: Create the source list JSON**

`scripts/sandtray-figures.json`:

```json
{
  "comment": "Source list for sandtray figure curation. Each entry is a candidate; we discard any that don't process cleanly. Categories: people, animals, plants, earth, shelter.",
  "figures": []
}
```

We'll fill it in Task 7. For now it's empty so the script can run on an empty list as a smoke test.

- [x] **Step 2: Create the processing script** (deviation: rembg+BiRefNet instead of Pillow near-white heuristic — better for vintage scans with anti-aliased edges; forces CPU EP to skip multi-minute CoreML compile)

`scripts/sandtray-figures.py`:

```python
#!/usr/bin/env python3
"""
sandtray-figures.py — one-time fetcher/processor for sandtray figures.

Reads scripts/sandtray-figures.json, downloads each entry's URL, removes a
near-white background, resizes to a max long edge, optimizes, and writes the
result to public/sandtray/figures/<id>.png.

Also emits a TypeScript-formatted snippet of figure metadata that can be
pasted into src/data/sandtrayFigures.ts.

Usage:
    python3 scripts/sandtray-figures.py            # process all
    python3 scripts/sandtray-figures.py <id>       # process one entry by id
    python3 scripts/sandtray-figures.py --check    # dry-run, no download
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError

try:
    from PIL import Image
except ImportError:
    print("ERROR: Pillow is required. Install with: pip install Pillow", file=sys.stderr)
    sys.exit(1)

REPO_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = REPO_ROOT / "scripts" / "sandtray-figures.json"
OUT_DIR = REPO_ROOT / "public" / "sandtray" / "figures"
MAX_LONG_EDGE = 480
WHITE_THRESHOLD = 235  # pixels lighter than this become transparent


def load_sources() -> list[dict]:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data.get("figures", [])


def download(url: str) -> bytes:
    req = Request(url, headers={
        "User-Agent": "trauma-therapy-guide-sandtray-fetcher/1.0 (educational, public-domain-only)"
    })
    with urlopen(req, timeout=30) as resp:
        return resp.read()


def near_white_to_transparent(img: Image.Image, threshold: int = WHITE_THRESHOLD) -> Image.Image:
    """
    Convert pixels lighter than `threshold` (in all RGB channels) to transparent.
    Soft edge: pixels in the threshold..255 band get partial alpha.
    """
    img = img.convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            m = min(r, g, b)
            if m >= 250:
                pixels[x, y] = (r, g, b, 0)
            elif m >= threshold:
                # Linear ramp from threshold..250 → alpha 255..0
                fade = 1.0 - (m - threshold) / float(250 - threshold)
                pixels[x, y] = (r, g, b, int(a * fade))
    return img


def trim_alpha(img: Image.Image) -> Image.Image:
    """Crop to the alpha bounding box."""
    bbox = img.getbbox()
    if bbox is None:
        return img
    return img.crop(bbox)


def resize_max_edge(img: Image.Image, max_edge: int = MAX_LONG_EDGE) -> Image.Image:
    w, h = img.size
    long_edge = max(w, h)
    if long_edge <= max_edge:
        return img
    scale = max_edge / float(long_edge)
    return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def process_one(entry: dict) -> tuple[bool, str]:
    fig_id = entry["id"]
    url = entry["url"]
    out_path = OUT_DIR / f"{fig_id}.png"
    try:
        raw = download(url)
    except URLError as e:
        return False, f"{fig_id}: download failed: {e}"
    except Exception as e:
        return False, f"{fig_id}: download error: {e}"

    tmp_path = OUT_DIR / f"{fig_id}.__raw"
    tmp_path.write_bytes(raw)

    try:
        img = Image.open(tmp_path)
        img.load()
    except Exception as e:
        tmp_path.unlink(missing_ok=True)
        return False, f"{fig_id}: not a readable image: {e}"

    img = near_white_to_transparent(img)
    img = trim_alpha(img)
    img = resize_max_edge(img)
    img.save(out_path, "PNG", optimize=True)
    tmp_path.unlink(missing_ok=True)

    size_kb = out_path.stat().st_size / 1024
    return True, f"{fig_id}: ok ({img.size[0]}x{img.size[1]}, {size_kb:.0f} KB)"


def emit_ts_snippet(entries: list[dict]) -> str:
    """Emit a TS array snippet that can be pasted into sandtrayFigures.ts."""
    lines = []
    for e in entries:
        out_path = OUT_DIR / f"{e['id']}.png"
        if not out_path.exists():
            continue
        lines.append("  {")
        lines.append(f"    id: {json.dumps(e['id'])},")
        lines.append(f"    src: '/sandtray/figures/{e['id']}.png',")
        lines.append(f"    alt: {{ en: {json.dumps(e['alt_en'])}, es: {json.dumps(e['alt_es'])} }},")
        lines.append(f"    category: {json.dumps(e['category'])},")
        lines.append(f"    defaultScale: {e.get('defaultScale', 1.0)},")
        lines.append(f"    source: {json.dumps(e.get('source', ''))},")
        lines.append("  },")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sources = load_sources()
    if not sources:
        print("No figures listed in", JSON_PATH)
        return 0

    if "--check" in argv:
        for e in sources:
            print(f"  {e['id']:30s} {e['category']:10s} {e['url']}")
        print(f"Total: {len(sources)} figures listed.")
        return 0

    only = [a for a in argv[1:] if not a.startswith("--")]
    targets = [e for e in sources if not only or e["id"] in only]

    ok = 0
    for e in targets:
        success, msg = process_one(e)
        prefix = "OK " if success else "FAIL"
        print(f"{prefix}  {msg}")
        if success:
            ok += 1
    print(f"\nProcessed {ok}/{len(targets)} successfully.")

    print("\n----- TS snippet -----")
    print(emit_ts_snippet(targets))
    return 0 if ok == len(targets) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

- [x] **Step 3: Smoke test the script with an empty list**

```bash
python3 scripts/sandtray-figures.py
```

Expected: prints "No figures listed in ..." and exits 0.

- [x] **Step 4: Smoke test with one real Wikimedia entry** (haeckel-discomedusae-8 processed to 336x480 RGBA, alpha range 0–255, 438KB. Note: Wikimedia requires User-Agent with contact email per their UA policy; script updated accordingly.)

Add one entry to `scripts/sandtray-figures.json`:

```json
{
  "comment": "Source list for sandtray figure curation.",
  "figures": [
    {
      "id": "test-haeckel-medusa",
      "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/3/35/Haeckel_Discomedusae_8.jpg/640px-Haeckel_Discomedusae_8.jpg",
      "alt_en": "Sea creatures (test)",
      "alt_es": "Criaturas del mar (prueba)",
      "category": "animals",
      "defaultScale": 1.0,
      "source": "Ernst Haeckel, Kunstformen der Natur, 1904 (Wikimedia Commons, public domain)"
    }
  ]
}
```

```bash
python3 scripts/sandtray-figures.py
```

Expected:
- File downloaded.
- `public/sandtray/figures/test-haeckel-medusa.png` exists.
- File size is well under 500KB.
- Open it: it's a Haeckel plate with a transparent (or near-transparent) background where the original was white.

If the URL above 404s (Wikimedia thumbnail names can change), substitute any `upload.wikimedia.org/wikipedia/commons/...` URL of a Haeckel plate. The point of this step is to verify the *script* works, not to lock in this image.

- [x] **Step 5: Clean up the test file**

```bash
rm -f public/sandtray/figures/test-haeckel-medusa.png
```

Reset the JSON to empty figures array:

```json
{
  "comment": "Source list for sandtray figure curation.",
  "figures": []
}
```

- [x] **Step 6: Commit the script** (commit 8e54b8b)

```bash
git add scripts/sandtray-figures.py scripts/sandtray-figures.json
git commit -m "build(sandtray): one-time figure fetcher/processor script"
```

---

## Task 7: Curate the figure collection

Source 25–30 vintage public-domain figures, process them, and populate `sandtrayFigures.ts`. This is the riskiest task — some sources will fail and need substitution.

**Files:**
- Modify: `scripts/sandtray-figures.json`
- Modify: `src/data/sandtrayFigures.ts`
- Create: `public/sandtray/figures/<id>.png` (~25–30 files)

- [ ] **Step 1: Build the curated source list**

For each candidate, find a single-specimen public-domain image with a near-white background on Wikimedia Commons (preferred), Smithsonian Open Access, or Biodiversity Heritage Library. Use Wikimedia search (`https://commons.wikimedia.org/w/index.php?search=<query>&fulltext=1`) to find candidates. The URL needed is the full-resolution `upload.wikimedia.org/wikipedia/commons/...` path; if you only have a `thumb/.../<size>px-...` path, that's also fine.

Target list (substitutable):

| Category | id | Search hint | alt en | alt es |
|---|---|---|---|---|
| people | child-vintage | "vintage engraving child" | Child | Niño |
| people | woman-vintage | "vintage engraving woman" | Woman | Mujer |
| people | man-vintage | "vintage engraving man" | Man | Hombre |
| people | elder-vintage | "vintage engraving elder" | Elder | Anciano |
| people | family-vintage | "vintage engraving family" | Family | Familia |
| animals | audubon-bluebird | "Audubon bluebird" | Bird | Pájaro |
| animals | audubon-owl | "Audubon owl plate" | Owl | Búho |
| animals | vintage-dog | "vintage engraving dog" | Dog | Perro |
| animals | vintage-cat | "vintage engraving cat" | Cat | Gato |
| animals | vintage-horse | "vintage engraving horse" | Horse | Caballo |
| animals | vintage-rabbit | "vintage engraving rabbit" | Rabbit | Conejo |
| animals | vintage-deer | "vintage engraving deer" | Deer | Ciervo |
| animals | haeckel-butterfly | "Haeckel Lepidoptera" | Butterfly | Mariposa |
| animals | haeckel-fish | "Haeckel fish plate" | Fish | Pez |
| plants | vintage-oak | "vintage engraving oak tree" | Oak tree | Roble |
| plants | vintage-pine | "vintage engraving pine tree" | Pine tree | Pino |
| plants | kohler-rose | "Köhler rose Medizinal" | Flower | Flor |
| plants | kohler-fern | "Köhler fern Medizinal" | Fern | Helecho |
| plants | vintage-mushroom | "vintage engraving mushroom" | Mushroom | Hongo |
| plants | vintage-vine | "vintage engraving ivy vine" | Vine | Enredadera |
| earth | vintage-stone | "vintage engraving boulder stone" | Stone | Piedra |
| earth | vintage-mountain | "vintage engraving mountain" | Mountain | Montaña |
| earth | hokusai-wave | "Hokusai wave" | Wave | Ola |
| earth | alchemy-sun | "alchemical sun engraving" | Sun | Sol |
| earth | alchemy-moon | "alchemical moon engraving" | Moon | Luna |
| shelter | vintage-house | "vintage engraving cottage house" | House | Casa |
| shelter | vintage-door | "vintage engraving door" | Door | Puerta |
| shelter | vintage-ship | "vintage engraving ship sailing" | Ship | Barco |
| shelter | alchemy-heart | "alchemical heart engraving" | Heart | Corazón |
| shelter | alchemy-star | "alchemical star engraving" | Star | Estrella |
| shelter | vintage-key | "vintage engraving key" | Key | Llave |

**Rules during curation:**
- White or near-white background only. Reject images with parchment, sepia, dark, or busy backgrounds.
- Single specimen per image. Reject collage plates unless the script's bbox trim cleanly isolates one specimen (it won't, in practice — pick singles).
- Pre-1930 publication date — verify on the source page.
- License must read "public domain" / "PD-old" / "PD-1923" / "PD-Art" / similar. Reject CC-BY / CC-BY-SA / "in copyright."

Add each accepted candidate as an object in `scripts/sandtray-figures.json`:

```json
{
  "id": "audubon-bluebird",
  "url": "https://upload.wikimedia.org/wikipedia/commons/...",
  "alt_en": "Bird",
  "alt_es": "Pájaro",
  "category": "animals",
  "defaultScale": 1.0,
  "source": "John James Audubon, Birds of America, 1827–1838 (Wikimedia Commons, public domain)"
}
```

- [ ] **Step 2: Process the collection**

```bash
python3 scripts/sandtray-figures.py
```

Expected: at least 20 entries succeed. The script prints a TS snippet at the end — copy it.

If many fail: try alternative URLs, swap candidates, or move on with fewer figures. **Minimum acceptable: 20 figures across all 5 categories with at least 3 per category.**

- [ ] **Step 3: Visually inspect each processed figure**

Open each PNG in `public/sandtray/figures/`. For each one, decide:
- Background cleanly transparent? If not, drop it or re-process with a different `WHITE_THRESHOLD` (pass it as a script tweak).
- Specimen legible at ~96px? If not, adjust `defaultScale`.
- Tone consistent with the others? If something is jarringly bright or stylistically off, drop it.

Build a final accepted list. Move rejected PNGs out of `public/sandtray/figures/` and remove their entries from the JSON.

- [ ] **Step 4: Pause and show the user the final set**

Before committing, present the final accepted list to the user and ask for veto. The list should include thumbnails or filenames + alt text. Wait for approval before proceeding.

- [ ] **Step 5: Populate `sandtrayFigures.ts`**

Replace the empty `sandtrayFigures` array with the TS snippet emitted by the script (only entries that passed visual inspection). Example shape:

```ts
export const sandtrayFigures: SandtrayFigure[] = [
  {
    id: 'audubon-bluebird',
    src: '/sandtray/figures/audubon-bluebird.png',
    alt: { en: 'Bird', es: 'Pájaro' },
    category: 'animals',
    defaultScale: 1.0,
    source: 'John James Audubon, Birds of America, 1827–1838 (Wikimedia Commons, public domain)',
  },
  // ... more
];
```

- [ ] **Step 6: Run the validator**

Add a temporary call at the end of the file (delete after the check):

```ts
validateSandtrayFigures();
```

```bash
npm run build
```

Expected: no errors. (Then remove the temporary call line.)

- [ ] **Step 7: Commit**

```bash
git add scripts/sandtray-figures.json src/data/sandtrayFigures.ts public/sandtray/figures/*.png
git commit -m "feat(sandtray): curate vintage public-domain figure collection"
```

---

## Task 8: Wire real figures into the palette

Replace the placeholder color swatches with real figure thumbnails, and the placeholder rendering with `<img>` elements. Wire category filtering.

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

- [ ] **Step 1: Import the figure data into the component frontmatter**

At the top of `Sandtray.astro` frontmatter:

```ts
import { sandtrayFigures, sandtrayCategories, type SandtrayFigure } from '../../data/sandtrayFigures';
```

Inside the frontmatter, build a serializable payload to pass into the script via a data attribute:

```ts
const figurePayload = sandtrayFigures.map((f) => ({
  id: f.id,
  src: f.src,
  alt: f.alt[lang],
  category: f.category,
  defaultScale: f.defaultScale,
}));
```

- [ ] **Step 2: Replace the placeholder palette markup**

Replace the placeholder palette div with:

```astro
<div data-sandtray-chrome class="mt-4">
  <div role="tablist" aria-label={s.paletteLabel} class="flex flex-wrap gap-2 mb-2">
    <button
      data-sandtray-filter="all"
      role="tab"
      aria-selected="true"
      class="px-3 py-1 rounded-md text-xs bg-bronze-500 text-forest-900 border border-bronze-400 font-medium focus:outline-none focus:ring-2 focus:ring-bronze-500"
    >
      {s.allFigures}
    </button>
    {sandtrayCategories.map((cat) => (
      <button
        data-sandtray-filter={cat.key}
        role="tab"
        aria-selected="false"
        class="px-3 py-1 rounded-md text-xs bg-forest-700 text-forest-200 border border-forest-600 hover:bg-forest-600 focus:outline-none focus:ring-2 focus:ring-bronze-500"
      >
        {cat.label[lang]}
      </button>
    ))}
  </div>

  <div
    data-sandtray-palette
    aria-label={s.paletteLabel}
    class="flex gap-2 overflow-x-auto p-2 bg-forest-900 rounded-md border border-forest-700"
    style="scrollbar-width: thin;"
  >
    {sandtrayFigures.map((fig) => (
      <button
        data-sandtray-figure={fig.id}
        data-sandtray-category={fig.category}
        class="flex-shrink-0 w-16 h-16 rounded bg-forest-800 border border-forest-700 hover:border-bronze-500 focus:outline-none focus:ring-2 focus:ring-bronze-500 flex items-center justify-center p-1"
        aria-label={fig.alt[lang]}
      >
        <img src={fig.src} alt="" class="max-w-full max-h-full object-contain pointer-events-none" loading="lazy" />
      </button>
    ))}
  </div>
</div>
```

Add to the i18n strings:

```ts
allFigures: 'All' / 'Todas',
```

Pass `figurePayload` via data attribute on the widget root:

```astro
<div
  class:list={[containerClass]}
  data-sandtray-widget
  data-sandtray-i18n={JSON.stringify({
    stepBack: s.stepBack,
    returnToTray: s.returnToTray,
  })}
  data-sandtray-figures-data={JSON.stringify(figurePayload)}
>
```

- [ ] **Step 3: Add real figure rendering to FigureLayer**

Add a method `addFigure(cx, cy, fig)` to `FigureLayer`. The fig parameter is a payload entry (`{id, src, alt, defaultScale}`):

```ts
    interface FigurePayload { id: string; src: string; alt: string; category: string; defaultScale: number; }

    /** Add a real figure (image) at canvas-pixel coordinates. */
    addImage(cx: number, cy: number, fig: FigurePayload, naturalW: number, naturalH: number): PlacedFigure {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'absolute pointer-events-auto cursor-grab focus:outline-none focus:ring-2 focus:ring-bronze-500';
      el.setAttribute('aria-label', fig.alt);
      el.style.background = 'transparent';
      el.style.border = 'none';
      el.style.padding = '0';
      el.style.willChange = 'transform';
      el.style.touchAction = 'none';
      el.style.filter = 'drop-shadow(4px 6px 4px rgba(0,0,0,0.45))';

      const img = document.createElement('img');
      img.src = fig.src;
      img.alt = '';
      img.draggable = false;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      img.style.pointerEvents = 'none';
      el.appendChild(img);

      const placed: PlacedFigure = {
        el, x: cx, y: cy, rotation: (Math.random() * 16 - 8), scale: fig.defaultScale,
        naturalW, naturalH,
      };
      placed.el.dataset.figureId = fig.id;
      this.figures.push(placed);
      this.container.appendChild(el);
      this.applyTransform(placed);
      this.attachHandlers(placed);
      this.depressSandUnder(placed);

      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduceMotion) {
        el.animate(
          [{ transform: this.transformFor(placed, 0.8) }, { transform: this.transformFor(placed, 1) }],
          { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1.05)', fill: 'none' },
        );
      }
      return placed;
    }
```

- [ ] **Step 4: Update the bootstrap to use real figures**

Replace the placeholder palette wiring inside `widgets.forEach` with:

```ts
    // ----- Figure data + image preload -----
    const figureDataRaw = root.getAttribute('data-sandtray-figures-data') || '[]';
    const figureData: FigurePayload[] = JSON.parse(figureDataRaw);
    const figureById = new Map(figureData.map((f) => [f.id, f]));

    /**
     * Preload images so we know their natural dimensions when placing figures
     * and so capture-to-PNG doesn't race the network. Returns a Map<id, HTMLImageElement>.
     */
    const imagesById = new Map<string, HTMLImageElement>();
    function preload(fig: FigurePayload): Promise<HTMLImageElement> {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => { imagesById.set(fig.id, img); resolve(img); };
        img.onerror = () => { resolve(img); };
        img.src = fig.src;
      });
    }
    Promise.all(figureData.map(preload));

    // Reference scale: a figure with naturalScale 1 should occupy ~96 canvas px on its long edge.
    const REFERENCE_LONG_EDGE = 96;

    function placeFigure(cx: number, cy: number, fig: FigurePayload): void {
      const img = imagesById.get(fig.id);
      if (!img || !img.naturalWidth) {
        // Image not yet loaded; load synchronously then place.
        const tmp = new Image();
        tmp.onload = () => {
          imagesById.set(fig.id, tmp);
          const longEdge = Math.max(tmp.naturalWidth, tmp.naturalHeight);
          const k = REFERENCE_LONG_EDGE / longEdge;
          figureLayer.addImage(cx, cy, fig, tmp.naturalWidth * k, tmp.naturalHeight * k);
        };
        tmp.src = fig.src;
        return;
      }
      const longEdge = Math.max(img.naturalWidth, img.naturalHeight);
      const k = REFERENCE_LONG_EDGE / longEdge;
      figureLayer.addImage(cx, cy, fig, img.naturalWidth * k, img.naturalHeight * k);
    }

    // ----- Real palette wiring -----
    const figureButtons = root.querySelectorAll<HTMLButtonElement>('[data-sandtray-figure]');
    figureButtons.forEach((btn) => {
      const id = btn.getAttribute('data-sandtray-figure')!;
      const fig = figureById.get(id);
      if (!fig) return;

      btn.addEventListener('click', (e) => {
        if ((btn as any).__draggedJustNow) {
          (btn as any).__draggedJustNow = false;
          return;
        }
        e.preventDefault();
        const cx = renderer.width / 2 + (Math.random() - 0.5) * 80;
        const cy = renderer.height / 2 + (Math.random() - 0.5) * 60;
        placeFigure(cx, cy, fig);
      });

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const ghost = document.createElement('img');
        ghost.src = fig.src;
        ghost.style.position = 'fixed';
        ghost.style.left = '0';
        ghost.style.top = '0';
        ghost.style.width = '64px';
        ghost.style.height = '64px';
        ghost.style.objectFit = 'contain';
        ghost.style.pointerEvents = 'none';
        ghost.style.opacity = '0.85';
        ghost.style.filter = 'drop-shadow(4px 6px 4px rgba(0,0,0,0.45))';
        ghost.style.transform = `translate(${e.clientX - 32}px, ${e.clientY - 32}px)`;
        ghost.style.zIndex = '9999';
        document.body.appendChild(ghost);

        let moved = false;

        const onMove = (ev: PointerEvent) => {
          moved = true;
          ghost.style.transform = `translate(${ev.clientX - 32}px, ${ev.clientY - 32}px)`;
        };
        const onUp = (ev: PointerEvent) => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          ghost.remove();
          if (!moved) return;
          (btn as any).__draggedJustNow = true;
          const cRect = canvas.getBoundingClientRect();
          if (
            ev.clientX >= cRect.left && ev.clientX <= cRect.right &&
            ev.clientY >= cRect.top && ev.clientY <= cRect.bottom
          ) {
            const { x, y } = renderer.clientToCanvas(ev.clientX, ev.clientY);
            placeFigure(x, y, fig);
          }
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });
    });

    // ----- Category filter -----
    const filterButtons = root.querySelectorAll<HTMLButtonElement>('[data-sandtray-filter]');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-sandtray-filter');
        filterButtons.forEach((b) => {
          const active = b === btn;
          b.setAttribute('aria-selected', active ? 'true' : 'false');
          b.classList.toggle('bg-bronze-500', active);
          b.classList.toggle('text-forest-900', active);
          b.classList.toggle('border-bronze-400', active);
          b.classList.toggle('font-medium', active);
          b.classList.toggle('bg-forest-700', !active);
          b.classList.toggle('text-forest-200', !active);
          b.classList.toggle('border-forest-600', !active);
        });
        figureButtons.forEach((fb) => {
          const cat = fb.getAttribute('data-sandtray-category');
          const show = key === 'all' || cat === key;
          (fb as HTMLElement).style.display = show ? '' : 'none';
        });
      });
    });
```

Remove the old placeholder wiring (`document.querySelectorAll('[data-placeholder-figure]')` block) and the now-unused `addPlaceholder` method. Also delete the placeholder swatches from the markup.

- [ ] **Step 5: Update `capture()` to draw real images**

Replace the `capture` method on `FigureLayer` with:

```ts
    async capture(filename = 'sandtray.png'): Promise<void> {
      const out = document.createElement('canvas');
      out.width = this.renderer.width;
      out.height = this.renderer.height;
      const octx = out.getContext('2d');
      if (!octx) return;

      octx.drawImage(this.canvas, 0, 0, out.width, out.height);

      for (const fig of this.figures) {
        const figId = fig.el.dataset.figureId;
        const img = figId ? imagesById.get(figId) : null;
        const w = fig.naturalW * fig.scale;
        const h = fig.naturalH * fig.scale;
        octx.save();
        octx.translate(fig.x, fig.y);
        octx.rotate((fig.rotation * Math.PI) / 180);
        octx.shadowColor = 'rgba(0,0,0,0.45)';
        octx.shadowBlur = 8;
        octx.shadowOffsetX = 4;
        octx.shadowOffsetY = 6;
        if (img && img.complete && img.naturalWidth) {
          octx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          octx.fillStyle = '#888';
          octx.fillRect(-w / 2, -h / 2, w, h);
        }
        octx.restore();
      }

      const url = out.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
```

Note: `capture` references `imagesById` from the bootstrap closure. To make this work, lift `imagesById` out of the bootstrap closure by passing it into the FigureLayer constructor, OR (simpler) attach it to the `FigureLayer` instance: change `new FigureLayer(figContainer, canvas, renderer)` to also accept the map, e.g. `figureLayer.imagesById = imagesById;` after construction. Pick whichever is cleaner — the goal is one source of truth for loaded images.

- [ ] **Step 6: Verify in dev**

`npm run dev`. Expected:
- The palette shows real figure thumbnails grouped by category.
- Filter chips work — clicking "Animals" hides figures from other categories.
- Click a figure thumbnail → the figure appears at the center of the tray.
- Drag a figure thumbnail → ghost follows the cursor → drop on the tray places the figure where dropped.
- Each placed figure has a drop shadow and depresses the sand under it.
- Save image now produces a PNG with real figures composited in.

- [ ] **Step 7: Build**

```bash
npm run build
```

- [ ] **Step 8: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): wire vintage figure palette with category filter and capture"
```

---

## Task 9: Update content files

Rewrite the user-facing markdown to match the new interactions and remove references to emoji.

**Files:**
- Modify: `src/content/tools/sandtray.md`
- Modify: `src/content/tools/sandtray.es.md`

- [ ] **Step 1: Update `src/content/tools/sandtray.md`**

Replace the entire body (everything after the frontmatter) with:

```markdown
## What this is

A digital sandtray you can use in the browser. Drag figures from the palette — people, animals, trees, shelters, symbols — onto the sand to build a scene. The scene can represent anything: how things feel right now, a memory, a worry, a safe place, something you can't quite put into words.

The sand itself responds. Drag your finger or cursor across empty sand and you leave a groove. Place a figure and the sand depresses underneath it, the way it would in a real tray.

Sandtray therapy has been used since the 1930s (Margaret Lowenfeld's "World Technique") and developed into Jungian sandplay by Dora Kalff. It's particularly useful when words feel inadequate — for children, for traumatic material that's hard to speak about, or when you just want to externalize something and look at it from the outside.

## When to use it

- **Clinicians:** As an expressive tool in Phase 2 preparation, or at any point when a client needs a non-verbal way in. A scene built, looked at, and discussed can surface material that interview would not. Useful for children, adolescents, and adults who describe themselves as "not good with words."
- **Families:** At home as a calming, creative activity. Let your child build a scene of their safe place, their family, their feelings today. You don't have to interpret — sometimes the building *is* the therapy.

## Clinical notes

Nothing you place is saved. When you close or refresh the page, the scene is gone — this is intentional. The *process* of choosing, placing, and arranging is the point, not a record. If you do want to keep a scene, the **Save image** button downloads a PNG locally; nothing is uploaded anywhere.

The figures are vintage public-domain illustrations — Audubon birds, Haeckel sea creatures, botanical plates, woodcut figures of people, alchemical symbols. They were chosen for their stillness and their hand-drawn quality, not their realism. The vocabulary is smaller than a physical sandtray collection. For in-session clinical work, a physical sandtray and figure library remains the richer option — this digital version is most useful for home practice, telehealth, or quick in-session scene-building when a physical tray isn't available.

The **Step back** button fades the controls and palette so only the tray and what you placed remain visible. It's the contemplative pause — the moment of *witnessing* what you built. Tap anywhere to return.

## How to use it

- **Add a figure:** Drag any figure from the palette onto the sand, or tap it to drop near the center.
- **Move a figure:** Drag it.
- **Resize a figure:** Mouse wheel over it, or pinch on touch.
- **Remove a figure:** Long-press it, or focus it and press Delete.
- **Carve the sand:** Drag your finger or cursor across empty sand.
- **Step back:** See the tray without the controls. Tap to return.
- **Save image:** Download the current scene as a PNG.
- **Level the sand:** Smooth the grooves and depressions back to flat.
- **Clear tray:** Remove every figure and reset the sand.
```

- [ ] **Step 2: Update `src/content/tools/sandtray.es.md`**

Replace the body (after the frontmatter) with the Spanish equivalent:

```markdown
## Qué es esto

Una bandeja de arena digital que puedes usar en el navegador. Arrastra figuras desde la paleta — personas, animales, árboles, refugios, símbolos — sobre la arena para construir una escena. La escena puede representar cualquier cosa: cómo te sientes ahora, un recuerdo, una preocupación, un lugar seguro, algo que no puedes poner en palabras.

La arena misma responde. Arrastra tu dedo o cursor sobre arena vacía y dejarás un surco. Coloca una figura y la arena se hunde bajo ella, igual que en una bandeja real.

La terapia de bandeja de arena se ha usado desde los años 1930 (la "Técnica del Mundo" de Margaret Lowenfeld) y fue desarrollada en sandplay junguiano por Dora Kalff. Es particularmente útil cuando las palabras se sienten insuficientes — para niños, para material traumático difícil de hablar, o cuando simplemente quieres exteriorizar algo y mirarlo desde afuera.

## Cuándo usarlo

- **Clínicos:** Como herramienta expresiva en la preparación de la Fase 2, o en cualquier momento en que un cliente necesite una forma no verbal de entrar. Una escena construida, observada y comentada puede sacar a la luz material que una entrevista no lograría. Útil para niños, adolescentes y adultos que se describen como "no buenos con las palabras."
- **Familias:** En casa como una actividad calmante y creativa. Deja que tu hijo construya una escena de su lugar seguro, su familia, sus sentimientos del día. No tienes que interpretar — a veces el construir *es* la terapia.

## Notas clínicas

Nada de lo que coloques se guarda. Cuando cierres o recargues la página, la escena desaparece — esto es intencional. El *proceso* de elegir, colocar y arreglar es lo importante, no un registro. Si quieres conservar una escena, el botón **Guardar imagen** descarga un PNG localmente; nada se sube a ninguna parte.

Las figuras son ilustraciones vintage de dominio público — pájaros de Audubon, criaturas marinas de Haeckel, láminas botánicas, figuras grabadas de personas, símbolos alquímicos. Fueron elegidas por su quietud y su calidad dibujada a mano, no por su realismo. El vocabulario es más pequeño que una colección física. Para el trabajo clínico en sesión, una bandeja física con figuras sigue siendo la opción más rica — esta versión digital es más útil para la práctica en casa, telesalud, o construcción rápida de escenas en sesión cuando no hay una bandeja física disponible.

El botón **Da un paso atrás** desvanece los controles y la paleta para que solo queden visibles la bandeja y lo que colocaste. Es la pausa contemplativa — el momento de *atestiguar* lo que construiste. Toca en cualquier lugar para volver.

## Cómo usarlo

- **Agregar una figura:** Arrastra cualquier figura desde la paleta a la arena, o tócala para soltarla cerca del centro.
- **Mover una figura:** Arrástrala.
- **Redimensionar una figura:** Rueda del mouse sobre ella, o pellizca en táctil.
- **Quitar una figura:** Mantén presionado, o enfócala y presiona Suprimir.
- **Esculpir la arena:** Arrastra tu dedo o cursor sobre la arena vacía.
- **Da un paso atrás:** Mira la bandeja sin los controles. Toca para volver.
- **Guardar imagen:** Descarga la escena actual como PNG.
- **Aplanar la arena:** Alisa los surcos y hundimientos hasta dejarla plana.
- **Limpiar bandeja:** Quita cada figura y reinicia la arena.
```

- [ ] **Step 3: Build**

```bash
npm run build
```

Expected: build succeeds. The content collections re-validate.

- [ ] **Step 4: Commit**

```bash
git add src/content/tools/sandtray.md src/content/tools/sandtray.es.md
git commit -m "docs(sandtray): update content for Living Sand interactions"
```

---

## Task 10: Final verification against acceptance criteria

Walk through each acceptance criterion from the spec and verify it. Fix anything that fails.

**Files:**
- Possibly modify: `src/components/tools/Sandtray.astro` (small fixes only)

- [ ] **Step 1: Run dev and walk the criteria**

`npm run dev`. Visit `/tools/sandtray` and `/es/tools/sandtray`. For each:

1. Sand is procedural. Drag on empty sand → visible groove that persists.
2. Wood frame visibly contains the sand (raised bevel, inset shadow).
3. At least 20 figures across 5 categories in the palette.
4. Drag a figure from palette to a chosen spot → it appears there.
5. Placed figures cast shadows aligned with sand light (drop shadow goes lower-right).
6. Placed figures depress the sand under them.
7. Figures move (drag), resize (wheel), remove (long-press / Delete).
8. "Step back" fades chrome to leave only the tray.
9. "Save image" downloads a PNG of the current scene.
10. "Level the sand" smooths carves; "Clear tray" removes figures.
11. English and Spanish render correctly.
12. Tab to focus a figure → arrow keys nudge → +/- resize → Delete remove.
13. No emoji anywhere (search the component for non-ASCII glyphs).
14. Content file matches new interactions.

```bash
# Confirm no emoji are smuggled into the component or content files.
grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' src/components/tools/Sandtray.astro || echo "OK: no emoji in component"
grep -nP '[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]' src/content/tools/sandtray.md src/content/tools/sandtray.es.md || echo "OK: no emoji in content"
```

(Use the Grep tool, not literal `grep`, to run those.)

- [ ] **Step 2: Run build one final time**

```bash
npm run build
```

Expected: clean build. Dist generated.

- [ ] **Step 3: Test on a touch device or DevTools touch emulation**

Open DevTools → toggle device toolbar → mobile preset. Verify:
- Touch carving works.
- Touch drag from palette works.
- Touch long-press to remove works.
- The tray fits the viewport without horizontal scroll.

- [ ] **Step 4: Test reduced motion**

Enable `prefers-reduced-motion` in DevTools (Rendering panel). Verify:
- Settle animation on placement is skipped.
- Witness mode fade still works (opacity transitions are not strictly "motion" per spec, but if they feel jarring, set `transition: opacity 0s` under reduced motion).

- [ ] **Step 5: Final commit if any small fixes were made**

```bash
git add -p   # stage only the verification fixes
git commit -m "fix(sandtray): final polish from acceptance walkthrough"
```

(Skip this commit if the walkthrough produced no changes.)

---

## Self-review summary

**Spec coverage check:**
- ✅ Procedural sand canvas — Task 2
- ✅ Carving — Task 3
- ✅ Wood frame — Task 2 (markup)
- ✅ FigureLayer + drag/resize/remove — Task 4
- ✅ Witness mode — Task 5
- ✅ Capture — Task 5 (placeholder), Task 8 (real images)
- ✅ Level / Clear — Task 5
- ✅ Vintage figure curation — Tasks 6, 7
- ✅ Real palette + filter — Task 8
- ✅ Sand depression under figures — Task 4
- ✅ Reduced motion — Task 4 (settle), Task 10 (verification)
- ✅ Keyboard support — Task 4
- ✅ i18n EN/ES — Task 5 (controls), Task 8 (palette), Task 9 (content)
- ✅ Acceptance criteria walk — Task 10
- ✅ User pause for figure veto — Task 7 step 4
- ✅ No emoji anywhere — Task 10 step 1 grep check

**Type consistency check:** `SandRenderer`, `FigureLayer`, `PlacedFigure`, `FigurePayload`, `SandtrayFigure`, `SandtrayCategory` are used consistently across all tasks. `imagesById` is introduced in Task 8 with a note to lift it onto `FigureLayer` for `capture()` to access.

**Placeholder scan:** No "TBD" / "TODO" / "fill in details" / "similar to". Every step has concrete code or commands.

**Pause point:** Task 7 Step 4 explicitly stops to show the curated figure set to the user before final commit.
