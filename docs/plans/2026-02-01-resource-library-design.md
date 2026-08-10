# Resource Library Design

**Date:** 2026-02-01
**Status:** Draft

## Summary

A curated resource library for the trauma therapy reference site. The site owner uploads PDFs/documents or pastes links (books, articles, videos, etc.) through a hidden admin page. AI auto-generates descriptions and suggests tags. Resources are stored as markdown files in an Astro content collection and deployed as static pages. Two public views: one for clinicians, one for families.

## Goals

- Provide a categorized, browsable library of trauma therapy resources
- Minimize upload friction with AI-assisted metadata generation
- Stay fully serverless and static — no database, no CMS, no auth service
- Support hundreds of resources without architectural changes

## Content Model

New Astro content collection: `resources`

Location: `src/content/resources/`

```yaml
---
title: "The Body Keeps the Score"
type: book          # book | pdf | article | video | worksheet | link
audience: both      # clinician | family | both
tags: ["trauma", "somatic", "foundational"]
url: ""             # external link (purchase URL, article, video, etc.)
fileUrl: ""         # DO Spaces URL for uploaded files (PDFs, documents)
author: ""          # optional, primarily for books
dateAdded: 2026-02-01
---

AI-generated description goes here as the markdown body.
```

Collection schema defined in `src/content/config.ts` alongside existing `emdr-phases` collection.

## Upload Flow

### Admin Page (`/admin/upload`)

A hidden, unlisted page (not linked from navigation or sitemap). Simple form with:

1. **URL field** — paste any link
2. **File drop zone** — drag/drop a PDF or document

### Serverless Function (DO Function)

Triggered on form submission. Handles the full pipeline:

1. **URL submission:**
   - Fetches the page
   - Extracts title, content summary, Open Graph metadata
   - Passes extracted content to Claude API

2. **File submission:**
   - Uploads file to DO Spaces
   - Extracts text from PDF (lightweight library in the function)
   - Passes extracted text to Claude API

3. **AI processing (Claude API):**
   - Generates a concise 2-3 sentence description
   - Suggests 3-5 freeform tags (prefers existing tags when they fit)
   - Classifies audience: clinician / family / both
   - Identifies resource type: book / pdf / article / video / worksheet / link
   - Extracts author name when applicable

4. **Returns suggested metadata to the browser for review**

### Review & Publish

The admin page displays an editable form pre-filled with AI suggestions:

- Title (editable)
- Description (editable)
- Tags (add/remove)
- Audience selector
- Resource type selector
- URL / file link (auto-filled)

On confirm, the serverless function:

1. Generates a slug from the title
2. Creates a markdown file with frontmatter + description body
3. Commits the file to the GitHub repo via the GitHub API
4. Push to `main` triggers DO App Platform auto-deploy

## Public-Facing Pages

### `/clinicians/resources/`

Displays resources where `audience` is `clinician` or `both`.

- Filter bar at top: clickable tags + resource type filters (stackable)
- Text search box: matches against title, description, tags
- Card grid layout following existing design system:
  - White background, `border-wood-200`, `shadow-sm`
  - Type icon, title, description snippet, tag pills
  - Click goes to external URL or triggers file download
- All filtering is client-side JavaScript (fast at this scale)
- No pagination — filtered scrollable list

### `/families/resources/`

Same layout and mechanics, filtered to `audience` of `family` or `both`.

Softer labeling (e.g., "Recommended Reading" vs "Resource Library").

## AI Integration

### Provider

Claude API (Anthropic). Single API call per resource upload.

### System Prompt Strategy

The serverless function reads existing tags from the resource collection and includes them in the AI prompt:

> "Here are existing tags in use: [tag list]. Prefer these when they fit. Suggest new tags only when none of the existing ones apply."

This prevents tag proliferation and encourages a natural taxonomy to emerge over time.

### Cost

At expected volume (a few uploads per week), API costs are negligible — pennies per month.

## Infrastructure

| Component | Service | Notes |
|-----------|---------|-------|
| Site | Astro on DO App Platform | Existing, no change |
| File storage | DO Spaces | S3-compatible, for uploaded PDFs/docs |
| Serverless function | DO Functions | Handles upload, AI, GitHub commit |
| AI | Claude API (Anthropic) | Metadata generation |
| Repo automation | GitHub API | Commit new resource markdown files |

### Environment Variables (new)

```bash
# Claude API (for resource metadata generation)
ANTHROPIC_API_KEY=

# GitHub API (for committing resource files)
GITHUB_TOKEN=
GITHUB_REPO=sean/traumaSite

# DO Spaces (may already exist)
SPACES_ENDPOINT=https://nyc3.digitaloceanspaces.com
SPACES_BUCKET=trauma-resources
SPACES_ACCESS_KEY=
SPACES_SECRET_KEY=
SPACES_CDN_URL=
```

## Design System Alignment

Library pages use existing patterns:

- **Cards:** `bg-white border border-wood-200 rounded-lg p-6 shadow-sm`
- **Tag pills:** `bg-forest-50 text-forest-700 rounded-full px-3 py-1 text-sm`
- **Filter bar:** Horizontal scroll of tag pills, active state `bg-forest-500 text-white`
- **Type icons:** Lucide icons (Book, FileText, Link, Video, ClipboardList, ExternalLink)
- **Typography:** `font-serif` headings, `font-sans` body, consistent with site

## Out of Scope (YAGNI)

- User accounts or authentication (hidden URL is sufficient)
- Ratings, reviews, or comments
- Full-text search within PDF contents
- Contributor/submission workflow
- Image thumbnails (type icons only)
- Analytics on resource clicks
- Pagination (not needed at hundreds of items)

All can be added later if needed.

## File Changes

### New Files
- `src/content/resources/` — directory for resource markdown files
- `src/content/config.ts` — updated with `resources` collection schema
- `src/pages/admin/upload.astro` — hidden admin upload page
- `src/pages/clinicians/resources/index.astro` — clinician resource library
- `src/pages/families/resources/index.astro` — family resource library
- Serverless function (DO Function) — upload handler + AI + GitHub commit

### Modified Files
- `src/pages/clinicians/index.astro` — add link to resource library
- `src/pages/families/index.astro` — add link to resource library
- `src/components/Header.astro` / `Nav.astro` — add Resources to navigation (if desired)
