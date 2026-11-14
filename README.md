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

## Stan danych

Dopóki nie są scalone zadania 001 i 002, backend liczy położenia z **przybliżonego modelu** i zakłada **płaski horyzont**. Każda odpowiedź API mówi o tym w polu `meta`, a aplikacja pokazuje ostrzeżenie.

## Jak pracujemy

| Chcesz… | Zajrzyj do |
| --- | --- |
| zacząć pracę nad zadaniem | [CONTRIBUTING.md](CONTRIBUTING.md) |
| zobaczyć listę zadań | [docs/tasks/](docs/tasks/README.md) |
| zrozumieć podział na moduły | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| skonfigurować asystenta AI | [AGENTS.md](AGENTS.md) – większość narzędzi czyta go sama |
