# Padel Manager Web - Dokumentasjonslogg

Sist oppdatert: 2026-08-21

Status: løpende prosjektlogg

Denne filen er den løpende prosjektloggen for Padel Manager Web.

Regel: etter hver tydelige arbeidsøkt skal loggen oppdateres med hva som ble gjort, hvilke beslutninger som ble tatt, hvilke filer som ble endret, og hva som bør gjøres videre.

## 2026-08-21 - Første webutkast og produktretning

### Gjort

- Opprettet et statisk webutkast for Padel Manager.
- Flyttet visuell retning fra SwiftUI-prosjektet til webutkastet:
  - mørk bakgrunn
  - gull/sølv-kontraster
  - Padel Manager-logo
  - appikoner
  - Orbitron-font
- Laget grunnleggende lokal demoflyt:
  - opprette turnering
  - legge inn spillere
  - generere runder og kamper
  - registrere resultater
  - vise tabell
  - vise spilleroversikt
- Justert hero og layout for å fjerne tekst/bilde-overlapp.
- Fjernet dekorative ruter under logoen i hero-området.
- Justert typografi slik at liten tekst blir mer lesbar på Mac/Safari.
- Lest gjennom gamle `.md`-filer fra SwiftUI-prosjektet og samlet relevant innhold i `product_development.md`.
- Oppdatert produktretningen for påmelding:
  - administrator oppretter turnering som host
  - spillere blir med via invitasjonskode eller QR-kode
  - spillere skriver inn navn selv
  - spillere dukker opp i listen hos administrator
  - administrator kan legge til seg selv eller andre manuelt, men dette er valgfritt
- Lagt inn avatarretning:
  - spillere skal kunne velge avatar ved påmelding
  - avatar vises ved siden av navn i lobby, spillerliste, kampkort, tabell og spilleroversikt
  - DiceBear brukes midlertidig som placeholder-avatar basert på spillernavn

### Beslutninger

- Web/PWA er foretrukket vei videre fremfor native iOS/Xcode for hobbyprosjektet.
- Første versjon skal kunne fungere på alle vanlige enheter via nettleser.
- Påmeldingsflyten skal være inspirert av Kahoot: kode/QR først, navn og avatar etterpå.
- Administrator trenger ikke være spiller.
- Supabase er fortsatt planlagt som backend for database og sanntidsoppdateringer.
- DiceBear-avatarer er midlertidige og skal senere kunne erstattes med egne avatarer og et ekte valggrensesnitt.

### Endrede filer

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `README.md`
- `development_plan.md`
- `product_development.md`
- `migration_notes.md`
- `assets/`

### Neste steg

- Lage faktisk påmeldingsflyt der spiller skriver inn invitasjonskode og navn.
- Lage lobbyvisning for administrator med spillere som melder seg på.
- Legge inn QR-kode for invitasjon.
- Lage første avatarvelger i UI-et.
- Koble datamodellen mot Supabase.
- Legge inn realtime-oppdateringer mellom administrator og spillerenheter.
- Vurdere publisering på Vercel, Netlify eller tilsvarende.

## 2026-08-21 - Samordnet dokumentstil

### Gjort

- Standardisert uttrykk og struktur i prosjektets markdown-filer.
- Omskrev `development_plan.md` til en kortere og mer praktisk utviklingsplan.
- La inn felles metadatafelt med `Sist oppdatert` og `Status`.
- Samlet rå eksempeltekst i ryddige kodeblokker der det var relevant.
- Sørget for at dokumentasjonsloggen følger den nye prosjektregelen.

### Beslutninger

- `product_development.md` er hoveddokumentet for detaljert produktretning.
- `development_plan.md` skal være en mer operativ gjennomføringsplan.
- `documentation_log.md` skal oppdateres etter tydelige arbeidsøkter.

### Endrede filer

- `README.md`
- `development_plan.md`
- `migration_notes.md`
- `documentation_log.md`

### Neste steg

- Bruke `development_plan.md` som praktisk veikart for neste implementasjonsrunde.
- Starte på lobby og join-flyt før Supabase kobles på.

## 2026-08-21 - Git-oppsett

### Gjort

- Initialiserte git-repo i prosjektmappen.
- Satte hovedbranch til `main`.
- La til `.gitignore` for macOS-filer, logger, dependencies, build-output, lokale miljøfiler og testartefakter.
- Laget første commit med webutkast, assets og dokumentasjon.

### Beslutninger

- Git brukes videre som sikkerhetsnett før større endringer.
- `.DS_Store` skal ikke trackes.

### Endrede filer

- `.gitignore`
- `documentation_log.md`

### Neste steg

- Lage små commits etter avgrensede arbeidsøkter.
- Vurdere GitHub-remote når prosjektet skal sikkerhetskopieres eller publiseres.

## 2026-08-21 - Første lobby- og join-flyt

### Gjort

- Gjorde spillerlisten ved opprettelse av turnering valgfri.
- La til navn i `Bli med`-skjemaet.
- La til midlertidig avatar-preview som genereres fra spillerens navn.
- Oppdaterte join-flyten slik at spillere med riktig invitasjonskode legges inn i lobby/spillerliste.
- Velger automatisk spillerprofilen etter påmelding.
- Viser om en spiller er påmeldt selv eller lagt til av admin.
- La inn tomtilstand i admin-lobbyen når ingen spillere er påmeldt.
- Escapet spillernavn før de vises i HTML for å redusere risiko ved brukerinput.

### Beslutninger

- Standardflyten skal nå være at spillere melder seg på selv med kode og navn.
- Administrator kan fortsatt legge inn spillere manuelt.
- DiceBear beholdes som midlertidig avatar-placeholder frem til egen avatarvelger lages.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Lage tydeligere admin-lobby med deling av kode/lenke.
- Legge inn QR-kode for join.
- Lage første reelle avatarvelger.
- Vurdere egen start/tilbake-knapp for å teste join-flyten lettere på samme enhet.

## 2026-08-21 - Deling av turnering i adminvisning

### Gjort

- La til et eget `Del turnering`-panel i adminvisningen.
- Viser invitasjonskode tydelig i adminpanelet.
- Genererer en enkel join-lenke med `?join=KODE`.
- La til knapper for å kopiere invitasjonskode og join-lenke.
- La til fallback-tekst hvis automatisk kopiering ikke er tilgjengelig.
- La til knapp for å vise startsiden igjen, slik at join-flyten kan testes på samme enhet.
- Prefyller invitasjonskode i join-skjemaet hvis siden åpnes med `?join=KODE`.

### Beslutninger

- QR-kode tas som eget neste steg.
- Delingspanelet ligger i adminvisningen for å holde toppbaren ren og mobilvennlig.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Legge inn QR-kode basert på join-lenken.
- Gjøre lobbyen mer tydelig før første runde genereres.
