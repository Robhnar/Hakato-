# Tryb prowadzony „Plan a landing” — design

Data: 2026-11-14 · Gałąź: `feat/020-tryb-prowadzony`

## Po co

Osoba bez wiedzy technicznej (uczeń, nauczyciel, jury, dziennikarz) ma sama odpowiedzieć na pytanie **„kiedy i gdzie najlepiej wylądować na Księżycu?”** i rozumieć dlaczego. Obecny UI zaczyna od współrzędnych ME, czasu UTC i 5 eksperckich zakładek — to narzędzie dla planisty misji.

## Cele / nie-cele / anty-cele

- **Cel:** w ≤ 3 prostych krokach dostać rekomendację „miejsce + data + godzina” z wyjaśnieniem zwykłym językiem i 2–3 alternatywami.
- **Cel:** przejście jednym przyciskiem do widoków eksperckich z ustawionym scenariuszem.
- **Nie-cel:** zmiana backendu, kontraktów API ani istniejących widoków.
- **Anty-cel:** ukrycie lub usunięcie narzędzi eksperckich; liczby bez kontekstu (stopnie, `score`) w trybie prostym; udawanie dokładności, gdy dane są przybliżone (`placeholder`).

## Podejścia (wybrane: A)

- **A) Tryb prowadzony obok obecnego** — nowy domyślny ekran „Plan a landing”, przełącznik *Simple / Expert*. Eksperci nic nie tracą. **Wybrane przez użytkownika.**
- B) Zastąpienie obecnego UI uproszczonym — prościej dla laika, ale traci narzędzia, które jury NASA chce zobaczyć.

## Jak (decyzje)

Interfejs po angielsku (decyzja z `ARCHITECTURE.md`).

```
[ Plan a landing ]  [ Expert tools ]                         ← przełącznik trybu
1. What kind of mission?   (•) Quick visit – 3 days  ( ) Two weeks  ( ) Long stay – 3 lunar days
2. What matters most?      (•) Solar power  ( ) Talking to Earth  ( ) Both equally
                           [x] I want to see Earth at the moment of landing
3. When could you launch?  Between [Mar 2028] and [Dec 2028]
   Where?                  (•) Find the best place for me (south-pole sites)
                           ( ) A place I choose: [ Shackleton ridge ▾ ]
                                        [ Find my landing ]
┌ BEST CHOICE ───────────────────────────────────────────────┐
│ Ridge near Shackleton · Sat 27 May 2028, 15:40 UTC (17:40 your time) │
│ ☀ Power: Sun up the whole mission       ● great          │
│ 🌍 Earth contact: 51% of the time         ● okay           │
│ 🌑 Longest darkness: none                  ● great          │
│ Why: on this ridge the Sun circles low but never sets…     │
│ [▮▮▮▮▮▮▮▮▮▮▮▮▮▮] day-by-day strip: sun / Earth           │
│ [ See it in the sky → ]  [ Compare in expert tools ]       │
└───────────────────────────────────────────────────────────┘
Other good options: 2–3 karty (miejsce/data) · „If your launch slips by a week…”
```

- **Gdzie w kodzie:** moduł powłoki, `web/src/app/guide/` (komponent trybu + czyste funkcje). Tryb jest częścią powłoki, nie widokiem, bo musi ustawić nazwę miejsca i okno (ViewProps nie ma akcji „ustaw miejsce z katalogu”) — bez zmiany kontraktu. `App.tsx` dostaje przełącznik trybu; domyślny = Simple.
- **Dane:** `api.windows()` dla każdego kandydata (równolegle; ~0,3 s/rok/miejsce). „Find the best place” = miejsca z katalogu o kategorii `candidate` (biegun płd.); „A place I choose” = dowolne z katalogu. Zakres wyszukiwania ≤ 2 lata.
- **Ranking:** czysta funkcja `rankSlots()` po stronie klienta z pól slotu (`sun_visible_fraction`, `earth_visible_fraction`, `max_darkness_hours`, `earth_visible_at_start`) z wagami wg priorytetu. Testy vitest.
- **Język:** progi na „great / okay / poor” + kolor + ikona + tekst (nie sam kolor); daty `Sat 27 May 2028`, godzina UTC i lokalna; „Why” generowane z szablonów z wartości slotu.
- **Przejście do Expert:** ustawia miejsce + `start_utc` + długość w aktywnym scenariuszu, przełącza na Expert i zakładkę Sky.
- **Dane przybliżone:** jedno zrozumiałe zdanie („Positions are approximate in this demo…”), gdy `meta.ephemeris = placeholder`.
- Dostępność: radio/fieldset, focus po wyniku na nagłówek rekomendacji, `aria-live`, kontrast AA, cele dotyku ≥ 44 px, układ jednokolumnowy na telefonie.

## Zostawione budowniczemu

Dokładne wagi i progi (opisane w kodzie i testach), teksty mikrocopy (przegląd skillem ux-copy), styl paska dzień-po-dniu.
