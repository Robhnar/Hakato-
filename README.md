# Hakato

Narzędzie do szybkiego porównywania miejsc i dat lądowania na Księżycu: pokazuje położenie Słońca i Ziemi względem horyzontu, okna zasilania słonecznego i okna łączności bezpośredniej z Ziemią. Projekt na NASA Space Apps Challenge 2026.

- Treść wyzwania: [lunar-landing-site-navigator-details.md](lunar-landing-site-navigator-details.md)
- Źródła danych: [lunar-landing-site-navigator-resources.md](lunar-landing-site-navigator-resources.md)

## Uruchomienie

Potrzebne: Python 3.11 lub nowszy i Node.js 22 lub nowszy.

Backend (terminal 1):

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
python ../data/scripts/fetch_kernels.py  # Pobiera jądra NAIF SPICE do data/raw/kernels/ (opcjonalne, bez nich działa model przybliżony)
uvicorn app.main:app --reload
```

Frontend (terminal 2), potem otwórz http://localhost:5173:

```bash
cd web
npm install
npm run dev
```

Sam frontend, bez backendu – dane z `contracts/fixtures/`:

```bash
npm run dev:fixtures
```

## Testy i lint

Uruchom przed każdym PR. To samo sprawdza CI.

| Gdzie | Polecenia |
| --- | --- |
| `backend/` | `ruff check .` · `ruff format --check .` · `pytest -q` |
| `web/` | `npm run lint` · `npm run build` · `npm test` |

Po zmianie kontraktu albo katalogu miejsc odśwież przykładowe odpowiedzi (z katalogu `backend/`):

```bash
python -m scripts.export_fixtures
```

## Stan danych i możliwości aplikacji

Wszystkie fazy projektu (**Faza 1: `000`–`010`**, **Faza 2: `011`–`016`**, **Faza 3: `017`–`019`**) są scalone na `main`:

- **Efemerydy (`SPICE`) i teren (`LOLA`):** repozytorium zawiera wygenerowane profile horyzontu LOLA (`data/horizons/*.json`) oraz wieloletnie kalendarze dni księżycowych 2027–2035 (`data/calendars/*.json`) dla wszystkich 5 polarnych miejsc lądowania. Po pobraniu jąder NAIF SPICE (`python data/scripts/fetch_kernels.py`) backend liczy dokładne efemerydy `de440s` + `MOON_ME`; bez pobranych jąder automatycznie przełącza się na model przybliżony (`meta.ephemeris = "placeholder"`).
- **5 widoków nawigatora:**
  1. **Sky** — panorama horyzontu LOLA (360°) ze ścieżkami Słońca i Ziemi oraz znacznikami wschodów/zachodów.
  2. **Timeline** — interaktywna oś czasu wysokości, pasm widoczności i wspólnego kursora `cursor_utc`.
  3. **Compare** — porównanie do 4 scenariuszy lądowania obok siebie.
  4. **Windows** — wieloletnia wyszukiwarka okien lądowania (2027–2035), mapa cieplna „data startu × parametr", filtrowanie po wymaganiach misji (bateria, oświetlenie, łączność), symulator opóźnienia startu **„Launch delayed by +N days"** z najbliższym równoważnym oknem, cykle astronomiczne oraz model tarczy słonecznej ($0{,}53^\circ$), niepewności horyzontu ($\pm 0{,}2^\circ$) i zaćmień.
  5. **Map** — interaktywny globus 3D Księżyca (`Three.js` + tekstura NASA LROC) z przełączaną warstwą **`Optimal zone overlay: ON / OFF`**, która wizualizuje strefy zasilania (🟡), łączności z Ziemią (🔵) i *sweet spotu* (🟢) oraz wyznacza optymalny punkt lądowania (**Optimal Landing Zone**) na siatce polarnej.

## Jak pracujemy

| Chcesz… | Zajrzyj do |
| --- | --- |
| zacząć pracę nad zadaniem | [CONTRIBUTING.md](CONTRIBUTING.md) |
| zobaczyć listę zadań | [docs/tasks/](docs/tasks/README.md) |
| zrozumieć podział na moduły | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| skonfigurować asystenta AI | [AGENTS.md](AGENTS.md) – większość narzędzi czyta go sama |
