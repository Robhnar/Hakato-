# Architektura

> **Status: obowiązuje.** Szkielet z zadania 000 implementuje wszystko, co tu opisano. Zmiana kontraktu wymaga osobnego PR.

## Co budujemy

Aplikację webową do szybkiego porównywania miejsc i dat lądowania na Księżycu (wyzwanie [Lunar Landing Site Navigator](../lunar-landing-site-navigator-details.md), NASA Space Apps 2026). Dla wybranego miejsca i czasu pokazuje położenie Słońca i Ziemi względem horyzontu i odpowiada na dwa pytania: **czy jest zasilanie** (Słońce nad horyzontem) i **czy jest łączność bezpośrednia z Ziemią** (Ziemia nad horyzontem) – teraz, jak długo jeszcze i w jakich oknach.

Dlaczego teren jest tu kluczowy: na biegunie południowym Słońce nigdy nie wznosi się wyżej niż ok. 1,5° nad płaski horyzont, a Ziemia waha się w granicach kilku stopni. O widoczności decyduje więc pojedyncze wzgórze albo krawędź krateru, a nie sama geometria kuli.

## Stos technologiczny

| Warstwa | Wybór | Dlaczego |
| --- | --- | --- |
| Obliczenia i API | Python 3.11+, FastAPI | SPICE i narzędzia do danych rastrowych są w Pythonie najdojrzalsze |
| Efemerydy | SPICE przez `spiceypy`, jądra NAIF | to samo źródło, z którego korzysta JPL Horizons; działa lokalnie, bez limitów zapytań |
| Teren | modele wysokości LOLA (PDS), `numpy` | wymienione w zasobach wyzwania; potrzebne do realnego horyzontu |
| Frontend | TypeScript, React, Vite | szybki start, dobre wsparcie modeli AI |
| Testy | `pytest`, `vitest` | |

Horizons służy nam do **weryfikacji** wyników (porównanie kilku punktów kontrolnych), nie jako zależność w czasie działania.

## Moduły

Każdy moduł ma własny katalog. Poza swoim katalogiem nie zmieniasz plików bez uzgodnienia.

| Moduł | Katalog | Za co odpowiada |
| --- | --- | --- |
| Efemerydy | `backend/app/ephemeris/` | azymut i wysokość Słońca i Ziemi dla (szer., dł., czas) |
| Teren | `backend/app/terrain/` | profil horyzontu dla (szer., dł.) z modelu wysokości |
| Metryki | `backend/app/metrics/` | widoczność, okna, czas do zachodu, podsumowanie scenariusza |
| API | `backend/app/api/` | endpointy HTTP, katalog miejsc, cache |
| Dane | `data/` | katalog miejsc (`sites.json`), gotowe profile horyzontu, skrypty pobierania jąder i modeli wysokości |
| Frontend – powłoka | `web/src/App.tsx`, `web/src/app/`, `web/src/api/` | układ aplikacji, wybór miejsca i daty, klient API, stan scenariuszy |
| Frontend – widoki | `web/src/views/<widok>/` | każdy widok w osobnym katalogu: niebo, oś czasu, porównanie, mapa |
| Kontrakty | `contracts/` | przykładowe odpowiedzi API (fixtures) – wspólne dla backendu i frontendu |

Przepływ danych: `ephemeris` + `terrain` → `metrics` → `api` → `web`.

Moduły `ephemeris` i `terrain` nie wiedzą o sobie nawzajem; łączy je dopiero `metrics`. Dzięki temu trzy osoby mogą pisać backend równolegle.

## Kontrakty

### Konwencje (obowiązują wszędzie)

- **Współrzędne miejsca:** stopnie, układ selenograficzny Mean Earth / Polar Axis (ME). Szerokość −90…90, długość −180…180, dodatnia na wschód.
- **Azymut:** stopnie, 0 = północ, rośnie zgodnie z ruchem wskazówek zegara (90 = wschód), zakres 0…360.
- **Wysokość (elevation):** stopnie nad lokalną płaszczyzną poziomą, geometryczna – bez refrakcji, bo Księżyc nie ma atmosfery.
- **Czas:** UTC, ISO 8601 z sufiksem `Z`.
- **Widoczność (wersja 1):** ciało jest widoczne, gdy jego środek leży powyżej profilu horyzontu na swoim azymucie. Ułamek widocznej tarczy to rozszerzenie na później.
- **Nazwy pól w JSON:** `snake_case`, jednostka w nazwie (`_deg`, `_hours`).

### Interfejsy wewnętrzne backendu

```python
# ephemeris
def body_positions(lat_deg, lon_deg, times_utc) -> dict
# {"sun": {"az_deg": [...], "el_deg": [...]}, "earth": {"az_deg": [...], "el_deg": [...]}}
SOURCE  # "placeholder" albo "spice" - z czego faktycznie policzono

# terrain
def horizon_profile(lat_deg, lon_deg) -> dict
# {"azimuth_step_deg": 1.0, "elevation_deg": [360 wartości dla azymutów 0…359], "source": "flat" | "lola"}

# metrics
def timeline(lat_deg, lon_deg, start_utc, end_utc, step_minutes, horizon=None) -> dict   # jak /api/timeline
def summary(lat_deg, lon_deg, start_utc, end_utc, step_minutes=10, horizon=None) -> dict # jak /api/summary
```

