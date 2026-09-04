# Padelstar – samlet utviklingsplan

Sist oppdatert: 2026-09-04

Status: aktivt operativt arbeidsdokument

## Formål og styringsregel

Dette dokumentet er den eneste aktive planen for videre arbeid. Det beskriver dagens baseline, åpne beslutninger, prioriterte faser, akseptansekriterier og verifikasjon. Gjennomført arbeid føres i [documentation.md](documentation.md) i kronologisk rekkefølge.

Den separate, kodebaserte analysen av gjenværende `app/app.js`-oppdeling ligger i [app-js-modulariseringsplan.md](app-js-modulariseringsplan.md). Den beskriver foreslåtte moduler og rekkefølge; den gjennomfører ikke refaktoreringen.

Padelstar er en plattformuavhengig vanilla-JavaScript-PWA for å opprette, dele, administrere og følge padelturneringer på mobil, nettbrett og desktop. Supabase brukes for valgfri live-synk, mens lokal lagring og service worker gir offline-fallback.

## Kontrollert baseline etter branch-gjennomgang

Arbeidskopien på `codex/padelstar-ui-refresh` inneholder en 0.5 Beta-baseline med implementert kjerneflyt, fase 2–6-formatmoduler, TV Mode, profil/konto, historikk/statistikk, PWA/offline, varsler og konsolidert blå UI-retning. Siste lokale verifikasjon viser `npm test` med 212 tester: 211 bestått og 1 forventet live-Supabase-test hoppet over. `npm run check:syntax` og `git diff --check` passerer.

Browser-smoke, live Supabase Auth/RPC/Realtime/push og ny produksjonsdeploy er ikke verifisert i denne arbeidsøkten fordi Playwright ikke er tilgjengelig i offline-miljøet. Dette er verifikasjonsoppgaver, ikke uimplementerte funksjoner.

## Gjeldende baseline

Følgende er implementert og skal behandles som beskyttet funksjonalitet:

- Round-robin med singles for små spillergrupper og partnerrotasjon for større grupper.
- Cup-format med automatisk/manuelt lagoppsett, byes, bracket, bronsefinale, walkover og ett-stegs undo.
- Admin-, spiller- og tilskuervisning med rollebasert synlighet og spillerstyrt poengføring.
- Lokal state, recovery-kopi, offline-speiling, sync-kø, realtime reconnect og konfliktfeedback.
- Supabase RPC-er med RLS, grants, tokenbinding, revisjonskontroll, rate limiting og automatisk retensjonsjobb.
- Norsk bokmål, nynorsk, engelsk, spansk, tysk og fransk, med språkpreferanse per bruker/enhet og oversatt personvernside.
- Felles responsiv toppbar, hamburger/drawer, språkvelger, modulnavigasjon og Escape-lukking.
- Ett aktivt visuelt tema, konsoliderte CSS-lag og DiceBear Lorelei Neutral-avatarer med deterministisk seed.
- Avatarvelgeren bruker en tydelig, vertikal valgliste med forhåndsvisning og faste navn: Sophie, Aiden, Luna og Milo.
- Blått scorecard-design med tydelig lag-/resultatstruktur, Anton kun på relevante scoretall, blå aktive statuser og individuelle spilleraccentfarger.
- Responsiv scorecard-logikk som automatisk flytter avatar over spillernavn når navnet faktisk brytes over flere linjer, samt ekstra logo-safe-space i kampmetadata.
- Admin-fanene `Styring`, `Del`, `Spillere` og `Kamper`, samt setup-sidene `Opprett` og `Bli med`, bruker samme fullbredde innholdsflate på desktop og større nettbrett.
- Workspace-headeren er transparent og lar sidens mørkeblå bakgrunn gå kontinuerlig bak turneringstittel, rolle og handlinger.
- `assets/icons/padelstar-icon.png` er felles ikonreferanse for favicon, Apple/iPhone-hjemskjerm, PWA-manifest, varsler og scorecard-emblem.
- Avatar-/profilkonfigurasjonen er flyttet til `app/avatar-system.js`; app-entrypointen bruker den delte modulen for avatar-ID-er, navn og DiceBear-URL-er.
- Lenke- og QR-generering er flyttet til `app/link-utils.js`; join-/tilskuerparametre og lokal/offentlig URL-policy har én testbar modulgrense.
- Ren konstruksjon av spiller- og turneringsstate er flyttet til `app/tournament-state.js`; entrypointen beholder kun avhengighetskoblingen til turneringsmotoren.
- Lokal state-bootstrap med recovery-fallback er flyttet til `app/state-bootstrap.js`; migrering og persistence beholdes i state-/storage-modulene.
- Modulnavn-normalisering og rollebasert navigasjonsfallback er flyttet til `app/module-routing.js`; UI-entrypointen kobler inn aktuell state og rollepolicy.
- Session-/rollepolicy for aktiv turnering, invitasjonskontroll og lokal rolle er flyttet til `app/session-policy.js`.
- Accent-palett, legacy-mapping og CSS-variabler for spillerfarger er flyttet til `app/accent-system.js`.
- Bekreftelsesdialog og toast-feedback er flyttet til `app/ui-feedback.js`; remote-feil- og sync-policy ligger fortsatt i entrypointen.
- Backup-serialisering og validerende parsing er flyttet til `app/backup-format.js`, slik at tokenfri eksport fortsatt har en egen testbar grense.
- Push-varsler, service-worker-abonnement og tokenbundet subscription-synk er flyttet til `app/notification-system.js`, med injiserte browser-, storage- og RPC-avhengigheter.
- Profilens lokale/remote livssyklus er flyttet til `app/profile-session.js`; profilrendering og turneringsspesifikk historikk beholdes separat, mens lagring, join-kobling og slettingsflyt har eksplisitte avhengigheter.
- Scorecardets kampkort er flyttet til `app/match-card.js`; DOM-struktur og kampkontroller får eksplisitte formatterings- og handlingsavhengigheter.
- Lokal persistence og IndexedDB-speiling er flyttet til `app/persistence.js`, slik at lagringsansvaret ikke lenger ligger direkte i entrypointen.
- Admin-identitetens sign-in-link, claim og statusvisning er flyttet til `app/admin-identity.js`, med eksplisitt klient-, state-, RPC- og UI-injeksjon.
- Remote-feedback, invite-oppslag og sanitert delt state er flyttet til `app/remote-feedback.js`, med separat status- og RPC-policy.
- Realtime kanal-, reconnect-, refresh- og online/offline-livssyklus er flyttet til `app/realtime-connection.js`.
- Rene cup-runde-hjelpere for bracket-oppsett, seeding/shuffle og viderekomne lag er flyttet til `app/tournament-rounds.js`.
- Felles avatar-, lag- og spiller-markup er flyttet til `app/player-visuals.js` med eksplisitte avhengigheter.
- Opprettelse av runder, cup-bracket og overgang til neste turneringsrunde er flyttet til `app/tournament-runtime.js`; state og app-operasjoner injiseres.
- Admin live-overview, cup-team-builder og round-summary-rendering er flyttet til `app/workspace-overview.js` med eksplisitte avhengigheter.
- PWA-cache, GitHub Pages-verifisering, statisk hosting og eksisterende Vercel/Supabase-konfigurasjon.

## Ikke-forhandlingsbare krav

- Bevar eksisterende turnerings-, scoring-, join-, admin-, spiller-, tilskuer-, offline- og personvernflyt.
- Ikke legg admin-token, spiller-token, service-role-nøkkel eller privat VAPID-nøkkel i klientkode, backup eller logger.
- Ikke omskriv eller slett kjørte Supabase-migrasjoner. Nye databaseendringer er nye migrasjonsfiler.
- Ikke bland brukerens språkpreferanse inn i delt turneringsstate.
- Ikke slett usikre filer direkte; arkiver dem etter referansesøk.
- Alle funksjonsendringer krever tester, `git diff --check`, dokumentasjon og verifisert deploy.

### Gjeldende fasegjennomføring

Oppdatert verifiseringsnotat: siste diff-skanning `60c77acd-3c28-4d7f-923a-50a476efef68` er fullført med komplett dekning av 51 endrede kilde-/konfigurasjonsfiler og ingen reportable funn. Dette erstatter de eldre skanningsreferansene nedenfor.

Siste Fase A-grense: appens globale event-wiring er flyttet til `app/app-events.js`, mens kampfiltrering, gruppering og tilskuerkort-rendering ligger i `app/match-list.js` med eksplisitte DOM-, oversettelses- og renderingsavhengigheter.

Nyeste Fase A-grense: baneinnstillinger er flyttet til `app/court-settings.js`, inkludert generering av banefelt, lokalisering av automatisk genererte banenavn, parsing av banenummer og visning av låst/åpen baneredigering. Modulen er lastet i HTML/service worker og har egen domenetest.

Nyeste Fase A-grense: rene oppslag for aktiv runde, kamp, spiller, spillerplassering og navnesøk er flyttet til `app/tournament-queries.js`. Modulen leser kun injisert state/leaderboard-data og har egen lastrekkefølge- og domenetest.

