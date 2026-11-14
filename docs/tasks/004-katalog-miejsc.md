# 004 – Katalog miejsc lądowania i szybkość API

- **Status:** wolne
- **Właściciel:** – (sugerowana: osoba E, przed zadaniem 009)
- **Moduł:** `data`, `api`
- **Gałąź:** `feat/004-katalog-miejsc`
- **Zależy od:** –

## Cel

Użytkownik wybiera miejsce z listy znanych lądowań i celów przyszłych misji, zamiast wpisywać współrzędne. Teraz katalog ma 5 wpisów startowych o niezweryfikowanych współrzędnych.

## Zakres

Obowiązkowo:

- `data/sites.json`: co najmniej 15 miejsc – wszystkie lądowania Apollo, wybrane misje innych krajów, lądowania i cele CLPS oraz innych misji komercyjnych, kilka kandydatów przy biegunie południowym (np. regiony rozważane dla Artemis). Kategorie według kontraktu.
- Każda współrzędna ze źródłem: plik `data/sites.sources.md` z adresem dla każdego wpisu. Zweryfikuj też 5 wpisów startowych. Długość geograficzna dodatnia na wschód, zakres −180…180.
- Test katalogu: unikalne `id`, zakresy współrzędnych, każda kategoria z kontraktu jest niepusta.
- Pamięć podręczna odpowiedzi `/api/timeline`, `/api/summary` i `/api/horizon` dla powtarzających się zapytań.

Jeśli zostanie czas:

- Kompresja odpowiedzi.
- Krótki opis miejsca do pokazania w interfejsie – to nowe pole, więc najpierw PR zmieniający kontrakt.

Poza zakresem:

- Interfejs wyboru miejsca (zadanie 005), mapa (009).

## Pliki

`data/sites.json`, `data/sites.sources.md`, `backend/app/api/routes.py`, `backend/tests/test_sites.py`, `contracts/fixtures/sites.json` (przez skrypt).

## Kontrakty

Udostępnia `GET /api/sites` – kształt wpisu bez zmian (`docs/ARCHITECTURE.md`).

## Kryteria ukończenia

- [ ] Co najmniej 15 miejsc, każde ze źródłem.
- [ ] Fixtures odświeżone (`python -m scripts.export_fixtures`).
- [ ] `ruff` i `pytest` zielone.

## Notatki

- Zmiana pierwszego wpisu w katalogu zmienia domyślny scenariusz aplikacji – zostaw na początku miejsce ciekawe na pierwszy rzut oka (biegun południowy).
