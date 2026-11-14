# 008 – Porównanie scenariuszy obok siebie

- **Status:** w recenzji
- **Właściciel:** osoba C
- **Moduł:** frontend – widok `compare`
- **Gałąź:** `feat/008-porownanie`
- **Zależy od:** 005 (wygodne dodawanie scenariuszy); zacząć można wcześniej

## Cel

Start się opóźnił albo trzeba zmienić miejsce: planista zestawia dwa–cztery warianty i od razu widzi, który daje więcej słońca i łączności. To sedno wyzwania – „szybkie porównanie scenariuszy".

## Zakres

Obowiązkowo:

- Zestawienie wszystkich scenariuszy z `scenarios`: dla każdego udział czasu ze Słońcem i z Ziemią, najwyższe położenie obu ciał, stan na starcie i czas do zmiany (`api.summary`).
- Pasy okien widoczności wszystkich scenariuszy jeden pod drugim na wspólnej osi. Scenariusze o różnych datach startu: oś w godzinach od startu.
- Wyróżnienie najlepszej wartości w każdej metryce.
- Kliknięcie scenariusza wywołuje `selectScenario`.
- Sensowny widok przy jednym scenariuszu: zachęta do dodania drugiego.

Jeśli zostanie czas:

- Różnice względem scenariusza aktywnego („+38 h słońca").
- Szybkie warianty: „to samo miejsce, start za 7 dni".

Poza zakresem:

- Dodawanie i usuwanie scenariuszy – robi to powłoka (005).

## Pliki

`web/src/views/compare/**`. Style trzymaj w tym katalogu.

## Kontrakty

Dostaje `ViewProps` (`web/src/app/scenario.ts`). Korzysta z `api.summary()` i `api.timeline()` przez `useAsync`.

## Kryteria ukończenia

- [x] Dwa scenariusze o różnych miejscach pokazują różne liczby i różne pasy okien.
- [x] Błąd pobierania jednego scenariusza nie psuje pozostałych.
- [x] Funkcja wybierająca najlepszą wartość ma testy (także remis i brak danych).
- [x] `npm run lint`, `npm run build`, `npm test` zielone.

## Notatki

- W trybie fixtures (`npm run dev:fixtures`) każdy scenariusz dostaje te same dane, więc do sprawdzenia różnic potrzebny jest backend.
- `useAsync` obsługuje jedno zapytanie; dla listy scenariuszy wydziel komponent wiersza, który woła go sam.
