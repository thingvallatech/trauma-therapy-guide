# Sandtray 3D Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2D canvas-plus-DOM sandtray with a Three.js 3D scene where figures are real low-poly GLB models placed on a displaced sand mesh, matching the metaphor of a physical sandtray with pick-up-and-place toys.

**Architecture:** Vanilla Three.js (no React, no react-three-fiber) injected into the existing Astro island. Sand is a subdivided `PlaneGeometry` with per-vertex displacement read from a `DataTexture` height map — the existing `Float32Array` carve math is ported as-is, just feeding pixels into a texture instead of directly shading a `CanvasRenderingContext2D`. Figures are GLB models loaded at runtime via `GLTFLoader`, placed as children of the sand root, each backed by a plain state record `{figureId, position{x,z}, rotationY, scale}`. Camera is an isometric `OrthographicCamera` with locked pitch and a single degree of freedom (yaw around Y). Pointer input is dispatched by a `Raycaster` against two layers (sand and figures). Capture is `renderer.domElement.toDataURL()`.

**Tech Stack:**
- Three.js 0.168+ (vanilla, from the `three` npm package)
- Three.js `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js`
- Astro 5 + TypeScript (existing)
- Tailwind 4 + inline CSS gradients for the wooden tray frame (existing, unchanged)
- Python 3.9 + urllib for the one-time model fetcher script

**Why this rewrite:**
The 2D approach hit a dead end in figure curation — we could not source single-subject, child-legible, visually-consistent, open-licensed 2D art that matched the sandtray metaphor. A physical sandtray is three-dimensional: therapists and children pick up miniatures and place them in the sand. Replicating that metaphor with flat PNGs on a 2D canvas was the wrong abstraction. Three.js plus CC0 low-poly models (KayKit) gives us the right metaphor, a consistent visual language, and a real source of supply.

**Scope relative to the 2D plan (`docs/superpowers/plans/2026-04-08-sandtray-living-sand.md`):**
- Tasks 1–5 of the 2D plan are **kept committed** as the history of how we got here. The procedural sand canvas, drag-to-carve, placeholder figure layer, and witness/capture/level/clear controls are all shipped commits (308fc74 through ae554e5). Some of their logic — carve math, i18n strings, the wooden tray frame CSS — ports forward into this rewrite.
- Task 6 of the 2D plan (`scripts/sandtray-figures.py`, commit 8e54b8b) is **kept as-is** but moved to dead-code status for now. It still works; we might revive the rembg pipeline later for a 2D fallback or for processing avatar assets. Not deleted.
- Tasks 7–10 of the 2D plan are **superseded** by this plan. In particular, the figure curation churn (~21 attempted PNGs under `public/sandtray/figures/`) gets cleaned up in Task 1 below.

---

## File Structure

**Created:**
- `docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md` (this file)
- `scripts/sandtray-models.json` (3D model source list: id, category, alt text, KayKit GitHub raw URL)
- `scripts/sandtray-models.py` (one-time fetcher that downloads GLB files from GitHub raw into `public/sandtray/models/`)
- `public/sandtray/models/*.glb` (~15 starter models — see Task 6)
- `public/sandtray/models/LICENSE.txt` (KayKit CC0 attribution record)

**Rewritten:**
- `src/components/tools/Sandtray.astro` — canvas 2D rendering rips out, Three.js scene goes in. Tray frame CSS, witness/level/clear/capture markup, i18n attributes, and the basic widget bootstrap stay. Target size ~950–1100 lines (comparable to current 747).
- `src/data/sandtrayFigures.ts` — schema swaps `src` (PNG path) for `modelPath` (GLB path). `defaultScale` is retained but now maps to Three.js world units. Validator is updated to check under `/sandtray/models/` and `.glb` extension.
- `src/content/tools/sandtray.md` — the "how to use it" section is rewritten for 3D interactions (tap-to-place, drag-to-move, long-press-to-rotate, pinch-to-scale, two-finger-twist camera).
- `src/content/tools/sandtray.es.md` — Spanish version, same rewrite.

