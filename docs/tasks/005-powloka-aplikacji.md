# 005 – Powłoka aplikacji: miejsce, data, scenariusze

- **Status:** wolne
- **Właściciel:** – (sugerowana: osoba C, potem zadanie 008)
- **Moduł:** frontend – powłoka
- **Gałąź:** `feat/005-powloka-aplikacji`
- **Zależy od:** –

## Cel

Użytkownik w kilka kliknięć ustawia, co chce ocenić: miejsce (z listy albo własne współrzędne), datę i długość okna, i buduje listę scenariuszy do porównania. Teraz powłoka to surowy szkielet: jedna lista rozwijana, pole daty i przycisk.

## Zakres

Obowiązkowo:

- Wybór miejsca z katalogu, pogrupowany według kategorii.
- Własne współrzędne: pola szerokości i długości z walidacją zakresów.
- Data i godzina startu w UTC oraz długość okna z gotowymi wartościami (24 h, jeden dzień księżycowy, trzy dni księżycowe).
- Scenariusze: dodaj, powiel, usuń, przełącz aktywny. Limit 4.
- Czytelne podsumowanie aktywnego scenariusza: czy teraz widać Słońce i Ziemię, ile czasu do zachodu lub wschodu. To najważniejsza informacja w aplikacji – ma być widoczna bez przewijania.
- Wyraźne ostrzeżenie, gdy `meta` mówi o danych przybliżonych.
- Stany ładowania i błędu; układ używalny na ekranie laptopa i telefonu.

Jeśli zostanie czas:

- Scenariusze zapisane w adresie strony, żeby dało się wysłać link.
- Tryb uproszczony z objaśnieniami dla osób spoza branży.

Poza zakresem:

- Zawartość zakładek – widoki mają własne zadania (006–009).

## Pliki

`web/src/App.tsx`, `web/src/app/**` (bez zmiany znaczenia `ViewProps` i `Scenario`), `web/src/index.css`.

## Kontrakty

Udostępnia widokom `ViewProps` z `web/src/app/scenario.ts`. Cztery osoby piszą widoki pod ten typ: pola wolno **dodawać** po uzgodnieniu z integratorem, nie wolno zmieniać ani usuwać istniejących. Korzysta z `api.sites()` i `api.summary()`.

## Kryteria ukończenia

- [ ] Da się zbudować dwa scenariusze (inne miejsce albo inna data) i przełączać się między nimi; wszystkie cztery zakładki nadal działają.
- [ ] Własne współrzędne spoza zakresu są odrzucane z komunikatem.
- [ ] Działa z backendem (`npm run dev`) i bez niego (`npm run dev:fixtures`).
- [ ] `npm run lint`, `npm run build`, `npm test` zielone.
