# Odświeżenie UI „konsola misji" – plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nadać aplikacji spójny, rzeczowy wygląd „konsoli misji", przebudować układ Expert, poprawić czytelność wykresów oraz ulepszyć mapę Księżyca i Optimization Overlay – bez zmian w API.

**Architecture:** Wspólne tokeny i fonty w `web/src/index.css`, wspólne formatowanie w nowym `web/src/app/format.ts`. Powłoka (`App.tsx`) przechodzi na siatkę „panel boczny + scena". Widoki zachowują `ViewProps`; każdy dostaje poprawki we własnym katalogu. Czysta matematyka mapy (wielkie koła, skala koloru, nazwy punktów siatki, wagi) trafia do plików bez three.js i jest testowana w Node; `MoonGlobe.tsx` tylko rysuje.

**Tech Stack:** React 19, TypeScript 7, Vite 8, three.js 0.187, vitest 5, oxlint. Nowe zależności: `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`.

**Spec:** `docs/superpowers/specs/2026-11-14-odswiezenie-ui-design.md`

## Global Constraints

- Gałąź `feat/021-odswiezenie-ui`; nie pushować do `main`, nie scalać. PR 021 dopiero po scaleniu 020.
- Bez zmian w: backendzie, `contracts/`, `web/src/api/types.ts`, `web/src/api/client.ts`, `ViewProps` w `web/src/app/scenario.ts`, logice `web/src/app/guide/*.ts` (poza CSS i znacznikami).
- Interfejs po angielsku. Komentarze w kodzie po polsku (jak w repo).
- Kolory: tło `#0c0c0d`, powierzchnia `#141415`, linia `#27282b`, tekst `#e9e6df`, pomocniczy `#918e86`, Słońce `#e9b44c`, Ziemia `#5aa2e0`, ok `#7dbb78`, ostrzeżenie `#d9923b`, błąd `#e0685f`.
- Bursztyn = tylko Słońce, błękit = tylko Ziemia. Zaznaczenie = jasny tekst + kreska 2 px.
- Promień 2 px, linie 1 px, zero cieni, gradientów, poświat i emoji.
- Liczby, współrzędne, czas i osie: IBM Plex Mono. Reszta: IBM Plex Sans.
- Czas w napisach: `19 May 2027 19:13 UTC`. Współrzędne: `89.45°S 137.30°W`, długość zawsze −180…180.
- Po każdym zadaniu w `web/`: `npm run lint`, `npm run build`, `npm test` – wszystkie zielone – i commit z prefiksem `[021]`.
- Serwery do przeglądu: backend `uvicorn app.main:app` (port 8000), frontend `npm run dev` w `repo-ui/web` (port 5174, gdy 5173 zajęty).

## Review Focus

1. **Długość geograficzna poza −180…180** (API zwraca siatkę jako `315.0`): wszędzie ma się wyświetlić `45.00°W` – test w Zadaniu 1.
2. **Ranking pusty albo z `score` = NaN**: nakładka i panel nie mogą się wysypać ani rysować znaczników w (0,0) – testy w Zadaniach 7 i 8.
3. **Wszystkie suwaki wag na 0**: zapytanie idzie z wagami 1/3, 1/3, 1/3, interfejs pokazuje 34/33/33 (suma 100) – test w Zadaniu 8.
4. **Okno z 100% lub 0% widoczności** (brak wschodów/zachodów): wykresy Sky/Timeline pokazują pełny/pusty pas i napis „no change", nie pusty SVG – test w Zadaniu 4.
5. **Wąski ekran (390 px) i sama klawiatura**: panel boczny składa się nad scenę, wszystkie kontrolki osiągalne Tabem z widocznym fokusem – sprawdzenie ręczne w Zadaniu 9.

---

## Mapa plików

| Plik | Rola | Zadanie |
| --- | --- | --- |
| `docs/tasks/021-odswiezenie-ui.md` | plik zadania (już dodany) | – |
| `web/package.json` | dwie zależności fontów | 1 |
| `web/src/main.tsx` | import fontów | 1 |
| `web/src/index.css` | tokeny, typografia, kontrolki, siatka powłoki | 1, 2 |
| `web/src/app/format.ts` + `.test.ts` | wspólne formaty | 1 |
| `web/src/App.tsx` | układ: nagłówek, panel boczny, scena | 2 |
| `web/src/app/SummaryStrip.tsx` | status Sun/Earth jako wiersze panelu | 2 |
| `web/src/app/guide/guide.css`, `GuidePanel.tsx`, `ResultCard.tsx`, `DayStrip.tsx` | styl trybu prowadzonego | 3 |
| `web/src/views/sky/*` | wykres panoramy + suwak czasu | 4 |
| `web/src/views/timeline/*` | odczyt, osie, pasy | 4 |
| `web/src/views/compare/*` | tabela metryk | 5 |
| `web/src/views/windows/*` | skala, komórki, panele | 5 |
| `web/src/app/scale.ts` + `.test.ts` | wspólna skala koloru wyniku | 5 |
| `web/src/views/map/circles.ts` + `.test.ts` | wielkie koła, siatka, pierścienie | 6 |
| `web/src/views/map/MoonGlobe.tsx` | scena, kamera, siatka, podpisy, najechanie | 6, 7 |
| `web/src/views/map/index.tsx`, `map.css` | układ widoku mapy, pasek narzędzi, legenda | 6, 8 |
| `web/src/views/map/heatmap.ts` + `.test.ts` | strefy z wygładzoną krawędzią, bez mgiełki | 7 |
| `web/src/views/map/candidates.ts` + `.test.ts` | nazwy punktów, pozycje z remisami, wagi | 7, 8 |
| `web/src/views/map/OptimalZonePanel.tsx` | panel nakładki | 8 |

---

### Task 1: Tokeny, fonty i wspólne formaty

**Files:**
- Modify: `web/package.json`, `web/src/main.tsx`, `web/src/index.css`
- Create: `web/src/app/format.ts`
- Test: `web/src/app/format.test.ts`

**Interfaces:**
- Produces (`web/src/app/format.ts`):
  - `formatUtc(iso: string): string` → `'19 May 2027 19:13 UTC'`; niepoprawna data → `'—'`
  - `formatUtcDate(iso: string): string` → `'19 May 2027'`
  - `wrapLon(lon_deg: number): number` → zakres (−180, 180]
  - `formatLat(lat_deg: number, digits = 2): string` → `'89.45°S'`
  - `formatLon(lon_deg: number, digits = 2): string` → `'137.30°W'` (zawija przez `wrapLon`)
  - `formatCoords(lat_deg: number, lon_deg: number, digits = 2): string` → `'89.45°S 137.30°W'`
  - `formatHours(value: number, digits = 1): string` → `'336.0 h'`; NaN → `'—'`
  - `formatPercent(fraction: number): string` → `'87%'`; NaN → `'—'`
  - `formatDeg(value: number, digits = 2): string` → `'1.57°'`
  - `formatDuration(hours: number): string` → `'3 days'`, `'14 days'`, `'1 lunar day'` (708.7), `'3 lunar days'` (2126.1), inaczej `'336 h'`
