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

## 2026-08-21 - Fikset dobbelbooking i kampgenerator

### Gjort

- Endret kampgeneratoren for runder slik at lag pares i rekkefølge i stedet for å lage round-robin mellom alle lag i samme runde.
- Fikset en viktig feil der samme lag/spillere kunne havne på flere baner i samme runde.
- Setter alle genererte banekamper som `Pågår`, slik at flere baner kan spilles samtidig.
- Fjernet logikk som automatisk satte andre aktive kamper tilbake til `Venter` når en kamp startes eller åpnes igjen.
- La til rundeoppsummering over kampkortene:
  - rundenummer
  - antall aktive kamper i runden
  - ferdigprogresjon
  - hvem som har pause
- Gjorde kampseksjonen tydeligere som `Kamper og historikk`, siden totalen inkluderer tidligere runder.
- Testet i Playwright på mobilbredde:
  - opprette turnering med to baner
  - fylle åtte demospillere
  - generere runde 1
  - bekrefte to samtidige kamper med åtte unike spillere
  - fullføre begge kampene med hurtigscore
  - fullføre runden
  - generere runde 2
  - bekrefte at runde 2 også har to samtidige kamper uten dobbelbooking

### Beslutninger

- En runde skal aldri gi samme spiller flere kamper samtidig.
- Ved flere baner skal flere kamper kunne være `Pågår` samtidig.
- Ubrukte lag/spillere i en runde legges i pause-listen.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `documentation_log.md`

### Neste steg

- Teste oddetallsspillere og pausevisning visuelt.
- Forbedre spillerfanen slik at den viser aktiv kamp og pause enda tydeligere.
- Klargjøre publiseringsløp for første testdemo.

## 2026-08-21 - Overført spillerfargesystem fra SwiftUI

### Gjort

- Leste fargesystemet i det gamle SwiftUI-prosjektet:
  - `PlayerAccent.swift`
  - `PlayerBadgeView.swift`
  - `TeamBadgeView.swift`
  - `AppColors.swift`
- Overførte 16-fargers spillerpalett til webappen.
- Mapper eldre web-accenter til nærmeste SwiftUI-accent ved migrering.
- La inn CSS-variabler per spiller/lag:
  - basisfarge
  - lys variant
  - mørk variant
  - RGB-verdi for skygger og glow
- Gjorde spillerkort i lobby/tabell fargede med venstremarkør og badge.
- Gjorde avatar-ringene spillerfargede.
- Gjorde lagvisning inne i kampkort farget per spiller.
- Gjorde kampkort farget etter lag/accent med subtil venstremarkør og bakgrunnsglow.
- Gjorde spillerknapper på spillerfanen fargekodet.
- Fikset at poengtekst som `0 p` ikke bryter over flere linjer på mobil.
- Bumpet Service Worker-cache til `padel-manager-v2` slik at nye CSS/JS-endringer blir hentet.
- Testet visuelt i Playwright på mobilbredde med:
  - demospillere i lobby
  - fargede spillerkort
  - generert runde
  - fargede lagbadges i kampkort

### Beslutninger

- Webappen skal bruke samme `PlayerAccent`-rekkefølge som SwiftUI-appen.
- Farge skal hjelpe lesbarhet, ikke bare dekorere.
- Avatarvalg og spillerfarge holdes foreløpig separat.

### Endrede filer

- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Vurdere om spillerfarge også skal kunne velges manuelt sammen med avatar.
- Teste fargekontrast på flere skjermstørrelser.
- Videreføre fargene i spillerfanens neste-kamp-kort.

## 2026-08-21 - Stort pass på Now-opplevelse, kampkort og regler

### Gjort

- Sammenlignet webappen mot eldre SwiftUI-skjermer:
  - `NowView.swift`
  - `MatchRow.swift`
  - `RoundSummaryCard.swift`
  - `RulesView.swift`
- La inn live-overblikk for admin med:
  - aktiv/neste kamp
  - antall aktive, ventende og ferdige kamper
  - rundeprogresjon som progressbar
- Gjorde kampkortene mer lik den gamle kampvisningen:
  - runde- og kampnummer
  - `Nå`-markør
  - banechip
  - statuschip per kampstatus
  - tydelig kampoverskrift
  - serverindikator
  - vinnertekst når kampen er ferdig
