# Padelstar - Produktutviklingsdokument

Sist oppdatert: 2026-08-27

Status: aktivt arbeidsdokument for web/PWA-versjonen

Metadata:
- Navn: Padelstar
- Undertittel: Padel Manager
- Utvikler: Sigurd Steen Grødem
- Firma: Zigonia IT

Kildegrunnlag:

- Eksisterende SwiftUI-prosjekt: `/Users/sigurd/Documents/Developer/PadelManager-main`
- Nåværende webprosjekt: `/Users/sigurd/Documents/Developer/padel_manager_webapp`
- Tidligere webplan: `development_plan.md`
- Migreringsnotater: `migration_notes.md`

## 1. Formål

Padelstar skal gjøre det mulig å opprette, administrere og følge en padelturnering fra valgfri enhet: iPhone, Android, iPad, nettbrett, PC, Mac og moderne nettlesere.

Den viktigste brukeropplevelsen er:

> Jeg trenger ikke holde styr på turneringen. Padelstar forteller meg når jeg skal spille, hvem jeg spiller med, hvem jeg møter, og hvilken bane jeg skal på.

Webversjonen skal videreføre den beste turneringslogikken, visuelle identiteten og arbeidsflyten fra SwiftUI-appen, men løse det største nye behovet: flere enheter samtidig.

Påmeldingsflyten bør føles litt som Kahoot: administrator er host, deltakerne bruker en kode eller QR-kode, skriver inn navnet sitt, og dukker opp i en deltakerliste/lobby hos administrator før turneringen startes.

## 2. Hvorfor Web

Den opprinnelige SwiftUI-appen var en lokal iOS-app med sterk offline- og lagringsmodell, men den krevde Apple-økosystemet og App Store-sporet.

For et hobbyprosjekt og en turneringsapp som skal brukes av mange spillere på forskjellige enheter, er web/PWA bedre egnet fordi:

- ingen Apple Developer-betaling kreves for brukerne eller prosjektet
- appen kan åpnes direkte fra en lenke eller QR-kode
- spillere kan bruke egne telefoner, nettbrett eller datamaskiner
- administrator kan kjøre turneringen fra PC/Mac/iPad
- web gir naturlig vei til sanntidsoppdateringer via Supabase
- PWA kan senere gi app-lignende installasjon og push-varslinger

## 3. Produktprinsipper

1. Appen skal løse live-turneringssituasjonen først.
2. Spilleren skal se relevant informasjon uten å forstå hele turneringssystemet.
3. Administrator skal ha kontroll uten at alle må stå rundt administratorens enhet.
4. Webversjonen skal ikke arve Xcode-/App Store-kompleksitet.
5. Domenelogikken fra SwiftUI-appen skal bevares der den er god.
6. Arkitekturen skal starte modulært, slik at webappen ikke får samme "God Object"-problem som `SessionManager` i SwiftUI-appen.
7. Første versjon skal være enkel nok til å ferdigstilles.
8. Det visuelle uttrykket skal være kodet responsivt, ikke avhenge av flate designbilder som UI.

## 4. Målgrupper og Roller

### 4.1 Administrator / Host

Administrator oppretter og styrer turneringen.

Administrator skal kunne:

- opprette turnering
- se spillere som melder seg på med invitasjonskode eller QR-kode
- legge til seg selv eller andre spillere manuelt ved behov
- fjerne eller korrigere spillere
- angi antall baner
- velge turneringsformat og regler
- generere runder/kamper
- starte kamper og runder
- tildele eller endre bane
- registrere og korrigere resultater
- håndtere walkover/forfeit
- se tabell, kamper og status
- dele invitasjonskode, lenke og senere QR-kode
- avslutte turneringen

Administratorrettigheter skal være skilt fra invitasjonskoden.

Administrator kan delta i turneringen som spiller, men det skal ikke være et krav. Hvis administrator skal spille, kan administrator enten legge inn seg selv manuelt eller melde seg på som vanlig spiller fra en egen enhet.

### 4.2 Spiller

Spiller kobler seg til med invitasjonskode eller QR-kode og oppgir navnet sitt.

Spiller skal kunne:

- skrive inn navn ved påmelding
- velge en avatar ved påmelding
- bli lagt til i deltakerlisten hos administrator
- forlate sin lokale spillerøkt uten å slette egen deltaker eller endre turneringen for andre
- se egen neste kamp
- se bane
- se lagkamerat
- se motstandere
- se om de har pause
- se aktive og kommende kamper
- se tidligere resultater
- se tabell/ranking
- få varsel når egen kamp nærmer seg eller starter

Spiller skal normalt ikke kunne endre turneringsdata.

### 4.3 Tilskuer

Tilskuer kan følge turneringen uten å identifisere seg som spiller.

Tilskuer skal kunne:

- se aktive kamper
- se kommende kamper
- se resultater
- se tabell

Tilskuer får ikke personlige varsler.

## 5. Kjerneflyt

1. Administrator oppretter en turnering.
2. Systemet genererer en turnerings-ID og en kort invitasjonskode.
3. Administrator deler invitasjonskode, lenke eller QR-kode.
4. Spillerne åpner appen på egen enhet og skriver inn invitasjonskoden eller scanner QR-koden.
5. Spilleren skriver inn navnet sitt og velger en avatar.
6. Spilleren legges til i turneringens deltakerliste med navn og avatar.
7. Administrator ser spillerne dukke opp i listen og kan korrigere, fjerne eller legge til spillere manuelt.
8. Administrator legger eventuelt inn seg selv hvis administrator også skal spille.
9. Administrator angir baner og genererer kampoppsett når deltakerlisten er klar.
10. Appen husker spilleridentiteten på spillerens enhet.
11. Administrator starter runde/kamp.
12. Alle enheter oppdateres automatisk.
13. Spillerens skjerm viser bare det spilleren trenger akkurat nå.
14. Resultater registreres av administrator.
15. Tabell, kampliste og spilleroversikt oppdateres live.

Denne flyten skal prioriteres over en forhåndsutfylt spillerliste. Administrator kan fortsatt legge inn spillere manuelt, men standardopplevelsen skal være at spillerne melder seg på selv.

## 5.1 Kamp- og Poengstruktur

Kampene skal følge tennis-/padelstruktur:

- poeng i game vises som `0`, `15`, `30`, `40` og `A`
- deuce vises som `40-40`
- fordel vises som `A-40` eller `40-A`
- vunnet game øker game-stillingen i settet
- sett kan registreres som 6-x med to games margin, eller 7-5 / 7-6
- admin kan både føre poeng løpende og registrere ferdig sett med hurtigscore

Betaen støtter konfigurerbart antall sett per kamp. Full tiebreak-poengføring kan legges til senere.

## 5.2 Påmeldingslobby

Før kampoppsett genereres, bør administrator se en lobby med påmeldte spillere.

Lobbyen skal vise:

- invitasjonskode
- QR-kode
- liste over spillere som har meldt seg på, med navn og avatar
- antall påmeldte spillere
- knapp for å legge til spiller manuelt
- mulighet til å fjerne eller endre navn
- knapp for å starte/generere turnering når listen er klar

Spillerens påmeldingsskjerm er enkel:

1. Skriv inn invitasjonskode eller scan QR.
2. Skriv inn navn.
3. Velg avatar.
4. Se bekreftelse: "Du er med".
5. Vent på at administrator starter turneringen.

## 5.3 Avatarer

Spillere bør kunne velge en enkel avatar når de melder seg på. Avatar vises ved siden av navnet i lobbyen, spillerlisten, kampkort, tabell og personlig spilleroversikt.

MVP-variant:

- et lite sett med ferdiglagde avatarer
- avatar lagres som en enkel `avatar_id`
- ingen bildeopplasting
- samme avatar kan i første versjon brukes av flere spillere
- midlertidig kan DiceBear brukes som placeholder-avatar basert på spillerens navn

Senere variant:

- større avatarbibliotek
- fargevalg eller små variasjoner
- unike avatarer per spiller i samme turnering
- opplasting av profilbilde
- lagret spillerprofil på tvers av turneringer

Avatarene bør lages i samme visuelle stil som Padelstar-identiteten: mørk/gull/sølv, sportslig, tydelige små ikoner og lesbare i liten størrelse.

## 6. MVP

MVP skal være den første fungerende webversjonen som kan brukes i en ekte liten turnering.

### 6.1 Inkluderes i MVP