**Deleted in Task 1:**
- `public/sandtray/figures/*.png` (the ~21 rembg-processed 2D figure PNGs — none of this is committed yet, so it's a no-risk cleanup)
- `scripts/sandtray-phosphor.py` (untracked dead code)
- `scripts/.sandtray-search.py` (untracked throwaway helper)

**Modified (small edits):**
- `package.json` (add `three` + `@types/three`)
- `.gitignore` (no changes needed; `scripts/.cache/` already covered)

**Untouched:**
- The wooden tray frame CSS and markup in `Sandtray.astro` (lines ~46–57 in the current file)
- i18n string structure (translation strings are *added to*, not restructured)
- `scripts/sandtray-figures.py` (kept as historical rembg pipeline)
- `scripts/sandtray-figures.json` (schema stays but will be gutted to empty in Task 1 since the old data is irrelevant)
- Every other file in the repo

---

## Verification model

This project has no test framework and adding one for a single visual widget is still overkill. Each task ends with a manual dev-server check and/or `npm run build` to verify nothing broke. Pure math (height-map displacement, raycaster hit math) is verified by careful review and visual output. Three.js pipeline correctness is verified by putting a known-good reference object on the scene at a known position and visually confirming it lands where expected.

After every task that touches Astro component code, run:

```bash
npm run build
```

Expected: builds without errors. If the build fails, stop and fix before moving on.

After every task that touches dev-server-visible behavior, run:

```bash
npm run dev
```

Then open `http://localhost:4321` (or whatever port Astro assigns), navigate to the sandtray tool page, and verify the described behavior.

---

## Task 1: Cleanup and Three.js install

Rip out the 2D figure curation artifacts that were never committed, install Three.js, and verify the baseline still builds.

**Files:**
- Delete: `public/sandtray/figures/*.png` (all PNGs)
- Delete: `scripts/sandtray-phosphor.py`
- Delete: `scripts/.sandtray-search.py`
- Modify: `scripts/sandtray-figures.json` (revert to empty figures array — not referenced by committed code)
- Modify: `package.json` (add `three` and `@types/three`)

- [ ] **Step 1: Remove uncommitted 2D figure PNGs**

```bash
rm -f public/sandtray/figures/*.png
```

Expected: `ls public/sandtray/figures/` shows only `.gitkeep`.

- [ ] **Step 2: Remove uncommitted helper scripts**

```bash
rm -f scripts/sandtray-phosphor.py scripts/.sandtray-search.py
```

Expected: `ls scripts/` shows only `sandtray-figures.py` and `sandtray-figures.json`.

- [ ] **Step 3: Reset the source-list JSON to empty**

Write `scripts/sandtray-figures.json`:

```json
{
  "comment": "Historical rembg-pipeline source list for 2D figures. Superseded by scripts/sandtray-models.json (3D models). Kept so scripts/sandtray-figures.py can still be run for future 2D use cases if needed.",
  "figures": []
}
```

- [ ] **Step 4: Install three and @types/three**

```bash
npm install three @types/three
```

Expected: `package.json` gains `three` (latest 0.168+) and `@types/three` dependencies. `node_modules/three/` exists. No install errors.

- [ ] **Step 5: Verify baseline build still passes**

```bash
npm run build
```

Expected: Astro build succeeds with the existing 2D Sandtray component still compiling. Three.js is installed but not yet used — just making sure adding the dep didn't break anything.

- [ ] **Step 6: Commit**

```bash
git add -A public/sandtray/figures scripts/sandtray-figures.json package.json package-lock.json
git commit -m "chore(sandtray): clean up 2D figure churn, install three.js

Removes the ~21 uncommitted PNG attempts from public/sandtray/figures/
and the two throwaway helper scripts (sandtray-phosphor.py and
.sandtray-search.py). Resets scripts/sandtray-figures.json to an empty
list — the rembg pipeline in scripts/sandtray-figures.py stays
committed but is now dormant.

Installs three and @types/three as dependencies for the 3D rewrite.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md"
```

---

## Task 2: Three.js scaffold with a placeholder cube

Replace the current 2D canvas rendering loop with a Three.js scene containing nothing but a placeholder cube. Verify the pipeline end-to-end — renderer mounts, camera frames the scene, cube appears where expected — before touching sand or figures.

**Files:**
- Modify: `src/components/tools/Sandtray.astro` (swap the `SandRenderer` class contents and init for a Three.js scene)

**Rationale:** A known-good Three.js pipeline before any domain logic is added saves debugging time later. The cube is discarded in Task 3.

- [ ] **Step 1: Read the current SandRenderer class to understand what it exports**

```bash
sed -n '119,334p' src/components/tools/Sandtray.astro
```

Note the public surface that other code touches: constructor signature, `carve(x, y, radius, depth)`, `level()`, `clear()`, `render()`, and whatever the container / stage element lookups are.

- [ ] **Step 2: Add the Three.js imports at the top of the client script block**

In `src/components/tools/Sandtray.astro`, inside the existing `<script>` tag (the client-side block starting around line 117–118), add at the top:

```ts
import * as THREE from 'three';
```

- [ ] **Step 3: Replace the SandRenderer class body with a Three.js scene bootstrap**

Locate the existing `class SandRenderer {` declaration (around line 124). Replace the entire class with this skeleton that wires a Three.js scene to the existing `<canvas data-sandtray-canvas>` element:

```ts
class SandRenderer {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  cube: THREE.Mesh;
  width: number;
  height: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.width = canvas.clientWidth || 640;
    this.height = canvas.clientHeight || 384;

    // Renderer. preserveDrawingBuffer:true is required for toDataURL() capture later.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setClearColor(0xfdfbf7, 0); // cream, fully transparent (matches CLAUDE.md)

    // Scene
    this.scene = new THREE.Scene();

    // Orthographic camera, isometric-ish framing.
    // World space: tray is centred at origin, spans ~14 units wide × 10 deep.
    // Camera sits up and to the south-east, looking at origin.
    const aspect = this.width / this.height;
    const frustumSize = 12;
    this.camera = new THREE.OrthographicCamera(
      (-frustumSize * aspect) / 2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      -frustumSize / 2,
      0.1,
      100,
    );
    this.camera.position.set(9, 12, 9);
    this.camera.lookAt(0, 0, 0);

    // Directional light from upper-left, matching the old 2D directional shading.
    const dir = new THREE.DirectionalLight(0xffffff, 1.3);
    dir.position.set(-6, 10, 4);
    this.scene.add(dir);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // Placeholder cube so we can see the pipeline works at all.
    const geom = new THREE.BoxGeometry(2, 2, 2);
    const mat = new THREE.MeshStandardMaterial({ color: 0xc4a77d }); // wood-400
    this.cube = new THREE.Mesh(geom, mat);
    this.scene.add(this.cube);

    // Resize observer so the canvas scales with its container.
    const ro = new ResizeObserver(() => this.resize());
    ro.observe(canvas);

    // Start the render loop.
    this.renderer.setAnimationLoop(() => this.render());
  }

  resize(): void {
    const w = this.canvas.clientWidth || 640;
    const h = this.canvas.clientHeight || 384;
    if (w === this.width && h === this.height) return;
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const frustumSize = 12;
    this.camera.left = (-frustumSize * aspect) / 2;
    this.camera.right = (frustumSize * aspect) / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    // Gentle cube rotation so we can confirm the render loop is alive.
    this.cube.rotation.y += 0.01;
    this.renderer.render(this.scene, this.camera);
  }

  // Stubs so the existing bootstrap code still compiles.
  // These are filled in by later tasks.
  carve(_x: number, _y: number, _radius: number, _depth: number): void {
    // TODO Task 3: port carve math to write into the DataTexture height map.
  }

  level(): void {
    // TODO Task 3: reset the height map to noisy-flat.
  }

  clear(): void {
    // TODO Task 7: delegates to FigureManager to clear placed figures.
  }
}
```

- [ ] **Step 4: Stub out or comment out the existing `FigureLayer` class**

Locate the `class FigureLayer {` declaration (around line 347). For this task we just need the file to compile; FigureLayer stays defined but its methods can be no-ops for now. Replace its body with:

```ts
class FigureLayer {
  constructor(_container: HTMLElement, _canvas: HTMLCanvasElement, _renderer: SandRenderer) {
    // Stub. Rewritten in Task 5 as a 3D scene-graph-based FigureManager.
  }
  clear(): void {}
  addFigure(_figureId: string): void {}
}
```

- [ ] **Step 5: Verify the widget bootstrap still runs without errors**

Check that the bootstrap block (around line 565, `const widgets = document.querySelectorAll ...`) still passes its arguments correctly:

```bash
sed -n '565,700p' src/components/tools/Sandtray.astro
```

If the bootstrap still calls `new SandRenderer(canvas)` and `new FigureLayer(figContainer, canvas, renderer)`, it will work unchanged with the stubs.

- [ ] **Step 6: Run the build**

```bash
npm run build
```

Expected: Astro compiles without TypeScript errors. If there are errors about unused parameters, add `// eslint-disable-next-line @typescript-eslint/no-unused-vars` or prefix with underscores.

- [ ] **Step 7: Run the dev server and verify the cube renders**

```bash
npm run dev
```

Open the tool page (navigate the site to the sandtray tool). Expected: a wood-coloured cube rotating slowly inside the wooden tray frame. No sand yet, no figures, but the Three.js pipeline is proven. Kill dev server with Ctrl-C.

- [ ] **Step 8: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): swap 2D canvas for Three.js scene (placeholder cube)

First step of the 3D rewrite. Replaces the 2D SandRenderer and its
CanvasRenderingContext2D pipeline with a Three.js WebGLRenderer
attached to the same canvas element. Scene holds a placeholder cube,
an isometric OrthographicCamera from the south-east, a directional
light from the upper-left (matching the old 2D shading direction),
and a render loop via setAnimationLoop.

FigureLayer is stubbed; carve/level/clear are TODO. The bootstrap,
i18n strings, tray frame, and control buttons are untouched.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 2"
```

---

## Task 3: Sand mesh with height-map displacement and carving

Replace the placeholder cube with a subdivided `PlaneGeometry` whose vertices are displaced from a `DataTexture` height map. Port the old 2D carve math so dragging on the sand deforms it, and level() restores the initial state.

**Files:**
- Modify: `src/components/tools/Sandtray.astro` (`SandRenderer` class, carve pipeline)

**Math notes:**
- Height map is an `N×M` `Float32Array` (default 160×112), mirroring the old canvas resolution at about one value per 4 pixels of the old 384-pixel-tall canvas. Each value is a displacement in world-space units (meters).
- The height map is wrapped in a `THREE.DataTexture` with `type: FloatType`, `format: RedFormat`. The plane material is a custom `ShaderMaterial` whose vertex shader samples the texture and offsets `position.y` by the sampled value.
- Carving writes into the Float32Array and marks the texture `needsUpdate = true`. No per-pixel shading in the fragment shader — Three.js's built-in lighting does the work, because the plane's displaced vertices have normals computed per-frame via a helper.

**Why not a plain MeshStandardMaterial with `displacementMap`?** Because Three.js's `MeshStandardMaterial.displacementMap` does not update normals for a deformed plane at runtime without rebuilding the geometry, and the lighting ends up looking flat (the sand highlights don't follow the carves). A small custom vertex shader plus a manual normal recomputation after each carve is the cleanest path.

- [ ] **Step 1: Remove the placeholder cube**

In `SandRenderer`, delete the `cube` field declaration, remove the cube creation in the constructor, and remove `this.cube.rotation.y += 0.01;` from `render()`.

- [ ] **Step 2: Add sand-specific fields to the SandRenderer class**

Add to the class declaration, near the top:

```ts
// Sand height map. heightData[y*mapW + x] is displacement in world units.
static readonly MAP_W = 160;
static readonly MAP_H = 112;
// Tray dimensions in world units. The plane spans ±TRAY_W/2 in X and ±TRAY_H/2 in Z.
static readonly TRAY_W = 14;
static readonly TRAY_H = 10;

