# 024 – Tryb prowadzony: wybór miejsca na mapie

- **Status:** scalone
- **Właściciel:** Claude Code
- **Moduł:** frontend – tryb prowadzony (`web/src/app/guide/`)
- **Gałąź:** `feat/024-wybor-miejsca-na-mapie`
- **Zależy od:** 020, 021 (scalone)

## Cel

W kroku „When and where?" opcja „A place I choose" pozwala wskazać miejsce lądowania także na mapie Księżyca, a nie tylko z listy rozwijanej. Dotąd na mapie nie dało się niczego wybrać.

## Zakres

Obowiązkowo:

- Pod opcją „A place I choose" pojawia się globus (ten sam `MoonGlobe` co w widoku Map, ładowany leniwie, dopiero po wybraniu opcji) z przyciskami `South pole`, `Near side`, `+`, `−`.
- Kliknięcie znacznika miejsca z katalogu wybiera to miejsce; kliknięcie dowolnego innego punktu ustawia własny punkt („Pinned place 74.17°S 120.90°E").
- Lista rozwijana zostaje (dostępność z klawiatury) i pokazuje wybór z mapy; własny punkt jest jej dodatkową opcją.
- Własny punkt przechodzi przez to samo wyszukiwanie i przycisk „See it in the sky" co miejsca z katalogu.

Poza zakresem:

- Wybór miejsca klawiaturą na samej mapie (alternatywą jest lista).
- Zmiany backendu i kontraktów API.

## Pliki

`web/src/app/guide/GuidePanel.tsx`, `web/src/app/guide/guide.css`, `web/src/app/guide/place.ts`, `web/src/app/guide/place.test.ts`, ten plik.

## Kontrakty

Bez zmian. Własny punkt jest zwykłym obiektem `Site` (`id: 'pin'`, kategoria `candidate`) tworzonym tylko po stronie frontu na czas wyszukiwania.

## Kryteria ukończenia

- [x] Kliknięcie punktu na mapie ustawia miejsce (lista pokazuje „Pinned place …").
- [x] Wyszukiwanie dla własnego punktu zwraca wynik, a „See it in the sky" przenosi go do Expert z tą nazwą i współrzędnymi.
- [x] Mapa mieści się przy 1024 i 390 px bez przepełnienia strony.
- [x] `npm run lint`, `npm run build`, `npm test` przechodzą (196 testów).

## Notatki

- Kliknięcie dopasowuje się do miejsca z katalogu tylko przy dokładnie tych samych współrzędnych (znacznik na globusie wysyła je bez zmian); punkt blisko znacznika, ale obok niego, jest własnym punktem.
- Nie sprawdzono: kliknięcia prawdziwym wskaźnikiem myszy lub dotykiem (w teście wysłałem zdarzenia programowo), zachowania przy bardzo wolnym ładowaniu tekstury globusa.
