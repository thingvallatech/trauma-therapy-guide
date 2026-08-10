# Tool Audio & Visual Customization — Design

**Date:** 2026-08-09
**Status:** Approved for planning
**Scope:** All 12 interactive tool widgets + 4 new shared modules

---

## 1. Problem

The interactive tools are minimally customizable and inconsistent with each other.

**Audio.** Only 2 of 12 tools produce sound (`BLSAudio`, `BLSCombined`). Both use a bare
sine oscillator hard-panned to ±1, with pulses fired from inside the `requestAnimationFrame`
callback — so audio timing jitters with frame drops. Pan depth is not adjustable. Timbre is
not adjustable. There is no ambient sound layer of any kind.

**Visual.** The BLS visual is a single DOM `<div>` circle traversing a horizontal path on a
hardcoded `bg-black` track. No alternative motion paths, no trail, no glow, no background
control.

**Reduced motion is handled four different ways** across the codebase, and none of them
respond to the setting changing at runtime:

| Approach | Files |
|---|---|
| `window.matchMedia(...).matches`, read once at init | `BreathPacer:110`, `ButterflyHug:85`, `Sandtray:288` |
| Same, but only to display a "use a different tool" notice | `BLSVisual:120`, `BLSCombined:121` |
| Tailwind `motion-reduce:` variant | `Lightstream:103` |
| Not handled | Grounding, Container, SafePlace, FeelingWheel, SUDScale, VOCScale |

**Colors are stored in four incompatible formats**, so no theming is possible today:
Tailwind utility classes (most tools); inline SVG hex (`ButterflyHug:44,50,53` — `#C4A77D`,
`#8A7049`); hex embedded in the i18n data structure (`FeelingWheel:21-51` — six emotion
colors, duplicated in the Spanish block at `65-95`); and three.js shader uniforms
(`Sandtray:349-359`).

**Nothing persists.** There is no `localStorage` usage anywhere in the repository. A clinician
running the same protocol weekly re-configures every slider from defaults every session.

**Two structural duplications** make a 12-tool change more expensive than it needs to be:

- The `componentName → Component` map is duplicated in **four** route files:
  `src/pages/tools/[slug].astro:37-56`, `src/pages/tools/[slug]/fullscreen.astro:20-52`,
  `src/pages/es/tools/[slug].astro:40-44`, and `src/pages/es/tools/[slug]/fullscreen.astro`.
  Adding or changing a widget currently means four synchronized edits.
- Safety warnings exist twice: in each tool's markdown `warnings[]` frontmatter (rendered by
  `ToolShell`, which the fullscreen route never uses) and again hand-copied into each
  widget's local `t = {en, es}` object (which is what actually renders in fullscreen).

---

## 2. Goals / Non-goals

**Goals**
- A shared audio engine with correct scheduling, adjustable pan depth, selectable timbre, and
  an optional ambient layer (noise / drone / binaural beats).
- A shared visual engine with multiple motion paths, target styling, trails, and full
  background/foreground color control.
- Persisted per-tool preferences with built-in clinical presets and user-saved presets.
- One consistent, accessible settings surface across tools, scaled to what each tool needs.
- Reduced motion becomes a usable *mode*, not a dead end.

**Non-goals**
- No accounts, no server, no database. Preferences are local-only, consistent with the
  project's existing stance.
- No therapeutic claims attached to binaural beats (see §4.4).
- No redesign of Sandtray's control UI (see §6, Tier D).

---

## 3. Architecture

```
src/scripts/
  bls-clock.ts        # replaces bls-timer.ts — pluggable time source, predictable beat times
  audio-engine.ts     # graph, lookahead scheduler, voices, ambient bed
  visual-engine.ts    # path functions, canvas renderer, target styles
  tool-prefs.ts       # versioned localStorage, presets, defaults
  motion-pref.ts      # live prefers-reduced-motion observer

src/components/tools/
  ToolSettings.astro  # shared collapsible settings panel

src/data/
  tool-presets.ts     # built-in presets + per-tool tier map

src/lib/
  tool-widgets.ts     # single componentName → Component map (deduped)
```