- Gjorde spillerfanens neste-kamp-kort mer komplett:
  - bruker spillerens accentfarge
  - viser makker, motstandere, bane, games og tennispoeng
  - viser tydelig pausekort når spilleren står over
  - viser tydelig ventekort når spilleren ikke har kamp ennå
- Utvidet tabellen med:
  - plassering
  - poeng
  - kamper spilt
  - kampseire
  - sett
  - games
- La inn regelseksjon i tilskuervisningen for:
  - tennispoeng
  - gyldige settresultater
  - rangeringsregler
  - pause/sit-out
- Bumpet Service Worker-cache til `padel-manager-v3`.

### Beslutninger

- Webappen skal hente tilbake følelsen fra SwiftUI-appen gjennom tydelige live-kort før vi bygger mer avansert historikk/cup.
- Admin må alltid ha en rask statusflate øverst, ikke bare lange kampkort.
- Spillerfanen skal prioritere “hva skal jeg gjøre nå?” fremfor full turneringsadministrasjon.
- Regler skal være tilgjengelige i appen, men korte nok til å brukes under en aktiv turnering.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

## 2026-08-21 - Supabase live sync for fler-enhetsbruk

### Gjort

- La til Supabase browser-klient via CDN.
- La til `supabase-config.js` for Project URL og anon/publishable key.
- La til `supabase_schema.sql` med `tournaments`-tabell, RLS, RPC-funksjoner og realtime-publication.
- Knyttet appens lagring til Supabase når configen er fylt inn.
- Beholder lokal fallback når Supabase-config mangler.
- Splittet delt turneringsstate fra lokal `selectedPlayerId` og lokal admin-token.
- Opprettelse av turnering lagres via `create_tournament`.
- Spillere kan hente turnering via invitekode og registrere seg via `join_tournament`.
- Admin-endringer lagres via `save_tournament_state` med lokal admin-token.
- Enheter abonnerer på realtime-endringer for aktiv turnering.
- Oppdaterte startteksten slik den beskriver lokal fallback og Supabase live sync riktig.
- Oppdaterte README med faktisk Supabase-oppsett.
- Bumpet Service Worker-cache til `padel-manager-v8`.

### Beslutninger

- Første mandagsklare backend lagrer hele turneringsstaten som JSON i én Supabase-rad for raskest mulig stabil fler-enhetsflyt.
- Admin-token lagres bare lokalt på admin-enheten og sendes ikke i delt state.
- Spillere kan melde seg på via RPC uten admin-token, men full turneringsstyring krever admin-token.
- Lokal fallback beholdes slik appen fortsatt kan testes uten Supabase.

### Endrede filer

- `index.html`
- `app.js`
- `service-worker.js`
- `supabase-config.js`
- `supabase_schema.sql`
- `README.md`
- `documentation_log.md`

### Neste steg

- Opprette Supabase-prosjekt og kjøre `supabase_schema.sql`.
- Fylle inn `supabase-config.js`.
- Teste admin + minst to telefoner på live URL.

## 2026-08-21 - Plan for språkstruktur

### Gjort

- La inn beslutning om språkarkitektur i `development_plan.md`.
- Oppdaterte `product_development.md` med `translations.js`, `t(key, values)` og fallback til bokmål.
- Presiserte at bokmål, nynorsk og engelsk skal håndteres via tekstbibliotek, ikke `if/else` for hver tekst.
- Oppdaterte neste konkrete arbeid slik Supabase-oppsett og live test kommer før full språkflytting.

### Beslutninger

- Appen skal etter hvert hente all visningstekst fra `translations.js`.
- Hardkodet tekst flyttes gradvis når UI-flyten er stabil nok.
- Manglende oversettelser skal falle tilbake til bokmål.

### Endrede filer

- `development_plan.md`
- `product_development.md`
- `documentation_log.md`

### Neste steg

- Opprette Supabase-prosjekt.
- Kjøre `supabase_schema.sql`.
- Fylle inn `supabase-config.js`.

## 2026-08-21 - Supabase GitHub-migration struktur

### Gjort

- La til `supabase/migrations/20260821093000_initial_padel_manager.sql`.
- Kopierte eksisterende Supabase-schema inn som første versjonerte migration.
- La til `supabase/README.md` med working directory og migration-info.
- Oppdaterte README med både manuell SQL Editor-flyt og GitHub/Supabase-migration-flyt.

