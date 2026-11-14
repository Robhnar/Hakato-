# 016 – Margines niepewności (elipsa lądowania, tarcza Słońca) i zjawiska dodatkowe

- **Status:** scalone
- **Właściciel:** osoba E
- **Moduł:** `metrics`, `terrain`, `ephemeris`
- **Gałąź:** `feat/016-niepewnosc-i-zacmienia`
- **Zależy od:** 011, 013

## Cel

Lądownik nie trafia idealnie w punkt geometryczny, model wysokości LOLA ma skończoną rozdzielczość (`120 m/px`), a Słońce nie jest punktem lecz tarczą o średnicy kątowej ~`0,53°` (na biegunie częściowy wschód/zachód trwa wiele godzin). Dodatkowo w wieloletnim horyzoncie zdarzają się zaćmienia Słońca przez Ziemię widziane z Księżyca, powodujące kilkugodzinną utratę zasilania w środku dnia księżycowego. Zadanie dodaje obsługę marginesu niepewności oraz detekcję zaćmień i efektywnej mocy paneli.

## Zakres

Obowiązkowo (w ramach rozszerzenia):

- **Margines horyzontu i tarcza słoneczna (`solar_disc_fraction`):**
  - Zamiast binarnego progu środka tarczy (`el_deg > horizon_deg`), wyznaczanie ułamka widocznej powierzchni tarczy słonecznej o promieniu kątowym $R_\odot \approx 0{,}266^\circ$ względem lokalnego horyzontu.
  - Wyznaczanie pasma niepewności czasu oświetlenia (`typical` vs `worst_case` / `best_case`) przy zaburzeniu profilu horyzontu o $\pm \Delta h$ (domyślnie $\pm 0{,}2^\circ$).
- **Zaćmienia Słońca przez Ziemię (widziane z Księżyca):**
  - Ponieważ z powierzchni Księżyca promień kątowy Ziemi wynosi aż $R_\oplus \approx 0{,}95^\circ$ (średnica ~`1,9°`), gdy separacja kątowa środków Słońca i Ziemi spada poniżej $R_\oplus + R_\odot \approx 1{,}22^\circ$, następuje częściowe lub całkowite zaćmienie Słońca przez Ziemię.
  - Funkcja `detect_eclipses(times_utc, sun_az_el, earth_az_el)` zwracająca listę zaćmień (`start_utc`, `end_utc`, `max_obscuration_fraction`, `duration_hours`) w badanym oknie.

Jeśli zostanie czas:

- **Elipsa lądowania (rozrzut przestrzenny):** próbkowanie 5–9 punktów wokół nominalnego miejsca lądowania (środek + 4/8 kierunków w promieniu np. `240 m` na rastrze LOLA) i raportowanie wyniku najgorszego (`worst_case`) oraz typowego (`median`).
- **Moc paneli dla zadanej orientacji:** przeliczenie strumienia słonecznego ($\cos \theta$) dla panelu poziomego, nachylonego pod stałym kątem lub pionowego masztu śledzącego azymut Słońca (optymalnego na biegunie).
- **Widoczność stacji naziemnych DSN (Goldstone, Madrid, Canberra):** uwzględnienie obrotu Ziemi (kąt godzinny stacji i minimalna elewacja anteny `10°`).

Poza zakresem:

- Zmiana podstawowego kontraktu zadań 001–010 (wszystkie nowe pola są opcjonalne / dodatkowe).

## Pliki

`backend/app/metrics/uncertainty.py`, `backend/tests/test_uncertainty.py`, opcjonalnie rozszerzenie `backend/app/api/schemas.py` i `web/src/api/types.ts` po uzgodnieniu z integratorem.

## Kontrakty

Rozszerza wynik `metrics.summary` / `metrics.search_windows` o opcjonalne sekcje `uncertainty` i `eclipses`.

## Kryteria ukończenia

- [x] Test jednostkowy tarczy słonecznej: gdy środek Słońca jest dokładnie na linii horyzontu (`el == horizon`), ułamek oświetlenia wynosi `0.5`, dla `el <= horizon - 0.266°` wynosi `0.0`, a dla `el >= horizon + 0.266°` wynosi `1.0`.
- [x] Test jednostkowy detekcji zaćmień: dla znanego historycznego/przyszłego zaćmienia Księżyca (widzianego z Księżyca jako zaćmienie Słońca przez Ziemię) funkcja wykrywa kilkugodzinne okno zaćmienia.
- [x] `ruff` i `pytest` zielone.
