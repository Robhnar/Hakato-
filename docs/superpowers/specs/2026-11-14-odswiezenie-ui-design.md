# 021 – Odświeżenie UI: „konsola misji", wykresy, mapa i Optimization Overlay

Data: 2026-11-14 · Gałąź: `feat/021-odswiezenie-ui` (na bazie 020) · Status: do akceptacji

## Po co

Interfejs działa, ale wygląda jak typowy ciemny dashboard z generatora: granat + bursztyn, karta w karcie, pigułki, emoji, surowe dane w napisach. Jury i użytkownik mają widzieć narzędzie do planowania misji – rzeczowe, gęste, czytelne – a mapa i nakładka optymalizacji mają pokazywać prawdziwe wyniki, nie zieloną plamę.

## Cele

1. Jeden spójny język wizualny („konsola misji") w powłoce, trybie prowadzonym i pięciu widokach.
2. Układ Expert, w którym nic nie zasłania wykresów ani mapy.
3. Wykresy czytelne bez legendy z boku: opisy osi, etykiety przy danych, odczyt pod kursorem.
4. Mapa, na której da się obejrzeć biegun południowy i rozpoznać miejsca.
5. Nakładka, która pokazuje ranking kandydatów i nie zasłania terenu.

## Poza zakresem

- Backend, kontrakty API, `ViewProps`, `api/types.ts`, logika rankingu trybu prowadzonego.
- Jasny motyw. Tłumaczenie interfejsu (zostaje angielski).
- Nowe funkcje widoków poza wymienionymi niżej.

## Czego unikamy (anty-cele)

- Gradienty, poświaty, szkło, pulsujące ozdobniki, emoji jako ikony.
- Kolor akcentu użyty „dla ozdoby". Bursztyn = Słońce, błękit = Ziemia, zawsze i tylko to.
- Karta w karcie. Ramka pojawia się tam, gdzie oddziela, nie wszędzie.

## Rozważone podejścia (wybór użytkownika)

| Decyzja | Opcje | Wybrano |
| --- | --- | --- |
| Kierunek wizualny | konsola misji · jasny atlas naukowy · obecny styl uporządkowany | **konsola misji** – najlepiej pasuje do narzędzia dynamiki lotu i do globusa 3D na ciemnym tle |
| Układ Expert | przebudowa (panel boczny + scena) · tylko wygląd | **przebudowa** – usuwa przyklejony pasek zasłaniający 1/3 ekranu |
| Nakładka | punkty + linie zamiast stref · strefy poprawione + punkty · obie z przełącznikiem | **strefy poprawione + punkty kandydatów** – zgodne z README i zgłoszeniem |

## Projekt

### 1. Język wizualny (`web/src/index.css`)

- **Kolory:** tło `#0c0c0d`, powierzchnia `#141415`, linia `#27282b`, tekst `#e9e6df`, tekst pomocniczy `#918e86`. Dane: Słońce `#e9b44c`, Ziemia `#5aa2e0`. Stany: ok `#7dbb78`, ostrzeżenie `#d9923b`, błąd `#e0685f`. Stare nazwy zmiennych (`--panel`, `--border`, `--accent`…) zostają jako aliasy, żeby style widoków nie pękły w trakcie.
- **Zaznaczenie** (aktywna zakładka, wybrany scenariusz, wybrany preset) = jasny tekst + kreska 2 px, nie bursztyn.
- **Typografia:** IBM Plex Sans (tekst) i IBM Plex Mono (liczby, współrzędne, czas, etykiety osi), osadzone lokalnie przez `@fontsource/ibm-plex-sans` i `@fontsource/ibm-plex-mono` – **dwie nowe zależności**, demo działa offline. Etykiety sekcji: 11 px, wersaliki, rozstrzelone.
- **Kształt:** promień 2 px, linie 1 px, bez cieni. Przyciski prostokątne; główna akcja = jasne wypełnienie, reszta = obrys.
- **Fokus:** widoczny obrys 2 px na wszystkich kontrolkach.

### 2. Wspólne formaty (`web/src/app/format.ts`, nowy, z testami)

- Czas: `19 May 2027 19:13 UTC` (koniec z `2027-05-19T19:13:16Z` w napisach).
- Współrzędne: `89.45°S 137.30°W` – zawsze półkule, długość w zakresie −180…180 (koniec z `315.0°E`).
- Godziny, procenty, stopnie – jedna funkcja na każde, kropka dziesiętna.
- Tryb prowadzony zachowuje własny `guide/format.ts`.

### 3. Układ Expert (`web/src/App.tsx`, `SummaryStrip.tsx`)

```
┌ LUNAR LANDING SITE NAVIGATOR      Plan a landing | Expert tools     ⚠ approx. ephemeris ┐
├──────────────────────┬────────────────────────────────────────────────────────────────┤
│ SCENARIOS        + ⧉ │ Sky   Timeline   Compare   Map   Windows                        │
│ ▌Shackleton ridge    │────────────────────────────────────────────────────────────────│
│  Nobile Rim 1      × │                                                                │
│ SITE   [select    ▾] │                    aktywny widok                               │
│ LAT [    ] LON [   ] │                 (cała pozostała przestrzeń)                    │
│ START  [19 May 19:13]│                                                                │
│ WINDOW [14 days   ▾] │                                                                │
│ ──────────────────── │                                                                │
│ SUN    up · 100%     │                                                                │
│        no set        │                                                                │
│ EARTH  up · 100%     │                                                                │
│        sets in 335 h │                                                                │
└──────────────────────┴────────────────────────────────────────────────────────────────┘
```

- Panel boczny 300 px, przewijany osobno; scena zajmuje resztę, szerokość aplikacji do 1600 px (dziś 1100).
- Status Słońca i Ziemi to cztery wiersze w panelu, nie przyklejony pasek.
- Ostrzeżenie o przybliżonych efemerydach: jedna plakietka w nagłówku z opisem w `title` i dla czytników.
- Scenariusze jako lista wierszy; „dodaj" i „duplikuj" jako dwa małe przyciski przy nagłówku, „usuń" przy wierszu. Zachowanie bez zmian.
- Poniżej 900 px panel składa się nad scenę (jedna kolumna); status zostaje jednym zwartym wierszem.

### 4. Tryb prowadzony (`web/src/app/guide/guide.css` + drobne zmiany znaczników)

Struktura i teksty bez zmian. Nowy styl: kroki oddzielone liniami zamiast pudełek, opcje jako wiersze wyboru, emoji zastąpione znakami w kolorze danych, oceny `Great / Okay / Poor` jako tekst z kropką stanu. Pasek dzień-po-dniu dostaje daty na osi.

### 5. Wykresy

- **Sky:** podpisy „Sun" i „Earth" przy znacznikach; oś azymutu co 45° ze stopniami i stronami świata; większe opisy osi; ślad pod linią terenu przerywany; znaczniki początku i końca okna na śladzie; pod wykresem suwak czasu (dziś w tym widoku nie da się ruszyć kursorem); odczyt jako trzy wiersze tabeli mono.
- **Timeline:** odczyt „Sun sets in… / Earth sets in…" w stałym wierszu nad wykresem zamiast dymka nachodzącego na pasy; procent widoczności na końcu każdego pasa; pełne podziałki osi wysokości; obszar pod horyzontem przyciemniony; podziałki czasu wyrównane do pełnych dni.
- **Compare:** metryki w jednej tabeli (wiersz = metryka, kolumna = scenariusz), najlepsza wartość w wierszu wyróżniona; pasy okien pod tabelą na wspólnej osi czasu.
- **Windows:** skala jednobarwna od ciemnej do jasnej (jaśniej = lepiej) z wartościami min/max na legendzie; komórki z miesiącem startu zamiast gołego numeru; obrys = spełnia wymagania; panele wymagań bez pudełek-w-pudełkach; liczby w tabeli fontem mono.
- Kolory i formy wykresów zweryfikuję ze skillem `dataviz` (kontrast, rozróżnialność Słońce/Ziemia także bez koloru – różny krój linii).

### 6. Mapa Księżyca (`web/src/views/map/`)

- **Scena:** globus wypełnia widok (wysokość = okno minus nagłówek), panel nakładki dokowany z prawej, nie pod mapą.
- **Kamera:** „South pole" i „North pole" płynnie przelatują dokładnie nad biegun (dziś: skok na 60°S) i przybliżają czapę; „Near side" wraca do widoku z Ziemi; przyciski + / −. Kółko myszy przybliża, bo mapa mieści się w oknie i nie blokuje przewijania strony.
- **Orientacja:** siatka co 30° oraz pierścienie 80° i 85° przy biegunach; linia terminatora; punkty „Sun overhead" i „Earth overhead" z podpisami.
- **Miejsca:** większe znaczniki, podpisy HTML (aktywny scenariusz i scenariusze zawsze, katalog po przybliżeniu lub najechaniu), ukrywane po niewidocznej stronie globusa.
- **Odczyt:** najechanie pokazuje współrzędne i nazwę miejsca; kliknięcie w powierzchnię działa jak dziś (przenosi aktywny scenariusz).
- **Legenda** w rogu mapy, nie w akapicie pod spodem.

### 7. Optimization Overlay

- **Strefy (zostają):** delikatny odcień (ok. 20% krycia zamiast 48%), ostra krawędź, tekstura 1024×512 z wygładzoną granicą; cień jako przyciemnienie. Granice stref dodatkowo jako cienkie linie. Teren pozostaje widoczny.
- **Kandydaci (nowa warstwa):** każdy punkt rankingu to znacznik w kolorze wyniku (ta sama skala co w Windows); pięć najlepszych większych i z numerem. Mgiełka wokół kandydatów znika. Najechanie = wynik i metryki, kliknięcie = wybór w panelu.
- **Uczciwy opis w legendzie:** strefy to chwila kursora na gładkiej kuli; wyniki to całe okno z terenem. Dziś obie rzeczy są zmieszane w jednym kolorze i sobie przeczą przy biegunie.
- **Włączenie nakładki** przelatuje kamerą nad najlepszy punkt.
- **Panel:** presety z ludzkimi nazwami (`Balanced`, `Power first`, `Comms first`, `Both at once`) + trzy suwaki wag (normalizowane do 100%, zapytanie z opóźnieniem 300 ms); karta zwycięzcy z paskami Sun / Earth / Both i najdłuższą ciemnością; ranking jako tabela 8 wierszy z mini-paskami, remisy oznaczone tą samą pozycją; najechanie na wiersz podświetla punkt na globusie; „Move scenario here" działa dla wybranego wiersza, nie tylko zwycięzcy.
- Punkty siatki nazywane `Grid 88.5°S 45.0°W` (nazwa budowana we frontendzie ze współrzędnych; API bez zmian).
- Podczas przeliczania stare dane zostają przygaszone zamiast znikać.

## Ograniczenia i ryzyka

- Tekstura LROC 2k jest przy biegunie rozmyta (ściśnięcie odwzorowania). Siatka i podpisy to łagodzą; lepsza tekstura polarna to osobne zadanie.
- `heatmap.test.ts` testuje mgiełkę kandydatów – testy zostaną zmienione razem z usunięciem mgiełki.
- 021 stoi na 020 (w recenzji). PR 021 trzeba scalać po 020.
- Zmiana dotyka stylów wszystkich widoków (cudze moduły w rozumieniu `AGENTS.md`) – to świadoma decyzja zakresu tego zadania; logika widoków poza mapą zmienia się tylko tam, gdzie wymaga tego wykres.

## Decyzje autora projektu (do skorygowania)

- Fonty IBM Plex przez `@fontsource` zamiast fontu systemowego.
- Zaznaczenie bez koloru akcentu.
- Suwak czasu w widoku Sky.
- Compare jako tabela zamiast kart.
- Przelot kamery po włączeniu nakładki.

## Jak sprawdzę

- `npm run lint`, `npm run build`, `npm test` (nowe testy: `format`, linie wielkich kół i terminatora, piksele nakładki, nazwy punktów siatki, normalizacja suwaków).
- Przegląd w przeglądarce na żywym backendzie: tryb prowadzony, 5 widoków, nakładka z każdym presetem, szerokości 1440 / 1024 / 390 px, nawigacja klawiaturą.
- Kontrast tekstu i danych (WCAG AA) skillem `design:accessibility-review`.
