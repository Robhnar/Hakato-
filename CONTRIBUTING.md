# Jak pracujemy

Jedno zadanie to jedna gałąź i jeden pull request. Integrator sprawdza PR-y i scala je do `main`.

## Krok po kroku

1. **Weź pozycję** z listy w `docs/tasks/README.md` albo poproś integratora o przydział.
2. **Uruchom projekt** według `README.md` i sprawdź, że testy przechodzą.
3. **Utwórz gałąź** z aktualnego `main`:

   ```bash
   git switch main && git pull
   git switch -c feat/<nr>-<opis>
   ```

4. **Commituj często** i pushuj regularnie, żeby praca nie zginęła.
5. **Otwórz PR do `main`** i wypełnij szablon. Daj znać integratorowi, że czeka.

## Zasady

- Nikt nie pushuje bezpośrednio do `main`.
- Zmieniasz tylko swój moduł. Potrzebujesz zmiany w cudzym – napisz do jego właściciela albo integratora.
- Zmiana kontraktu (API, format danych, schemat bazy) idzie osobnym PR-em, razem ze zmianą w `docs/ARCHITECTURE.md`, i jest scalana przed kodem, który z niej korzysta.
- Gdy `main` się zmienił, dociągnij go do swojej gałęzi przez `git merge main` (nie rebase po otwarciu PR).

## Nazwy

| Co | Wzór | Przykład |
| --- | --- | --- |
| Gałąź | `feat/<nr>-<opis>` lub `fix/<nr>-<opis>` | `feat/026-eksport-danych` |
| Tytuł PR | `[<nr>] <co robi>` | `[026] Eksport danych` |