### Beslutninger

- Rotfilen `supabase_schema.sql` beholdes for enkel manuell kjøring.
- `supabase/migrations/` brukes når Supabase kobles til GitHub-repo.

### Endrede filer

- `README.md`
- `documentation_log.md`
- `supabase/README.md`
- `supabase/migrations/20260821093000_initial_padel_manager.sql`

### Neste steg

- Pushe repoet til GitHub.
- Velge repoet i Supabase.
- Sette Supabase Working directory til `.`.

## 2026-08-21 - Supabase project config

### Gjort

- Fylte inn Supabase Project URL i `supabase-config.js`.
- Fylte inn Supabase publishable key i `supabase-config.js`.
- Bumpet Service Worker-cache til `padel-manager-v9`.

### Beslutninger

- Frontend bruker publishable key.
- Database connection string/passord skal ikke legges i repo eller frontend.

### Endrede filer

- `supabase-config.js`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Kontrollere at Supabase migration er kjørt.
- Teste live sync på publisert URL.

## 2026-08-21 - Supabase migration kjørt

### Gjort

- Kjørte Supabase migration mot prosjektet `sxzlljxodorkfrjnwfgr`.
- Brukte Supabase session pooler fordi direct database host ikke løste DNS.
- Verifiserte `public.tournaments` via Supabase REST API.
- Verifiserte `get_tournament_by_code` RPC-endepunktet via Supabase REST API.
- Kjørte `supabase init` og la til lokal Supabase CLI-konfigurasjon.

### Beslutninger

- Databasepassord og connection string skal fortsatt ikke lagres i repo.
- `supabase/config.toml` og `supabase/.gitignore` kan versjoneres fordi de ikke inneholder hemmeligheter.

### Endrede filer

- `documentation_log.md`
- `supabase/config.toml`
- `supabase/.gitignore`

### Neste steg

- Teste live sync gjennom publisert webapp.
- Lage en testturnering og åpne samme invite på minst to enheter.

## 2026-08-21 - GitHub Pages publisering

### Gjort

- La til GitHub Pages workflow for statisk deploy fra `main`.
- La til `.nojekyll`.
- Oppdaterte README med forventet GitHub Pages URL.

### Beslutninger

- GitHub Pages brukes som rask første hosting for mandagsklar test.
- Supabase fortsetter som backend/live sync.

### Endrede filer

- `.github/workflows/pages.yml`
- `.nojekyll`
- `README.md`
- `documentation_log.md`

### Neste steg

- Pushe workflowen til GitHub.
- Kontrollere at GitHub Pages deployer.
- Åpne live URL og teste Supabase live sync.

## 2026-08-21 - Publisert webapp verifisert

### Gjort

- Aktiverte GitHub Pages med GitHub Actions som kilde i repo-innstillingene.
- Trigget ny deploy fra `main`.
- Verifiserte at GitHub Actions-runnen for `d46df59` fullførte med `success`.
- Verifiserte at `https://zigonia-it.github.io/Padel_manager_web/` svarer med `200`.
- Verifiserte at `supabase-config.js` serveres fra GitHub Pages.
- Verifiserte at live Supabase REST API svarer mot `public.tournaments`.
- Oppdaterte README slik neste steg handler om ekte fler-enhetstest, ikke utfylling av config.

### Beslutninger

- GitHub Pages er valgt som første publiserte hosting for mandagstest.
- Supabase-prosjektet brukes som live backend for turneringsdata.

### Endrede filer

- `README.md`
- `documentation_log.md`

### Neste steg

- Teste samme turnering fra admin-Mac og minst én mobil via publisert URL.
- Opprette en testturnering og bekrefte at spiller-join og live oppdatering fungerer på tvers av enheter.

## 2026-08-21 - Skjult adminflate for spillere

### Gjort

- Skjulte adminfanen for brukere uten gyldig lokal admin-token.
- Skjulte invitasjonskodeboksen i arbeidsflaten for spillere og tilskuere.
- Endret lagret non-admin-flyt slik den ikke viser `Fortsett som admin`.
- Rettet migrering slik spillerkopier fra Supabase ikke får ny admin-token ved refresh.
- Endret `Admin har lagt meg til` slik spilleren må fylle inn invitasjonskode først.
- Avviser ukjent invitasjonskode før eksisterende spillerliste vises.
- Bumpet Service Worker-cache til `padel-manager-v10`.

