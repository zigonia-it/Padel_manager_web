# Padel Manager Web - Utviklingsplan

Sist oppdatert: 2026-08-26

Status: aktivt arbeidsdokument for plan og gjennomføring

## 0. Førsteprioritet: Responsiv UI-opprydding etter ny designretning

Før neste funksjonsrunde skal grensesnittet ryddes opp slik at det nye Padel Manager-designet fungerer på PC, iPad og telefon.

Bakgrunn: `landing_page.jpg` er designfasit for forsiden, og skjermbilder fra admin-, spiller- og tilskuervisning viser at appvisningene foreløpig har for store nav-elementer, overlappende rollelabels og ujevn skalering på store skjermer.

Målet er å beholde den nye mørk/gull-retningen, men gjøre den praktisk og responsiv i hele appen.

Arbeidsliste:

1. Redusere og normalisere toppnavigasjonen i appvisningene.
   - Menyen skal være fast og flytende over UI-et.
   - På PC skal menyen være lesbar uten å dominere innholdet.
   - På telefon og iPad i stående modus skal menyen være hamburger.
   - Rollelabels som `Admin`, `Spiller` og `Tilskuer` må ikke overlappe hovedmenytekst.
2. Lage tydelige responsive regler for tre hovedflater:
   - PC/desktop
   - iPad/nettbrett, både liggende og stående
   - telefon
3. Justere arbeidsvisningene etter ny stil:
   - adminpanel
   - spillervisning
   - tilskuervisning
   - tabell
   - kampkort
   - regler/deling/lobby
4. Bruke designassetene konsekvent:
   - `menu_highlight.png` som aktiv markør i menyvalg.
   - `button.png` som utgangspunkt for primære knapper.
   - `padel_manager_button.png` som Padel Manager-badge nederst til høyre på forsiden.
   - `padel_manager logo_1x.png` som hovedlogo.
   - `bg_img.png` som kodet bakgrunn, ikke `landing_page.jpg` som flatt bilde.
5. Beholde spillerfarger.
   - Spillerbadges skal fortsatt vise individuelle farger.
   - Ny badge-stil skal bare gi mer glossy/brandet uttrykk, ikke fjerne fargekodingen.
6. Fikse appvisningene fra vedlagte skjermbilder:
   - unngå ekstremt store tab-/nav-tekster
   - fjerne overlapp mellom menyvalg og rollelabels
   - sikre at invitasjonskodekort og toppheader ikke kolliderer
   - sørge for at store kort og lister får god bredde og avstand
7. Verifisere visuelt med Playwright før commit:
   - desktop ca. 1440 x 900
   - iPad portrait ca. 820 x 1180
   - mobil ca. 390 x 844
   - minst én admin-, spiller- og tilskuervisning
   - hamburger åpen/lukket
   - smooth scroll fra meny og `Get Started`
   - konsoll uten errors/warnings

## 1. Formål

Padel Manager Web skal være en plattformuavhengig webapp for administrasjon og gjennomføring av padelturneringer.

Løsningen skal fungere på:

- iPhone
- Android
- iPad og andre nettbrett
- Windows
- macOS
- moderne nettlesere

Målet er at én administrator kan opprette og styre en turnering, mens spillere og tilskuere følger turneringen fra egne enheter.

Den detaljerte produktretningen ligger i `product_development.md`. Denne filen brukes som praktisk utviklingsplan.

## 2. Hovedflyt

1. Administrator oppretter en turnering.
2. Systemet lager turnerings-ID, invitasjonskode og administratorrettighet.
3. Administrator deler kode, lenke eller QR-kode.
4. Spillere åpner appen på egen enhet.
5. Spillere skriver inn invitasjonskode eller scanner QR-kode.
6. Spillere oppgir navn og velger avatar.
7. Spillerne dukker opp i lobbyen hos administrator.
8. Administrator kan korrigere listen eller legge til spillere manuelt.
9. Administrator starter turneringen når deltakerlisten er klar.
10. Alle enheter oppdateres live når kamper, resultater og tabell endres.

Administrator kan delta som spiller, men det skal ikke være et krav.

