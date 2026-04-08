# EMDR Tools Section — Design

**Date:** 2026-04-08
**Status:** Approved, ready for implementation planning
**Scope:** Build a suite of interactive, in-browser EMDR tools (14 total) with audience-specific hub pages for clinicians and families.

## Overview

Add a new section of the site that hosts interactive EMDR tools built directly into the website — no external vendors, no physical hardware, no third-party embeds. Each tool is a self-contained Astro component using vanilla JS (and Web Audio API where relevant), accessible via a shared `/tools/[slug]` route and surfaced through two audience-framed hub pages: `/clinicians/emdr/tools` and `/families/emdr/tools`.

Tools cover three use contexts:

1. **Live in-session use** by clinicians (BLS delivery, scales)
2. **Practice / teaching demos** for both audiences
3. **Home / between-session support** for clients (grounding, breathing, safe place)

The project is guided by "what actually works" — each tool cites the clinical source for its parameters (Shapiro, EMDRIA, established scripts), and tools without formal research backing are honestly labeled as `clinical-consensus` or `widely-used` rather than `research-backed`.

## Goals

- Give clinicians reliable, distraction-free BLS tools they can use in-session (including fullscreen mode)
- Give families and clients accessible self-regulation tools for home use
- Keep the site's existing philosophy: free, no auth, no tracking, no data collection
- Match existing patterns: content collection for metadata, Astro islands for interactivity, audience-split routing, i18n-ready

## Non-goals

- No accounts, login, or saved sessions
- No audio recording or speech input
- No video
- No AI / LLM features
- No telehealth screen-sharing optimization beyond "sharing the tab just works"
- No tool editor or custom tool builder
- No progress tracking, streaks, gamification
- No physical hardware referrals, no external vendor product links, no affiliate content

## Tool catalog

Fourteen tools, grouped by category.

### BLS (Bilateral Stimulation) — clinician-only audience

Clinician-only because unsupervised BLS on unprocessed trauma is not recommended for home use.

1. **Visual BLS** (`/tools/bls-visual`)
   Horizontal-moving dot on a dark background. Controls: speed (0.5–2 Hz, default ~1 Hz per Shapiro), dot size, dot color, background color, pass count (default 24 per set), auto-stop-after-set or continuous mode. Prominent Start/Stop.

2. **Audio BLS** (`/tools/bls-audio`)
   Alternating L/R stereo tones via Web Audio API. Controls: speed, tone frequency (default 440 Hz), volume, pass count, tone type (pure sine, soft chime, click). Headphones-required warning.

3. **Combined BLS** (`/tools/bls-combined`)
   Visual dot + audio tones, synced. Controls mirror both, audio on/off toggle.

4. **Self-tapping guide** (`/tools/bls-tapping`)
   Large alternating L/R visual cues to pace butterfly-hug or knee-tap self-administration when eye movements are contraindicated (e.g., too activated). Same speed controls.

### Preparation / kid-oriented — both audiences

5. **Container exercise** (`/tools/container`)
   Interactive sequence: pick a container (box, vault, chest, balloon), name one or more worries, tap/drag them in, lock it, place it (high shelf, deep ocean, locked room). Resets on reload.

6. **Safe place builder** (`/tools/safe-place`)
   Guided picker: environment (forest, beach, meadow, mountain, room, imagined), comfort elements (animal, blanket, music, person), prompts for sensory description. Displays a gentle animated scene. Client-side only, no save.

7. **Lightstream visualization** (`/tools/lightstream`)
   Guided animation with narration text: pick a color, see it flow through a body outline in sync with breath. Paced script walks through areas of tension. Based on Shapiro's standard lightstream technique.

8. **5-4-3-2-1 grounding** (`/tools/grounding`)
   Step-by-step prompt ("Name 5 things you can see," etc.) with count buttons to mark progress. Does not record what the user names.

### Assessment / measurement — both audiences

9. **SUD scale** (`/tools/sud`)
   0–10 slider with labels ("no disturbance" → "worst imaginable"). Toggle for kid version (faces/emojis, body-based wording).

