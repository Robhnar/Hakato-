# Hakato

A tool for quickly comparing lunar landing sites and dates: it shows the position of the Sun and Earth relative to the horizon, solar-power windows and direct-to-Earth communication windows. A project for the NASA Space Apps Challenge 2026.

- Challenge text: [lunar-landing-site-navigator-details.md](lunar-landing-site-navigator-details.md)
- Data sources: [lunar-landing-site-navigator-resources.md](lunar-landing-site-navigator-resources.md)

## Running

Required: Python 3.11 or newer and Node.js 22 or newer.

Backend (terminal 1):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
python ../data/scripts/fetch_kernels.py  # Downloads NAIF SPICE kernels to data/raw/kernels/ (optional; without them an approximate model is used)
uvicorn app.main:app --reload
```

Frontend (terminal 2), then open http://localhost:5173:

```bash
cd web
npm install
npm run dev
```

Frontend only, without the backend – data from `contracts/fixtures/`:

```bash
npm run dev:fixtures
```

## Tests and lint

Run before every PR. CI checks the same.

| Where | Commands |
| --- | --- |
| `backend/` | `ruff check .` · `ruff format --check .` · `pytest -q` |
| `web/` | `npm run lint` · `npm run build` · `npm test` |

After changing a contract or the site catalog, refresh the sample responses (from the `backend/` directory):

```bash
python -m scripts.export_fixtures
```

## Data status and app capabilities

All project phases (**Phase 1: `000`–`010`**, **Phase 2: `011`–`016`**, **Phase 3: `017`–`019`**) are merged into `main`:

- **Ephemerides (`SPICE`) and terrain (`LOLA`):** the repository contains generated LOLA horizon profiles (`data/horizons/*.json`) and multi-year lunar-day calendars for 2027–2035 (`data/calendars/*.json`) for all 5 polar landing sites. After downloading the NAIF SPICE kernels (`python data/scripts/fetch_kernels.py`) the backend computes exact `de440s` + `MOON_ME` ephemerides; without the kernels it automatically falls back to an approximate model (`meta.ephemeris = "placeholder"`).
- **5 navigator views:**
  1. **Sky** — LOLA horizon panorama (360°) with Sun and Earth paths and rise/set markers.
  2. **Timeline** — interactive timeline of elevation, visibility bands and a shared `cursor_utc` cursor.
  3. **Compare** — side-by-side comparison of up to 4 landing scenarios.
  4. **Windows** — multi-year landing-window search (2027–2035), a "start date × parameter" heatmap, filtering by mission requirements (battery, illumination, communication), a **"Launch delayed by +N days"** simulator with the nearest equivalent window, astronomical cycles, and models of the solar disc ($0.53^\circ$), horizon uncertainty ($\pm 0.2^\circ$) and eclipses.
  5. **Map** — interactive 3D globe of the Moon (`Three.js` + NASA LROC texture), camera fly-over to the poles, coordinate grid, terminator and Earth visibility limit, site labels, coordinate readout under the cursor; the **`Optimal zones`** switch shows soft zones (Sun only, Earth only, Sun + Earth, Neither) and candidates on a score scale with a ranking, weight sliders (mission profile) and a **`Move scenario here`** button.

## How we work

| You want to… | See |
| --- | --- |
| start working | [CONTRIBUTING.md](CONTRIBUTING.md) |
| see the task list | [docs/tasks/](docs/tasks/README.md) |
| understand the module split | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |

## AI assistance

The project was built with the help of AI tools: Claude Code, Cursor, Codex, Gemini CLI and GitHub Copilot. They helped with coding, debugging, tests and documentation; code and data are marked with `Co-Authored-By` trailers in the commit history. Architecture, task split and verification of results were done by people. Details: [docs/submission/ai-disclosure.md](docs/submission/ai-disclosure.md). Data and resources used: [docs/submission/data-and-references.md](docs/submission/data-and-references.md).

## Contributors

- [MichalSzuba](https://github.com/MichalSzuba) – architecture design ([docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)), API contracts and metrics.
- [Robhnar](https://github.com/Robhnar) – repo skeleton, integration, tasks 020–025.
- [wampirrrr](https://github.com/wampirrrr), [Micello421](https://github.com/Micello421), [OverrLoss](https://github.com/OverrLoss), [Tomaszkawa](https://github.com/Tomaszkawa) – backend modules and frontend views (tasks 001–019).
