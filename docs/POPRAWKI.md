# Poprawki po przeglądzie

Uwagi integratora do oddanych zadań. Plik aktualizuje integrator; autor po wprowadzeniu poprawki wypycha ją na swoją gałąź i daje znać – punkt zostanie tu odhaczony.

Przed poprawkami dociągnij `main` do swojej gałęzi (`git merge main`): są tam zmiany, od których zależą testy po połączeniu.

## Przegląd 1 – 2026-11-14

Sprawdzone gałęzie: 001, 002, 004, 005. Wszystkie przechodzą własne testy i łączą się bez konfliktów. Wyniki 001 i 002 sprawdzone na prawdziwych danych NASA (jądra SPICE, model wysokości LOLA).

| Zadanie | Osoba | Wynik | Stan |
| --- | --- | --- | --- |
| 001 – efemerydy | A | 6 punktów kontrolnych zgodnych z JPL Horizons, błąd do 0,00002°; 5000 próbek w 0,2 s | do scalenia po poprawce A1 |
| 002 – horyzont | B | położenie kraterów i wartości profilu potwierdzone niezależnym przeliczeniem; profil w 0,1 s | do scalenia; B1 może wejść osobno |
| 004 – katalog | E | 17 z 19 miejsc poprawnych; dwa miejsca kandydujące błędne | wymaga poprawek E1 i E2 |
| 005 – powłoka | C | testy, lint i build przechodzą; interfejs nieobejrzany w przeglądarce | do scalenia; C1–C3 mogą wejść osobno |

### Osoba A – zadanie 001

- [ ] **A1 (przed scaleniem).** `data/scripts/fetch_kernels.py` wyłącza sprawdzanie certyfikatu TLS (`check_hostname = False`, `verify_mode = ssl.CERT_NONE`). Usuń te linie i własny kontekst SSL – pobieranie z serwera NAIF działa z domyślną weryfikacją.
- [ ] **A2.** Otwórz PR; status w pliku zadania to „w recenzji", a PR-a nie ma.

### Osoba B – zadanie 002

- [ ] **B1.** `sample_heights()` w `backend/app/terrain/lola.py` zwraca `None`, gdy choć jeden punkt leży poza rastrem, przez co cały profil jest odrzucany. Skutek: miejsca między −80,0° a −80,3° (w katalogu IM-1 Odysseus: −80,13°, 1,44°) dostają płaski horyzont, bo promień 160 km wychodzi poza model. Pomijaj punkty spoza rastra, a `None` zwracaj tylko wtedy, gdy poza rastrem jest samo miejsce obserwatora. Dodaj test dla miejsca przy krawędzi.
- [ ] **B2.** Otwórz PR; status w pliku zadania to „w recenzji", a PR-a nie ma.

### Osoba C – zadanie 005

- [ ] **C1.** `web/src/app/SummaryStrip.tsx`: napis „Visible now" opisuje początek okna scenariusza, nie bieżącą chwilę. Zmień na „Visible at start" (i odpowiednio „Below horizon at start").
- [ ] **C2.** Ostrzeżenie „Approximate data" pojawia się zawsze, gdy horyzont nie pochodzi z LOLA – czyli na stałe dla każdego miejsca poza biegunem południowym. Pokazuj je tylko dla `meta.ephemeris = "placeholder"`. Płaski horyzont opisz osobną, spokojniejszą informacją (np. „Terrain not modelled at this site – flat horizon assumed"). Usuń zdanie o „SPICE and LOLA tasks" – to sprawa zespołu, nie użytkownika.
- [ ] **C3.** „Add scenario" i „Duplicate" robią to samo (kopia aktywnego scenariusza). Zostaw jeden przycisk albo je zróżnicuj.
- [x] **Okno „3 lunar days" zwracało błąd 422** (12 757 próbek przy limicie 10 000). Naprawione po stronie API: limit podniesiony do 20 000. Bez zmian we frontendzie.

Do wiadomości przy zadaniu 008: wspólny kursor czasu nie jest zerowany przy zmianie aktywnego scenariusza, więc może wskazywać chwilę spoza jego okna. Widoki powinny przycinać go do zakresu.

### Osoba E – zadanie 004

- [ ] **E1 (przed scaleniem).** `nobile-rim-1` ma zły znak długości: w katalogu `-53.7`, a cytowane źródło podaje 53,27°E (szer. −85,28°).
- [ ] **E2 (przed scaleniem).** `nobile-rim-1` i `de-gerlache-rim-2` mają współrzędne środków kraterów, a nazwy mówią o krawędziach. Dla de Gerlache daje to dno krateru: 0% słońca i 0% łączności w całym miesiącu. Wybierz punkty na krawędzi (np. w Quickmap) i zapisz w `data/sites.sources.md`, skąd pochodzą – albo zmień nazwy tak, by mówiły prawdę.
- [ ] **E3.** Dodaj miejsce o dobrym oświetleniu: grzbiet przy kraterze Shackleton, ok. −89,45°, −137,3° (współrzędne potwierdź w źródle). W listopadzie–grudniu 2026 ma 100% słońca i 45% łączności, podczas gdy punkt odniesienia −89,5°, 0° leży w zagłębieniu (horyzont do 9,5°) i ma 24% słońca. Ta para dobrze pokazuje w demie, ile zmienia małe przesunięcie miejsca.

### Integrator – zrobione na `main`

- [x] Pamięć podręczna API jest czyszczona między testami (`backend/tests/conftest.py`). Bez tego test horyzontu z 002 nie przechodził razem z cache z 004.
- [x] Fixtures powstają zawsze z modelu przybliżonego, także gdy jądra SPICE są pobrane.
- [x] Limit próbek na zapytanie: 20 000.

### Integrator – po scaleniu

- [ ] Przeliczyć gotowe profile horyzontu (`data/horizons/`) dla wszystkich miejsc przy biegunie z poprawionego katalogu.
- [ ] Dopisać do `README.md` pobieranie modelu wysokości i przeliczanie profili.
