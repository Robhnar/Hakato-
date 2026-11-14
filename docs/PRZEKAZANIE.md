# Przekazanie roli przywódcy (integratora)

Stan na 2026-11-14. Ten plik pisał poprzedni przywódca (asystent AI) dla następcy. Przeczytaj go w całości, zanim cokolwiek zrobisz w repo.

## Twoja rola

Organizujesz pracę sześciu osób (kody A–F), z których każda pracuje z własnym asystentem AI. Sprawdzasz oddane zadania i **zgłaszasz błędy – nie poprawiasz ich sam**.

Zasady ustalone przez właściciela repo – obowiązują bezwzględnie:

1. **Nie poprawiaj kodu sam.** Także „drobiazgów integracyjnych" na `main`. Poprzednik to zrobił (commit `2cb1b4e`) i właściciel wyraźnie się temu sprzeciwił. Każdy znaleziony błąd zgłaszasz, poprawia autor.
2. **Niczego nie usuwaj** – plików, commitów, gałęzi – bez wyraźnego polecenia.
3. **Błędy opisuj na GitHubie jako zgłoszenia (issues)**, nie w plikach w repo.
4. **Pisz o ludziach kodami** (osoba A, B, …), bez imion i nazwisk.
5. **Nie ustawiamy ochrony gałęzi ani uprawnień** na GitHubie – właściciel tego nie chce. Zakaz pushowania do `main` jest tylko umową z `AGENTS.md`.
6. **Scalasz tylko na polecenie właściciela.** Do tej pory żadna gałąź zespołu nie została scalona.
7. Właściciel pisze po polsku i krótko. Odpowiadaj po polsku; przed większym krokiem przedstaw plan i poczekaj na zgodę.

## Projekt

Lunar Landing Site Navigator (NASA Space Apps 2026, hackathon 24 h): aplikacja webowa porównująca miejsca i daty lądowania na Księżycu – położenie Słońca i Ziemi względem horyzontu, okna zasilania i łączności.

| Co | Gdzie |
| --- | --- |
| Treść wyzwania i źródła danych | `lunar-landing-site-navigator-details.md`, `lunar-landing-site-navigator-resources.md` |
| Moduły, kontrakty, konwencje | `docs/ARCHITECTURE.md` |
| Lista zadań, przydział, plan 24 h | `docs/tasks/README.md` |
| Briefy zadań 001–010 | `docs/tasks/` |
| Zasady dla ludzi i asystentów AI | `CONTRIBUTING.md`, `AGENTS.md` |
| Uruchomienie, testy | `README.md` |
| Uwagi z pierwszego przeglądu | `docs/POPRAWKI.md` |

Stos: backend Python + FastAPI + SPICE (`spiceypy`) + dane LOLA; frontend TypeScript + React + Vite. Interfejs po angielsku, dokumentacja po polsku.

## Przydział

| Osoba | Zadania |
| --- | --- |
| A | 001 efemerydy (SPICE) → 003 metryki |
| B | 002 horyzont z LOLA |
| C | 005 powłoka aplikacji → 008 porównanie |
| D | 006 widok nieba |
| E | 004 katalog miejsc → 010 zgłoszenie i demo |
| F | 009 globus 3D → 007 oś czasu |

## Stan repo

`main` = `917e4c0`. Zawiera szkielet, architekturę, briefy oraz:

- `2cb1b4e` – poprawki poprzedniego przywódcy w backendzie (czyszczenie cache API między testami, fixtures zawsze z modelu przybliżonego, limit próbek 20 000). Zrobione wbrew zasadzie 1; właściciel kazał niczego nie usuwać, więc zostają.
- `917e4c0` – plik `docs/POPRAWKI.md` z uwagami z przeglądu. Właściciel woli zgłoszenia na GitHubie; pliku nie usuwaj, ale nowych uwag tam nie dopisuj.

Ten plik (`docs/PRZEKAZANIE.md`) w chwili pisania **nie jest zacommitowany**.

Gałęzie i PR-y:

| Gałąź | Commit | PR | Przegląd |
| --- | --- | --- | --- |
| `feat/001-efemerydy-spice` | `56e65d9` | brak | sprawdzony commit `4217904`; nowszy **niesprawdzony** |
| `feat/002-horyzont-lola` | `7f0c8a1` | nr 3 | sprawdzony commit `79baf3d`; nowszy **niesprawdzony** |
| `feat/004-katalog-miejsc` | `98ea412` | nr 2 | sprawdzony; poprawek jeszcze nie ma |
| `feat/005-powloka-aplikacji` | `018d789` | nr 1 | sprawdzony commit `b275ca7`; nowszy **niesprawdzony** |
| `feat/008-porownanie` | `8663b39` | nr 4 | **niesprawdzony** |
| `feat/009-mapa-globus` | `2e32bc3` | brak | **niesprawdzony** |

Zadania 003, 006, 007, 010 nie mają jeszcze gałęzi.

## Wyniki pierwszego przeglądu

Szczegóły w `docs/POPRAWKI.md`. W skrócie:

- **001 (A):** wyniki zgodne z JPL Horizons do 0,00002°, szybkie. Błąd: `data/scripts/fetch_kernels.py` wyłącza weryfikację TLS.
- **002 (B):** profil horyzontu potwierdzony niezależnym przeliczeniem na prawdziwym modelu LOLA. Błąd: miejsca przy −80° (IM-1 Odysseus) dostają płaski horyzont, bo punkty poza rastrem odrzucają cały profil.
- **004 (E):** `nobile-rim-1` ma zły znak długości (jest `-53.7`, źródło podaje 53,27°E); `nobile-rim-1` i `de-gerlache-rim-2` to środki kraterów, nie krawędzie. Propozycja: dodać grzbiet przy Shackletonie (ok. −89,45°, −137,3°).
- **005 (C):** „Visible now" opisuje początek okna; ostrzeżenie o przybliżonych danych nie znika poza biegunem; „Add scenario" i „Duplicate" robią to samo. Interfejs nie był oglądany w przeglądarce.

Te uwagi **nie zostały jeszcze wpisane jako zgłoszenia na GitHubie** – patrz niżej.

## Pierwsze kroki

1. **Uzyskaj możliwość tworzenia zgłoszeń.** Na tym komputerze nie ma `gh`, tokenu API ani podłączonego rozszerzenia Chrome; klucz SSH pozwala tylko na `git`. Poproś właściciela o zgodę na instalację `gh` (i o `gh auth login`) albo o podłączenie Claude in Chrome.
2. **Wpisz uwagi z pierwszego przeglądu jako zgłoszenia** – jedno na błąd, tytuł w formie `[001][Osoba A] krótki opis`. Najpierw sprawdź, czy autor nie poprawił już danego błędu w nowszym commicie.
3. **Sprawdź niesprawdzone commity** z tabeli wyżej i gałęzie 008, 009.
4. **Zgłoś właścicielowi**, które gałęzie są gotowe do scalenia, i czekaj na decyzję.
5. Po scaleniu 002 i 004 ktoś musi przeliczyć gotowe profile horyzontu (`data/scripts/build_horizons.py`) i dopisać do `README.md` pobieranie modelu wysokości – **zgłoś to jako zadanie, nie rób sam**.

## Jak sprawdzać gałąź

Nie przełączaj głównego katalogu – używaj tymczasowego drzewa roboczego:

```bash
git fetch --all --prune
git worktree add --detach <katalog-tymczasowy> origin/feat/<gałąź>
```

W drzewie roboczym:

- backend: `ruff check .`, `ruff format --check .`, `pytest -q` (z katalogu `backend/`);
- frontend: `npm ci`, `npm run lint`, `npm run build`, `npm test` (z katalogu `web/`).

Warto też zrobić próbne połączenie wszystkich otwartych gałęzi z `main` w osobnym drzewie roboczym – tak wyszedł błąd, którego żadna gałąź nie miała osobno.

Na co patrzeć poza testami:

- czy zmiany mieszczą się w plikach wymienionych w briefie zadania;
- czy nie zmieniono kontraktów (`backend/app/api/schemas.py`, `web/src/api/types.ts`, `web/src/app/scenario.ts`) bez osobnego PR;
- czy wyniki mają sens fizyczny (z prawdziwymi danymi): Apollo 11 – Ziemia zawsze widoczna, ok. 50% słońca; biegun – Słońce najwyżej ok. 2°;
- czy pole `meta` mówi prawdę o źródle danych.

## Środowisko na tym komputerze (WSL)

- Repo: `/home/rav/Hakato-`, adres zdalny przez SSH (`git@github.com:Robhnar/Hakato-.git`).
- Python: środowisko `backend/.venv` (Python 3.14, zainstalowane też `spiceypy` i `numpy`).
- Node 24: `~/.local/opt/node/bin` – nie jest w `PATH`, dodawaj go w poleceniu. Systemowy `npm` jest windowsowy i nie działa bez Node.
- Prawdziwe dane NASA są pobrane do `data/raw/` (ignorowane przez git): jądra SPICE w `data/raw/kernels/`, model LOLA `ldem_75s_120m` w `data/raw/dem/`. Do drzewa roboczego podłączysz je dowiązaniem symbolicznym `data/raw`.
- Z pobranymi jądrami testy używają SPICE; `HAKATO_FORCE_PLACEHOLDER=1` wymusza model przybliżony (tak jak w CI).
- Stan PR-ów i CI można czytać bez logowania przez publiczne API GitHuba (`api.github.com/repos/Robhnar/Hakato-/pulls`, `.../actions/runs`).
- Do weryfikacji efemeryd: API JPL Horizons, obserwator na Księżycu `CENTER='coord@301'`, `SITE_COORD='dł,szer,wys'`, `QUANTITIES='4'`.

## Znane ryzyka

- **Czas.** To hackathon 24 h; plan zakłada zamrożenie funkcji po 18. godzinie (`docs/tasks/README.md`).
- **Pliki konfliktowe:** `web/package.json`, `web/package-lock.json`, `backend/pyproject.toml`, pliki kontraktów.
- **Punkt startowy katalogu** (−89,5°, 0°) leży w zagłębieniu i ma mało słońca – dobre do pokazania kontrastu, słabe jako jedyny przykład.
- **Wspólny kursor czasu** nie jest zerowany przy zmianie scenariusza; widoki powinny przycinać go do okna.
