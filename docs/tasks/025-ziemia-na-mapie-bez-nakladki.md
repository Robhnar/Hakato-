# 025 – Mapa: granica widoczności Ziemi także bez nakładki

- **Status:** w recenzji
- **Właściciel:** Claude Code
- **Moduł:** widok `map` (`web/src/views/map/`)
- **Gałąź:** `feat/025-ziemia-na-mapie`
- **Zależy od:** 021 (scalone)

## Cel

Niebieska przerywana linia „Earth visibility limit" i podpis „Earth overhead" mają być widoczne na mapie zawsze, a nie tylko po włączeniu „Optimal zones".

## Zakres

Obowiązkowo:

- Punkt podziemski Ziemi liczony z odpowiedzi `/api/timeline`, którą widok Map już pobiera dla Słońca (kierunek ciała widziany z (0°, 0°)), więc bez dodatkowych zapytań. Z włączoną nakładką nadal używany jest dokładny punkt z `cursor_bodies`.
- Wspólna funkcja `subBodyPoint(az_deg, el_deg)` w `geo.ts` dla Słońca i Ziemi.

Poza zakresem:

- Zmiana domyślnego widoku kamery (patrz Notatki).
- Backend i kontrakty API.

## Pliki

`web/src/views/map/geo.ts`, `web/src/views/map/geo.test.ts`, `web/src/views/map/index.tsx`, ten plik.

## Kontrakty

Bez zmian.

## Kryteria ukończenia

- [x] Przy wyłączonych „Optimal zones" widać niebieską przerywaną granicę widoczności Ziemi i podpis „Earth overhead".
- [x] Test `subBodyPoint`: Słońce zgodne z API (0.748°, 149.63°), Ziemia w granicach 0.05° od `cursor_bodies`.
- [x] `npm run lint`, `npm run build`, `npm test` przechodzą (198 testów).

## Notatki

- Błąd metody: punkt podziemski z (0°, 0°) różni się od dokładnego o ok. 0.03° (paralaksa obserwatora na powierzchni), czyli ok. 1 km na globusie; dla Słońca różnica jest pomijalna.
- W domyślnym widoku `Near side` kamera patrzy w stronę Ziemi, więc granica (koło 90° od punktu podziemskiego) leży na brzegu tarczy i jest niewidoczna; po obrocie albo wyborze `South pole` jest dobrze widoczna. Nie zmieniałem domyślnego widoku.
