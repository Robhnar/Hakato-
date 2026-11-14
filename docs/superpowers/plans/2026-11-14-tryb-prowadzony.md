# Tryb prowadzony „Plan a landing” — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Domyślny ekran, na którym laik w 3 krokach dostaje rekomendację „miejsce + data + godzina lądowania” z wyjaśnieniem i alternatywami, oraz przejście do istniejących narzędzi eksperckich.

**Architecture:** Nowy podkatalog powłoki `web/src/app/guide/`: czyste funkcje (ranking, formatowanie, rozkład dzienny) z testami vitest + komponenty React. Dane wyłącznie z istniejącego `api.windows()` i `api.timeline()`; ranking po stronie klienta. `App.tsx` dostaje przełącznik trybu Simple/Expert.

**Tech Stack:** React 19, TypeScript, Vite, vitest, oxlint. Bez nowych zależności.

**Spec:** `docs/superpowers/specs/2026-11-14-tryb-prowadzony-design.md`

**Wykonanie:** natywnie w tej sesji; zadania oznaczone **[DeepSeek]** zleca się `opencode run -m opencode-go/deepseek-v4-pro` z briefem zawierającym blok Interfaces i testy zadania, a wynik przegląda Claude.

## Global Constraints

- Tekst UI po angielsku; dokumentacja i komentarze po polsku (konwencja repo).
- Bez zmian w `backend/`, `contracts/`, `web/src/api/`, `web/src/views/`, `web/src/app/scenario.ts` (kontrakty).
- W trybie Simple żadnych stopni, `score` ani skrótów UTC bez objaśnienia; czas pokazany jako UTC i czas lokalny użytkownika.
- Ocena zawsze jako tekst + ikona + kolor (nie sam kolor). Cele dotyku ≥ 44 px, kontrast WCAG AA, działa przy 375 px szerokości.
- Długości misji: Quick visit = 72 h, Two weeks = 336 h, Long stay = `LUNAR_DAY_HOURS * 3`.
- Zakres wyszukiwania: od pełnego miesiąca do pełnego miesiąca, najwyżej 24 miesiące.
- `npm run lint`, `npm run build`, `npm test` w `web/` przechodzą po każdym zadaniu.

## Review Focus

1. Wszystkie okna odrzucone przez „see Earth at landing” → przyjazny komunikat z podpowiedzią, nie pusta karta (test w Task 3).
2. Jedno z równoległych zapytań do API pada → wynik z pozostałych miejsc + notka; wszystkie padają → błąd z przyciskiem Retry (test w Task 3).
3. Miesiąc końcowy przed początkowym albo zakres > 24 mies. → komunikat walidacji, przycisk „Find” nieaktywny (test w Task 2).
4. Szybkie ponowne kliknięcie „Find” / zmiana odpowiedzi w trakcie ładowania → wynik starego zapytania nie nadpisuje nowego (test w Task 3).
5. `meta.ephemeris === 'placeholder'` → jedno zdanie „approximate” przy wyniku (test w Task 5 przez `approximateNote(meta)`).

---

### Task 1: Ranking i oceny (`ranking.ts`)

**Files:**
- Create: `web/src/app/guide/ranking.ts`
- Test: `web/src/app/guide/ranking.test.ts`

**Interfaces:**
- Consumes: `CalendarSlot`, `Site` z `../../api/types`; `LUNAR_DAY_HOURS` z `../scenario`.
- Produces:
  - `type MissionKind = 'quick' | 'twoWeeks' | 'long'`; `MISSIONS: Record<MissionKind, { label: string; hours: number; blurb: string }>`
  - `type Priority = 'power' | 'earth' | 'both'`
  - `interface Candidate { site: Site; slot: CalendarSlot }`
  - `interface RankedCandidate extends Candidate { points: number }` (0–100)
  - `scoreSlot(slot: CalendarSlot, priority: Priority, durationHours: number): number`
  - `rankCandidates(cands: Candidate[], priority: Priority, durationHours: number, requireEarthAtLanding: boolean): RankedCandidate[]` — malejąco po `points`, remis → wcześniejszy `start_utc`.
  - `type Rating = 'great' | 'okay' | 'poor'`; `rateFraction(f: number): Rating`; `rateDarkness(hours: number): Rating`
  - `nextAfterSlip(ranked: RankedCandidate[], best: RankedCandidate, days: number): RankedCandidate | null` — najlepszy kandydat z tego samego `site.id`, którego start ≥ start `best` + `days`.

Wagi (sun / earth / darkness): power 0.6/0.15/0.25, earth 0.2/0.6/0.2, both 0.4/0.4/0.2. `points = 100 * (ws*sun_visible_fraction + we*earth_visible_fraction + wd*(1 - min(max_darkness_hours/duration, 1)))`, a gdy `sun_el_at_start_deg < 0` (lądowanie w ciemności) × 0.8; zaokrąglenie do 0.1. Progi: fraction ≥ 0.75 great, ≥ 0.4 okay; darkness ≤ 24 h great, ≤ 72 h okay.

