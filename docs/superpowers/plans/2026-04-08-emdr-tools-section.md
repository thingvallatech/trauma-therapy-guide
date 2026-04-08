# EMDR Tools Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 14 interactive, in-browser EMDR tools (BLS, preparation, assessment, regulation) with audience-specific hub pages for clinicians and families, accessible via a shared `/tools/[slug]` route and a dedicated fullscreen route.

**Architecture:** New Astro content collection `tools` stores metadata + markdown. A dynamic `[slug].astro` route pulls tool metadata, renders shared `ToolShell` chrome, and selects the matching widget from a flat component map. Each widget is a self-contained `.astro` file with vanilla JS (no framework beyond Astro islands). Fullscreen is a separate route using a minimal layout. Two hub pages (clinician, family) filter the collection by audience.

**Tech Stack:** Astro 5, TypeScript, Tailwind v4, vanilla JS, Web Audio API. No test framework — verification is `npm run build` + visual dev check.

**Verification model (no test framework):**
- Every task ends with `npm run build` — catches schema errors, type errors, routing conflicts, broken imports.
- Interactive behavior is verified by `npm run dev` and a short "what to check" checklist per widget.
- The content collection schema validates markdown frontmatter at build time — that IS the test for metadata.

**Spec reference:** `docs/superpowers/specs/2026-04-08-emdr-tools-section-design.md`

---

## Phase 0: Foundation

Builds the infrastructure all tools depend on. No actual widgets yet — just the collection schema, shared chrome, routing, and empty hub pages.

---

### Task 1: Extend content collection config with `tools` collection

**Files:**
- Modify: `src/content/config.ts`

- [ ] **Step 1: Open the existing config file and add the new collection**

Read the current `src/content/config.ts` (it already exports `emdr-phases` and `resources` collections) and add a new `tools` collection alongside them. Replace the file with:

```ts
import { defineCollection, z } from 'astro:content';

const emdrPhasesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    phase: z.number().min(1).max(8),
    title: z.string(),
    shortTitle: z.string(),
    description: z.string(),
    goals: z.array(z.string()),
    locale: z.enum(['en', 'es']).default('en'),
  }),
});

const resourcesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    type: z.enum(['book', 'pdf', 'article', 'video', 'worksheet', 'link']),
    audience: z.enum(['clinician', 'family', 'both']),
    tags: z.array(z.string()),
    url: z.string().default(''),
    fileUrl: z.string().default(''),
    author: z.string().default(''),
    dateAdded: z.coerce.date(),
    locale: z.enum(['en', 'es']).default('en'),
  }),
});

const toolsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    category: z.enum(['bls', 'preparation', 'assessment', 'regulation']),
    audience: z.array(z.enum(['clinician', 'family'])).min(1),
    useContext: z.array(z.enum(['in-session', 'practice', 'home'])).min(1),
    evidence: z.enum(['research-backed', 'clinical-consensus', 'widely-used']),
    shortDescription: z.string(),
    componentName: z.string(),
    citations: z.array(z.object({
      label: z.string(),
      url: z.string().optional(),
    })).default([]),
    warnings: z.array(z.string()).default([]),
    locale: z.enum(['en', 'es']).default('en'),
  }),
});

export const collections = {
  'emdr-phases': emdrPhasesCollection,
  'resources': resourcesCollection,
  'tools': toolsCollection,
};
```

- [ ] **Step 2: Verify build still works**

