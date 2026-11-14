# 003 – Metryki: dokładne okna i czas do zachodu

- **Status:** w recenzji
- **Właściciel:** Przemek (Osoba A)
- **Moduł:** `metrics`
- **Gałąź:** `feat/003-metryki-okna`
- **Zależy od:** – (można zacząć od razu; pełny sens po scaleniu 001 i 002)

## Cel

Planista ma dostać odpowiedź „Słońce zajdzie za 51,5 godziny", a nie „gdzieś między dwiema próbkami". Wersja podstawowa metryk już działa, ale wschody i zachody zna z dokładnością do kroku próbkowania (10 minut w podsumowaniu, godzina na osi czasu).

## Zakres

Obowiązkowo:

- Momenty wschodu i zachodu wyznaczane interpolacją między próbkami (różnica wysokości ciała i horyzontu przechodzi przez zero) – dokładność około minuty przy kroku 10 minut. Dotyczy `windows` i `hours_until_change`.
- `visible_fraction` liczone z długości okien, nie z liczby próbek.
- Testy na sztucznych przebiegach: znane momenty przejścia, przypadki brzegowe (widoczne cały czas, wcale, przejście dokładnie w próbce, okno otwarte na końcu zakresu).
- `/api/summary` dla 30 dni poniżej 1 s (z modelem przybliżonym; ze SPICE zmierz po scaleniu 001).

Jeśli zostanie czas – **każde wymaga wcześniejszego PR zmieniającego kontrakt**:

- Nowe pola podsumowania: łączny czas widoczności w godzinach, najdłuższe okno, okna jednoczesnej widoczności Słońca i Ziemi (zasilanie + łączność).
- Słońce jako tarcza (promień ok. 0,27°): częściowe zasłonięcie zamiast tak/nie.

Poza zakresem:

- Skąd biorą się położenia (001) i horyzont (002).

## Pliki

`backend/app/metrics/**`, `backend/tests/test_metrics*.py`. Nowe pola: dodatkowo `backend/app/api/schemas.py`, `web/src/api/types.ts`, `docs/ARCHITECTURE.md`, `contracts/fixtures/` – w osobnym PR.

## Kontrakty

Udostępnia `metrics.timeline()` i `metrics.summary()` (`docs/ARCHITECTURE.md`). Korzysta z `ephemeris.body_positions()` i `terrain.horizon_profile()`.

## Kryteria ukończenia

- [x] Testy z interpolacją przechodzą; istniejące testy metryk nadal przechodzą albo są świadomie zaktualizowane (opisz w PR).
- [x] Fixtures odświeżone (`python -m scripts.export_fixtures`).
- [x] `ruff` i `pytest` zielone.
