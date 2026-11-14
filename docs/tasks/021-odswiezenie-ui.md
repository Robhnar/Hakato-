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

- Układ sprawdzony przy 1440, 1024 i 390 px pomiarem (brak poziomego przewijania strony w pięciu widokach, zakładki nie są zasłaniane); nie oglądałem zrzutów wszystkich widoków przy 1024 i 390 px.
- Klawiatura: sprawdzone nazwy dostępne i wskaźnik fokusu wszystkich elementów interaktywnych oraz brak fokusu na kanwie globusa; nie przechodziłem Tabem ani strzałkami ręcznie.
- Kontrast: policzony dla tokenów tekstu i komórek mapy cieplnej (≥ 4.61:1); linie danych (≥ 3:1) nie liczone.
- Nie sprawdzono: lot `South pole` po kliknięciu, zwalnianie zasobów WebGL po wielu przełączeniach Map ↔ Sky, tryb prowadzony od początku do końca, skille `design:accessibility-review` i `design:design-critique`.
- Numery rang 1–5 na globusie bywają chowane przez kolizje podpisów.
- Zrzuty do opisu PR trzeba zrobić przy otwieraniu PR.
