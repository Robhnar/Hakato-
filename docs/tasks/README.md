# Zadania

Jedno zadanie to jeden plik w tym katalogu. Plik jest briefem dla osoby i jej asystenta AI: ma zawierać wszystko, czego potrzeba, żeby zacząć bez dopytywania.

Nowe zadanie: skopiuj [`_SZABLON.md`](_SZABLON.md) jako `<nr>-<opis>.md`. Zadania tworzy i przydziela integrator; propozycje własnych zadań zgłaszaj jako issue.

Uwagi po przeglądzie oddanych zadań są w [`docs/POPRAWKI.md`](../POPRAWKI.md).

**Status zmieniasz tylko w pliku swojego zadania.** Tabelę poniżej aktualizuje integrator – dzięki temu nikt nie ma konfliktów w tym pliku.

## Lista – Faza 1 (Podstawa nawigatora – ukończona)

Statusy: `wolne` → `w toku` → `w recenzji` → `scalone` (albo `zablokowane`).

| Nr | Zadanie | Moduł | Sugerowana osoba | Status |
| --- | --- | --- | --- | --- |
| 000 | Szkielet backendu i frontendu, fixtures, CI | wszystkie | integrator | scalone |
| [001](001-efemerydy-spice.md) | Efemerydy: Słońce i Ziemia ze SPICE | `ephemeris` | A | scalone |
| [002](002-horyzont-lola.md) | Teren: profil horyzontu z danych LOLA | `terrain` | B | scalone |
| [003](003-metryki-okna.md) | Metryki: dokładne okna i czas do zachodu | `metrics` | A (po 001) | scalone |
| [004](004-katalog-miejsc.md) | Katalog miejsc lądowania i szybkość API | `data`, `api` | E | scalone |
| [005](005-powloka-aplikacji.md) | Powłoka aplikacji: miejsce, data, scenariusze | frontend – powłoka | C | scalone |
| [006](006-widok-nieba.md) | Widok nieba: panorama horyzontu | widok `sky` | D | scalone |
| [007](007-os-czasu.md) | Oś czasu: okna zasilania i łączności | widok `timeline` | F (po 009) | scalone |
| [008](008-porownanie.md) | Porównanie scenariuszy obok siebie | widok `compare` | C (po 005) | scalone |
| [009](009-mapa-globus.md) | Mapa: globus Księżyca z miejscami lądowania | widok `map` | F | scalone |
| [010](010-zgloszenie.md) | Zgłoszenie do Space Apps: opis, demo, prezentacja | – | C / E | scalone |

## Lista – Faza 2 (Wyszukiwarka okien lądowania i analiza opóźnień startu)

Deterministyczne przeszukiwanie wieloletnie tym samym silnikiem (`SPICE` + horyzont `LOLA`), mapa cieplna „data startu × parametr", filtrowanie po wymaganiach misji, symulacja „Start się opóźnił o N dni" oraz wykorzystanie cykli (29,5 d dzień księżycowy, 346,6 d polarne pory roku, 27,2 d libracje Ziemi, 18,6 lat precesja węzłów).

**Zweryfikowane pokrycie jąder SPICE:**
- `de440s.bsp`: `1849-12-25` → `2150-01-21`
- `moon_pa_de440_200625.bpc`: `1549-12-30` → `2650-01-24`

| Nr | Zadanie | Moduł | Sugerowana osoba | Zależy od | Status |
| --- | --- | --- | --- | --- | --- |
| [011](011-kontrakt-wyszukiwarki-okien.md) | Kontrakt `/api/windows`, fixture i zakładka `Windows` | `api`, `contracts`, powłoka | C + integrator | – | wolne |
| [012](012-kalendarz-wieloletni-dane.md) | Kalendarz miejsca na lata 2027–2035 (`data/calendars/`) | `data`, `metrics` | B | 011 | wolne |
| [013](013-silnik-wyszukiwania-i-opoznien.md) | Silnik wyszukiwania po wymaganiach, cykli i opóźnienia startu | `metrics`, `api` | A | 011 (012) | wolne |
| [014](014-widok-mapy-cieplnej-okien.md) | Widok `windows`: mapa cieplna „data startu × parametr" i cykle | widok `windows` | D | 011 | wolne |
| [015](015-panel-wymagan-i-opoznienia-startu.md) | Widok `windows`: wymagania misji i „Start opóźnił się o N dni" | widok `windows` | F | 011 | wolne |
| [016](016-margines-niepewnosci-i-rozszerzenia.md) | Margines niepewności (tarcza Słońca, elipsa) i zaćmienia (rozszerzenie) | `metrics`, `terrain` | E | 011, 013 | wolne |

## Kolejność prac w Fazie 2

1. **Krok 1 (blokujący kontrakt):** Zadanie **011** (osoba C / integrator) — dodaje schemat `/api/windows`, `contracts/fixtures/windows.json`, metodę `api.windows()` oraz zakładkę `Windows` z akcją `applyWindow`.
2. **Krok 2 (równolegle po 011):**
   - **Osoba B (012):** skrypt `data/scripts/build_calendars.py` i wygenerowanie wieloletnich kalendarzy 2027–2035 do `data/calendars/<id>.json`.
   - **Osoba A (013):** logika filtrowania po wymaganiach misji, symulacji „Start się opóźnił o N dni" (`slip_days` + najbliższe okno równoważne) i wyznaczania faz cykli w `GET /api/windows`.
   - **Osoba D (014):** komponent `CalendarHeatmap.tsx` („data startu × parametr") i legenda cykli `CyclesLegend.tsx` (praca na `npm run dev:fixtures`).
   - **Osoba F (015):** komponenty `RequirementsPanel.tsx`, `MatchesList.tsx` oraz `SlipAnalyzer.tsx` („Launch delayed by +N days").
3. **Krok 3 (rozszerzenie, jeśli zostanie czas):**
   - **Osoba E (016):** tarcza słoneczna `0,53°`, margines błędu horyzontu `±0,2°`, rozrzut w elipsie lądowania oraz zaćmienia Słońca przez Ziemię.

## Pliki, w których łatwo o konflikt

Zmieniaj je tylko wtedy, gdy zadanie tego wymaga, i możliwie małą zmianą – integrator rozwiąże konflikt przy scalaniu.

- `web/package.json` i `web/package-lock.json`, `backend/pyproject.toml` – nowe zależności.
- `backend/app/api/schemas.py`, `web/src/api/types.ts`, `web/src/app/scenario.ts` – kontrakty; zmiana tylko w zadaniu 011.
- `contracts/fixtures/*` – generowane skryptem, nie edytuj ręcznie.
