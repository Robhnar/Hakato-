# Hakato — project description (English)

Aligned with repository `main` as of 2026-11-14. Claims below match what the app actually exposes (including `meta` on API responses).

## Problem

Lunar south-pole and near-side missions need solar power and direct-to-Earth communications. Small changes in landing coordinates or launch date can flip feasibility. Existing tools (Quickmap, Moon Trek, JPL Horizons) are powerful but slow for rapid what-if comparison across several sites and windows.

## Solution

**Hakato** is a web app for the 2026 NASA Space Apps challenge *Lunar Landing Site Navigator*. A planner picks sites (catalogue or custom ME coordinates), sets a UTC start and window length (24 h / 1 lunar day / 3 lunar days), builds up to four scenarios, and compares:

- fraction of time with Sun above the local horizon (power),
- fraction of time with Earth above the local horizon (comms),
- max elevations, rise/set timing from start,
- sky panorama, globe map, and side-by-side compare view.

Every computed API payload includes `meta.ephemeris` and `meta.horizon` so the UI can warn when results are approximate.

## How it works

| Layer | Role |
| --- | --- |
| Backend (Python / FastAPI) | Ephemeris, terrain horizon, metrics, site catalogue API |
| Ephemeris | NAIF **SPICE** via `spiceypy` when kernels are present; otherwise a documented **placeholder** model (`meta.ephemeris = "placeholder"`) |
| Terrain | Precomputed / LOLA-derived horizon profiles for polar sites when available (`meta.horizon = "lola"`); otherwise **flat** horizon |
| Frontend (React / TypeScript / Vite) | Shell for scenarios + views: Sky, Timeline, Compare, Map |
| Fixtures | Frontend can run without backend (`npm run dev:fixtures`) on recorded JSON |

Horizons System is used for **offline verification** of SPICE results, not as a runtime dependency.

## What is real vs simplified (honesty for judges)

**Computed for real (when data are loaded):**

- Sun/Earth azimuth and elevation from SPICE kernels (NAIF).
- Local horizon elevation vs azimuth from LOLA-based profiles for several south-polar catalogue sites (see `data/horizons/`).
- Visibility windows, visible fractions, hours until rise/set, sticky summary strip.
- Sky panorama (horizon silhouette + body tracks), interactive Moon globe with catalogue pins, multi-scenario compare lanes.

**Simplified or incomplete on current `main`:**

- Sites far from the polar DEM / without a stored profile use a **flat** horizon — the UI states this explicitly.
- Without SPICE kernels the backend falls back to the **placeholder** ephemeris and warns in the UI.
- The **Timeline** tab on `main` is still a stub (full timeline work lives on branch `feat/007-os-czasu` and is not claimed as shipped until merged).
- Catalogue Artemis “rim” points are regional landmarks, not approved landing pads; sources are listed in `data/sites.sources.md`.
- Visibility uses body centre vs horizon (no finite disc / atmosphere; Moon has none).

## Stack

Python 3.11+, FastAPI, spiceypy, numpy · TypeScript, React, Vite · pytest, vitest · GitHub Actions CI.

## Repository

https://github.com/Robhnar/Hakato-
