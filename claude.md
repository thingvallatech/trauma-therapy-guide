# CLAUDE.md

> Project context for Claude Code. Read this file at the start of every session.

## Project Overview

**Name:** Trauma Therapy Reference Guide (working title — domain TBD)

**Purpose:** Free public resource site helping trauma therapists quickly reference evidence-based protocols, and helping families understand their child's treatment.

**Status:** POC phase — EMDR content only

## Tech Stack

- **Framework:** Astro (static site generation)
- **Styling:** Tailwind CSS
- **Icons:** Lucide (via `astro-icon` or direct SVG)
- **Content:** Markdown with Astro Content Collections
- **Deployment:** Digital Ocean App Platform (static)
- **Package manager:** npm

## File Structure

```
/
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Nav.astro
│   │   ├── Card.astro
│   │   ├── PhaseNav.astro        # Previous/Next navigation for phases
│   │   └── Callout.astro         # Tip/warning/note boxes
│   ├── layouts/
│   │   ├── BaseLayout.astro      # HTML head, header, footer wrapper
│   │   └── PhaseLayout.astro     # Template for individual phase pages
│   ├── pages/
│   │   ├── index.astro
│   │   ├── about.astro
│   │   ├── clinicians/
│   │   │   ├── index.astro
│   │   │   └── emdr/
│   │   │       ├── index.astro   # EMDR overview + phase links
│   │   │       └── [phase].astro # Dynamic route for phases
│   │   └── families/
│   │       ├── index.astro
│   │       └── emdr.astro
│   ├── content/
│   │   ├── config.ts             # Content collection definitions
│   │   └── emdr-phases/
│   │       ├── phase-1.md
│   │       ├── phase-2.md
│   │       └── ... (8 total)
│   └── styles/
│       └── global.css
├── public/
│   └── (static assets)
├── astro.config.mjs
├── tailwind.config.mjs
├── package.json
└── CLAUDE.md
```

## Design System

### Colors (Tailwind config)

```js
colors: {
  forest: {
    50: '#F0F5F1',
    100: '#D9E6DC',
    200: '#B3CDB9',
    300: '#8DB496',
    400: '#679B73',
    500: '#2D5A3D',  // Primary
    600: '#254A32',
    700: '#1D3A27',
    800: '#152A1C',
    900: '#0D1A11',
  },
  wood: {
    50: '#FAF7F2',
    100: '#F5F1EB',
    200: '#E8DFD3',
    300: '#D4C4AD',
    400: '#C4A77D',  // Secondary
    500: '#A68B5B',
    600: '#8A7049',
    700: '#6E5538',
    800: '#523A27',
    900: '#362016',
  },
  cream: '#FDFBF7',       // Background
  charcoal: '#2C2C2C',    // Text
}
```

### Typography

```js
fontFamily: {
  serif: ['Lora', 'Georgia', 'serif'],        // Headings
  sans: ['Inter', 'system-ui', 'sans-serif'], // Body
}
```

**Usage:**
- `font-serif` for h1, h2, h3
- `font-sans` for body, nav, buttons
- Base size: 16px (1rem)
- Line height: 1.6 for body text

### Spacing & Layout

- Max content width: `max-w-3xl` (48rem) for text-heavy pages
- Max container width: `max-w-6xl` (72rem) for hub pages
- Section padding: `py-16` desktop, `py-10` mobile
- Card border radius: `rounded-lg` (0.5rem)
- Button border radius: `rounded-md` (0.375rem)

### Component Patterns

**Cards:**
- Background: `bg-white` with subtle shadow `shadow-sm`
- Border: `border border-wood-200`
- Padding: `p-6`
- Hover: `hover:shadow-md hover:border-forest-300` with transition

**Buttons:**
- Primary: `bg-forest-500 text-white hover:bg-forest-600`
- Secondary: `bg-wood-100 text-charcoal hover:bg-wood-200`
- Padding: `px-4 py-2`

**Callouts:**
- Tip: `bg-forest-50 border-l-4 border-forest-500`
- Warning: `bg-amber-50 border-l-4 border-amber-500`
- Note: `bg-wood-50 border-l-4 border-wood-400`

## Content Guidelines

### For Clinicians
- Concise, scannable
- Use headers to break up phases
- Include "quick reference" boxes for key steps
- Link to related phases where relevant
- Assume reader has basic training, this is reinforcement not teaching

### For Families
- Warm, reassuring tone
- No jargon without explanation
- Focus on "what to expect" and "how to support"
- Shorter paragraphs than clinician content

### Markdown Frontmatter (emdr-phases)

```yaml
---
phase: 1
title: "History and Treatment Planning"
shortTitle: "History"
description: "Gathering comprehensive client information and assessing readiness for EMDR treatment."
goals:
  - "Establish therapeutic alliance"
  - "Gather relevant history"
  - "Identify targets for processing"
---
```

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview
```

## Deployment

Digital Ocean App Platform auto-deploys from `main` branch.

Build command: `npm run build`
Output directory: `dist`

## Future Additions (not in POC)

- TF-CBT section (`/clinicians/tfcbt/`)
- PCIT section (`/clinicians/pcit/`)
- Downloadable PDF resources
- Search functionality
- Dark mode (maybe)

## Notes

- No JavaScript frameworks beyond Astro's islands (keep it simple)
- No authentication
- No database
- No analytics for POC (add Plausible or Fathom later if needed)
- Accessibility: semantic HTML, proper heading hierarchy, alt text, focus states
