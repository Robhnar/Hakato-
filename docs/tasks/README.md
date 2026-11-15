# TODO

Lista prac. Bez opisów: szczegóły zostają w historii gita i w `docs/ARCHITECTURE.md`. Nowa pozycja = jedna linia; szablon, gdy zadanie wymaga opisu: [`_SZABLON.md`](_SZABLON.md).

## Do zrobienia

- [ ] Zgłoszenie Space Apps: link do dema (wideo ≤30 s lub ≤7 slajdów)
- [ ] Sprawdzić linki w `docs/submission/data-and-references.md`
- [ ] Ostrzeżenie oxlint w `web/src/views/windows/index.tsx` (`setState` w efekcie)

## Zrobione

- [x] 001 Efemerydy
- [x] 002 Horyzont LOLA
- [x] 003 Metryki i okna
- [x] 004 Katalog miejsc
- [x] 005 Powłoka aplikacji
- [x] 006 Widok nieba
- [x] 007 Oś czasu
- [x] 008 Porównanie
- [x] 009 Mapa i globus
- [x] 010 Zgłoszenie Space Apps
- [x] 011 Kontrakt `/api/windows`
- [x] 012 Kalendarz 2027–2035
- [x] 013 Wyszukiwarka okien i opóźnienia
- [x] 014 Mapa cieplna okien
- [x] 015 Wymagania i opóźnienie startu
- [x] 016 Niepewność i zaćmienia
- [x] 017 Kontrakt `/api/optimal-site`
- [x] 018 Silnik optymalnego punktu
- [x] 019 Warstwa ON/OFF na globusie
- [x] 020 Tryb prowadzony
- [x] 021 Odświeżenie UI
- [x] 022 Blokada SPICE
- [x] 023 Poprawki z audytu
- [x] 024 Wybór miejsca na mapie
- [x] 025 Ziemia na mapie

## Pliki, w których łatwo o konflikt

Zmieniaj je tylko wtedy, gdy trzeba, i możliwie małą zmianą.

- `web/package.json`, `web/package-lock.json`, `backend/pyproject.toml` – nowe zależności.
- `backend/app/api/schemas.py`, `web/src/api/types.ts`, `web/src/app/scenario.ts` – kontrakty; zmiana tylko jako osobny PR.
- `contracts/fixtures/*` – generowane skryptem, nie edytuj ręcznie.