## 3. Roller

### 3.1 Administrator / Host

Administrator skal kunne:

- opprette turnering
- se spillere som melder seg på
- legge til, endre og fjerne spillere manuelt
- administrere baner
- konfigurere turneringsformat
- generere kamper
- starte runder og kamper
- registrere og korrigere resultater
- se tabell og statistikk
- dele invitasjonskode, lenke og QR-kode
- avslutte turneringen

Administratorrettigheter skal være separate fra invitasjonskoden.

### 3.2 Spiller

Spiller skal kunne:

- bli med via kode eller QR-kode
- skrive inn navn
- velge avatar
- se egen neste kamp
- se bane, makker og motstandere
- se om spilleren spiller nå, er neste, eller har pause
- se aktive kamper
- se tidligere resultater
- se tabell
- motta varsler når egen kamp nærmer seg eller starter

Spilleren skal normalt ikke kunne endre turneringsdata.

### 3.3 Tilskuer

Tilskuer skal kunne:

- se aktive kamper
- se kommende kamper
- se resultater
- se tabell

Tilskuer får ikke personlig spillerstatus eller varsler.

## 4. MVP

Første fungerende versjon skal prioritere live-turneringsflyten.

MVP bør inneholde:

- opprette turnering
- invitasjonskode
- grunnleggende join-flyt
- navn ved påmelding
- midlertidig avatar basert på spillernavn
- admin-lobby med deltakerliste
- manuell spilleradministrasjon
- antall baner
- generering av round-robin-kamper
- singles ved 2-3 spillere
- doubles ved 4+ spillere
- sit-out ved oddetall
- aktiv kamp
- kommende kamper
- resultatregistrering
- tennis-/padelpoeng med 0, 15, 30, 40, deuce og advantage
- tabell/ranking
- personlig spilleroversikt
- responsivt grensesnitt
- lokal lagring i nettleser

Ikke prioritert i første MVP:

- brukerkonto
- betaling
- App Store-spesifikke funksjoner
- full cup/bracket-modus
- flere sett per kamp
- full tiebreak-poengføring
- bildeopplasting
- karrierestatistikk
- PDF-eksport
- full offline-synk
- push-varslinger

## 5. Teknisk Retning

Første utkast er bygget med:

- HTML
- CSS
- JavaScript
- lokal lagring i nettleseren
- PWA-manifest

Videre teknisk retning:

- splitte `app.js` i mindre moduler
- flytte turneringslogikk til egne filer
- bruke Supabase som backend
- bruke Supabase Realtime for live-oppdateringer
- bruke IndexedDB for mer robust lokal cache
- videreutvikle Service Worker/offline-cache når publisering nærmer seg

## 6. Foreslått Arkitektur

```text
Padel Manager Web
  |
  +-- Admin / Host
  |
  +-- Spillere
  |
  +-- Tilskuere
  |
  +-- Supabase
        |
        +-- PostgreSQL
        +-- Realtime
        +-- Auth / tokens
        +-- Edge Functions senere
```

## 7. Datamodell

Foreslåtte hovedobjekter:

- `Tournament`
- `Player`
- `Court`
- `Round`
- `Match`
- `Team`
- `Score`
- `PushSubscription`

Viktige felt i MVP:

- `invite_code`
- `admin_token`
- `avatar_id`
- `current_round`
- `match_state`
- `team_one`
- `team_two`
- `sitting_out`
- `completed_sets`
- `winner_team_index`

Detaljert datamodell ligger i `product_development.md`.

## 8. Visuell Retning

Webappen skal videreføre Padel Manager-identiteten og den nye landing page-retningen:

- `landing_page.jpg` brukes som visuell referanse, ikke som flatt UI-bilde
- `bg_img.png` brukes som kodet bakgrunn
- `padel_manager logo_1x.png` brukes som hovedlogo
- `padel_manager_button.png` brukes som bunnbadge/logo der det passer
- `button.png` brukes som utgangspunkt for primære knapper
- `menu_highlight.png` brukes som utgangspunkt for aktive menyvalg og hamburgerstreker
- Orbitron-font
- mørk sports-/premiumfølelse
- gull som primæraksent
- sølv/grå som sekundæraksent
- spillerfarger beholdes som funksjonell identifikasjon
- tydelige glasskort
- lesbar liten tekst i nettleser

