# Use of Artificial Intelligence / SI tools

Paste a shortened version into the Space Apps **Use of AI** form field. Expand if the form allows more text.

## Summary for the form

We used AI coding assistants (Cursor Agent, Claude, Codex, and related CLI agents) throughout the hackathon to scaffold modules, draft tests, review diffs against task briefs, and write documentation. Humans defined architecture, task splits, acceptance criteria, and merged pull requests. No AI-generated imagery is used in the core UI; the Moon globe texture is an LROC-derived NASA/ASU mosaic, not an AI image. If any slide or promo graphic is later AI-generated, it will carry a visible “AI-generated” watermark as required by Space Apps 2026 rules.

## Detail (for judges / appendix)

| Tool | Role |
| --- | --- |
| Cursor / Composer agents | Frontend shell, compare view, docs, submission pack |
| Claude / Codex / Gemini CLI (as available on team machines) | Parallel module work (ephemeris, terrain, metrics, views) per `AGENTS.md` |
| GitHub Copilot-style assistants (where used) | Local autocomplete |

AI did **not** replace:

- reading NASA challenge text and Resources,
- deciding module contracts (`docs/ARCHITECTURE.md`),
- verifying scientific sanity (e.g. Horizons cross-checks for SPICE, LOLA horizon checks),
- final PR review and merge by the team integrator.

Secrets and credentials were never placed in the repository; AI prompts used public challenge materials and this open codebase.
