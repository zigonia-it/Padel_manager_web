# Padelstar – implementeringsdokumentasjon

Sist oppdatert: 2026-09-04

## Gjeldende produktbeslutninger

De brukerrettede valgene som skal bevares gjennom nye faser er samlet i [produktbeslutninger og endringsvern](Development/produktbeslutninger.md). Dokumentet er styrende for menyrekkefølge og felles layout, roller, innlogget profilnavn, flerspråklig brukerflate, flerturneringsflyt, retensjon/GDPR og bruksanvisningen. Nye faser må få uttrykkelig godkjenning før de endrer et av disse valgene.

Gjeldende produktversjon: **0.5 (Beta)**.

## Nåtilstand etter branch-gjennomgang 2026-09-04

Denne statusen beskriver arbeidskopien på branchen `codex/padelstar-ui-refresh`, inkludert lokale endringer som ennå ikke er publisert. Den er den mest presise oversikten over hva som faktisk finnes i appen.

### Implementerte brukerfunksjoner

- Landing med Opprett, Bli med, Konto/Profil, gjenoppta lagrede turneringer og lenke til bruksanvisningen.
- Lokale/offline-turneringer og Supabase-turneringer når live-konfigurasjon er tilgjengelig.
- Valgfri admin-deltakelse, invitasjonskode, offentlig join-lenke og QR-kode.
- Admin-, spiller- og tilskuerroller, med lokal øktkontroll og mulighet til å forlate egen visning uten å endre delt state.
- Round-robin med singles/doubles, partnerrotasjon, sit-out/bye, banekø og automatisk banetildeling.
- Cup med automatisk/manuelt lagoppsett, seeding/shuffle, byes, bracket, bronsefinale, walkover og atomisk undo.
- Kampstart, avbrytelse, hurtig settresultat, fullscore-dialog, tennispoeng med deuce/advantage, validerte sett og resultatinnsending fra spiller.
- Adminpanel for styring, deling, spillere og kamper. Spillerflate med neste kamp, status, makker, motstandere, tilgjengelighet, resultat og tabell. Offentlig turneringsflate og separat TV Mode på `tv.html`.
- Historikk, profilstatistikk, partner-/head-to-head-statistikk, sesongoppsummering og lokal Elo-/insight-beregning. Vedvarende ratingdatabase og liga er senere arbeid.
- Lokal spillerprofil med automatisk DiceBear Lorelei Neutral-avatar og faste visningsnavn Sophie, Aiden, Luna og Milo. Konto med e-post/passord via Supabase Auth er valgfri for spiller og brukes for sterkere admin-eierskap.
- Flerspråklig brukerflate/personvernside på Bokmål, Nynorsk, engelsk, spansk, tysk og fransk, med region- og nøkkelfallback.
- PWA-installasjon, app-shell-cache, localStorage/recovery, IndexedDB-speiling, sync-kø, Web Share, opt-in-varsler og konfigurert serverdrevet push.

### Gjeldende design

- Én aktiv, konsolidert `classic`-stil med mørk marineblå bakgrunn, kjølige blå kanter, dempede skygger og samlet typografihierarki.
- Landing, setup, konto og workspace deler app-shell, toppbar, logo-lockup og responsiv innholdsflate. Landing bruker ikke lenger en konkurrerende fotografisk hero-bakgrunn.
- Desktop bruker fullbredde layout med kontrollert maksvidde; setup- og workspace-sider følger samme bredde- og spacinglogikk.
- Mobil/nettbrett bruker kontekstuell hamburger/drawer, språkvelger i menyen og Escape-lukking. Layouten håndterer lange spillernavn uten horisontal overflow.
- Kampkortene er scorecard-baserte med separate score-/sett-/game-felt, Anton kun for scoretall, blå aktive statuser og spilleraccentfarger. Rødt brukes til fare og avbrytelse.
- TV Mode er en egen lesbar storskjermflate med livekamper, neste kamper, stilling, kø/progress, status og tilbakeknapp.

### Verifikasjonsstatus

