# 011 – Kontrakt i szkielet wyszukiwarki okien lądowania (`/api/windows` + widok `windows`)

- **Status:** w recenzji
- **Właściciel:** osoba C
- **Moduł:** `api`, `contracts`, frontend – powłoka i widok `windows`
- **Gałąź:** `feat/011-kontrakt-okna`
- **Zależy od:** –

## Cel

Zanim backend policzy wieloletnie kalendarze (012, 013), a frontend zbuduje mapę cieplną i symulator opóźnienia startu (014, 015), obie strony potrzebują wspólnego kontraktu HTTP i fixture'a. Po tym zadaniu aplikacja ma zatwierdzony kształt endpointu `GET /api/windows`, przykładową odpowiedź w `contracts/fixtures/windows.json`, metodę `api.windows()` we frontendzie oraz nową zakładkę **Windows** w powłoce aplikacji z możliwością zastosowania znalezionego okna do aktywnego scenariusza.

## Zakres

Obowiązkowo:

- Rozszerzenie `docs/ARCHITECTURE.md` o specyfikację `GET /api/windows`.
- Modele Pydantic w `backend/app/api/schemas.py` oraz odpowiadające im interfejsy TypeScript w `web/src/api/types.ts`.
- Zaślepka endpointu `GET /api/windows` w `backend/app/api/routes.py` oraz generator fixture'a w `backend/scripts/export_fixtures.py` zapisujący `contracts/fixtures/windows.json`.
- Metoda `api.windows(q: WindowsQuery)` w `web/src/api/client.ts` (obsługująca `VITE_USE_FIXTURES=1`).
- Rozszerzenie `ViewProps` o `applyWindow(start_utc, duration_hours?)`.
- Rejestracja widoku `{ id: 'windows', label: 'Windows', … }` oraz szkielet `web/src/views/windows/index.tsx`.

Jeśli zostanie czas:

- Opcjonalne pole `uncertainty` na slocie (pod 016) — dodane jako opcjonalne w kontrakcie.

Poza zakresem:

- Docelowy algorytm przeszukiwania wieloletniego (012, 013) oraz docelowy UI mapy cieplnej (014, 015).

## Pliki

`docs/ARCHITECTURE.md`, `backend/app/api/schemas.py`, `backend/app/api/routes.py`, `backend/app/api/windows_stub.py`, `backend/scripts/export_fixtures.py`, `contracts/fixtures/windows.json`, `web/src/api/types.ts`, `web/src/api/client.ts`, `web/src/app/scenario.ts`, `web/src/app/views.ts`, `web/src/App.tsx`, `web/src/views/windows/**`.

## Kontrakty

Definiuje nowy kontrakt `GET /api/windows` oraz rozszerza `ViewProps` o `applyWindow`. Musi być scalone przed 013, 014 i 015.

## Kryteria ukończenia

- [x] `GET /api/windows` zwraca poprawny JSON zgodny z `schemas.WindowsResponse` (200 OK).
- [x] `python -m scripts.export_fixtures` generuje `contracts/fixtures/windows.json` i test zgodności fixtures przechodzi.
- [x] Zakładka `Windows` wyświetla się w nawigacji i działa z `npm run dev:fixtures`.
- [x] `ruff`, `pytest`, `npm run lint`, `npm run build`, `npm test` zielone.