- Produces (CSS, `:root`): `--bg --surface --line --text --muted --sun --earth --ok --warning --error --font-sans --font-mono --radius`; aliasy `--panel: var(--surface)`, `--border: var(--line)`, `--accent: var(--text)`.
- Produces (klasy globalne): `.num` (mono, cyfry tabelaryczne), `.label` (11 px, wersaliki, `letter-spacing: 0.08em`, `--muted`), `.btn-primary` (wypełnienie `--text`, tekst `--bg`).

- [ ] **Step 1: Zainstaluj fonty**

Run (w `web/`): `npm install @fontsource/ibm-plex-sans @fontsource/ibm-plex-mono`
W `main.tsx` zaimportuj wagi 400, 500, 600 Sans oraz 400, 500 Mono (pliki `latin-400.css` itd.), przed `./index.css`.

- [ ] **Step 2: Napisz testy `format.test.ts` (mają nie przejść)**

```ts
import { describe, expect, it } from 'vitest'
import { formatCoords, formatDuration, formatHours, formatLon, formatPercent, formatUtc, wrapLon } from './format'

describe('format', () => {
  it('czas UTC bez sekund i litery T', () => {
    expect(formatUtc('2027-05-19T19:13:16Z')).toBe('19 May 2027 19:13 UTC')
    expect(formatUtc('nie-data')).toBe('—')
  })
  it('długość zawsze w zakresie −180…180 z półkulą', () => {
    expect(wrapLon(315)).toBe(-45)
    expect(wrapLon(180)).toBe(180)
    expect(wrapLon(-180)).toBe(180)
    expect(formatLon(315)).toBe('45.00°W')
    expect(formatLon(0)).toBe('0.00°E')
    expect(formatCoords(-89.45, -137.3)).toBe('89.45°S 137.30°W')
    expect(formatCoords(-88.5, 315, 1)).toBe('88.5°S 45.0°W')
  })
  it('wartości niepoprawne dają pauzę', () => {
    expect(formatHours(Number.NaN)).toBe('—')
    expect(formatPercent(Number.NaN)).toBe('—')
    expect(formatHours(336)).toBe('336.0 h')
    expect(formatPercent(0.874)).toBe('87%')
  })
  it('długość okna ludzkim językiem', () => {
    expect(formatDuration(72)).toBe('3 days')
    expect(formatDuration(336)).toBe('14 days')
    expect(formatDuration(708.7)).toBe('1 lunar day')
    expect(formatDuration(2126.1)).toBe('3 lunar days')
    expect(formatDuration(100)).toBe('100 h')
  })
})
```

Run: `npm test -- format` → FAIL (brak modułu `./format`; uwaga: `guide/format.test.ts` ma przechodzić dalej).

- [ ] **Step 3: Zaimplementuj `web/src/app/format.ts`** według sygnatur wyżej. Miesiące: `toLocaleDateString('en-GB', { timeZone: 'UTC', … })`. `formatDuration`: pełne doby → `N days`, wielokrotność `LUNAR_DAY_HOURS` (tolerancja 0.05 h) → `N lunar day(s)`.

- [ ] **Step 4:** Run: `npm test -- format` → PASS.

- [ ] **Step 5: Przepisz `index.css`**: sekcja `:root` z tokenami i aliasami z bloku Interfaces; `body` font `--font-sans` 14 px / 1.45; `select, input, button` – promień `--radius`, obrys `--line`, tło `--bg`, wysokość 32 px; `button.selected, [aria-pressed='true']` – `color: var(--text)`, `box-shadow: inset 0 -2px 0 var(--text)`, bez zmiany koloru obrysu; `:focus-visible` – `outline: 2px solid var(--text); outline-offset: 2px`; usuń `.mode-switch` w formie pigułek (zastąpi go Zadanie 2). Dodaj `.num`, `.label`, `.btn-primary`.

- [ ] **Step 6:** Run: `npm run lint && npm run build && npm test` → wszystko zielone. Otwórz aplikację: font to IBM Plex, tło neutralnie czarne, nic się nie rozjechało bardziej niż przed zmianą.

- [ ] **Step 7: Commit** `[021] Tokeny, fonty IBM Plex i wspólne formaty`

---

### Task 2: Układ Expert – nagłówek, panel boczny, scena

**Files:**
- Modify: `web/src/App.tsx`, `web/src/app/SummaryStrip.tsx`, `web/src/index.css`

**Interfaces:**
- Consumes: `formatUtc`, `formatCoords`, `formatDuration`, `formatPercent`, `formatHours` z Zadania 1.
- Produces (klasy układu, używane przez widoki w Zadaniach 4–8): `.app-header`, `.app-body` (siatka `300px 1fr`), `.rail`, `.stage`, `.stage-tabs`, `.stage-view`. `.stage-view` ma `min-height: 0; overflow: auto` – widok mapy polega na tym, że może zająć 100% jego wysokości.
- `SummaryStrip` zachowuje eksport domyślny i props `{ scenario: Scenario }`; dochodzi eksport `DataBadge({ scenario }: { scenario: Scenario })` (plakietka do nagłówka).

- [ ] **Step 1: Nagłówek.** `<header className="app-header">`: tytuł `LUNAR LANDING SITE NAVIGATOR` (klasa `.label`, 12 px), przełącznik trybu jako dwie zakładki tekstowe (te same `aria-pressed`, etykiety `Plan a landing` / `Expert tools`), po prawej `DataBadge`. Slogan (`.tagline`) zostaje tylko w trybie prowadzonym.

- [ ] **Step 2: `DataBadge`.** Korzysta z tego samego `useAsync(api.summary…)` co pasek (ten sam klucz → jedno zapytanie w pamięci hooka nie jest gwarantowane; dopuszczalne dwa zapytania). `meta.ephemeris === 'placeholder'` → `<span className="badge badge-warning" role="status" title="Sun and Earth positions come from an approximate model, not NASA SPICE kernels.">approx. ephemeris</span>`. `meta.horizon` równe `'flat'` lub `'mixed'` → druga plakietka `flat horizon` z `title="Terrain is not modelled at this site; a flat horizon is assumed."`. Inaczej nic.

- [ ] **Step 3: Panel boczny `<aside className="rail" aria-label="Scenario setup">`** w kolejności:
  1. `SCENARIOS` + dwa przyciski ikonowe z tekstem dostępnym: `+` (`aria-label="Add scenario"`), `⧉` (`aria-label="Duplicate scenario"`); pod nimi lista wierszy (przycisk z nazwą, pod nazwą `.num` z `formatUtcDate(start)`), przy aktywnym kreska 2 px z lewej; `×` (`aria-label="Remove scenario"`) przy każdym wierszu, gdy scenariuszy > 1 – usuwa ten wiersz (dziś: tylko aktywny; zmień `removeActive` na `removeScenario(id: string)`).
  2. `SITE` – istniejący `select`.
  3. `COORDINATES` – `Latitude`, `Longitude` obok siebie, przycisk `Apply`; pod spodem `.num` z `formatCoords(active.lat_deg, active.lon_deg)`.
  4. `START (UTC)` – istniejący `datetime-local`.
  5. `WINDOW` – istniejący `select`; opcja niestandardowa pokazuje `formatDuration(hours)` zamiast `336 h (custom)`.
  6. `<SummaryStrip scenario={active} />`.
  Limit scenariuszy: napis `Limit 4 scenarios` jako `.hint` pod listą.

