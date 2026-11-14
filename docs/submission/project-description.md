# Hakato — project description (English)

Aligned with repository `main` as of 2026-11-14. Claims below match what the app actually exposes (including `meta` on API responses).

## Problem

Lunar south-pole and near-side missions need solar power and direct-to-Earth communications. Small changes in landing coordinates or launch date can flip feasibility. Existing tools (Quickmap, Moon Trek, JPL Horizons) are powerful but slow for rapid what-if comparison across several sites and windows.

## Solution

**Hakato** is a web app for the 2026 NASA Space Apps challenge *Lunar Landing Site Navigator*. A planner picks sites (catalogue or custom ME coordinates), sets a UTC start and window length (24 h / 1 lunar day / 3 lunar days), builds up to four scenarios, and explores five integrated views:

- **Sky:** 360° LOLA terrain horizon silhouette with Sun/Earth tracks, rise/set crossings, and live time cursor,
- **Timeline:** elevation curves, continuous sunlight/Earth-link window bands, and synchronized `cursor_utc` scrubbing,
- **Compare:** side-by-side trade-off table and illumination/comms bars across up to 4 scenarios,
- **Windows (Multi-Year Landing Window Finder & Launch Slip Analyzer):** precomputed 2027–2035 lunar-day calendars (`data/calendars/`), interactive `start date × metric` heatmap, mission requirement filters (battery darkness limit, landing Sun elevation, Earth link %), **"Launch delayed by +N days"** impact & nearest equivalent window finder, astronomical cycles (29.5 d synodic, 346.6 d draconic season, 27.2 d libration, 18.6 yr nodal precession), finite solar disc ($0.53^\circ$), $\pm 0.2^\circ$ horizon uncertainty bands, and solar eclipse detection,
- **Map (3D Moon Globe + ON/OFF Optimal Zone Overlay):** Three.js LROC Moon globe with a toggleable **`Optimal zone overlay: ON / OFF`** layer that projects solar power (🟡), Earth comms (🔵), and simultaneous *sweet-spot* (🟢) zones onto the globe and predicts the **Optimal Landing Zone** across catalogue sites and a 40-point south-polar reference grid ($-85^\circ\dots-90^\circ$).

Every computed API payload includes `meta.ephemeris` and `meta.horizon` so the UI can warn when results are approximate.

## How it works

| Layer | Role |
| --- | --- |
| Backend (Python / FastAPI) | Ephemeris, terrain horizon, metrics, multi-year window search (`/api/windows`), and polar optimal-site engine (`/api/optimal-site`) |
| Ephemeris | NAIF **SPICE** via `spiceypy` (`de440s.bsp`, `moon_pa_de440_200625.bpc`, `moon_de440_250416.tf`) when kernels are present; otherwise a documented **placeholder** model (`meta.ephemeris = "placeholder"`) |
| Terrain | Precomputed / LOLA-derived horizon profiles (`ldem_75s_120m`, 0.5° azimuth step) for south-polar sites (`meta.horizon = "lola"`); otherwise **flat** horizon |
| Frontend (React / TypeScript / Vite) | Shell for scenarios + 5 views: Sky, Timeline, Compare, Windows, Map (with ON/OFF Optimal Zone overlay) |
| Fixtures | Frontend can run without backend (`npm run dev:fixtures`) on recorded JSON |

Horizons System is used for **offline verification** of SPICE results (including historical Apollo 11–17 landing solar elevations verified to $<0.02^\circ$), not as a runtime dependency.

## What is real vs simplified (honesty for judges)

**Computed for real (when data are loaded):**

- Sun/Earth azimuth and elevation from NAIF SPICE kernels (`MOON_ME` frame with light-time and stellar aberration `LT+S`).
- Local horizon elevation vs azimuth from LOLA DEM (`ldem_75s_120m`) with lunar curvature correction for all 5 south-polar catalogue sites (`data/horizons/`) and 2027–2035 lunar-day calendars (`data/calendars/`).
- Visibility windows, visible fractions, longest continuous darkness (battery sizing), hours until rise/set, finite solar disc ($R_\odot = 0.266^\circ$), $\pm 0.2^\circ$ horizon margin (`typical`/`worst_case`/`best_case`), and Earth-induced solar eclipses (`uncertainty.py`).
- Multi-year window search (`/api/windows`) with mission requirement filtering, launch slip simulation (`+N` days + nearest equivalent window), and polar optimal-site search (`/api/optimal-site`).
- Sky panorama, Timeline with synchronized cursor, Compare lanes, Windows heatmap & slip analyzer, and 3D Moon Globe with toggleable **ON/OFF** Optimal Zone overlay.

**Simplified or incomplete on current `main`:**

- Sites outside the polar DEM (`> -75°` latitude) without a stored profile use a **flat** horizon — the UI states this explicitly via `meta.horizon`.
- Without local SPICE kernels (`data/raw/kernels/`) the backend falls back to the **placeholder** ephemeris and warns in the UI.
- Catalogue Artemis “rim” points are literature-derived regional landmarks (with peer-reviewed DOI/LROC citations in `data/sites.sources.md`), not official flight-approved landing pads.

## Stack

Python 3.11+, FastAPI, spiceypy, numpy · TypeScript, React, Vite · pytest, vitest · GitHub Actions CI.

## Repository

https://github.com/Robhnar/Hakato-