- `npm test`: 182 tester, 181 bestått og 1 forventet live-Supabase-test hoppet over.
- `npm run check:syntax` og `git diff --check` passerer.
- RLS/RPC, tokenbinding, revisjonskontroll, rate limiting, retensjon, modulgrenser og runtime-assets er statisk/testmessig dekket.
- Browser-smoke er ikke kjørt i denne arbeidsøkten fordi Playwright-pakken ikke er tilgjengelig i offline-miljøet. Live Auth, RPC, Realtime, push og produksjonsdeploy er derfor ikke på nytt verifisert.
- Branchens nye CSS-konsolidering fjerner historiske landing-/workspace-menyer, gamle tabs-regler og dupliserte setup-/scorecard-regler. Stylesheet-query-versjoner og service-worker-cache er oppdatert.

## 2026-09-03 – versjon 0.4 og funksjonskontroll

- Oppdaterte aktiv versjonsmerking fra `0.3` til `0.4 (Beta)` i app, språkfallback, README og produktdokumentasjon.
- Kontrollerte navigasjons- og startknappene etter forrige feilretting; modul-lenker bindes uavhengig av hamburgerkontrollen.
- Fant og rettet den konkrete initialiseringsfeilen som stoppet all knappnavigasjon: flerturneringsbiblioteket leste `getItem` fra feil storage-objekt og kastet en TypeError før appen bandt hendelser.
- Kontrollerte språkvelgeren; den tekniske native-velgeren skjules når den visuelle språkvelgeren brukes, slik at bare én språkvelger vises.
- Bumpet service-worker-cache til `padelstar-v240` for å sikre at funksjonsrettingen og versjonsendringen lastes hos brukere.
- Verifisert med `node --check app/guide-i18n.js`, `node --check app/navigation.js`, `npm test` og `git diff --check`: 175 beståtte tester, 1 forventet live-Supabase-test hoppet over.

## 2026-09-03 – siste leveranse

- Laget `guide.html` med en kort bruksanvisning for admin, spiller med profil, gjestespiller og tilskuer.
- Bruksanvisningen støtter Bokmål, Nynorsk, engelsk, spansk, tysk og fransk gjennom `app/guide-i18n.js`, og er lagt i PWA-cache for offline-lesing.
- Lagt til oversatt guide-lenke på hjemmesiden og i footeren.
- Dokumentert samlet produktstatus: felles meny/layout, profil- og Supabase Auth-flyt, profilnavn som gjenbrukes, flerturneringslagring, tre spillerroller, retensjon og GDPR-prinsipper.
- Opprettet [produktbeslutninger og endringsvern](Development/produktbeslutninger.md), som krever uttrykkelig godkjenning før nye faser endrer de avtalte valgene.
- Rettet navigasjonsbinding slik at meny- og startknapper ikke er avhengige av hamburgerkontrollen, og fjernet dobbelt språkfelt ved å cache-buste den visuelle språkvelgeren og service worker.
- Verifisert med `node --check app/guide-i18n.js`, `git diff --check` og `npm test`: 175 beståtte tester, 1 forventet live-Supabase-test hoppet over.

Dette er den aktive, kronologiske oversikten over tidligere implementeringer, beslutninger og verifiseringer. Den komplette eldre arbeidsloggen er bevart i [archive/history/documentation_log_legacy.md](archive/history/documentation_log_legacy.md). Planer som ikke lenger er operative ligger i [archive/plans/](archive/plans/).

## Gjeldende leveransestatus