### Testet

- `node --check app.js`.
- Playwright lokal flyt:
  - tom invitasjonskode gir prompt
  - non-admin får ikke adminfane
  - non-admin får ikke invitasjonskode i workspace-header
  - non-admin resume åpner spillerflate
  - ukjent invitasjonskode avvises

### Endrede filer

- `app.js`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Teste samme rolleflyt på publisert URL etter push.
- Vurdere bedre visuell tekst rundt `Admin har lagt meg til`, for eksempel `Finn profilen min`.

## 2026-08-21 - Mobilvisning for spillerfanen

### Gjort

- Skjulte invitasjonskodeboksen i workspace-header når aktiv fane er `Spiller` eller `Tilskuer`.
- Beholder invitasjonskodeboksen på aktiv adminfane for ekte admin.
- Oppdaterer rolle-/fanesynlighet direkte ved tabbytte, ikke bare ved full render.
- Endret Service Worker fra cache-first til network-first for egne appfiler.
- Bumpet Service Worker-cache til `padel-manager-v11`.

### Testet

- `node --check app.js`.
- `node --check service-worker.js`.
- Playwright lokal flyt:
  - adminfanen viser invitasjonskodeboksen
  - spillerfanen skjuler invitasjonskodeboksen
  - tilskuerfanen skjuler invitasjonskodeboksen
  - adminfanen får invitasjonskodeboksen tilbake
  - non-admin får ikke adminfane eller invitasjonskodeboks

### Endrede filer

- `app.js`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Etter deploy: åpne live-siden på mobil og reload én gang slik ny Service Worker tar over.

## 2026-08-21 - Reload tilbake til riktig visning

### Gjort

- La til gjenoppretting av startvisning ved sidelast.
- Spillere med valgt profil sendes tilbake til spillerfanen etter reload.
- Admin med lokal admin-token sendes tilbake til adminfanen etter reload.
- Invite-/QR-lenker fortsetter å åpne startsiden med invitasjonskode forhåndsutfylt.

### Testet

- `node --check app.js`.
- Playwright lokal flyt:
  - non-admin med `selectedPlayerId` lander på spillerfanen etter reload
  - admin med admin-token lander på adminfanen etter reload
  - invite-URL lander på startsiden med kode forhåndsutfylt

### Endrede filer

- `app.js`
- `documentation_log.md`

### Neste steg

- Teste på publisert mobilside etter deploy og reload.

## 2026-08-21 - Lokal rolle styrer adminfane

### Gjort

- La til egen lokal rollemarkør ved siden av turneringsstate.
- Setter lokal rolle til `admin` når turnering opprettes eller backup importeres.
- Setter lokal rolle til `player` når bruker blir med eller velger eksisterende spillerprofil.
- Endret admin-sjekken slik adminfanen krever både admin-token og lokal adminrolle.
- Nullstilling fjerner også lokal rolle.

### Testet

- `node --check app.js`.
- Playwright lokal flyt:
  - spillerrolle skjuler adminfanen selv om admin-token finnes lokalt
  - adminrolle viser adminfanen og adminflate

### Endrede filer

- `app.js`
- `documentation_log.md`

### Neste steg

- Teste på mobil ved å bli med som spiller på nytt eller velge eksisterende spillerprofil.

## 2026-08-21 - Mobiltypografi og tryggere padding

### Gjort

- Byttet global brødtekst/småtekst fra Orbitron til systemfont for bedre lesbarhet.
- Beholdt Orbitron som displayfont for overskrifter, knapper og kode-/brandpreg.
- Reduserte mobilstørrelser på overskrifter, knapper, labels og hjelpetekst.
- Endret appbredden til full viewport med trygg sidepadding, inkludert safe-area-støtte.
- Strammet mobilpadding i paneler, startkort og statusbokser.
- Endret mobil-H2 og hero-logo slik de tar mindre plass på smale skjermer.
- Bumpet Service Worker-cache til `padel-manager-v12`.

### Testet

- `node --check app.js`.
- `node --check service-worker.js`.
- Playwright mobilbredde 360px:
  - startside har `scrollWidth` lik viewportbredde
  - spiller-workspace har `scrollWidth` lik viewportbredde
  - ingen elementer går utenfor viewport
  - body/hint bruker systemfont
  - H2 bruker fortsatt Orbitron som displayfont