Przeliczenie wektora w układzie ME na azymut i wysokość jest w `backend/app/ephemeris/geometry.py` i nie zależy od źródła efemeryd.

### API HTTP

Źródłem prawdy o kształcie odpowiedzi są `backend/app/api/schemas.py` i jego odbicie `web/src/api/types.ts` – oba pliki zmienia się razem. Pełne przykładowe odpowiedzi leżą w `contracts/fixtures/` (generuje je `python -m scripts.export_fixtures`, test pilnuje ich aktualności). Frontend może pracować na nich bez backendu: `npm run dev:fixtures`.

Każda odpowiedź z obliczeniami niesie pole `meta` mówiące, z czego ją policzono: `ephemeris` = `placeholder` | `spice`, `horizon` = `flat` | `lola` | `synthetic` (to ostatnie tylko w fixtures). Aplikacja pokazuje ostrzeżenie, dopóki nie jest to `spice` + `lola`.

Limity: najwyżej 20 000 próbek na zapytanie (trzy dni księżycowe przy kroku 10 minut to ok. 12 800), `step_minutes` od 1 do 1440; przekroczenie daje błąd 422.

**`GET /api/sites`** – katalog miejsc.

```json
[{"id": "apollo-11", "name": "Apollo 11", "lat_deg": 0.674, "lon_deg": 23.473,
  "category": "apollo", "landing_utc": "1969-07-20T20:17:40Z"}]
```

`category`: `apollo` | `clps` | `commercial` | `international` | `candidate`. `landing_utc` może być `null`.

**`GET /api/horizon?lat_deg&lon_deg`** – profil horyzontu.

```json
{"azimuth_step_deg": 1, "elevation_deg": [0.4, 0.4, 0.5], "source": "lola"}
```

**`GET /api/timeline?lat_deg&lon_deg&start_utc&end_utc&step_minutes`** – przebieg w czasie.

```json
{"times_utc": ["2027-01-01T00:00:00Z"],
 "sun":   {"az_deg": [123.4], "el_deg": [1.2],  "visible": [true]},
 "earth": {"az_deg": [2.1],   "el_deg": [-0.8], "visible": [false]},
 "meta":  {"ephemeris": "spice", "horizon": "lola"}}
```

**`GET /api/summary?lat_deg&lon_deg&start_utc&end_utc&step_minutes`** – metryki scenariusza (`step_minutes` domyślnie 10).

```json
{"sun":   {"visible_fraction": 0.62, "max_el_deg": 1.4,
           "windows": [{"start_utc": "…", "end_utc": "…"}],
           "visible_at_start": true, "hours_until_change": 51.5},
 "earth": {"visible_fraction": 0.48, "max_el_deg": 5.9,
           "windows": [], "visible_at_start": false, "hours_until_change": 12.0},
 "uncertainty": {"typical_sunlight_hours": 12.0, "worst_case_sunlight_hours": 11.7,
                 "best_case_sunlight_hours": 12.3, "horizon_margin_deg": 0.2,
                 "solar_radius_deg": 0.266},
 "eclipses": [{"start_utc": "…", "end_utc": "…",
               "max_obscuration_fraction": 0.75, "duration_hours": 2.5}],
 "meta":  {"ephemeris": "spice", "horizon": "lola"}}
```

`hours_until_change`: czas od `start_utc` do najbliższego zachodu (gdy widoczne) albo wschodu (gdy niewidoczne); `null`, jeśli w zadanym zakresie nic się nie zmienia.
`uncertainty` i `eclipses` są opcjonalnymi rozszerzeniami: czas oświetlenia uwzględnia widoczny ułamek tarczy Słońca i pasmo dla marginesu horyzontu ±0,2°, a zaćmienia opisują nakładanie się tarcz Ziemi i Słońca widzianych z Księżyca. Dotychczasowe pola widoczności pozostają bez zmian.

**`GET /api/windows?lat_deg&lon_deg&search_start_utc&search_end_utc&…`** – wyszukiwarka okien lądowania (Faza 2).

Parametry (domyślne w nawiasach): `duration_hours` (708.7), `min_sun_el_at_landing_deg` (0), `min_sunlight_hours` (0), `max_darkness_hours` (708.7), `require_earth_at_landing` (false), `min_earth_fraction` (0), opcjonalnie `reference_start_utc` i `slip_days` (0) dla trybu „start się opóźnił".