heightData: Float32Array;
heightTexture: THREE.DataTexture;
sand: THREE.Mesh;
sandGeometry: THREE.PlaneGeometry;
```

- [ ] **Step 3: Add a helper to create the initial noisy-flat height map**

Add this method to the class:

```ts
initHeightMap(): void {
  const W = SandRenderer.MAP_W;
  const H = SandRenderer.MAP_H;
  this.heightData = new Float32Array(W * H);
  // Faint sinusoidal noise, amplitude ~0.02 world units, to give the sand
  // some initial texture so it doesn't look like a flat green plate.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = (
        Math.sin(x * 0.21 + y * 0.13) * 0.010 +
        Math.sin(x * 0.07 - y * 0.19) * 0.008 +
        Math.cos(x * 0.33 + y * 0.05) * 0.006
      );
      this.heightData[y * W + x] = n;
    }
  }
}
```

- [ ] **Step 4: Add a helper to build the sand mesh and its shader material**

Add this method:

```ts
buildSand(): void {
  this.initHeightMap();

  this.heightTexture = new THREE.DataTexture(
    this.heightData,
    SandRenderer.MAP_W,
    SandRenderer.MAP_H,
    THREE.RedFormat,
    THREE.FloatType,
  );
  this.heightTexture.minFilter = THREE.LinearFilter;
  this.heightTexture.magFilter = THREE.LinearFilter;
  this.heightTexture.needsUpdate = true;

  // Highly subdivided plane so the vertex displacement has resolution.
  this.sandGeometry = new THREE.PlaneGeometry(
    SandRenderer.TRAY_W,
    SandRenderer.TRAY_H,
    SandRenderer.MAP_W - 1,
    SandRenderer.MAP_H - 1,
  );
  // Rotate the plane so it lies flat on the XZ plane (Y = up).
  this.sandGeometry.rotateX(-Math.PI / 2);

  // Custom ShaderMaterial that displaces vertices from the height texture.
  const sandMat = new THREE.ShaderMaterial({
    uniforms: {
      uHeight:    { value: this.heightTexture },
      uLightDir:  { value: new THREE.Vector3(-0.6, 1.0, 0.4).normalize() },
      uSandColor: { value: new THREE.Color(0xe2ceb1) }, // wood-300 tinted warmer
      uAmbient:   { value: 0.35 },
    },
    vertexShader: /* glsl */`
      uniform sampler2D uHeight;
      varying vec3 vNormalW;
      varying float vHeight;

      // Sobel-like normal reconstruction from the height texture.
      // Samples neighbours in texture space and builds a tangent-space normal.
      vec3 computeNormal(vec2 uv) {
        vec2 texel = vec2(1.0 / ${SandRenderer.MAP_W}.0, 1.0 / ${SandRenderer.MAP_H}.0);
        float hL = texture2D(uHeight, uv + vec2(-texel.x, 0.0)).r;
        float hR = texture2D(uHeight, uv + vec2( texel.x, 0.0)).r;
        float hD = texture2D(uHeight, uv + vec2(0.0, -texel.y)).r;
        float hU = texture2D(uHeight, uv + vec2(0.0,  texel.y)).r;
        // World-space step between samples (tray dimensions / map resolution).
        float dx = ${SandRenderer.TRAY_W.toFixed(4)} / ${SandRenderer.MAP_W}.0;
        float dz = ${SandRenderer.TRAY_H.toFixed(4)} / ${SandRenderer.MAP_H}.0;
        vec3 n = normalize(vec3((hL - hR) / (2.0 * dx), 1.0, (hD - hU) / (2.0 * dz)));
        return n;
      }

      void main() {
        vec2 flippedUv = vec2(uv.x, 1.0 - uv.y);
        float h = texture2D(uHeight, flippedUv).r;
        vec3 displaced = position + vec3(0.0, h, 0.0);
        vNormalW = computeNormal(flippedUv);
        vHeight = h;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3  uLightDir;
      uniform vec3  uSandColor;
      uniform float uAmbient;
      varying vec3  vNormalW;
      varying float vHeight;

      void main() {
        float ndotl = max(dot(normalize(vNormalW), normalize(uLightDir)), 0.0);
        float lit = uAmbient + ndotl * (1.0 - uAmbient);
        // Slight darken-with-depth for valleys, slight lift for ridges.
        float depthShade = clamp(0.5 + vHeight * 6.0, 0.85, 1.15);
        vec3 col = uSandColor * lit * depthShade;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  this.sand = new THREE.Mesh(this.sandGeometry, sandMat);
  this.scene.add(this.sand);
}
```

- [ ] **Step 5: Call buildSand() from the constructor**

In the constructor, after the lights are added and before the animation loop starts, replace the placeholder-cube block with:

```ts
this.buildSand();
```

- [ ] **Step 6: Implement carve() against the height map**

Replace the `carve(...)` stub in `SandRenderer` with:

```ts
/**
 * Lower the sand in a circular region.
 * x, z are in world space (the tray plane). radius is in world units.
 * depth is the maximum additional lowering at the centre of the brush (world units).
 */
carve(x: number, z: number, radius: number, depth: number): void {
  const W = SandRenderer.MAP_W;
  const H = SandRenderer.MAP_H;
  // Convert world (x, z) to map indices.
  const cx = ((x + SandRenderer.TRAY_W / 2) / SandRenderer.TRAY_W) * (W - 1);
  const cy = ((z + SandRenderer.TRAY_H / 2) / SandRenderer.TRAY_H) * (H - 1);
  // Convert world radius to map pixels (use the larger of the two axes for a conservative bound).
  const rPix = Math.max(
    (radius / SandRenderer.TRAY_W) * W,
    (radius / SandRenderer.TRAY_H) * H,
  );
  const rPix2 = rPix * rPix;

  const x0 = Math.max(0, Math.floor(cx - rPix));
  const x1 = Math.min(W - 1, Math.ceil(cx + rPix));
  const y0 = Math.max(0, Math.floor(cy - rPix));
  const y1 = Math.min(H - 1, Math.ceil(cy + rPix));

  for (let y = y0; y <= y1; y++) {
    for (let px = x0; px <= x1; px++) {
      const dx = px - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 > rPix2) continue;
      // Quadratic falloff from 1.0 at centre to 0.0 at edge.
      const falloff = 1 - d2 / rPix2;
      this.heightData[y * W + px] -= depth * falloff * falloff;
    }
  }
  this.heightTexture.needsUpdate = true;
}
```

- [ ] **Step 7: Implement level() to restore the initial noisy-flat state**

Replace the `level(...)` stub:

```ts
level(): void {
  this.initHeightMap();
  // initHeightMap wrote new values into a *new* Float32Array, which won't update
  // the texture. Copy them back into the texture's buffer so the existing
  // DataTexture sees the new data.
  const data = this.heightTexture.image.data as Float32Array;
  data.set(this.heightData);
  this.heightTexture.needsUpdate = true;
}
```

- [ ] **Step 8: Hook pointer events on the canvas to call carve()**

Inside the widget bootstrap block (around line 565), find the old pointer event wiring for the 2D canvas. Replace it with a Three.js raycaster hit-test against the sand:

```ts
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function canvasToWorld(evt: PointerEvent): { x: number; z: number } | null {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, renderer.camera);
  const hits = raycaster.intersectObject(renderer.sand, false);
  if (hits.length === 0) return null;
  const p = hits[0].point;
  return { x: p.x, z: p.z };
}

let isCarving = false;
canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  const w = canvasToWorld(e);
  if (!w) return;
  isCarving = true;
  canvas.setPointerCapture(e.pointerId);
  renderer.carve(w.x, w.z, 0.8, 0.12);
});
canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (!isCarving) return;
  const w = canvasToWorld(e);
  if (!w) return;
  renderer.carve(w.x, w.z, 0.8, 0.08);
});
canvas.addEventListener('pointerup', (e: PointerEvent) => {
  isCarving = false;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
});
canvas.addEventListener('pointercancel', () => { isCarving = false; });
```

- [ ] **Step 9: Wire the Level button to renderer.level()**

Find the existing `data-sandtray-level` button handler near line 734. It should already call `renderer.level()` — verify it does. If the old handler called a different method name, update it.

- [ ] **Step 10: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 11: Manually verify carving in the dev server**

```bash
npm run dev
```

Open the sandtray tool page. Expected:
1. Sand plane is visible, warm tan color, with subtle noise.
2. Dragging across the sand leaves a trench.
3. Trenches are shaded — lit on the upper-left edge, shadowed on the lower-right.
4. Clicking "Level the sand" resets the surface.
5. No errors in the browser console.

Kill dev server.

- [ ] **Step 12: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): 3D sand mesh with height-map carving

Replaces the placeholder cube with a subdivided PlaneGeometry whose
vertices are displaced from a Float32Array height map wrapped in a
DataTexture. Carve() writes into the array with a quadratic falloff
brush and flags the texture needsUpdate. Custom ShaderMaterial does
the per-pixel lighting, reconstructing normals from neighbour samples
so the Sobel-style shading follows the carves in real time.

Pointer events on the canvas raycast against the sand mesh and call
carve() at the world-space hit point. The Level button restores the
initial noisy-flat state.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 3"
```

---

## Task 4: Camera orbit with two-finger twist

Add a single degree of freedom to the camera: users can grab the tray with two fingers and twist to rotate the view around the Y axis. Pitch stays locked at the isometric angle. Zoom and pan are out of scope for v1.

**Files:**
- Modify: `src/components/tools/Sandtray.astro` (add camera yaw state and two-finger twist handler)

- [ ] **Step 1: Add a `cameraYaw` state field to `SandRenderer`**

Add to the class declaration:

```ts
cameraYaw: number = Math.PI * 0.25; // 45° so we start looking from the south-east
cameraDistance: number = 15;
cameraHeight: number = 12;
```

And replace the hard-coded camera position in the constructor with:

```ts
this.updateCamera();
```

- [ ] **Step 2: Add an `updateCamera()` method**

```ts
updateCamera(): void {
  const x = Math.sin(this.cameraYaw) * this.cameraDistance;
  const z = Math.cos(this.cameraYaw) * this.cameraDistance;
  this.camera.position.set(x, this.cameraHeight, z);
  this.camera.lookAt(0, 0, 0);
}

setYaw(yaw: number): void {
  this.cameraYaw = yaw;
  this.updateCamera();
}

nudgeYaw(delta: number): void {
  this.cameraYaw += delta;
  this.updateCamera();
}
```

- [ ] **Step 3: Wire a two-finger twist gesture on the canvas**

Inside the bootstrap block, below the carving pointer handlers added in Task 3, add a touch-pointer gesture state machine:

```ts
// Two-finger twist — rotate the tray around Y.
const activePointers = new Map<number, { x: number; y: number }>();
let twistStartAngle: number | null = null;
let twistStartYaw = 0;

function anglesFromPointers(): number | null {
  if (activePointers.size < 2) return null;
  const [a, b] = Array.from(activePointers.values());
  return Math.atan2(b.y - a.y, b.x - a.x);
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  // Two fingers down cancels any in-progress carving and starts the twist.
  if (activePointers.size === 2) {
    isCarving = false;
    twistStartAngle = anglesFromPointers();
    twistStartYaw = renderer.cameraYaw;
  }
});
canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (twistStartAngle !== null) {
      const a = anglesFromPointers();
      if (a !== null) {
        const delta = a - twistStartAngle;
        renderer.setYaw(twistStartYaw + delta);
      }
      return; // Don't also carve while twisting.
    }
  }
});
canvas.addEventListener('pointerup', (e: PointerEvent) => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) twistStartAngle = null;
});
canvas.addEventListener('pointercancel', (e: PointerEvent) => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) twistStartAngle = null;
});
```

**Important:** The twist handlers should be installed *after* the carve handlers from Task 3, and the twist `pointerdown` handler must zero out `isCarving` so one-finger carving doesn't continue while a second finger lands.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Verify in dev server**

```bash
npm run dev
```

Expected:
1. Single-finger/mouse drag still carves the sand.
2. On a touch device (or DevTools touch emulation), two-finger twist rotates the tray around Y. You can walk around the whole sandbox.
3. Letting go of one finger while the other remains stops the twist but resumes pointer tracking.
4. No carving happens while twisting.

- [ ] **Step 6: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): two-finger twist camera orbit around Y

Adds a single rotational degree of freedom to the isometric camera so
users can 'walk around' the tray by twisting two fingers on it (or
two-button mouse gestures). Pitch is still locked.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 4"
```

