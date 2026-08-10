# AGENTS.md

Project instructions for this repo live in **[claude.md](./claude.md)** — that file
is canonical for all coding agents, not just Claude Code. Read it before starting work.

Quick reference:

- Verify with `npm run verify` (lint/test if present, then `astro build`). Must be
  green before committing.
- Trauma-informed UX rules in claude.md are non-negotiable — nothing autoplays,
  stop controls stay reachable, animations respect `prefers-reduced-motion`.
- Every EN page needs an ES counterpart or an `EN_ONLY_ROUTES` entry
  (`src/i18n/utils.ts`).
