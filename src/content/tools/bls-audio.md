---
name: "Audio Bilateral Stimulation"
category: bls
audience: [clinician]
useContext: [in-session]
evidence: research-backed
shortDescription: "Alternating left/right stereo tones for auditory BLS. Requires headphones. Adjustable speed, tone, volume."
componentName: "BLSAudio"
citations:
  - label: "Shapiro, F. (2018). Eye Movement Desensitization and Reprocessing (EMDR) Therapy: Basic Principles, Protocols, and Procedures, 3rd ed. Guilford Press."
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

Stereo pan depth is adjustable rather than fixed — it defaults to 85% left/right separation (not fully hard-panned), since some clients find full left/full right fatiguing over a long session. Voice (tone, chime, woodblock, marimba, bell, pluck), pitch, and volume are also adjustable; default frequency is 440 Hz. An optional ambient bed (noise, drone, or a binaural layer) can play underneath the bilateral tone. Starting the tool requires a user gesture due to browser autoplay policy — clients will see a "Start" button that must be tapped before sound plays.