- [ ] **Step 4: `SummaryStrip` jako wiersze.** Dwa bloki `SUN` / `EARTH` (etykieta w kolorze danych): linia 1 `up at start` / `down at start` + `· {formatPercent(visible_fraction)} of window`; linia 2 `no rise or set` albo `sets in {formatHours(h)}` / `rises in …`; linia 3 `.muted .num` `max {formatDeg(max_el_deg)}`. Usuń `summary-sticky`, `summary-grid`, `body-card` z CSS. Zostaw `aria-live="polite"`. Ostrzeżenia o danych znikają stąd (są w `DataBadge`).

- [ ] **Step 5: Scena.** `<div className="stage">`: `<nav className="stage-tabs" aria-label="Views">` (zakładki tekstowe z kreską 2 px) + `<main className="stage-view">` z `Suspense`. Tryb prowadzony renderuje się w `.stage` bez panelu bocznego (pełna szerokość, treść wyśrodkowana do 760 px).

- [ ] **Step 6: CSS układu.** `.app` – `max-width: 1600px`, `height: 100dvh`, kolumna flex; `.app-body` – siatka `300px minmax(0, 1fr)`, `min-height: 0`; `.rail` – `overflow-y: auto`, `border-right: 1px solid var(--line)`, sekcje oddzielone linią, odstęp 16 px; `@media (max-width: 900px)`: `.app` wysokość auto, `.app-body` jedna kolumna, `.rail` bez prawej linii i z dolną.

- [ ] **Step 7: Weryfikacja.** `npm run lint && npm run build && npm test`. W przeglądarce przy 1440 px i 800 px: przewijanie widoku nie rusza panelu bocznego; nic nie zasłania zakładek; dodaj/duplikuj/usuń scenariusz działa; zmiana miejsca odświeża status; przejście z `See it in the sky →` z trybu prowadzonego ustawia scenariusz jak dotąd.

- [ ] **Step 8: Commit** `[021] Układ Expert: nagłówek, panel boczny scenariusza, scena`

---

### Task 3: Tryb prowadzony w nowym stylu

**Files:**
- Modify: `web/src/app/guide/guide.css`, `web/src/app/guide/GuidePanel.tsx`, `web/src/app/guide/ResultCard.tsx`, `web/src/app/guide/DayStrip.tsx`

**Interfaces:**
- Consumes: tokeny i klasy z Zadania 1. Nie zmienia żadnego pliku `.ts` w `guide/` ani tekstów.

- [ ] **Step 1: Kroki formularza.** Usuń ramki `fieldset`; każdy krok = numer w `.num` (`01`, `02`, `03`) + pytanie, oddzielony górną linią 1 px. Opcje (`Quick visit` itd.) jako wiersze wyboru w jednej ramce z liniami między nimi; wybrana = kreska 2 px z lewej i jasny tekst, bez bursztynowego obrysu. Minimalna wysokość celu 44 px zostaje.

- [ ] **Step 2: Karta wyniku.** Jedna ramka na cały wynik, bez ramek wewnętrznych. `BEST CHOICE` jako `.label`. Nazwa miejsca 22 px / 600. Data lądowania: `.num`. Trzy oceny jako wiersze tabeli: znak (kwadrat 8 px w `--sun`, koło 8 px w `--earth`, kwadrat 8 px w `--muted` dla ciemności – zamiast emoji), nazwa, opis, ocena tekstem z kropką stanu (`--ok` / `--warning` / `--error`). Przycisk `See it in the sky →` = `.btn-primary`.

- [ ] **Step 3: `DayStrip`.** Pod paskiem oś z datą pierwszego, środkowego i ostatniego dnia (`.num`, 11 px); legenda `Sun up` / `Earth in view` po lewej nad paskiem. Kolory `--sun` / `--earth`, przerwy 1 px, bez zaokrągleń.

- [ ] **Step 4: Sekcje pod wynikiem** (`If your launch slips…`, `Other good options`): nagłówki `.label`, wiersze oddzielone liniami, daty `.num`, przycisk `See it` jako obrys.

- [ ] **Step 5: Weryfikacja.** `npm run lint && npm run build && npm test` (testy `guide/*` bez zmian mają przejść). W przeglądarce: wyszukanie z domyślnymi odpowiedziami daje wynik; brak emoji w DOM (`document.body.innerText` nie zawiera ☀ 🌍); nawigacja Tabem przez całe trzy kroki.

- [ ] **Step 6: Commit** `[021] Tryb prowadzony w stylu konsoli misji`

---

### Task 4: Wykresy Sky i Timeline

**Files:**
- Modify: `web/src/views/sky/index.tsx`, `web/src/views/sky/sky.css`, `web/src/views/sky/paths.ts`, `web/src/views/timeline/index.tsx`, `web/src/views/timeline/timeline.css`, `web/src/views/timeline/windows.ts`
- Test: `web/src/views/sky/paths.test.ts`, `web/src/views/timeline/windows.test.ts`

**Interfaces:**
- Consumes: `formatUtc`, `formatDeg`, `formatHours`, `formatPercent` (Zadanie 1); `ViewProps.setCursorUtc`.
- Produces (`sky/paths.ts`): `splitTrailByVisibility(series: { az_deg: number[]; el_deg: number[]; visible: boolean[] }): { visible: boolean; az_deg: number[]; el_deg: number[] }[]` – tnie ślad na odcinki o stałej widoczności (z zachowaniem cięcia przy skoku azymutu > 180°); sąsiednie odcinki dzielą punkt graniczny.
- Produces (`timeline/windows.ts`): `niceTicks(min: number, max: number, target = 4): number[]` – okrągłe podziałki (krok 1, 2 lub 5 × 10ⁿ), zawsze z 0, gdy leży w zakresie; `dayTicks(startMs: number, endMs: number, max = 7): number[]` – znaczniki o północy UTC, rozrzedzane do `max`.

- [ ] **Step 1: Testy (mają nie przejść).**

```ts
// sky/paths.test.ts
it('tnie ślad na widoczny i zasłonięty z wspólnym punktem granicznym', () => {
  const parts = splitTrailByVisibility({
    az_deg: [10, 20, 30, 40], el_deg: [1, 2, 3, 4], visible: [true, true, false, false],
  })
  expect(parts.map((p) => p.visible)).toEqual([true, false])
  expect(parts[0].az_deg).toEqual([10, 20, 30])
  expect(parts[1].az_deg).toEqual([30, 40])
})
it('stała widoczność daje jeden odcinek, pusta seria – zero', () => {
  expect(splitTrailByVisibility({ az_deg: [1, 2], el_deg: [0, 0], visible: [true, true] })).toHaveLength(1)
  expect(splitTrailByVisibility({ az_deg: [], el_deg: [], visible: [] })).toEqual([])
})

// timeline/windows.test.ts
it('okrągłe podziałki z zerem', () => {
  expect(niceTicks(-1.2, 6.3)).toEqual([0, 2, 4, 6])
  expect(niceTicks(0, 0)).toEqual([0])
})
it('podziałki dni o północy UTC', () => {
  const ticks = dayTicks(Date.parse('2027-05-19T19:13:00Z'), Date.parse('2027-05-22T19:13:00Z'))
  expect(ticks.map((t) => new Date(t).toISOString())).toEqual([
    '2027-05-20T00:00:00.000Z', '2027-05-21T00:00:00.000Z', '2027-05-22T00:00:00.000Z',
  ])
})
```