- opprette turnering
- spillere kan melde seg på med navn via invitasjonskode/QR
- spillere kan velge avatar ved påmelding
- admin kan legge inn eller korrigere spillere manuelt
- angi baner
- generere round-robin-kamper
- generere cup-bracket med automatisk eller manuelt lagoppsett
- støtte singles ved 2-3 spillere
- støtte doubles ved 4+ spillere
- sit-out / pause ved oddetall
- invitasjonskode
- spilleridentifikasjon
- adminvisning
- spillervisning
- tilskuervisning
- aktiv kamp
- kommende kamper
- resultatregistrering
- tennis-/padelpoeng med deuce og advantage
- atomisk spillerpoengføring via Supabase RPC
- walkover og ett-stegs undo for siste kampsteg
- tabell/ranking
- Supabase live sync mellom admin, spiller og tilskuer når live-konfigurasjon er aktiv
- QR-kode og offentlig join-lenke
- enkel lokal lagring
- grunnleggende responsive layout
- Padelstar-logo, ikoner, Titillium Web/Nunito-font og mørk/gull-fargeprofil basert på ny landing page-retning

### 6.1.1 Visuell MVP-Retning

`landing_page.jpg` er visuell fasit for forsiden, men selve appen skal bygges som ekte HTML/CSS.

Forsiden skal ha:

- fullskjerm hero med mørkt padel-bilde i bakgrunnen
- stor sentrert Padelstar-logo
- fast/flytende toppmeny
- `Get Started`-knapp i gullstil
- `No App Needed` under CTA
- Zigonia-logo nederst til venstre
- Padelstar-badge nederst til høyre
- tydelig hint om at opprett/bli med-skjemaene ligger under heroen

Appvisningene skal følge samme retning, men være praktiske arbeidsflater:

- mindre, lesbar og ikke-overlappende navigasjon
- tydelige kort med mørk glassfølelse og gullrammer
- knapper som bygger på `button.png`
- aktiv menyindikator basert på `menu_highlight.png`
- individuelle spillerfarger beholdes i badges, tabell, kampkort og status
- telefon og iPad i stående modus bruker hamburgernavigasjon

### 6.2 Ikke i første MVP

- full brukerkonto
- betaling/Pro
- App Store-funksjoner
- full oversettelse av all dynamisk tekst
- full kamp-/bracket-historikk utover siste undo-steg
- flere sett per kamp
- full tiebreak-poengføring
- player profile photos
- karrierestatistikk
- PDF-eksport
- avansert offline-konflikthåndtering
- push-varslinger

Disse skal ikke fjernes som ideer, men vente til grunnflyten fungerer.

## 7. Funksjoner fra SwiftUI-Appen som Skal Beholdes

### 7.1 Turneringslogikk

SwiftUI-appen har god domenelogikk som skal være fasit for webversjonen.

Viktige kilder:

- `TournamentScheduler.swift`
- `LeaderboardCalculator.swift`
- `GameEngine.swift`
- `CupEngine.swift`
- `Player.swift`
- `Team.swift`
- `Match.swift`
- `MatchState.swift`
- `TeamGameScore.swift`
- `TournamentSettings.swift`

Behold:

- Berger-rotasjon for partner-runder
- singles-runder for færre enn 4 spillere
- partnerrotasjon for 4+ spillere
- sit-out ved oddetall
- matchmodell med `teamOne`, `teamTwo`, `sittingOut`, `currentSet`, `completedSets`, `winnerTeamIndex`
- tabell sortert på poeng, seire, sett, games og navn
- fleksibel poengmodus: games, sets, matches

### 7.2 Visuell Identitet

Behold:

- logo
- appikoner
- Titillium Web som displayfont
- Nunito som UI-font
- mørk sports-/premiumfølelse
- gull som primæraksent: `#F0B52E`
- lys gull: `#FFF096`
- mørk gull: `#986016`
- sølv/grå som sekundæraksent: `#616B7A`
- glasskort og tydelige knappestiler

Webversjonen må justere typografi for nettleser, spesielt liten tekst. Nunito skal bære lesbar UI-tekst, mens Titillium Web brukes der appen trenger mer sportslig/display-preget uttrykk.

### 7.3 Produktfunksjoner

Fra SwiftUI-appen bør følgende vurderes videreført i web:

- live scoring
- fleksible regler
- leaderboard
- lagre og dele resultater
- turneringshistorikk
- templates
- court assignment
- walkover/forfeit
- large-score mode
- live standings QR
- spillerprofiler og statistikk

Men rekkefølgen må tilpasses webprosjektets behov.

## 8. Funksjoner som Skal Endres i Webversjonen

### 8.1 Fra Lokal App til Multi-Device

SwiftUI-appen var lokal-først og iCloud-orientert. Webversjonen skal være multi-device først.

Det betyr:

- Supabase/PostgreSQL blir sannhetskilde for aktive turneringer
- Supabase Realtime brukes for live-oppdateringer
- lokal lagring brukes som cache/offline-buffer
- host/player/tilskuer-roller må håndheves i backend, ikke bare UI
- invitasjonskode gir lesetilgang, ikke adminrettigheter
- admin-token eller konto gir skrivetilgang

### 8.2 Fra App Store Privacy til Web Privacy

Gammel privacy policy sa at data ikke ble sendt til server. Det var riktig for lokal iOS-app.

For webversjonen er dette annerledes fordi Supabase brukes for aktive turneringer. Ny privacy-tekst må forklare:

- hvilke data lagres i skyen
- at spillernavn, kamper og resultater lagres for turneringen
- hvem som kan se data via invitasjonskode
- hvordan turnering kan slettes
- at push-abonnementer kan lagres hvis varslinger aktiveres

Dette må oppdateres før bred offentlig bruk.

### 8.3 Fra Pro/Betaling til Åpen Hobby-MVP

SwiftUI-appen hadde StoreKit 2, Pro-funksjoner og free/pro gating.

Webversjonen skal foreløpig ikke ha betaling. Følgende holdes ute:

- StoreKit
- Pro-opplåsing
- App Store-gating
- abonnementstekster
- kjøpsflyt

Funksjoner som templates og historikk kan likevel bygges senere uten betalingslogikk.

## 9. Foreslått Webarkitektur

Første versjon kan fortsatt være enkel HTML/CSS/JavaScript, men koden bør deles i moduler før funksjonaliteten vokser.

Foreslått struktur:

```text
padel_manager_webapp/
  index.html
  styles.css
  assets/
  src/
    app.js
    models.js
    scheduler.js
    leaderboard.js
    scoring.js
    storage.js
    supabaseClient.js
    realtime.js
    views/
      adminView.js
      playerView.js
      spectatorView.js
```

### 9.1 Moduler

`models.js`

- Tournament
- Player
- Team
- Court
- Round
- Match
- TournamentSettings

`scheduler.js`

- singles-runder
- partner-runder
- Berger-rotasjon
- sit-out
- cup-seeding, byes og rundeavansement

`leaderboard.js`

- poengberegning
- statistikk
- sortering
- tiebreakers

`scoring.js`

- resultatregistrering
- walkover
- game/set/deuce/advantage
- walkover og ett-stegs undo

`storage.js`

- localStorage som lokal fallback/cache i beta
- IndexedDB når offline/cache blir større

`supabaseClient.js`

- API-klient
- auth/token-håndtering
- miljøvariabler

`realtime.js`

- subscription på turnering
- live oppdatering av kamper, runder, resultater og tabell

`views/`

- DOM-rendering og UI-hendelser
- ingen tung turneringslogikk

## 10. Datamodell for Web

### 10.1 MVP-tabeller

`tournaments`

- id
- invite_code
- name
- status
- admin_token_hash
- current_round
- settings
- created_at
- updated_at

`players`

- id
- tournament_id
- name
- avatar_id
- accent
- active
- join_status
- joined_from
- created_at

`courts`

- id
- tournament_id
- name
- court_number
- active

`rounds`

- id
- tournament_id
- round_number
- status
- created_at

`matches`

- id
- tournament_id
- round_id
- court_id
- rotation_number
- team_one
- team_two
- sitting_out
- state
- completed_sets
- current_set
- winner_team_index
- is_walkover
- started_at
- completed_at
- updated_at

### 10.2 Senere tabeller

`push_subscriptions`

- id
- player_id
- tournament_id
- endpoint
- auth_key
- public_key
- active
- created_at

`player_profiles`

- id
- display_name
- avatar_id
- avatar_url
- created_at

`tournament_history`

- id
- tournament_id
- completed_at
- snapshot

