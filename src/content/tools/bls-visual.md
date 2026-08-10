---
name: "Visual Bilateral Stimulation"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Horizontal-moving dot for eye-movement bilateral stimulation. Adjustable speed, size, color. Use fullscreen for in-session delivery."
componentName: "BLSVisual"
citations:
  - label: "Shapiro, F. (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed. Guilford Press."
  - label: "EMDRIA. Standard EMDR Therapy Protocol — organizational training standard. See also: Luber, M. (Ed.) (2016). A Guide to the Standard EMDR Therapy Protocols. Springer."
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

Shapiro's published guidance describes speed as "as fast as the client can comfortably track" rather than a fixed Hz value. The 1.0 Hz default (one full left-right cycle per second) is a reasonable middle estimate from EMDR training materials; adjust freely per client tolerance and response. Sets of ~24 passes are a commonly taught starting point; shorter or longer sets are appropriate depending on the session. Faster movement is generally used for desensitization, slower for installation. Use fullscreen mode to remove visual distractions and give the client clean tracking.

## Parameter defaults

- **Speed:** 1.0 Hz (one full left-right cycle per second)
- **Set length:** 24 passes
- **Path:** horizontal (infinity, arc, diagonal, and wave paths are also available)
- **Easing:** cosine (eases in/out at each edge; linear and smootherstep are also available)
- **Target shape:** circle (ring, soft glow, star, and butterfly shapes are also available), 48 px, with adjustable glow and trail length
- **Color:** warm white target on a black background, plus five built-in palettes (default, high contrast, low-stimulation, warm, cool)
- **Crossfade:** off — when enabled, the target cross-fades between the two extremes instead of translating, for reduced-motion use
