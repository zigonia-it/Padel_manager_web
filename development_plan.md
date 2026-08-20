# Padel Manager Web - Utviklingsplan

Sist oppdatert: 2026-08-21

Status: aktivt arbeidsdokument for plan og gjennomføring

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
- tabell/ranking
- personlig spilleroversikt
- responsivt grensesnitt
- lokal lagring i nettleser

Ikke prioritert i første MVP:

- brukerkonto
- betaling
- App Store-spesifikke funksjoner
- full cup/bracket-modus
- avansert scoring med deuce/advantage
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
- legge til Service Worker når PWA/offline blir prioritert

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

Webappen skal videreføre uttrykket fra SwiftUI-prosjektet:

- Padel Manager-logo
- appikoner
- Orbitron-font
- mørk sports-/premiumfølelse
- gull som primæraksent
- sølv/grå som sekundæraksent
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

## 11. Live-Oppdateringer

Alle enheter bør oppdateres automatisk når:

- spillerliste endres
- runde genereres
- kamp starter
- kamp avsluttes
- resultat lagres
- bane endres
- tabell endres

MVP kan starte lokalt, men arkitekturen skal være klar for Supabase Realtime.

## 12. Offline og Recovery

MVP:

- behold lokal demo-lagring
- unngå tap ved refresh
- vis tydelig at data foreløpig er lokal

Senere:

- IndexedDB
- kø for handlinger som skjer offline
- synk når nett kommer tilbake
- restore fra siste kjente gode turneringsstatus

## 13. Publisering

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

## 14. Utviklingsrekkefølge

1. Rydde dokumentasjon og prosjektstruktur.
2. Lage lobby og join-flyt.
3. Legge inn navn og avatar ved påmelding.
4. Vise påmeldte spillere hos administrator.
5. Legge inn QR-kode.
6. Splitte `app.js` i moduler.
7. Lage tester for kampgenerator og tabell.
8. Koble til Supabase.
9. Legge inn realtime-oppdateringer.
10. Lage admin-, spiller- og tilskuervisning.
11. Forbedre PWA-oppsett.
12. Publisere første demo.

## 15. Arbeidsregel

Etter hver tydelige arbeidsøkt skal `documentation_log.md` oppdateres med:

- hva som ble gjort
- viktige beslutninger
- endrede filer
- neste steg

Målet er at prosjektet alltid skal være mulig å plukke opp igjen uten å miste kontekst.