Nyeste Fase A-grense: kopiering og Web Share/fallback for turneringslenker er flyttet til `app/tournament-sharing.js`, med injiserte DOM-, oversettelses- og observability-avhengigheter samt egen domenetest.

Nyeste Fase A-grense: spillerinnsendinger av resultater, admin-gjennomgang og lokal/remote resolusjon er flyttet til `app/result-submissions.js`, med eksplisitte state-, score-, RPC- og DOM-avhengigheter samt egen domenetest.

Nyeste Fase A-grense: lokal varsling for spillerens kamp er samlet i `app/notification-system.js`, slik at service-worker-varsling og push-abonnement har samme varseldomene. Runtime og eksisterende varslingstester er kontrollert etter flytten.

Fase A-kontroll 2026-09-04: storage-nøkler, Supabase-config-leser, rene hjelpefunksjoner, DOM-registry, app-meta, theme, bootstrap-events, app-init, language-controller, app-renderer, session-controller, remote-state-controller og remote-sync-controller er isolert og lastet fra HTML/service worker, med ferske domenetester og lokal browser-verifisering. Branchen har fortsatt legacy-fallbacker og composition-root-ansvar i `app/app.js`; fase A står derfor som pågående. Dette er en kontrollert del-leveranse, ikke en ferdigmelding.

Leaderboard-/tabell-rendering er også flyttet til `app/standings.js`; `app.js` beholder kun orkestreringen.

Admin-spillerliste med redigering, avatarvalg og fjerning er flyttet til `app/player-list.js`.

Cup-bracketets DOM-rendering er flyttet til `app/cup-bracket.js`.

Spiller-dashboardets statuskort er flyttet til `app/player-status.js`.

Spillerens neste-kamp-rendering er flyttet til `app/player-next-match.js`.

Regel-renderingen er flyttet til `app/rules.js`.

Spilleridentitet, øktkontroll og tilgjengelighetskontroll er flyttet til `app/player-controls.js`.

Fullscore-dialogens rendering er flyttet til `app/large-score.js`.

Settresultat-dialogen og hurtigresultater er flyttet til `app/set-score-dialog.js`.

Lobby-status og sync-status-kontroller er flyttet til `app/admin-status.js`.

Profilkort og profilhistorikk-rendering er flyttet til `app/profile-ui.js`.

Backup-import og backup-eksport UI er flyttet til `app/backup-ui.js`.

Spiller-state-operasjoner for parsing, add, update og remove er flyttet til `app/player-state.js`.

Turneringsstatus, rundeblokkering og fremdriftskontroll er flyttet til `app/tournament-status.js`.

Remote state persistence for debouncede admin-lagringer er flyttet til `app/remote-state-write.js`, mens den eksisterende felles skrivekøen beholdes i entrypointen for å sikre riktig rekkefølge mot match- og score-RPC-er.

- Fase A: pågår. Avataransvar, lenke-/QR-generering, rene cup-runde-hjelpere, felles spiller-/lagmarkup, turnerings-runtime, workspace-overview-rendering, remote state persistence, admin-RPC-mutasjoner, spillerens poengkø, scoring-sideeffekter og global event-wiring er nå egne moduler. Videre oppdeling av den resterende `app/app.js` må gjøres trinnvis med regresjon etter hver grense.
- Fase B: lokalt verifisert. Diff-skanningen `60c77acd-3c28-4d7f-923a-50a476efef68` er fullført for 51 endrede filer med komplett dekning, ingen reportable funn og ingen åpne kandidater. Live Supabase-flyten er fortsatt ikke kjørt i lokal offline-verifisering og dekkes av den forventede skip-testen.
- Fase C: kode- og kontraktsverifisert. Testpakken (188 tester: 187 bestått, 1 forventet skip), syntakssjekken og diff-sjekken passerer. Lokal browserverifikasjon etter siste endring viser aktiv workspace, resultatpanel og ingen console-feil eller horisontal overflow; formell smoke/deploy og live Supabase-flyt må fortsatt bekreftes.
- Fase D: lokalt gjennomgått. Visuelle kaskader, status-/avatar-styling, oversettelsesnøkler og turneringsmotorens eksisterende regresjonstester er kontrollert. Aktiv JavaScript-runtime er manuelt verifisert lokalt etter siste endring; dette erstatter ikke formell smoke på deploy.

## Prioritert videre plan

### Fase A – Fullfør strukturkonsolideringen

Mål: gjøre modulgrensene reelle og holde `app/app.js` som en liten entrypoint.

Arbeid:

