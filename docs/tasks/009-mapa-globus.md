# 009 – Mapa: globus Księżyca z miejscami lądowania

- **Status:** wolne
- **Właściciel:** – (sugerowana: osoba E, po zadaniu 004)
- **Moduł:** frontend – widok `map`
- **Gałąź:** `feat/009-mapa-globus`
- **Zależy od:** –

## Cel

Użytkownik widzi, gdzie na Księżycu leżą porównywane miejsca, i rozumie zależność przestrzenną: miejsce – Słońce – Ziemia. Może też wskazać własne miejsce kliknięciem.

## Zakres

Obowiązkowo:

- Obracany globus 3D Księżyca z teksturą powierzchni.
- Znaczniki miejsc z katalogu (`api.sites`) i scenariuszy; aktywny scenariusz wyróżniony.
- Kliknięcie znacznika scenariusza wywołuje `selectScenario`, kliknięcie w powierzchnię – `pickLocation(lat, lon)`.
- Przycisk ustawiający widok na biegun południowy.
- Oświetlenie globusa zgodne z położeniem Słońca w chwili `cursor_utc`: widać, która część jest w dzień, a która w nocy.

Jeśli zostanie czas:

- Kierunek ku Ziemi (strzałka albo punkt podziemski).
- Płaska mapa okolic bieguna w rzucie biegunowym.

Poza zakresem:

- Rzeźba terenu w 3D i cienie od terenu.

## Pliki

`web/src/views/map/**`, tekstura w `web/public/` (najwyżej 2 MB).

## Kontrakty

Dostaje `ViewProps` (`web/src/app/scenario.ts`). Korzysta z `api.sites()`.

Kierunek Słońca: API nie podaje punktu podsłonecznego. Na start wyznacz go z `api.timeline()` dla punktu pomocniczego albo z prostego wzoru; jeśli potrzebujesz tego dokładnie, zaproponuj nowy endpoint w osobnym PR.

## Kryteria ukończenia

- [ ] Znacznik Apollo 11 leży na widocznej stronie, blisko równika, na wschód od środka tarczy; kliknięcie w jego okolicę daje współrzędne zbliżone do katalogowych.
- [ ] Przeliczenia szerokość/długość ↔ punkt na kuli mają testy, w tym bieguny i długość ±180°.
- [ ] Zakładka nie zostawia działającej pętli renderowania po jej opuszczeniu.
- [ ] `npm run lint`, `npm run build`, `npm test` zielone.

## Notatki

- Tekstura: użyj mozaiki z zasobów NASA (np. LROC) i zapisz w PR źródło oraz warunki użycia.
- Biblioteka 3D to nowa zależność – podaj ją w PR.
- Odbicie lustrzane tekstury albo zamieniony znak długości to typowy błąd; sprawdź na Apollo 11 i Mare Crisium (widoczna strona, wschód).
