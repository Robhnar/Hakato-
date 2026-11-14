# 021 – Odświeżenie UI: „konsola misji", wykresy, mapa i Optimization Overlay

- **Status:** w recenzji (zadania 1–8 wdrożone, część kryteriów niezweryfikowana – patrz „Czego nie sprawdzono")
- **Właściciel:** Claude Code
- **Moduł:** frontend – powłoka i wszystkie widoki (`web/src/`)
- **Gałąź:** `feat/021-odswiezenie-ui`
- **Zależy od:** 020 (w recenzji; 021 stoi na jego gałęzi)

## Cel

Aplikacja ma wyglądać jak rzeczowe narzędzie do planowania misji, a nie typowy ciemny dashboard: spójny styl, układ, w którym nic nie zasłania wykresów, czytelne osie i odczyty, mapa Księżyca z prawdziwym widokiem bieguna oraz nakładka optymalizacji pokazująca ranking kandydatów zamiast zielonej plamy.

## Zakres

Obowiązkowo:

- Nowe tokeny kolorów, fonty IBM Plex, wspólne formatowanie czasu i współrzędnych.
- Układ Expert: nagłówek, panel boczny scenariusza ze statusem Sun/Earth, scena z zakładkami widoków.
- Tryb prowadzony w nowym stylu (bez zmian logiki i tekstów).
- Poprawki wykresów Sky, Timeline, Compare, Windows.
- Mapa: przelot nad bieguny, siatka, terminator, podpisy miejsc, odczyt pod kursorem.
- Optimization Overlay: delikatne strefy z ostrą granicą, warstwa kandydatów w skali wyniku, panel z suwakami wag i rankingiem.

Poza zakresem:

- Backend, kontrakty API, `ViewProps`, `web/src/api/`.
- Jasny motyw, tłumaczenie interfejsu, lepsza tekstura polarna.

## Pliki

`web/src/**` (bez `web/src/api/`), `web/package.json`, `web/package-lock.json`, `README.md` (akapit o widoku Map), `docs/superpowers/`, ten plik.

## Kontrakty

Korzysta z `GET /api/sites`, `/api/summary`, `/api/timeline`, `/api/horizon`, `/api/windows`, `/api/optimal-site` – bez zmian. Nie udostępnia nowych kontraktów. Nowe zależności: `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`.

## Kryteria ukończenia

- [x] Żaden element nie zasłania wykresów, mapy ani zakładek przy 1440, 1024 i 390 px.
- [ ] Czas i współrzędne wszędzie w jednym formacie (`19 May 2027 19:13 UTC`, `89.45°S 137.30°W`).
- [ ] „South pole" ustawia biegun w środku kadru; miejsca mają podpisy.
- [x] Nakładka nie zasłania terenu; kandydaci widoczni jako punkty w skali wyniku; remisy oznaczone.
- [x] Brak emoji w interfejsie; kontrast tekstu ≥ 4.5:1.
- [x] `npm run lint`, `npm run build`, `npm test` przechodzą.

## Notatki

- Projekt: `docs/superpowers/specs/2026-11-14-odswiezenie-ui-design.md`.
- Plan krok po kroku (9 zadań): `docs/superpowers/plans/2026-11-14-odswiezenie-ui.md`.
- Ustalone z właścicielem: kierunek „konsola misji", przebudowa układu Expert, strefy nakładki zostają (poprawione) + nowa warstwa kandydatów.
- Znalezione przy przeglądzie, naprawiane w tym zadaniu: przyklejony pasek Sun/Earth zasłania ok. 1/3 ekranu; kółko myszy nad globusem blokuje przewijanie strony; „South pole view" ustawia kamerę na 60°S; długość geograficzna siatki wyświetlana jako `315.0°E`.

## Czego nie sprawdzono

- Czytnik ekranu (NVDA/VoiceOver) – nie testowany; zamiast niego przejrzano drzewo dostępności i nazwy elementów.
- Zrzuty zrobione przy 390 px dla trybu prowadzonego, Sky, Timeline, Compare, Windows i Mapy z nakładką; przy 1024 px dla Sky, Timeline, Compare, Windows i Mapy; przy 1440 px dla Mapy z nakładką.
- Kontrast: tekst – tokeny ≥ 5.6:1, komórki mapy cieplnej ≥ 4.61:1; linie danych (Słońce, Ziemia, osie, kursor) 5.6–15.7:1, czyli ≥ 3:1; siatka tła (1.3:1) jest dekoracyjna.
- Podpis zwycięzcy (rang 1) na globusie bywa chowany przez kolizję z podpisem scenariusza; nazwa i wynik są w panelu.
- Na telefonie wykresy Sky i Timeline mają minimalną szerokość 640 px i przewijają się poziomo w kontenerze; w Timeline przeciąganie po wykresie przesuwa kursor, więc przewija się paskiem pod wykresem.
- Tabela Compare przy 390 px przewija się poziomo wewnątrz sceny.
- Zrzuty do opisu PR leżą lokalnie w `.playwright-mcp/` (poza repozytorium): `pr-map-overlay-1440.png`, `pr-timeline-1024.png`, `pr-map-390.png`, `pr-sky-390.png`, `pr-timeline-390.png`, `pr-compare-390.png`, `pr-windows-390.png`, `pr-guide-390.png`.

Sprawdzone ręcznie: Tab (nagłówek → panel boczny → pola, obrys 2 px na każdym elemencie), Spacja na przełączniku i presecie, strzałki na suwaku (45 → 55%), fokus zostaje na presecie po zmianie; lot `South pole`; 10 przełączeń Map ↔ Sky bez błędów WebGL; `Retry`; debounce wag; przegląd skillami `design:accessibility-review` i `design:design-critique` z poprawkami (cele dotykowe 44 px, marginesy widoków, układ Windows, rozmiar etykiet osi, numery rang, przyciski panelu na telefonie).

## Znalezione poza zakresem (backend, do opisu PR)

- Tryb prowadzony wysyła serie równoległych zapytań `/api/windows`. Na lokalnym backendzie kończy się to odpowiedziami 422, 500 i 502, a proces pada z błędem SPICE (`BADSUBSCRIPT` w `str2et`, `UNPARSEDTIME`). Po restarcie te same zapytania wysłane pojedynczo zwracają 200. Wygląda na brak bezpieczeństwa wątkowego wywołań SPICE; nie naprawiałem, to moduł backendu. Wynik w UI i tak się pojawia, ale konsola ma kilkadziesiąt błędów.
