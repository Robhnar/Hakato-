# 013 – Silnik wyszukiwania okien, cykli i analizy „Start się opóźnił o N dni"

- **Status:** w toku
- **Właściciel:** osoba A
- **Moduł:** `metrics`, `api`
- **Gałąź:** `feat/013-wyszukiwarka-okien`
- **Zależy od:** 011 (opcjonalnie 012 dla gotowych plików `data/calendars/`)

## Cel

Planista misji podaje wymagania (czas trwania, minimalna wysokość Słońca przy lądowaniu, minimalna liczba godzin słońca, maksymalny czas ciągłej ciemności ze względu na baterię, wymagana łączność z Ziemią przy lądowaniu i przez X% misji) albo pyta: **„Co jeśli start opóźni się o N dni?"**. Backend zwraca siatkę kalendarza, uszeregowaną listę najlepszych okien lądowania, analizę przesunięcia startu oraz wyjaśnienie w oparciu o cykle astronomiczne.

## Zakres

Obowiązkowo:

- Implementacja `metrics.search_windows(...)` w `backend/app/metrics/windows_search.py` i podpięcie pod `GET /api/windows` (oraz cache `lru_cache` w `routes.py`):
  1. **Siatka i wyszukiwanie po wymaganiach misji:**
     - Jeśli dla `(lat_deg, lon_deg)` istnieje gotowy kalendarz z zadania 012 i `duration_hours ≈ 708.7`, korzysta z niego bezpośrednio; w przeciwnym razie liczy siatkę okien na żądanie (z jednokrotnie pobranym profilem horyzontu).
     - Sprawdza warunki dla każdego kandydata:
       - `sun_el_at_start_deg >= min_sun_el_at_landing_deg`,
       - `sunlight_hours >= min_sunlight_hours`,
       - `max_darkness_hours <= max_darkness_hours` (najdłuższy ciągły brak Słońca w oknie),
       - `not require_earth_at_landing or earth_visible_at_start`,
       - `earth_visible_fraction >= min_earth_fraction`.
     - Wyznacza ocenę jakości okna `score` (0…100) uwzględniającą nadwyżkę godzin słońca, krótki czas maksymalnej ciemności i ułamek łączności z Ziemią; zwraca `matches` posortowane od najlepszego.
  2. **Tryb „Start się opóźnił o N dni" (`reference_start_utc` + `slip_days`):**
     - Oblicza metryki okna w pierwotnym terminie (`original_slot`) oraz po przesunięciu o `slip_days` (`delayed_slot`).
     - Wyznacza różnice (`delta_sunlight_hours`, `delta_max_darkness_hours`, `delta_earth_fraction`).
     - Szuka **najbliższego kolejnego okna równoważnego** (`nearest_equivalent_slot` po dacie opóźnionej), które spełnia wymagania lub ma co najmniej tak dobre oświetlenie i łączność jak okno pierwotne (wykorzystując fakt, że kierunek Słońca powtarza się co wielokrotność dnia księżycowego `29,53 d`).
  3. **Wykorzystanie i wyjaśnienie cykli (`cycles` i `cycles_summary`):**
     - Dla każdego okna podaje fazę w kluczowych cyklach:
       - **29,53 d** — dzień księżycowy (miesiąc synodyczny – azymut Słońca),
       - **346,62 d** — rok drakonicki / „pory roku" na biegunie (deklinacja selenograficzna Słońca $\pm 1{,}54^\circ$),
       - **27,21 d** — miesiąc drakonicki / libracje szerokościowe (wysokość Ziemi nad horyzontem),
       - **18,6 roku** — precesja węzłów orbity Księżyca (powolna modulacja amplitudy libracji Ziemi).
  4. **Walidacja zakresu dat:**
     - Jądro `de440s.bsp` obejmuje `1850–2150`, a `moon_pa_de440_200625.bpc` obejmuje `1550–2650`. Zapytania wykraczające poza `1850–2150` lub przekraczające maksymalny rozmiar siatki zwracają czytelny kod `422`.

Jeśli zostanie czas:

- Dwuetapowe przeszukiwanie dla niestandardowych współrzędnych (zgrubny krok 2–4 h na zawężenie kandydatów, potem dokładny krok 15 min dla najlepszych okien).

Poza zakresem:

- Interfejs użytkownika (zadania 014 i 015).

## Pliki

`backend/app/metrics/windows_search.py`, `backend/app/metrics/__init__.py`, `backend/app/api/routes.py`, `backend/tests/test_windows_search.py`.

## Kontrakty

Implementuje kontrakt `GET /api/windows` zdefiniowany w zadaniu 011.

## Kryteria ukończenia

- [ ] Test jednostkowy: dla zadanego zestawu wymagań `search_windows` odfiltrowuje okna ze zbyt długą nocą (`max_darkness_hours`) i sortuje wyniki malejąco po `score`.
- [ ] Test jednostkowy: dla opóźnienia startu np. o 14 dni (połowa dnia księżycowego) `slip_analysis` wykrywa spadek oświetlenia w tym samym azymucie i znajduje najbliższe okno równoważne około ~29,5 dnia po pierwotnym starcie.
- [ ] `GET /api/windows` dla miejsca polarnego na przestrzeni roku odpowiada poniżej 2 sekund.
- [ ] `ruff` i `pytest` zielone.