Run: `npm test -- paths windows` → FAIL.

- [ ] **Step 2:** Zaimplementuj trzy funkcje. Run → PASS.

- [ ] **Step 3: Sky – wykres.**
  - Oś azymutu: linie i opisy co 45° w postaci `N 0°`, `NE 45°`, … `N 360°`; opisy osi 12 px mono.
  - Ślady z `splitTrailByVisibility`: widoczny – linia ciągła 1.5 px; zasłonięty – przerywana `4 4`, 60% krycia. Słońce `--sun`, Ziemia `--earth`.
  - Znaczniki początku (puste kółko r 3) i końca okna (kreska) na każdym śladzie.
  - Podpisy `Sun` i `Earth` tekstem obok znacznika pozycji (z prawej; z lewej, gdy x > 80% szerokości).
  - Sylwetka terenu: wypełnienie `#1d1e21`, górna krawędź linią `--muted` 1 px.
  - Usuń akapit `Azimuth across, elevation up…`; tytuł osi Y `elevation` i osi X `azimuth` jako `.label` przy osiach.
- [ ] **Step 4: Sky – suwak czasu.** Pod wykresem `<input type="range">` (`aria-label="Time cursor"`, min 0, max = liczba próbek − 1, wartość = `nearestTimeIndex`), `onChange` → `setCursorUtc(times_utc[i])`; obok `.num` z `formatUtc`.
- [ ] **Step 5: Sky – odczyt.** Tabela 2 wiersze (Sun, Earth) × kolumny `azimuth`, `elevation`, `terrain below`, `clearance` (= el − teren, ze znakiem), `state` (`visible` / `occulted`); liczby `.num`, wyrównane do prawej. Legenda zostaje jedną linią pod wykresem bez `Hollow marker…` (zastąpione przerywaną linią: `dashed = behind terrain`).
- [ ] **Step 6: Timeline.**
  - Usuń pływający `.timeline-badge`; w `timeline-toolbar` po prawej stały odczyt w dwóch liniach: `{formatUtc(cursor)}` oraz `Sun sets in 12.0 h · Earth no change` (z `describeChange`, kolorowe znaczniki 8 px).
  - Pasy: wysokość 10 px, bez zaokrągleń; na prawym końcu każdego wiersza `.num` z procentem (`shares`); tor pasa w `--line`.
  - Oś wysokości z `niceTicks(scale.min, scale.max)` z liniami siatki; prostokąt od 0° w dół wypełniony `rgba(255,255,255,0.03)` z podpisem `below horizon`.
  - Oś czasu z `dayTicks`, opis `19 May`; dla okna ≤ 48 h zostaje dotychczasowe 6 równych podziałek z godziną.
  - Linia Ziemi przerywana `6 3`, Słońca ciągła (rozróżnialne bez koloru). Podpisy `Sun` / `Earth` na prawym końcu linii.
  - `timeline-share` → jedno zdanie `.muted` bez nawiasu o liczbie okien.
- [ ] **Step 7: Weryfikacja.** `npm run lint && npm run build && npm test`. W przeglądarce: scenariusz `ridge near Shackleton`, 14 dni (100% Słońca – pas pełny, napis `no change`); scenariusz `Apollo 11`, 1 dzień księżycowy (wschód i zachód – ślad przechodzi z ciągłego w przerywany na linii terenu); suwak w Sky przesuwa znaczniki; odtwarzanie w Timeline działa; strzałki na wykresie Timeline dalej przesuwają kursor.
- [ ] **Step 8: Commit** `[021] Wykresy Sky i Timeline: osie, podpisy, suwak czasu, stały odczyt`

---

### Task 5: Compare i Windows

**Files:**
- Create: `web/src/app/scale.ts`
- Test: `web/src/app/scale.test.ts`
- Modify: `web/src/views/compare/index.tsx`, `ScenarioCard.tsx`, `WindowLane.tsx`, `compare.css`; `web/src/views/windows/heatmap.ts`, `heatmap.test.ts`, `CalendarHeatmap.tsx`, `MatchesList.tsx`, `RequirementsPanel.tsx`, `SlipAnalyzer.tsx`, `CyclesLegend.tsx`, `index.tsx`, `windows.css`

**Interfaces:**
- Produces (`web/src/app/scale.ts`):
  - `scoreColor(t: number): string` – skala jednobarwna, `t` przycinane do 0…1, NaN → `SCORE_STOPS[0]`; zwraca `rgb(r, g, b)`.
  - `SCORE_STOPS: readonly string[]` = `['#1b2a2e', '#1f4a4f', '#2a7170', '#4c9a8b', '#8cc3a4', '#d6ecc6']` (ciemny → jasny, jaśniej = lepiej).
  - `scoreRampCss(): string` → `linear-gradient(to right, …SCORE_STOPS)` do legend.
- Zmiana (`windows/heatmap.ts`): `heatColor(t)` deleguje do `scoreColor(t)`; `colorForValue` bez zmian sygnatury.
- Consumes: formaty z Zadania 1; `pickBest` z `compare/pickBest.ts` (bez zmian).

- [ ] **Step 1: Test `scale.test.ts` (ma nie przejść).**

```ts
it('skala rośnie jasnością i przycina zakres', () => {
  expect(scoreColor(0)).toBe('rgb(27, 42, 46)')
  expect(scoreColor(1)).toBe('rgb(214, 236, 198)')
  expect(scoreColor(-3)).toBe(scoreColor(0))
  expect(scoreColor(7)).toBe(scoreColor(1))
  expect(scoreColor(Number.NaN)).toBe(scoreColor(0))
})
```

W `windows/heatmap.test.ts` zamień asercje konkretnych kolorów starej skali na: `heatColor(0) === scoreColor(0)`, `heatColor(1) === scoreColor(1)`, `colorForValue(0, 0, 10, true) === scoreColor(1)`.

- [ ] **Step 2:** Zaimplementuj `scale.ts` (interpolacja liniowa między stopniami), przepnij `heatColor`. Run: `npm test -- scale heatmap` → PASS.

