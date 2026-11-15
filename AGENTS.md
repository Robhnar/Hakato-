# Zasady pracy w repo

Obowiązują wszystkich pracujących w repo, ludzi i narzędzia. Powstały po to, żeby równoległe prace dało się scalić bez konfliktów.

## Projekt

Rozwiązanie wyzwania Lunar Landing Site Navigator (NASA Space Apps 2026). Treść wyzwania: `lunar-landing-site-navigator-details.md`, dozwolone źródła danych: `lunar-landing-site-navigator-resources.md`.

## Zanim zaczniesz

1. Wybierz pozycję z `docs/tasks/README.md`.
2. Przeczytaj `docs/ARCHITECTURE.md` (moduły i kontrakty).
3. Uruchom projekt i testy według `README.md`.
4. Utwórz gałąź z aktualnego `main`: `feat/<nr>-<krótki-opis>`.

## Zasady

- **Trzymaj się zakresu zadania.** Zmieniaj tylko pliki zadania lub swojego modułu. Błąd w cudzym module zgłoś w opisie PR.
- **Nie zmieniaj kontraktów po cichu.** Kontrakt to endpointy API, formaty danych, schemat bazy i wspólne typy. Zmiana idzie osobnym PR-em razem z `docs/ARCHITECTURE.md`.
- **Nie pushuj do `main`** i nie scalaj własnych PR-ów.
- **Nie przepisuj historii** współdzielonych gałęzi (`push --force`, rebase po otwarciu PR).
- **Żadnych sekretów w repo.** Klucze trzymaj w `.env`; nową zmienną dopisz do `.env.example` bez wartości.
- **Nowa zależność** – wymień ją w opisie PR razem z powodem.
- **Bez refaktorów przy okazji.**
- **Nie zostawiaj atrap.** Zaślepkę albo coś, co nie działa, opisz wprost w PR.

## Oddawanie pracy

1. Uruchom testy i lint (polecenia w `README.md`).
2. Odhacz pozycję w `docs/tasks/README.md`.
3. Otwórz PR do `main` według szablonu, jedna pozycja to jeden PR.
4. Opisz, jak sprawdziłeś, że to działa, i czego nie sprawdziłeś.

## Gdy coś jest niejasne

Zadanie jest sprzeczne z architekturą, brakuje kontraktu albo potrzebna jest zmiana w cudzym module: zatrzymaj się i zapytaj.
