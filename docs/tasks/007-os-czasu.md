# 007 – Oś czasu: okna zasilania i łączności

- **Status:** wolne
- **Właściciel:** – (sugerowana: osoba D, po zadaniu 006)
- **Moduł:** frontend – widok `timeline`
- **Gałąź:** `feat/007-os-czasu`
- **Zależy od:** –

## Cel

Planista widzi cały dzień księżycowy naraz: kiedy jest zasilanie, kiedy łączność, kiedy jedno i drugie, i ile zostało do najbliższej zmiany. Przesuwając kursor albo włączając animację, ogląda, jak zmienia się niebo.

## Zakres

Obowiązkowo:

- Oś czasu obejmująca okno scenariusza z dwoma pasami: Słońce (zasilanie) i Ziemia (łączność), zbudowanymi z pola `visible`.
- Trzeci pas: oba naraz.
- Wykres wysokości obu ciał w czasie.
- Kursor czasu: kliknięcie i przeciąganie wywołuje `setCursorUtc`; pozycja zawsze z `cursor_utc`.
- Przy kursorze: czas do najbliższego zachodu lub wschodu Słońca i Ziemi.
- Animacja: start, pauza, wybór prędkości; przesuwa kursor, więc widok nieba animuje się razem z nią.

Jeśli zostanie czas:

- Przybliżanie fragmentu osi.
- Podziałka w dniach księżycowych obok dat UTC.

Poza zakresem:

- Zestawienie kilku scenariuszy na jednej osi – to zadanie 008.

## Pliki

`web/src/views/timeline/**`. Style trzymaj w tym katalogu.

## Kontrakty

Dostaje `ViewProps` (`web/src/app/scenario.ts`). Korzysta z `api.timeline()` przez `useAsync`.

## Kryteria ukończenia

- [ ] Przeciągnięcie kursora zmienia położenie Słońca w zakładce Sky (po zadaniu 006; wcześniej – tekst kursora w zaślepce).
- [ ] Animacja zatrzymuje się na końcu okna i przy opuszczeniu zakładki nie zostawia działającego licznika.
- [ ] Funkcje wyznaczające okna i odliczanie z przebiegu mają testy.
- [ ] `npm run lint`, `npm run build`, `npm test` zielone.

## Notatki

- Zakładki są odmontowywane przy przełączaniu, a kursor żyje w powłoce – stan animacji (gra/pauza) zniknie po zmianie zakładki. Jeśli ma przetrwać, uzgodnij z integratorem dodanie pola do `ViewProps`.
