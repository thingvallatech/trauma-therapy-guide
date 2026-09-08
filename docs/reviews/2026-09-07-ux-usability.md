# UX and usability release review — 7 September 2026

The review prioritized clinicians using activities with children, help for the current moment, equivalent English/Spanish coverage, and phone/desktop usability. Child age range and independent versus supported use were not specified; changes therefore emphasize optional steps, simple language and clinician/caregiver support rather than age-specific treatment claims.

## Changes

- Direct activity launcher, plain-language names, consistent activity/help/language access, responsive navigation and phase layouts.
- Same-page activity presentation preserves widget state. Advanced settings start collapsed; timed activities keep Start/Stop visible while scrolling. No activity autostarts.
- Search handles accents, multiple terms, everyday synonyms, displayed activity names, scripts, intake forms and resource titles/authors. It has an explicit close button, keyboard navigation and first-result Enter behavior.
- Guided activities offer Back, Skip, Finish and Return; feelings can remain unnamed and scales unrated. Container writing is optional and can be edited, removed and restored. Calm-place choices have corresponding static illustrations.
- Sandtray has 59 previews rendered from its existing licensed models, visible undo, loading/retry feedback and protected exits. Undo preserves original model customization. Escape cancels local selections before leaving presentation.
- All 13 missing Spanish clinical routes are present with substantive content, localized resource entries and selectable print materials. Public EN routes have ES counterparts; admin/error pages use safe locale fallbacks.
- English/Spanish print packages select documents and support the browser's Save as PDF action. Intake lines and source formatting survive combination; fixed-height blank pages were removed.
- Actual worksheets and a grounding activity are discoverable from the libraries. Bibliographic entries without downloads are identified; internal links stay in the current tab.
- Contrast, selected-state ARIA, focus transitions, reduced-motion behavior, US crisis-service scope and privacy disclosures were corrected.
- Unsupported authorship, guaranteed outcomes and mechanism claims were removed or qualified. Evidence for a complete therapy is distinguished from evidence for an isolated technique or this website. [VA's EMDR overview](https://www.ptsd.va.gov/professional/treat/txessentials/emdr_pro.asp) describes evidence and mechanism uncertainty; [NICE recommendations](https://www.nice.org.uk/guidance/ng116/chapter/recommendations) distinguish populations and treatment contexts.

## Verification

- `npm run verify`: typecheck, 100 unit tests, 126-page static build, and local link/asset/search destination/locale route audit.
- The expanded Playwright suite contains 42 tests, exercised in Chromium and WebKit with focused rechecks after each fix. Journeys cover search, preserved activity state, stop access, guided recovery, midpoint rating selection, color edits, sandtray undo/retry/exit, resources and selective printing.
- Responsive sweep: 12 representative routes in both languages at 320, 390, 820 and 1440 pixels.
- Axe checks: 10 key screens in each language, including activity and library pages. These checks do not certify full accessibility.
- Independent source and browser reviews verified the shared UI and the Spanish/guided work. Findings were fixed and reviewed again.
- Actual English (32 pages) and Spanish (36 pages) Letter PDFs were rendered and inspected, including input lines, headings, tables, pagination and the absence of blank pages. Spanish A4 was also checked.

## Production review and follow-up

- Release `20dc5a1` became active on DigitalOcean. All 36 browser tests passed on the public site; a crawl verified 126 pages and 85 linked build/thumbnail assets.
- A fresh mobile-keyboard review found search Escape also closing its underlying menu and leaving focus hidden. Added EN/ES regressions that reproduced the defect, then guarded the header handler while a dialog is open.
- Further keyboard checks added focus handoff for Start/Stop and Mute, explicit WebKit search/palette focus, and visible loading with inert controls until each widget is ready. Focus returns from loading links after WebKit has updated focusability. Six added EN/ES regressions reproduce these paths, including deliberately delayed scripts.
- Initial concurrent browser runs hit host/resource timeouts. Subsequent checks ran serially; sandtray tests allow time for model fetch/decode and WebGL initialization while retaining their functional assertions.
- A further editorial pass removed residual breathing/imagery outcome promises and forced completion from the preparation handouts. Counts are optional and comfort controls explicit in both languages. [NCCIH guidance](https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know) describes variable responses and limitations; these edits do not establish clinical efficacy.

## Limits and follow-up evidence

These are engineering, heuristic usability and editorial checks. They do not establish clinical efficacy, translation certification or usability with actual children. A qualified clinician and native Spanish clinical editor should review the content; moderated sessions with children, caregivers and clinicians should validate comprehension, comfort and engagement. Real assistive-technology and physical-device testing remains useful.

Safe dependency updates reduced the reported npm advisories from 15 to 3 and updated Astro within version 5. The remaining audit findings concern Astro and its build/development dependencies; npm proposes Astro 7, a separate breaking framework migration. This release remains a static deployment with no Astro application server. No claim is made that the remaining advisories are fixed.

The original report's speculative age-specific variants, validated clinical review badges, treatment outcome measures and engagement claims are not presented as proven. No patient answers or scene contents were added to persistent storage or analytics.

Browser commands: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:4322 npx playwright test --workers=1`; add `PLAYWRIGHT_BROWSER=webkit` for WebKit, or use the public site as the base URL for production verification. Install engines with `npx playwright install chromium webkit` when needed.