## 11. Live-Oppdateringer

Alle enheter som følger turneringen skal oppdateres automatisk når:

- kamp starter
- kamp avsluttes
- resultat lagres
- bane endres
- spillerliste endres
- ny runde genereres
- tabell endres
- turnering avsluttes

Supabase Realtime bør brukes på relevante tabeller.

Minimum i MVP:

- lytt på `matches`
- lytt på `rounds`
- lytt på `players`
- trigge ny beregning av tabell i klienten

Senere kan leaderboard enten beregnes server-side eller lagres som avledet state.

## 12. Offline og Recovery

SwiftUI-appen var lokal-først og hadde sterkt fokus på save/load. Webversjonen bør ta med samme robusthet gradvis.

Implementert i beta:

- lokal cache av siste turnering på admin-enheten
- tydelig status: `Online` / `Lokal` / `Offline`
- ikke miste data ved refresh

Neste prioritet:

- IndexedDB for admin-handlinger
- kø for usynkroniserte resultater
- sync når nett kommer tilbake
- siste gode server-state

Senere:

- konfliktvisning ved flere adminendringer
- restore from last good save
- save health check

## 13. Varslinger

Varslinger var planlagt i Swift-roadmap og er sentrale for webideen.

Varslingstyper:

- Din kamp starter nå
- Du spiller neste kamp
- Bane er klar
- Runde er ferdig
- Turneringen er oppdatert

Fase 1 bør ikke blokkere på dette.

Fase 2:

- PWA manifest
- Service Worker
- Web Push
- push subscription per spiller/enhet
- åpne riktig turnering/kamp fra varsel

## 14. Skjermbilder og Informasjonsarkitektur

### 14.1 Start

- Padelstar-logo
- Ny turnering
- Bli med i turnering
- invitasjonskode
- navn ved påmelding

### 14.2 Admin

Prioritet:

- turneringsstatus
- påmeldte spillere
- aktiv runde
- aktive/klare kamper per bane
- registrer resultat
- start neste kamp/runde
- spillere og baner
- del turnering

### 14.3 Spiller

Prioritet:

- din neste kamp
- bane
- makker
- motstandere
- status: spiller nå / neste / pause
- aktive kamper
- tabell

### 14.4 Tilskuer

Prioritet:

- aktive kamper
- resultater
- kommende kamper
- tabell

### 14.5 Display/TV-modus

Senere egen visningsmodus:

- stor turneringstittel
- runde
- baner
- aktive kamper
- neste runde/timer
- standings

## 15. Turneringstyper

### 15.1 Round Robin

MVP-format.

Regler:

- 2-3 spillere: singles
- 4+ spillere: doubles
- partnerrotasjon
- oddetall gir pause/sit-out
- poengmodus: games, sets eller matches

### 15.2 Cup

Cup-formatet er implementert i betaen som single elimination med automatisk eller manuelt lagoppsett.

Fra SwiftUI-appen:

- auto team setup
- manual team setup
- bracket til neste power of 2
- byes
- finalevinner
- valgfri bronsefinale

Webstatus:

- formatvalg mellom round-robin og cup
- automatisk eller manuelt lagoppsett
- seed-ing til nærmeste power of 2
- byes og dynamisk opprettelse av neste runde fra vinnerlagene
- pending-bracket og valgfri bronsefinale
- walkover og ett-stegs undo for siste kampsteg
- full kamp-/bracket-historikk utover siste undo-steg gjenstår

## 16. Migreringsstrategi fra SwiftUI

### 16.1 Behold

- domenemodeller
- scheduler-prinsipp
- leaderboard-prinsipp
- scoringregler
- matchstatus
- visuell identitet
- share-kort-ide
- history/templates som senere funksjoner

### 16.2 Tilpass

- iOS navigation -> web views/routes
- SwiftUI state -> JavaScript state/store
- UserDefaults/Documents/iCloud -> localStorage/IndexedDB/Supabase
- StoreKit/Pro -> ut av MVP
- native notifications -> Web Push
- Swift localization -> `translations.js` med `nb`, `nn`, `en`, `t(key, values)` og fallback til bokmål

### 16.2.1 Språkstruktur

Språk skal håndteres med et eget tekstbibliotek, ikke hardkodede tekststrenger spredt utover appkoden.

