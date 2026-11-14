# Demo script (practice on `main` only)

**Goal:** one continuous story ≤ 30 seconds of screen time (or the narrative behind ≤ 7 slides).  
**Build:** `git checkout main && git pull`, then backend + `npm run dev` (prefer live backend with SPICE kernels if available; otherwise note Approximate / flat-horizon banners).

Do **not** demo unmerged feature branches. All four views (**Sky**, **Timeline**, **Compare**, **Map**) are integrated on `main`.

## Story

> “Launch slips two weeks. Does our south-pole candidate still have solar power and Earth line-of-sight — and is a ridge only a few kilometres away better?”

## Shot list (~25–30 s)

| t | Action | Say (EN) |
| --- | --- | --- |
| 0–3 s | Title: Hakato + challenge name | “Hakato — Lunar Landing Site Navigator.” |
| 3–8 s | Shell: pick **south-pole-reference**, start UTC in the next lunar day, window **1 lunar day** | “Same date window, reference polar site.” |
| 8–14 s | Sticky summary: Sun/Earth % and rise/set; mention `meta` banner if Approximate | “Share of sunlight and Earth visibility — and we label when data are approximate.” |
| 14–20 s | **Add scenario** → nearby better-lit candidate if in catalogue (or custom coords near Shackleton ridge); open **Compare** | “Shift a few degrees — compare power and comms side by side.” |
| 20–26 s | **Sky** or **Map** for one site | “Sky shows the horizon silhouette; map places the pin on the Moon.” |
| 26–30 s | End card: repo URL + NASA data line | “SPICE + LOLA-backed horizons. github.com/Robhnar/Hakato-” |

## Backup if kernels missing

Run anyway: the Approximate banner is a feature for judges — call it out (“placeholder ephemeris until kernels load”). Polar sites with `data/horizons/*.json` can still show non-flat terrain.

## Checklist before recording

- [ ] `main` pulled today
- [ ] Backend responds; `meta` checked once in Network tab or UI warning
- [ ] Two scenarios with **different** numbers on Compare (fixtures alone may look identical — use live backend)
- [ ] No secrets on screen; English narration or English subtitles