### 3.1 The clock, and why it is the crux

The central technical problem: **audio must be scheduled ahead of time on the audio clock,
but visuals render on `requestAnimationFrame`.** If each keeps its own phase, they drift
apart and the tone stops landing when the dot hits the edge — which is the entire point of
the combined tool.

Resolution: **a single clock owns phase, and audio is authoritative when it exists.**

`bls-clock.ts` accumulates phase against a pluggable time source — `ctx.currentTime` when an
AudioContext is live, `performance.now() / 1000` otherwise. Both consumers read from it:

- The **visual renderer** calls `getPhase()` once per rAF frame.
- The **audio scheduler** calls `beatTimeFor(k)` to compute exactly when future beats land,
  and schedules them ~100ms ahead.

Because speed is piecewise-constant between slider changes, future beat times are solvable in
closed form. With `cycles(t) = cyclesAtBase + (t − tBase) · hz`, beat *k* occurs at:

```
t_k = tBase + (k/2 − cyclesAtBase) / hz
```

On a speed change, the clock rebases (`cyclesAtBase`/`tBase` update to now, preserving current
phase — no jump), and the scheduler **cancels any queued-but-unplayed audio events and
re-derives them**. This is the one piece of genuinely subtle logic in the design and needs a
test.

The existing `MAX_FRAME_DELTA` clamp against backgrounded-tab catch-up bursts is preserved.

### 3.2 Audio graph

```
bls voice ──→ voiceGain ──→ panner ─────┐
                                        ├──→ master ──→ limiter ──→ destination
noise / drone / binaural ──→ ambGain ───┘
```

**Scheduler.** `setTimeout` loop at 25ms, scheduling 100ms ahead against `ctx.currentTime`
(the standard "two clocks" pattern). rAF is responsible for visuals only.

**Pan depth (0–100%), new.** Hard ±1 is fatiguing for many clients; ~70% is a common clinical
preference. Currently not adjustable.