- `main` er publisert til GitHub `origin/main`.
- Siste felles baseline på `main`: `9c0a7b7`. Gjeldende arbeidsbranch: `codex/padelstar-ui-refresh`, med lokale UI-/CSS-konsolideringer og dokumentasjonsoppdateringer som ikke er publisert.
- Siste brukerrettede baseline: DiceBear Lorelei Neutral-avatarer, automatisk avatar ved spillerregistrering, blått scorecard-design og responsiv status-/spillerlayout.
- Nyeste lokale strukturendring: avataransvar, accent-system, player-visuals, workspace-overview, UI-feedback, notification-system, profil-session, match-card, persistence, admin-identity, remote-feedback, realtime-connection, tournament-rounds, tournament-runtime, backup-format, lenke-/QR-generering, state-konstruksjon, state-bootstrap, modulruting og session-policy er isolert i egne app-moduler.
- Den gamle duplikate kampkort-renderingen er fjernet fra `app/app.js`; entrypointen bruker nå den eksplisitte `app/match-card.js`-grensen.
- GitHub-push er gjennomført; Vercel-produksjonsdeploy venter på separat deploy-godkjenning.
- Lokalt: `npm test` passerer med 182 tester: 181 beståtte og én forventet live-Supabase-test hoppet over; syntax- og diff-sjekk passerer.
- CI/deploy er satt opp med browser-smoke for desktop, medium og mobil. Tidligere smoke-kjøringer har verifisert opprettelse, start, hamburger, adminnavigasjon og kampvisning på 1440, 768 og 390 px uten horisontal overflow; ny kjøring etter denne branchens CSS-endringer gjenstår fordi Playwright ikke er tilgjengelig offline.
- Fase A er fortsatt under gjennomføring lokalt; Fase B er kode-/sikkerhetsverifisert, og Fase C–D er kontrollert på kode- og kontraktsnivå. Browser-smoke må kjøres på nytt når Playwright er tilgjengelig. Modulgrensene, setup-/workspace-flaten, scorecard-layouten og CSS-konsolideringen er dokumentert i nåstatusen øverst.
- Fase B-diffskanningen `60c77acd-3c28-4d7f-923a-50a476efef68` er fullført på arbeidskopien: 51 endrede filer og 4 sikkerhetsflater gjennomgått, ingen reportable funn. Live Supabase-flyt er ikke kjørt i denne offline-verifiseringen og forblir dekket av én forventet skip-test.
- Fase D UI-/språkgjennomgang er utført mot aktive HTML-, CSS- og JavaScript-filer. Eksisterende motor- og oversettelsesregresjoner passerer, initiale synlige fallback-tekster er bundet til oversettelsesnøkler, og browser-smoke bekrefter aktiv JavaScript-runtime og ingen overflow på desktop, medium eller mobil.
- Fase 1-arbeidet startet etter masterplanen `docs/Development/Padelstar-komplett-utviklingsplan.md`: spillerregistrering bruker automatisk stabil avatar, PWA-installasjon har native prompt og plattformfallback, manifestet bruker riktige ikonstørrelser, og live-turneringer krever innlogget admin før opprettelse. Eierfeltet settes ved opprettelse når Supabase Auth er aktiv.

## Kronologisk historikk

Siste verifisering: diff-skanning `c880f147-9773-4ca0-b64f-875b842a8194` er fullført med komplett dekning av 47 endrede kilde-/konfigurasjonsfiler og ingen reportable funn. Workspace-overview-rendering er isolert i `app/workspace-overview.js`, debounced remote state persistence i `app/remote-state-write.js`, admin-RPC-mutasjoner i `app/remote-admin-actions.js`, spillerens remote-poengkø i `app/remote-player-score.js`, scoring-sideeffekter i `app/score-actions.js`, workspace-navigasjon i `app/workspace-navigation.js`, global event-wiring i `app/app-events.js`, kamp-livssyklus i `app/match-actions.js`, og initial URL-/session-visning i `app/initial-view.js`.

Kampfiltrering, kampgruppering og tilskuerkort-rendering er nå isolert i `app/match-list.js`; `app.js` beholder kun orkestreringen av disse visningene.

Tabell- og leaderboard-rendering er isolert i `app/standings.js` med eksplisitte avhengigheter for accent, avatar, oversettelser og DOM.

Admin-spillerlisten er isolert i `app/player-list.js`, inkludert redigering, avatarvalg, fjerning og valg av eksisterende spillere.

Cup-bracket-renderingen er isolert i `app/cup-bracket.js`; entrypointen leverer state, oversettelser og kampoppslag.

Spillerstatuskortet er isolert i `app/player-status.js`, med eksplisitte state-, scoring- og oversettelsesavhengigheter.

Spillerens neste-kamp-rendering er isolert i `app/player-next-match.js`, med eksplisitte state-, kamp-, spiller- og oversettelsesavhengigheter.

Regel-renderingen er isolert i `app/rules.js`, med eksplisitte DOM-, state- og oversettelsesavhengigheter.

Spilleridentitet og øktkontroller er isolert i `app/player-controls.js`, med eksplisitte state-, avatar-, DOM- og oversettelsesavhengigheter.

Fullscore-dialogens rendering er isolert i `app/large-score.js`, med eksplisitte kamp-, scoring-, DOM- og oversettelsesavhengigheter.