10. **VOC scale** (`/tools/voc`)
    1–7 slider ("completely false" → "completely true"). Prompt field for user to type their positive cognition first (not stored).

11. **Feeling wheel** (`/tools/feeling-wheel`)
    Clickable radial chart of emotions, core emotions at center, specific ones at edge. Based on Dr. Gloria Willcox's Feeling Wheel (1982). Tapping a segment shows definition and body-sensation prompts.

### Regulation / between-session — both audiences

12. **Breath pacer** (`/tools/breath`)
    Animated circle that expands/contracts. Presets: box breathing (4-4-4-4), 4-7-8, coherent breathing (5-5). Optional audio cue. Duration selector (1/3/5/10 min).

13. **Butterfly hug guide** (`/tools/butterfly-hug`)
    Animated visual pacing the self-hug tapping rhythm, with text instructions and an "about this technique" expander. Same speed controls as BLS tools. Based on Artigas & Jarero (1998).

(The SUD scale houses both the adult and kid variants on one page with a toggle — counted as one tool — so the final count is 13 pages, 14 distinct widgets.)

## Architecture

### Content collection: `tools`

New collection defined in `src/content/config.ts`:

```ts
const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    category: z.enum(['bls', 'preparation', 'assessment', 'regulation']),
    audience: z.array(z.enum(['clinician', 'family'])),
    useContext: z.array(z.enum(['in-session', 'practice', 'home'])),
    evidence: z.enum(['research-backed', 'clinical-consensus', 'widely-used']),
    shortDescription: z.string(),
    componentName: z.string(), // maps to components/tools/<name>.astro
    citations: z.array(z.object({
      label: z.string(),
      url: z.string().optional(),
    })),
    warnings: z.array(z.string()).default([]),
    locale: z.enum(['en', 'es']).default('en'),
  }),
});
```

Slug is auto-derived from filename (matches the existing `resources` collection).

Markdown body contains "What this is," "When to use it," "Clinical notes," and cited parameter sources.

### Routing

- `/tools/[slug]` — dynamic route, pulls tool metadata, renders the matching widget inside `ToolShell`
- `/tools/[slug]/fullscreen` — same widget, minimal layout (no header/footer), dark background, small exit affordance (Esc or corner X)
- `/clinicians/emdr/tools` — hub, filtered by `audience: clinician`, grouped by EMDR phase
- `/families/emdr/tools` — hub, filtered by `audience: family`, grouped by feeling-state
- `/es/tools/[slug]`, `/es/clinicians/emdr/tools`, `/es/families/emdr/tools` — Spanish mirrors, matching the existing i18n pattern

Fullscreen is a **separate route**, not a JS toggle. Clinicians can bookmark it; URL stays meaningful; escape is real navigation.

### Component structure

```
src/
├── components/tools/
│   ├── ToolShell.astro          # shared chrome: title, disclaimer, fullscreen button, citations
│   ├── BLSVisual.astro
│   ├── BLSAudio.astro
│   ├── BLSCombined.astro
│   ├── BLSTapping.astro
│   ├── Container.astro
│   ├── SafePlace.astro
│   ├── Lightstream.astro
│   ├── Grounding.astro
│   ├── SUDScale.astro
│   ├── VOCScale.astro
│   ├── FeelingWheel.astro
│   ├── BreathPacer.astro
│   └── ButterflyHug.astro
├── content/tools/
│   ├── bls-visual.md
│   ├── bls-audio.md
│   └── ... (13 total, plus 13 es/ mirrors)
├── layouts/
│   └── FullscreenLayout.astro   # minimal layout for /tools/[slug]/fullscreen
└── pages/
    ├── tools/
    │   ├── [slug].astro
    │   └── [slug]/
    │       └── fullscreen.astro
    ├── clinicians/emdr/tools/index.astro
    ├── families/emdr/tools/index.astro
    └── es/...
```

### Widget → page wiring

The `[slug].astro` template imports all widget components and selects by name:

```astro
---
import BLSVisual from '../../components/tools/BLSVisual.astro';
// ... other imports
const components = {
  'BLSVisual': BLSVisual,
  'BLSAudio': BLSAudio,
  // ...
};
const Widget = components[tool.data.componentName];
---
<ToolShell tool={tool}>
  <Widget />
</ToolShell>
```

Flat map, 13 entries. No abstraction layer. Easy to reason about, easy to extend.

### Tech choices

- **No framework beyond Astro islands.** Matches `CLAUDE.md`. Every widget is a `.astro` file with a `<script>` block (or client-side `<script>` for browser-only APIs).
- **Web Audio API** for audio BLS, breath pacer audio cues.
- **`requestAnimationFrame`** for BLS motion and breath pacer animations.
- **CSS transitions / animations** for hub pages and non-BLS decorative motion.
- **`<input type="range">`** for all sliders (SUD, VOC, BLS speed). Semantic, keyboard-accessible, native.
- **No localStorage for user content.** Opt-in localStorage for settings only (e.g., remembered BLS speed preference), behind a checkbox on relevant tools.

## Shared concerns

### Disclaimers

Every tool page shows this in `ToolShell`:

> **This is a reference tool, not a replacement for EMDR therapy.** EMDR must be delivered by a trained clinician. If you are using these tools outside of therapy and become distressed, stop, ground yourself, and contact a mental health professional.

Visual BLS, Audio BLS, and Combined BLS additionally show a one-time "before you start" gate:

- **Photosensitive epilepsy warning** for visual tools
- **Headphones required for stereo effect** for audio tools
- User taps "I understand, continue" to reveal the widget

### Accessibility

- **`prefers-reduced-motion`** is respected on decorative animations (hub pages, lightstream background, safe place scene). **Not** applied to BLS widgets themselves — motion is the point. Those tools show a notice: "This tool uses motion by design. If that's uncomfortable, consider the audio-only BLS or butterfly hug guide instead."
- **Keyboard control.** Every Start/Stop control is keyboard-reachable. Space toggles run/pause on BLS tools.
- **Semantic HTML** throughout. Sliders are real `<input type="range">`, buttons are `<button>`, headings are hierarchical.
- **Contrast.** Every tool page meets WCAG AA against its background. BLS dot colors are tested against each available background color for contrast.
- **Screen reader labels.** All controls have visible or `aria-label` text.

### Privacy & data

- **Zero tracking** on `/tools/*` routes. No analytics, no telemetry, no runtime-loaded third-party fonts or scripts.
- **No persistence of user content by default.** Container items, safe-place details, grounding answers, SUD values — all in-memory, gone on refresh. This is both a privacy choice and a clinical one: the exercise is the process, not the artifact.
- **Optional localStorage for settings only** — BLS speed preference, preferred breath pattern. Nothing containing user content. Opt-in via a "remember my settings" checkbox on applicable tools.

### Fullscreen mode

- Implemented as a separate route (`/tools/[slug]/fullscreen`) using a dedicated `FullscreenLayout.astro` (no header, no footer, dark background, body margin zero).
- A small fixed "X" exit button in the corner navigates back to the main tool page.
- Esc key also exits via a lightweight JS handler.
- The main tool page has a "Fullscreen" button that navigates (not `element.requestFullscreen()`) to the fullscreen route. This avoids JS state resets and lets clinicians bookmark the fullscreen URL.

### Evidence labels & citations

Each tool declares `evidence: 'research-backed' | 'clinical-consensus' | 'widely-used'`, shown as a small badge on the tool page and hub cards.

Citation expectations per tool:

- **BLS (visual, audio, combined, tapping):** `research-backed`. Shapiro (2018) *Eye Movement Desensitization and Reprocessing*, 3rd ed.; EMDRIA parameter guidance.
- **Container:** `clinical-consensus`. Standard resource installation technique from Shapiro; EMDRIA preparation phase materials.
- **Safe place:** `research-backed`. Shapiro Phase 2 preparation protocol.
- **Lightstream:** `clinical-consensus`. Shapiro's Lightstream technique, widely taught in EMDR training.
- **5-4-3-2-1 grounding:** `widely-used`. No single origin; documented across trauma-informed care literature.
- **SUD / VOC:** `research-backed`. Shapiro's standard measurement scales, used in every EMDR study.
- **Feeling wheel:** `clinical-consensus`. Dr. Gloria Willcox (1982), *The Feeling Wheel*.
- **Breath pacer:** `research-backed` for box breathing and coherent breathing (HRV literature); `widely-used` for 4-7-8 (Weil).
- **Butterfly hug:** `research-backed`. Artigas & Jarero (1998), originally developed for children after Hurricane Pauline; now in EMDR protocols.

Citations that cannot be confirmed during implementation are replaced with "widely used in clinical practice" and the evidence label drops to `clinical-consensus` or `widely-used` rather than asserting research backing.

### Clinician vs. family framing

Same widget, different hub wrappers:

- **Clinician hub** — grouped by EMDR phase (Phase 2 preparation, Phase 4 desensitization, Phase 7 closure). Each card includes BLS parameter defaults and notes on when to offer which tool. Mentions in-session vs. homework context.
- **Family hub** — grouped by feeling-state ("When your child feels overwhelmed," "To build a calm place," "For big feelings"). Plain, warm language. No protocol jargon. Includes a note that these are tools to practice together, not a replacement for therapy.

Audience assignments:

- **Clinician only:** Visual BLS, Audio BLS, Combined BLS, Self-tapping guide
- **Both:** Container, Safe place, Lightstream, 5-4-3-2-1, SUD, VOC, Feeling wheel, Breath pacer, Butterfly hug

## Design system

The tools section follows the existing palette (forest, bronze, sand, linen) and typography (Lora serif for headings, Inter for body). Two additions:

- **Dark tool background.** BLS tools need a dark background so the moving dot has strong contrast and doesn't compete with site chrome. `ToolShell` gives each tool page a dark zone wrapper similar to the existing resources pages.
- **Tool cards** on hub pages follow the existing `ResourceCard.astro` pattern but show: name, category icon, evidence badge, short description, and a "Open tool" CTA. A separate `ToolCard.astro` component keeps this clean.

## Out of scope (explicit)

- Accounts, login, sessions
- Audio recording / speech input
- Video
- AI / LLM features
- Telehealth optimization beyond "share your tab"
- Tool editor / custom tool builder
- Progress tracking, streaks, gamification
- Physical product referrals, external vendor links, affiliate content
- Tracking or analytics on `/tools/*`
- Data export / print of tool sessions

## Implementation order (suggested for the plan phase)

This is a hint to the writing-plans phase; not binding.

1. **Foundation** — content collection schema, `[slug].astro` template, `ToolShell.astro`, `FullscreenLayout.astro`, empty widget stubs, both hub pages rendering from the collection
2. **Simplest widgets first** — SUD scale, VOC scale, breath pacer, 5-4-3-2-1 grounding (all mostly HTML/CSS with minimal JS)
3. **BLS widgets** — Visual, Audio, Combined, Self-tapping (core clinical value; more JS; epilepsy/headphone gates)
4. **Narrative widgets** — Container, Safe place, Lightstream, Butterfly hug, Feeling wheel (more interactive, more copy)
5. **i18n mirrors** — Spanish versions of collection entries and hub pages
6. **Polish** — accessibility audit, contrast verification, fullscreen behavior across browsers, citation verification

## Open questions for implementation

These do not block the design but should be resolved during planning:

- Exact BLS default parameters per Shapiro — verify the number (24 passes per set is standard per training materials but should be double-checked against the 3rd edition text)
- Stereo separation degree for audio BLS — hard-pan left/right or partial pan?
- Whether the feeling wheel should use Willcox's original six core emotions or an expanded contemporary set
- Whether to offer a "silent" mode on the breath pacer (no audio cue at all) as well as preset cues