### Endrede filer

- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Kontrollere på iPhone/Safari etter deploy og en reload.

## 2026-08-21 - Fjernet Orbitron fra norsk tekst

### Gjort

- Fjernet Orbitron fra knapper, H2, H3 og eyebrow-tekst.
- Beholder Orbitron på brand-H1 og invitasjons-/delingskoder.
- Bumpet Service Worker-cache til `padel-manager-v13`.

### Beslutning

- Norsk tekst og dynamisk tekst skal bruke systemfont for å unngå fontbytte midt i ord med `æ`, `ø` og `å`.

### Testet

- `node --check service-worker.js`.
- Playwright mobilbredde 360px:
  - `Risløkka Padel` bruker systemfont
  - eyebrow bruker systemfont
  - aktiv tab/knapp bruker systemfont
  - brand-H1 bruker fortsatt Orbitron
  - ingen horisontal overflow

### Endrede filer

- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Kontrollere på iPhone/Safari etter deploy og reload.

## 2026-08-21 - Oxanium som norsk-sikker UI-font

### Gjort

- La til `Oxanium-VariableFont_wght.ttf` i `assets/fonts/`.
- Endret hovedfonten fra systemfont til Oxanium.
- Beholdt Orbitron som fallback/displayfont for brand-H1.
- La Oxanium inn i Service Worker app shell.
- Bumpet Service Worker-cache til `padel-manager-v14`.

### Beslutning

- Oxanium brukes som UI-font fordi den har et firkantet, futuristisk uttrykk som passer bedre med Padel Manager-designet enn ren systemfont, samtidig som den støtter norsk tekst uten synlig fallback.

### Kilder

- Google Fonts metadata beskriver Oxanium som en square/futuristic display typeface med vektakse 200-800.
- Google Fonts/metadata viser `latin` og `latin-ext` subsets.
- Typographer viser norsk språkstøtte og tegnkart med `Æ`, `Ø`, `Å`, `æ`, `ø` og `å`.

### Testet

- `node --check service-worker.js`.
- Playwright mobilbredde 360px:
  - Oxanium lastes i browseren
  - `document.fonts.check` er true for `Risløkka æøå ÆØÅ`
  - H2 og aktiv tab bruker Oxanium
  - brand-H1 bruker fortsatt Orbitron
  - ingen horisontal overflow

### Endrede filer

- `assets/fonts/Oxanium-VariableFont_wght.ttf`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Kontrollere på iPhone/Safari etter deploy og reload.

### Neste steg

- Teste hele flyten visuelt på mobil og desktop.
- Vurdere large-score-modus for admin når en kamp pågår.
- Legge inn manuell court-edit per kamp hvis banefordelingen må overstyres underveis.

## 2026-08-21 - Large-score og baneredigering

### Gjort

- La inn fullskjerm `dialog` for stor score i adminvisningen.
- La inn `Stor score`-knapp på aktive kampkort.
- Gjorde lagflatene i stor-score trykkbare slik at admin kan føre tennispoeng med store knapper.
- Synkroniserer score i stor-score med:
  - admin-overblikket
  - kampkortet
  - lagrede turneringsdata
- Lukker stor-score automatisk hvis kampen blir ferdig eller ikke lenger er aktiv.
- La inn manuell baneredigering per kampkort.
- Beholder kobling til kjent bane hvis navnet matcher en bane i turneringen.
- Bumpet Service Worker-cache til `padel-manager-v4`.
- Testet visuelt og funksjonelt i Playwright på mobilbredde:
  - opprette turnering med to baner
  - fylle demospillere
  - starte runde
  - endre bane på kampkort
  - åpne stor-score
  - føre poeng fra stor-score
  - bekrefte at poeng oppdateres i modal og kampkort

### Beslutninger

- Stor-score er foreløpig adminverktøy, ikke spillervisning.
- Baneredigering skjer direkte på kampkortet for rask bruk under turnering.
- Fullskjerm scoremodus skal være enkel og robust før vi legger inn mer avansert courtside-visning.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Teste stor-score på desktopbredde.
- Vurdere å gjøre server-lag og deuce/advantage mer visuelt fremhevet.
- Legge inn valgfri manuell spillerfarge sammen med avatarvalg.

## 2026-08-21 - Admin-regler, baner, set-popup og spillerprofilvalg

