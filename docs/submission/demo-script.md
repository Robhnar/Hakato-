# Demo script (practice on `main` only)

**Goal:** one continuous story ≤ 30 seconds of screen time (or the narrative behind ≤ 7 slides).  
**Build:** `git checkout main && git pull`, then backend + `npm run dev` (prefer live backend with SPICE kernels if available; otherwise note Approximate / flat-horizon banners).

Do **not** demo unmerged feature branches. All five views (**Sky**, **Timeline**, **Compare**, **Windows**, **Map** with **Optimal zone overlay: ON/OFF**) are integrated on `main`.

## Story

> “Launch slips a week. Does our south-pole candidate still survive lunar night on battery — when is the nearest equivalent window — and which polar ridge is optimal right now?”

## Shot list (~25–30 s)

| t | Action | Say (EN) |
| --- | --- | --- |
| 0–3 s | Title: Hakato + challenge name | “Hakato — Lunar Landing Site Navigator.” |
| 3–8 s | **Sky** & **Timeline**: pick **Shackleton Connecting Ridge** vs **South Pole Reference**, scrub `cursor_utc` | “SPICE ephemerides and LOLA terrain horizons show exact solar power and Earth line-of-sight.” |
| 8–14 s | **Compare**: show 2–3 polar sites side by side | “Moving a few kilometres onto Shackleton’s ridge boosts sunlight from 25% to over 90%.” |
| 14–21 s | **Windows**: filter by max darkness (battery limit), drag **Launch delayed by +N days**, click **Jump to nearest window** | “In Windows, we search 2027–2035 calendars, quantify a +7-day launch slip, and jump to the next equivalent window.” |
| 21–27 s | **Map**: click **South pole view**, toggle **Optimal zone overlay: ON**, click **Move active scenario to optimal zone** | “On the 3D Moon globe, toggling the Optimal Zone overlay reveals the solar/comms sweet spot and predicts the best landing site.” |
| 27–30 s | End card: repo URL + NASA data line | “NAIF SPICE + LOLA DEM. github.com/Robhnar/Hakato-” |

## Backup if kernels missing

Run anyway: the Approximate banner is a feature for judges — call it out (“placeholder ephemeris until kernels load”). Polar sites with `data/horizons/*.json` can still show non-flat terrain.

## Checklist before recording

- [ ] `main` pulled today
- [ ] Backend responds; `meta` checked once in Network tab or UI warning
- [ ] Two scenarios with **different** numbers on Compare (fixtures alone may look identical — use live backend)
- [ ] No secrets on screen; English narration or English subtitles