Typografi skal vurderes praktisk i Safari/Chrome på Mac, mobil og nettbrett. Orbitron kan brukes, men liten tekst må ha nok størrelse, linjehøyde og luft.

## 9. Avatarer

MVP:

- bruk DiceBear som midlertidig placeholder
- generer stabil avatar basert på spillernavn
- vis avatar ved siden av navn i lobby, kampkort, tabell og spilleroversikt

Senere:

- lag egne Padel Manager-avatarer
- bygg avatarvelger
- vurder farger, figurer eller padel-relaterte ikoner
- vurder unike avatarer per turnering
- vurder opplasting av bilde først etter at grunnflyten fungerer

## 10. QR og Deling

Første versjon:

- kort invitasjonskode
- kopierbar lenke

Neste versjon:

- QR-kode i adminvisning
- enkel mobilvennlig join-side
- share-funksjon på telefon

Eksempel på ønsket join-lenke:

```text
padelmanager.no/join/P4K7D
```

## 11. Språk og Tekststruktur

Appen skal bruke en enkel i18n-struktur i JavaScript.

Planlagt løsning:

- opprette `translations.js`
- samle tekster i én struktur per språk: `nb`, `nn`, `en`
- hente tekst med `t("tekstNokkel")`
- støtte variabler med `t("playersReady", { count: 8 })`
- bruke bokmål (`nb`) som fallback hvis tekst mangler på nynorsk eller engelsk
- flytte hardkodet tekst gradvis ut av `index.html` og `app.js`

Dette tilsvarer en dictionary/oppslagstabell, ikke mange `if/else`-blokker. Målet er at appkoden skal beskrive funksjon, mens `translations.js` eier visningsteksten.

## 12. Live-Oppdateringer

Alle enheter bør oppdateres automatisk når:

- spillerliste endres
- runde genereres
- kamp starter
- kamp avsluttes
- resultat lagres
- bane endres
- tabell endres

MVP kan starte lokalt, men arkitekturen skal være klar for Supabase Realtime.

## 13. Offline og Recovery

MVP:

- behold lokal demo-lagring
- unngå tap ved refresh
- vis tydelig at data foreløpig er lokal

Senere:

- IndexedDB
- kø for handlinger som skjer offline
- synk når nett kommer tilbake
- restore fra siste kjente gode turneringsstatus

## 14. Publisering

Aktuelle publiseringsspor:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages for enkel statisk demo

Krav før publisering:

- rydde dokumentasjon
- tydelig lokal/online-status
- fungerende mobilvisning
- fungerende join-flyt
- enkel personverntekst for webversjonen

## 15. Utviklingsrekkefølge

1. Fullføre responsiv UI-opprydding etter ny `landing_page.jpg`-basert designretning.
2. Rydde dokumentasjon og prosjektstruktur.
3. Lage lobby og join-flyt.
4. Legge inn navn og avatar ved påmelding.
5. Vise påmeldte spillere hos administrator.
6. Legge inn QR-kode.
7. Splitte `app.js` i moduler.
8. Lage tester for kampgenerator og tabell.
9. Opprette modusene cup-mode og round robin mode basert på forrige app logikk i /Users/sigurd/Documents/Developer/PadelManager-main/
10. Koble til Supabase.
11. Legge inn realtime-oppdateringer.
12. Lage admin-, spiller- og tilskuervisning.
13. Forbedre PWA-oppsett.
14. Publisere første demo.

## 16. Arbeidsregel

Etter hver tydelige arbeidsøkt skal disse dokumentene oppdateres med:
- hva som ble gjort
- viktige beslutninger
- endrede filer
- neste steg

development_plan.md
documentation_log.md
product_development.md
README.md


Målet er at prosjektet alltid skal være mulig å plukke opp igjen uten å miste kontekst.
Appen skal være funskjonibel til enhver tid.
