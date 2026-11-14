# 020 – Tryb prowadzony „Plan a landing” dla osób nietechnicznych

- **Status:** scalone
- **Właściciel:** Claude Code
- **Moduł:** frontend – powłoka (`web/src/App.tsx`, `web/src/app/`)
- **Gałąź:** `feat/020-tryb-prowadzony`
- **Zależy od:** 005, 011, 013 (scalone)

## Cel

Osoba bez wiedzy technicznej (uczeń, nauczyciel, jury, dziennikarz) w trzech prostych krokach dostaje odpowiedź „gdzie i kiedy najlepiej wylądować”: miejsce, dzień i godzinę (UTC i lokalną), ocenę zasilania, łączności i ciemności zwykłym językiem oraz alternatywy. Narzędzia eksperckie zostają bez zmian pod przełącznikiem „Expert tools”.

## Zakres

Obowiązkowo:

- Przełącznik trybu *Plan a landing / Expert tools* w nagłówku; domyślnie tryb prowadzony.
- Formularz 3 kroków: długość misji, priorytet (+ „Earth at landing”), zakres miesięcy i miejsce (auto = kandydaci przy biegunie płd. albo wybrane z katalogu).
- Karta „Best choice” z ocenami great/okay/poor, wyjaśnieniem „Why”, paskiem dzień po dniu, sekcją „If your launch slips by a week” i „Other good options”.
- Przejście do Expert (Sky lub Timeline) z ustawionym miejscem, startem i długością.
- Testy jednostkowe czystych funkcji (`ranking`, `format`, `search`, `daily`, `explain`).

Poza zakresem:

- Zmiany backendu, kontraktów API, `ViewProps` i istniejących widoków.
- Wybór własnych współrzędnych w trybie prowadzonym (jest w Expert).

## Pliki

`web/src/app/guide/*` (nowe), `web/src/App.tsx`, `web/src/index.css` (tylko `.mode-switch`), `docs/superpowers/` (design i plan), ten plik.

## Kontrakty

Korzysta z `GET /api/sites`, `GET /api/windows`, `GET /api/timeline` (przez `web/src/api/client.ts`). Nie udostępnia nowych kontraktów.

## Kryteria ukończenia

- [x] Laik dostaje rekomendację miejsca i terminu w ≤ 3 krokach.
- [x] Brak wyników / błąd API / zły zakres miesięcy mają zrozumiały komunikat.
- [x] `npm run lint`, `npm run build`, `npm test` przechodzą.

## Notatki

- Ranking liczony w przeglądarce z pól slotu `/api/windows` (wagi w `ranking.ts`). `score` z backendu nie jest używany, bo zależy od wymagań eksperckich.
- Design: `docs/superpowers/specs/2026-11-14-tryb-prowadzony-design.md`, plan: `docs/superpowers/plans/2026-11-14-tryb-prowadzony.md`.