Settresultat-dialogen er isolert i `app/set-score-dialog.js`, med eksplisitte kamp-, state-, DOM- og oversettelsesavhengigheter.

Lobby- og sync-status-rendering er isolert i `app/admin-status.js`, med eksplisitte state-, remote-status-, turnerings- og oversettelsesavhengigheter.

Profilkort og profilhistorikk-rendering er isolert i `app/profile-ui.js`, med eksplisitte profil-, lagrings-, DOM- og oversettelsesavhengigheter.

Backup-import og backup-eksport UI er isolert i `app/backup-ui.js`, med eksplisitte format-, state-, fil- og feedback-avhengigheter.

Spiller-state-operasjoner er isolert i `app/player-state.js`, med eksplisitte state-, schedule-, team-, persistence- og feedback-avhengigheter.

Turneringsstatuslogikken er isolert i `app/tournament-status.js`, med eksplisitte state-, round-, cup- og oversettelsesavhengigheter.

Oppføringene under er hentet fra den tidligere dokumentasjonsloggen og sortert fra eldste til nyeste. Detaljer, endrede filer og eldre testutskrifter finnes i arkivet.

### 2026-08-21

- Første webutkast og produktretning.
- Samordnet dokumentstil.
- Git-oppsett.
- Første lobby- og join-flyt.
- Deling av turnering i adminvisning.
- QR-kode for påmelding.
- Større MVP-runde for brukbar mandagsdemo.
- Spilleropplevelse og turneringsavslutning.
- Robust admin-scoring og rundeprogresjon.
- PWA, mobilpolish og tennispoeng.
- Større adminoppsett for mandagsdemo.
- Fikset dobbelbooking i kampgenerator.
- Overført spillerfargesystem fra SwiftUI.
- Stort pass på Now-opplevelse, kampkort og regler.
- Supabase live sync for fler-enhetsbruk.
- Plan for språkstruktur.
- Supabase GitHub-migration-struktur, prosjektkonfigurasjon og første migrering.
- GitHub Pages-publisering og verifisert publisert webapp.
- Skjult adminflate for spillere, mobilvisning, riktig visning etter reload og lokal rollebasert adminfane.
- Mobiltypografi/padding, norsk-sikker font, large-score, baneredigering, adminregler, set-popup, spillerprofilvalg og full kampplan.
- Hostingklar statisk app og footer med copyright.

### 2026-08-26

- En-sides modulflyt, Supabase-verifisering og publiseringsklar cache.
- Admin kan velge egen spillerprofil.
- Padelstar-branding og lettere PWA-assets.
- Ryddet utviklingsplan etter oppdateringslogikk.
- Dokumentert turneringslogikk fra iOS-appen.
- Menykomponent og in-app hamburgerfix.
- Ny landing page-retning og responsiv UI-plan.
- Supabase cleanup-RPC for testturneringer.
- Første automatiske cup-format, manuelle cup-lag, bracket/bronsefinale og walkover/undo.
- Spiller kan føre poeng i egen kamp.
- Hjem- og fortsett-flyt verifisert; hjemvisning under aktiv turnering.
- README og prosjektmetadata oppdatert.
- Join-lenke bruker offentlig nettadresse og tilkoblingsetiketter ble forenklet.
- Atomisk Supabase-synk for spillerpoeng migrert og verifisert.

### 2026-08-27

- Detaljert produksjonsplan og admin-RPC-er for cupavansement, settresultat, round-robin-avansement, kampstart, avbrytelse og walkover.
- Optimistisk kollisjonsvern for admin-state.
- Produktversjon oppdatert til 0.2 Beta.
- Produksjonskontroll og sikrere spillerpoeng.
- Topp-logo som hjem-knapp og oppdatert topp-logo.
- Produksjonsklarere brukerflate.
- Hardnet offentlige RPC-er og rate limiting.
- Reopen/undo gjort atomisk på serversiden.
- Realtime, reconnect og stale state stabilisert.
- Automatiserte regresjonstester og CI-kjøring etablert.
- Fase 5-modulgrenser og Fase 6 PWA-cache, recovery og asset-optimalisering fullført.
- Personvern, driftsgrunnlag og Fase 7-retensjonsjobb implementert og kontrollert.
- Spiller kan forlate lokal turneringsøkt.
- Språkmotor startet og all synlig apptekst gjort oversettbar.
- Fase 8 brukerprofiler, historikk og profilstyrt sletting fullført.

