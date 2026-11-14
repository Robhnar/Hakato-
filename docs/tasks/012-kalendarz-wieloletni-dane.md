# 012 – Kalendarz miejsca na lata naprzód (2027–2035) i prekalkulacja

- **Status:** w recenzji
- **Właściciel:** osoba B
- **Moduł:** `data`, `metrics`
- **Gałąź:** `feat/012-kalendarz-wieloletni`
- **Zależy od:** 011

## Cel

Położenia Słońca i Ziemi wynikają deterministycznie z efemeryd SPICE (`de440s.bsp` sięga do stycznia 2150 r., `moon_pa_de440_200625.bpc` do 2650 r.), a profil horyzontu LOLA dla danego miejsca jest stały. Zamiast liczyć wieloletni przedział od zera przy każdym kliknięciu, liczymy z wyprzedzeniem kalendarz dni księżycowych na lata **2027–2035** dla miejsc z katalogu i zapisujemy go w `data/calendars/<id>.json`.

## Zakres

Obowiązkowo:

- Skrypt `data/scripts/build_calendars.py`, który dla miejsc z `data/sites.json` (szczególnie polarnych kandydatów z profilem LOLA oraz reprezentatywnych miejsc referencyjnych) generuje wieloletnią siatkę okien na lata `2027-01-01` – `2035-12-31`:
  - Profil horyzontu (`terrain.horizon_profile`) ładowany jest **raz** na miejsce.
  - Dla każdego kolejnego cyklu / dnia księżycowego (`29,53059 d ≈ 708,734 h`) lub siatki podokien wyznacza:
    - `start_utc`, `end_utc`,
    - `sunlight_hours`, `sun_visible_fraction`,
    - `max_darkness_hours` (najdłuższy nieprzerwany okres ciemności w tym oknie – kluczowe dla pojemności baterii),
    - `max_sun_el_deg`, `sun_el_at_start_deg`,
    - `earth_hours`, `earth_visible_fraction`, `earth_visible_at_start`, `max_earth_el_deg`,
    - parametry cykliczne (`lunar_day_index`, `seasonal_phase_deg` w cyklu 346,62 d).
- Zapis wygenerowanych plików do `data/calendars/<site_id>.json` (kompaktowy JSON, w repozytorium dla kluczowych miejsc polarnych: `south-pole-reference`, `shackleton-ridge`, `nobile-rim-1`, `de-gerlache-rim-2`, `im-1-odysseus`).
- Funkcja pomocnicza `load_precomputed_calendar(lat_deg, lon_deg)` ładująca gotowy kalendarz z dysku, jeśli współrzędne odpowiadają miejscu z katalogu (analogicznie do `data/horizons/<id>.json` w module `terrain`).

Jeśli zostanie czas:

- Zapis skompresowanej siatki dziennej (krok 24 h na lata 2027–2035), pozwalającej w ułamku milisekundy złożyć okno o dowolnej długości `duration_hours` z preagregowanych dob.

Poza zakresem:

- Filtrowanie po wymaganiach użytkownika i obsługa endpointu `/api/windows` (zadanie 013).

## Pliki

`data/scripts/build_calendars.py`, `data/calendars/**`, `backend/app/metrics/calendar_store.py`, `backend/tests/test_calendar_store.py`.

## Kontrakty

Korzysta z `ephemeris.body_positions`, `terrain.horizon_profile` i struktur z zadania 011. Udostępnia `calendar_store.load_precomputed_calendar()` dla modułu `metrics` (zadanie 013).

## Kryteria ukończenia

- [x] `PYTHONPATH=backend python -m data.scripts.build_calendars` generuje pliki w `data/calendars/*.json` dla miejsc polarnych na lata 2027–2035.
- [x] Czas generowania jednego roku dla jednego miejsca wynosi poniżej kilku sekund dzięki jednokrotnemu pobraniu horyzontu i wektoryzacji.
- [x] Na miejscu `shackleton-ridge` i `south-pole-reference` wyraźnie widać roczną modulację oświetlenia (cykl ~347 dni: polarne lato vs polarna zima).
- [x] `ruff` i `pytest` zielone.