Målstruktur:

- `translations.js` eier tekstene.
- `app.js` henter tekst med `t("tekstNokkel")`.
- Tekster med verdier bruker `t("playersReady", { count })`.
- Valgt språk hentes fra `state.settings.language`.
- Hvis en tekst mangler på valgt språk, faller appen tilbake til bokmål.
- Hardkodet tekst flyttes gradvis ut av `index.html` og `app.js` etter hvert som UI-et stabiliseres.

Dette ligner en dictionary/oppslagstabell fra Python, og er mer ryddig enn `if/elif/else` for hver tekst.

### 16.3 Erstatt

- Xcode/App Store-releaseflyt
- StoreKit
- iCloud save sync
- UIKit haptics
- SwiftUI-only layoutkomponenter

## 17. Utviklingsfaser

### Fase 0 - Nåværende Utkast (fullført)

Status:

- statisk HTML/CSS/JS
- Padelstar-assets kopiert inn
- lokal fallback-state
- enkel admin/spiller/tilskuer
- portet scheduler-, scoring- og leaderboard-prinsipp

### Fase 1 - Lokal Web-MVP (fullført)

Mål: kunne kjøre en turnering på én enhet med god flyt.

Oppgaver:

- modulær JS-struktur
- bedre setup for spillere/baner/regler
- generer runder og kamper
- admin-resultatregistrering
- spilleroversikt
- tilskueroversikt
- tabell
- lokal save/load
- responsiv admin-, spiller- og tilskuerflyt
- visuell Padelstar-profil og PWA-shell

### Fase 2 - Publisert Beta (pågår)

Mål: kunne bruke appen på nett med offentlig join-lenke og stabil statisk hosting.

Status:

- Vercel-konfigurasjon og `https://padelstar.app` er definert.
- PWA-manifest, service worker, app-shell og Padelstar-assets er på plass.
- Join-lenker bruker offentlig URL; lokal origin brukes bare ved lokal utvikling.

Gjenstår:

- verifisere produksjonsdeploy, DNS og cache på `https://padelstar.app`
- oppdatere personverntekst og produksjonsfeilhåndtering

### Fase 3 - Supabase og Multi-Device (delvis fullført)

Mål: administrator og spillere på hver sin enhet.

Oppgaver:

- Supabase-prosjekt
- database schema
- create/join tournament
- invite code
- admin token
- realtime subscriptions
- permissions / RLS
- live oppdatering av kamper/resultater/tabell

Status:

- Supabase-tabell, RLS, RPC-er og Realtime er verifisert.
- Spillerregistrering og spillerpoengføring bruker avgrensede RPC-er.
- Adminens øvrige kampoperasjoner må fortsatt flyttes til atomiske serveroperasjoner.
- Fler-enhetsscenario med admin, spiller og tilskuer må verifiseres som samlet produksjonsflyt.

### Fase 4 - PWA og Varslinger (grunnlag på plass)

Mål: føles mer som app.

Oppgaver:

- Service Worker og offline cache
- PWA-manifest og installasjonsgrunnlag
- Web Push
- push subscriptions
- player-specific notifications

### Fase 5 - Videreutvikling

Mulige funksjoner:

- QR-invitasjon
- display/TV-modus
- cup/bracket
- templates
- turneringshistorikk
- spillerprofiler
- avatarvalg og avatarbibliotek
- avatarer
- head-to-head
- recent form
- PDF/rapport
- offentlig read-only turneringsside
- flere administratorer

## 18. Teststrategi

Fra SwiftUI-prosjektet bør testholdningen videreføres: scoring, persistence og tournament progression må beskyttes.

For web:

### 18.1 Tidlige tester

- scheduler: singles
- scheduler: doubles
- scheduler: oddetall/sit-out
- leaderboard: games
- leaderboard: sets
- leaderboard: matches
- match finish/winner
- walkover når det legges inn

### 18.2 UI-test manuelt

- opprett turnering
- generer runde
- registrer resultat
- velg spillerprofil
- kontroller personlig visning
- kontroller tabell
- refresh siden
- test mobil bredde
- test desktop bredde

### 18.3 Multi-device test senere

- admin i én nettleser
- spiller i en annen nettleser
- tilskuer i tredje
- resultat registreres
- alle oppdateres uten refresh

## 19. Publisering

