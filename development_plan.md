# Padelstar - Utviklingsplan

Sist oppdatert: 2026-08-27

Status: aktivt arbeidsdokument for plan og gjennomføring

Oppdateringslogikk:
- Oppdater dette dokumentet ved hver commit.
- Kopier det som er gjort over i documentation_log.md så endringene er dokumentert.
- Fjern deretter det som er implementert fra dette dokumentet.

## 0. Nåværende fokus

Appen er i versjon 0.2 Beta og har en publisert responsiv PWA/webapp med én-sides modulflyt, Supabase-tilkobling, round-robin og cup-format med automatisk eller manuelt lagoppsett, pending-bracket, valgfri bronsefinale, walkover og ett-stegs undo. Join-lenker bruker den offentlige adressen `https://padelstar.app/?join=...`, mens lokal origin beholdes ved lokal utvikling.

Prosjektmetadata:
- Navn: Padelstar
- Undertittel: Padel Manager
- Utvikler: Sigurd Steen Grødem
- Firma: Zigonia IT

## Status siden forrige planoppdatering

- Padelstar-branding, ny topp-logo, appikoner, fonter og mørk/gull-visuell profil er tatt i bruk.
- Spillerpoeng synkroniseres atomisk mot Supabase via `save_player_point(...)`, og migreringen er kjørt og verifisert.
- Turneringsformat støtter round-robin og cup med automatisk eller manuelt lagoppsett, byes, pending-bracket, bronsefinale og rundeavansement.
- Admin kan registrere walkover og angre siste poeng-, settresultat- eller walkover-handling.
- Join-lenken bruker `https://padelstar.app`, og synlige demo-/testreferanser er fjernet fra brukerflaten.
- Den nye topp-logoen er kontrollert i desktop- og mobilvisning.
- `v. 0.2 (Beta)` er verifisert på publisert `https://padelstar.app` med Vercel Analytics og service-worker-cache `v40`.
- Spillerpoeng krever nå et serverutstedt spillertoken som lagres hash-et i en RLS-beskyttet Supabase-tabell.

## Neste fase: produksjonsklar beta

Prioritert rekkefølge basert på siste dokumentasjonslogg:

1. **Hardne roller og skrivetilgang videre.** Gjennomgå host/admin-token, spiller-sessioner, RLS/grants og rate limiting før bred bruk.
2. **Gjør admin-operasjoner atomiske.** Portér kampstart, resultat, walkover, avbrytelse og rundeavansement til validerte Supabase-operasjoner med samme kollisjonsvern som spillerpoeng-RPC-en.
3. **Stabiliser realtime.** Verifiser admin, spiller og tilskuer på separate enheter med samtidige oppdateringer, refresh og reconnect; håndter stale state og feilmeldinger tydelig.
4. **Etabler automatiserte regresjonstester.** Prioriter scheduler for singles/doubles/sit-out, cup-seeding/byes/bracket, scoring, leaderboard, walkover/undo og rolle-/modulvisning.
5. **Rydd struktur og tekst.** Flytt hardkodet brukertekst mot en felles i18n-struktur og del `app.js` i state, turneringsmotor, Supabase/realtime og visningsmoduler når testdekningen er på plass.
6. **Forbedre PWA-opplevelsen.** Mål bilde- og oppstartstid fra iPhone-hjemskjerm, optimaliser app-shell og offline-cache, og vurder IndexedDB for mer robust lokal kø/recovery.
7. **Fullfør lanseringsgrunnlaget.** Skriv personverntekst, avklar dataretensjon/utløp og dokumenter deploy-, database- og feilhåndtering. Ekstern rename av GitHub-, Vercel- og Supabase-prosjekter tas bare hvis det fortsatt er nødvendig.

## 1. Formål

Padelstar skal være en plattformuavhengig webapp for administrasjon og gjennomføring av padelturneringer.

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
- Supabase live sync når konfigurasjon er aktiv
- atomisk spillerpoengføring via RPC
- round-robin og cup med automatisk/manuelt lagoppsett
- byes, pending-bracket og valgfri bronsefinale
- walkover og ett-stegs undo
- responsivt grensesnitt
- lokal lagring i nettleser

Ikke prioritert i første MVP:

- brukerkonto
- betaling
- App Store-spesifikke funksjoner
- full kamp-/bracket-historikk utover siste undo-steg
- avansert offline-konflikthåndtering
- full tiebreak-poengføring
- bildeopplasting
- karrierestatistikk
- PDF-eksport
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
Padelstar
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

