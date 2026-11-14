# 014 – Widok wyszukiwarki: mapa cieplna „data startu × parametr" i cykle

- **Status:** wolne
- **Właściciel:** osoba D
- **Moduł:** frontend – widok `windows` (mapa cieplna i wizualizacja cykli)
- **Gałąź:** `feat/014-mapa-cieplna-okien`
- **Zależy od:** 011

## Cel

Użytkownik chce jednym rzutem oka zobaczyć, które miesiące i lata dają dobre warunki lądowania w wybranym miejscu i dlaczego warunki falują w rytmie pór roku na biegunie (~347 dni) oraz libracji Ziemi (~27 dni). Po tym zadaniu zakładka **Windows** wyświetla interaktywną mapę cieplną „data startu × parametr" z wyróżnionymi oknami spełniającymi wymagania misji.

## Zakres

Obowiązkowo:

- Komponent `web/src/views/windows/CalendarHeatmap.tsx` oraz funkcje pomocnicze `web/src/views/windows/heatmap.ts`:
  - Wizualizacja siatki `grid` z `GET /api/windows` jako czytelnej mapy cieplnej (SVG lub siatka CSS):
    - Oś X / kafelki: kolejne dni księżycowe (okna startowe) w wybranym zakresie lat (np. 2027–2030 lub 1 rok).
    - Przełącznik wyświetlanego parametru (albo wiersze mapy cieplnej `data startu × parametr`):
      1. **Sunlight hours / %** (godziny słońca w oknie),
      2. **Longest night (h)** (najdłuższa nieprzerwana ciemność – im mniej, tym lepiej),
      3. **Earth comms %** (ułamek czasu z widoczną Ziemią),
      4. **Max Sun elevation (°)** (maksymalna wysokość Słońca),
      5. **Overall score** (łączna ocena okna).
    - Wyraźne obramowanie / oznaczenie okien, które spełniają wszystkie wymagania użytkownika (`passes_requirements = true`).
    - Podpowiedź (tooltip / panel szczegółów) po najechaniu lub kliknięciu okna: dokładne daty, godziny słońca, najdłuższa noc, łączność z Ziemią oraz faza w cyklu sezonowym (346,6 d).
    - Kliknięcie wybranego okna wywołuje `applyWindow(slot.start_utc, duration_hours)` z `ViewProps`, przestawiając aktywny scenariusz na ten termin.
- Sekcja wyjaśniająca cykle (`CyclesLegend.tsx`): zwięzła prezentacja czterech okresów astronomicznych (`29,5 d` dzień księżycowy, `347 d` polarne pory roku $\pm 1{,}5^\circ$, `27,2 d` libracje Ziemi, `18,6 lat` precesja węzłów) z informacją, w jakiej fazie znajduje się aktualnie wybrane okno.

Jeśli zostanie czas:

- Przycisk „Add best window as new scenario" (jeśli liczba scenariuszy < 4).

Poza zakresem:

- Formularz filtrów wymagań misji i suwak „Start opóźnił się o N dni" (zadanie 015 – osoba F). Integracja obu części w `web/src/views/windows/index.tsx` przez czyste propsy.

## Pliki

`web/src/views/windows/CalendarHeatmap.tsx`, `web/src/views/windows/CyclesLegend.tsx`, `web/src/views/windows/heatmap.ts`, `web/src/views/windows/heatmap.test.ts`, `web/src/views/windows/windows.css`, `web/src/views/windows/index.tsx`.

## Kontrakty

Korzysta z `api.windows()` i `ViewProps` (`applyWindow`) z zadania 011.

## Kryteria ukończenia

- [ ] Na danych z `npm run dev:fixtures` oraz z żywego backendu mapa cieplna wyświetla kolejne okna lądowania i pozwala przełączać metryki.
- [ ] Okna spełniające wymagania (`passes_requirements`) są jednoznacznie wyróżnione wizualnie.
- [ ] Kliknięcie okna aktualizuje datę startu aktywnego scenariusza w pasku powłoki (`SummaryStrip`).
- [ ] Funkcje skalowania kolorów i grupowania siatki w `heatmap.ts` mają testy jednostkowe (`vitest`).
- [ ] `npm run lint`, `npm run build`, `npm test` zielone.