- [ ] **Step 1: Testy** — `scoreSlot` dla slotu sun=1, earth=0.5, dark=0, sun_el=0.7, power, 336 h → `92.5`; ten sam slot z `sun_el_at_start_deg=-1` → `74`; `rankCandidates` z `requireEarthAtLanding=true` usuwa sloty z `earth_visible_at_start=false`; remis sortuje po dacie; `rateFraction(0.75)='great'`, `(0.4)='okay'`, `(0.39)='poor'`; `rateDarkness(24)='great'`, `(72)='okay'`, `(73)='poor'`; `nextAfterSlip` zwraca kandydata z tego samego miejsca ≥ 7 dni później, `null` gdy brak.
- [ ] **Step 2:** `npx vitest run src/app/guide/ranking.test.ts` → FAIL (brak modułu).
- [ ] **Step 3:** Implementacja wg Interfaces.
- [ ] **Step 4:** Ten sam test → PASS.
- [ ] **Step 5:** Commit `[020] Ranking i oceny trybu prowadzonego`.

### Task 2: Formatowanie i zakres dat (`format.ts`) **[DeepSeek]**

**Files:**
- Create: `web/src/app/guide/format.ts`, Test: `web/src/app/guide/format.test.ts`

**Interfaces:**
- Produces:
  - `formatDay(utc: string): string` → `'Sat 27 May 2028'` (strefa UTC, `en-GB`).
  - `formatUtcTime(utc: string): string` → `'15:40 UTC'`.
  - `formatLocalTime(utc: string, timeZone?: string): string` → np. `'17:40 your time'` (z `timeZone` w teście: `'Europe/Warsaw'`).
  - `formatDuration(hours: number): string` → `0`→`'none'`, `5`→`'5 hours'`, `30`→`'about 1 day'`, `336`→`'about 14 days'`.
  - `formatPercent(f: number): string` → `0.512`→`'51%'`.
  - `defaultMonthRange(now: Date): { from: string; to: string }` → od następnego miesiąca (`'YYYY-MM'`), `to` = `from` + 11 mies.
  - `monthRangeToSearch(from: string, to: string): { search_start_utc: string; search_end_utc: string } | { error: string }` → `('2028-03','2028-12')` → `2028-03-01T00:00:00Z`…`2029-01-01T00:00:00Z`; `to < from` → `{error: 'The end month must be after the start month.'}`; > 24 mies. → `{error: 'Please choose at most 2 years.'}`; pusty → `{error: 'Choose both months.'}`.
- [ ] **Step 1:** Testy z wartościami powyżej. **Step 2:** FAIL. **Step 3:** Implementacja (DeepSeek). **Step 4:** PASS + przegląd Claude. **Step 5:** Commit `[020] Formatowanie dat i zakresu wyszukiwania`.

### Task 3: Wyszukiwanie miejsc i terminów (`search.ts` + `useLandingSearch`)

