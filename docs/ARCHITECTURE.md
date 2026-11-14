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

Limity: najwyżej 10 000 próbek na zapytanie, `step_minutes` od 1 do 1440; przekroczenie daje błąd 422.

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
 "meta":  {"ephemeris": "spice", "horizon": "lola"}}
```

`hours_until_change`: czas od `start_utc` do najbliższego zachodu (gdy widoczne) albo wschodu (gdy niewidoczne); `null`, jeśli w zadanym zakresie nic się nie zmienia.

### Kontrakt między powłoką a widokami (frontend)

Zdefiniowany w `web/src/app/scenario.ts`. Każdy widok to komponent w `web/src/views/<nazwa>/index.tsx`, zarejestrowany w `web/src/app/views.ts`, który dostaje `ViewProps`:

- `scenarios`, `active` – lista porównywanych scenariuszy (miejsce + okno czasu) i ten aktualnie wybrany;
- `cursor_utc`, `setCursorUtc` – wspólny kursor czasu: przesunięcie go na osi czasu przesuwa Słońce w widoku nieba;
- `selectScenario(id)`, `pickLocation(lat_deg, lon_deg)` – akcje, którymi widok zmienia stan powłoki.

Widoki pobierają dane wyłącznie przez `api` z `web/src/api/client.ts` i hook `useAsync`. Nie importują niczego z innych widoków ani z `App.tsx`.

## Dane

- Duże pliki (jądra SPICE, modele wysokości) **nie trafiają do repo**. Pobiera je skrypt do `data/raw/`, który jest w `.gitignore`.
- Profile horyzontu dla miejsc z katalogu liczymy z wyprzedzeniem i zapisujemy w `data/horizons/` (małe pliki JSON, w repo). Dla współrzędnych własnych liczymy na żądanie i cache'ujemy.
- Jeśli model wysokości nie obejmuje danego miejsca albo nie jest pobrany, `terrain` zwraca płaski horyzont i API oznacza to w odpowiedzi – aplikacja ma działać także wtedy.

## Decyzje

- **2026-11-14** – Obliczenia po stronie serwera w Pythonie (SPICE), a nie w przeglądarce. Powód: dokładność rzędu ułamka stopnia jest na biegunie warunkiem sensownego wyniku, a profil horyzontu wymaga pracy na dużych rastrach.
- **2026-11-14** – Interfejs aplikacji po angielsku (zgłoszenie do międzynarodowego konkursu), dokumentacja zespołu po polsku.
- **2026-11-14** – Frontend rozwijany na plikach z `contracts/fixtures/`, żeby nie blokował się na backendzie.
