# Seven-slide outline (≤ 7 including title & close)

Export to PDF/Google Slides and put the link in **Project Demo**. Screenshots must come from `main`.

## 1. Title

- **Hakato**
- Challenge: Lunar Landing Site Navigator — NASA Space Apps 2026
- Team name (fill in)
- Repo: https://github.com/Robhnar/Hakato-

## 2. Problem

- South-pole / CLPS planning: solar power + direct-to-Earth comms
- Schedule slips → re-evaluate site and date fast
- Existing NASA tools are deep, not built for 4-way what-if

## 3. Solution

- Web app: catalogue + custom ME coords, UTC windows, up to 4 scenarios
- Sticky summary of Sun/Earth visibility + provenance badges (`meta.ephemeris`, `meta.horizon`)
- Five integrated views: **Sky** · **Timeline** · **Compare** · **Windows** (2027–2035 search & launch slip) · **Map** (3D globe with **ON/OFF Optimal Zone overlay**)

## 4. NASA data & physics

- NAIF SPICE (`de440s.bsp`, `moon_pa_de440_200625.bpc`) ephemerides; JPL Horizons validation (Apollo 11–17 $<0.02^\circ$)
- LOLA DEM (`ldem_75s_120m`) 360° horizon profiles + precomputed 2027–2035 lunar-day calendars
- Finite solar disc ($0.53^\circ$), $\pm 0.2^\circ$ horizon uncertainty bands, and Earth-induced solar eclipses

## 5. Demo / results

- **Compare & Sky:** Shackleton Connecting Ridge vs South Pole Reference LOLA horizon
- **Windows:** 2027–2035 heatmap, mission battery filter, and **"Launch delayed by +N days"** nearest equivalent window
- **3D Map (ON/OFF overlay):** Amber (Sun), Blue (Earth), Emerald (*Sweet Spot*), and predicted **Optimal Landing Zone**

## 6. Impact & next steps

- Instant trade studies when launch slips by days or weeks
- Active decision support: from passive site check to multi-year window search & polar optimal-site prediction
- Next: sub-pixel LOLA 5 m/px local meshes, DSN ground-station schedules, and solar array tilt profiles

## 7. Close

- Team + roles (A–F modules)
- References → see `data-and-references.md`
- AI disclosure → see `ai-disclosure.md`
- Thank you / QR or repo URL