**Files:**
- Create: `web/src/app/guide/search.ts`, Test: `web/src/app/guide/search.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2 (`monthRangeToSearch`), `api.windows`.
- Produces:
  - `interface GuideAnswers { mission: MissionKind; priority: Priority; earthAtLanding: boolean; from: string; to: string; place: 'auto' | string /* site.id */ }`
  - `candidateSites(sites: Site[], place: GuideAnswers['place']): Site[]` — `'auto'` → kategoria `candidate`; inaczej jedno miejsce.
  - `interface SearchResult { ranked: RankedCandidate[]; failedSites: Site[]; meta: Meta | null; emptyReason: 'earth-at-landing' | 'no-windows' | null }`
  - `findLandings(answers: GuideAnswers, sites: Site[], fetchWindows: (q: WindowsQuery) => Promise<WindowsResponse>): Promise<SearchResult>` — równoległe `Promise.allSettled`; brak udanych → `throw new Error('Could not reach the landing calculator.')`.
- [ ] **Step 1: Testy** z fałszywym `fetchWindows`: `'auto'` pyta tylko miejsca `candidate`; zapytanie ma `duration_hours` z `MISSIONS`; jedno miejsce odrzucone → `failedSites` ma je, `ranked` z reszty; wszystkie odrzucone → rejects; wszystkie sloty bez Ziemi + `earthAtLanding` → `emptyReason='earth-at-landing'`; `meta` z pierwszej udanej odpowiedzi.
- [ ] **Step 2:** FAIL. **Step 3:** Implementacja. **Step 4:** PASS.
- [ ] **Step 5:** Commit `[020] Wyszukiwanie miejsc i terminów lądowania`.

(Odporność na wyścig z Review Focus 4 jest w Task 5: licznik żądań w komponencie, wynik przyjmowany tylko dla ostatniego.)

### Task 4: Rozkład dzień po dniu (`daily.ts` + `DayStrip.tsx`) **[DeepSeek dla komponentu]**

**Files:**
- Create: `web/src/app/guide/daily.ts`, `web/src/app/guide/daily.test.ts`, `web/src/app/guide/DayStrip.tsx`

**Interfaces:**
- Produces:
  - `interface DayShare { day: string /* YYYY-MM-DD */; sun: number; earth: number }` (ułamki 0–1)
  - `dailyShares(t: Timeline): DayShare[]` — grupowanie próbek po dniu UTC.
  - `DayStrip({ lat_deg, lon_deg, start_utc, hours }: {...})` — `api.timeline` z `step_minutes` = 60 (dla > 400 h: 180), rysuje po jednej kolumnie na dzień: górna połowa Słońce (żółta, wysokość = ułamek), dolna Ziemia (niebieska); `role="img"` + `aria-label` z podsumowaniem („Sun up on 14 of 14 days, Earth visible on 9 of 14 days”); dla > 31 dni grupuje po 3 dni.
- [ ] **Step 1:** Testy `dailyShares`: 48 próbek co godzinę, pierwsze 24 sun=true → `[{sun:1},{sun:0}]`; dzień częściowy liczy tylko swoje próbki. **Step 2:** FAIL. **Step 3:** Implementacja `daily.ts` (Claude), `DayStrip.tsx` (DeepSeek). **Step 4:** PASS + build. **Step 5:** Commit.

### Task 5: Ekran „Plan a landing” (`GuidePanel.tsx`, `ResultCard.tsx`, `explain.ts`)

**Files:**
- Create: `web/src/app/guide/GuidePanel.tsx`, `web/src/app/guide/ResultCard.tsx`, `web/src/app/guide/explain.ts`, `web/src/app/guide/explain.test.ts`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces:
  - `GuidePanel({ sites, onOpenExpert }: { sites: Site[]; onOpenExpert: (site: Site, start_utc: string, duration_hours: number) => void })`
  - `whyText(c: RankedCandidate, priority: Priority, durationHours: number): string` — 1–2 zdania z szablonów (np. „The Sun stays above the hills here for the whole mission, so solar panels never go dark.”).
  - `approximateNote(meta: Meta | null): string | null` — dla `placeholder`: „Sun and Earth positions in this demo are approximate. Use the expert tools with precise data before real planning.”
- Formularz: trzy `fieldset` z `legend` (kroki 1–3), radio jako duże karty, `input type="month"`, `select` „A place I choose” z grupami kategorii. Przycisk „Find my landing” (disabled + powód przy błędzie walidacji). Wynik: `ResultCard` dla najlepszego (nagłówek z `tabIndex=-1`, fokus po wyniku, `aria-live="polite"` na statusie), 3 metryki z `Rating`, `whyText`, `DayStrip`, przyciski „See it in the sky” / „Compare in expert tools” (oba `onOpenExpert`), lista „Other good options” (max 3, różne od najlepszego), blok „If your launch slips by a week” z `nextAfterSlip`.
- [ ] **Step 1:** Testy `whyText` (power + pełne słońce → zawiera „whole mission”; earth + earth_fraction 0.95 → zawiera „Earth”) i `approximateNote`. **Step 2:** FAIL. **Step 3:** Implementacja. **Step 4:** PASS + `npm run build`.
- [ ] **Step 5:** Commit `[020] Ekran Plan a landing`.

### Task 6: Integracja z powłoką + style **[DeepSeek dla CSS]**

**Files:**
- Modify: `web/src/App.tsx` (stan `mode: 'simple' | 'expert'`, domyślnie `'simple'`; przełącznik w nagłówku; `openExpert(site, start, hours)` = `applySite` + `applyWindow(start, hours)` + `setViewId('sky')` + `setMode('expert')`)
- Create: `web/src/app/guide/guide.css` (importowany w `GuidePanel.tsx`; tylko zmienne z `index.css`)
- Modify: `web/src/index.css` — tylko styl przełącznika trybu (`.mode-switch`).
- [ ] **Step 1:** Implementacja przełącznika i `openExpert`. **Step 2:** CSS (DeepSeek): karty radio, karta wyniku, ratingi, pasek dni, układ jednokolumnowy < 640 px, focus-visible. **Step 3:** `npm run lint && npm run build && npm test` → PASS.
- [ ] **Step 4:** Commit `[020] Przełącznik Simple/Expert i style trybu prowadzonego`.

### Task 7: Weryfikacja, mikrocopy, dostępność, oddanie

- [ ] Przegląd tekstów skillem `design:ux-copy`, poprawki.
- [ ] Przegląd `design:accessibility-review` na działającej aplikacji (375 px i desktop), poprawki.
- [ ] Ręczny przebieg w przeglądarce: auto-miejsce, wybrane miejsce, wymóg Ziemi bez wyników, błędny zakres, przejście do Expert ustawia miejsce/datę.
- [ ] `docs/tasks/020-tryb-prowadzony.md` (z `_SZABLON.md`), status `w recenzji`; commit; PR do `main` (bez scalania).