Webappen skal videreføre Padelstar-identiteten og den nye landing page-retningen:

- `landing_page.jpg` brukes som visuell referanse, ikke som flatt UI-bilde
- `bg_img.png` brukes som kodet bakgrunn
- `padelstar_logo-1200.png` brukes som optimalisert hovedlogo i appen
- `padelstar_button-900.png` brukes som optimalisert bunnbadge/logo der det passer
- `button.png` brukes som utgangspunkt for primære knapper
- `menu_highlight.png` brukes som utgangspunkt for aktive menyvalg og hamburgerstreker
- Titillium Web som displayfont
- Nunito som UI-font
- mørk sports-/premiumfølelse
- gull som primæraksent
- sølv/grå som sekundæraksent
- spillerfarger beholdes som funksjonell identifikasjon
- tydelige glasskort
- lesbar liten tekst i nettleser

Typografi skal vurderes praktisk i Safari/Chrome på Mac, mobil og nettbrett. Titillium Web brukes til displaytekst, Nunito til UI-tekst, og liten tekst må ha nok størrelse, linjehøyde og luft.

## 9. Avatarer

MVP:

- bruk DiceBear som midlertidig placeholder
- generer stabil avatar basert på spillernavn
- vis avatar ved siden av navn i lobby, kampkort, tabell og spilleroversikt

Senere:

- lag egne Padelstar-avatarer
- bygg avatarvelger
- vurder farger, figurer eller padel-relaterte ikoner
- vurder unike avatarer per turnering
- vurder opplasting av bilde først etter at grunnflyten fungerer

## 10. QR og Deling

Implementert i beta:

- kort invitasjonskode
- kopierbar lenke
- QR-kode i adminvisning
- join-side med prefylt invitasjonskode
- offentlig join-lenke på `https://padelstar.app/?join=KODE`

Gjenstår:

- native share-funksjon på telefon
- enkel offentlig read-only-lenke for tilskuere

Eksempel på ønsket join-lenke:

```text
padelstar.app/?join=P4K7D
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

Betaen bruker Supabase Realtime når live-konfigurasjon er aktiv, med lokal fallback når backend ikke er tilgjengelig.

## 13. Offline og Recovery

Implementert i beta:

- behold lokal lagring som fallback/cache
- unngå tap ved refresh
- vis `Online`, `Lokal` eller `Offline` etter tilkoblingsstatus

Neste prioritet:

- IndexedDB
- kø for handlinger som skjer offline
- synk når nett kommer tilbake
- restore fra siste kjente gode turneringsstatus

## 14. Publisering

Publiseringsspor:

- GitHub Pages
- Vercel

Status:

- GitHub Pages er historisk brukt som første publiseringsspor.
- Vercel er koblet til repoet og har statisk hostingkonfig i `vercel.json`.
- `https://padelstar.app` er satt som offentlig join-adresse i klienten.
- Supabase brukes som backend når config er satt, med lokal fallback når backend ikke er tilgjengelig.

Gjenstår før bred offentlig bruk:

- enkel personverntekst for webversjonen
- verifisere produksjonsdeploy, DNS og service-worker-cache på `https://padelstar.app`
- bekrefte live sync med admin, spiller og tilskuer på separate enheter
- tydelig feilmelding når Supabase ikke kan nås
- bedre overvåking av deploy- og databasefeil

## 15. Utviklingsrekkefølge

1. Deploy branchen og verifiser `https://padelstar.app`, DNS, service worker og offentlig join-lenke.
2. Gjennomfør en kontrollert fler-enhetssmoke-test med admin, spiller og tilskuer.
3. Hardne host/admin- og spilleridentitet, spiller-token, RLS/grants og rate limiting.
4. Gjør kampstart, resultat, walkover, avbrytelse og rundeavansement atomiske mot Supabase.
5. Lag automatiserte tester for scheduler, cup-bracket, scoring, leaderboard, walkover/undo og rollevisning.
6. Stabiliser realtime ved reconnect, samtidige endringer og stale state.
7. Flytt hardkodet tekst til i18n-struktur og del `app.js` i mindre moduler.
8. Mål iPhone-hjemskjermens oppstart og forbedre app-shell, bildehåndtering, IndexedDB og recovery.
9. Skriv personverntekst, fastsett dataretensjon og dokumenter produksjonsdrift.

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
