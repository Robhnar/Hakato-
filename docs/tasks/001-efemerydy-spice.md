# 001 – Efemerydy: Słońce i Ziemia ze SPICE

- **Status:** w recenzji
- **Właściciel:** Przemek (Osoba A)
- **Moduł:** `ephemeris`
- **Gałąź:** `feat/001-efemerydy-spice`
- **Zależy od:** –

## Cel

Aplikacja ma pokazywać prawdziwe położenie Słońca i Ziemi na niebie nad miejscem lądowania. Teraz liczy je przybliżony model z błędem kilku stopni (`placeholder.py`), co na biegunie południowym daje wyniki bez wartości. Po tym zadaniu położenia pochodzą z efemeryd JPL przez SPICE.

## Zakres

- `body_positions()` liczy wektory Słońca i Ziemi względem środka Księżyca w układzie `MOON_ME` (z poprawką na czas biegu światła i aberrację) i przelicza je istniejącą funkcją `geometry.az_el()`.
- Skrypt `data/scripts/fetch_kernels.py` pobiera potrzebne jądra z NAIF (`naif.jpl.nasa.gov/pub/naif/generic_kernels/`: sekundy przestępne, efemerydy planet, orientacja Księżyca binarna PCK i jej plik ramek) do `data/raw/kernels/`. Aktualne nazwy plików sprawdź w katalogu NAIF; listę i rozmiary podaj w PR.
- `ephemeris.SOURCE` mówi prawdę: `"spice"`, gdy jądra są załadowane; bez nich moduł działa dalej na modelu przybliżonym i zwraca `"placeholder"`.
- Obliczenia wektorowe dla całej listy czasów: 5000 próbek poniżej 1 s.
- Weryfikacja z JPL Horizons: co najmniej 3 punkty kontrolne (okolice równika, średnie szerokości, biegun południowy) zapisane jako test; zgodność azymutu i wysokości do 0,05°.

Poza zakresem:

- Teren i horyzont (zadanie 002), okna widoczności (003).
- Wysokość miejsca nad poziomem odniesienia – zostaje 0 km.

## Pliki

`backend/app/ephemeris/**`, `backend/tests/test_ephemeris*.py`, `data/scripts/fetch_kernels.py`, `backend/pyproject.toml` (tylko nowa zależność), `README.md` (krok pobrania jąder).

## Kontrakty

Udostępnia `ephemeris.body_positions()` i `ephemeris.SOURCE` – sygnatura i kształt wyniku bez zmian (`docs/ARCHITECTURE.md`). Korzysta z konwencji kątów i układu ME.

## Kryteria ukończenia

- [x] Z pobranymi jądrami `/api/summary` zwraca `meta.ephemeris = "spice"`.
- [x] Test z punktami kontrolnymi Horizons przechodzi (pomijany, gdy brak jąder – CI ich nie pobiera).
- [x] Bez jąder wszystkie dotychczasowe testy nadal przechodzą.
- [x] `ruff` i `pytest` zielone.

## Notatki

- Jeśli `spiceypy` nie ma gotowej paczki dla twojej wersji Pythona, użyj 3.12.
- Po zmianie wyników odśwież fixtures tylko wtedy, gdy generujesz je bez jąder – test porównuje je z modelem przybliżonym. Jeśli to przeszkadza, zgłoś integratorowi zamiast zmieniać test.