---

## Task 5: GLTFLoader, FigureManager, and loading one test model

Add the GLTFLoader, write a FigureManager class that loads, caches, and places 3D models into the scene, and prove it works end-to-end with exactly one KayKit model (the Knight) hard-coded for this task.

**Files:**
- Modify: `src/components/tools/Sandtray.astro` (add FigureManager, GLTFLoader import, test placement)
- Create: `public/sandtray/models/Knight.glb` (downloaded manually for this task; the full fetcher script is Task 6)

- [ ] **Step 1: Add the GLTFLoader import**

At the top of the client script block in `Sandtray.astro`, alongside the existing `import * as THREE from 'three'`:

```ts
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
```

Astro + Vite will resolve this from `node_modules/three/examples/jsm/...` automatically.

- [ ] **Step 2: Manually download one KayKit Knight model for testing**

```bash
mkdir -p public/sandtray/models
curl -sL "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb" \
  -o public/sandtray/models/Knight.glb
ls -la public/sandtray/models/Knight.glb
```

Expected: a ~200KB-2MB GLB file exists.

- [ ] **Step 3: Write the FigureManager class**

Delete the stub `FigureLayer` class from Task 2. Add a new `FigureManager` class below `SandRenderer`:

```ts
interface PlacedFigure {
  instanceId: string;
  figureId: string;
  group: THREE.Group;
  x: number;
  z: number;
  rotationY: number;
  scale: number;
}

class FigureManager {
  scene: THREE.Scene;
  renderer: SandRenderer;
  loader: GLTFLoader;
  cache: Map<string, THREE.Group> = new Map();
  placed: PlacedFigure[] = [];
  idCounter: number = 0;

  constructor(scene: THREE.Scene, renderer: SandRenderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.loader = new GLTFLoader();
  }

  /** Load a GLB file by path, caching the result. Returns a cloneable template group. */
  async loadTemplate(modelPath: string): Promise<THREE.Group> {
    const cached = this.cache.get(modelPath);
    if (cached) return cached;
    const gltf = await this.loader.loadAsync(modelPath);
    this.cache.set(modelPath, gltf.scene);
    return gltf.scene;
  }

  /** Place a new figure instance at the given world (x, z) position. */
  async place(figureId: string, modelPath: string, x: number, z: number, scale = 1): Promise<PlacedFigure> {
    const template = await this.loadTemplate(modelPath);
    const group = template.clone(true);
    // KayKit characters are ~1.8 units tall in the Y axis. Scale accordingly.
    group.scale.setScalar(scale);
    group.position.set(x, 0, z);
    group.rotation.y = 0;
    this.scene.add(group);

    const instance: PlacedFigure = {
      instanceId: `fig-${++this.idCounter}`,
      figureId,
      group,
      x,
      z,
      rotationY: 0,
      scale,
    };
    this.placed.push(instance);
    return instance;
  }

  clearAll(): void {
    for (const f of this.placed) this.scene.remove(f.group);
    this.placed = [];
  }
}
```

- [ ] **Step 4: Instantiate FigureManager in the bootstrap and place a Knight**

In the widget bootstrap (replace the old `FigureLayer` instantiation around line 634):

```ts
const figureManager = new FigureManager(renderer.scene, renderer);
// TEMPORARY: for this task we hard-code one Knight at the origin.
// Task 6 replaces this with palette-driven placement.
figureManager.place('knight', '/sandtray/models/Knight.glb', 0, 0, 1).catch((err) => {
  console.error('[sandtray] failed to load Knight model:', err);
});
```