- Kartlegg gjenværende funksjoner i `app/app.js` etter ansvar: bootstrap, profil, remote, rendering, admin, spiller, turneringsdomene og UI-feedback.
- Flytt én sammenhengende ansvarsenhet om gangen til eksisterende eller nye moduler.
- Utvid modul-API-ene med eksplisitte avhengigheter, uten globale sideeffekter.
- Fjern døde CSS-regler for historiske landing-/workspace-menyer og gamle temafaser når referansesøk bekrefter at de ikke brukes.
- Hold `app/app.js` som entrypoint til slutt, og oppdater README, service worker og tester ved hver filflytting.

Akseptansekriterier:

- Hver flyttet ansvarsenhet har en testbar modulgrense.
- Ingen aktiv HTML-, JS-, CSS-, service-worker- eller dokumentasjonsreferanse peker til flyttede/arkiverte filer.
- Ingen endring i brukerflyt eller Supabase-kontrakt.

### Fase B – Sikkerhets- og personvernverifisering

Mål: verifisere hele angrepsflaten etter strukturendringene.

Arbeid:

- Kjør standard sikkerhetsskanning av repositoryet på siste commit.
- Gjennomgå funn for secrets, DOM/XSS-sinks, Supabase RPC/RLS/grants, tokenbinding, service worker, cache og deploykonfigurasjon.
- Rett validerte funn med minste nødvendige endring og legg til regresjonstest.
- Kontroller at personverntekst, retensjonspolicy og implementert databasejobb fortsatt beskriver samme virkelighet.

Akseptansekriterier:

- Skanningen er fullført med dokumenterte funn eller eksplisitt dokumenterte begrensninger.
- Alle reportable funn er rettet, akseptert med eierbeslutning eller blokkert med tydelig begrunnelse.
- Ingen hemmeligheter eller private tokenverdier finnes i tracked filer.

### Fase C – Produksjons- og brukerflytregresjon

Mål: verifisere hele appen etter hver større endring.

Påkrevd kontroll:

- `npm test`
- `npm run check:syntax`
- `git diff --check`
- Browser-smoke på desktop, medium/tablet og mobil.
- Hamburger åpne/lukke, språkvelger i drawer, navigasjon, Escape, språk per bruker/enhet og offline fallback.
- Opprett, join/QR, admin, spiller, tilskuer, poeng, kampstart, walkover, undo, realtime og retensjonsflyt.
- Ingen horisontal overflow, avkuttede logoer eller skjulte fokusringer.
- Service-worker-cache inneholder alle aktive shell-filer og ingen arkiverte filer.

### Fase D – UI og språk

Arbeidet er gjennomført lokalt mot gjeldende scope. Gjenstående produksjonsverifisering følger Fase C/CI:

- Gå over alle ui elementer, sjekk spacing, overlapp og om noe fremdeles bruker eldre stil.
- Sjekk at alle funksjoner i appen fungerer og gir riktig output.
- dobbeltsjekk at turneringsmotoren gjør det den skal med tanke på referanseappens funksjoner
- Sjekk at alle tekst linjer som ikke er bestemt hardcoded faktisk oversettes.

### Fase E – Valgstyrte produktforbedringer

Disse starter ikke før scope, personvern og akseptansekriterier er besluttet:

- Ekstern driftsvarsling for `/api/health`.
- Full konto- og tokenmigrering for administratorer.
- Mer avansert tiebreak/poengføring.
- PDF-eksport av tabell og resultat.
- Utvidet profilhistorikk og karrierestatistikk.
- Mer avansert offline-konflikthåndtering.
- Eventuell avataropplasting eller et større egendefinert avatarbibliotek; dagens avatarvelger og DiceBear Lorelei Neutral er gjeldende baseline.

## Dokumentasjons- og leveranseflyt

1. Registrer beslutning og scope her før et nytt initiativ starter.
2. Implementer i små, verifiserbare commits.
3. Oppdater [documentation.md](documentation.md) med dato, endring, tester og commit/deploy.
4. Arkiver erstattede planer under `docs/archive/plans/` og historiske logger under `docs/archive/history/`.
5. Kjør full verifikasjon før push.
6. Push til `origin/main` når brukerens arbeidsflyt uttrykkelig inkluderer publisering.

## Eierbeslutninger som fortsatt er åpne

- Skal ekstern monitor for health-endepunktet innføres, og hvem mottar varsler?
- Skal admin-konto bli obligatorisk, eller skal lokal/tokenbasert tilgang beholdes?
- Hvilke produktforbedringer skal prioriteres etter beta?
- Skal Vercel Analytics beholdes etter beta-evalueringen?
