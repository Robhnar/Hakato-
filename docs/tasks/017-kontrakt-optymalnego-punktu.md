# 017 – Kontrakt wyszukiwania optymalnego punktu lądowania (`/api/optimal-site`) i fixture

- **Status:** w recenzji
- **Właściciel:** osoba C
- **Moduł:** `api`, `contracts`, `web/src/api`
- **Gałąź:** `feat/017-kontrakt-optimal-site`
- **Zależy od:** –

## Cel

Zdefiniować wspólny kontrakt HTTP dla propozycji ze zgłoszenia **#29** (predykcja optymalnego punktu lądowania i dynamiczna nakładka stref zasilania/łączności na globusie 3D włączana przełącznikiem **ON/OFF** w widoku `Map`). Zadanie odblokowuje równoległą pracę nad silnikiem backendowym (zadanie 018 – osoba A) oraz warstwą wizualną ON/OFF w Three.js (zadanie 019 – osoba F).

## Zakres

Obowiązkowo:

- Rozszerzenie schematów Pydantic w `backend/app/api/schemas.py` o modele dla `GET /api/optimal-site`:
  - `OptimalWeights`: `w_sun: float`, `w_earth: float`, `w_overlap: float`.
  - `CursorBodies`:
    - `cursor_utc: str`,
    - `subsolar_lat_deg: float`, `subsolar_lon_deg: float`,
    - `subearth_lat_deg: float`, `subearth_lon_deg: float`.
  - `OptimalCandidate`:
    - `id: str`, `name: str`,
    - `lat_deg: float`, `lon_deg: float`, `elevation_m: float | None = None`,
    - `is_catalog_site: bool`,
    - `score: float` ($0\dots 100$),
    - `sun_visible_fraction: float`, `earth_visible_fraction: float`, `overlap_fraction: float`,
    - `sunlight_hours: float`, `earth_hours: float`, `overlap_hours: float`,
    - `max_darkness_hours: float`,
    - `sun_visible_at_cursor: bool`, `earth_visible_at_cursor: bool`.
  - `OptimalSiteResponse`:
    - `optimal: OptimalCandidate`,
    - `ranking: list[OptimalCandidate]` (katalog miejsc + polarna siatka referencyjna $-85^\circ \dots -90^\circ$),
    - `cursor_bodies: CursorBodies`,
    - `weights: OptimalWeights`,
    - `meta: Meta`.
- Dodanie endpointu `GET /api/optimal-site` w `backend/app/api/routes.py` z parametrami zapytania:
  - `start_utc: datetime`, `end_utc: datetime`,
  - `cursor_utc: datetime | None = None`,
  - `step_minutes: Step = 60`,
  - `w_sun: float = 0.45`, `w_earth: float = 0.25`, `w_overlap: float = 0.30`.
  - Dopóki zadanie 018 nie jest scalone, endpoint może delegować do funkcji `metrics.find_optimal_site(...)` lub tymczasowego fallbacku w `metrics`.
- Lustrzane typy TypeScript w `web/src/api/types.ts` (`OptimalSiteQuery`, `OptimalWeights`, `CursorBodies`, `OptimalCandidate`, `OptimalSiteResponse`) oraz metoda `api.optimalSite(query: OptimalSiteQuery): Promise<OptimalSiteResponse>` w `web/src/api/client.ts` (z obsługą trybu `VITE_USE_FIXTURES=true`).
- Wygenerowanie przykładowej odpowiedzi `contracts/fixtures/optimal_site.json` w `backend/scripts/generate_fixtures.py` i dopisanie kontraktu do `docs/ARCHITECTURE.md`.

Poza zakresem:

- Docelowy algorytm optymalizacji po siatce polarnej LOLA + SPICE (zadanie 018 – osoba A).
- Renderowanie nakładki Three.js i przełącznika ON/OFF na mapie (zadanie 019 – osoba F).

## Pliki

`backend/app/api/schemas.py`, `backend/app/api/routes.py`, `backend/scripts/generate_fixtures.py`, `contracts/fixtures/optimal_site.json`, `web/src/api/types.ts`, `web/src/api/client.ts`, `docs/ARCHITECTURE.md`, `backend/tests/test_api_smoke.py`.

## Kontrakty

Nowy endpoint `GET /api/optimal-site` — zmiany w `schemas.py` i `types.ts` wykonywane są wyłącznie w tym zadaniu.

## Kryteria ukończenia

- [x] `GET /api/optimal-site` przechodzi walidację `OptimalSiteResponse` w `pytest` (`backend/tests/test_api.py`).
- [x] Plik `contracts/fixtures/optimal_site.json` istnieje i działa z `api.optimalSite()` przy `VITE_USE_FIXTURES=true`.
- [x] `ruff`, `pytest`, `npm run lint`, `npm run build` i `npm test` przechodzą.