- [ ] **Step 5: Wire the Clear button to FigureManager.clearAll()**

Find the `data-sandtray-clear` button handler near line 740. Update it to:

```ts
root.querySelector<HTMLButtonElement>('[data-sandtray-clear]')?.addEventListener('click', () => {
  figureManager.clearAll();
  renderer.level();
});
```

- [ ] **Step 6: Build**

```bash
npm run build
```

Expected: build succeeds. The Knight.glb file is now served as a static asset under `/sandtray/models/Knight.glb`.

- [ ] **Step 7: Verify in the dev server**

```bash
npm run dev
```

Expected:
1. A low-poly Knight character is standing in the middle of the sandtray.
2. The sand carving still works around the Knight.
3. Two-finger twist still rotates the camera; the Knight rotates with the scene correctly.
4. Clicking "Clear tray" removes the Knight and levels the sand.
5. No errors in the console. If GLTFLoader reports a warning about KHR_materials_unlit or similar extensions, that's fine — it's a recoverable warning.

- [ ] **Step 8: Commit**

```bash
git add src/components/tools/Sandtray.astro public/sandtray/models/Knight.glb
git commit -m "feat(sandtray): GLTFLoader + FigureManager + test Knight

Adds the three/examples GLTFLoader and a FigureManager class that
loads GLB templates, caches them by path, clones them for placement,
and removes them on clear. One test KayKit Knight model is hard-coded
at the origin so the pipeline is visibly proven end-to-end.

Model is sourced from KayKit-Character-Pack-Adventures-1.0 (CC0).
Task 6 replaces the hard-coded placement with palette-driven
placement and downloads the rest of the starter model set.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 5"
```

---

## Task 6: Model curation script + starter model set

Write a small Python script that downloads a curated list of CC0 GLB models from KayKit's GitHub releases and saves them under `public/sandtray/models/`. Populate the list with the ~15 starter models, run the script, verify every file lands cleanly.

**Files:**
- Create: `scripts/sandtray-models.json` (curated source list)
- Create: `scripts/sandtray-models.py` (fetcher)
- Modify: `public/sandtray/models/` (download target)
- Create: `public/sandtray/models/LICENSE.txt` (KayKit CC0 attribution)

- [ ] **Step 1: Write the starter source list**

Write `scripts/sandtray-models.json`:

```json
{
  "comment": "Curated starter list of CC0 low-poly 3D models for the sandtray. All models are from KayKit packs on GitHub (kaykit-game-assets). License: CC0-1.0, no attribution required, but we record attribution here and in public/sandtray/models/LICENSE.txt anyway. Categories follow the sandtrayFigures schema: people, animals, plants, earth, shelter.",
  "license": "CC0-1.0",
  "source_attribution": "KayKit by Kay Lousberg (https://kaylousberg.com/), CC0",
  "models": [
    {
      "id": "knight",
      "file": "Knight.glb",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb",
      "category": "people",
      "alt_en": "Knight",
      "alt_es": "Caballero",
      "defaultScale": 1.0
    },
    {
      "id": "mage",
      "file": "Mage.glb",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Mage.glb",
      "category": "people",
      "alt_en": "Mage",
      "alt_es": "Mago",
      "defaultScale": 1.0
    },
    {
      "id": "rogue",
      "file": "Rogue.glb",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue.glb",
      "category": "people",
      "alt_en": "Rogue",
      "alt_es": "Pícaro",
      "defaultScale": 1.0
    },
    {
      "id": "barbarian",
      "file": "Barbarian.glb",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Barbarian.glb",
      "category": "people",
      "alt_en": "Warrior",
      "alt_es": "Guerrero",
      "defaultScale": 1.0
    },
    {
      "id": "rogue-hooded",
      "file": "Rogue_Hooded.glb",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Rogue_Hooded.glb",
      "category": "people",
      "alt_en": "Traveler",
      "alt_es": "Viajero",
      "defaultScale": 1.0
    }
  ]
}
```

**Note on the initial list:** This is 5 models — only the People category. Task 7 runs the script, verifies these 5 load correctly, then the task expands the list into the other four categories before committing. We start narrow so we don't download 30 ZIPs if the pipeline is broken.

- [ ] **Step 2: Write the fetcher script**

Write `scripts/sandtray-models.py`:

```python
#!/usr/bin/env python3
"""
sandtray-models.py — one-time fetcher for sandtray 3D models.

Reads scripts/sandtray-models.json, downloads each entry's URL into
public/sandtray/models/<file>, and writes public/sandtray/models/LICENSE.txt
with the attribution block. Idempotent: re-running skips files that already
exist.

Also emits a TypeScript-formatted snippet of figure metadata ready to paste
into src/data/sandtrayFigures.ts.

Usage:
    python3 scripts/sandtray-models.py            # process all
    python3 scripts/sandtray-models.py <id> ...   # process specific entries
    python3 scripts/sandtray-models.py --check    # dry-run, list entries
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

REPO_ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = REPO_ROOT / "scripts" / "sandtray-models.json"
OUT_DIR = REPO_ROOT / "public" / "sandtray" / "models"
LICENSE_PATH = OUT_DIR / "LICENSE.txt"
USER_AGENT = (
    "SandtrayModelFetcher/1.0 "
    "(https://github.com/sean/traumaSite; sean@thingvalla.tech) "
    "educational trauma-therapy reference"
)


def load_sources() -> tuple[dict, list[dict]]:
    with open(JSON_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data, data.get("models", [])


def download(url: str, dest: Path) -> None:
    req = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "model/gltf-binary, */*"})
    with urlopen(req, timeout=60) as resp:
        dest.write_bytes(resp.read())


def write_license(meta: dict) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    LICENSE_PATH.write_text(
        "Sandtray 3D models\n"
        "==================\n\n"
        f"License: {meta.get('license', 'CC0-1.0')}\n"
        f"Attribution: {meta.get('source_attribution', 'unknown')}\n\n"
        "No UI-level attribution is required by CC0, but we record it here\n"
        "so future contributors know where the models came from.\n"
    )


def process_one(entry: dict) -> tuple[bool, str]:
    fig_id = entry["id"]
    file_name = entry["file"]
    url = entry["url"]
    out_path = OUT_DIR / file_name
    if out_path.exists() and out_path.stat().st_size > 0:
        return True, f"{fig_id}: cached ({out_path.stat().st_size // 1024} KB)"
    try:
        download(url, out_path)
    except HTTPError as e:
        return False, f"{fig_id}: HTTP {e.code} for {url}"
    except URLError as e:
        return False, f"{fig_id}: download failed: {e.reason}"
    except Exception as e:
        return False, f"{fig_id}: error: {e}"
    size_kb = out_path.stat().st_size // 1024
    return True, f"{fig_id}: ok ({size_kb} KB)"


def emit_ts_snippet(entries: list[dict]) -> str:
    """TS snippet for entries whose GLBs actually landed."""
    lines = []
    for e in entries:
        out_path = OUT_DIR / e["file"]
        if not out_path.exists():
            continue
        lines.append("  {")
        lines.append(f"    id: {json.dumps(e['id'])},")
        lines.append(f"    modelPath: '/sandtray/models/{e['file']}',")
        lines.append(
            f"    alt: {{ en: {json.dumps(e['alt_en'])}, "
            f"es: {json.dumps(e['alt_es'])} }},"
        )
        lines.append(f"    category: {json.dumps(e['category'])},")
        lines.append(f"    defaultScale: {e.get('defaultScale', 1.0)},")
        lines.append(f"    source: 'KayKit by Kay Lousberg (CC0)',")
        lines.append("  },")
    return "\n".join(lines)


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Fetch sandtray 3D models from CC0 sources.")
    parser.add_argument("ids", nargs="*", help="If given, only process these ids.")
    parser.add_argument("--check", action="store_true",
                        help="Dry run: list entries, do nothing.")
    args = parser.parse_args(argv[1:])

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    meta, sources = load_sources()
    if not sources:
        print(f"No models listed in {JSON_PATH}.")
        return 0

    write_license(meta)

    if args.check:
        for e in sources:
            print(f"  {e['id']:20s} [{e['category']:8s}] {e['alt_en']:15s} <- {e['url']}")
        print(f"\nTotal: {len(sources)} models listed.")
        return 0

    targets = sources
    if args.ids:
        targets = [e for e in sources if e["id"] in args.ids]
        if not targets:
            print(f"No matching ids: {args.ids}")
            return 1

    ok = 0
    fails = []
    for e in targets:
        success, msg = process_one(e)
        print(f"{'OK  ' if success else 'FAIL'}  {msg}")
        if success:
            ok += 1
        else:
            fails.append(e["id"])

    print(f"\nProcessed {ok}/{len(targets)} successfully.")
    if fails:
        print(f"Failed: {', '.join(fails)}")

    print("\n----- TS snippet (paste into src/data/sandtrayFigures.ts) -----")
    print(emit_ts_snippet(targets))
    return 0 if ok == len(targets) else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
```

