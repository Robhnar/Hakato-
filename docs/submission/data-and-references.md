# NASA / partner data and references

At least one NASA Resource from the challenge is required for Global Awards eligibility. Hakato uses several.

## NASA data used in the product

| Source | Challenge Resources? | How Hakato uses it |
| --- | --- | --- |
| **NAIF SPICE kernels** (via spiceypy) | Related to Horizons-quality ephemerides | Runtime Sun/Earth az/el from the landing site; `meta.ephemeris = "spice"` when kernels are present |
| **JPL Horizons System** | Yes — listed in challenge Resources | Offline validation of SPICE results (control points), not called at request time |
| **LOLA digital elevation** (PDS / LRO) | Yes — topography via LOLA / Quickmap ecosystem | Horizon profiles for polar sites (`meta.horizon = "lola"` when profile exists) |
| **LROC Quickmap** | Yes | Site reconnaissance and coordinate cross-check for the catalogue |
| **Moon Trek** | Yes | Design reference for globe/terrain intuition (not a runtime dependency) |
| **NASA Artemis candidate regions** press release | NASA content | Seed for south-pole candidate sites in the catalogue |

Challenge Resources snapshot: `lunar-landing-site-navigator-resources.md` in the repo root.

## Catalogue and imagery

- Landing-site list: `data/sites.json` (19 entries: Apollo, CLPS, international, commercial, Artemis candidates).
- Provenance per site: `data/sites.sources.md`.
- Globe texture: `web/public/moon_lroc_color_2k.jpg` (LROC-derived colour mosaic; attribute LROC / NASA / ASU as appropriate on slides).

## Software references (non-exhaustive)

- FastAPI, Uvicorn, Pydantic
- spiceypy / NAIF CSPICE
- NumPy
- React, Vite, TypeScript, Vitest
- oxlint
- GitHub Actions

Full dependency pins: `backend/pyproject.toml`, `web/package.json`.

## Form fields: link text + URL

**NASA Data**

- NAIF SPICE kernels (de440s, MOON_ME) — https://naif.jpl.nasa.gov/naif/data.html
- JPL Horizons System — https://ssd.jpl.nasa.gov/horizons/
- LRO LOLA digital elevation model (PDS) — https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/
- LROC Quickmap — https://quickmap.lroc.asu.edu/
- NASA Moon Trek — https://trek.nasa.gov/moon/
- NASA Artemis III candidate landing regions — https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/

**Space Agency Partner & Other Data**

- Moon texture (LROC-derived colour mosaic, NASA/GSFC/ASU) — https://svs.gsfc.nasa.gov/4720/
- FastAPI — https://github.com/fastapi/fastapi
- spiceypy — https://github.com/AndrewAnnex/SpiceyPy
- NumPy — https://github.com/numpy/numpy
- Uvicorn — https://github.com/encode/uvicorn
- React — https://github.com/facebook/react
- three.js — https://github.com/mrdoob/three.js
- Vite — https://github.com/vitejs/vite
- IBM Plex fonts (via Fontsource) — https://github.com/IBM/plex
- AI tools: Claude Code https://claude.com/claude-code · Cursor https://cursor.com · Codex https://openai.com/codex · Gemini CLI https://github.com/google-gemini/gemini-cli · GitHub Copilot https://github.com/features/copilot