- [ ] **Step 3: Windows – mapa cieplna.** Legenda: `.num` min po lewej, pasek `scoreRampCss()`, `.num` max po prawej (wartości z `scaleBounds`, formatowane `meta.format`), podpis `lighter = better`. Komórka: 40×28 px, promień 0, w środku miesiąc startu `Jan`…`Dec` (`.num` 10 px), kolor tekstu ciemny dla `t > 0.6`, jasny inaczej; `pass` = obrys 1 px `--text`, brak obrysu inaczej; `selected` = obrys 2 px `--text`. Wiersz roku: rok `.num` po lewej. Szczegóły komórki: tabela dwuwierszowa zamiast zdań z kropkami.
- [ ] **Step 4: Windows – reszta.** `RequirementsPanel`: cztery grupy w jednej siatce bez ramek `fieldset` (nagłówki `.label`, linie pionowe między kolumnami); presety misji jako zakładki. `MatchesList`: daty przez `formatUtc`, liczby `.num` do prawej, kolumna `SCORE` z paskiem 40 px w `scoreColor(score / 100)`. `SlipAnalyzer`: dwie kolumny `Original` / `Delayed` w jednej ramce, różnice w jednym wierszu ze znakiem i kolorem stanu; zdanie wyjaśnienia z datą przez `formatUtc` (podmień ISO w `explanation` wyrażeniem regularnym na sformatowaną datę). `CyclesLegend`: lista definicji w dwóch kolumnach, zwijana (`<details>`), domyślnie zwinięta. Nagłówek widoku: `Search 1 Jan 2027 → 1 Jan 2028 · {name}`; źródła danych bez cudzysłowów.
- [ ] **Step 5: Compare – tabela.** `index.tsx` renderuje jedną `<table className="compare-table">`: nagłówki kolumn = scenariusze (nazwa, pod nią `.num` `formatCoords` i `formatUtc(start)`; kliknięcie nagłówka wybiera scenariusz, aktywny z kreską 2 px), wiersze = `Sun time`, `Earth time`, `Sun max elevation`, `Earth max elevation`, `Sun at start`, `Earth at start`, `Longest darkness` (jeśli jest w `metrics.ts`); najlepsza wartość w wierszu (wg `pickBest`) pogrubiona z kropką `--ok`. Pod tabelą `WindowLane` każdego scenariusza na wspólnej osi godzin (0 … najdłuższe okno), pasy 8 px w `--sun` / `--earth`. `ScenarioCard.tsx` zostaje jako komponent komórek nagłówka albo zostaje usunięty, jeśli nic go nie używa. Jeden scenariusz: komunikat `Add a second scenario (+ in the left panel) to compare sites or dates.` nad tabelą.
- [ ] **Step 6: Weryfikacja.** `npm run lint && npm run build && npm test`. W przeglądarce: Windows – zmiana metryki przestawia legendę min/max; kliknięcie komórki ustawia start; `Use window` działa. Compare – 1, 2 i 4 scenariusze, przy 800 px tabela przewija się w poziomie wewnątrz sceny, nie cała strona.
- [ ] **Step 7: Commit** `[021] Compare jako tabela, Windows z jednobarwną skalą i uporządkowanymi panelami`

---

### Task 6: Mapa Księżyca – scena, kamera, siatka, podpisy

**Files:**
- Create: `web/src/views/map/circles.ts`
- Test: `web/src/views/map/circles.test.ts`
- Modify: `web/src/views/map/MoonGlobe.tsx`, `web/src/views/map/index.tsx`, `web/src/views/map/map.css`

**Interfaces:**
- Consumes: `latLonToVector3`, `vectorToLatLon`, `Vec3` z `geo.ts`; `formatCoords` z Zadania 1; `.stage-view` z Zadania 2.
- Produces (`circles.ts`, bez three.js):
  - `parallelPoints(lat_deg: number, segments = 180): { lat_deg: number; lon_deg: number }[]` – zamknięty równoleżnik (pierwszy punkt = ostatni).
  - `meridianPoints(lon_deg: number, segments = 90): { lat_deg: number; lon_deg: number }[]` – od −90 do 90.
  - `horizonCircle(center: { lat_deg: number; lon_deg: number }, segments = 180): { lat_deg: number; lon_deg: number }[]` – wielkie koło punktów odległych o 90° od `center` (terminator dla punktu podsłonecznego, granica widoczności Ziemi dla podziemskiego), zamknięte.
  - `GRATICULE = { parallels: [-85, -80, -60, -30, 0, 30, 60, 80, 85], meridians: [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180] }`
- Produces (`MoonGlobeProps`, nowe pola): `subsolar: { lat_deg: number; lon_deg: number } | null`, `subearth: { lat_deg: number; lon_deg: number } | null`, `viewRequest: { target: 'south' | 'north' | 'near' | { lat_deg: number; lon_deg: number }; seq: number } | null` (zastępuje `southPoleRequest`), `zoomRequest: { direction: 1 | -1; seq: number } | null`, `onHover?: (info: { lat_deg: number; lon_deg: number; label?: string } | null) => void`.

- [ ] **Step 1: Testy `circles.test.ts` (mają nie przejść).**

```ts
import { angularDistanceDeg } from './heatmap'
it('każdy punkt koła horyzontu leży 90° od środka', () => {
  const center = { lat_deg: -1.2, lon_deg: 13 }
  for (const p of horizonCircle(center, 72)) {
    expect(angularDistanceDeg(p.lat_deg, p.lon_deg, center.lat_deg, center.lon_deg)).toBeCloseTo(90, 6)
  }
})
it('koło horyzontu działa dla środka na biegunie i jest zamknięte', () => {
  const circle = horizonCircle({ lat_deg: 90, lon_deg: 0 }, 36)
  expect(circle).toHaveLength(37)
  expect(circle.every((p) => Math.abs(p.lat_deg) < 1e-6)).toBe(true)
  expect(circle[0]).toEqual(circle[36])
})
it('równoleżnik i południk mają stałą współrzędną', () => {
  expect(parallelPoints(-85, 8).every((p) => p.lat_deg === -85)).toBe(true)
  expect(meridianPoints(30, 4).map((p) => p.lat_deg)).toEqual([-90, -45, 0, 45, 90])
})
```

Run: `npm test -- circles` → FAIL.

- [ ] **Step 2:** Zaimplementuj `circles.ts`. `horizonCircle`: zbuduj bazę ortonormalną (c, u, v) z wektora środka (dla środka przy biegunie użyj osi X jako pomocniczej), punkty = `u·cos θ + v·sin θ`, zamiana na lat/lon. Run → PASS.

- [ ] **Step 3: Scena i rozmiar.** `.map-view` = siatka `minmax(0, 1fr) auto`, wysokość 100% `.stage-view`; `.map-globe` wysokość 100% (min 420 px; przy < 900 px szerokości `70vh`), bez gradientu tła (`background: #050506`), bez zaokrąglenia. `.map-view` ma `position: relative` – pasek narzędzi, legenda i odczyt są pozycjonowane absolutnie w rogach globusa.

- [ ] **Step 4: Kamera.** `OrbitControls`: `minDistance 1.15`, `maxDistance 6`, `enableDamping true` (pętla renderu działa, dopóki tłumienie trwa – `controls.update()` zwraca `true`). Funkcja `flyTo(lat, lon, distance)`: animacja 600 ms z interpolacją sferyczną pozycji kamery i wygładzeniem ease-in-out; cele: `south` → (−89.5, 0, 1.9), `north` → (89.5, 0, 1.9), `near` → (0, 0, 3.4), punkt → (lat, lon, 1.9). `prefers-reduced-motion` → skok bez animacji. `zoomRequest` mnoży odległość przez 0.8 / 1.25 w granicach min/max.

