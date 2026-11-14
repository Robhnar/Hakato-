# Jak pracujemy

Każdy pracuje nad jednym zadaniem na własnej gałęzi i oddaje je przez pull request. Integrator sprawdza PR-y i scala je do `main`.

## Krok po kroku

1. **Weź zadanie.** Wybierz plik z `docs/tasks/` ze statusem `wolne` albo poproś integratora o przydział. Wpisz się jako właściciel i zmień status na `w toku`.
2. **Utwórz gałąź** z aktualnego `main`:

   ```bash
   git switch main && git pull
   git switch -c feat/003-logowanie
   ```

3. **Pracuj z asystentem AI.** Na początku sesji wskaż mu plik zadania, np. „zrealizuj zadanie z `docs/tasks/003-logowanie.md`". Zasady z `AGENTS.md` wczyta sam; jeśli twoje narzędzie tego nie robi, wklej mu ten plik.
4. **Commituj często, pushuj codziennie** – nawet niedokończoną pracę, żeby nie zginęła.
5. **Otwórz PR do `main`**, gdy kryteria ukończenia z zadania są spełnione. Wypełnij szablon.
6. **Daj znać integratorowi**, że PR czeka.

## Zasady

- Jedno zadanie = jedna gałąź = jeden PR. Małe PR-y scalają się szybko i bez konfliktów.
- Nikt nie pushuje bezpośrednio do `main`.
- Zmieniasz tylko swój moduł. Potrzebujesz zmiany w cudzym – napisz do jego właściciela albo integratora.
- Zmiana kontraktu (API, format danych, schemat bazy) idzie osobnym PR-em, razem ze zmianą w `docs/ARCHITECTURE.md`, i jest scalana przed kodem, który z niej korzysta.
- Gdy `main` się zmienił, dociągnij go do swojej gałęzi przez `git merge main` (nie rebase po otwarciu PR).
- Przeczytaj kod, który wygenerował ci model, zanim go oddasz. Odpowiadasz za niego ty.

## Nazwy

| Co | Wzór | Przykład |
| --- | --- | --- |
| Plik zadania | `docs/tasks/<nr>-<opis>.md` | `docs/tasks/003-logowanie.md` |
| Gałąź | `feat/<nr>-<opis>` lub `fix/<nr>-<opis>` | `feat/003-logowanie` |
| Tytuł PR | `[<nr>] <co robi>` | `[003] Logowanie przez e-mail` |
