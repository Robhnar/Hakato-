# 023 – Poprawki z audytu backendu: kalendarz, zakres SPICE, wagi

- **Status:** w recenzji
- **Właściciel:** Claude Code
- **Moduł:** `metrics`, `ephemeris`, `api`
- **Gałąź:** `feat/023-poprawki-z-audytu`
- **Zależy od:** – (równolegle PR #44 / zadanie 022; patrz „Notatki")

## Cel

Wyszukiwarka okien nie może po cichu gubić wyników, a daty i wagi spoza dozwolonego zakresu mają dawać czytelne 422 zamiast błędu 500 albo bezsensownego rankingu.

## Zakres

Obowiązkowo:

- **Krytyczne:** `search_windows` używa prekomputowanego kalendarza (`data/calendars/`, lata 2027–2035) tylko wtedy, gdy ten kalendarz pokrywa cały szukany zakres. Dotąd przy choć jednym pasującym slocie reszta zakresu była pomijana (szukanie 2026-01-01 → 2027-01-01 dawało 1 slot zamiast 12).
- Wspólna kontrola zakresu jądra SPICE (`timeutil.check_spice_range`, dokładne granice 1849-12-26 … 2150-01-20 z marginesem doby) w `ephemeris.body_positions` i `find_optimal_site`; `/api/timeline` i `/api/summary` zwracają 422 przy `ValueError`. Dotąd daty z lutego–grudnia 2150, `reference_start_utc` po opóźnieniu i `cursor_utc=2300-…` dawały 500.
- Wagi `w_sun`, `w_earth`, `w_overlap` w `/api/optimal-site`: `ge=0`, bez NaN i inf (dotąd `w_sun=nan` zwracało 200 z wynikiem 100 dla każdego kandydata).
- Usunięta martwa gałąź `hasattr(terrain, "horizon_elevation_at")` i zdublowana `_horizon_at`; `evaluate_slot` używa `metrics.horizon_elevation_at` (zachowanie bez zmian, sprawdzone na kilku azymutach).

Poza zakresem:

- Różnica kroku próbkowania: prekomputowany kalendarz liczony jest co 120 min, wyszukiwanie na żądanie co 60 min, więc 708,7 h i 700 h mogą dać nieco inne liczby. Nie mierzone, do decyzji integratora (ujednolicić krok albo opisać w kontrakcie).
- Trzy rozproszone kopie reguły „lata 1850–2150" (`api/routes.py`, `windows_search.py`, `optimal_site.py`) zostają; nowa kontrola jest tylko dodatkowym, dokładniejszym zabezpieczeniem.

## Pliki

`backend/app/metrics/windows_search.py`, `backend/app/metrics/optimal_site.py`, `backend/app/ephemeris/__init__.py`, `backend/app/timeutil.py`, `backend/app/api/routes.py`, `backend/tests/test_windows_search.py`, `backend/tests/test_api.py`, ten plik.

## Kontrakty

Bez zmian formatów odpowiedzi. Zmienia się tylko kod odpowiedzi dla błędnych wejść: 500 → 422 (daty poza pokryciem SPICE) oraz 200 → 422 (NaN, inf i wartości ujemne w wagach).

## Kryteria ukończenia

- [x] Szukanie 2026-01-01 → 2027-01-01 przy 708,7 h zwraca 12 slotów od 2026-01-01 (przed poprawką: 1 slot); test dla zakresu wychodzącego przed i po kalendarzu.
- [x] Cztery zapytania z datami poza pokryciem SPICE zwracają 422 na żywym serwerze (przed poprawką: 500); testy czerwone bez poprawki.
- [x] `w_sun=nan`, `w_sun=-1`, `w_earth=inf` zwracają 422.
- [x] `pytest -q` (85 testów), `ruff check`, `ruff format --check` przechodzą.

## Notatki

- Źródło: audyt repozytorium (ustalenia 2, 3, 4, 5, 6).
- PR #44 (zadanie 022, blokada SPICE) zmienia te same pliki `ephemeris/__init__.py` i `optimal_site.py` w sąsiednich liniach; drugi z dwóch PR-ów może wymagać prostego scalenia konfliktu (zachować i zamek, i `check_spice_range`).
- Nie sprawdzono: zachowania przy opóźnieniu startu tuż przed 2150 r. (poszukiwanie „najbliższego równoważnego okna" sięga 365 dni w przód i da 422, jeśli wyjdzie poza pokrycie).