- [ ] **Step 3: Run the script against the initial 5 People entries**

```bash
python3 scripts/sandtray-models.py
```

Expected:
- 5 "OK" lines, each reporting a file of 100KB–2MB.
- `public/sandtray/models/` now contains Knight.glb, Mage.glb, Rogue.glb, Barbarian.glb, Rogue_Hooded.glb, and LICENSE.txt.
- A TS snippet for 5 entries is printed at the end.

If any download fails, fix the URL in `scripts/sandtray-models.json` and rerun.

- [ ] **Step 4: Expand the list with ~10 more entries across the other four categories**

Open `scripts/sandtray-models.json` and add the following entries to the `models` array (before the closing `]`). Verify each URL resolves in a browser or with `curl -sI` before adding. If any URL 404s, substitute another file from the same pack by looking up candidates with:

```bash
curl -sL "https://api.github.com/repos/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/git/trees/main?recursive=1" -A "test/1.0" | python3 -c "import json,sys; d=json.load(sys.stdin); [print(t['path']) for t in d['tree'] if t['path'].endswith('.gltf')]"
```

**Animals (3)** — NOTE: KayKit does not have a mainstream cartoon animal pack on GitHub. Use placeholder entries that reference the Adventures pack's creatures or skip animals in v1. Add this note to the JSON comment. Example placeholder animal entries:

```json
,
    {
      "id": "building-cottage",
      "file": "building_A.gltf",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/Assets/gltf/building_A.gltf",
      "category": "shelter",
      "alt_en": "Cottage",
      "alt_es": "Cabaña",
      "defaultScale": 0.8
    },
    {
      "id": "building-house",
      "file": "building_B.gltf",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/Assets/gltf/building_B.gltf",
      "category": "shelter",
      "alt_en": "House",
      "alt_es": "Casa",
      "defaultScale": 0.8
    },
    {
      "id": "building-tower",
      "file": "building_C.gltf",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/Assets/gltf/building_C.gltf",
      "category": "shelter",
      "alt_en": "Tower",
      "alt_es": "Torre",
      "defaultScale": 0.8
    },
    {
      "id": "plant-bush",
      "file": "bush.gltf",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/Assets/gltf/bush.gltf",
      "category": "plants",
      "alt_en": "Bush",
      "alt_es": "Arbusto",
      "defaultScale": 1.0
    },
    {
      "id": "earth-streetlight",
      "file": "streetlight.gltf",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/Assets/gltf/streetlight.gltf",
      "category": "shelter",
      "alt_en": "Lamp post",
      "alt_es": "Farol",
      "defaultScale": 0.8
    },
    {
      "id": "earth-watertower",
      "file": "watertower.gltf",
      "url": "https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/main/Assets/gltf/watertower.gltf",
      "category": "shelter",
      "alt_en": "Water tower",
      "alt_es": "Torre de agua",
      "defaultScale": 0.8
    }
```

**Important:** GLTF files from the City Builder pack depend on separate `.bin` and texture files. When adding these, the fetcher needs to pull the companion files too. **If the script is only downloading the .gltf without the .bin, the models will fail to load at runtime.** Before moving on, verify one building loads end-to-end in the dev server — if not, fall back to the Adventures pack's `.glb` files (which are self-contained binary GLBs) and accept a smaller starter set.

**Risk to call out in the commit message:** Animal coverage is thin in KayKit's GitHub mirror. v1 of the 3D sandtray ships without dedicated animal models; the People category carries the "character" weight using the Adventures fantasy archetypes. We'll add an animal pack in a follow-up milestone (candidate sources: Quaternius scraping, or commission custom models).

- [ ] **Step 5: Rerun the script with the expanded list**

```bash
python3 scripts/sandtray-models.py
```

