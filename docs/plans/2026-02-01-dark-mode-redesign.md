# Dark Mode Redesign — Forest Green & Bronze

**Date:** 2026-02-01
**Status:** Approved

## Overview

Redesign the site UI from a light cream theme to a dark forest green base with subtle metallic bronze lettering. Simplify the color palette from 6+ accent colors down to forest green + bronze. All print styles and worksheet formatting remain unchanged.

## Color System

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| forest-900 | `#0D1A11` | Page base |
| forest-800 | `#152A1C` | Cards, surfaces |
| forest-700 | `#1D3A27` | Elevated surfaces, header, hover |
| forest-600 | `#254A32` | Borders, dividers |

### Bronze (replaces wood palette)
| Token | Hex | Usage |
|-------|-----|-------|
| bronze-50 | `#FDF5E6` | Lightest, rarely used |
| bronze-100 | `#F5E6C8` | — |
| bronze-200 | `#E8CC93` | — |
| bronze-300 | `#D4AA63` | Heading gradient end, link hover |
| bronze-400 | `#C49A47` | Heading gradient start |
| bronze-500 | `#B08D57` | Primary bronze, links, borders |
| bronze-600 | `#96733D` | Visited links, subtle borders |
| bronze-700 | `#6E5528` | — |

### Text
- Body: `forest-100` (#D9E6DC)
- Secondary: `forest-300` (#8DB496)
- Headings: CSS gradient `#C49A47` → `#D4AA63`
- Links: `bronze-500`, hover `bronze-300`

### Accent
- Pop green: `forest-400` (#679B73) for focus rings, active states, checkmarks
- Amber: keep `#D97706` for functional warnings only

## Components

### Header
- `forest-800` bg with 95% opacity + backdrop-blur
- Thin 1px `bronze-500` top border (replaces rainbow gradient)
- Logo: bronze metallic gradient
- Nav links: `forest-100` → hover `bronze-400` → active `bronze-500`
- Active indicator: bottom border `bronze-500`

### Footer
- `forest-900` bg (mostly unchanged)
- Links hover: `bronze-400`
- Section headings: bronze gradient
- Divider: `forest-600`

### Cards
- `forest-800` bg, no border or subtle `forest-600`
- Hover: bg shifts to `forest-700` (no shadow)
- Card headings: bronze gradient
- Disabled/coming soon: `opacity-60`

### Buttons
- Primary: `bronze-500` bg, `forest-900` text, hover `bronze-400`
- Secondary: `forest-700` bg, `forest-100` text, border `forest-500`, hover `forest-600`
- Focus: `forest-400` ring, 2px offset

### Callouts
- Tip: `forest-800` bg, `forest-400` left border
- Warning: `forest-800` bg, amber left border
- Note: `forest-800` bg, `bronze-500` left border
- All text: `forest-100`

### Links in Prose
- `bronze-500` with underline
- Hover: `bronze-300`

## Pages

### Homepage
- Hero: gradient `forest-900` → `forest-800`, subtle radial glow `forest-600`
- Remove decorative blur circles
- Badge: `forest-700` bg, `bronze-500` text
- Both CTAs: bronze primary style, differentiated by icon
- Feature checkmarks: `forest-400`
- Protocol cards: featured = `forest-700` + `bronze-500` border; coming soon = `forest-800` + `opacity-50`

### Phase Pages
- Phase badge: `forest-700` bg, `bronze-400` text (uniform, no per-phase colors)
- Page title: bronze gradient
- Prose h2/h3: bronze gradient; h4+: `forest-50`
- Code/script boxes: `forest-800` bg, `bronze-600` left border
- Sidebar: `forest-800` bg, `bronze-400` headings
- PhaseNav: `forest-800` bg, `forest-300` text → `bronze-400` hover

### Body Background
- Flat `forest-900` (remove radial gradient backdrop)

## Print
**No changes.** Existing `@media print` styles remain as-is:
- White background, dark text
- Header/footer/nav hidden
- Letter size, 0.5in margins, 2.5in right margin for notes
- 11pt font, optimized spacing
- Print package section dividers unchanged

## Removed
- Coral accent palette
- Teal accent palette
- Lavender accent palette
- Sunny accent palette
- Per-phase color coding
- Decorative blur circles on homepage
- Rainbow gradient header accent
- Shadow-based card elevation
- Pulse animation on badge
- Button gradients
