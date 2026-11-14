# 018 – Silnik predykcji optymalnego punktu lądowania i polarnej siatki referencyjnej

- **Status:** wolne
- **Właściciel:** osoba A
- **Moduł:** `metrics`, `ephemeris`, `terrain`, `api`
- **Gałąź:** `feat/018-silnik-optimal-site`
- **Zależy od:** 017

## Cel

Zaimplementować deterministyczny silnik optymalizacji (zgłoszenie **#29**), który dla wybranego okna czasowego misji (`start_utc` → `end_utc`) oraz chwili kursora (`cursor_utc`) ocenia miejsca katalogowe i polarną siatkę referencyjną wokół bieguna południowego ($-85^\circ \dots -90^\circ$), wyznacza punkt maksymalizujący zasilanie słoneczne, łączność z Ziemią oraz ich jednoczesne pokrywanie się (*sweet spot*), a także zwraca współrzędne podpunktów Słońca i Ziemi dla nakładki 3D.

## Zakres

Obowiązkowo:

- Moduł `backend/app/metrics/optimal_site.py` z funkcją `find_optimal_site(...)`:
  - **Funkcja celu (Score $0\dots 100$):**
    $$\text{Score} = 100 \cdot \frac{w_s \cdot F_{\text{sun}} + w_e \cdot F_{\text{earth}} + w_o \cdot F_{\text{overlap}}}{w_s + w_e + w_o}$$
    gdzie:
    - $F_{\text{sun}} \in [0, 1]$ — ułamek czasu w oknie `start_utc..end_utc`, w którym Słońce jest nad lokalnym horyzontem LOLA (`el_sun > horizon_sun`),
    - $F_{\text{earth}} \in [0, 1]$ — ułamek czasu w oknie, w którym Ziemia jest nad lokalnym horyzontem (`el_earth > horizon_earth`),
    - $F_{\text{overlap}} \in [0, 1]$ — ułamek czasu, w którym **jednocześnie** widać Słońce i Ziemię (`sun_visible and earth_visible` — *sweet spot* operacyjny),
    - jeżeli suma wag $w_s + w_e + w_o \le 0$, przyjmij wagi domyślne $(0{,}45,\, 0{,}25,\, 0{,}30)$ lub zgłoś `ValueError`.
  - **Zbiór kandydatów:**
    1. Wszystkie 5 miejsc z katalogu `data/sites.json` (z ich prekomputowanymi profilami horyzontu LOLA z `data/horizons/<id>.json`),
    2. Polarna siatka referencyjna wokół bieguna południowego ($-85^\circ \dots -89{,}5^\circ$, np. szerokości `-89.5, -88.5, -87.0, -85.5` × 8 lub 12 długości geograficznych co $30^\circ\text{–}45^\circ$), tak aby pokryć całą czapę polarną dla nakładki cieplnej i jednocześnie utrzymać czas odpowiedzi $< 0{,}5\text{ s}$ (z cache'owaniem profili horyzontu).
  - **Stan w chwili kursora (`cursor_utc`, domyślnie `start_utc`):**
    - Wyznaczenie punktu podsłonecznego (`subsolar_lat_deg`, `subsolar_lon_deg`) oraz podziemskiego (`subearth_lat_deg`, `subearth_lon_deg`) na Księżycu w chwili `cursor_utc`,
    - Dla każdego kandydata flagi `sun_visible_at_cursor` i `earth_visible_at_cursor`.
  - **Wynik:** słownik zgodny z kontraktem `OptimalSiteResponse` z zadania 017 (`optimal` = pierwszy element `ranking`, `ranking` posortowany malejąco po `score`, `cursor_bodies`, `weights`, `meta`).
- Eksport `find_optimal_site` w `backend/app/metrics/__init__.py` i podpięcie z `@lru_cache` w `GET /api/optimal-site` w `backend/app/api/routes.py`.
- Testy jednostkowe w `backend/tests/test_optimal_site.py`:
  - Sprawdzenie wzoru na `score` i `overlap_fraction` (w tym warunku $0 \le F_{\text{overlap}} \le \min(F_{\text{sun}}, F_{\text{earth}})$),
  - Sprawdzenie zmiany lidera przy zmianie wag (np. `w_sun=1, w_earth=0, w_overlap=0` vs `w_sun=0, w_earth=1, w_overlap=0`),
  - Sprawdzenie poprawności `cursor_bodies` (`-90 <= lat <= 90`, `-180 <= lon <= 180`).

Poza zakresem:

- Renderowanie warstwy Three.js w przeglądarce (zadanie 019 – osoba F).

## Pliki

`backend/app/metrics/optimal_site.py`, `backend/app/metrics/__init__.py`, `backend/app/api/routes.py`, `backend/tests/test_optimal_site.py`.

## Kontrakty

Implementuje odpowiedź `OptimalSiteResponse` z zadania 017 dla `GET /api/optimal-site`.

## Kryteria ukończenia

- [ ] Dla każdego kandydata spełniona jest nierówność $0 \le F_{\text{overlap}} \le \min(F_{\text{sun}}, F_{\text{earth}}) \le 1$.
- [ ] `ranking` jest posortowany nierosnąco według `score`, a `optimal == ranking[0]`.
- [ ] Zapytanie `GET /api/optimal-site` dla okna 1 dnia księżycowego odpowiada w czasie $< 1\text{ s}$ (a z cache $< 50\text{ ms}$).
- [ ] `ruff` i `pytest` przechodzą.