- [ ] **Step 5: Siatka i linie.** `THREE.LineSegments`/`Line` na promieniu 1.002: równoleżniki i południki z `GRATICULE` (kolor `#ffffff`, krycie 0.12; równik i południk 0° – 0.25). Terminator = `horizonCircle(subsolar)` w `--sun` (krycie 0.9, 1 px); granica widoczności Ziemi = `horizonCircle(subearth)` w `--earth`, przerywana (`LineDashedMaterial`). Aktualizowane w `setBodies(subsolar, subearth)` wołanym z efektu.

- [ ] **Step 6: Znaczniki i podpisy.** Znaczniki: katalog r 0.010 kolor `#b9b6ae`; scenariusz r 0.016 `#e9e6df`; aktywny r 0.022 `#ffffff` z pierścieniem (`RingGeometry` 0.030–0.036 zwróconym do kamery). Podpisy HTML: warstwa `<div className="map-labels">` nad kanwą (`pointer-events: none`), po każdym renderze rzut pozycji na ekran; podpis ukryty, gdy `position·cameraDir > 0` (tylna półkula). Zawsze widoczne: scenariusze, `Sun overhead`, `Earth overhead`, `S` i `N` przy biegunach; katalog – gdy odległość kamery < 2.4 albo znacznik jest pod kursorem. Etykiety siatki `80°S`, `85°S` na południku 0°, gdy kamera < 2.4. Kolizje: prosty zachłanny test prostokątów – podpis o niższym priorytecie (katalog) znika, gdy nachodzi na wyższy.

- [ ] **Step 7: Najechanie.** `pointermove` (bez wciśniętego przycisku) → raycast: znacznik → `onHover({ lat, lon, label: nazwa })`; powierzchnia → `onHover({ lat, lon })`; poza globusem → `onHover(null)`. Ograniczone do jednego wywołania na klatkę. `index.tsx` pokazuje odczyt w lewym dolnym rogu: `.num` `formatCoords(lat, lon)` + nazwa. Kursor `crosshair` nad globusem, `grabbing` przy przeciąganiu.

- [ ] **Step 8: Pasek narzędzi i legenda (`index.tsx`).** Lewy górny róg: grupa `Near side` · `South pole` · `North pole`, grupa `+` · `−` (`aria-label="Zoom in"` / `"Zoom out"`), przełącznik `Optimal zones` (`role="switch"`, `aria-checked`). Prawy dolny róg: legenda – znaczniki (catalogue site / scenario / active), linia ciągła `terminator`, linia przerywana `Earth visibility limit`. Usuń listę scenariuszy pod mapą (jest w panelu bocznym) i akapit z instrukcją; zamiast niego `title` na kanwie i jedna linia `.muted` w legendzie: `drag to rotate · scroll to zoom · click to place the scenario`. Punkt podsłoneczny: z istniejącego obliczenia `subsolar`; `subearth` – gdy nakładka włączona, z `optimal.data.cursor_bodies`, w przeciwnym razie `null` (bez dodatkowego zapytania).

- [ ] **Step 9: Weryfikacja.** `npm run lint && npm run build && npm test`. W przeglądarce: `South pole` kończy z biegunem w środku kadru i widocznymi pierścieniami 80°/85°; podpisy Shackleton / Nobile / de Gerlache czytelne i nienachodzące; obrót o 180° chowa podpisy z tylnej strony; kliknięcie przenosi scenariusz (panel boczny pokazuje nowe współrzędne); przeciągnięcie nie przenosi; kółko przybliża; przy `prefers-reduced-motion` brak animacji przelotu; konsola bez błędów WebGL po 10 przełączeniach zakładek Map ↔ Sky (zwalnianie zasobów).

- [ ] **Step 10: Commit** `[021] Mapa: przelot nad bieguny, siatka, terminator, podpisy miejsc, odczyt pod kursorem`

---

### Task 7: Optimization Overlay – strefy i warstwa kandydatów

**Files:**
- Create: `web/src/views/map/candidates.ts`
- Test: `web/src/views/map/candidates.test.ts`, `web/src/views/map/heatmap.test.ts`
- Modify: `web/src/views/map/heatmap.ts`, `web/src/views/map/MoonGlobe.tsx`