**Pan mode, new.**
- `discrete` — a pulse at each edge (today's behavior).
- `sweep` — a sustained voice panning continuously with the target, driven by
  `panner.pan.setTargetAtTime` so it never clicks.

**Voices** replace the raw "Tone (Hz)" slider as the primary control (pitch remains adjustable
underneath): `tone` (pure sine, preserves current behavior), `chime`, `woodblock`, `marimba`,
`bell`, `pluck`. Each is a function `(ctx, dest, when, params) => void` that builds a short
self-terminating graph. **Each must disconnect its nodes on `ended`** — the current
`playBlsPulse` (`bls-timer.ts:113-131`) never disconnects.

**Ambient bed** — independent of BLS, available to any tool:
- **Noise**: white, pink, brown. Generated once into a looping `AudioBuffer` using the Kellett
  pink algorithm and a leaky integrator for brown — correct −3dB and −6dB per octave slopes,
  not a gain trick, and zero runtime filter cost.
- **Drone**: soft detuned pad.
- **Binaural**: two oscillators routed through a `ChannelMergerNode` (one per ear, true
  channel isolation). Base pitch plus a 0.5–12Hz offset.

**Master limiter** — a `DynamicsCompressorNode` (threshold −6dB, ratio 20, attack 3ms,
release 250ms) so no combination of BLS + ambient + binaural can clip into headphones.

**All gain changes ramp** via `setTargetAtTime` (~20ms constant). Never assign `.value` on a
sounding node.

**Autoplay policy preserved**: the `AudioContext` is constructed lazily on the first user
gesture and suspended on stop, exactly as `BLSAudio:123-124` does today.

### 3.3 Visual engine

**Path functions** map phase → normalized `{x, y}` in `[-1, 1]`, preserving the existing
convention that phase 0 is the **left** edge:

| Path | Definition (t = 2πp) |
|---|---|
| `horizontal` | `x = −cos t`, `y = 0` (today's behavior) |
| `infinity` | Gerono lemniscate: `x = −cos t`, `y = −sin(2t)/2` — the classic light-bar figure-8 |
| `arc` | `x = −cos t`, `y = a(x² − 1)` — shallow smile |
| `diagonal` | `x = −cos t`, `y = −cos t · slope` |
| `wave` | `x = −cos t`, `y = amp · sin(4πp)` |

All paths put horizontal extremes at p=0 and p=0.5, so beat events stay aligned with the
edges regardless of path choice. Easing is selectable: `cosine` (today), `linear`,
`smootherstep`.

**Canvas 2D replaces the DOM dot.** Required for trails, glow, and multi-target rendering, and
cheaper than mutating element style per frame. Scaled by `devicePixelRatio`. The canvas is
`aria-hidden`; pass count and run state stay in live-regioned DOM so nothing is lost for
screen-reader users.

**Trails** via per-frame alpha fill of the background rather than storing N positions —
cheaper and gives a natural comet falloff. Trail length 0 = a hard clear (no trail).

**Glow** via radial gradient, not `shadowBlur` (more controllable, faster).

**Target appearance**: shape (orb, ring, soft glow, star, butterfly), size, color, glow
intensity, trail length. **Background**: color and brightness — currently hardcoded `bg-black`.

**Reduced motion becomes `crossfade` mode.** Two static targets at the L and R positions
cross-fade by phase; nothing translates. Bilateral alternation is preserved without sustained
motion. This replaces the current notice in `BLSVisual:50` / `BLSCombined:50` that tells the
user to go use a different tool — a dead end for someone who needs *this* one. It is also
the pattern `BreathPacer:159-161` already established for its own reduced-motion path.

### 3.4 Preferences and presets

Versioned keys: `ttg:prefs:v1:<toolId>`, plus `ttg:prefs:v1:global` for palette and master
volume. Every read and write is wrapped in try/catch with a fall back to defaults — Safari
private mode throws on write, and **a storage failure must never break a tool**.

**Built-in presets** per category: "Desensitization (fast)", "Installation (slow)",
"Resourcing (gentle)", "Child-friendly". Plus user-saved presets and a prominent **Reset to
defaults** — which matters on a shared clinic machine, where the previous client's settings
would otherwise silently persist into the next session.

### 3.5 Theming

Customizable colors move behind CSS custom properties on the widget root — `--tool-bg`,
`--tool-surface`, `--tool-accent`, `--tool-target`, `--tool-text` — so all four current color
formats converge on one mechanism. Tailwind classes remain for non-customizable chrome.
ButterflyHug's inline SVG hex, FeelingWheel's i18n-embedded hex, and Sandtray's uniforms are
each adapted to read from these.

Palettes: default (forest/bronze), high contrast, low stimulation (muted), warm, cool, custom.

**Contrast guard**: the target/background pair is checked against WCAG contrast ratio, with a
non-blocking warning below 3:1. Users can pick any colors they like; they just get told when
a combination will be hard to track.

### 3.6 Live reduced-motion observer

`motion-pref.ts` exports `onReducedMotion(cb): () => void` using
`mql.addEventListener('change')`, replacing all four current approaches. Toggling the OS
setting mid-session now takes effect immediately everywhere.

---

## 4. Decisions

### 4.1 Canvas over DOM
Confirmed. Trails, glow, and multi-target are not reasonably achievable by mutating a `<div>`
per frame. Accessibility is preserved by keeping state in DOM, not in the canvas.

### 4.2 Crossfade over "go away"
Confirmed. Telling a user with a vestibular disorder to use a different tool is not an
accessibility feature.

### 4.3 Sound defaults to off
Everywhere, including tools gaining audio for the first time. Preserves the project's
"nothing autoplays" rule.

**SUDScale and VOCScale get no tick sound unless explicitly enabled.** A per-increment noise
while someone rates their distress is the wrong instinct for these two tools specifically.

### 4.4 Binaural framing
Ships as an ambient sound option alongside noise and drone, with **no evidence copy and no
therapeutic claims**, and no entry in the tools content collection. The *functional* headphone
note stays — stereo separation is required for the feature to work at all, which is a usage
instruction, not a claim about efficacy.

### 4.5 Structural cleanups in scope
Both duplications in §1 are fixed as part of this work, because leaving them makes every
subsequent per-tool change cost two edits:
- Extract `src/lib/tool-widgets.ts` as the single `componentName → Component` map, consumed by
  all four route files.
- Widget-level warning banners read from frontmatter instead of a hand-copied string. All four
  routes already have the locale-correct `tool` entry in scope (the English routes filter
  `locale === 'en'` in `getStaticPaths`, the Spanish routes filter `locale === 'es'`), so each
  widget gains an optional `warnings?: string[]` prop passed as `tool.data.warnings`. The
  widget renders the banner itself, which is what makes it survive into fullscreen.

---

## 5. Testing

The project currently has no test runner; `npm run verify` is lint-if-present →
test-if-present → `astro build`. Two things in this design are pure logic and genuinely
warrant tests, so this work adds a minimal `vitest` setup covering only:

1. **`bls-clock.ts`** — phase continuity across a speed change (no jump), closed-form beat
   time correctness, frame-delta clamping.
2. **`tool-prefs.ts`** — round-trip, version migration, and graceful degradation when
   `localStorage` throws.

Everything else (audio timbre, canvas rendering) is verified by ear and eye in the browser,
not by unit test. `npm run verify` must stay green.

---

## 6. Adoption tiers

Not every tool gets every control — a motion panel on a button wizard is noise.

| Tier | Tools | Gets |
|---|---|---|
| **A — Full** | BLSVisual, BLSAudio, BLSCombined | motion, sound, palette, presets |
| **B — Motion + sound** | BLSTapping, ButterflyHug, BreathPacer, Lightstream | paths/crossfade, cue sounds, palette |
| **C — Cues + palette** | Grounding, Container, SafePlace, FeelingWheel, SUDScale, VOCScale | optional cue sounds, palette |
| **D — Palette + ambient** | Sandtray | palette + ambient bed only |

**Sandtray keeps its own control UI.** It has three purpose-built regions (persistent bar,
contextual figure toolbar, searchable palette) that work well. Retrofitting the shared panel
would be churn for its own sake. Its `confirmable()` helper (`Sandtray:1092-1109`) is a
generic arm-then-confirm wrapper worth lifting into shared code for other destructive actions.

Feature parity fix: **`BLSCombined` currently lacks dot size, dot color, continuous mode, and
the spacebar shortcut that `BLSVisual` has.** Tier A closes that gap.

---

## 7. i18n

Shared settings strings go into `src/i18n/ui.ts` as one new `tools.settings.*` group — a flat
`'namespace.key'` dictionary, matching the existing convention. They do **not** go into each
widget's local `t = {en, es}` object; pasting ~40 strings × 2 languages into twelve widgets is
exactly the duplication this design is trying to remove.

Tool-specific strings stay in the local `t` objects where they already live.

Missing Spanish keys fall back to English at runtime (`utils.ts:11`), so the site cannot break
on an incomplete translation — but every new key ships with a real Spanish value in the
neutral Latin American register described in CLAUDE.md.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Audio/visual drift on speed change | Single clock owns phase; scheduler re-derives queued events on rebase. Unit tested. |
| Canvas regresses accessibility | Canvas is `aria-hidden`; count and run state remain in live-regioned DOM. |
| Preset persistence leaks between clients on a shared machine | Prominent Reset to defaults; presets are explicit, not automatic. |
| Scope creep across 12 widgets | Tiering (§6) bounds per-tool work; shared engine lands and is proven on Tier A first. |
| Web Audio node leaks | Every voice disconnects on `ended`. |
| `localStorage` throws (Safari private mode) | All access wrapped; falls back to in-memory defaults. |

---

## 9. Out of scope

- Recording or exporting sessions.
- Any server-side or cross-device sync of preferences.
- Uploading custom audio files or images.
- Clinician TF-CBT / PCIT sections (tracked separately in CLAUDE.md).
