# 015 – Widok wyszukiwarki: wymagania misji i symulator „Start opóźnił się o N dni"

- **Status:** w recenzji
- **Właściciel:** osoba F
- **Moduł:** frontend – widok `windows` (panel wymagań, ranking dat i analiza opóźnienia)
- **Gałąź:** `feat/015-wymagania-i-opoznienie`
- **Zależy od:** 011

## Cel

Planista musi szybko odpowiedzieć na dwa praktyczne pytania z opisu wyzwania NASA Space Apps: **„Które daty spełniają ograniczenia mojego lądownika (bateria, oświetlenie na starcie, łączność)?"** oraz **„Start przesunął się o N dni — co tracimy i kiedy jest najbliższe równoważne okno?"**.

## Zakres

Obowiązkowo:

- Komponent formularza wymagań misji `web/src/views/windows/RequirementsPanel.tsx`:
  - Czas trwania misji (`duration_hours`: presety 24 h / 1 dzień księżycowy / 3 dni księżycowe lub własna wartość),
  - Minimalna wysokość Słońca przy lądowaniu (`min_sun_el_at_landing_deg`, np. `0°…2°`),
  - Minimalna liczba godzin słońca (`min_sunlight_hours`),
  - Maksymalna długość nieprzerwanej ciemności (`max_darkness_hours` – pojemność baterii, np. 48 h, 100 h, 350 h),
  - Wymagana łączność z Ziemią przy lądowaniu (`require_earth_at_landing` checkbox) i przez minimum X% misji (`min_earth_fraction`).
- Komponent rankingu znalezionych dat `web/src/views/windows/MatchesList.tsx`:
  - Tabela / karty najlepiej ocenionych okien (`matches` z odpowiedzi `/api/windows`), uszeregowanych od najwyższego `score`.
  - Przycisk **„Use window"** przy każdym wierszu, wywołujący `applyWindow(slot.start_utc, duration_hours)`.
- Komponent analizy opóźnienia startu `web/src/views/windows/SlipAnalyzer.tsx`:
  - Suwak / pole liczbowe **„Launch delayed by +N days"** (`slip_days`: np. `1…90` dni względem `active.start_utc`).
  - Porównanie obok siebie: **Original date** vs **Delayed (+N d)** (`delta_sunlight_hours`, `delta_max_darkness_hours`, `delta_earth_fraction`) z ostrzeżeniem, jeśli opóźniony start łamie wymagania baterii lub oświetlenia.
  - Karta **„Nearest equivalent window"** (`nearest_equivalent_slot`) z przyciskiem szybkiego przejścia do tego terminu.
- Logika czystych funkcji pomocniczych i walidacji progów w `web/src/views/windows/requirements.ts` + testy `web/src/views/windows/requirements.test.ts`.

Jeśli zostanie czas:

- Presety wymagań dla typowych profili misji: *Short surface lander (72 h)*, *Polar rover (1 lunar day, max 72 h battery)*, *Permanent relay station*.

Poza zakresem:

- Rysowanie mapy cieplnej `CalendarHeatmap.tsx` (zadanie 014 – osoba D). Współpraca przez wspólny komponent nadrzędny `web/src/views/windows/index.tsx`.

## Pliki

`web/src/views/windows/RequirementsPanel.tsx`, `web/src/views/windows/MatchesList.tsx`, `web/src/views/windows/SlipAnalyzer.tsx`, `web/src/views/windows/requirements.ts`, `web/src/views/windows/requirements.test.ts`, `web/src/views/windows/index.tsx`, `web/src/views/windows/windows.css`.

## Kontrakty

Korzysta z `api.windows()` oraz `ViewProps` (`applyWindow`, `active`) z zadania 011.

## Kryteria ukończenia

- [ ] Zmiana wymagań (np. zaostrzenie `max_darkness_hours`) natychmiast aktualizuje listę pasujących okien i odfiltrowuje okna ze zbyt długą nocą.
- [ ] Przesunięcie suwaka „Launch delayed by +N days" pokazuje zmianę godzin słońca i najdłuższej nocy oraz pozwala jednym kliknięciem przejść do najbliższego równoważnego okna.
- [ ] Funkcje pomocnicze w `requirements.ts` mają testy jednostkowe (`vitest`).
- [ ] `npm run lint`, `npm run build`, `npm test` zielone.