Run: `npm run build`
Expected: build succeeds (no tools yet, but the new collection is registered and empty collections are legal).

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "feat(tools): add tools content collection schema"
```

---

### Task 2: Add `noAnalytics` opt-out prop to BaseLayout

The spec requires zero tracking on `/tools/*`. BaseLayout currently loads GoatCounter unconditionally. Add an opt-out prop.

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

- [ ] **Step 1: Add the prop to the interface and destructure**

Find the `interface Props` block near the top of `src/layouts/BaseLayout.astro` and add `noAnalytics`:

```astro
interface Props {
  title: string;
  description?: string;
  lang?: Lang;
  noAnalytics?: boolean;
}

const detectedLang = getLangFromUrl(Astro.url);
const { title, description, lang = detectedLang, noAnalytics = false } = Astro.props;
```

- [ ] **Step 2: Wrap the GoatCounter script in a conditional**

Find the GoatCounter script near the bottom of the `<body>` and wrap it:

```astro
    {!noAnalytics && (
      <script data-goatcounter="https://therapy.goatcounter.com/count" async src="//gc.zgo.at/count.js"></script>
    )}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: build succeeds. Existing pages unchanged (default `noAnalytics = false`).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat(layout): add noAnalytics prop to BaseLayout"
```

---

### Task 3: Create `FullscreenLayout.astro`

Minimal layout for distraction-free in-session use — no header, no footer, no analytics.

**Files:**
- Create: `src/layouts/FullscreenLayout.astro`

- [ ] **Step 1: Create the file**

```astro
---
import '../styles/global.css';
import { getLangFromUrl, type Lang } from '../i18n';

interface Props {
  title: string;
  lang?: Lang;
  exitHref: string;
}

const detectedLang = getLangFromUrl(Astro.url);
const { title, lang = detectedLang, exitHref } = Astro.props;
---

<!DOCTYPE html>
<html lang={lang}>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <title>{title}</title>
  </head>
  <body class="m-0 bg-black text-white min-h-screen overflow-hidden">
    <a
      href={exitHref}
      id="tool-exit"
      aria-label="Exit fullscreen"
      class="fixed top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </a>
    <main class="w-full h-screen flex items-center justify-center">
      <slot />
    </main>
    <script is:inline define:vars={{ exitHref }}>
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          window.location.href = exitHref;
        }
      });
    </script>
  </body>
</html>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. The layout isn't used anywhere yet, but must compile.

- [ ] **Step 3: Commit**

```bash
git add src/layouts/FullscreenLayout.astro
git commit -m "feat(layout): add FullscreenLayout for in-session tool use"
```

---

### Task 4: Create `ToolShell.astro` shared chrome component

Wraps every tool's main (non-fullscreen) page with a consistent header, disclaimer, evidence badge, citations, and a "Fullscreen" button.

**Files:**
- Create: `src/components/tools/ToolShell.astro`

- [ ] **Step 1: Create the file**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  tool: CollectionEntry<'tools'>;
}

const { tool } = Astro.props;
const { name, category, evidence, shortDescription, citations, warnings } = tool.data;

const categoryLabel: Record<string, string> = {
  bls: 'Bilateral Stimulation',
  preparation: 'Preparation / Resource',
  assessment: 'Assessment Scale',
  regulation: 'Regulation / Body',
};

const evidenceLabel: Record<string, string> = {
  'research-backed': 'Research-backed',
  'clinical-consensus': 'Clinical consensus',
  'widely-used': 'Widely used',
};

const evidenceColor: Record<string, string> = {
  'research-backed': 'bg-forest-600 text-forest-50',
  'clinical-consensus': 'bg-bronze-600 text-bronze-50',
  'widely-used': 'bg-wood-600 text-wood-50',
};

const fullscreenHref = `/tools/${tool.slug}/fullscreen`;
---

<section class="dark-zone py-10 sm:py-16">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
    <!-- Breadcrumb -->
    <nav class="text-sm text-forest-400 mb-4">
      <a href="/clinicians/emdr/tools" class="hover:text-forest-200 transition-colors">Tools</a>
      <span class="mx-2">/</span>
      <span class="text-forest-100">{name}</span>
    </nav>

    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-xs uppercase tracking-wide text-forest-400">{categoryLabel[category]}</span>
        <span class:list={["px-2 py-0.5 rounded-full text-xs font-medium", evidenceColor[evidence]]}>
          {evidenceLabel[evidence]}
        </span>
      </div>
      <h1 class="font-serif text-3xl sm:text-4xl font-semibold text-forest-100 mb-3">{name}</h1>
      <p class="text-forest-200 leading-relaxed">{shortDescription}</p>
    </div>

    <!-- Disclaimer -->
    <div class="mb-6 p-4 border-l-4 border-bronze-500 bg-forest-800/50 text-sm text-forest-200">
      <strong class="text-forest-100">This is a reference tool, not a replacement for EMDR therapy.</strong>
      {' '}EMDR must be delivered by a trained clinician. If you are using these tools outside of therapy and become distressed, stop, ground yourself, and contact a mental health professional.
    </div>

    <!-- Warnings (epilepsy, headphones, etc.) -->
    {warnings.length > 0 && (
      <div class="mb-6 p-4 border border-amber-500/50 bg-amber-900/20 rounded-lg">
        <h2 class="text-amber-200 font-semibold text-sm mb-2">Before you start</h2>
        <ul class="text-amber-100 text-sm space-y-1 list-disc list-inside">
          {warnings.map((w) => <li>{w}</li>)}
        </ul>
      </div>
    )}

    <!-- Fullscreen link -->
    <div class="mb-8">
      <a
        href={fullscreenHref}
        class="inline-flex items-center gap-2 px-4 py-2 bg-forest-700 border border-forest-500 text-forest-100 rounded-md hover:bg-forest-600 transition-colors text-sm font-medium"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4h4M4 16v4h4m8-16h4v4m-4 12h4v-4" />
        </svg>
        Open in fullscreen
      </a>
    </div>

    <!-- Widget slot -->
    <div class="mb-10">
      <slot />
    </div>

    <!-- Citations -->
    {citations.length > 0 && (
      <div class="pt-6 border-t border-forest-700">
        <h2 class="text-sm font-semibold text-forest-300 mb-3 uppercase tracking-wide">Clinical sources</h2>
        <ul class="text-sm text-forest-300 space-y-1">
          {citations.map((c) => (
            <li>
              {c.url ? <a href={c.url} class="underline hover:text-forest-100">{c.label}</a> : c.label}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
</section>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. Component is defined but not yet imported anywhere.

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/ToolShell.astro
git commit -m "feat(tools): add ToolShell chrome component"
```

---

### Task 5: Create the dynamic `[slug].astro` tool page template

Pulls a tool from the collection, renders `ToolShell`, and selects the matching widget. Starts with an empty component map — widgets will be wired in as they're built.

**Files:**
- Create: `src/pages/tools/[slug].astro`

- [ ] **Step 1: Create the file**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';
import ToolShell from '../../components/tools/ToolShell.astro';

export async function getStaticPaths() {
  const tools = await getCollection('tools', (t) => t.data.locale === 'en');
  return tools.map((tool) => ({
    params: { slug: tool.slug },
    props: { tool },
  }));
}

interface Props {
  tool: CollectionEntry<'tools'>;
}

const { tool } = Astro.props;
const { Content } = await tool.render();

// Widget component map — populated as each widget is built.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widgets: Record<string, any> = {
  // 'SUDScale': (await import('../../components/tools/SUDScale.astro')).default,
};

const Widget = widgets[tool.data.componentName] ?? null;
---

<BaseLayout title={tool.data.name} description={tool.data.shortDescription} noAnalytics={true}>
  <ToolShell tool={tool}>
    {Widget ? <Widget /> : (
      <div class="p-6 border border-dashed border-forest-600 rounded-lg text-forest-300 text-sm">
        Widget not yet implemented for <code>{tool.data.componentName}</code>.
      </div>
    )}
  </ToolShell>
  <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 prose prose-invert">
    <Content />
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. Since no tools exist yet, `getStaticPaths` returns empty and no pages are generated. That's fine.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tools/[slug].astro
git commit -m "feat(tools): add dynamic [slug] tool page template"
```

---

### Task 6: Create the fullscreen tool page route

**Files:**
- Create: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the file**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import FullscreenLayout from '../../../layouts/FullscreenLayout.astro';

export async function getStaticPaths() {
  const tools = await getCollection('tools', (t) => t.data.locale === 'en');
  return tools.map((tool) => ({
    params: { slug: tool.slug },
    props: { tool },
  }));
}

interface Props {
  tool: CollectionEntry<'tools'>;
}

const { tool } = Astro.props;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const widgets: Record<string, any> = {
  // 'SUDScale': (await import('../../../components/tools/SUDScale.astro')).default,
};

const Widget = widgets[tool.data.componentName] ?? null;
const exitHref = `/tools/${tool.slug}`;
---

<FullscreenLayout title={`${tool.data.name} — Fullscreen`} exitHref={exitHref}>
  {Widget ? <Widget fullscreen={true} /> : (
    <div class="text-forest-300 text-sm">Widget not yet implemented.</div>
  )}
</FullscreenLayout>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. Empty collection → no routes generated yet.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add fullscreen tool page route"
```

---

### Task 7: Create `ToolCard.astro` component for hub pages

**Files:**
- Create: `src/components/tools/ToolCard.astro`

- [ ] **Step 1: Create the file**

```astro
---
import type { CollectionEntry } from 'astro:content';

interface Props {
  tool: CollectionEntry<'tools'>;
}

const { tool } = Astro.props;
const { name, category, evidence, shortDescription } = tool.data;

const categoryIcon: Record<string, string> = {
  bls: 'M12 2v20M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93',
  preparation: 'M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z',
  assessment: 'M3 12h18M3 6h18M3 18h18',
  regulation: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6v8',
};

const evidenceLabel: Record<string, string> = {
  'research-backed': 'Research-backed',
  'clinical-consensus': 'Clinical consensus',
  'widely-used': 'Widely used',
};

const href = `/tools/${tool.slug}`;
---

<a
  href={href}
  class="block bg-forest-800 border border-forest-600 rounded-lg p-6 hover:border-forest-500 hover:bg-forest-700 transition-all duration-200 group"
>
  <div class="flex items-start gap-4">
    <div class="w-10 h-10 bg-forest-700 rounded-lg flex items-center justify-center flex-shrink-0">
      <svg class="w-5 h-5 text-bronze-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d={categoryIcon[category]} />
      </svg>
    </div>
    <div class="flex-1 min-w-0">
      <h3 class="font-serif text-lg font-semibold text-forest-100 mb-1 group-hover:text-bronze-400 transition-colors">
        {name}
      </h3>
      <p class="text-forest-200 text-sm leading-relaxed mb-3">{shortDescription}</p>
      <span class="inline-flex items-center px-2 py-0.5 bg-forest-700 text-bronze-400 rounded text-xs font-medium">
        {evidenceLabel[evidence]}
      </span>
    </div>
  </div>
</a>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/tools/ToolCard.astro
git commit -m "feat(tools): add ToolCard component for hub pages"
```

---

### Task 8: Create the clinician tools hub page

**Files:**
- Create: `src/pages/clinicians/emdr/tools/index.astro`

- [ ] **Step 1: Create the file**

```astro
---
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import ToolCard from '../../../../components/tools/ToolCard.astro';
import { getCollection } from 'astro:content';

const allTools = await getCollection('tools', (t) => t.data.locale === 'en');
const clinicianTools = allTools
  .filter((t) => t.data.audience.includes('clinician'))
  .sort((a, b) => a.data.name.localeCompare(b.data.name));

const categoryGroups = [
  { key: 'bls', title: 'Bilateral Stimulation', description: 'For in-session delivery during desensitization (Phase 4) and installation (Phase 5).' },
  { key: 'preparation', title: 'Preparation & Resource', description: 'Phase 2 resource installation, containment, and stabilization.' },
  { key: 'assessment', title: 'Assessment Scales', description: 'SUD, VOC, and emotion identification for Phases 3 and onward.' },
  { key: 'regulation', title: 'Regulation & Body', description: 'Closure, grounding, and between-session support.' },
] as const;
---

<BaseLayout title="EMDR Tools" description="Interactive EMDR tools for clinicians — BLS delivery, resource installation, assessment scales, and regulation exercises.">
  <section class="dark-zone py-10 sm:py-16">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="text-sm text-forest-400 mb-4">
        <a href="/clinicians" class="hover:text-forest-200 transition-colors">Clinicians</a>
        <span class="mx-2">/</span>
        <a href="/clinicians/emdr" class="hover:text-forest-200 transition-colors">EMDR</a>
        <span class="mx-2">/</span>
        <span class="text-forest-100">Tools</span>
      </nav>

      <div class="max-w-3xl mb-10">
        <h1 class="font-serif text-4xl font-semibold text-forest-100 mb-4">EMDR Tools</h1>
        <p class="text-lg text-forest-200 leading-relaxed">
          Interactive tools you can use in-session or assign for practice. Built into the site — no downloads, no accounts, no tracking. Every tool has a fullscreen mode for distraction-free use.
        </p>
      </div>

      {categoryGroups.map((group) => {
        const toolsInGroup = clinicianTools.filter((t) => t.data.category === group.key);
        if (toolsInGroup.length === 0) return null;
        return (
          <div class="mb-12">
            <h2 class="font-serif text-2xl font-semibold text-forest-100 mb-2">{group.title}</h2>
            <p class="text-forest-300 text-sm mb-6">{group.description}</p>
            <div class="grid md:grid-cols-2 gap-6">
              {toolsInGroup.map((tool) => <ToolCard tool={tool} />)}
            </div>
          </div>
        );
      })}

      {clinicianTools.length === 0 && (
        <p class="text-forest-300">No tools available yet.</p>
      )}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds. Page renders with "No tools available yet." (collection is empty).

- [ ] **Step 3: Commit**

```bash
git add src/pages/clinicians/emdr/tools/index.astro
git commit -m "feat(tools): add clinician tools hub page"
```

---

### Task 9: Create the family tools hub page

**Files:**
- Create: `src/pages/families/emdr/tools/index.astro`

- [ ] **Step 1: Create the file**

```astro
---
import BaseLayout from '../../../../layouts/BaseLayout.astro';
import ToolCard from '../../../../components/tools/ToolCard.astro';
import { getCollection } from 'astro:content';

const allTools = await getCollection('tools', (t) => t.data.locale === 'en');
const familyTools = allTools
  .filter((t) => t.data.audience.includes('family'))
  .sort((a, b) => a.data.name.localeCompare(b.data.name));

const feelingGroups = [
  { key: 'preparation', title: 'Building a calm place', description: 'Tools that help create a safe, comforting inner space to return to when things feel big.' },
  { key: 'regulation', title: 'For big feelings', description: 'Breathing, grounding, and body-based tools to help when feelings get overwhelming.' },
  { key: 'assessment', title: 'Understanding how I feel', description: 'Ways to name, measure, and talk about what\'s happening inside.' },
] as const;
---

<BaseLayout title="EMDR Tools for Families" description="Games and exercises to help your child build calm, ground themselves, and name their feelings — all built into the website.">
  <section class="dark-zone py-10 sm:py-16">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav class="text-sm text-forest-400 mb-4">
        <a href="/families" class="hover:text-forest-200 transition-colors">Families</a>
        <span class="mx-2">/</span>
        <a href="/families/emdr" class="hover:text-forest-200 transition-colors">EMDR</a>
        <span class="mx-2">/</span>
        <span class="text-forest-100">Tools</span>
      </nav>

      <div class="max-w-3xl mb-10">
        <h1 class="font-serif text-4xl font-semibold text-forest-100 mb-4">Tools for Families</h1>
        <p class="text-lg text-forest-200 leading-relaxed">
          Games and exercises you can try with your child to help them feel calm and safe. These are things a therapist might teach in session — practicing at home can make them easier to use when a hard moment comes. These tools are a support, not a replacement for therapy.
        </p>
      </div>

      {feelingGroups.map((group) => {
        const toolsInGroup = familyTools.filter((t) => t.data.category === group.key);
        if (toolsInGroup.length === 0) return null;
        return (
          <div class="mb-12">
            <h2 class="font-serif text-2xl font-semibold text-forest-100 mb-2">{group.title}</h2>
            <p class="text-forest-300 text-sm mb-6">{group.description}</p>
            <div class="grid md:grid-cols-2 gap-6">
              {toolsInGroup.map((tool) => <ToolCard tool={tool} />)}
            </div>
          </div>
        );
      })}

      {familyTools.length === 0 && (
        <p class="text-forest-300">No tools available yet.</p>
      )}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/pages/families/emdr/tools/index.astro
git commit -m "feat(tools): add family tools hub page"
```

---

## Phase 1: First widget — SUD Scale (pattern exemplar)

This task walks through creating a complete widget end-to-end, including wiring it into the component maps. Later widget tasks follow the same shape with different code.

---

### Task 10: SUD Scale widget

Adult slider 0–10 with kid mode toggle (emoji faces). Also wires up the widget maps in the `[slug]` templates — this is done once here and each subsequent widget adds one entry to each map.

**Files:**
- Create: `src/content/tools/sud.md`
- Create: `src/components/tools/SUDScale.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "SUD Scale (Subjective Units of Disturbance)"
category: assessment
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: research-backed
shortDescription: "Measure distress from 0 (none) to 10 (worst imaginable). Includes a kid-friendly faces mode for younger clients."
componentName: "SUDScale"
citations:
  - label: "Shapiro (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed."
warnings: []
---

## What this is

The SUD (Subjective Units of Disturbance) scale is the standard EMDR measurement for how distressing a memory or feeling is right now, on a scale from 0 to 10. It's used throughout the protocol — in Phase 3 to get a baseline, between sets in Phase 4, and at closure to confirm processing.

## When to use it

- **Clinicians:** During Phase 3 assessment and every few sets during Phase 4 desensitization. Keep it quick — you're asking for a gut number, not an analysis.
- **Families:** When your child has feelings that are hard to put into words, the faces version can help them show you how big the feeling is.

## Clinical notes

Standard wording: "On a scale of 0 to 10, where 0 is no disturbance or neutral and 10 is the worst disturbance you can imagine, how disturbing does the incident feel to you now?"

Kid wording: "How yucky does it feel in your body right now? Zero is not yucky at all, ten is the worst yucky you can imagine."
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-sud-widget>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-forest-100 font-semibold">
      How disturbing is it right now?
    </h2>
    <label class="flex items-center gap-2 text-sm text-forest-300 cursor-pointer">
      <input type="checkbox" data-sud-kid-toggle class="w-4 h-4 accent-bronze-500" />
      <span>Kid mode</span>
    </label>
  </div>

  <div class="text-center mb-6">
    <div
      data-sud-display
      class="font-serif text-7xl font-semibold text-bronze-400 mb-2 tabular-nums"
    >
      5
    </div>
    <div data-sud-label class="text-forest-300 text-sm">Moderate disturbance</div>
    <div data-sud-faces class="text-6xl hidden" aria-hidden="true">😐</div>
  </div>

  <input
    type="range"
    min="0"
    max="10"
    step="1"
    value="5"
    data-sud-slider
    aria-label="SUD level from 0 to 10"
    class="w-full h-2 rounded-full bg-forest-700 appearance-none cursor-pointer accent-bronze-500"
  />

  <div class="flex justify-between text-xs text-forest-400 mt-2">
    <span>0 — none</span>
    <span>5</span>
    <span>10 — worst imaginable</span>
  </div>

  <div class="mt-6 text-sm text-forest-300" data-sud-wording>
    <em>"On a scale of 0 to 10, where 0 is no disturbance or neutral and 10 is the worst disturbance you can imagine, how disturbing does the incident feel to you now?"</em>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-sud-widget]');
  widgets.forEach((root) => {
    const slider = root.querySelector<HTMLInputElement>('[data-sud-slider]')!;
    const display = root.querySelector<HTMLElement>('[data-sud-display]')!;
    const label = root.querySelector<HTMLElement>('[data-sud-label]')!;
    const faces = root.querySelector<HTMLElement>('[data-sud-faces]')!;
    const wording = root.querySelector<HTMLElement>('[data-sud-wording]')!;
    const kidToggle = root.querySelector<HTMLInputElement>('[data-sud-kid-toggle]')!;

    const adultLabels = [
      'No disturbance',
      'Barely noticeable',
      'Mild',
      'Mild-moderate',
      'Moderate',
      'Moderate',
      'Moderate-high',
      'High',
      'Very high',
      'Nearly unbearable',
      'Worst imaginable',
    ];

    const kidFaces = ['😊', '🙂', '😐', '😕', '😟', '😖', '😣', '😫', '😩', '😭', '😱'];
    const kidLabels = [
      'Not yucky at all',
      'A tiny bit',
      'A little',
      'Some',
      'Medium',
      'Kind of big',
      'Big',
      'Really big',
      'Super big',
      'Huge',
      'The biggest',
    ];

    const adultWording = '"On a scale of 0 to 10, where 0 is no disturbance or neutral and 10 is the worst disturbance you can imagine, how disturbing does the incident feel to you now?"';
    const kidWording = '"How yucky does it feel in your body right now? Zero is not yucky at all, ten is the worst yucky you can imagine."';

    function update() {
      const val = parseInt(slider.value, 10);
      const isKid = kidToggle.checked;
      display.textContent = String(val);
      if (isKid) {
        faces.textContent = kidFaces[val];
        faces.classList.remove('hidden');
        label.textContent = kidLabels[val];
        wording.innerHTML = `<em>${kidWording}</em>`;
      } else {
        faces.classList.add('hidden');
        label.textContent = adultLabels[val];
        wording.innerHTML = `<em>${adultWording}</em>`;
      }
    }

    slider.addEventListener('input', update);
    kidToggle.addEventListener('change', update);
    update();
  });
</script>
```

- [ ] **Step 3: Wire the widget into `src/pages/tools/[slug].astro`**

Replace the `widgets` constant in `src/pages/tools/[slug].astro` with:

```ts
import SUDScale from '../../components/tools/SUDScale.astro';

const widgets: Record<string, any> = {
  'SUDScale': SUDScale,
};
```

Move the `import` statement to the top of the frontmatter alongside the other imports. The map stays inside the frontmatter.

- [ ] **Step 4: Wire the widget into `src/pages/tools/[slug]/fullscreen.astro`**

Replace the `widgets` constant in `src/pages/tools/[slug]/fullscreen.astro` with:

```ts
import SUDScale from '../../../components/tools/SUDScale.astro';

const widgets: Record<string, any> = {
  'SUDScale': SUDScale,
};
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: build succeeds. Routes generated: `/tools/sud` and `/tools/sud/fullscreen`.

- [ ] **Step 6: Visual verification**

Run: `npm run dev`
Visit `http://localhost:4321/tools/sud` and verify:
- Slider moves smoothly from 0–10
- Number and label update as you drag
- "Kid mode" checkbox swaps in emoji faces and kid-friendly wording
- The "Open in fullscreen" button navigates to `/tools/sud/fullscreen`
- Fullscreen mode: no site chrome, Esc returns to main page, corner X returns to main page
- Visit `/clinicians/emdr/tools` and verify the SUD card appears under "Assessment Scales"
- Visit `/families/emdr/tools` and verify the SUD card appears under "Understanding how I feel"

- [ ] **Step 7: Commit**

```bash
git add src/content/tools/sud.md src/components/tools/SUDScale.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add SUD scale widget with adult/kid modes"
```

---

## Phase 2: Remaining simple widgets

VOC scale, breath pacer, and 5-4-3-2-1 grounding. These follow the SUD pattern — slider/count-based UIs with minimal JS.

---

### Task 11: VOC Scale widget

**Files:**
- Create: `src/content/tools/voc.md`
- Create: `src/components/tools/VOCScale.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "VOC Scale (Validity of Cognition)"
category: assessment
audience: [clinician, family]
useContext: [in-session, practice]
evidence: research-backed
shortDescription: "Rate how true a positive belief feels, from 1 (completely false) to 7 (completely true). Used in Phase 3 assessment and Phase 5 installation."
componentName: "VOCScale"
citations:
  - label: "Shapiro (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed."
warnings: []
---

## What this is

The VOC (Validity of Cognition) scale measures how true a positive self-belief feels on a gut level, from 1 (completely false) to 7 (completely true). It's distinct from intellectual agreement — you're asking the client what it feels like in their body.

## When to use it

- **Phase 3:** After identifying the positive cognition and getting its initial VOC score.
- **Phase 5:** After installation, to confirm the PC feels increasingly true.

## Clinical notes

Standard wording: "Think about that incident. When you think of the incident, how true do those words [the positive cognition] feel to you now, on a scale of 1 to 7, where 1 is completely false and 7 is completely true?"
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-voc-widget>
  <h2 class="text-forest-100 font-semibold mb-4">How true does the positive belief feel?</h2>

  <label class="block text-sm text-forest-300 mb-2">Positive cognition (optional, not stored):</label>
  <input
    type="text"
    data-voc-pc
    placeholder="e.g. I am safe now"
    class="w-full mb-6 px-3 py-2 rounded-md bg-forest-700 border border-forest-600 text-forest-100 placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-bronze-500"
  />

  <div class="text-center mb-6">
    <div data-voc-display class="font-serif text-7xl font-semibold text-bronze-400 mb-2 tabular-nums">4</div>
    <div data-voc-label class="text-forest-300 text-sm">Somewhat true</div>
  </div>

  <input
    type="range"
    min="1"
    max="7"
    step="1"
    value="4"
    data-voc-slider
    aria-label="VOC level from 1 to 7"
    class="w-full h-2 rounded-full bg-forest-700 appearance-none cursor-pointer accent-bronze-500"
  />

  <div class="flex justify-between text-xs text-forest-400 mt-2">
    <span>1 — completely false</span>
    <span>7 — completely true</span>
  </div>

  <p class="mt-6 text-sm text-forest-300">
    <em>"Think about that incident. When you think of the incident, how true do those words feel to you now, on a scale of 1 to 7?"</em>
  </p>
</div>

<script>
  const widgets = document.querySelectorAll('[data-voc-widget]');
  widgets.forEach((root) => {
    const slider = root.querySelector<HTMLInputElement>('[data-voc-slider]')!;
    const display = root.querySelector<HTMLElement>('[data-voc-display]')!;
    const label = root.querySelector<HTMLElement>('[data-voc-label]')!;
    const labels = [
      '',
      'Completely false',
      'Mostly false',
      'A little false',
      'Somewhat true',
      'Moderately true',
      'Mostly true',
      'Completely true',
    ];
    function update() {
      const v = parseInt(slider.value, 10);
      display.textContent = String(v);
      label.textContent = labels[v];
    }
    slider.addEventListener('input', update);
    update();
  });
</script>
```

- [ ] **Step 3: Register the widget in both route templates**

Add to `src/pages/tools/[slug].astro`:

```ts
import VOCScale from '../../components/tools/VOCScale.astro';

const widgets: Record<string, any> = {
  'SUDScale': SUDScale,
  'VOCScale': VOCScale,
};
```

Add to `src/pages/tools/[slug]/fullscreen.astro`:

```ts
import VOCScale from '../../../components/tools/VOCScale.astro';

const widgets: Record<string, any> = {
  'SUDScale': SUDScale,
  'VOCScale': VOCScale,
};
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: build succeeds. Visit `/tools/voc` and confirm slider works from 1–7.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/voc.md src/components/tools/VOCScale.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add VOC scale widget"
```

---

### Task 12: Breath Pacer widget

**Files:**
- Create: `src/content/tools/breath.md`
- Create: `src/components/tools/BreathPacer.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Breath Pacer"
category: regulation
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: research-backed
shortDescription: "Animated breath pacer with box breathing, 4-7-8, and coherent breathing patterns. For closure, grounding, and home use."
componentName: "BreathPacer"
citations:
  - label: "Elliott, S. (2010). Coherent Breathing and HRV — The New Science of Heart Rate Variability Biofeedback."
  - label: "Weil, A. (2011). 4-7-8 breathing technique."
  - label: "US Navy SEAL combat/tactical breathing — box breathing protocol."
warnings: []
---

## What this is

An animated visual pacer for three evidence-based breathing patterns:

- **Box breathing** (4-4-4-4): inhale 4, hold 4, exhale 4, hold 4. Used in tactical/combat contexts and clinically for acute anxiety regulation.
- **4-7-8**: inhale 4, hold 7, exhale 8. Andrew Weil's teaching, draws on pranayama traditions.
- **Coherent breathing** (5-5): inhale 5, exhale 5. Associated with HRV coherence and parasympathetic activation.

## When to use it

- **Closure** (Phase 7) — help clients return to baseline.
- **Between sets** if a client is very activated.
- **Home use** — a calm-down tool that fits in a pocket.

## Clinical notes

The circle expands during inhalation and contracts during exhalation. Holds pause the animation. Duration presets (1, 3, 5, 10 minutes) give a natural stop so the user doesn't have to watch the clock.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8 flex flex-col items-center justify-center"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600 flex flex-col items-center";
---

<div class:list={[containerClass]} data-breath-widget>
  <div class="mb-4 flex flex-wrap gap-2 justify-center">
    <button data-breath-pattern="box" class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors">
      Box (4-4-4-4)
    </button>
    <button data-breath-pattern="478" class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors">
      4-7-8
    </button>
    <button data-breath-pattern="coherent" class="px-3 py-1.5 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors">
      Coherent (5-5)
    </button>
  </div>

  <div class="mb-4 flex gap-2 justify-center">
    {[1, 3, 5, 10].map((m) => (
      <button data-breath-minutes={m} class="px-3 py-1 rounded-md bg-forest-700 border border-forest-600 text-forest-200 text-xs hover:bg-forest-600 transition-colors">
        {m} min
      </button>
    ))}
  </div>

  <div class="relative w-64 h-64 flex items-center justify-center my-6">
    <div
      data-breath-circle
      class="w-32 h-32 rounded-full bg-bronze-500/30 border-2 border-bronze-400 transition-transform ease-in-out"
      style="transform: scale(1);"
    ></div>
    <div data-breath-phase class="absolute font-serif text-xl text-forest-100">Ready</div>
  </div>

  <div data-breath-remaining class="text-forest-300 text-sm mb-4"></div>

  <button
    data-breath-toggle
    class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
  >
    Start
  </button>
</div>

<script>
  type Phase = { name: string; seconds: number; scale: number };
  const patterns: Record<string, Phase[]> = {
    box: [
      { name: 'Inhale', seconds: 4, scale: 2 },
      { name: 'Hold', seconds: 4, scale: 2 },
      { name: 'Exhale', seconds: 4, scale: 1 },
      { name: 'Hold', seconds: 4, scale: 1 },
    ],
    '478': [
      { name: 'Inhale', seconds: 4, scale: 2 },
      { name: 'Hold', seconds: 7, scale: 2 },
      { name: 'Exhale', seconds: 8, scale: 1 },
    ],
    coherent: [
      { name: 'Inhale', seconds: 5, scale: 2 },
      { name: 'Exhale', seconds: 5, scale: 1 },
    ],
  };

  const widgets = document.querySelectorAll('[data-breath-widget]');
  widgets.forEach((root) => {
    const circle = root.querySelector<HTMLElement>('[data-breath-circle]')!;
    const phaseLabel = root.querySelector<HTMLElement>('[data-breath-phase]')!;
    const remaining = root.querySelector<HTMLElement>('[data-breath-remaining]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-breath-toggle]')!;

    let currentPattern: Phase[] = patterns.box;
    let totalSeconds = 3 * 60;
    let running = false;
    let phaseIdx = 0;
    let phaseElapsed = 0;
    let totalElapsed = 0;
    let rafId = 0;
    let lastTs = 0;

    function highlight(group: string, value: string) {
      root.querySelectorAll(`[data-breath-${group}]`).forEach((b) => {
        const active = b.getAttribute(`data-breath-${group}`) === value;
        b.classList.toggle('bg-bronze-600', active);
        b.classList.toggle('text-forest-900', active);
      });
    }

    root.querySelectorAll<HTMLButtonElement>('[data-breath-pattern]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (running) return;
        const key = btn.getAttribute('data-breath-pattern')!;
        currentPattern = patterns[key];
        highlight('pattern', key);
      });
    });
    highlight('pattern', 'box');

    root.querySelectorAll<HTMLButtonElement>('[data-breath-minutes]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (running) return;
        totalSeconds = parseInt(btn.getAttribute('data-breath-minutes')!, 10) * 60;
        highlight('minutes', String(totalSeconds / 60));
      });
    });
    highlight('minutes', '3');

    function enterPhase(i: number) {
      const p = currentPattern[i];
      phaseLabel.textContent = p.name;
      circle.style.transitionDuration = `${p.seconds}s`;
      circle.style.transform = `scale(${p.scale})`;
    }

    function tick(ts: number) {
      if (!lastTs) lastTs = ts;
      const dt = (ts - lastTs) / 1000;
      lastTs = ts;
      phaseElapsed += dt;
      totalElapsed += dt;
      const current = currentPattern[phaseIdx];
      if (phaseElapsed >= current.seconds) {
        phaseElapsed = 0;
        phaseIdx = (phaseIdx + 1) % currentPattern.length;
        enterPhase(phaseIdx);
      }
      const left = Math.max(0, totalSeconds - totalElapsed);
      remaining.textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
      if (totalElapsed >= totalSeconds) {
        stop();
        return;
      }
      if (running) rafId = requestAnimationFrame(tick);
    }

    function start() {
      running = true;
      toggle.textContent = 'Stop';
      phaseIdx = 0;
      phaseElapsed = 0;
      totalElapsed = 0;
      lastTs = 0;
      enterPhase(0);
      rafId = requestAnimationFrame(tick);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(rafId);
      toggle.textContent = 'Start';
      circle.style.transitionDuration = '500ms';
      circle.style.transform = 'scale(1)';
      phaseLabel.textContent = 'Ready';
      remaining.textContent = '';
    }

    toggle.addEventListener('click', () => (running ? stop() : start()));
  });
</script>
```

- [ ] **Step 3: Register in route templates**

In `src/pages/tools/[slug].astro`:

```ts
import BreathPacer from '../../components/tools/BreathPacer.astro';

const widgets: Record<string, any> = {
  'SUDScale': SUDScale,
  'VOCScale': VOCScale,
  'BreathPacer': BreathPacer,
};
```

In `src/pages/tools/[slug]/fullscreen.astro`:

```ts
import BreathPacer from '../../../components/tools/BreathPacer.astro';

const widgets: Record<string, any> = {
  'SUDScale': SUDScale,
  'VOCScale': VOCScale,
  'BreathPacer': BreathPacer,
};
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Run: `npm run dev` and visit `/tools/breath`. Verify: circle expands/contracts on Start, phase label updates (Inhale/Hold/Exhale), pattern buttons switch (only when not running), minute presets change timer, session auto-stops at 0:00.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/breath.md src/components/tools/BreathPacer.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add breath pacer widget"
```

---

### Task 13: 5-4-3-2-1 Grounding widget

**Files:**
- Create: `src/content/tools/grounding.md`
- Create: `src/components/tools/Grounding.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "5-4-3-2-1 Grounding"
category: regulation
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: widely-used
shortDescription: "Step-by-step sensory grounding: 5 things to see, 4 to touch, 3 to hear, 2 to smell, 1 to taste. Doesn't record what you name."
componentName: "Grounding"
citations:
  - label: "Widely used in trauma-informed care; documented in grounding technique literature."
warnings: []
---

## What this is

A brief sensory grounding exercise used across trauma-informed care. It pulls attention back into the body and the current environment by asking you to name things you can sense right now.

## When to use it

- **In-session:** If a client is dissociating or becoming overwhelmed during processing.
- **Closure:** To ensure the client is present before leaving.
- **Home use:** Whenever something reminds you of the past and you're starting to feel pulled away from the present.

## Clinical notes

The user taps a button for each thing they name — the tool only counts, it does not store what they name. This is intentional: the exercise is the process, not the record.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-grounding-widget>
  <h2 data-grounding-prompt class="font-serif text-2xl text-forest-100 mb-2">Name 5 things you can see</h2>
  <p class="text-forest-300 text-sm mb-6">Look around. Tap the button as you name each one out loud or in your head.</p>

  <div class="flex items-center gap-4 mb-6">
    <div data-grounding-count class="font-serif text-6xl font-semibold text-bronze-400 tabular-nums">5</div>
    <div class="text-forest-300 text-sm">remaining</div>
  </div>

  <button
    data-grounding-tap
    class="w-full py-4 rounded-lg bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
  >
    I named one
  </button>

  <button
    data-grounding-reset
    class="w-full mt-3 py-2 text-sm text-forest-400 hover:text-forest-200 transition-colors"
  >
    Start over
  </button>
</div>

<script>
  const steps = [
    { sense: 'see', count: 5 },
    { sense: 'touch', count: 4 },
    { sense: 'hear', count: 3 },
    { sense: 'smell', count: 2 },
    { sense: 'taste', count: 1 },
  ];

  const widgets = document.querySelectorAll('[data-grounding-widget]');
  widgets.forEach((root) => {
    const promptEl = root.querySelector<HTMLElement>('[data-grounding-prompt]')!;
    const countEl = root.querySelector<HTMLElement>('[data-grounding-count]')!;
    const tapBtn = root.querySelector<HTMLButtonElement>('[data-grounding-tap]')!;
    const resetBtn = root.querySelector<HTMLButtonElement>('[data-grounding-reset]')!;

    let stepIdx = 0;
    let remaining = steps[0].count;

    function render() {
      if (stepIdx >= steps.length) {
        promptEl.textContent = 'You are here.';
        countEl.textContent = '✓';
        tapBtn.textContent = 'Done';
        tapBtn.disabled = true;
        return;
      }
      const s = steps[stepIdx];
      promptEl.textContent = `Name ${s.count} thing${s.count > 1 ? 's' : ''} you can ${s.sense}`;
      countEl.textContent = String(remaining);
      tapBtn.textContent = 'I named one';
      tapBtn.disabled = false;
    }

    function tap() {
      remaining -= 1;
      if (remaining <= 0) {
        stepIdx += 1;
        if (stepIdx < steps.length) remaining = steps[stepIdx].count;
      }
      render();
    }

    function reset() {
      stepIdx = 0;
      remaining = steps[0].count;
      render();
    }

    tapBtn.addEventListener('click', tap);
    resetBtn.addEventListener('click', reset);
    render();
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `Grounding` to both maps (`src/pages/tools/[slug].astro` and `fullscreen.astro`) following the same pattern as prior tasks.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/grounding` and verify: prompt starts at "Name 5 things you can see", tapping the button decrements the counter, at 0 it advances to "touch" (4), then "hear" (3), etc. Reset button restarts.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/grounding.md src/components/tools/Grounding.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add 5-4-3-2-1 grounding widget"
```

---

## Phase 3: BLS widgets

The clinical core. Visual BLS first (establishes patterns for audio and combined). All four BLS tools are `audience: [clinician]` only.

---

### Task 14: Visual BLS widget

**Files:**
- Create: `src/content/tools/bls-visual.md`
- Create: `src/components/tools/BLSVisual.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Visual Bilateral Stimulation"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Horizontal-moving dot for eye-movement bilateral stimulation. Adjustable speed, size, color. Use fullscreen for in-session delivery."
componentName: "BLSVisual"
citations:
  - label: "Shapiro (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed."
  - label: "EMDRIA — Standard EMDR Protocol"
    url: "https://www.emdria.org"
warnings:
  - "Photosensitive epilepsy warning: this tool uses sustained horizontal motion."
  - "Not recommended for home use without clinician supervision."
---

## What this is

A horizontal-moving visual stimulus for eye-movement bilateral stimulation during Phase 4 desensitization or Phase 5 installation. Dot moves edge to edge at a configurable speed.

## When to use it

- **Phase 4 Desensitization:** Between check-ins, while the client tracks the dot with their eyes.
- **Phase 5 Installation:** To strengthen the positive cognition.

## Clinical notes

Shapiro's standard is approximately 1 second per full left-right cycle (1 Hz), with sets of roughly 24 passes. Faster for desensitization, slower for installation. Adjust per client tolerance and response. Use fullscreen mode to remove visual distractions and give the client clean tracking.

## Parameter defaults

- **Speed:** 1.0 Hz (one full left-right cycle per second)
- **Set length:** 24 passes
- **Dot size:** 48 px
- **Dot color:** warm white on dark background
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-5xl mx-auto p-4 flex flex-col"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
const trackHeight = fullscreen ? "h-96" : "h-64";
---

<div class:list={[containerClass]} data-bls-visual-widget data-fullscreen={fullscreen}>
  {!fullscreen && (
    <div class="mb-4 p-3 border border-amber-500/50 bg-amber-900/20 rounded-md text-amber-100 text-xs">
      ⚠ Photosensitive epilepsy warning: this tool uses sustained horizontal motion.
    </div>
  )}

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
    <label class="text-forest-200 text-xs">
      Speed (Hz)
      <input data-bls-speed type="range" min="0.3" max="2" step="0.1" value="1.0" class="w-full accent-bronze-500" />
      <span data-bls-speed-value class="block text-center text-forest-100 tabular-nums">1.0</span>
    </label>
    <label class="text-forest-200 text-xs">
      Passes / set
      <input data-bls-passes type="range" min="6" max="48" step="2" value="24" class="w-full accent-bronze-500" />
      <span data-bls-passes-value class="block text-center text-forest-100 tabular-nums">24</span>
    </label>
    <label class="text-forest-200 text-xs">
      Dot size
      <input data-bls-size type="range" min="20" max="100" step="4" value="48" class="w-full accent-bronze-500" />
      <span data-bls-size-value class="block text-center text-forest-100 tabular-nums">48</span>
    </label>
    <label class="text-forest-200 text-xs">
      Dot color
      <input data-bls-color type="color" value="#FFF8E7" class="w-full h-6" />
    </label>
  </div>

  <div class:list={["relative w-full bg-black rounded-lg overflow-hidden", trackHeight]} data-bls-track>
    <div
      data-bls-dot
      class="absolute top-1/2 rounded-full"
      style="width: 48px; height: 48px; background: #FFF8E7; transform: translate(0, -50%);"
    ></div>
  </div>

  <div class="mt-4 flex items-center gap-3">
    <button
      data-bls-toggle
      class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
    >
      Start
    </button>
    <span data-bls-count class="text-forest-300 text-sm tabular-nums">0 / 24</span>
    <div class="flex-1"></div>
    <label class="text-forest-300 text-xs flex items-center gap-2">
      <input type="checkbox" data-bls-continuous class="accent-bronze-500" /> continuous
    </label>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-bls-visual-widget]');
  widgets.forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-bls-track]')!;
    const dot = root.querySelector<HTMLElement>('[data-bls-dot]')!;
    const speed = root.querySelector<HTMLInputElement>('[data-bls-speed]')!;
    const speedVal = root.querySelector<HTMLElement>('[data-bls-speed-value]')!;
    const passes = root.querySelector<HTMLInputElement>('[data-bls-passes]')!;
    const passesVal = root.querySelector<HTMLElement>('[data-bls-passes-value]')!;
    const size = root.querySelector<HTMLInputElement>('[data-bls-size]')!;
    const sizeVal = root.querySelector<HTMLElement>('[data-bls-size-value]')!;
    const color = root.querySelector<HTMLInputElement>('[data-bls-color]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-bls-toggle]')!;
    const count = root.querySelector<HTMLElement>('[data-bls-count]')!;
    const continuous = root.querySelector<HTMLInputElement>('[data-bls-continuous]')!;

    let running = false;
    let rafId = 0;
    let startTs = 0;
    let passCount = 0;

    function applyVisuals() {
      const s = parseInt(size.value, 10);
      dot.style.width = `${s}px`;
      dot.style.height = `${s}px`;
      dot.style.background = color.value;
    }

    function reset() {
      running = false;
      cancelAnimationFrame(rafId);
      passCount = 0;
      toggle.textContent = 'Start';
      count.textContent = `0 / ${passes.value}`;
      dot.style.transform = 'translate(0, -50%)';
    }

    function tick(ts: number) {
      if (!running) return;
      if (!startTs) startTs = ts;
      const hz = parseFloat(speed.value);
      const elapsed = (ts - startTs) / 1000;
      const phase = (elapsed * hz) % 1;
      const trackWidth = track.clientWidth - dot.clientWidth;
      const x = trackWidth * (0.5 - 0.5 * Math.cos(phase * 2 * Math.PI));
      dot.style.transform = `translate(${x}px, -50%)`;
      const newCount = Math.floor(elapsed * hz * 2);
      if (newCount !== passCount) {
        passCount = newCount;
        count.textContent = `${passCount} / ${passes.value}`;
        if (!continuous.checked && passCount >= parseInt(passes.value, 10)) {
          reset();
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      applyVisuals();
      running = true;
      startTs = 0;
      passCount = 0;
      toggle.textContent = 'Stop';
      rafId = requestAnimationFrame(tick);
    }

    toggle.addEventListener('click', () => (running ? reset() : start()));
    speed.addEventListener('input', () => (speedVal.textContent = parseFloat(speed.value).toFixed(1)));
    passes.addEventListener('input', () => {
      passesVal.textContent = passes.value;
      if (!running) count.textContent = `0 / ${passes.value}`;
    });
    size.addEventListener('input', () => {
      sizeVal.textContent = size.value;
      applyVisuals();
    });
    color.addEventListener('input', applyVisuals);
    applyVisuals();

    document.addEventListener('keydown', (e) => {
      if (e.key === ' ' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        running ? reset() : start();
      }
    });
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `BLSVisual` to the widget maps in `src/pages/tools/[slug].astro` and `src/pages/tools/[slug]/fullscreen.astro`.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/bls-visual`. Verify: dot moves horizontally when Start is pressed, speed slider changes rate, pass counter increments, auto-stops at set length unless "continuous" is checked, fullscreen mode gives a large black track with just the dot, Space toggles Start/Stop.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/bls-visual.md src/components/tools/BLSVisual.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add visual BLS widget"
```

---

### Task 15: Audio BLS widget

**Files:**
- Create: `src/content/tools/bls-audio.md`
- Create: `src/components/tools/BLSAudio.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Audio Bilateral Stimulation"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Alternating left/right stereo tones for auditory BLS. Requires headphones. Adjustable speed, tone, volume."
componentName: "BLSAudio"
citations:
  - label: "Shapiro (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy, 3rd ed."
warnings:
  - "Headphones required — stereo separation is what makes this bilateral."
  - "Not recommended for home use without clinician supervision."
---

## What this is

Alternating left/right stereo tones delivered via the Web Audio API. Used when eye movements are contraindicated or the client prefers auditory BLS.

## When to use it

- **When eye movements are not tolerated** (e.g., severely activated clients, photophobia, visual impairment).
- **As an alternative modality** during long desensitization sessions to reduce eye fatigue.

## Clinical notes

Uses hard-panned stereo (full left/full right) for clear bilateral separation. Default frequency 440 Hz. Starting the tool requires a user gesture due to browser autoplay policy — clients will see a "Start" button that must be tapped before sound plays.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-bls-audio-widget>
  <div class="mb-4 p-3 border border-amber-500/50 bg-amber-900/20 rounded-md text-amber-100 text-xs">
    🎧 Headphones required — stereo separation is what makes this bilateral.
  </div>

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
    <label class="text-forest-200 text-xs">
      Speed (Hz)
      <input data-bls-speed type="range" min="0.3" max="2" step="0.1" value="1.0" class="w-full accent-bronze-500" />
      <span data-bls-speed-value class="block text-center text-forest-100 tabular-nums">1.0</span>
    </label>
    <label class="text-forest-200 text-xs">
      Passes / set
      <input data-bls-passes type="range" min="6" max="48" step="2" value="24" class="w-full accent-bronze-500" />
      <span data-bls-passes-value class="block text-center text-forest-100 tabular-nums">24</span>
    </label>
    <label class="text-forest-200 text-xs">
      Tone (Hz)
      <input data-bls-freq type="range" min="220" max="880" step="10" value="440" class="w-full accent-bronze-500" />
      <span data-bls-freq-value class="block text-center text-forest-100 tabular-nums">440</span>
    </label>
    <label class="text-forest-200 text-xs">
      Volume
      <input data-bls-volume type="range" min="0" max="1" step="0.05" value="0.3" class="w-full accent-bronze-500" />
      <span data-bls-volume-value class="block text-center text-forest-100 tabular-nums">30%</span>
    </label>
  </div>

  <div class="flex items-center gap-4">
    <button
      data-bls-toggle
      class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
    >
      Start
    </button>
    <span data-bls-count class="text-forest-300 text-sm tabular-nums">0 / 24</span>
    <div class="flex-1"></div>
    <div class="flex gap-4 text-forest-300 text-sm">
      <span data-bls-indicator-l class="opacity-30">◀ L</span>
      <span data-bls-indicator-r class="opacity-30">R ▶</span>
    </div>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-bls-audio-widget]');
  widgets.forEach((root) => {
    const speed = root.querySelector<HTMLInputElement>('[data-bls-speed]')!;
    const speedVal = root.querySelector<HTMLElement>('[data-bls-speed-value]')!;
    const passes = root.querySelector<HTMLInputElement>('[data-bls-passes]')!;
    const passesVal = root.querySelector<HTMLElement>('[data-bls-passes-value]')!;
    const freq = root.querySelector<HTMLInputElement>('[data-bls-freq]')!;
    const freqVal = root.querySelector<HTMLElement>('[data-bls-freq-value]')!;
    const vol = root.querySelector<HTMLInputElement>('[data-bls-volume]')!;
    const volVal = root.querySelector<HTMLElement>('[data-bls-volume-value]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-bls-toggle]')!;
    const count = root.querySelector<HTMLElement>('[data-bls-count]')!;
    const indL = root.querySelector<HTMLElement>('[data-bls-indicator-l]')!;
    const indR = root.querySelector<HTMLElement>('[data-bls-indicator-r]')!;

    let ctx: AudioContext | null = null;
    let running = false;
    let passCount = 0;
    let intervalId = 0;
    let side: 'L' | 'R' = 'L';

    function playPulse(pan: number) {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      osc.type = 'sine';
      osc.frequency.value = parseFloat(freq.value);
      panner.pan.value = pan;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(parseFloat(vol.value), ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.connect(gain).connect(panner).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }

    function tick() {
      const pan = side === 'L' ? -1 : 1;
      playPulse(pan);
      indL.style.opacity = side === 'L' ? '1' : '0.3';
      indR.style.opacity = side === 'R' ? '1' : '0.3';
      side = side === 'L' ? 'R' : 'L';
      passCount += 1;
      count.textContent = `${passCount} / ${passes.value}`;
      if (passCount >= parseInt(passes.value, 10)) {
        stop();
      }
    }

    function start() {
      ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      running = true;
      passCount = 0;
      side = 'L';
      toggle.textContent = 'Stop';
      const hz = parseFloat(speed.value);
      const intervalMs = 1000 / (hz * 2);
      tick();
      intervalId = window.setInterval(tick, intervalMs);
    }

    function stop() {
      running = false;
      clearInterval(intervalId);
      toggle.textContent = 'Start';
      indL.style.opacity = '0.3';
      indR.style.opacity = '0.3';
    }

    toggle.addEventListener('click', () => (running ? stop() : start()));
    speed.addEventListener('input', () => (speedVal.textContent = parseFloat(speed.value).toFixed(1)));
    passes.addEventListener('input', () => {
      passesVal.textContent = passes.value;
      if (!running) count.textContent = `0 / ${passes.value}`;
    });
    freq.addEventListener('input', () => (freqVal.textContent = freq.value));
    vol.addEventListener('input', () => (volVal.textContent = `${Math.round(parseFloat(vol.value) * 100)}%`));
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `BLSAudio` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/bls-audio` with headphones. Verify: Start button creates audio context, tones alternate clearly between left and right ears, L/R indicators flash in sync, passes count up, auto-stops at the set length, volume/frequency/speed sliders affect output.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/bls-audio.md src/components/tools/BLSAudio.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add audio BLS widget"
```

---

### Task 16: Combined BLS widget (visual + audio)

**Files:**
- Create: `src/content/tools/bls-combined.md`
- Create: `src/components/tools/BLSCombined.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Combined Visual + Audio BLS"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Visual dot synced with alternating left/right audio tones. Dual-channel BLS for clients who benefit from multiple modalities."
componentName: "BLSCombined"
citations:
  - label: "Shapiro (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy, 3rd ed."
warnings:
  - "Photosensitive epilepsy warning: this tool uses sustained horizontal motion."
  - "Headphones required for audio component."
  - "Not recommended for home use without clinician supervision."
---

## What this is

Combines the moving visual dot and alternating stereo tones into a single synchronized experience. Audio can be toggled on or off without restarting the visual.

## When to use it

- **When multi-modal BLS is desirable** — some clients process more effectively with dual channels.
- **As a fallback** if the client starts to dissociate on single-channel BLS; the extra sensory input can help maintain dual attention.

## Clinical notes

Visual and audio are driven from the same internal clock — when the dot hits the left edge, a left-panned tone plays; right edge, right tone. Audio can be muted on the fly via the checkbox.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-5xl mx-auto p-4 flex flex-col"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
const trackHeight = fullscreen ? "h-96" : "h-64";
---

<div class:list={[containerClass]} data-bls-combined-widget>
  {!fullscreen && (
    <div class="mb-4 p-3 border border-amber-500/50 bg-amber-900/20 rounded-md text-amber-100 text-xs">
      ⚠ Photosensitive epilepsy and headphone warnings apply. Use in clinician-supervised sessions only.
    </div>
  )}

  <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
    <label class="text-forest-200 text-xs">
      Speed (Hz)
      <input data-speed type="range" min="0.3" max="2" step="0.1" value="1.0" class="w-full accent-bronze-500" />
      <span data-speed-value class="block text-center text-forest-100 tabular-nums">1.0</span>
    </label>
    <label class="text-forest-200 text-xs">
      Passes / set
      <input data-passes type="range" min="6" max="48" step="2" value="24" class="w-full accent-bronze-500" />
      <span data-passes-value class="block text-center text-forest-100 tabular-nums">24</span>
    </label>
    <label class="text-forest-200 text-xs">
      Tone (Hz)
      <input data-freq type="range" min="220" max="880" step="10" value="440" class="w-full accent-bronze-500" />
      <span data-freq-value class="block text-center text-forest-100 tabular-nums">440</span>
    </label>
    <label class="text-forest-200 text-xs">
      Volume
      <input data-volume type="range" min="0" max="1" step="0.05" value="0.3" class="w-full accent-bronze-500" />
      <span data-volume-value class="block text-center text-forest-100 tabular-nums">30%</span>
    </label>
  </div>

  <div class:list={["relative w-full bg-black rounded-lg overflow-hidden", trackHeight]} data-track>
    <div
      data-dot
      class="absolute top-1/2 rounded-full"
      style="width: 48px; height: 48px; background: #FFF8E7; transform: translate(0, -50%);"
    ></div>
  </div>

  <div class="mt-4 flex items-center gap-4 flex-wrap">
    <button
      data-toggle
      class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
    >
      Start
    </button>
    <span data-count class="text-forest-300 text-sm tabular-nums">0 / 24</span>
    <label class="text-forest-300 text-xs flex items-center gap-2">
      <input type="checkbox" data-audio-on checked class="accent-bronze-500" /> audio
    </label>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-bls-combined-widget]');
  widgets.forEach((root) => {
    const track = root.querySelector<HTMLElement>('[data-track]')!;
    const dot = root.querySelector<HTMLElement>('[data-dot]')!;
    const speed = root.querySelector<HTMLInputElement>('[data-speed]')!;
    const speedVal = root.querySelector<HTMLElement>('[data-speed-value]')!;
    const passes = root.querySelector<HTMLInputElement>('[data-passes]')!;
    const passesVal = root.querySelector<HTMLElement>('[data-passes-value]')!;
    const freq = root.querySelector<HTMLInputElement>('[data-freq]')!;
    const freqVal = root.querySelector<HTMLElement>('[data-freq-value]')!;
    const vol = root.querySelector<HTMLInputElement>('[data-volume]')!;
    const volVal = root.querySelector<HTMLElement>('[data-volume-value]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')!;
    const count = root.querySelector<HTMLElement>('[data-count]')!;
    const audioOn = root.querySelector<HTMLInputElement>('[data-audio-on]')!;

    let ctx: AudioContext | null = null;
    let running = false;
    let rafId = 0;
    let startTs = 0;
    let lastEdge: 'L' | 'R' | null = null;
    let passCount = 0;

    function playPulse(pan: number) {
      if (!ctx || !audioOn.checked) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const panner = ctx.createStereoPanner();
      osc.type = 'sine';
      osc.frequency.value = parseFloat(freq.value);
      panner.pan.value = pan;
      gain.gain.value = 0;
      gain.gain.linearRampToValueAtTime(parseFloat(vol.value), ctx.currentTime + 0.01);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
      osc.connect(gain).connect(panner).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }

    function reset() {
      running = false;
      cancelAnimationFrame(rafId);
      passCount = 0;
      lastEdge = null;
      toggle.textContent = 'Start';
      count.textContent = `0 / ${passes.value}`;
      dot.style.transform = 'translate(0, -50%)';
    }

    function tick(ts: number) {
      if (!running) return;
      if (!startTs) startTs = ts;
      const hz = parseFloat(speed.value);
      const elapsed = (ts - startTs) / 1000;
      const phase = (elapsed * hz) % 1;
      const trackWidth = track.clientWidth - dot.clientWidth;
      const cos = Math.cos(phase * 2 * Math.PI);
      const x = trackWidth * (0.5 - 0.5 * cos);
      dot.style.transform = `translate(${x}px, -50%)`;

      // Trigger audio on edge crossings
      const edge = cos > 0.98 ? 'L' : cos < -0.98 ? 'R' : null;
      if (edge && edge !== lastEdge) {
        playPulse(edge === 'L' ? -1 : 1);
        lastEdge = edge;
      } else if (!edge) {
        lastEdge = null;
      }

      const newCount = Math.floor(elapsed * hz * 2);
      if (newCount !== passCount) {
        passCount = newCount;
        count.textContent = `${passCount} / ${passes.value}`;
        if (passCount >= parseInt(passes.value, 10)) {
          reset();
          return;
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    function start() {
      ctx = ctx ?? new (window.AudioContext || (window as any).webkitAudioContext)();
      running = true;
      startTs = 0;
      passCount = 0;
      lastEdge = null;
      toggle.textContent = 'Stop';
      rafId = requestAnimationFrame(tick);
    }

    toggle.addEventListener('click', () => (running ? reset() : start()));
    speed.addEventListener('input', () => (speedVal.textContent = parseFloat(speed.value).toFixed(1)));
    passes.addEventListener('input', () => {
      passesVal.textContent = passes.value;
      if (!running) count.textContent = `0 / ${passes.value}`;
    });
    freq.addEventListener('input', () => (freqVal.textContent = freq.value));
    vol.addEventListener('input', () => (volVal.textContent = `${Math.round(parseFloat(vol.value) * 100)}%`));
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `BLSCombined` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/bls-combined`. Verify: dot moves AND tones fire at the edges; toggling audio checkbox mutes just the audio without stopping the visual; pass counter still works.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/bls-combined.md src/components/tools/BLSCombined.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add combined visual+audio BLS widget"
```

---

### Task 17: Self-tapping guide widget

**Files:**
- Create: `src/content/tools/bls-tapping.md`
- Create: `src/components/tools/BLSTapping.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Self-Tapping Guide"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Large alternating left/right visual cues to pace self-administered tapping (butterfly hug, knee-tap) when eye movements are contraindicated."
componentName: "BLSTapping"
citations:
  - label: "Shapiro (2018). EMDR Therapy, 3rd ed."
  - label: "Artigas & Jarero (1998). Butterfly Hug protocol."
warnings:
  - "Not recommended for home use without clinician supervision."
---

## What this is

Large alternating left/right visual cues that pace self-tapping (butterfly hug, knee tapping, alternating shoulder tap). Used when eye movements are not tolerated — the client taps themselves in sync with the visual pulses.

## When to use it

- **When eye-movement BLS is contraindicated** — severe activation, photophobia, visual impairment.
- **When a client prefers body-based BLS** or has already learned to self-administer.
- **In telehealth sessions** where the therapist wants to pace the client's own tapping rhythm from a shared screen.

## Clinical notes

Unlike the visual BLS tool (which asks the client to track with their eyes), this tool is a *metronome* — the client doesn't watch it continuously, they use it to keep a steady tapping rhythm. The visual is deliberately large and high-contrast so it's readable in peripheral vision.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-5xl mx-auto p-4 flex flex-col"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
const panelHeight = fullscreen ? "h-80" : "h-48";
---

<div class:list={[containerClass]} data-bls-tapping-widget>
  <div class="mb-4 grid grid-cols-3 gap-3">
    <label class="text-forest-200 text-xs">
      Speed (Hz)
      <input data-speed type="range" min="0.3" max="2" step="0.1" value="1.0" class="w-full accent-bronze-500" />
      <span data-speed-value class="block text-center text-forest-100 tabular-nums">1.0</span>
    </label>
    <label class="text-forest-200 text-xs">
      Passes / set
      <input data-passes type="range" min="6" max="48" step="2" value="24" class="w-full accent-bronze-500" />
      <span data-passes-value class="block text-center text-forest-100 tabular-nums">24</span>
    </label>
    <div class="text-forest-200 text-xs flex flex-col justify-end">
      <span data-count class="text-center text-forest-100 text-sm tabular-nums">0 / 24</span>
    </div>
  </div>

  <div class:list={["grid grid-cols-2 gap-3", panelHeight]}>
    <div data-side="L" class="rounded-lg border-2 border-forest-600 bg-forest-900 flex items-center justify-center text-forest-500 text-5xl font-bold transition-all duration-100">
      L
    </div>
    <div data-side="R" class="rounded-lg border-2 border-forest-600 bg-forest-900 flex items-center justify-center text-forest-500 text-5xl font-bold transition-all duration-100">
      R
    </div>
  </div>

  <div class="mt-4 flex items-center gap-4">
    <button
      data-toggle
      class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
    >
      Start
    </button>
    <p class="text-forest-300 text-xs">Tap your own knees / shoulders / butterfly hug in time with the highlighted side.</p>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-bls-tapping-widget]');
  widgets.forEach((root) => {
    const speed = root.querySelector<HTMLInputElement>('[data-speed]')!;
    const speedVal = root.querySelector<HTMLElement>('[data-speed-value]')!;
    const passes = root.querySelector<HTMLInputElement>('[data-passes]')!;
    const passesVal = root.querySelector<HTMLElement>('[data-passes-value]')!;
    const count = root.querySelector<HTMLElement>('[data-count]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')!;
    const panelL = root.querySelector<HTMLElement>('[data-side="L"]')!;
    const panelR = root.querySelector<HTMLElement>('[data-side="R"]')!;

    let running = false;
    let passCount = 0;
    let side: 'L' | 'R' = 'L';
    let intervalId = 0;

    function highlight(which: 'L' | 'R') {
      [panelL, panelR].forEach((p) => {
        p.classList.remove('bg-bronze-500', 'text-forest-900', 'border-bronze-300');
        p.classList.add('bg-forest-900', 'text-forest-500', 'border-forest-600');
      });
      const active = which === 'L' ? panelL : panelR;
      active.classList.remove('bg-forest-900', 'text-forest-500', 'border-forest-600');
      active.classList.add('bg-bronze-500', 'text-forest-900', 'border-bronze-300');
    }

    function tick() {
      highlight(side);
      side = side === 'L' ? 'R' : 'L';
      passCount += 1;
      count.textContent = `${passCount} / ${passes.value}`;
      if (passCount >= parseInt(passes.value, 10)) {
        stop();
      }
    }

    function start() {
      running = true;
      passCount = 0;
      side = 'L';
      toggle.textContent = 'Stop';
      tick();
      const hz = parseFloat(speed.value);
      const intervalMs = 1000 / (hz * 2);
      intervalId = window.setInterval(tick, intervalMs);
    }

    function stop() {
      running = false;
      clearInterval(intervalId);
      toggle.textContent = 'Start';
      [panelL, panelR].forEach((p) => {
        p.classList.remove('bg-bronze-500', 'text-forest-900', 'border-bronze-300');
        p.classList.add('bg-forest-900', 'text-forest-500', 'border-forest-600');
      });
      count.textContent = `0 / ${passes.value}`;
    }

    toggle.addEventListener('click', () => (running ? stop() : start()));
    speed.addEventListener('input', () => (speedVal.textContent = parseFloat(speed.value).toFixed(1)));
    passes.addEventListener('input', () => {
      passesVal.textContent = passes.value;
      if (!running) count.textContent = `0 / ${passes.value}`;
    });
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `BLSTapping` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/bls-tapping`. Verify: L and R panels alternately highlight at the set rate, counter increments, auto-stops.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/bls-tapping.md src/components/tools/BLSTapping.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add self-tapping guide widget"
```

---

## Phase 4: Narrative widgets

Container, safe place, lightstream, butterfly hug, feeling wheel. More copy-heavy and scenario-based.

---

### Task 18: Container exercise widget

**Files:**
- Create: `src/content/tools/container.md`
- Create: `src/components/tools/Container.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Container Exercise"
category: preparation
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: clinical-consensus
shortDescription: "Interactive container visualization — pick a box, name what's bothering you, put it inside, lock it, put it somewhere safe until you can come back to it."
componentName: "Container"
citations:
  - label: "Shapiro (2018). EMDR Therapy, 3rd ed. — Phase 2 resource installation."
warnings: []
---

## What this is

A guided container exercise: you pick a container you like, put the things that are bothering you inside it, lock it, and decide where to keep it safe. It's a way of saying "this is important, and I can come back to it — but right now I don't have to carry it."

## When to use it

- **Clinicians:** Phase 2 preparation, containment of between-session material, or at closure if anything came up that the client needs to set aside.
- **Families:** At bedtime if worries are piling up. Before school if something big is on your child's mind.

## Clinical notes

Nothing the user names is stored. The exercise is about the *process* of choosing, naming, and setting aside — not about keeping a list.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-container-widget>
  <!-- Step 1: choose container -->
  <div data-step="1" data-step-active>
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 1: Pick your container</h2>
    <p class="text-forest-300 text-sm mb-4">Which of these feels right for today?</p>
    <div class="grid grid-cols-2 gap-3">
      {['Wooden box', 'Steel vault', 'Treasure chest', 'Balloon'].map((c) => (
        <button data-pick-container={c} class="p-4 bg-forest-700 border border-forest-600 rounded-lg text-forest-100 hover:bg-forest-600 transition-colors">
          {c}
        </button>
      ))}
    </div>
  </div>

  <!-- Step 2: add worries -->
  <div data-step="2" class="hidden">
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 2: Put things inside</h2>
    <p class="text-forest-300 text-sm mb-4">Type a word or phrase for something you want to set aside, then add it. You can add as many as you want.</p>
    <div class="flex gap-2 mb-4">
      <input type="text" data-worry-input placeholder="e.g. the test on Friday" class="flex-1 px-3 py-2 rounded-md bg-forest-700 border border-forest-600 text-forest-100 placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-bronze-500" />
      <button data-worry-add class="px-4 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors">Add</button>
    </div>
    <ul data-worry-list class="mb-4 space-y-1 text-forest-200 text-sm"></ul>
    <button data-to-step-3 class="px-4 py-2 rounded-md bg-forest-700 border border-forest-600 text-forest-100 hover:bg-forest-600 transition-colors">
      Close the container
    </button>
  </div>

  <!-- Step 3: lock -->
  <div data-step="3" class="hidden">
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 3: Lock it</h2>
    <p class="text-forest-300 text-sm mb-4">Imagine closing your container. What kind of lock does it have?</p>
    <div class="grid grid-cols-2 gap-3 mb-4">
      {['Key', 'Combination', 'Magic word', 'Knot'].map((l) => (
        <button data-pick-lock={l} class="p-4 bg-forest-700 border border-forest-600 rounded-lg text-forest-100 hover:bg-forest-600 transition-colors">{l}</button>
      ))}
    </div>
  </div>

  <!-- Step 4: place -->
  <div data-step="4" class="hidden">
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 4: Put it somewhere safe</h2>
    <p class="text-forest-300 text-sm mb-4">Where will you keep it until you're ready to come back?</p>
    <div class="grid grid-cols-2 gap-3 mb-4">
      {['High shelf', 'Deep ocean', 'Locked room', 'Another planet'].map((p) => (
        <button data-pick-place={p} class="p-4 bg-forest-700 border border-forest-600 rounded-lg text-forest-100 hover:bg-forest-600 transition-colors">{p}</button>
      ))}
    </div>
  </div>

  <!-- Step 5: done -->
  <div data-step="5" class="hidden text-center">
    <h2 class="font-serif text-2xl text-forest-100 mb-3">It's put away.</h2>
    <p data-summary class="text-forest-300 mb-6"></p>
    <p class="text-forest-300 text-sm mb-6">Take a slow breath. You can come back to it whenever you're ready.</p>
    <button data-restart class="px-4 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors">Do it again</button>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-container-widget]');
  widgets.forEach((root) => {
    const steps: Record<string, HTMLElement> = {};
    root.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
      steps[el.getAttribute('data-step')!] = el;
    });

    let state = { container: '', lock: '', place: '', worries: [] as string[] };

    function showStep(n: string) {
      Object.values(steps).forEach((el) => el.classList.add('hidden'));
      steps[n].classList.remove('hidden');
    }

    root.querySelectorAll<HTMLButtonElement>('[data-pick-container]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.container = btn.getAttribute('data-pick-container')!;
        showStep('2');
      });
    });

    const input = root.querySelector<HTMLInputElement>('[data-worry-input]')!;
    const list = root.querySelector<HTMLElement>('[data-worry-list]')!;
    root.querySelector<HTMLButtonElement>('[data-worry-add]')!.addEventListener('click', () => {
      const v = input.value.trim();
      if (!v) return;
      state.worries.push(v);
      const li = document.createElement('li');
      li.textContent = `• ${v}`;
      list.appendChild(li);
      input.value = '';
      input.focus();
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') root.querySelector<HTMLButtonElement>('[data-worry-add]')!.click();
    });

    root.querySelector<HTMLButtonElement>('[data-to-step-3]')!.addEventListener('click', () => showStep('3'));

    root.querySelectorAll<HTMLButtonElement>('[data-pick-lock]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.lock = btn.getAttribute('data-pick-lock')!;
        showStep('4');
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-pick-place]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.place = btn.getAttribute('data-pick-place')!;
        const summary = root.querySelector<HTMLElement>('[data-summary]')!;
        summary.textContent = `Your ${state.container.toLowerCase()} is locked with a ${state.lock.toLowerCase()} and kept ${state.place.toLowerCase()}.`;
        showStep('5');
      });
    });

    root.querySelector<HTMLButtonElement>('[data-restart]')!.addEventListener('click', () => {
      state = { container: '', lock: '', place: '', worries: [] };
      list.innerHTML = '';
      showStep('1');
    });
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `Container` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/container`. Walk through all 5 steps and verify: container choice advances, worries can be added and appear in list, "Close the container" advances, lock choice advances, place choice shows summary, restart clears everything.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/container.md src/components/tools/Container.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add container exercise widget"
```

---

### Task 19: Safe place builder widget

**Files:**
- Create: `src/content/tools/safe-place.md`
- Create: `src/components/tools/SafePlace.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Safe Place Builder"
category: preparation
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: research-backed
shortDescription: "Guided picker for building a calm, safe inner place with sensory details. Phase 2 resource installation made interactive."
componentName: "SafePlace"
citations:
  - label: "Shapiro (2018). EMDR Therapy, 3rd ed. — Phase 2 Safe/Calm Place protocol."
warnings: []
---

## What this is

A guided walkthrough of the classic safe-place resource: pick an environment, add comfort elements, describe sensory details, and anchor the experience. Nothing is stored — the exercise is the point.

## When to use it

- **Phase 2 preparation**, when first installing the safe place resource.
- **Closure**, if a session's content leaves the client without their resource readily accessible.
- **Home use**, as a re-anchoring exercise.

## Clinical notes

For in-session resource installation, the clinician may add BLS after the client settles into the safe place. This tool does not provide the BLS — use the Visual BLS or Audio BLS tool alongside.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-safeplace-widget>
  <div data-step="env" data-step-active>
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 1: Where is your calm place?</h2>
    <div class="grid grid-cols-2 gap-3">
      {['A forest', 'A beach', 'A meadow', 'A mountain top', 'A room I know', 'Somewhere imagined'].map((e) => (
        <button data-pick-env={e} class="p-4 bg-forest-700 border border-forest-600 rounded-lg text-forest-100 hover:bg-forest-600 transition-colors text-sm">
          {e}
        </button>
      ))}
    </div>
  </div>

  <div data-step="comfort" class="hidden">
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 2: What's with you there?</h2>
    <p class="text-forest-300 text-sm mb-4">Pick anything that feels comforting. You can pick more than one.</p>
    <div class="grid grid-cols-2 gap-3 mb-4" data-comfort-options>
      {['An animal', 'A soft blanket', 'Music', 'A person who feels safe', 'Warm sun', 'Cool breeze'].map((c) => (
        <button data-pick-comfort={c} class="p-4 bg-forest-700 border border-forest-600 rounded-lg text-forest-100 hover:bg-forest-600 transition-colors text-sm">
          {c}
        </button>
      ))}
    </div>
    <button data-to-senses class="px-4 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors">
      Next
    </button>
  </div>

  <div data-step="senses" class="hidden">
    <h2 class="font-serif text-xl text-forest-100 mb-3">Step 3: Use your senses</h2>
    <p class="text-forest-300 text-sm mb-4">Picture it as clearly as you can. Take your time with each one.</p>
    <ol class="space-y-3 text-forest-200 text-sm mb-6 list-decimal list-inside">
      <li>What do you <strong>see</strong>?</li>
      <li>What do you <strong>hear</strong>?</li>
      <li>What do you <strong>smell</strong>?</li>
      <li>What do you <strong>feel</strong> — on your skin, under your feet?</li>
      <li>How does your body feel when you're there?</li>
    </ol>
    <button data-to-done class="px-4 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors">
      Stay here for a moment
    </button>
  </div>

  <div data-step="done" class="hidden text-center">
    <h2 class="font-serif text-2xl text-forest-100 mb-3">This place is yours.</h2>
    <p data-safe-summary class="text-forest-300 mb-4"></p>
    <p class="text-forest-300 text-sm mb-6">Rest here as long as you need. When you're ready, you can open your eyes.</p>
    <button data-restart class="px-4 py-2 rounded-md bg-forest-700 border border-forest-600 text-forest-100 hover:bg-forest-600 transition-colors">Start over</button>
  </div>
</div>

<script>
  const widgets = document.querySelectorAll('[data-safeplace-widget]');
  widgets.forEach((root) => {
    const steps: Record<string, HTMLElement> = {};
    root.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
      steps[el.getAttribute('data-step')!] = el;
    });

    let state = { env: '', comforts: [] as string[] };

    function showStep(n: string) {
      Object.values(steps).forEach((el) => el.classList.add('hidden'));
      steps[n].classList.remove('hidden');
    }

    root.querySelectorAll<HTMLButtonElement>('[data-pick-env]').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.env = btn.getAttribute('data-pick-env')!;
        showStep('comfort');
      });
    });

    root.querySelectorAll<HTMLButtonElement>('[data-pick-comfort]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.getAttribute('data-pick-comfort')!;
        if (state.comforts.includes(val)) {
          state.comforts = state.comforts.filter((c) => c !== val);
          btn.classList.remove('bg-bronze-500', 'text-forest-900');
          btn.classList.add('bg-forest-700', 'text-forest-100');
        } else {
          state.comforts.push(val);
          btn.classList.add('bg-bronze-500', 'text-forest-900');
          btn.classList.remove('bg-forest-700', 'text-forest-100');
        }
      });
    });

    root.querySelector<HTMLButtonElement>('[data-to-senses]')!.addEventListener('click', () => showStep('senses'));
    root.querySelector<HTMLButtonElement>('[data-to-done]')!.addEventListener('click', () => {
      const summary = root.querySelector<HTMLElement>('[data-safe-summary]')!;
      const comforts = state.comforts.length > 0
        ? ` With you: ${state.comforts.map((c) => c.toLowerCase()).join(', ')}.`
        : '';
      summary.textContent = `${state.env}.${comforts}`;
      showStep('done');
    });
    root.querySelector<HTMLButtonElement>('[data-restart]')!.addEventListener('click', () => {
      state = { env: '', comforts: [] };
      root.querySelectorAll<HTMLButtonElement>('[data-pick-comfort]').forEach((btn) => {
        btn.classList.remove('bg-bronze-500', 'text-forest-900');
        btn.classList.add('bg-forest-700', 'text-forest-100');
      });
      showStep('env');
    });
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `SafePlace` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/safe-place` and walk through all 4 steps. Verify comfort items can be toggled on/off (multi-select), summary shows selected items.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/safe-place.md src/components/tools/SafePlace.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add safe place builder widget"
```

---

### Task 20: Lightstream visualization widget

**Files:**
- Create: `src/content/tools/lightstream.md`
- Create: `src/components/tools/Lightstream.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Lightstream Visualization"
category: preparation
audience: [clinician, family]
useContext: [in-session, home]
evidence: clinical-consensus
shortDescription: "Guided color-flow visualization: pick a healing color, watch it flow through a body outline, follow the script to soften tension."
componentName: "Lightstream"
citations:
  - label: "Shapiro (2018). EMDR Therapy, 3rd ed. — Lightstream Technique."
warnings: []
---

## What this is

A guided lightstream visualization based on Shapiro's standard EMDR technique: the client picks a healing color and imagines it flowing through areas of tension in the body, softening and releasing as it passes.

## When to use it

- **Closure**, when body scan reveals residual tension.
- **Between sessions**, as a self-regulation tool.
- **After a hard moment**, to calm the body.

## Clinical notes

The script runs through the standard body areas: head, shoulders, chest, belly, hips, legs, feet. Pace is user-controlled — they tap "Next" when they're ready to move on.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8 flex flex-col items-center"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600 flex flex-col items-center";
---

<div class:list={[containerClass]} data-lightstream-widget>
  <div data-step="color" data-step-active class="w-full">
    <h2 class="font-serif text-xl text-forest-100 mb-3">Pick a healing color</h2>
    <p class="text-forest-300 text-sm mb-4">Choose the color that feels most soothing to you right now. There is no wrong answer.</p>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {[
        { label: 'Gold', hex: '#F5C46B' },
        { label: 'Blue', hex: '#6BB3F5' },
        { label: 'Green', hex: '#7BC47B' },
        { label: 'White', hex: '#FFFFFF' },
        { label: 'Pink', hex: '#F5A5C4' },
        { label: 'Violet', hex: '#B78BE0' },
      ].map((c) => (
        <button
          data-pick-color={c.hex}
          data-color-label={c.label}
          class="aspect-square rounded-full border-2 border-forest-600 hover:border-white transition-colors"
          style={`background-color: ${c.hex}`}
          aria-label={c.label}
        ></button>
      ))}
    </div>
  </div>

  <div data-step="flow" class="hidden w-full flex flex-col items-center">
    <div class="relative w-48 h-72 mb-4">
      <svg viewBox="0 0 100 150" class="w-full h-full">
        <!-- Simple body outline -->
        <circle cx="50" cy="18" r="12" fill="none" stroke="#8DB496" stroke-width="2" />
        <rect x="35" y="30" width="30" height="50" rx="6" fill="none" stroke="#8DB496" stroke-width="2" />
        <rect x="40" y="80" width="20" height="50" rx="4" fill="none" stroke="#8DB496" stroke-width="2" />
        <line x1="35" y1="35" x2="25" y2="65" stroke="#8DB496" stroke-width="2" />
        <line x1="65" y1="35" x2="75" y2="65" stroke="#8DB496" stroke-width="2" />
        <circle
          data-lightstream-blob
          cx="50" cy="18" r="14"
          fill="var(--ls-color, #F5C46B)"
          opacity="0.55"
          class="transition-all duration-1000 ease-in-out"
        />
      </svg>
    </div>
    <p data-flow-script class="text-forest-100 text-center text-lg mb-6 min-h-[4em]"></p>
    <button
      data-flow-next
      class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
    >
      Next
    </button>
  </div>

  <div data-step="done" class="hidden text-center">
    <h2 class="font-serif text-2xl text-forest-100 mb-3">The light is with you.</h2>
    <p class="text-forest-300 mb-6">Notice anything that shifted. When you're ready, you can open your eyes.</p>
    <button data-restart class="px-4 py-2 rounded-md bg-forest-700 border border-forest-600 text-forest-100 hover:bg-forest-600 transition-colors">Do it again</button>
  </div>
</div>

<script>
  const bodyAreas = [
    { label: 'Let the color begin at the top of your head. Notice where it feels warm and soft.', cy: 18 },
    { label: 'Let it flow down into your face and jaw. Soften anything tight.', cy: 28 },
    { label: 'Into your neck and shoulders. Let them drop a little.', cy: 38 },
    { label: 'Into your chest. Notice your breath under the color.', cy: 50 },
    { label: 'Into your belly. Let it warm the center of you.', cy: 68 },
    { label: 'Into your hips and low back.', cy: 85 },
    { label: 'Down through your legs.', cy: 105 },
    { label: 'All the way to your feet. Let it pool there.', cy: 130 },
  ];

  const widgets = document.querySelectorAll('[data-lightstream-widget]');
  widgets.forEach((root) => {
    const steps: Record<string, HTMLElement> = {};
    root.querySelectorAll<HTMLElement>('[data-step]').forEach((el) => {
      steps[el.getAttribute('data-step')!] = el;
    });
    const blob = root.querySelector<SVGCircleElement>('[data-lightstream-blob]')!;
    const scriptEl = root.querySelector<HTMLElement>('[data-flow-script]')!;
    const nextBtn = root.querySelector<HTMLButtonElement>('[data-flow-next]')!;

    let idx = 0;

    function showStep(n: string) {
      Object.values(steps).forEach((el) => el.classList.add('hidden'));
      steps[n].classList.remove('hidden');
    }

    function renderFlow() {
      if (idx >= bodyAreas.length) {
        showStep('done');
        return;
      }
      const area = bodyAreas[idx];
      scriptEl.textContent = area.label;
      blob.setAttribute('cy', String(area.cy));
      nextBtn.textContent = idx === bodyAreas.length - 1 ? 'Finish' : 'Next';
    }

    root.querySelectorAll<HTMLButtonElement>('[data-pick-color]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const hex = btn.getAttribute('data-pick-color')!;
        (root as HTMLElement).style.setProperty('--ls-color', hex);
        blob.setAttribute('fill', hex);
        idx = 0;
        showStep('flow');
        renderFlow();
      });
    });

    nextBtn.addEventListener('click', () => {
      idx += 1;
      renderFlow();
    });

    root.querySelector<HTMLButtonElement>('[data-restart]')!.addEventListener('click', () => {
      idx = 0;
      showStep('color');
    });
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `Lightstream` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/lightstream`. Verify: picking a color advances to the flow step, the colored blob moves down the body outline as "Next" is pressed, script text updates at each area, "Finish" ends in the done step.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/lightstream.md src/components/tools/Lightstream.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add lightstream visualization widget"
```

---

### Task 21: Butterfly hug guide widget

**Files:**
- Create: `src/content/tools/butterfly-hug.md`
- Create: `src/components/tools/ButterflyHug.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Butterfly Hug Guide"
category: regulation
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: research-backed
shortDescription: "Paced self-hug tapping visual. A gentle, self-administered bilateral technique originally developed for children after disaster."
componentName: "ButterflyHug"
citations:
  - label: "Artigas, L., & Jarero, I. (1998). The Butterfly Hug. Developed after Hurricane Pauline for children with trauma."
warnings: []
---

## What this is

A guided visual for the butterfly hug: cross your arms over your chest, place your hands on your upper arms or shoulders, and tap gently, left-right-left-right, in rhythm with the visual. It's a calming, self-administered bilateral technique.

## How to do it

1. Cross your arms over your chest in a soft X.
2. Place your fingertips on the opposite upper arm or shoulder.
3. Breathe slowly.
4. Tap gently, alternating left and right, in time with the visual.
5. Let your eyes close if that feels right, or keep them soft.

## When to use it

- **Between sets** in a session, as an alternative to clinician-administered BLS.
- **At bedtime** if a child is wound up.
- **Anytime** a gentle calming anchor is needed.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8 flex flex-col items-center"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600 flex flex-col items-center";
---

<div class:list={[containerClass]} data-butterfly-widget>
  <p class="text-forest-200 text-sm mb-6 max-w-md text-center">
    Cross your arms over your chest, place your fingertips on your upper arms, and tap gently left-right in time with the wings.
  </p>

  <div class="relative w-64 h-40 mb-6">
    <svg viewBox="0 0 200 120" class="w-full h-full">
      <ellipse
        data-wing="L"
        cx="70" cy="60" rx="45" ry="35"
        fill="#C4A77D" opacity="0.5"
        class="origin-right transition-transform duration-150 ease-out"
      />
      <ellipse
        data-wing="R"
        cx="130" cy="60" rx="45" ry="35"
        fill="#C4A77D" opacity="0.5"
        class="origin-left transition-transform duration-150 ease-out"
      />
      <ellipse cx="100" cy="60" rx="5" ry="30" fill="#8A7049" />
    </svg>
  </div>

  <div class="mb-4">
    <label class="text-forest-200 text-xs">
      Speed
      <input data-speed type="range" min="0.4" max="1.5" step="0.1" value="0.8" class="w-48 accent-bronze-500" />
    </label>
  </div>

  <button
    data-toggle
    class="px-6 py-2 rounded-md bg-bronze-500 text-forest-900 font-semibold hover:bg-bronze-400 transition-colors"
  >
    Start
  </button>
</div>

<script>
  const widgets = document.querySelectorAll('[data-butterfly-widget]');
  widgets.forEach((root) => {
    const wingL = root.querySelector<SVGElement>('[data-wing="L"]')!;
    const wingR = root.querySelector<SVGElement>('[data-wing="R"]')!;
    const speed = root.querySelector<HTMLInputElement>('[data-speed]')!;
    const toggle = root.querySelector<HTMLButtonElement>('[data-toggle]')!;

    let running = false;
    let side: 'L' | 'R' = 'L';
    let intervalId = 0;

    function tick() {
      if (side === 'L') {
        wingL.setAttribute('transform', 'scale(1.1 1.1) translate(-6 -6)');
        wingR.setAttribute('transform', '');
      } else {
        wingR.setAttribute('transform', 'scale(1.1 1.1) translate(-6 -6)');
        wingL.setAttribute('transform', '');
      }
      side = side === 'L' ? 'R' : 'L';
    }

    function start() {
      running = true;
      toggle.textContent = 'Stop';
      const hz = parseFloat(speed.value);
      tick();
      intervalId = window.setInterval(tick, 1000 / (hz * 2));
    }

    function stop() {
      running = false;
      clearInterval(intervalId);
      wingL.setAttribute('transform', '');
      wingR.setAttribute('transform', '');
      toggle.textContent = 'Start';
    }

    toggle.addEventListener('click', () => (running ? stop() : start()));
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `ButterflyHug` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/butterfly-hug`. Verify: wings alternate when Start is pressed, speed slider changes rhythm, Stop resets.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/butterfly-hug.md src/components/tools/ButterflyHug.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add butterfly hug guide widget"
```

---

### Task 22: Feeling wheel widget

**Files:**
- Create: `src/content/tools/feeling-wheel.md`
- Create: `src/components/tools/FeelingWheel.astro`
- Modify: `src/pages/tools/[slug].astro`
- Modify: `src/pages/tools/[slug]/fullscreen.astro`

- [ ] **Step 1: Create the content entry**

```markdown
---
name: "Feeling Wheel"
category: assessment
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: clinical-consensus
shortDescription: "Clickable emotion wheel. Six core emotions at the center, specific variations around the edge. Helps clients — especially kids — name what they feel."
componentName: "FeelingWheel"
citations:
  - label: "Willcox, G. (1982). The Feeling Wheel: A Tool for Expanding Awareness of Emotions. Transactional Analysis Journal, 12(4)."
warnings: []
---

## What this is

A clickable emotion wheel based on Dr. Gloria Willcox's original design. Six core emotions (sad, mad, scared, joyful, peaceful, powerful) surrounded by specific variations. Tapping a word shows its definition and suggests body-sensation prompts to help ground the feeling physically.

## When to use it

- **Phase 3 assessment**, when a client struggles to name the emotion attached to a memory.
- **Closure**, to check in on how the client feels right now.
- **Home use**, as an everyday emotion-identification tool.
```

- [ ] **Step 2: Create the widget component**

```astro
---
interface Props {
  fullscreen?: boolean;
}

const { fullscreen = false } = Astro.props;
const containerClass = fullscreen
  ? "w-full max-w-2xl mx-auto p-8"
  : "w-full p-6 bg-forest-800 rounded-lg border border-forest-600";
---

<div class:list={[containerClass]} data-feeling-widget>
  <h2 class="font-serif text-xl text-forest-100 mb-4">What are you feeling?</h2>
  <p class="text-forest-300 text-sm mb-6">Start at the center. If a word fits, tap it. If it almost fits, look at the words around it for something closer.</p>

  <div class="grid grid-cols-2 gap-3 mb-6" data-core-grid></div>

  <div data-secondary-wrap class="hidden mb-6">
    <h3 class="text-forest-200 text-sm mb-2" data-secondary-title></h3>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2" data-secondary-grid></div>
  </div>

  <div data-detail-wrap class="hidden p-4 border border-bronze-500/50 bg-forest-900 rounded-lg">
    <h3 data-detail-name class="font-serif text-lg text-bronze-400 mb-2"></h3>
    <p data-detail-desc class="text-forest-200 text-sm mb-3"></p>
    <p class="text-forest-300 text-xs">Where do you feel it in your body? What does it want you to do?</p>
  </div>
</div>

<script>
  const core = [
    { name: 'Sad', color: '#6B8FB3', secondary: [
      { name: 'Lonely', desc: 'A sad feeling of being alone or separated from people who matter.' },
      { name: 'Gloomy', desc: 'A heavy, low sadness that colors everything gray.' },
      { name: 'Hurt', desc: 'Sad because someone or something wounded you.' },
      { name: 'Bored', desc: 'A restless, unsatisfied kind of sad — nothing interests you.' },
    ]},
    { name: 'Mad', color: '#B36B6B', secondary: [
      { name: 'Frustrated', desc: 'Mad because something keeps getting in your way.' },
      { name: 'Jealous', desc: 'Mad because someone has something you want, or is taking something that feels yours.' },
      { name: 'Furious', desc: 'Very big anger — a mad that feels out of control.' },
      { name: 'Irritated', desc: 'Small, scratchy mad — the kind that builds up if you ignore it.' },
    ]},
    { name: 'Scared', color: '#B39B6B', secondary: [
      { name: 'Anxious', desc: 'Scared about something that hasn\'t happened yet.' },
      { name: 'Overwhelmed', desc: 'Scared because there\'s too much at once.' },
      { name: 'Insecure', desc: 'Scared that you\'re not enough, or that people will see.' },
      { name: 'Helpless', desc: 'Scared because you don\'t know what to do.' },
    ]},
    { name: 'Joyful', color: '#8DB47B', secondary: [
      { name: 'Excited', desc: 'Joyful with energy — something good is happening or coming.' },
      { name: 'Content', desc: 'Calm, settled joy — a quiet enough.' },
      { name: 'Grateful', desc: 'Joyful because of something or someone you appreciate.' },
      { name: 'Playful', desc: 'Joyful in a silly, light way.' },
    ]},
    { name: 'Peaceful', color: '#7BB39B', secondary: [
      { name: 'Relaxed', desc: 'Your body is loose and your breath is slow.' },
      { name: 'Safe', desc: 'You know nothing bad is about to happen.' },
      { name: 'Loved', desc: 'You know someone cares about you.' },
      { name: 'Calm', desc: 'Your mind is quiet and still.' },
    ]},
    { name: 'Powerful', color: '#B38D7B', secondary: [
      { name: 'Proud', desc: 'Powerful because of something you did.' },
      { name: 'Confident', desc: 'Powerful because you trust yourself.' },
      { name: 'Brave', desc: 'Powerful even though something is scary.' },
      { name: 'Capable', desc: 'Powerful because you know you can do this.' },
    ]},
  ];

  const widgets = document.querySelectorAll('[data-feeling-widget]');
  widgets.forEach((root) => {
    const coreGrid = root.querySelector<HTMLElement>('[data-core-grid]')!;
    const secondaryWrap = root.querySelector<HTMLElement>('[data-secondary-wrap]')!;
    const secondaryTitle = root.querySelector<HTMLElement>('[data-secondary-title]')!;
    const secondaryGrid = root.querySelector<HTMLElement>('[data-secondary-grid]')!;
    const detailWrap = root.querySelector<HTMLElement>('[data-detail-wrap]')!;
    const detailName = root.querySelector<HTMLElement>('[data-detail-name]')!;
    const detailDesc = root.querySelector<HTMLElement>('[data-detail-desc]')!;

    core.forEach((c) => {
      const btn = document.createElement('button');
      btn.textContent = c.name;
      btn.className = 'p-4 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity';
      btn.style.backgroundColor = c.color;
      btn.addEventListener('click', () => {
        secondaryTitle.textContent = `More specifically, is it...`;
        secondaryGrid.innerHTML = '';
        c.secondary.forEach((s) => {
          const sbtn = document.createElement('button');
          sbtn.textContent = s.name;
          sbtn.className = 'px-3 py-2 rounded-md bg-forest-700 border border-forest-600 text-forest-100 text-sm hover:bg-forest-600 transition-colors';
          sbtn.addEventListener('click', () => {
            detailName.textContent = s.name;
            detailDesc.textContent = s.desc;
            detailWrap.classList.remove('hidden');
          });
          secondaryGrid.appendChild(sbtn);
        });
        secondaryWrap.classList.remove('hidden');
        detailWrap.classList.add('hidden');
      });
      coreGrid.appendChild(btn);
    });
  });
</script>
```

- [ ] **Step 3: Register in route templates**

Add `FeelingWheel` to both widget maps.

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Visit `/tools/feeling-wheel`. Verify: core emotion buttons render, clicking one shows that emotion's secondary feelings, clicking a secondary feeling shows its description and body-prompt.

- [ ] **Step 5: Commit**

```bash
git add src/content/tools/feeling-wheel.md src/components/tools/FeelingWheel.astro src/pages/tools/[slug].astro src/pages/tools/[slug]/fullscreen.astro
git commit -m "feat(tools): add feeling wheel widget"
```

---

## Phase 5: i18n — Spanish mirrors

---

### Task 23: Spanish content collection mirrors

The existing i18n setup filters content collections by the `locale` field. Each Spanish mirror is a new markdown file with `locale: es` in frontmatter.

**Files:**
- Create: `src/content/tools/sud.es.md`
- Create: `src/content/tools/voc.es.md`
- Create: `src/content/tools/breath.es.md`
- Create: `src/content/tools/grounding.es.md`
- Create: `src/content/tools/bls-visual.es.md`
- Create: `src/content/tools/bls-audio.es.md`
- Create: `src/content/tools/bls-combined.es.md`
- Create: `src/content/tools/bls-tapping.es.md`
- Create: `src/content/tools/container.es.md`
- Create: `src/content/tools/safe-place.es.md`
- Create: `src/content/tools/lightstream.es.md`
- Create: `src/content/tools/butterfly-hug.es.md`
- Create: `src/content/tools/feeling-wheel.es.md`

- [ ] **Step 1: Create all 13 Spanish files**

For each English tool file, create a matching `.es.md` file that follows the same structure but with Spanish content. Filename must differ from the English one (Astro uses filename as slug, so slug will differ). Use the `.es.md` suffix convention.

Example — `src/content/tools/sud.es.md`:

```markdown
---
name: "Escala SUD (Unidades Subjetivas de Perturbación)"
category: assessment
audience: [clinician, family]
useContext: [in-session, practice, home]
evidence: research-backed
shortDescription: "Mide la perturbación de 0 (nada) a 10 (lo peor imaginable). Incluye un modo con caras para niños."
componentName: "SUDScale"
citations:
  - label: "Shapiro (2018). Terapia EMDR: Principios básicos, protocolos y procedimientos, 3ª ed."
warnings: []
locale: es
---

## Qué es

La escala SUD (Unidades Subjetivas de Perturbación) es la medida estándar en EMDR para saber cuán perturbador se siente un recuerdo o un sentimiento en este momento, en una escala del 0 al 10.

## Cuándo usarla

- **Clínicos:** Durante la evaluación de Fase 3 y cada pocos sets durante la desensibilización de Fase 4.
- **Familias:** Cuando tu hijo tiene sentimientos difíciles de expresar con palabras, la versión con caras puede ayudar.

## Notas clínicas

Instrucción estándar: "En una escala del 0 al 10, donde 0 es ninguna perturbación o neutral y 10 es la peor perturbación que puedes imaginar, ¿qué tan perturbador se siente el incidente ahora?"
```

Create the remaining 12 files following the same pattern. Each file:
- Has `locale: es` in frontmatter
- Keeps the same `componentName` as its English counterpart (widgets are shared)
- Translates `name`, `shortDescription`, markdown body, and citation labels
- Keeps `category`, `audience`, `useContext`, `evidence`, `warnings` identical to the English version

Use the existing `src/content/emdr-phases/*.es.md` files (if any) as a template for i18n frontmatter conventions. If none exist, follow the `locale: es` convention set by this plan.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds. 13 additional markdown files registered in the `tools` collection.

- [ ] **Step 3: Commit**

```bash
git add src/content/tools/*.es.md
git commit -m "feat(tools): add Spanish translations for all tool content entries"
```

---

### Task 24: Spanish routing — `/es/tools/[slug]` and Spanish hub pages

**Files:**
- Create: `src/pages/es/tools/[slug].astro`
- Create: `src/pages/es/tools/[slug]/fullscreen.astro`
- Create: `src/pages/es/clinicians/emdr/tools/index.astro`
- Create: `src/pages/es/families/emdr/tools/index.astro`

- [ ] **Step 1: Create `src/pages/es/tools/[slug].astro`**

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import BaseLayout from '../../../layouts/BaseLayout.astro';
import ToolShell from '../../../components/tools/ToolShell.astro';
import SUDScale from '../../../components/tools/SUDScale.astro';
import VOCScale from '../../../components/tools/VOCScale.astro';
import BreathPacer from '../../../components/tools/BreathPacer.astro';
import Grounding from '../../../components/tools/Grounding.astro';
import BLSVisual from '../../../components/tools/BLSVisual.astro';
import BLSAudio from '../../../components/tools/BLSAudio.astro';
import BLSCombined from '../../../components/tools/BLSCombined.astro';
import BLSTapping from '../../../components/tools/BLSTapping.astro';
import Container from '../../../components/tools/Container.astro';
import SafePlace from '../../../components/tools/SafePlace.astro';
import Lightstream from '../../../components/tools/Lightstream.astro';
import ButterflyHug from '../../../components/tools/ButterflyHug.astro';
import FeelingWheel from '../../../components/tools/FeelingWheel.astro';

export async function getStaticPaths() {
  const tools = await getCollection('tools', (t) => t.data.locale === 'es');
  return tools.map((tool) => ({
    params: { slug: tool.slug.replace(/\.es$/, '') },
    props: { tool },
  }));
}

interface Props {
  tool: CollectionEntry<'tools'>;
}

const { tool } = Astro.props;
const { Content } = await tool.render();

const widgets: Record<string, any> = {
  SUDScale, VOCScale, BreathPacer, Grounding,
  BLSVisual, BLSAudio, BLSCombined, BLSTapping,
  Container, SafePlace, Lightstream, ButterflyHug, FeelingWheel,
};

const Widget = widgets[tool.data.componentName] ?? null;
---

<BaseLayout title={tool.data.name} description={tool.data.shortDescription} noAnalytics={true} lang="es">
  <ToolShell tool={tool}>
    {Widget ? <Widget /> : <p class="text-forest-300">Widget no disponible.</p>}
  </ToolShell>
  <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 prose prose-invert">
    <Content />
  </article>
</BaseLayout>
```

- [ ] **Step 2: Create `src/pages/es/tools/[slug]/fullscreen.astro`**

Mirror the English fullscreen route, importing from the correct relative paths and filtering by `locale: 'es'`:

```astro
---
import { getCollection, type CollectionEntry } from 'astro:content';
import FullscreenLayout from '../../../../layouts/FullscreenLayout.astro';
import SUDScale from '../../../../components/tools/SUDScale.astro';
import VOCScale from '../../../../components/tools/VOCScale.astro';
import BreathPacer from '../../../../components/tools/BreathPacer.astro';
import Grounding from '../../../../components/tools/Grounding.astro';
import BLSVisual from '../../../../components/tools/BLSVisual.astro';
import BLSAudio from '../../../../components/tools/BLSAudio.astro';
import BLSCombined from '../../../../components/tools/BLSCombined.astro';
import BLSTapping from '../../../../components/tools/BLSTapping.astro';
import Container from '../../../../components/tools/Container.astro';
import SafePlace from '../../../../components/tools/SafePlace.astro';
import Lightstream from '../../../../components/tools/Lightstream.astro';
import ButterflyHug from '../../../../components/tools/ButterflyHug.astro';
import FeelingWheel from '../../../../components/tools/FeelingWheel.astro';

export async function getStaticPaths() {
  const tools = await getCollection('tools', (t) => t.data.locale === 'es');
  return tools.map((tool) => ({
    params: { slug: tool.slug.replace(/\.es$/, '') },
    props: { tool },
  }));
}

interface Props {
  tool: CollectionEntry<'tools'>;
}

const { tool } = Astro.props;

const widgets: Record<string, any> = {
  SUDScale, VOCScale, BreathPacer, Grounding,
  BLSVisual, BLSAudio, BLSCombined, BLSTapping,
  Container, SafePlace, Lightstream, ButterflyHug, FeelingWheel,
};

const Widget = widgets[tool.data.componentName] ?? null;
const exitHref = `/es/tools/${tool.slug.replace(/\.es$/, '')}`;
---

<FullscreenLayout title={`${tool.data.name} — Pantalla completa`} exitHref={exitHref} lang="es">
  {Widget ? <Widget fullscreen={true} /> : <p class="text-forest-300">Widget no disponible.</p>}
</FullscreenLayout>
```

- [ ] **Step 3: Create Spanish clinician hub**

```astro
---
import BaseLayout from '../../../../../layouts/BaseLayout.astro';
import ToolCard from '../../../../../components/tools/ToolCard.astro';
import { getCollection } from 'astro:content';

const allTools = await getCollection('tools', (t) => t.data.locale === 'es');
const clinicianTools = allTools
  .filter((t) => t.data.audience.includes('clinician'))
  .sort((a, b) => a.data.name.localeCompare(b.data.name));

const categoryGroups = [
  { key: 'bls', title: 'Estimulación Bilateral', description: 'Para uso en sesión durante la desensibilización (Fase 4) e instalación (Fase 5).' },
  { key: 'preparation', title: 'Preparación y Recursos', description: 'Instalación de recursos de Fase 2, contención y estabilización.' },
  { key: 'assessment', title: 'Escalas de Evaluación', description: 'SUD, VOC e identificación de emociones para Fase 3 en adelante.' },
  { key: 'regulation', title: 'Regulación y Cuerpo', description: 'Cierre, enraizamiento y apoyo entre sesiones.' },
] as const;
---

<BaseLayout title="Herramientas EMDR" description="Herramientas EMDR interactivas para clínicos." lang="es">
  <section class="dark-zone py-10 sm:py-16">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mb-10">
        <h1 class="font-serif text-4xl font-semibold text-forest-100 mb-4">Herramientas EMDR</h1>
        <p class="text-lg text-forest-200 leading-relaxed">
          Herramientas interactivas que puedes usar en sesión o asignar para la práctica. Integradas en el sitio — sin descargas, sin cuentas, sin seguimiento.
        </p>
      </div>
      {categoryGroups.map((group) => {
        const toolsInGroup = clinicianTools.filter((t) => t.data.category === group.key);
        if (toolsInGroup.length === 0) return null;
        return (
          <div class="mb-12">
            <h2 class="font-serif text-2xl font-semibold text-forest-100 mb-2">{group.title}</h2>
            <p class="text-forest-300 text-sm mb-6">{group.description}</p>
            <div class="grid md:grid-cols-2 gap-6">
              {toolsInGroup.map((tool) => <ToolCard tool={tool} />)}
            </div>
          </div>
        );
      })}
    </div>
  </section>
</BaseLayout>
```

Save to `src/pages/es/clinicians/emdr/tools/index.astro` (note: the import path depth may need adjustment — verify `BaseLayout` path relative to this file and correct if needed during the build step).

- [ ] **Step 4: Create Spanish family hub**

Save to `src/pages/es/families/emdr/tools/index.astro`:

```astro
---
import BaseLayout from '../../../../../layouts/BaseLayout.astro';
import ToolCard from '../../../../../components/tools/ToolCard.astro';
import { getCollection } from 'astro:content';

const allTools = await getCollection('tools', (t) => t.data.locale === 'es');
const familyTools = allTools
  .filter((t) => t.data.audience.includes('family'))
  .sort((a, b) => a.data.name.localeCompare(b.data.name));

const feelingGroups = [
  { key: 'preparation', title: 'Construir un lugar tranquilo', description: 'Herramientas para crear un espacio seguro al que regresar cuando las cosas se sienten grandes.' },
  { key: 'regulation', title: 'Para sentimientos grandes', description: 'Respiración, enraizamiento y herramientas corporales cuando los sentimientos abruman.' },
  { key: 'assessment', title: 'Entender cómo me siento', description: 'Formas de nombrar, medir y hablar de lo que está pasando por dentro.' },
] as const;
---

<BaseLayout title="Herramientas EMDR para familias" description="Juegos y ejercicios para ayudar a tu hijo a sentirse tranquilo y seguro." lang="es">
  <section class="dark-zone py-10 sm:py-16">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="max-w-3xl mb-10">
        <h1 class="font-serif text-4xl font-semibold text-forest-100 mb-4">Herramientas para familias</h1>
        <p class="text-lg text-forest-200 leading-relaxed">
          Juegos y ejercicios para probar con tu hijo y ayudarle a sentirse tranquilo y seguro. Estas herramientas son un apoyo, no un reemplazo de la terapia.
        </p>
      </div>
      {feelingGroups.map((group) => {
        const toolsInGroup = familyTools.filter((t) => t.data.category === group.key);
        if (toolsInGroup.length === 0) return null;
        return (
          <div class="mb-12">
            <h2 class="font-serif text-2xl font-semibold text-forest-100 mb-2">{group.title}</h2>
            <p class="text-forest-300 text-sm mb-6">{group.description}</p>
            <div class="grid md:grid-cols-2 gap-6">
              {toolsInGroup.map((tool) => <ToolCard tool={tool} />)}
            </div>
          </div>
        );
      })}
    </div>
  </section>
</BaseLayout>
```

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: build succeeds. Verify both Spanish hubs render under `/es/clinicians/emdr/tools` and `/es/families/emdr/tools` in dev, Spanish tool pages render at `/es/tools/<slug>`, and fullscreen variants work.

If import paths are wrong (they can be tricky at these depths), fix them — the pattern is: from `src/pages/es/tools/[slug].astro`, go up `../../../` to reach `src/`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/es/tools src/pages/es/clinicians/emdr/tools src/pages/es/families/emdr/tools
git commit -m "feat(tools): add Spanish routing for tools section"
```

---

## Phase 6: Polish — linkage, audit, finalize

---

### Task 25: Link the tools hubs from the EMDR index pages

**Files:**
- Modify: `src/pages/clinicians/emdr/index.astro`
- Modify: `src/pages/families/emdr.astro`
- Modify: `src/pages/es/clinicians/emdr/index.astro`
- Modify: `src/pages/es/families/emdr.astro`

- [ ] **Step 1: Add a "Tools" link to the clinician EMDR index**

Open `src/pages/clinicians/emdr/index.astro`. Directly after the "Print Package Button" block (the `<div class="mb-8">` containing the print link), add a new section linking to the tools hub:

```astro
      <!-- Tools Link -->
      <div class="mb-8">
        <a
          href="/clinicians/emdr/tools"
          class="inline-flex items-center gap-3 px-5 py-3 bg-forest-700 border border-forest-500 text-forest-100 rounded-lg hover:bg-forest-600 transition-colors font-medium"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          Interactive EMDR Tools
          <span class="text-forest-300 text-sm font-normal">(BLS, scales, containment)</span>
        </a>
      </div>
```

- [ ] **Step 2: Add a "Tools" link to the family EMDR page**

Open `src/pages/families/emdr.astro`. Find a reasonable location near the top of the content (e.g., after the intro paragraph or hero) and add:

```astro
      <div class="my-8">
        <a
          href="/families/emdr/tools"
          class="inline-flex items-center gap-3 px-5 py-3 bg-forest-700 border border-forest-500 text-forest-100 rounded-lg hover:bg-forest-600 transition-colors font-medium"
        >
          Games and calming tools
          <span class="text-forest-300 text-sm font-normal">to try together</span>
        </a>
      </div>
```

- [ ] **Step 3: Mirror both links in the Spanish pages**

Make the equivalent change in `src/pages/es/clinicians/emdr/index.astro` with href `/es/clinicians/emdr/tools` and Spanish copy (`"Herramientas EMDR interactivas"`), and in `src/pages/es/families/emdr.astro` with href `/es/families/emdr/tools` and Spanish copy (`"Juegos y herramientas para calmar"`).

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: build succeeds. Verify the four pages now show visible links to their respective tools hubs.

- [ ] **Step 5: Commit**

```bash
git add src/pages/clinicians/emdr/index.astro src/pages/families/emdr.astro src/pages/es/clinicians/emdr/index.astro src/pages/es/families/emdr.astro
git commit -m "feat(tools): link tools hubs from EMDR index pages"
```

---

### Task 26: Accessibility audit pass

Manual audit of all 13 tool pages. Fix anything that fails.

- [ ] **Step 1: Run through each tool with keyboard-only**

For each of the 13 tools, navigate to the page using only Tab, Shift+Tab, Enter, Space, and arrow keys. Confirm:
- Every interactive control is reachable.
- Focus state is visible (Tailwind focus rings should be present; if not, add `focus:ring-2 focus:ring-bronze-500` to buttons).
- Space toggles Start/Stop on BLS widgets.
- Sliders respond to arrow keys.
- No keyboard traps.

Fix any issues by editing the relevant component. Record a short list of what you fixed.

- [ ] **Step 2: Screen reader labels**

Inspect each tool component and verify:
- Every `<input>` has an `aria-label` or an associated `<label>`.
- Every standalone `<button>` that only contains an icon has an `aria-label`.
- Decorative SVGs have `aria-hidden="true"`.
- Live-updating values (SUD counter, BLS pass counter, breath timer) have `aria-live="polite"` on their container.

Add missing attributes where needed.

- [ ] **Step 3: Contrast check**

Use browser devtools or WebAIM contrast checker on:
- `ToolShell` disclaimer text against dark background (should be ≥4.5:1)
- Slider values and labels
- Evidence badges on `ToolCard`

Fix any failures by adjusting to existing forest/bronze palette tokens — do not introduce new colors.

- [ ] **Step 4: Build and commit fixes**

Run: `npm run build`

```bash
git add -A
git commit -m "fix(tools): accessibility — focus states, aria labels, contrast"
```

---

### Task 27: Citation verification pass

Verify each tool's citations against reliable sources.

- [ ] **Step 1: Walk through each tool's markdown file**

For each of the 13 English content files, verify:
- The cited author/year/title is real and correct.
- The claim in the `evidence` field matches the citation strength:
  - `research-backed` → at least one peer-reviewed or authoritative primary source
  - `clinical-consensus` → cited in training materials or widely-used clinical references
  - `widely-used` → documented in trauma care literature but no single authoritative origin

If you cannot verify a citation:
- Remove it from the `citations` array
- Downgrade the `evidence` field one step (research-backed → clinical-consensus → widely-used)
- Replace with a general "widely used in clinical practice" citation

- [ ] **Step 2: Specifically verify BLS parameters**

Check that the default speed (1.0 Hz) and default pass count (24) cited as "Shapiro standard" are accurate. If the 3rd ed. text specifies different values or ranges, update the defaults in `BLSVisual.astro`, `BLSAudio.astro`, `BLSCombined.astro`, and `BLSTapping.astro` to match, and document the exact values in each markdown file's "Clinical notes" section.

- [ ] **Step 3: Build and commit**

Run: `npm run build`

```bash
git add src/content/tools/*.md src/components/tools/BLS*.astro
git commit -m "docs(tools): verify citations and BLS parameters"
```

---

### Task 28: Final smoke test and build

- [ ] **Step 1: Full production build**

Run: `npm run build`
Expected: build succeeds with zero errors and no warnings about missing pages.

- [ ] **Step 2: Production preview smoke test**

Run: `npm run preview`

Visit each of these and confirm they render correctly:
- `/clinicians/emdr/tools`
- `/families/emdr/tools`
- `/tools/sud` (and click fullscreen → back)
- `/tools/bls-visual` (and click fullscreen → back)
- `/tools/container` (walk through all steps)
- `/es/clinicians/emdr/tools`
- `/es/families/emdr/tools`
- `/es/tools/sud`

- [ ] **Step 3: Verify no analytics on tool pages**

In browser devtools Network tab, load `/tools/sud` and confirm no request to `gc.zgo.at` (GoatCounter). Also confirm for `/tools/bls-visual/fullscreen`.

- [ ] **Step 4: Verify no analytics on fullscreen route**

Same check on `/tools/sud/fullscreen`.

- [ ] **Step 5: Commit and done**

Nothing to commit if the smoke test passes with no fixes. If fixes are needed:

```bash
git add -A
git commit -m "fix(tools): final smoke test fixes"
```

---

## Self-review notes

The plan implements every section of the spec:

- **Content collection** — Task 1
- **BaseLayout noAnalytics prop** — Task 2
- **FullscreenLayout** — Task 3
- **ToolShell** — Task 4
- **Dynamic [slug] route** — Task 5, with widgets wired up incrementally in Tasks 10–22
- **Fullscreen route** — Task 6
- **ToolCard** — Task 7
- **Clinician tools hub** — Task 8
- **Family tools hub** — Task 9
- **All 13 widgets** — Tasks 10–22
- **Spanish mirrors** — Tasks 23, 24
- **Linkage from EMDR pages** — Task 25
- **Accessibility audit** — Task 26
- **Citation verification** — Task 27
- **Final smoke test** — Task 28

**Intentionally deferred to implementation discretion:**
- Whether to add Vitest for pure JS unit tests (not in spec; project has no test framework)
- Exact Spanish wording beyond what this plan provides (translator may refine)

**Known plan risks:**
- Import path depth in Spanish routes (Task 24) may need adjustment at build time — the task calls this out.
- BLS parameter defaults (1.0 Hz, 24 passes) are widely-cited but should be verified against Shapiro (2018) 3rd ed. during Task 27.