**Interfaces:**
- Consumes: `scoreColor` (Zadanie 5), `formatCoords` (Zadanie 1), `OptimalCandidate`, `CursorBodies` z `api/types.ts`.
- Produces (`candidates.ts`):
  - `candidateLabel(candidate: Pick<OptimalCandidate, 'name' | 'lat_deg' | 'lon_deg' | 'is_catalog_site'>): string` – katalog → `name` bez przedrostka `Artemis candidate: `; siatka → `Grid 88.5°S 45.0°W`.
  - `rankCandidates(ranking: OptimalCandidate[]): RankedCandidate[]`, gdzie `interface RankedCandidate { candidate: OptimalCandidate; rank: number; tied: boolean; label: string }` – odrzuca wpisy z niepoprawnym `score`, `lat_deg` lub `lon_deg`; sortuje malejąco po `score`; wyniki równe po zaokrągleniu do 0.1 dzielą `rank` („standard competition": 1, 1, 1, 4) i mają `tied: true`.
- Zmiana (`heatmap.ts`):
  - `ZONE_COLORS` – alfa: `sun_only` 56, `earth_only` 56, `sweet_spot` 48, `shadow` 120; kolory RGB z tokenów: Słońce `[233, 180, 76]`, Ziemia `[90, 162, 224]`, sweet spot `[125, 187, 120]`, cień `[0, 0, 0]`.
  - `buildOverlayPixels(width, height, cursorBodies)` – **bez** parametru `ranking`; usuń `addCandidateGlow`, `blendPixel`, `CANDIDATE_GLOW`, `MAX_CANDIDATE_GLOW`. Krawędź stref wygładzona: w pasie ±0.6° od granicy 90° alfa i kolor mieszane liniowo między strefami.
  - `ZONE_LABELS`: `sun_only` `Sun only`, `earth_only` `Earth only`, `sweet_spot` `Sun + Earth`, `shadow` `Neither`.
- Produces (`MoonGlobeProps`): `candidates: RankedCandidate[]`, `highlightId: string | null`, `selectedId: string | null`, `onCandidateHover?: (id: string | null) => void`, `onCandidateSelect?: (id: string) => void`. Stała `OVERLAY_WIDTH = 1024`, `OVERLAY_HEIGHT = 512`, `OVERLAY_OPACITY = 1` (krycie niesie alfa pikseli).

- [ ] **Step 1: Testy `candidates.test.ts` (mają nie przejść).**

```ts
const base = { is_catalog_site: false, score: 50 } as OptimalCandidate
it('nazywa punkt siatki współrzędnymi z półkulą', () => {
  expect(candidateLabel({ name: 'Polar Grid (-88.5°, 315.0°)', lat_deg: -88.5, lon_deg: 315, is_catalog_site: false }))
    .toBe('Grid 88.5°S 45.0°W')
  expect(candidateLabel({ name: 'Artemis candidate: ridge near Shackleton', lat_deg: -89.45, lon_deg: -137.3, is_catalog_site: true }))
    .toBe('ridge near Shackleton')
})
it('remisy dzielą pozycję, kolejne miejsce przeskakuje', () => {
  const ranked = rankCandidates([
    { ...base, id: 'a', score: 100, lat_deg: -88, lon_deg: 0 },
    { ...base, id: 'b', score: 99.8, lat_deg: -87, lon_deg: 0 },
    { ...base, id: 'c', score: 100.04, lat_deg: -86, lon_deg: 0 },
  ])
  expect(ranked.map((r) => [r.candidate.id, r.rank, r.tied])).toEqual([['c', 1, true], ['a', 1, true], ['b', 3, false]])
})
it('odrzuca kandydatów z niepoprawnymi liczbami, pusty ranking daje pustą listę', () => {
  expect(rankCandidates([{ ...base, id: 'x', score: Number.NaN, lat_deg: 0, lon_deg: 0 }])).toEqual([])
  expect(rankCandidates([{ ...base, id: 'y', lat_deg: Number.NaN, lon_deg: 0 }])).toEqual([])
  expect(rankCandidates([])).toEqual([])
})
```

- [ ] **Step 2: Zmień `heatmap.test.ts`.** Usuń testy mgiełki kandydatów. Dodaj:

```ts
it('piksel daleko od granicy ma kolor i alfę strefy', () => {
  const bodies = { cursor_utc: '', subsolar_lat_deg: 0, subsolar_lon_deg: 0, subearth_lat_deg: 0, subearth_lon_deg: 0 }
  const px = buildOverlayPixels(64, 32, bodies)
  const at = (lat: number, lon: number) => { const { x, y } = pixelForLatLon(64, 32, lat, lon); return [...px.slice((y * 64 + x) * 4, (y * 64 + x) * 4 + 4)] }
  expect(at(0, 0)).toEqual([...ZONE_COLORS.sweet_spot])
  expect(at(0, 180)).toEqual([...ZONE_COLORS.shadow])
})
it('alfa żadnej strefy nie zasłania terenu', () => {
  for (const zone of ZONE_ORDER) expect(ZONE_COLORS[zone][3]).toBeLessThanOrEqual(120)
})
```

Run: `npm test -- candidates heatmap` → FAIL.

- [ ] **Step 3:** Zaimplementuj `candidates.ts` i zmiany w `heatmap.ts`. Run → PASS. Popraw wywołanie `buildOverlayPixels` w `MoonGlobe.tsx`.

- [ ] **Step 4: Warstwa kandydatów w `MoonGlobe`.** Grupa `candidateMarkers` widoczna tylko przy włączonej nakładce: każdy `RankedCandidate` to płaski dysk (`CircleGeometry`, zwrócony wzdłuż normalnej, promień 1.006) w kolorze `scoreColor(score / 100)` z ciemnym obrysem 1 px (drugi, większy dysk `#0c0c0d` pod spodem); promień 0.012, dla `rank ≤ 5` – 0.020. Podpis HTML z numerem `rank` dla pierwszych pięciu pozycji listy (klasa `.map-rank`, `.num`). `highlightId` → pierścień `#ffffff` wokół dysku; `selectedId` → pierścień + podpis z `label`. Usuń pulsujący pierścień i `startPulse`/`stopPulse` (anty-cel: pulsujące ozdobniki). Zwycięzca wyróżniony numerem `1` i większym dyskiem.

- [ ] **Step 5: Interakcja.** Raycast w `pointermove` obejmuje `candidateMarkers` → `onCandidateHover(id)` i `onHover({ …, label: 'label · score 99.8' })`. Kliknięcie dysku → `onCandidateSelect(id)` (**nie** przenosi scenariusza – robi to przycisk w panelu). Kliknięcie powierzchni przy włączonej nakładce działa jak dotąd.

- [ ] **Step 6: Granice stref.** Przy włączonej nakładce linie terminatora i granicy Ziemi z Zadania 6 zostają na wierzchu (`renderOrder` wyższy niż nakładka). Przy pierwszym włączeniu nakładki z danymi: `flyTo(optimal.lat_deg, optimal.lon_deg, 1.9)`.

- [ ] **Step 7: Weryfikacja.** `npm run lint && npm run build && npm test`. W przeglądarce: po włączeniu nakładki morza i kratery pozostają widoczne pod odcieniem; przy biegunie widać ok. 40 dysków w odcieniach skali z numerami 1–5; brak pulsowania; najechanie na dysk pokazuje nazwę i wynik; nakładka wyłączona → dyski i odcień znikają, linie terminatora zostają.

- [ ] **Step 8: Commit** `[021] Nakładka: delikatne strefy z ostrą granicą i warstwa kandydatów w skali wyniku`

---

### Task 8: Panel Optimization Overlay

**Files:**
- Modify: `web/src/views/map/OptimalZonePanel.tsx`, `web/src/views/map/index.tsx`, `web/src/views/map/map.css`, `web/src/views/map/heatmap.ts`, `web/src/views/map/candidates.ts`
- Test: `web/src/views/map/candidates.test.ts`, `web/src/views/map/heatmap.test.ts`

**Interfaces:**
- Consumes: `RankedCandidate`, `rankCandidates`, `candidateLabel` (Zadanie 7); `scoreColor`, `scoreRampCss` (Zadanie 5); formaty (Zadanie 1); `normalizeWeights` (istnieje).
- Zmiana (`heatmap.ts`): `WEIGHT_PRESETS` – etykiety `Balanced`, `Power first`, `Comms first`, `Both at once` (wagi bez zmian).
- Produces (`candidates.ts`):
  - `weightsToPercent(weights: OptimalWeights): { sun: number; earth: number; overlap: number }` – liczby całkowite sumujące się dokładnie do 100 (metoda największych reszt), po `normalizeWeights`.
  - `setWeight(weights: OptimalWeights, key: keyof OptimalWeights, percent: number): OptimalWeights` – ustawia wagę `key` na `percent/100`, pozostałe dwie skaluje proporcjonalnie do reszty (gdy obie są 0 – dzieli resztę po równo); wynik sumuje się do 1.
- Props `OptimalZonePanel`: `{ data: OptimalSiteResponse | null; loading: boolean; error: string | null; weights: OptimalWeights; onWeightsChange: (w: OptimalWeights) => void; ranked: RankedCandidate[]; selectedId: string | null; highlightId: string | null; onSelect: (id: string) => void; onHighlight: (id: string | null) => void; onMove: (lat_deg: number, lon_deg: number) => void }`.

- [ ] **Step 1: Testy (mają nie przejść).**

```ts
it('procenty wag sumują się do 100', () => {
  const p = weightsToPercent({ w_sun: 1, w_earth: 1, w_overlap: 1 })
  expect(p.sun + p.earth + p.overlap).toBe(100)
  expect(weightsToPercent({ w_sun: 0, w_earth: 0, w_overlap: 0 })).toEqual({ sun: 34, earth: 33, overlap: 33 })
})
it('zmiana jednej wagi skaluje pozostałe i zachowuje sumę 1', () => {
  const w = setWeight({ w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 }, 'w_sun', 80)
  expect(w.w_sun).toBeCloseTo(0.8)
  expect(w.w_earth + w.w_overlap).toBeCloseTo(0.2)
  expect(w.w_earth / w.w_overlap).toBeCloseTo(0.25 / 0.3)
})
it('suwak na 100 zeruje pozostałe, powrót z 100 dzieli resztę po równo', () => {
  const full = setWeight({ w_sun: 0.45, w_earth: 0.25, w_overlap: 0.3 }, 'w_sun', 100)
  expect(full).toEqual({ w_sun: 1, w_earth: 0, w_overlap: 0 })
  const back = setWeight(full, 'w_sun', 50)
  expect(back.w_earth).toBeCloseTo(0.25)
  expect(back.w_overlap).toBeCloseTo(0.25)
})
```

Run → FAIL. Zaimplementuj. Run → PASS.

- [ ] **Step 2: Stan w `index.tsx`.** `ranked = useMemo(() => rankCandidates(optimal.data?.ranking ?? []), …)`; `selectedId` (domyślnie id pierwszego w `ranked`, resetowany przy nowych danych), `highlightId`. Wagi wysyłane do API z opóźnieniem 300 ms: lokalny stan `weights` zmienia panel natychmiast, `queryWeights` aktualizuje się w `useEffect` z `setTimeout` (sprzątanym). Dane poprzednie zostają na ekranie podczas ładowania (zachowaj ostatnie `optimal.data` w `useRef`/stanie, bo `useAsync` zeruje `data` przy zmianie klucza – sprawdź w `api/useAsync.ts` i nie zmieniaj tego pliku).

- [ ] **Step 3: Układ.** Panel dokowany z prawej strony globusa: `.map-view` przy włączonej nakładce = `minmax(0, 1fr) 340px`; panel z własnym przewijaniem, lewa linia 1 px. Poniżej 900 px panel ląduje pod globusem.

- [ ] **Step 4: Panel – wagi.** Nagłówek `OPTIMAL ZONES` + przycisk zamknięcia (`aria-label="Hide optimal zones"`). `MISSION PROFILE`: cztery presety jako zakładki (wybrany, gdy wagi równe z dokładnością 1e-6). Trzy suwaki `Sun power`, `Earth link`, `Both at once`: `<input type="range" min 0 max 100 step 5>`, obok `.num` z procentem z `weightsToPercent`; `onChange` → `onWeightsChange(setWeight(…))`. Znaczniki koloru: `--sun`, `--earth`, `--ok`.

- [ ] **Step 5: Panel – wybrany kandydat.** Blok dla `selectedId` (nie zawsze zwycięzcy): pozycja `#1` (z `=` przy remisie), `label` 16 px / 600, `.num` `formatCoords(lat, lon)` i wysokość, jeśli jest; wynik `99.8` duży `.num` z `/ 100` w `--muted`. Trzy paski poziome 6 px (tło `--line`): `Sun` w `--sun`, `Earth` w `--earth`, `Both` w `--ok` – z procentem i godzinami po prawej. Wiersz `Longest darkness` z `formatHours`. Przycisk `.btn-primary` `Move scenario here` → `onMove(lat, wrapLon(lon))`.

- [ ] **Step 6: Panel – ranking.** Tabela 8 pierwszych z `ranked`: kolumny `#` (`1`, `=1`), nazwa (`label`), mini-pasek wyniku 48 px w `scoreColor`, wynik `.num`. Wiersz to przycisk: `onMouseEnter`/`onFocus` → `onHighlight(id)`, `onMouseLeave`/`onBlur` → `onHighlight(null)`, klik → `onSelect(id)`; wybrany z kreską 2 px. Pod tabelą `.muted`: `{ranked.length} sites scored · catalogue + polar grid`. Pusty ranking: `No candidate sites returned for this window.`

- [ ] **Step 7: Panel – legenda i stany.** Legenda: cztery próbki stref z `ZONE_LABELS` + skala `scoreRampCss()` z `0` i `100`; pod nią dwa zdania `.muted`: `Zones show this instant on a smooth sphere.` / `Scores cover the whole window and include terrain.` Ładowanie przy istniejących danych: treść z `opacity: 0.5` i `aria-busy`, napis `Updating…` w nagłówku. Pierwsze ładowanie: `Scoring sites…`. Błąd: `Could not score sites: {error}` + przycisk `Retry` (zmienia klucz zapytania licznikiem).

- [ ] **Step 8: Weryfikacja.** `npm run lint && npm run build && npm test`. W przeglądarce na żywym backendzie: każdy preset zmienia ranking; przeciągnięcie suwaka wysyła jedno zapytanie po puszczeniu (karta Network), nie kilkadziesiąt; trzy remisy `100.0` pokazują `=1`; najechanie na wiersz podświetla dysk na globusie i odwrotnie; `Move scenario here` zmienia współrzędne w panelu bocznym na wartości z zakresu −180…180; zatrzymaj backend → komunikat błędu z `Retry`, po starcie backendu `Retry` przywraca dane.

- [ ] **Step 9: Commit** `[021] Panel nakładki: suwaki wag, wybrany kandydat, ranking z remisami, legenda`

---

### Task 9: Przegląd końcowy, dostępność, dokumenty

**Files:**
- Modify: `docs/tasks/021-odswiezenie-ui.md`, `README.md` (akapit o widoku Map: bez emoji 🟡🔵🟢, opis nowej nakładki), `docs/submission/demo-script.md` (tylko jeśli opisuje kliknięcia, które się zmieniły)

- [ ] **Step 1:** W `web/`: `npm run lint && npm run build && npm test` → zielone. `git grep -nE "☀|🌍|🟡|🔵|🟢|🟣" web/src` → brak wyników.
- [ ] **Step 2: Przegląd w przeglądarce** przy 1440, 1024 i 390 px: tryb prowadzony (pełny przebieg), pięć widoków, nakładka z czterema presetami. Zrzuty do opisu PR.
- [ ] **Step 3: Klawiatura.** Tab od nagłówka do końca każdego widoku: fokus zawsze widoczny, kolejność zgodna z układem, suwaki i zakładki obsługiwane strzałkami/spacją, globus ma opis `aria-label` i nie łapie fokusu w pułapkę.
- [ ] **Step 4: Kontrast** (skill `design:accessibility-review`): tekst `#e9e6df` i `#918e86` na `#0c0c0d` i `#141415` ≥ 4.5:1; tekst na komórkach mapy cieplnej ≥ 4.5:1 w obu wariantach koloru tekstu; linie danych ≥ 3:1. Poprawki w tokenach, jeśli coś nie przechodzi.
- [ ] **Step 5: Przegląd wizualny** (skill `design:design-critique`) zrzutów z kroku 2; poprawki hierarchii i odstępów.
- [ ] **Step 6:** Zaktualizuj plik zadania (status `w recenzji`, odhaczone kryteria, sekcja „Czego nie sprawdzono") i README.
- [ ] **Step 7: Commit** `[021] Przegląd końcowy: dostępność, README, status zadania`. PR otwiera się dopiero na polecenie właściciela i po scaleniu 020; w opisie PR wymień dwie nowe zależności `@fontsource/*` z powodem (fonty osadzone lokalnie, demo offline).
