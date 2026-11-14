# Instrukcje dla asystentów AI

Ten plik czyta każdy model AI pracujący w tym repo (Claude Code przez `CLAUDE.md`, pozostałe narzędzia bezpośrednio). Obowiązuje tak samo ludzi.

Nad projektem pracuje równolegle kilka osób, każda ze swoim asystentem. Zasady poniżej istnieją po to, żeby te prace dało się scalić bez konfliktów.

## Zanim zaczniesz

1. Przeczytaj plik swojego zadania w `docs/tasks/`. Jeśli użytkownik nie wskazał zadania, zapytaj o nie, zamiast zgadywać.
2. Przeczytaj `docs/ARCHITECTURE.md` – podział na moduły i kontrakty między nimi.
3. Pobierz aktualny `main` i utwórz gałąź `feat/<nr-zadania>-<krótki-opis>` (np. `feat/003-logowanie`).

## Zasady pracy

- **Trzymaj się zakresu zadania.** Zmieniaj tylko pliki wymienione w zadaniu lub leżące w katalogu twojego modułu. Błąd w cudzym module zgłoś w opisie PR, nie naprawiaj go przy okazji.
- **Nie zmieniaj kontraktów po cichu.** Kontrakt to wszystko, z czego korzysta inny moduł: endpointy API, formaty danych, schemat bazy, wspólne typy. Zmiana kontraktu wymaga osobnego PR, który zmienia też `docs/ARCHITECTURE.md`.
- **Nie pushuj do `main`** i nie scalaj własnych PR-ów. Scalaniem zajmuje się integrator.
- **Nie przepisuj historii** współdzielonych gałęzi (`push --force`, rebase po otwarciu PR).
- **Żadnych sekretów w repo.** Klucze i hasła trzymaj w `.env` (jest w `.gitignore`); nową zmienną dopisz do `.env.example` bez wartości.
- **Nowa zależność** (biblioteka, usługa) – wymień ją w opisie PR razem z powodem.
- **Bez refaktorów przy okazji.** Formatowanie i porządki w cudzym kodzie powodują konflikty u innych.
- **Nie zostawiaj atrap.** Jeśli coś jest zaślepką albo nie działa, napisz to wprost w opisie PR.

## Oddawanie pracy

1. Uruchom testy i lint (polecenia w `README.md`) i upewnij się, że przechodzą.
2. Zaktualizuj status w pliku zadania.
3. Otwórz PR do `main` według szablonu. Jedno zadanie to jeden PR.
4. Opisz, jak sprawdziłeś, że to działa – i czego nie sprawdziłeś.

## Gdy coś jest niejasne

Zadanie jest sprzeczne z architekturą, brakuje kontraktu albo potrzebujesz zmiany w cudzym module: zatrzymaj się i powiedz o tym użytkownikowi. Zgadywanie w takich miejscach kończy się pracą, której nie da się scalić.