Expected: all entries land (or the ones that don't are removed from the JSON before moving on). Cleanly skip files that already exist (idempotence).

- [ ] **Step 6: Commit the script, JSON, and downloaded models**

```bash
git add scripts/sandtray-models.py scripts/sandtray-models.json public/sandtray/models/
git commit -m "build(sandtray): model fetcher + starter KayKit set

Adds scripts/sandtray-models.py, a one-time fetcher that reads
scripts/sandtray-models.json and downloads CC0 GLB/GLTF models into
public/sandtray/models/. Populates the JSON with 5 People entries
(KayKit Adventures characters: Knight, Mage, Rogue, Barbarian,
Rogue_Hooded) plus Shelter and Plants entries from the City Builder
pack. Writes LICENSE.txt with the CC0 attribution.

Animals category is thin because KayKit does not have a mainstream
cartoon animal pack on GitHub. Deferred to a follow-up milestone.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 6"
```

---

## Task 7: Populate sandtrayFigures.ts and wire the palette to FigureManager

Port the downloaded model metadata into `src/data/sandtrayFigures.ts`, update the schema to reference `modelPath` instead of `src`, replace the hard-coded Knight placement from Task 5 with palette-driven tap-to-place, and verify everything renders.

**Files:**
- Modify: `src/data/sandtrayFigures.ts` (schema + data)
- Modify: `src/components/tools/Sandtray.astro` (palette wiring, FigureManager usage)

- [ ] **Step 1: Update the SandtrayFigure schema**

Open `src/data/sandtrayFigures.ts` and replace the `SandtrayFigure` interface and validator with this version. The `src` field becomes `modelPath`.

```ts
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
```

Update the validator:

```ts
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
```

Update the doc comment and the `sandtrayFigures` array comment to reference GLB models instead of PNG figures.

- [ ] **Step 2: Populate `sandtrayFigures` from the TS snippet emitted by the fetcher**

Run the fetcher in dry-mode to regenerate the snippet:

```bash
python3 scripts/sandtray-models.py --check
python3 scripts/sandtray-models.py 2>&1 | sed -n '/----- TS snippet/,$p'
```

Copy the TS snippet block into `src/data/sandtrayFigures.ts`, replacing the empty `export const sandtrayFigures: SandtrayFigure[] = [];` with the populated array.

- [ ] **Step 3: Remove the hard-coded Knight placement from the Task 5 bootstrap**

In the `Sandtray.astro` bootstrap, delete the line:

```ts
figureManager.place('knight', '/sandtray/models/Knight.glb', 0, 0, 1).catch(...);
```

- [ ] **Step 4: Build the palette DOM from `sandtrayFigures`**

At the top of the Astro component frontmatter (not the client script), import `sandtrayFigures` alongside `sandtrayCategories`:

```ts
import { sandtrayCategories, sandtrayFigures } from '../../data/sandtrayFigures';
```

Find the existing `data-sandtray-palette` element (around line 81). Replace its contents with a static rendering of the figure list, grouped by category:

```astro
<div data-sandtray-palette class="mt-3 overflow-x-auto">
  {sandtrayCategories.map((cat) => (
    <div class="mb-2">
      <div class="text-xs font-semibold text-wood-200 uppercase tracking-wide">
        {cat.label[lang]}
      </div>
      <div class="flex gap-2 mt-1">
        {sandtrayFigures
          .filter((f) => f.category === cat.key)
          .map((f) => (
            <button
              type="button"
              data-sandtray-palette-item={f.id}
              data-model-path={f.modelPath}
              data-default-scale={f.defaultScale}
              class="px-3 py-2 bg-wood-100 text-charcoal rounded-md border border-wood-300 text-sm hover:bg-wood-200"
              aria-label={f.alt[lang]}
            >
              {f.alt[lang]}
            </button>
          ))}
      </div>
    </div>
  ))}
</div>
```

(Initial palette is text-label buttons. Thumbnail rendering is out of scope for this task; Task 8 or a later pass can add renderer previews.)

- [ ] **Step 5: Wire tap-to-place in the client script**

Inside the bootstrap block, below the `figureManager` instantiation, add:

```ts
let pendingFigure: { figureId: string; modelPath: string; scale: number } | null = null;

// Highlight the currently-selected palette button.
function setPendingFigure(el: HTMLButtonElement | null): void {
  root.querySelectorAll<HTMLButtonElement>('[data-sandtray-palette-item]').forEach((b) => {
    b.setAttribute('aria-pressed', 'false');
    b.classList.remove('bg-forest-500', 'text-white');
  });
  if (el) {
    el.setAttribute('aria-pressed', 'true');
    el.classList.add('bg-forest-500', 'text-white');
    pendingFigure = {
      figureId: el.getAttribute('data-sandtray-palette-item') || '',
      modelPath: el.getAttribute('data-model-path') || '',
      scale: parseFloat(el.getAttribute('data-default-scale') || '1'),
    };
  } else {
    pendingFigure = null;
  }
}

root.querySelectorAll<HTMLButtonElement>('[data-sandtray-palette-item]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const already = btn.getAttribute('aria-pressed') === 'true';
    setPendingFigure(already ? null : btn);
  });
});
```

- [ ] **Step 6: Route a single-finger tap on the sand to figure placement when a figure is pending**

Modify the existing carve pointer handler to branch on `pendingFigure`:

```ts
canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size >= 2) {
    // Two fingers → twist (Task 4). Already handled below.
    return;
  }
  const w = canvasToWorld(e);
  if (!w) return;
  if (pendingFigure) {
    // Tap-to-place mode.
    figureManager.place(
      pendingFigure.figureId,
      pendingFigure.modelPath,
      w.x,
      w.z,
      pendingFigure.scale,
    ).catch((err) => console.error('[sandtray] place failed:', err));
    setPendingFigure(null);
    return;
  }
  // Otherwise: carve.
  isCarving = true;
  canvas.setPointerCapture(e.pointerId);
  renderer.carve(w.x, w.z, 0.8, 0.12);
});
```

- [ ] **Step 7: Build**

```bash
npm run build
```

Expected: build passes. If `validateSandtrayFigures()` throws (e.g. a modelPath doesn't end in `.glb`), fix the offending entry in `sandtrayFigures.ts` and rebuild.

- [ ] **Step 8: Dev verification**

```bash
npm run dev
```

Expected:
1. Sand renders as before.
2. The palette under the tray shows buttons grouped by category (People, Trees & Plants, Earth & Water, Shelter & Symbols — Animals is empty for v1).
3. Tapping a palette button highlights it (`aria-pressed=true`).
4. Tapping the sand with a pending figure places a 3D model at that point and clears the selection.
5. Placed models persist while the user carves around them.
6. Two-finger twist still orbits.
7. Clear button removes all placed models and levels the sand.

- [ ] **Step 9: Commit**

```bash
git add src/data/sandtrayFigures.ts src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): palette-driven tap-to-place for 3D figures

Updates the sandtrayFigures schema to reference modelPath instead of
src, populates it with the ~11 starter models from the KayKit fetch
(Task 6), removes the hard-coded Knight from Task 5, and wires up
the palette: tap a palette button to select a figure, tap the sand
to place it. The first tap after selection places; selection clears
automatically. Two-finger twist still rotates the view. Carving runs
whenever no figure is pending.

Animals category is empty in v1 per the Task 6 note.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 7"
```

---

## Task 8: Drag placed figures, remove, witness mode, capture

Let users move, remove, and capture placed figures. Rebuild the witness-mode step-back and the PNG capture around Three.js's WebGL surface.

**Files:**
- Modify: `src/components/tools/Sandtray.astro`

- [ ] **Step 1: Add drag state to the bootstrap**

Inside the bootstrap below the pendingFigure state, add:

```ts
let draggingFigure: PlacedFigure | null = null;

function findFigureAtPointer(evt: PointerEvent): PlacedFigure | null {
  const rect = canvas.getBoundingClientRect();
  ndc.x = ((evt.clientX - rect.left) / rect.width) * 2 - 1;
  ndc.y = -((evt.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(ndc, renderer.camera);
  // Raycast against every placed figure's group. Take the first hit.
  for (const fig of figureManager.placed) {
    const hits = raycaster.intersectObject(fig.group, true);
    if (hits.length > 0) return fig;
  }
  return null;
}
```

**Note:** `PlacedFigure` is the type declared in Task 5 as an interface inside the `FigureManager` class file scope. If it's scoped inside the class, export it up a level (move the interface declaration out of the class body and into module scope).

- [ ] **Step 2: Extend the pointerdown handler to pick up figures for dragging**

Modify the pointerdown handler again:

```ts
canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (activePointers.size >= 2) return;

  // Placement mode: single-tap places the pending figure.
  const w = canvasToWorld(e);
  if (pendingFigure && w) {
    figureManager.place(
      pendingFigure.figureId,
      pendingFigure.modelPath,
      w.x,
      w.z,
      pendingFigure.scale,
    ).catch((err) => console.error('[sandtray] place failed:', err));
    setPendingFigure(null);
    return;
  }

  // Drag existing figure?
  const hit = findFigureAtPointer(e);
  if (hit) {
    draggingFigure = hit;
    canvas.setPointerCapture(e.pointerId);
    return;
  }

  // Otherwise carve.
  if (!w) return;
  isCarving = true;
  canvas.setPointerCapture(e.pointerId);
  renderer.carve(w.x, w.z, 0.8, 0.12);
});
```

- [ ] **Step 3: Extend pointermove to update dragged figure position**

```ts
canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }
  if (twistStartAngle !== null) {
    const a = anglesFromPointers();
    if (a !== null) renderer.setYaw(twistStartYaw + (a - twistStartAngle));
    return;
  }
  if (draggingFigure) {
    const w = canvasToWorld(e);
    if (!w) return;
    draggingFigure.x = w.x;
    draggingFigure.z = w.z;
    draggingFigure.group.position.set(w.x, 0, w.z);
    return;
  }
  if (isCarving) {
    const w = canvasToWorld(e);
    if (!w) return;
    renderer.carve(w.x, w.z, 0.8, 0.08);
  }
});
```

- [ ] **Step 4: Extend pointerup to release drag state**

```ts
canvas.addEventListener('pointerup', (e: PointerEvent) => {
  activePointers.delete(e.pointerId);
  if (activePointers.size < 2) twistStartAngle = null;
  if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
  draggingFigure = null;
  isCarving = false;
});
```

- [ ] **Step 5: Wire double-click / Delete key to remove a figure**

Add a `removeFigure` method to `FigureManager`:

```ts
remove(instanceId: string): void {
  const idx = this.placed.findIndex((f) => f.instanceId === instanceId);
  if (idx < 0) return;
  this.scene.remove(this.placed[idx].group);
  this.placed.splice(idx, 1);
}
```

And in the bootstrap:

```ts
canvas.addEventListener('dblclick', (e: MouseEvent) => {
  // Reuse findFigureAtPointer by casting the MouseEvent shape.
  const hit = findFigureAtPointer(e as unknown as PointerEvent);
  if (hit) figureManager.remove(hit.instanceId);
});
```

- [ ] **Step 6: Rewrite witness mode for 3D**

Witness mode in the 2D version stepped the camera back by adjusting CSS transforms. In 3D, step-back means changing the camera's `frustumSize` (orthographic zoom) to a larger value.

Add to `SandRenderer`:

```ts
isStepped: boolean = false;
baseFrustumSize: number = 12;
steppedFrustumSize: number = 18;

stepBack(): void {
  this.isStepped = true;
  this.updateZoom(this.steppedFrustumSize);
}

stepIn(): void {
  this.isStepped = false;
  this.updateZoom(this.baseFrustumSize);
}

toggleStep(): boolean {
  if (this.isStepped) {
    this.stepIn();
    return false;
  }
  this.stepBack();
  return true;
}

private updateZoom(frustumSize: number): void {
  const aspect = this.width / this.height;
  this.camera.left = (-frustumSize * aspect) / 2;
  this.camera.right = (frustumSize * aspect) / 2;
  this.camera.top = frustumSize / 2;
  this.camera.bottom = -frustumSize / 2;
  this.camera.updateProjectionMatrix();
}
```

Update the frustumSize literal in `resize()` to use the current base/stepped value.

In the bootstrap, wire the witness button:

```ts
const witnessBtn = root.querySelector<HTMLButtonElement>('[data-sandtray-witness]');
witnessBtn?.addEventListener('click', () => {
  const stepped = renderer.toggleStep();
  witnessBtn.textContent = stepped ? i18n.returnToTray : i18n.stepBack;
});
```

- [ ] **Step 7: Rewrite capture for Three.js**

In the bootstrap, wire the capture button:

```ts
root.querySelector<HTMLButtonElement>('[data-sandtray-capture]')?.addEventListener('click', () => {
  // Force one render so the back buffer is current before we read it.
  renderer.renderer.render(renderer.scene, renderer.camera);
  const dataUrl = renderer.renderer.domElement.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'sandtray.png';
  a.click();
});
```

**Note:** `preserveDrawingBuffer: true` was set in Task 2, which is required for `toDataURL()` to return pixels instead of a blank image.

- [ ] **Step 8: Build**

```bash
npm run build
```

- [ ] **Step 9: Dev verification**

Verify each interaction manually:
1. Tap a palette item → tap sand → figure lands.
2. Drag a placed figure → it follows the cursor along the sand plane.
3. Double-click a figure → it's removed.
4. Two-finger twist → camera orbits.
5. Carving still works on empty sand.
6. Witness button steps the camera back; pressing again returns to normal.
7. Capture button downloads a PNG of the current tray state.

- [ ] **Step 10: Commit**

```bash
git add src/components/tools/Sandtray.astro
git commit -m "feat(sandtray): drag, remove, witness, capture — full 3D interaction

Placed figures can now be dragged across the sand with pointer events,
removed via double-click, and the witness button steps the camera back
by widening the orthographic frustum. Capture calls toDataURL on the
WebGL back buffer and downloads a PNG. All four controls from the
Task 5 shell of the old 2D plan (witness/level/clear/capture) are now
implemented for 3D.

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 8"
```

---

## Task 9: Update content (how-to-use) files

Update the user-facing markdown content for the sandtray tool to describe the 3D interactions.

**Files:**
- Modify: `src/content/tools/sandtray.md`
- Modify: `src/content/tools/sandtray.es.md`

- [ ] **Step 1: Read the current English content**

```bash
cat src/content/tools/sandtray.md
```

Identify the "How to use it" section.

- [ ] **Step 2: Replace the how-to-use section with 3D interactions**

In `src/content/tools/sandtray.md`, replace the how-to-use section with (adapt wording to the existing tone of the file):

```markdown
## How to use it

1. **Carve the sand.** Drag one finger across empty sand to press grooves into it. Real light from the upper-left catches the ridges so the sand feels tangible.
2. **Place figures.** Tap a figure in the palette below the tray, then tap the sand where you want it. The figure lands as a small 3D model — a knight, a tree, a cottage — you can arrange like toys on a real sandtray.
3. **Move a figure.** Drag any placed figure to slide it across the sand.
4. **Remove a figure.** Double-tap it.
5. **Walk around the tray.** Pinch-twist with two fingers to rotate the camera. The sand, the carvings, and the figures all rotate together — the tray turns, not the figures.
6. **Step back.** Tap **Step back** to widen the view and see the whole tray from further away. Tap it again to return.
7. **Level the sand.** Tap **Level the sand** to reset the surface without removing figures.
8. **Clear everything.** Tap **Clear tray** to remove all figures and level the sand.
9. **Save a picture.** Tap **Save image** to download a PNG of the current tray.
```

- [ ] **Step 3: Mirror the same content into the Spanish version**

Translate the above into `src/content/tools/sandtray.es.md`, preserving the numbering and the bold keywords.

- [ ] **Step 4: Build**

```bash
npm run build
```

Expected: both language versions of the page build without errors.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/sandtray.md src/content/tools/sandtray.es.md
git commit -m "docs(sandtray): rewrite how-to-use for 3D interactions

Plan: docs/superpowers/plans/2026-04-09-sandtray-3d-rewrite.md Task 9"
```

---

## Task 10: Final verification

Walk the acceptance criteria from the spec one more time against the rewritten tool, run the build, commit any small fixes, stop.

**Files:**
- None (verification only)

- [ ] **Step 1: Walk the acceptance criteria**

Start the dev server:

```bash
npm run dev
```

Run through this checklist in the browser:

- [ ] Sand has visible procedural texture before any interaction.
- [ ] Dragging on sand carves grooves with directional shading that updates as you move.
- [ ] A 3D figure can be placed by tapping a palette button then the sand.
- [ ] A placed figure can be dragged to a new position.
- [ ] A placed figure can be removed by double-clicking it.
- [ ] Two-finger twist rotates the tray 360° around Y.
- [ ] Witness button steps the camera back and returns.
- [ ] Level button resets the sand without removing figures.
- [ ] Clear button removes all figures and levels the sand.
- [ ] Save image downloads a PNG containing sand + figures.
- [ ] No console errors during any of the above.
- [ ] Spanish version of the tool page has translated how-to-use content.
- [ ] Palette groups figures by the five categories (Animals may be empty).
- [ ] Page passes `npm run build` with no errors.

- [ ] **Step 2: Touch device sanity check**

In DevTools, switch to touch emulation (or use a real touch device) and repeat carving, placement, drag, twist.

- [ ] **Step 3: Final build**

```bash
npm run build
```

- [ ] **Step 4: Commit any small fixes**

If Steps 1–3 surfaced small bugs (typos, off-by-one, CSS), commit them with a concise message:

```bash
git add -u
git commit -m "fix(sandtray): small fixups from final verification pass"
```

- [ ] **Step 5: Stop**

The sandtray 3D rewrite is complete for v1. Animals category is still empty — that's a known follow-up. Report back with the list of commits produced by this plan.

---

## Follow-up / out-of-scope

Not handled in this plan, captured for a future milestone:

- **Animal models.** KayKit doesn't have an animal pack on GitHub. Candidates: scrape Quaternius's website, commission models, or integrate an animal-specific CC0 pack from Poly.pizza.
- **Rotation and scale gestures for individual figures.** Basic drag is in; per-figure rotate (long-press-and-drag) and per-figure pinch-scale are deferred. Tasks 5 and 8 leave hooks for them in `PlacedFigure.rotationY` and `.scale`.
- **Sand depression under placed figures.** Currently figures sit on the sand's nominal Y=0 plane. The old 2D plan had a plan for figure-induced depression; porting that to 3D means reading the height map at the figure's (x, z) and setting the figure's Y to match. Deferred — ship without it, come back if it looks wrong.
- **Figure-casting shadows onto the sand.** Three.js supports real-time shadows but they add GPU cost. Deferred; ambient + directional light without shadow maps is enough for v1.
- **Keyboard accessibility.** The 2D plan had Tab-to-focus-figure and arrow-key nudging. Deferred to follow-up; screen readers still get `aria-label` on palette buttons.
- **Thumbnail renders for palette buttons.** The palette currently shows text labels. A proper palette would render each GLB to a small 2D preview at build time. Deferred.
