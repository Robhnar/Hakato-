# 011 – Kontrakt i szkielet wyszukiwarki okien lądowania (`/api/windows` + widok `windows`)

- **Status:** wolne
- **Właściciel:** osoba C (wspólnie z integratorem)
- **Moduł:** `api`, `contracts`, frontend – powłoka i widok `windows`
- **Gałąź:** `feat/011-kontrakt-okna`
- **Zależy od:** –

## Cel

Zanim backend policzy wieloletnie kalendarze (012, 013), a frontend zbuduje mapę cieplną i symulator opóźnienia startu (014, 015), obie strony potrzebują wspólnego kontraktu HTTP i fixture'a. Po tym zadaniu aplikacja ma zatwierdzony kształt endpointu `GET /api/windows`, przykładową odpowiedź w `contracts/fixtures/windows.json`, metodę `api.windows()` we frontendzie oraz nową zakładkę **Windows** w powłoce aplikacji z możliwością zastosowania znalezionego okna do aktywnego scenariusza.

## Zakres

Obowiązkowo:

- Rozszerzenie `docs/ARCHITECTURE.md` o specyfikację `GET /api/windows`.
- Modele Pydantic w `backend/app/api/schemas.py` oraz odpowiadające im interfejsy TypeScript w `web/src/api/types.ts`:
  - Parametry zapytania (`WindowsQuery`):
    - `lat_deg: float`, `lon_deg: float`
    - `search_start_utc: datetime`, `search_end_utc: datetime` (zakres przeszukiwania, np. 1 rok lub 2027–2035; jądra `de440s.bsp` pokrywają lata `1850–2150`, a `moon_pa_de440_200625.bpc` lata `1550–2650`)
    - `duration_hours: float = 708.7` (czas trwania misji)
    - `min_sun_el_at_landing_deg: float = 0.0` (minimalna wysokość Słońca w chwili lądowania)
    - `min_sunlight_hours: float = 0.0` (minimalna łączna liczba godzin słońca w oknie)
    - `max_darkness_hours: float = 708.7` (maksymalna długość najdłuższej nieprzerwanej nocy – ograniczenie baterii)
    - `require_earth_at_landing: bool = False` (wymagana widoczność Ziemi w chwili lądowania)
    - `min_earth_fraction: float = 0.0` (minimalny ułamek czasu misji z łącznością z Ziemią, `0.0…1.0`)
    - `reference_start_utc: datetime | None = None` oraz `slip_days: float = 0.0` (opcjonalne parametry dla trybu „Start się opóźnił o N dni")
  - Kształt odpowiedzi (`WindowsResponse`):
    - `grid: list[CalendarSlot]` – siatka kolejnych okien/dni księżycowych do narysowania mapy cieplnej (`start_utc`, `end_utc`, `sunlight_hours`, `sun_visible_fraction`, `max_darkness_hours`, `max_sun_el_deg`, `sun_el_at_start_deg`, `earth_hours`, `earth_visible_fraction`, `earth_visible_at_start`, `passes_requirements`, `score`, `cycles`: `lunar_day_index`, `seasonal_phase_deg`, `draconic_year_Note`).
    - `matches: list[CalendarSlot]` – lista okien spełniających wymagania, posortowana malejąco po `score`.
    - `slip_analysis: SlipAnalysis | None` – wynik analizy opóźnienia startu (`original_slot`, `delayed_slot`, `delta_sunlight_hours`, `delta_max_darkness_hours`, `delta_earth_fraction`, `nearest_equivalent_slot`, `explanation`).
    - `cycles_summary: CyclesSummary` – okresy głównych cykli użyte w obliczeniach (`synodic_month_days = 29.53`, `draconic_year_days = 346.62`, `nodal_precession_years = 18.6`, `libration_month_days = 27.21`).
    - `meta: Meta` (`ephemeris`, `horizon`).
- Zaślepka endpointu `GET /api/windows` w `backend/app/api/routes.py` oraz generator fixture'a w `backend/scripts/export_fixtures.py` zapisujący `contracts/fixtures/windows.json`.
- Metoda `api.windows(q: WindowsQuery)` w `web/src/api/client.ts` (obsługująca `VITE_USE_FIXTURES=1`).
- Rozszerzenie `ViewProps` w `web/src/app/scenario.ts` (i `web/src/App.tsx`) o akcję `applyWindow(start_utc: string, duration_hours?: number)` pozwalającą widokowi wyszukiwarki ustawić wybrany termin w aktywnym scenariuszu.
- Rejestracja widoku `{ id: 'windows', label: 'Windows', component: WindowsView }` w `web/src/app/views.ts` oraz szkielet `web/src/views/windows/index.tsx`.

Jeśli zostanie czas:

- Opcjonalne pola w kontrakcie na margines niepewności (`uncertainty`: `worst_case_sunlight_hours`, `horizon_margin_deg`) pod zadanie 016.

Poza zakresem:

- Docelowy algorytm przeszukiwania wieloletniego (zadania 012 i 013) oraz docelowy interfejs mapy cieplnej i formularza (zadania 014 i 015).

## Pliki

`docs/ARCHITECTURE.md`, `backend/app/api/schemas.py`, `backend/app/api/routes.py`, `backend/scripts/export_fixtures.py`, `contracts/fixtures/windows.json`, `web/src/api/types.ts`, `web/src/api/client.ts`, `web/src/app/scenario.ts`, `web/src/app/views.ts`, `web/src/App.tsx`, `web/src/views/windows/index.tsx`.

## Kontrakty

Definiuje nowy kontrakt `GET /api/windows` oraz rozszerza `ViewProps` o `applyWindow`. Musi być scalone przed 013, 014 i 015.

## Kryteria ukończenia

- [ ] `GET /api/windows` zwraca poprawny JSON zgodny z `schemas.WindowsResponse` (200 OK).
- [ ] `python -m scripts.export_fixtures` generuje `contracts/fixtures/windows.json` i test zgodności fixtures przechodzi.
- [ ] Zakładka `Windows` wyświetla się w nawigacji i działa z `npm run dev:fixtures`.
- [ ] `ruff`, `pytest`, `npm run lint`, `npm run build`, `npm test` zielone.