Valgt retning:

- Vercel for frontend; GitHub Pages er historisk/fallback-publisering
- Supabase for database, auth/realtime og senere serverfunksjoner

Neste publisering skal være en kontrollert beta med offentlig join-lenke og uten unødvendige personopplysninger.

Før bred offentlig bruk må følgende finnes:

- oppdatert privacy-tekst for web
- tydelig beta-status
- slett turnering eller utløp for gamle turneringer
- ingen hemmelige nøkler i frontend

## 20. Kildegjennomgang

Det gamle prosjektet inneholder 280 Markdown-filer:

- 6 toppnivåfiler
- 5 filer i `docs/`
- 1 appspesifikk `PadelManager/CLAUDE.md`
- 268 filer under `Tools/`

Produktdokumentet er primært basert på:

- `docs/README.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`
- `docs/CHANGELOG.md`
- `docs/TESTING.md`
- `functions.md`
- `redesigning_the_app_structure.md`
- `redevelopment.md`
- `redesign code.md`
- `App functions and flow template/Navigation structure.md`
- `Tools/release/APP_DESCRIPTION.md`
- `Tools/release/PRIVACY_POLICY.md`
- `Tools/project-assets/registry/ASSETS_MAP.md`
- `Tools/project-assets/registry/asset-rules.md`
- `Tools/AI_INDEX.md`
- `Tools/AI_INFO.md`
- `Tools/AI_MAP.md`
- `Tools/AI_PLANNING.md`
- `Tools/AI_RULES.md`
- `Tools/SKILLS_MAP.md`

`Tools/skills/**` er i hovedsak generiske arbeidsverktøy for Swift, App Store, sikkerhet, simulator, testing og dokumentasjon. Disse skal ikke overføres som produktkrav, men de gir nyttige arbeidsregler:

- bruk minste nødvendige filsett
- les canonical docs først
- hold assets separert og registrert
- dokumentasjon skal oppdateres når systemet endres
- stabilitet før nye funksjoner
- små målrettede endringer

## 21. Åpne Beslutninger

1. Vercel er primær publiseringsplattform; GitHub Pages beholdes bare som historisk/fallback-spor. Skal repo- og prosjektnavn også renames eksternt?
2. Skal vi beholde ren HTML/CSS/JS litt til, eller gå tidlig til Vite?
3. Skal spillerregistrering fortsatt godkjennes automatisk, eller skal admin godkjenne spillere før de blir aktive?
4. Skal administrator-token erstattes av konto eller en sterkere host-identitet før produksjon?
5. Skal turneringer automatisk utløpe/slettes etter en periode?
6. Skal native share, offentlig tilskuerside eller push-varslinger prioriteres først etter produksjonsklaringen?

## 22. Neste Konkrete Arbeid

Anbefalt rekkefølge:

1. Deploy siste branch og verifiser `https://padelstar.app`, DNS, service worker og join-lenke.
2. Kjør en kontrollert fler-enhetssmoke-test med admin, spiller og tilskuer.
3. Hardne spiller- og admin-skrivetilgang med sterkere token, RLS/grants og rate limiting.
4. Gjør kampstart, resultat, walkover, avbrytelse og rundeavansement atomiske mot Supabase.
5. Lag automatiserte tester for round-robin, cup, scoring, leaderboard, walkover/undo og rollevisning.
6. Stabiliser realtime ved reconnect, samtidige endringer og stale state.
7. Flytt hardkodet tekst til i18n-struktur og del `app.js` i mindre moduler.
8. Mål PWA-oppstart på iPhone og forbedre bilde- og offline/recovery-flyten.
9. Skriv personverntekst og fastsett dataretensjon før bred offentlig bruk.

## 23. Arbeidsregel for Videre Utvikling

Når nye funksjoner legges til:

1. Oppdater dette dokumentet hvis produktretning endres.
2. Legg domenelogikk i egne moduler.
3. Hold UI-kode fri for tung turneringslogikk.
4. Test scheduler/scoring/leaderboard før visuell polish.
5. Ikke legg inn betaling, konto eller push før grunnflyten er stabil.
6. Ikke legg sensitive nøkler i frontend.
7. Behold Padelstar-identiteten, men juster webtypografi ut fra faktisk lesbarhet på Mac, mobil og nettbrett.
