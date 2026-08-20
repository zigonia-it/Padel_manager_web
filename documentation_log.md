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

## 2026-08-21 - QR-kode for påmelding

### Gjort

- La til QR-kode i `Del turnering`-panelet.
- QR-koden genereres fra join-lenken med invitasjonskode.
- Bruker høy kontrast og lys bakgrunn rundt QR-koden for bedre scanning.
- QR-koden oppdateres automatisk når turneringen får ny invitasjonskode.

### Beslutninger

- Bruker QuickChart som midlertidig QR-bildegenerator i den statiske demoen.
- Egen eller self-hosted QR-generering vurderes senere hvis appen skal være mindre avhengig av eksterne tjenester.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Teste QR-koden visuelt i nettleser og med mobilkamera.
- Gjøre lobbyen tydeligere før kampoppsett genereres.
- Lage første avatarvelger.

## 2026-08-21 - Større MVP-runde for brukbar mandagsdemo

### Gjort

- La til avatarvalg i påmeldingsflyten med fire midlertidige valg.
- Avatar-preview oppdateres når spilleren skriver navn eller bytter avatarvalg.
- La til tydelig admin-status for spillere, baner og turneringsklarhet.
- La til banejustering direkte i adminvisningen.
- Sperret rundestart når det mangler spillere, baner eller en runde allerede pågår.
- Endret knappen mellom `Start første runde` og `Generer neste runde`.
- Låser manuell spilleradministrasjon etter at kampoppsett er startet.
- La til fjerning av spillere før første runde.
- La til lokal eksport av backup som JSON.
- La til import av Padel Manager-backup fra JSON.
- La til `Fortsett som admin` på startsiden når en lokal turnering finnes i nettleseren.
- Endret `Nullstill demo` slik at lagret lokal turnering fjernes fra nettleseren.
- Testet hovedflyten i Playwright:
  - opprette turnering
  - se lobby/status
  - starte første runde
  - lagre resultat
  - fullføre runde
  - åpne for neste runde

### Beslutninger

- Lokal backup er viktig frem til Supabase er på plass.
- Lobbyen skal fungere som kontrollrom for admin før turneringen starter.
- Spillerlisten låses etter første runde i lokal demo for å unngå ødelagte kampreferanser.
- Importfil-input skjules helt og styres via `Importer backup`-knappen.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Gjøre spillerfanen mer ferdig for reell mobilbruk under turnering.
- Legge inn en bedre adminflyt for å avslutte turnering.
- Teste layout visuelt på smal mobilbredde.
- Vurdere GitHub-remote og publisering av første testdemo.

## 2026-08-21 - Spilleropplevelse og turneringsavslutning

### Gjort

- Forbedret spillerfanen slik at valgt spiller får tydelig kampstatus.
- Viser `Du spiller nå`, `Din neste kamp`, `Pause denne runden`, `Venter` eller ferdig-status.
- La til statuskort på spillerfanen for status, poeng og kamper.
- Filtrerer `Dine kamper` til bare valgt spillers kamper.
- La til tabell direkte på spillerfanen.
- Highlightet valgt spillers egne kampkort.
- La til `Avslutt turnering` i adminvisningen.
- Avsluttet turnering stopper videre rundegenerering og viser ferdig-status til spillere.
- Avbrutte kamper teller ikke som spilte kamper i statistikken.
- Testet med fem spillere i Playwright for å sjekke både aktiv kamp og pause/sit-out.

### Beslutninger

- Spillerfanen skal være en praktisk mobilskjerm under turnering, ikke bare en kopi av admin/spectator.
- `Dine kamper` skal være tom frem til spillerprofil er valgt.
- Avslutning av turnering holder data synlig, men stopper videre kampgenerering.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Teste og stramme layout på mobilbredde.
- Gjøre resultatregistrering mer robust og mer touch-vennlig for admin.
- Vurdere enkel publisering av lokal demo.

## 2026-08-21 - Robust admin-scoring og rundeprogresjon

### Gjort

- Bygget om `Fullfør runde` slik at den ikke lenger auto-fyller falske resultater.
- Runder kan bare fullføres når alle kamper er ferdige eller avbrutt.
- La til hurtigscore-knapper for vanlige resultater:
  - 6-0
  - 6-1
  - 6-2
  - 6-3
  - 6-4
  - 7-5
- La til større og mer touch-vennlige scorefelt.
- La til kampkontroller for admin:
  - start kamp
  - lagre/oppdater resultat
  - angre resultat før runden fullføres
  - avbryt kamp
- La til scorevalidering:
  - ingen uavgjort
  - ingen negative tall
  - vinner må ha minst riktig antall games