### 2026-08-28

- Realtime mellom separate klienter bekreftet.
- Fase 8-funksjoner verifisert lokalt og migrert live.
- Fase 9 profil-/historikkarbeid startet og ferdigstilt.
- Produksjons-, live- og offlinekontroll fullført.
- Fase 10 mobilnavigasjon og Fase 11 filstruktur fullført.
- Produksjonsdeploy verifisert.
- Videreplan etter Fase 11 og Fase 12–15 gjennomføring dokumentert.
- Sluttføring av Fase 12–15 og dokumentasjonsrydding.

### 2026-08-29

- Fase 16 planlagt, Lighthouse-baseline etablert, UI-/tilgjengelighetsoppgradering gjennomført og fasen lukket.
- Landing-layout, meny, tilskuervisning, avslutningsflyt og raske modulbytter justert.
- Fase 17 samlet UI, navigasjon og synlighet gjennomført.
- Hovedmeny og fri navigasjon mellom turneringer samlet.
- Kompakt responsivt toppfelt og logooverlapping rettet.
- Hero-logo, corner radius, overlay-clipping og fullbredde appflater harmonisert.
- Felles visuell stil etablert for resten av appen.
- Fase 16–21 første steg gjennomført, UI-effekter isolert og browser-/RPC-/spectator-state verifisert.

### 2026-08-31

- Cool-logoer og variantserie bygget fra originale assets.
- Cool sports-tema og midlertidig temavelger vurdert og senere fjernet som aktiv avhengighet.
- Senere visuell redesignplan vurdert og registrert som historisk referanse.
- Reference-match for Padelstar-logo og Zigonia-logo gjennomført.

### 2026-09-01

- Personvernsiden visuelt oppdatert med svart/mørkgrå flater og oversettelse til valgt språk.
- Struktur- og navigasjonsopprydding gjennomført.
- Språk-UI, JSON-persistens, felles kamp-rendering, remote-turneringsoperasjoner og admin-/spillerhandlinger isolert i egne moduler.
- Landing-menyen gjeninnført i felles app-shell.
- Historiske CSS-kaskader fjernet; stylesheetet delt i base, layout, komponenter, moduler og aktiv sluttkaskade.
- Inline landing-overstyringer fjernet og testet.
- Felles menyjusteringer verifisert på desktop, medium og mobil.
- Hero-tekst, versjon 0.3 Beta, språkmodul og generisk turneringsnavn oppdatert.
- Kampkontroller, kampoverskrifter, baneetiketter, poeng og pause/break oversatt.
- DiceBear-avatarer byttet fra `thumbs` til `lorelei-neutral` med stabil seed.
- Aktiv-tab-understrek fjernet, hamburgerikonet gjort synlig med CSS og responsiv cache bumpet til `padelstar-v99` (`db0b5eb`).

### 2026-09-02

