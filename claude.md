# CLAUDE.md

> Canonical project context for coding agents (Claude Code, Codex, and others).
> `AGENTS.md` points here. Read this file at the start of every session.

## Project Overview

**Name:** Trauma Therapy Guide — https://traumatherapy.guide

**Purpose:** Free public resource site helping trauma therapists quickly reference evidence-based protocols, and helping families understand their child's treatment.

**Status:** Live — EMDR protocol (8 phases + scripts), 14 interactive tools, resource libraries, full EN/ES localization. Family-facing TF-CBT guide exists; clinician TF-CBT/PCIT still planned.

## Tech Stack

- **Framework:** Astro (static site generation)
- **Styling:** Tailwind CSS v4 (tokens in `src/styles/global.css`, not a tailwind config)
- **3D (sandtray only):** three.js, models in `public/sandtray/models/`
- **Content:** Markdown with Astro Content Collections (`emdr-phases`, `resources`, `tools`)
- **i18n:** EN default + ES under `/es/` (dictionaries in `src/i18n/ui.ts`; per-tool-widget `t = {en, es}` objects)
- **Deployment:** Digital Ocean App Platform (static)
- **Analytics:** GoatCounter (no cookies)
- **Package manager:** npm

## File Structure (key paths)

```
src/
├── components/
│   ├── Header / Footer / SearchModal / CrisisStrip / CalmFrontDoor
│   ├── Callout / Card / ResourceCard / ClinicalBanner / HelpContent
│   └── tools/                  # 14 interactive tool widgets + ToolShell/ToolCard
│       ├── BLS*.astro          # share src/scripts/bls-timer.ts (RAF timing)
│       ├── Sandtray.astro      # three.js; figures data in src/data/
│       └── BreathPacer, Grounding, SafePlace, Container, FeelingWheel, …
├── layouts/                    # BaseLayout (head/meta/skip-link), PhaseLayout, FullscreenLayout
├── pages/
│   ├── index, about, help (crisis), 404, tools/ ([slug] + fullscreen)
│   ├── admin/upload.astro      # resource upload UI (noindex; calls DO Functions w/ X-Admin-Token)
│   ├── clinicians/             # hub, emdr/phase-N (static pages), phase-N-scripts, resources/
│   ├── families/               # hub, emdr, tfcbt, resources/, emdr/tools
│   └── es/                     # Spanish mirror (phases render from .es.md via [phase].astro)
├── content/                    # config.ts + emdr-phases/ (+ .es.md), resources/, tools/ (+ .es.md)
├── i18n/                       # ui.ts dictionaries, utils.ts (translatePath, locale switcher)
└── styles/global.css           # design tokens, dark-zone, print styles
functions/                      # DO Functions (resource/analyze + publish) — deploy via doctl
```

## Design System

The site uses **dark chrome + light content zones** ("calm" overhaul, Apr 2026 — supersedes the all-dark plan in docs/plans):

- **Chrome (header/footer) and tool pages:** dark forest with bronze accents — `forest-900` page base, `forest-800` cards, `forest-600` borders, `bronze-400/500` headings/links/primary buttons, body text `forest-100`, secondary `forest-300`. Tool pages wrap widgets in `.dark-zone` (see `ToolShell.astro`).
- **Content zones (homepage, hubs, phase articles):** cream/linen editorial style using CSS custom props in global.css (`--color-ink`, `--color-copper`, etc. — see `CalmFrontDoor.astro` for the idiom).
- **Typography:** `font-serif` (Lora/Georgia) headings, `font-sans` (Inter) body; base 16px.
- **Layout:** `max-w-3xl` text pages, `max-w-6xl` hubs; `rounded-lg` cards, `rounded-md` buttons.
- **Focus states:** `focus:outline-none focus:ring-2 focus:ring-bronze-500` on dark zones.
- Amber is reserved for functional warnings only.

## Content Guidelines

### For Clinicians
- Concise, scannable; headers break up phases
- "Quick reference" boxes for key steps; link related phases
- Assume reader has basic training — reinforcement, not teaching

### For Families
- Warm, reassuring tone; no jargon without explanation
- Focus on "what to expect" and "how to support"
- Shorter paragraphs than clinician content

### Spanish (ES)
- Neutral Latin American register, tú forms addressing the parent
- EMDR stays "EMDR"; "bilateral stimulation" → "estimulación bilateral"
- Crisis text line keyword is HOLA (vs HELLO) to 741741
- Every EN page needs an ES counterpart or an entry in `EN_ONLY_ROUTES` (src/i18n/utils.ts) so the locale switcher and hreflang degrade gracefully

### Trauma-informed UX rules (non-negotiable)
- Nothing autoplays (motion or audio); every animation respects `prefers-reduced-motion`
- Stop controls always reachable; destructive actions (e.g. sandtray clear) require confirm + undo
- Epilepsy/supervision warnings render in fullscreen too
- Crisis links: `sms:741741?&body=…` format (the `?` matters on Android)

### Markdown Frontmatter

`emdr-phases`: phase, title, shortTitle, description, goals[].
`tools`: name, category (bls|preparation|assessment|regulation), audience[], useContext[], evidence, shortDescription, componentName, citations[], warnings[], locale.
`resources`: title, type, audience, tags[], url/fileUrl, author, dateAdded, locale.

## Commands

```bash
npm run dev        # Development
npm run build      # Build (113 pages; must pass before commit)
npm run preview    # Preview production build
npm run verify     # Full check chain (lint/test if present, then build)
```

## Verification

Run `npm run verify` after any change. It must be green before committing.

## Deployment

Digital Ocean App Platform auto-deploys from `main` branch.
Build command: `npm run build` · Output directory: `dist`

DO Functions (resource analyze/publish) deploy separately:
`cd functions && doctl serverless deploy .` — requires env vars from project.yml,
including `ADMIN_TOKEN` (shared secret; the admin upload page sends it as `X-Admin-Token`).

## Future Additions

- Clinician TF-CBT section (`/clinicians/tfcbt/`) — family guide exists
- PCIT section (`/clinicians/pcit/`)
- Downloadable PDF resources

## Notes

- No JavaScript frameworks beyond Astro's islands (keep it simple)
- No accounts, no database; GoatCounter analytics only (no cookies)
- Accessibility: semantic HTML, heading hierarchy, skip link, focus states, keyboard-operable tools
- Resource admin page at /admin/upload (noindex, not linked publicly; requires admin token)
- Resources stored as markdown in src/content/resources/
- Search index lives in SearchModal.astro (static pages) + tools collection — add new pages there
