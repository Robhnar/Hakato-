# Ready-to-paste Space Apps form fields (English)

Copy into the Project tab. Adjust team name and demo link before submit.

## Project Name

Hakato — Lunar Landing Site Navigator

## High-Level Summary

Hakato helps mission planners and educators quickly compare lunar landing sites and dates for solar power and direct-to-Earth communications. Users build up to four scenarios (catalogue or custom coordinates, UTC windows) and see Sun/Earth visibility metrics, a sky panorama, a Moon globe, and a side-by-side compare view. Results are powered by NAIF SPICE and LOLA-based horizons when available, with explicit `meta` labels when approximations are used.

## Project Demo

_TODO before submit:_ paste link to ≤30 s video **or** ≤7-slide PDF/deck built from [slides-outline.md](slides-outline.md) using [demo-script.md](demo-script.md).

## Final Project

https://github.com/Robhnar/Hakato-

Local run: see repository `README.md` (`uvicorn` backend + `npm run dev`, or `npm run dev:fixtures`).

## Project Details

See [project-description.md](project-description.md) for the full text. Short version:

Hakato is a FastAPI + React application for the Lunar Landing Site Navigator challenge. The backend computes Sun and Earth azimuth/elevation (SPICE when kernels are present), builds local horizons (LOLA profiles for selected polar sites, otherwise flat), and returns timeline/summary metrics with provenance in `meta`. The frontend shell manages scenarios; Sky, Timeline, Compare, and Map views visualize results. We designed for rapid what-if comparison when a landing date or site must change.

## Use of Artificial Intelligence

See [ai-disclosure.md](ai-disclosure.md). Short version:

AI coding assistants (Cursor, Claude, Codex, and related tools) helped implement modules, tests, and docs under human architecture and review. No AI-generated images are used in the core UI; LROC-derived Moon imagery is credited separately. Any later AI promo art will be watermarked.

## NASA / Partner Data

- NAIF SPICE kernels (runtime ephemerides)  
- JPL Horizons (validation) — https://ssd.jpl.nasa.gov/horizons/  
- LOLA / LRO topography for polar horizon profiles  
- LROC Quickmap — https://quickmap.lroc.asu.edu/  
Details: [data-and-references.md](data-and-references.md)

## References

- Challenge details/resources files in repo root  
- `data/sites.sources.md`  
- `docs/ARCHITECTURE.md`  
- spiceypy / NAIF, FastAPI, React, Vite  
- Full list: [data-and-references.md](data-and-references.md) + [ai-disclosure.md](ai-disclosure.md)
