# 019 – Widok `map`: przełączana warstwa ON/OFF mapy cieplnej i optymalnego punktu na globusie 3D

- **Status:** w toku (warstwa, logika i panel gotowe; podpięcie `api.optimalSite()` czeka na 017)
- **Właściciel:** osoba F
- **Moduł:** frontend – widok `map` (`MoonGlobe.tsx`, nakładka ON/OFF i panel optymalnego punktu)
- **Gałąź:** `feat/019-mapa-warstwa-on-off`
- **Zależy od:** 017

## Cel

Dodać w widoku **Map** (`web/src/views/map/`) przełączaną warstwę **ON/OFF** realizującą propozycję ze zgłoszenia **#29**: gdy przełącznik jest wyłączony (**OFF**), globus 3D działa w klasycznym trybie LROC; gdy użytkownik włączy przełącznik (**ON**), na globusie 3D pojawia się dynamiczna nakładka stref zasilania i łączności (`CanvasTexture`) oraz pulsujący znacznik przewidzianego optymalnego punktu lądowania (**Optimal Landing Zone**) wraz z panelem metryk i wag.

## Zakres

Obowiązkowo:

- **Przełącznik warstwy ON/OFF w pasku narzędzi mapy (`web/src/views/map/index.tsx`):**
  - Wyraźny przycisk / przełącznik **`Optimal zone overlay: OFF / ON`** (`aria-pressed={overlayEnabled}`) w `.map-toolbar`.
  - Gdy `overlayEnabled === false` (**OFF**): aplikacja nie wyświetla nakładki cieplnej ani panelu optymalizacji, zachowując czysty wygląd globusa 3D z zadania 009.
  - Gdy `overlayEnabled === true` (**ON**): widok pobiera dane z `api.optimalSite(...)` dla okna aktywnego scenariusza (`active.start_utc`, `end_utc = active.start_utc + active.duration_hours`, `cursor_utc`, wybrane wagi) i przekazuje je do `MoonGlobe` oraz `OptimalZonePanel`.
- **Czysta logika generowania nakładki i kolorów w `web/src/views/map/heatmap.ts` (+ testy `web/src/views/map/heatmap.test.ts`):**
  - Klasyfikacja stref i paleta kolorów zgodna ze zgłoszeniem #29:
    - 🟡 **Bursztyn/złoto** (`sun_only`): widoczne Słońce (zasilanie), brak Ziemi,
    - 🔵 **Błękit** (`earth_only`): widoczna Ziemia (telemetria i łączność), brak Słońca,
    - 🟢 **Szmaragd** (`sweet_spot` / `overlap`): jednoczesne zasilanie słoneczne i łączność z Ziemią,
    - ⚫ **Cień / brak sygnału** (`shadow`): ciemna półprzezroczysta warstwa.
  - Funkcja budująca bufor RGBA / `CanvasTexture` dla sfery nakładki na podstawie `cursor_bodies` (`subsolar_lat_deg`, `subsolar_lon_deg`, `subearth_lat_deg`, `subearth_lon_deg`) oraz punktów `ranking` na czapie polarnej.
- **Rozszerzenie `web/src/views/map/MoonGlobe.tsx`:**
  - Nowe opcjonalne propsy: `overlayEnabled?: boolean`, `optimalSite?: OptimalSiteResponse | null`.
  - Półprzezroczysta sfera nakładki (`SphereGeometry(1.003, 96, 64)` z `MeshBasicMaterial({ transparent: true, opacity: 0.48, depthWrite: false })`), której widoczność zależy od `overlayEnabled`.
  - Wyróżniony znacznik **Optimal Landing Zone** (szmaragdowa kula + pierścień/poświata wokół `optimal.lat_deg, optimal.lon_deg`), widoczny gdy `overlayEnabled === true`. Kliknięcie znacznika przenosi aktywny scenariusz w to miejsce (`onPick(optimal.lat_deg, optimal.lon_deg)`).
- **Komponent `web/src/views/map/OptimalZonePanel.tsx` (widoczny gdy `overlayEnabled === true`):**
  - Presety wag profilu misji: *Balanced (45/25/30)*, *Solar Power Priority (70/10/20)*, *Earth Comms Priority (15/55/30)*, *Sweet-Spot Priority (20/20/60)*.
  - Karta wyznaczonego punktu optymalnego (`optimal.name`, współrzędne, `score`, `Sunlight % / h`, `Earth link % / h`, `Sweet spot (overlap) % / h`, `Max darkness h`).
  - Przycisk **„Move active scenario to optimal zone"** wywołujący `pickLocation(optimal.lat_deg, optimal.lon_deg)`.
  - Legenda kolorów warstwy (🟡 Sun power · 🔵 Earth link · 🟢 Sweet spot (Sun + Earth) · ⚫ Shadow).

Poza zakresem:

- Zmiany w backendzie (zadania 017 i 018).

## Pliki

`web/src/views/map/index.tsx`, `web/src/views/map/MoonGlobe.tsx`, `web/src/views/map/heatmap.ts`, `web/src/views/map/heatmap.test.ts`, `web/src/views/map/OptimalZonePanel.tsx`, `web/src/views/map/map.css`.

## Kontrakty

Korzysta z `api.optimalSite()` z zadania 017 oraz `ViewProps` (`active`, `cursor_utc`, `pickLocation`) z zadania 005.

## Kryteria ukończenia

- [ ] Przełącznik `Optimal zone overlay` włącza i wyłącza warstwę cieplną, znacznik punktu optymalnego oraz panel `OptimalZonePanel` bez przeładowywania sceny WebGL.
- [ ] Przy włączonej warstwie (`ON`) zmiana `cursor_utc` lub profilu wag aktualizuje nakładkę oraz wyznaczony punkt optymalny, a przycisk „Move active scenario to optimal zone" przenosi aktywny scenariusz do współrzędnych `optimal`.
- [ ] Czyste funkcje klasyfikacji stref i generowania bufora kolorów w `web/src/views/map/heatmap.ts` mają testy jednostkowe (`vitest`).
- [ ] `npm run lint`, `npm run build`, `npm test` przechodzą.
