# UX usability remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Resolve the UX review, deliver an engaging bilingual child session experience, deploy, and iteratively verify production.
**Architecture:** Retain Astro and existing tool engines. Share presentation controls and metadata; keep patient activity state in memory. Build-time localized routes and search cover the complete public site.
**Tech Stack:** Astro 5, TypeScript, Tailwind 4, native browser APIs, Three.js, Vitest, Playwright.
**Spec:** docs/superpowers/specs/2026-09-07-ux-usability-design.md

## Global Constraints
- Mobile and desktop equal; English and Spanish complete public workflows.
- Nothing autoplays; reduced motion honored; stop controls reachable; destructive scene actions confirm and undo.
- No new clinical efficacy claims, fabricated reviewers, patient accounts, or patient data collection.
- No secrets staged, no force-push, no modification to preexisting .claude.
- npm run verify must pass before commits; deployment to existing DigitalOcean App Platform is authorized.
- Browser tests use synthetic inputs only. Workers do not commit or deploy; coordinator verifies and commits integrated work.

### Task 1: Complete Spanish clinical and resource workflows
**Ownership:** New Spanish clinical handout pages/content/components as needed, src/pages/es/clinicians/emdr/index.astro, src/pages/es/clinicians/resources/index.astro, src/pages/es/families/resources/index.astro, Spanish resource markdown. Do not modify shared i18n utilities/UI dictionary, tool widgets, global styles, or English pages.
**Interfaces:** Produce routes /es/clinicians/emdr/intake-form, print-package, phase-2-scripts through phase-8-scripts, and phase-2-resource-safe-place/container/lightstream/breathing. Equivalent topic coverage and usable print layouts; Spanish print package includes only Spanish content. Shared translation-path function already prefixes /es. Report new route names for coordinator.
- [ ] Inspect all thirteen English sources and current Spanish routing.
- [ ] Establish missing routes with built HTML inventory and record failure in task report.
- [ ] Implement complete Spanish versions, preserving clinical caveats and source attribution. Avoid token-only placeholders or English fallback.
- [ ] Localize Spanish resource titles/descriptions/tags and link to appropriate editions/destinations. State original-resource language when external material is English.
- [ ] Verify build and route/content inventory; inspect print and phone layout; report changed files and any content uncertainty.

### Task 2: Shared navigation, search and presentation
**Ownership:** Coordinator. Header, BaseLayout, FullscreenLayout, ToolShell, ToolCard, PhaseLayout, shared styles, search index/utilities, routes and session launcher, browser test harness.
**Interfaces:** In-place client mode uses data-client-view on body and dispatches tool-presentation-change; it does not navigate or reload. ToolShell renders a button data-client-view-toggle with aria-pressed and updates URL hash only to #activity. Tool widget root remains mounted. All widgets retain existing data-* roots and action controls. Settings default closed. Public language-switch routes resolved after Task 1.
- [ ] Add Playwright regression harness and fail on 390px phase overflow, Spanish search destination, accent search, no search dismiss, and presentation state loss.
- [ ] Implement route-based bilingual search with synonyms, accessible selection/count and explicit close.
- [ ] Fix grid min-width and header breakpoints; surface session tools, language and help.
- [ ] Add task-first launcher and progressive tool shell, in-place client view and sticky stop/mute action rail.
- [ ] Correct evidence badge contrast; add appropriate global reduced-motion/focus/target styles.
- [ ] Pass browser regressions and npm run verify.

### Task 3: Child-guided tool agency and visual feedback
**Ownership:** Worker may own Grounding, SafePlace, Container, FeelingWheel, SUDScale, VOCScale, BreathPacer, Lightstream components and an optional shared guided-activity helper. No changes to global layout, ToolShell, ToolSettings, i18n/ui.ts, BLS engine modules.
**Interfaces:** Retain data-* widget and existing control selectors. ToolSettings defaults closed via explicit startOpen=false. In-place client presentation preserves DOM. Localized child presentation and optional speech must be user initiated; cancel speech when stopping/finishing/leaving.
- [ ] Add meaningful regression cases before edits for grounding finish/skip, wizard Back, selection state, and kid-mode strings.
- [ ] Implement Back/change choices; correct focus and selected ARIA states; editable/removable container entries; sensory alternatives/skip; real Finish actions.
- [ ] Add restrained responsive optional visuals to SafePlace/Container and clear emotion cards; correct mismatch with wheel instructions.
- [ ] Improve child wording and Spanish parity; neutral check-in labels; all scale and activity controls remain usable without audio.
- [ ] Fix breathing selected state, explain pattern labels, improve initial task hierarchy without changing prescribed pace values.
- [ ] Run targeted browser checks and npm run verify; provide concise report.

### Task 4: Sandtray recovery and touch discoverability
**Ownership:** Sandtray.astro plus its helper/tests/assets. No other widget edits.
**Interfaces:** Shared client view stays mounted. Dedicated fullscreen layout respects defaultPrevented and local handlers stop propagation. Scene dirty-state handler can expose data-session-dirty for shared navigation guard.
- [ ] Reproduce Escape exit/data loss; test local deselection retains route and placed figure.
- [ ] Add visible undo using same undo stack, meaningful selection/placement announcements, image preview thumbnails using existing GLB models without eager-loading all full models.
- [ ] Add explicit exit confirmation for dirty scenes, source-driven guidance, and recoverable WebGL/model load failure.
- [ ] Verify keyboard/touch-sized controls, undo clear/remove/carve and no unexpected audio/motion.
- [ ] Run verification and review.

### Task 5: Scientific precision, trust, resources, and print
**Ownership:** Coordinator. English/Spanish content claims and shared provenance component; About and privacy text; resource cards; English print selection and coordination with Spanish package.
- [ ] Verify disputed evidence claims using primary guidance and source literature; document support in content.
- [ ] Distinguish treatment and digital adaptation, qualify REM mechanism, link precise sources, correct author/reviewer claims without inventing review.
- [ ] Correct privacy language to actual aggregate analytics; preserve no analytics on activity pages.
- [ ] Label external language/type; fix missing resource destination; add print section choices and print/save PDF guidance in both languages.
- [ ] Run route/content checks and full verification.

### Task 6: Integrated review, deploy, and repeat
**Ownership:** Coordinator and independent reviewers (read-only review tasks).
- [ ] Run npm run verify plus browser end-to-end and static-route/translation checks; inspect desktop/mobile screenshots and representative prints.
- [ ] Request independent spec/code review; fix all confirmed important findings and verify scoped changes.
- [ ] Check staged content for secrets, commit atomic verified working states, push/merge to main without force, wait for exact deployment commit.
- [ ] Run production browser checks against exact deployed state; record deployment/test evidence.
- [ ] Perform fresh UX review of child, clinician, Spanish, touch/keyboard and error paths; fix justified findings, redeploy and retest.
- [ ] Repeat until two scoped review rounds return no concrete defect or clearly beneficial in-scope improvement. Record research-dependent hypotheses honestly.