- Kampkortene fikk en samlet blå scorecard-stil med tydeligere lagflater, resultatfelt, VS-grafikk og kompakte kampkontroller.
- Kampoversikter viser sett, games og poeng i separate felt, mens live tennispoeng kan føres direkte på kampkortet.
- Avatar-renderingen ble samlet med stabile DiceBear-avatarer, fargede avatar-rammer og en ny Anton-font for den visuelle kampkortretningen.
- Responsiv layout ble justert for små skjermer: hero og knapper fikk bedre vertikal plassering, kampoverskrifter og `NÅ`-chip unngår logooverlapp, og lange spillernavn brytes uten at avatarene flyttes vertikalt.
- Gjenstående gull-/bruntonede bakgrunner ble erstattet med mørkblå flater. Ventestatus, admin-spillerliste, walkover-/avbryt-knapper, rundesammendrag og menyflater følger nå samme blå palett.
- Overflødig `NÅ`-chip ble fjernet fra kampkortene. Den kompakte chip-stilen ble flyttet til `Pågår` og `Venter`, slik at statusen vises én gang med tydelig blå styling.
- Kampkortets toppfelt fikk større sikkerhetsmargin rundt den sentrerte logoen på smale bredder, slik at kampmetadata og status ikke overlapper merkevaren.
- Spillerlinjene måler nå faktisk tekstbrytning ved rendering og vindusendring. Ved flersidige navn plasseres avatar over navnet automatisk på alle sidebredder.
- Den siste røde rammen på aktive kampkort, fremhevede kamper og tilskuerkort ble endret til blå aktiv-status. Rødt er fortsatt reservert for avbryt/fare.
- Admin-panelene `Styring`, `Del`, `Spillere` og `Kamper` bruker nå samme fullbredde layout på desktop og større nettbrettbredder.
- Setup-sidene `Opprett` og `Bli med` bruker nå samme fullbredde innholdsflate som workspace-sidene, også ved responsive bredder.
- Tilskuerkortets resultat-tall bruker nå Anton-fonten isolert til scoretallene; lag- og spillertekst beholder vanlig UI-typografi.
- Fase A-strukturarbeidet ble videreført med eksplisitt `match-card`-modul og fjerning av legacy-duplikat i entrypointen.
- Admin-identitetsflyten ble flyttet til `app/admin-identity.js`, og den oppdaterte app-shell-cachen ble bumpet til `padelstar-v165`.
- Remote-feedback og RPC-policy ble flyttet til `app/remote-feedback.js`, og app-shell-cachen ble bumpet til `padelstar-v166`.
- Realtime-livssyklusen ble flyttet til `app/realtime-connection.js`, cup-runde-hjelperne til `app/tournament-rounds.js`, felles spiller-/lagmarkup til `app/player-visuals.js`, turnerings-runtime til `app/tournament-runtime.js`, og app-shell-cachen ble bumpet til `padelstar-v168`.
- Lokal sluttverifisering etter strukturendringen passerte med 97 tester (96 bestått, 1 forventet skip), syntaks- og diff-sjekk, samt browser-smoke på desktop, medium og mobil.
- Hero-innholdet på hjemmesiden fikk dobbel vertikal avstand fra den faste menyen, med tilsvarende responsiv justering på mindre skjermer.
- Tilskuerkortets scoretall fikk økt høyre innvendig luft, slik at tallet ikke ligger tett mot kanten.
- Avstanden mellom avatar og spillernavn i tilskuerkortene ble også økt for bedre lesbarhet.
- Avatarvelgeren i både påmelding og spillerprofil ble gjort om til en vertikal valgliste med synlig forhåndsvisning og faste navn: Sophie, Aiden, Luna og Milo. De eksisterende avatar-ID-ene (`smash`, `serve`, `wall`, `lob`) er beholdt for kompatibilitet.
- Workspace-headeren på turneringssiden ble gjort transparent, slik at den følger samme sammenhengende mørkeblå flate som resten av siden.
- Alle aktive appikonreferanser ble samlet til `assets/icons/padelstar-icon.png`: favicon, Apple-touch-icon, PWA-manifest, varsler og scorecard-emblem.
- Fjernet overflødig footer-logo og ryddet bort eldre score-input-kaskader som ikke lenger brukes av den nye scorecard-renderingen.
- PWA-cache og stylesheet-query-versjoner ble oppdatert videre til `padelstar-v159`, `padelstar-session-27` og `padelstar-ui-91`.
- PWA-cache ble bumpet til `padelstar-v164` etter at lokal persistence ble flyttet til egen app-shell-modul.
- Avatar-/profilvalgene bruker nå `app/avatar-system.js` som felles modul for Sophie, Aiden, Luna og Milo, mens eksisterende avatar-ID-er beholdes for lagret state og synkronisering.
- Join-lenker, tilskuerlenker og QR-URL-er bruker nå `app/link-utils.js`, med separat kontroll av lokal utviklings-URL og offentlig produksjons-URL.
- Turneringsstate-konstruksjonen bruker nå `app/tournament-state.js`, med direkte regresjonsdekning via appens eksisterende opprettelsesflyt og modulgrensekontroll.
- Recovery-lasting og parsing bruker nå `app/state-bootstrap.js`, med eksplisitt dekning av modulgrense og fortsatt recovery-fallback.
- Rollebasert modulvalg og fallback bruker nå `app/module-routing.js`, med eksplisitt dekning av policygrensen og eksisterende navigasjonsregresjoner.
- Aktiv turnering, invitasjonskontroll og lokal rolle bruker nå `app/session-policy.js`, med eksplisitt modulgrensekontroll.
- Spilleraccent-palett og kompatibilitet med eldre accent-ID-er bruker nå `app/accent-system.js`, med egen regresjonskontroll.
- Bekreftelser og toast-meldinger bruker nå `app/ui-feedback.js`, med tilgjengelig dialogfokus og auto-skjuling av statusmeldinger bevart.
- Backup-eksport og import bruker nå `app/backup-format.js`; validering og tokenfri serialisering er testet uavhengig av DOM-filflyten.
- Sluttkontroll for fase A–D i arbeidskopien: `npm test` 89 tester / 88 bestått / 1 forventet skip, `npm run check:syntax` og `git diff --check` passerer. Arbeidskopien er ikke publisert etter denne kontrollen.
- Push-varsler og subscription-livssyklus er isolert i `app/notification-system.js`; `npm test` 90 tester / 89 bestått / 1 forventet skip, `npm run check:syntax` og `git diff --check` passerer. Arbeidskopien er ikke publisert etter denne kontrollen.
- Browser-smoke er kjørt lokalt på desktop (1440), medium (768) og mobil (390); opprett/start/admin/kampflyt og responsive hamburgersteg passerer. Eksterne CDN/Supabase-kall ble blokkert som testforutsetning.
- Profil-session er isolert og browser-smoke er kjørt på nytt etter endringen; desktop, medium og mobil passerer samme opprett/start/admin/kampflyt.
- Match-card-modulen er koblet inn og browser-smoke er kjørt på nytt; desktop, medium og mobil passerer opprett/start/admin/kampflyt uten horisontal overflow.
- Browser-smoke-scriptet starter på `about:blank` og bruker lokale 204-test-svar for CDN, Supabase og Insights før appnavigering; smoke-kjøringen er dermed fri for forventet nettverksstøy.
- Verifisering: `npm test` passerer med 82 beståtte tester og én forventet live-Supabase-test hoppet over; `npm run check:syntax` og `git diff --check` passerer. Lokal statisk browser-kontroll viser desktop (1440 px), medium (768 px) og mobil (390 px) uten horisontal overflow; aktiv JavaScript-runtime kunne ikke bekreftes i testtilkoblingen.

