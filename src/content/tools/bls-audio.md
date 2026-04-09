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