### Gjort

- La inn språkvelger øverst til høyre med norsk, nynorsk og engelsk som valg.
- La inn grunnstruktur for språk i app-state og kjerneoversettelser.
- La admin velge:
  - games som trengs for å vinne et sett
  - sett som trengs for å vinne en match
  - tabellpoeng-modus
- Endret scoremotoren slik at flere sett per match støttes.
- Flyttet hurtigvalg for ferdig sett fra kampkortet til popupen `Set resultat`.
- Gjorde set-popupen dynamisk etter valgt games-regel.
- Endret spillerkort slik at `Lagt til av admin` vises ved siden av spillerbadgen.
- La inn admin-underfaner for `Styring`, `Del`, `Spillere` og `Kamper`, slik at adminpanelet blir mer kompakt.
- Lot admin skrive inn konkrete baner i bruk, for eksempel `3, 4, 16`.
- Endret primærflyten fra `Start/fullfør runde` til `Start turnering` og `Fullfør turnering`.
- La inn `Admin har lagt meg til` på startsiden, slik at spillere kan velge en eksisterende admin-opprettet spillerprofil og få samme spilleropplevelse.
- Bumpet Service Worker-cache til `padel-manager-v5`.

### Beslutninger

- Flere sett per match støttes i logikken nå, men UI viser fremdeles én aktiv set-score av gangen.
- Språkvelgeren er første strukturpass; full oversettelse av all dynamisk tekst tas senere.
- Baner lagres som konkrete banenummer, ikke bare antall.
- Admin-underfaner brukes for å redusere scrolling uten å fjerne eksisterende funksjonalitet.

### Testet

- Playwright mobilbredde:
  - opprette turnering
  - fylle demospillere
  - bytte til admin-underfaner
  - flytte `Lagt til av admin` utenfor spillerbadge
  - sette baner til `3, 4, 16`
  - sette regler til 4 games per sett og 2 sett per match
  - starte turnering
  - bekrefte kamp på Bane 3 og Bane 4
  - åpne `Set resultat`-popup
  - bekrefte 4-games hurtigscore
  - velge eksisterende admin-opprettet spillerprofil fra startsiden
  - bytte språk til engelsk for kjerneetikett

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Fullføre oversettelser for all dynamisk tekst.
- Gjøre deuce/advantage visuelt tydeligere i stor-score og kampkort.
- Vurdere hvordan ubrukte baner bør vises når man har flere baner enn kamper i en runde.

## 2026-08-21 - Full kampplan, låst spillerprofil og hostingklar statisk app

### Gjort

- Endret spillerfanen slik at den ikke lenger lar spilleren bytte til andre spillere inne i spiller-view.
- Slo spilleridentitet og status sammen i ett panel med aktuell spiller, avatar og kilde (`Lagt til av admin` / `Registrert selv`).
- Endret turneringsgenerering slik at første start lager hele kampoppsettet for turneringen.
- Aktiverer bare banekapasiteten i aktiv runde; resten av kampene ligger synlig som ventende og starter når en bane frigjøres.
- La inn globale kampnummer, slik at `Kamp 5` betyr kamp fem i hele turneringen.
- Endret tilskuermodus til kompakte livekort for pågående kamper.
- Rettet spillerstatistikk slik at pågående kamper ikke telles som spilt før de er ferdige.
- Oppdaterte README med statisk hostingoppsett for GitHub Pages, Netlify og Cloudflare Pages.
- Bumpet Service Worker-cache til `padel-manager-v6`.

### Beslutninger

- Hele planen genereres tidlig, men runder aktiveres kontrollert for å unngå at alle kamper ser pågående ut samtidig.
- Spillerprofil velges fra invitasjonsflyt/startside, ikke fra spillerfanen.
- Tilskuermodus prioriterer livekamper fremfor historikk og full kampoversikt.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `README.md`
- `documentation_log.md`

### Neste steg

- Teste faktisk publisering på valgt host.
- Koble Supabase/realtime når lokal demo-flyt er godkjent.
- Fullføre språkoversettelser for alle dynamiske tekster.

## 2026-08-21 - Footer med copyright

### Gjort

- La til standard copyright-footer på nettsiden.
- Årsspennet starter på 2026 og oppdateres automatisk til gjeldende år.
- Bumpet Service Worker-cache til `padel-manager-v7`.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`
