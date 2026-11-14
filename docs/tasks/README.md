# Zadania

Jedno zadanie to jeden plik w tym katalogu. Plik jest briefem dla osoby i jej asystenta AI: ma zawierać wszystko, czego potrzeba, żeby zacząć bez dopytywania.

Nowe zadanie: skopiuj [`_SZABLON.md`](_SZABLON.md) jako `<nr>-<opis>.md`. Zadania tworzy i przydziela integrator; propozycje własnych zadań zgłaszaj jako issue.

**Status zmieniasz tylko w pliku swojego zadania.** Tabelę poniżej aktualizuje integrator – dzięki temu nikt nie ma konfliktów w tym pliku.

## Lista

Statusy: `wolne` → `w toku` → `w recenzji` → `scalone` (albo `zablokowane`).

| Nr | Zadanie | Moduł | Sugerowana osoba | Status |
| --- | --- | --- | --- | --- |
| 000 | Szkielet backendu i frontendu, fixtures, CI | wszystkie | integrator | scalone |
| [001](001-efemerydy-spice.md) | Efemerydy: Słońce i Ziemia ze SPICE | `ephemeris` | A | wolne |
| [002](002-horyzont-lola.md) | Teren: profil horyzontu z danych LOLA | `terrain` | B | wolne |
| [003](003-metryki-okna.md) | Metryki: dokładne okna i czas do zachodu | `metrics` | A (po 001) | wolne |
| [004](004-katalog-miejsc.md) | Katalog miejsc lądowania i szybkość API | `data`, `api` | E | wolne |
| [005](005-powloka-aplikacji.md) | Powłoka aplikacji: miejsce, data, scenariusze | frontend – powłoka | C | wolne |
| [006](006-widok-nieba.md) | Widok nieba: panorama horyzontu | widok `sky` | D | wolne |
| [007](007-os-czasu.md) | Oś czasu: okna zasilania i łączności | widok `timeline` | F (po 009) | wolne |
| [008](008-porownanie.md) | Porównanie scenariuszy obok siebie | widok `compare` | C (po 005) | wolne |
| [009](009-mapa-globus.md) | Mapa: globus Księżyca z miejscami lądowania | widok `map` | F | wolne |
| [010](010-zgloszenie.md) | Zgłoszenie do Space Apps: opis, demo, prezentacja | – | do ustalenia | wolne |

Litery A–F to sześć osób w zespole; podział jest propozycją i można go zmienić przed startem.

## Plan na 24 godziny

| Kiedy | Co |
| --- | --- |
| 0–1 h | Każdy uruchamia projekt lokalnie i bierze pierwsze zadanie. Zadanie 010: spisanie wymagań konkursu. |
| 1–10 h | Pierwsze zadania: 001, 002, 004, 005, 006, 009. PR, gdy tylko część obowiązkowa działa. |
| 10–18 h | Drugie zadania: 003, 007, 008. Zadanie 002 trwa dalej, jeśli trzeba. |
| 18–21 h | Tylko poprawki błędów i integracja. Żadnych nowych funkcji. |
| 21–24 h | Demo i zgłoszenie na wersji z `main`. |

W każdym briefie sekcja „Obowiązkowo" to minimum na PR; „Jeśli zostanie czas" robimy dopiero, gdy wszystkie zadania mają scaloną część obowiązkową.

## Pliki, w których łatwo o konflikt

Zmieniaj je tylko wtedy, gdy zadanie tego wymaga, i możliwie małą zmianą – integrator rozwiąże konflikt przy scalaniu.

- `web/package.json` i `web/package-lock.json`, `backend/pyproject.toml` – nowe zależności.
- `backend/app/api/schemas.py`, `web/src/api/types.ts`, `web/src/app/scenario.ts` – kontrakty; zmiana tylko osobnym PR.
- `contracts/fixtures/*` – generowane skryptem, nie edytuj ręcznie.
