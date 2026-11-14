# 010 – Zgłoszenie do Space Apps: opis, demo, prezentacja

- **Status:** wolne
- **Właściciel:** – (sugerowana: osoba E, po zadaniu 004; każdy dostarcza opis swojej części)
- **Moduł:** – (bez kodu aplikacji)
- **Gałąź:** `feat/010-zgloszenie`
- **Zależy od:** –

## Cel

Jury ocenia zgłoszenie, nie repozytorium. Po tym zadaniu mamy komplet materiałów wymaganych przez konkurs i demo, które pokazuje aplikację w najlepszym świetle.

## Zakres

- Sprawdź na stronie wydarzenia aktualne wymagania wobec zgłoszenia (pola formularza, format i długość demo, termin) i zapisz je w `docs/submission/wymagania.md` w pierwszej godzinie.
- Opis projektu po angielsku: problem, rozwiązanie, jak działa, co jest policzone naprawdę, a co uproszczone.
- Lista użytych danych i zasobów ze źródłami (SPICE/NAIF, LOLA, tekstury, katalog miejsc) – zbierz z opisów PR.
- Informacja o użyciu narzędzi AI, jeśli konkurs jej wymaga.
- Scenariusz demo: jedna historia od początku do końca, np. „start opóźnia się o dwa tygodnie – czy to samo miejsce przy biegunie nadal ma słońce i łączność?".
- Nagranie albo slajdy w wymaganym formacie.

Poza zakresem:

- Zmiany w aplikacji. Jeśli demo czegoś wymaga, zgłoś to integratorowi.

## Pliki

`docs/submission/**`.

## Kryteria ukończenia

- [ ] `docs/submission/wymagania.md` istnieje i ma termin oddania.
- [ ] Każde twierdzenie w opisie zgadza się ze stanem aplikacji na `main` (sprawdź pole `meta`: nie piszemy o danych LOLA, jeśli działa płaski horyzont).
- [ ] Demo przećwiczone na wersji z `main`, nie na gałęzi roboczej.
