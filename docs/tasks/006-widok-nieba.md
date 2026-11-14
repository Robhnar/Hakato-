# 006 – Widok nieba: panorama horyzontu

- **Status:** w recenzji
- **Właściciel:** osoba E
- **Moduł:** frontend – widok `sky`
- **Gałąź:** `feat/006-widok-nieba`
- **Zależy od:** –

## Cel

Jeden rzut oka ma wystarczyć, żeby zobaczyć, gdzie nad horyzontem są Słońce i Ziemia i czy zasłania je teren. To centralna wizualizacja wyzwania: „położenie Słońca i Ziemi względem horyzontu".

## Zakres

Obowiązkowo:

- Panorama: oś pozioma to azymut 0–360° z oznaczeniem stron świata, oś pionowa to wysokość nad horyzontem.
- Sylwetka terenu z profilu horyzontu (`api.horizon`) jako wypełniony kształt.
- Słońce i Ziemia w chwili `cursor_utc`, wyraźnie odróżnione, z innym wyglądem, gdy są zasłonięte.
- Ślad drogi obu ciał w całym oknie scenariusza.
- Skala pionowa dobierana do danych: przy biegunie cała akcja mieści się w kilku stopniach, na równiku Słońce wchodzi na 90°.
- Podpis z liczbami: azymut i wysokość obu ciał, wysokość horyzontu pod nimi.

Jeśli zostanie czas:

- Tarcze w prawdziwej skali kątowej (Słońce ok. 0,5°, Ziemia ok. 1,9°).
- Przełącznik na rzut biegunowy (widok „z góry" na niebo).

Poza zakresem:

- Sterowanie czasem – kursor przesuwa oś czasu (007) i powłoka; ten widok tylko go odczytuje.

## Pliki

`web/src/views/sky/**`. Style trzymaj w tym katalogu.

## Kontrakty

Dostaje `ViewProps` (`web/src/app/scenario.ts`). Korzysta z `api.timeline()` i `api.horizon()` przez `useAsync`. Chwilę `cursor_utc` znajdź w `times_utc` jako najbliższą próbkę.

## Kryteria ukończenia

- [x] Na fixtures (`npm run dev:fixtures`) widać nierówny horyzont i Słońce chowające się za nim przy zmianie kursora.
- [x] Na danych z backendu dla Apollo 11 Ziemia stoi wysoko i prawie nieruchomo, a Słońce przechodzi przez całe niebo.
- [x] Funkcje przeliczające dane na współrzędne ekranu mają testy.
- [x] `npm run lint`, `npm run build`, `npm test` zielone.

Walidację backendu wykonano na modelu `placeholder` dostępnym na `main`; efemerydy SPICE są osobnym zadaniem.

## Notatki

- Azymut zawija się na 360°: ślad nie może rysować poziomej kreski przez cały wykres, gdy ciało przechodzi przez północ.
- Nowa biblioteka do wykresów albo grafiki – podaj ją w PR. Do tej panoramy wystarczy SVG.
