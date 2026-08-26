# Padel Manager Web - Utviklingsplan

Sist oppdatert: 2026-08-26

Status: aktivt arbeidsdokument for plan og gjennomføring

Oppdateringslogikk:
- Oppdater dette dokumentet ved hver commit.
- Kopier det som er gjort over i documentation_log.md så endringene er dokumentert.
- Fjern deretter det som er implementert fra dette dokumentet.

## 0. Nåværende fokus

Appen har nå en publisert statisk webapp, én-sides modulflyt, Supabase-tilkobling og lokal rollelogikk der admin kan velge om han også er spiller.

Appen har fått nytt navn, "Padelstar", ny nettadresse: https://padelstar.app, dermed også nye logo og button filer der dette måtte oppdateres. sjekk om alle filer er oppdatert med ny logo, oppdater gullfargene i koden til å reflektere den nye litt mer gulaktige gullfargen. og oppdater repo, gitnavn, vectelnavn, supabasenavn slik at det blir en symetri i navngivingen. oppdater deretter koden med de nye navnene i referansere i mellom ulike tjenester.

Neste fase er å gjøre turneringsmotoren og datalaget mer produksjonsklart:

1. Bruke `tournament_logic.md` som referanse for videre porting fra iOS-appen.
2. Skille tydelig mellom host/admin-rolle og spilleridentitet i database- og klientstate.
3. Gjøre scoring, walkover, kampstart og rundeavansement som robuste, atomiske operasjoner mot Supabase.
4. Videreutvikle realtime-flyten slik admin-, spiller- og turneringsvisning alltid viser samme turneringsstate.
5. Gjøre det slik at aktive spillere i en kamp også kan sette poeng i egen kamp
6. gjøre det mulig å forlate en en visning og gå tilbake til hjemsiden
7. Legge inn tester for kampgenerator, scoring, leaderboard og rolle-/modulvisning.
8. Fortsette visuell QA på faktisk mobil og nettbrett etter hver større UI-endring.
9. stramme opp UI slik at det samsvarer med hjemsidens utseende og grafikk.
10. rette opp ui errors som at en button har feil overlay og kurve osv.

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

Publiseringsspor:

- GitHub Pages
- Vercel

Status:

- GitHub Pages har vært brukt som første publiserte testspor.
- Vercel er koblet til repoet og har statisk hostingkonfig i `vercel.json`.
- Supabase brukes som backend når config er satt, med lokal fallback når backend ikke er tilgjengelig.

Gjenstår før mer offentlig deling:

- enkel personverntekst for webversjonen
- live-test med admin og minst to spillerenheter
- tydelig feilmelding når Supabase ikke kan nås
- bedre overvåking av deploy- og databasefeil

## 15. Utviklingsrekkefølge

1. Splitte `app.js` i mindre moduler rundt state, Supabase, turneringsmotor og visningsrendering.
2. Lage tester for kampgenerator, scoring, leaderboard og tabell.
3. Portere ferdig round-robin-logikk fra `tournament_logic.md`.
4. Vurdere om cup-mode skal inn før eller etter full realtime-hardening.
5. Gjøre scoring og rundeavansement atomisk mot Supabase.
6. Verifisere realtime mellom admin, spiller og turneringsvisning på flere enheter.
7. Forbedre PWA-oppsett og offline/recovery.
8. Lage enkel personverntekst for webversjonen.
9. Gjøre ny produksjonsdeploy etter database- og realtime-verifisering.

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