```json
{"grid":[{"start_utc":"2027-01-01T00:00:00Z","end_utc":"2027-01-30T12:42:00Z",
  "sunlight_hours":168.5,"sun_visible_fraction":0.238,"max_darkness_hours":240.0,
  "max_sun_el_deg":1.42,"sun_el_at_start_deg":-0.35,"earth_hours":295.2,
  "earth_visible_fraction":0.417,"earth_visible_at_start":false,"passes_requirements":true,
  "score":0.82,"cycles":{"lunar_day_index":0,"seasonal_phase_deg":12.4,"draconic_year_phase_deg":41.0},
  "uncertainty":{"typical_sunlight_hours":168.5,"worst_case_sunlight_hours":162.0,
    "best_case_sunlight_hours":175.0,"horizon_margin_deg":0.2,"solar_radius_deg":0.266},
  "eclipses":[]}],
 "matches":[],
 "slip_analysis":null,
 "cycles_summary":{"synodic_month_days":29.53,"draconic_year_days":346.62,
   "nodal_precession_years":18.6,"libration_month_days":27.21},
 "meta":{"ephemeris":"placeholder","horizon":"synthetic"}}
```

`matches` to podzbiór `grid` spełniający wymagania, posortowany malejąco po `score`. Pola `uncertainty` i `eclipses` są opcjonalne dla każdego okna. Do czasu zadań 012/013 endpoint może zwracać zaślepkę o tym kształcie.

**`GET /api/optimal-site?start_utc&end_utc&cursor_utc&step_minutes&w_sun&w_earth&w_overlap`** – optymalny punkt lądowania i ranking polarnej siatki referencyjnej (Faza 3, zadania 017–018).

Parametry (domyślne): `step_minutes` (60), `cursor_utc` (`start_utc`), wagi `w_sun` (0.45), `w_earth` (0.25), `w_overlap` (0.30). Zwraca wyznaczone miejsce optymalne (`optimal`), ranking miejsc katalogowych i siatki bieguna południowego (`ranking`), podpunkty ciał (`cursor_bodies`), wagi oraz metadane.

```json
{"optimal":{"id":"shackleton_connecting_ridge","name":"Connecting Ridge (Shackleton-de Gerlache)",
  "lat_deg":-89.445,"lon_deg":-137.28,"elevation_m":null,"is_catalog_site":true,"score":82.5,
  "sun_visible_fraction":0.85,"earth_visible_fraction":0.90,"overlap_fraction":0.80,
  "sunlight_hours":602.4,"earth_hours":637.8,"overlap_hours":567.0,"max_darkness_hours":106.3,
  "sun_visible_at_cursor":true,"earth_visible_at_cursor":true},
 "ranking":[/* lista kandydatów posortowana malejąco po score */],
 "cursor_bodies":{"cursor_utc":"2027-01-01T00:00:00Z","subsolar_lat_deg":-1.4,"subsolar_lon_deg":45.2,
   "subearth_lat_deg":-6.2,"subearth_lon_deg":-2.1},
 "weights":{"w_sun":0.45,"w_earth":0.25,"w_overlap":0.30},
 "meta":{"ephemeris":"placeholder","horizon":"lola"}}
```

### Kontrakt między powłoką a widokami (frontend)


Zdefiniowany w `web/src/app/scenario.ts`. Każdy widok to komponent w `web/src/views/<nazwa>/index.tsx`, zarejestrowany w `web/src/app/views.ts`, który dostaje `ViewProps`:

- `scenarios`, `active` – lista porównywanych scenariuszy (miejsce + okno czasu) i ten aktualnie wybrany;
- `cursor_utc`, `setCursorUtc` – wspólny kursor czasu: przesunięcie go na osi czasu przesuwa Słońce w widoku nieba;
- `selectScenario(id)`, `pickLocation(lat_deg, lon_deg)`, `applyWindow(start_utc, duration_hours?)` – akcje, którymi widok zmienia stan powłoki (`applyWindow` ustawia start aktywnego scenariusza z wyszukiwarki okien).

Widoki pobierają dane wyłącznie przez `api` z `web/src/api/client.ts` i hook `useAsync`. Nie importują niczego z innych widoków ani z `App.tsx`.

## Dane

- Duże pliki (jądra SPICE, modele wysokości) **nie trafiają do repo**. Pobiera je skrypt do `data/raw/`, który jest w `.gitignore`.
- Profile horyzontu dla miejsc z katalogu liczymy z wyprzedzeniem i zapisujemy w `data/horizons/` (małe pliki JSON, w repo). Dla współrzędnych własnych liczymy na żądanie i cache'ujemy.
- Jeśli model wysokości nie obejmuje danego miejsca albo nie jest pobrany, `terrain` zwraca płaski horyzont i API oznacza to w odpowiedzi – aplikacja ma działać także wtedy.

## Decyzje

- **2026-11-14** – Obliczenia po stronie serwera w Pythonie (SPICE), a nie w przeglądarce. Powód: dokładność rzędu ułamka stopnia jest na biegunie warunkiem sensownego wyniku, a profil horyzontu wymaga pracy na dużych rastrach.
- **2026-11-14** – Interfejs aplikacji po angielsku (zgłoszenie do międzynarodowego konkursu), dokumentacja zespołu po polsku.
- **2026-11-14** – Frontend rozwijany na plikach z `contracts/fixtures/`, żeby nie blokował się na backendzie.
