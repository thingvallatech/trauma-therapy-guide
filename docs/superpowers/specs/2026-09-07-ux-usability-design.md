# UX remediation and child session experience
Approved scope: the user requested all findings in the September 7 UX review be fixed, deployed to production, tested, and reviewed iteratively.

## Product
The primary user is a clinician working with a child; families also need accessible educational material. Mobile and desktop have equal priority. English and Spanish must support the same public workflows. No new clinical efficacy claims, fabricated reviewers, patient accounts, or patient data collection.

## Design
Retain the site's forest and warm-paper identity. Add a task-first session launcher with illustrated, clearly named activities. A tool's initial screen foregrounds the activity; settings and clinical evidence use progressive disclosure. A client presentation mode changes the current page in place, preserving activity state. Use playful but restrained iconography and choice-driven scenes; no autoplay, streaks, rewards for distress scores, or compulsory sound.

## Required outcomes
1. Local Escape actions in sandtray take precedence; visible undo works on touch. Unsaved-scene exit offers explicit recovery choices. Thumbnail figure palette, brief guidance, and WebGL fallback.
2. Stop/mute stays reachable while activities run and settings are expanded. Essential warnings remain visible in client/fullscreen mode.
3. All standard content reflows at 320–1440px; compact header retains Tools, language, and Help. Clinical phase navigation does not force page-wide overflow.
4. All thirteen missing Spanish clinical routes exist, with complete equivalent scripts/resources/intake/print workflows. Spanish resource descriptions and search terms are localized. No untranslated kid-mode labels.
5. Accurate evidence descriptions distinguish therapy, component, and digital adaptation; uncertain mechanisms identified as hypotheses. Explain authorship/review status honestly and correct privacy claims.
6. Direct tools start with settings collapsed and the main task visible. Child-friendly display names preserve clinician terminology in reference sections.
7. Search includes actual routes, intake and individual scripts; accent-insensitive normalization; useful synonyms; explicit dismissal; accessible selection and Enter behavior; valid bilingual destinations.
8. Contrast, selected states, focus management, accessible labels and large primary controls work in both languages.
9. Guided tools offer Back, editable choices, skip/alternative sensory prompts, and clear Finish/Return actions. Optional read-aloud is explicit and stoppable. Child mode and activity state survive presentation changes.
10. Resource cards identify format/language/destination; missing URLs receive actionable access; print package offers section selection, accurate scope and Save as PDF instructions.
11. Tests cover regressions meaningfully, production is verified after deployment, and review findings produce subsequent fixes. Stop iterating when two successive scoped reviews identify no concrete defect or clearly beneficial change within this brief; speculative ideas requiring clinical or participant validation are recorded, not invented as proven improvements.

## Verification
npm run verify must pass before commits. Add browser regression coverage and static-route checks. Smoke test production routes and key interactions after the exact commit is deployed. No secrets staged, no force-push, no modification to the preexisting .claude directory. Existing production is DigitalOcean App Platform, auto-deploying main.