### 2026-09-04

- Fase A-slice: profilhistorikkberegningen ble flyttet fra `app/app.js` til `app/profile-history.js` med eksplisitte state-, profil-, leaderboard- og retention-avhengigheter. Modulen er lagt i HTML-loader, service-worker-cache og testharness. `npm test` passerer med 183 tester: 182 bestått og 1 forventet live-Supabase-test hoppet over; syntaks, diff og lokal browser-reload uten console-feil passerer.
- CSS-oppsettet ble gjennomgått mot aktiv HTML/JavaScript-logikk: historisk landingsnavigasjon, avatarvelger, workspace-hamburger og gamle tabs-regler uten runtime-referanser ble fjernet, og dupliserte setup-/scorecard-regler ble samlet.
- Delte stylesheet-referanser ble synkronisert på app-, guide- og personvernsidene, service-worker-cachen ble bumpet til `padelstar-v272`, og CSS-query-versjonene ble oppdatert til gjeldende `layout-7`, `components-13`, `modules-9`, `ui-96` og `ui-consistency-40`. Statisk test og syntakssjekk passerer; browser-smoke kunne ikke kjøres fordi Playwright-pakken ikke var tilgjengelig uten nettverk.

- App-flow er analysert og dokumentert i [app_flow.md](app_flow.md), med routing, opprett/join, roller, scoring, realtime/offline, konto/profil, statistikk og retensjon.
- Dokumentasjonen presiserer skillet mellom Auth-konto, lokal profil, `ownerProfileId` og `ownerUserId`.
- Dokumentasjonen beskriver at profilerte spillere kan beholde egen statistikk, mens permanent turneringslagring krever profilert oppretter.
- Dokumentasjonen inkluderer kjente verifikasjonsgrenser: lokal browser-smoke dekker ikke live Supabase Auth/RPC/realtime.

## Verifikasjonsprinsipp

Hver ny oppføring skal inneholde hva som ble endret, hvilken brukerflyt som berøres, testresultater, commit-id og deploystatus. Nye funn eller åpne beslutninger føres i [Padelstar-komplett-utviklingsplan.md](Development/Padelstar-komplett-utviklingsplan.md), ikke som skjulte TODO-er i historikken.
