# Ready-to-paste Space Apps form fields (English)

Copy into the Project tab. Adjust team name and demo link before submit.

## Project Name

Hakato — Lunar Landing Site Navigator

## High-Level Summary

Hakato helps mission planners and educators compare lunar landing sites, multi-year launch windows (2027–2035), and launch-slip impacts for solar power and direct-to-Earth communications. Users build up to four scenarios and explore five views: a 360° LOLA Sky panorama, synchronized Timeline, side-by-side Compare, a multi-year Windows finder with a "+N days launch delay" simulator, and a 3D Moon Globe with a toggleable ON/OFF Optimal Landing Zone heatmap overlay. Powered by NAIF SPICE and LOLA DEM horizons.

## Project Demo

_TODO before submit:_ paste link to ≤30 s video **or** ≤7-slide PDF/deck built from [slides-outline.md](slides-outline.md).

## Final Project

https://github.com/Robhnar/Hakato-

Local run: see repository `README.md` (`uvicorn` backend + `npm run dev`, or `npm run dev:fixtures`).

## Project Details

See [project-description.md](project-description.md) for the full text. Short version:

Hakato is a FastAPI + React application for the Lunar Landing Site Navigator challenge. The backend computes Sun and Earth azimuth/elevation (NAIF SPICE `de440s` + `MOON_ME`), builds local horizons from LOLA `ldem_75s_120m` DEM profiles, models finite solar-disc visibility ($0.53^\circ$), $\pm 0.2^\circ$ horizon uncertainty, and solar eclipses, searches 2027–2035 landing windows (`/api/windows`), and predicts the optimal landing zone across a polar reference grid (`/api/optimal-site`). The frontend shell manages up to 4 scenarios across five views: Sky, Timeline, Compare, Windows (heatmap, mission requirements, launch slip +N days), and Map (3D LROC globe with toggleable ON/OFF Optimal Zone overlay).

## Use of Artificial Intelligence

See [ai-disclosure.md](ai-disclosure.md). Short version:

We used AI tools (Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot) for coding, debugging, tests, docs and brainstorming. Humans designed, wrote, reviewed and verified the work and merged every PR. Commits made with AI help carry `Co-Authored-By` trailers. No AI-generated images, video or audio are used.

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
