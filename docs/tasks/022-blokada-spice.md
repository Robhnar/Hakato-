# 022 – Blokada wywołań SPICE (równoległe zapytania przewracały backend)

- **Status:** w recenzji
- **Właściciel:** Claude Code
- **Moduł:** `ephemeris`, `metrics` (wywołania SPICE w `optimal_site`)
- **Gałąź:** `feat/022-blokada-spice`
- **Zależy od:** –

## Cel

Równoległe zapytania do API (np. tryb prowadzony „Plan a landing" wysyła serię `/api/windows`) nie mogą kończyć się błędami 422/500/502 ani zabijać procesu backendu.

## Zakres

Obowiązkowo:

- Jeden wspólny zamek `ephemeris.SPICE_LOCK` wokół wszystkich wywołań `spice.str2et` i `spice.spkpos` oraz ładowania jąder.
- Test, który odtwarza błąd bez zamka i przechodzi z nim.

Poza zakresem:

- Wydajność: wywołania SPICE są teraz szeregowane. Obliczenia numpy i reszta żądania dalej biegną równolegle; jeśli SPICE okaże się wąskim gardłem, rozważyć cache pozycji ciał lub osobny proces.
- Limit równoległych zapytań w froncie (zadanie 020).

## Pliki

`backend/app/ephemeris/__init__.py`, `backend/app/metrics/optimal_site.py`, `backend/tests/test_ephemeris_spice.py`, ten plik.

## Kontrakty

Bez zmian (API, formaty, schematy). `ephemeris.SPICE_LOCK` jest nową, wewnętrzną nazwą modułu `ephemeris`; każdy przyszły kod wołający `spiceypy` bezpośrednio musi ją trzymać.

## Kryteria ukończenia

- [x] `test_body_positions_is_thread_safe` – przed poprawką `SpiceyError`, po poprawce zielony.
- [x] 8 równoległych `/api/windows` i 4 równoległe `/api/optimal-site` na żywym serwerze: wszystkie 200, proces żyje, brak błędów SPICE w logu (przed poprawką: 7 z 8 `/api/windows` dawało 422, a proces potrafił paść na `SPICE(BADSUBSCRIPT)` w `str2et`).
- [x] `pytest -q` (77 testów), `ruff check`, `ruff format --check` przechodzą.

## Notatki

- Znalezione przy zadaniu 021 (PR #43), opisane tam jako problem w cudzym module.
- Nie sprawdzono: obciążenia powyżej kilkunastu równoległych zapytań ani wpływu szeregowania na czas odpowiedzi pod dużym ruchem.
