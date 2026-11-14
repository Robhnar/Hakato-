# 002 – Teren: profil horyzontu z danych LOLA

- **Status:** w recenzji
- **Właściciel:** osoba B
- **Moduł:** `terrain`
- **Gałąź:** `feat/002-horyzont-lola`
- **Zależy od:** –

## Cel

Na biegunie południowym o tym, czy widać Słońce i Ziemię, decyduje teren: krawędzie kraterów i wzgórza zasłaniają ciała wiszące tuż nad horyzontem. Teraz horyzont jest płaski. Po tym zadaniu aplikacja zna rzeczywistą linię horyzontu wokół miejsca lądowania.

## Zakres

Obowiązkowo:

- `horizon_profile(lat, lon)` zwraca 360 wysokości horyzontu (azymuty 0…359°) policzone z modelu wysokości LOLA, `source = "lola"`.
- Algorytm: dla każdego azymutu idź po powierzchni od miejsca na zewnątrz (co najmniej 150 km), w każdym punkcie policz kąt nad lokalnym poziomem z uwzględnieniem krzywizny Księżyca, weź maksimum. Obserwator 2 m nad gruntem.
- Obszar: szerokości poniżej −80° (biegunowy model wysokości LOLA z PDS Geosciences Node). Wybór konkretnego produktu i rozdzielczości należy do ciebie – podaj w PR nazwę, rozmiar i adres.
- Skrypt `data/scripts/fetch_dem.py` pobiera dane do `data/raw/dem/`.
- Skrypt liczący z wyprzedzeniem profile dla miejsc z `data/sites.json`, zapis do `data/horizons/<id>.json` (te pliki trafiają do repo). `horizon_profile()` najpierw szuka gotowego profilu.
- Poza obszarem danych albo bez pobranego modelu: płaski horyzont, `source = "flat"` – bez wyjątku.

Jeśli zostanie czas:

- Globalny model o niższej rozdzielczości dla miejsc poza biegunem.
- Liczenie na żądanie dla własnych współrzędnych poniżej 5 s, z pamięcią podręczną.

Poza zakresem:

- Mapa oświetlenia całego regionu, cienie rzucane na teren.

## Pliki

`backend/app/terrain/**`, `backend/tests/test_terrain*.py`, `data/scripts/fetch_dem.py`, `data/scripts/build_horizons.py`, `data/horizons/**`, `backend/pyproject.toml` (tylko nowe zależności).

## Kontrakty

Udostępnia `terrain.horizon_profile()` – kształt wyniku bez zmian (`docs/ARCHITECTURE.md`). Współrzędne w układzie ME, azymut od północy zgodnie z ruchem wskazówek zegara.

## Kryteria ukończenia

- [x] Test na sztucznym modelu wysokości: pojedyncze wzgórze o znanej wysokości i odległości daje oczekiwany kąt na właściwym azymucie; płaska kula daje wartości bliskie 0.
- [x] Dla punktu przy biegunie `/api/horizon` zwraca `source = "lola"` i profil o zmienności rzędu stopni.
- [x] Bez pobranych danych wszystkie testy przechodzą (CI danych nie pobiera).
- [ ] W PR: wykres albo zrzut jednego profilu i krótkie porównanie z tym, co pokazuje Quickmap lub Moon Trek w tym miejscu.

## Notatki

- Uważaj na orientację rastra i rzutowanie biegunowe: błąd o 90° albo odbicie lustrzane daje wiarygodnie wyglądający, ale zły profil. Sprawdź na rozpoznawalnym kraterze.