- Viser rundeprogresjon som `ferdige kamper / totale kamper`.
- Gamle kamper vises som historikk, men får ikke admin-kontroller når en ny runde er startet.
- Testet i Playwright:
  - opprette turnering
  - starte runde
  - bruke hurtigscore
  - aktivere `Fullfør runde`
  - generere neste runde

### Beslutninger

- Admin skal føre reelle resultater; appen skal ikke gjette/fylle ut resultater automatisk.
- Hurtigscore prioriteres for mobilbruk, siden dette trolig er raskest under en ekte turnering.
- Gamle runder skal være lesbare historikkkort når ny runde er aktiv.

### Endrede filer

- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Teste og forbedre layout på mobilbredde.
- Legge inn tydeligere historikk/filtrering mellom aktive og gamle kamper.
- Vurdere publisering av første testdemo.

## 2026-08-21 - PWA, mobilpolish og tennispoeng

### Gjort

- La til Service Worker og app-shell-cache for første PWA/offline-støtte.
- Oppdaterte PWA-manifest med tydelig `start_url` og `scope`.
- La til Apple touch icon for bedre installasjonsopplevelse på iOS/iPadOS.
- Endret statuspillen til å vise `Lokal PWA` eller `Offline`.
- Grupperte kampvisninger i `Pågår`, `Venter` og `Ferdig`.
- La til tennis-/padelpoeng i kampkort:
  - `0`, `15`, `30`, `40`
  - deuce som `40-40`
  - advantage som `A-40` eller `40-A`
  - vunnet game øker game-stillingen i settet
- Beholdt manuell ferdigregistrering med hurtigscore.
- La til `7-6` som hurtigscore for tiebreak-sett.
- Strammet validering av settresultater til 6-x med to games margin, 7-5 eller 7-6.
- Fikset `Nullstill demo` slik at synlige skjemaer også nullstilles.
- Fjernet ubrukt render-hjelper etter ny kampgruppering.
- Testet mobilflyt i Playwright på 390px bredde:
  - opprette tom lobby
  - legge til fire spillere
  - starte første runde
  - føre poeng til 15-0, 30-0, 40-0
  - bekrefte game til 1-0
  - bekrefte deuce `40-40`
  - bekrefte advantage `A-40`
- Tok visuelt skjermbilde av mobilvisningen og sjekket at scorekort og knapper ikke overlapper.

### Beslutninger

- Tennis-/padelpoeng er nå del av lokal MVP, ikke en senere avansert funksjon.
- MVP støtter fortsatt ett sett per kamp.
- Flere sett og full tiebreak-poengføring flyttes til senere arbeid.
- Hurtigscore beholdes fordi det er raskt for admin under ekte spill.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `manifest.webmanifest`
- `service-worker.js`
- `development_plan.md`
- `product_development.md`
- `documentation_log.md`

### Neste steg

- Fortsette med større sammenhengende arbeidspakker frem mot brukbar mandagsdemo.
- Teste join-flyt fra spillerperspektiv etter at admin har opprettet turnering.
- Forberede publisering når lokal MVP er stabil nok.

## 2026-08-21 - Større adminoppsett for mandagsdemo

### Gjort

- La til regelvalg for tabellpoeng i adminvisningen:
  - kamper
  - sett
  - games
- Gjorde spillerfeltet i lobbyen til bulk-input.
- Bulk-input støtter navn separert med linjeskift, komma eller semikolon.
- La til `Fyll demospillere` med faste spillernavn:
  - Sigurd
  - Elin
  - Elisabeth
  - Hanne
  - Ruben
  - Karoline
  - Lars
  - Tina
- La til redigering av navn og avatar for spillere før første runde.
- La til duplikatsjekk ved redigering og innlegging av spillere.
- Låser spillerredigering, sletting, bulk-input og demoknapp etter at kampoppsettet er startet.
- Blokkerer nye spillere fra å melde seg på etter turneringen har startet.
- Beholder eksisterende spillere som prøver å åpne join-flyten etter start.
- La til styling for `select`-felt og redigerbare spillerlinjer.
- Testet i Playwright på mobilbredde:
  - opprette tom turnering
  - fylle demospillere
  - redigere spiller til `Sigurd A`
  - endre avatarvalg
  - endre tabellpoeng
  - starte runde med åtte spillere og to baner
  - bekrefte at spillerredigering låses etter start
  - bekrefte at sen påmelding blokkeres

### Beslutninger

- Mandagsdemoen bør ha en rask vei til realistiske data.
- Admin må kunne rette skrivefeil og avatarvalg før turneringen starter.
- Nye spillere etter start blokkeres i lokal MVP for å unngå ødelagte runder og tabell.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Teste full runde med flere kamper, fullføring og neste runde.
- Gjøre spillerfanen tydeligere for valgt spiller under pågående runde.
- Forberede første publiserbare versjon.
