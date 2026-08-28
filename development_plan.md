# Padelstar - Utviklingsplan

Sist oppdatert: 2026-08-28

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
- `v. 0.2 (Beta)` er verifisert på publisert `https://padelstar.app` med Vercel Analytics og service-worker-cache `v41`.
- Spillerpoeng krever nå et serverutstedt spillertoken som lagres hash-et i en RLS-beskyttet Supabase-tabell.
- Admin-state har nå serverstyrt revisjon og optimistisk kollisjonsvern; foreldede hele-state-skrivinger blir avvist av Supabase.
- Kampstart, avbrytelse og walkover går nå gjennom en servervalidert admin-RPC med samme revisjonsvern.
- Settresultat og round-robin-rundeavansement går nå gjennom servervaliderte admin-RPC-er.
- Dynamisk cup-rundeavansement går nå gjennom en servervalidert RPC som bygger neste bracket-runde, viderefører byes og oppretter eventuell bronsefinale atomisk.
- Realtime har nå én kontrollert kanal per turnering, statusvisning, reconnect med backoff, server-refresh og stale-revisjonsvern.
- Automatiserte regresjonstester er etablert for turneringsmotor, scoring, roller/moduler og Supabase SQL/RPC-kontrakter, med opt-in live Supabase-test og CI-kjøring før GitHub Pages-deploy.
- Spillere kan forlate sin lokale spillerøkt uten at spilleren slettes fra turneringen eller at kampoppsett/resultater endres for andre.

## Neste fase: produksjonsklar beta

Prioritert rekkefølge basert på siste dokumentasjonslogg:

1. **Bygg språkmotoren ferdig før mer UI-tekst.** Flytt resterende hardkodet brukerflate til strukturert i18n, med fallback, variabler og tester.
2. **Forbedre spillerøkt og tilgjengelighet.** Etter `Forlat turnering` skal spilleren få tydelige valg for å se som tilskuer, velge spiller igjen eller bli med på nytt.
3. **La spiller melde seg ute av videre turnering.** Spilleren skal kunne markere seg som utilgjengelig/reist uten at historiske kamper eller andre spilleres resultater påvirkes.
4. **Legg til tilskuerlenke.** Lag en egen read-only lenke/modus for publikum uten spillerstatus og uten join-/skriveflyt.
5. **Bygg brukerprofiler og historikk.** Etabler profilidentitet, koble turneringer/resultater/statistikk til profilen, vis spillerhistorikk og slett profil-eide data innen 30 dager etter profilsletting.
6. **Rydd filstruktur i en ren flyttefase.** Samle appkode, styling og dokumentasjon i tydelige mapper uten funksjonsendringer.
7. **Poler mobil- og turnerings-UI.** Forbedre navigasjon, rolleindikatorer, kampkort, spillerens nå-kort, filtre, tomtilstander, leaderboard og delingsflater.

## Detaljert gjennomføringsplan for «Neste fase»

Målet med neste fase er å gjøre 0.2 Beta robust nok til kontrollert bruk i ekte små turneringer, uten å utvide produktet med kontoer, betaling eller andre funksjoner som ikke er nødvendige for live-flyten. Arbeidet gjennomføres i rekkefølgen under. Hver hoveddel avsluttes med verifisering, dokumentasjon og egen commit/push før neste del starter.

### Fase 0 – Tillatelse, baseline og arbeidsregler

**Status: fullført 2026-08-27**

**Formål**

- Avklare hvilke live-systemer og brukerdata som kan berøres.
- Dokumentere baseline for kode, database, publisert PWA, grants, realtime og eksisterende tester.
- Lage en isolert testkonvensjon for midlertidige turneringer som alltid slettes etter testen.

**Arbeid**

1. Kontrollere branch, arbeidsstatus, siste commit, Supabase-migreringshistorikk og produksjonskonfigurasjon uten å endre dem.
2. Kontrollere at ingen hemmelige nøkler eller testdata ligger i repoet.
3. Lage en sporbar sjekkliste for hver fase: endrede filer, migrering, positiv test, negativ test, sikkerhetskontroll og cleanup.
4. Fastsette hvilke endringer som kan gjøres lokalt, hvilke som må kjøres mot Supabase, og hvilke som krever ekstern Vercel/GitHub/DNS-tilgang.

**Akseptansekriterier**

- Baseline og tillatelsesvalg er dokumentert.
- Ingen eksisterende brukerturnering eller brukerdata brukes som testfixture.
- Arbeidskopien er ren bortsett fra kjente brukerfiler før første kodeendring.

### Fase 1 – Hardne roller, skrivetilgang og rate limiting

**Status: fullført 2026-08-27**

**Formål**

- Sikre at admin, spiller og tilskuer har tydelig avgrensede handlinger.
- Redusere risikoen ved dagens statiske klient og bevisst anon-baserte RPC-er.

**Arbeid**

1. Kartlegge alle offentlige tabeller, RPC-signaturer, grants, RLS-policyer, `SECURITY DEFINER`-funksjoner og `search_path`.
2. Validere at admin-token aldri returneres i delt state eller backup, at spiller-token bare brukes til spillerens egne poeng, og at invitasjonskode ikke gir skriveadgang.
3. Kontrollere inputgrenser for navn, invitasjonskode, state-størrelse, lag, kamper, resultater og handlingstyper.
4. Legge inn eller stramme servervalidering på alle porterte admin-endepunkter, med token, rolle, aktiv turnering og revisjon. Reopen/undo får egen atomisk behandling i Fase 2.
5. Velge og implementere en rate-limit-strategi som passer statisk hosting. Førstevalg er server-side begrensning på join-, score- og admin-operasjoner basert på hash av token/turnering og tidsvindu. IP-basert begrensning eller Edge Function brukes bare hvis det er nødvendig og godkjent.
6. Kjøre Supabase security/performance advisors og kontrollere grants etter hver DDL-endring.

**Akseptansekriterier**

- Tilskuer kan lese relevant turneringsstate, men kan ikke skrive.
- Spiller kan bare føre poeng i egen kamp med gyldig serverutstedt token.
- Porterte admin-handlinger krever korrekt admin-token og forventet revisjon.
- Ugyldige payloads, token, roller, state-overganger og overskridelse av rate limit avvises uten delvis lagring.
- Ingen service-role-/secret-nøkkel finnes i frontend.

**Verifikasjon**

- Positive og negative RPC-tester per rolle.
- Grants/RLS/advisor-kontroll.
- Rate-limit-test med grense, avvisning og nytt tidsvindu.
- Test at alle testdata slettes og at tabellene er tomme for egne testfixture.

**Gjennomført i denne fasen**

- Skjulte `admin_token` fra anon-kolonnegrants på `public.tournaments`; delt state og backup inneholder fortsatt ikke tokenet.
- La til private `public.api_rate_limits` med atomisk hash-basert tidsvindu for create, join, score, admin-operasjoner og sletting. Lesing per invitasjonskode har også et begrenset tidsvindu.
- Flyttet eksisterende RPC-kropper til interne `_impl`-funksjoner og la validerende, rate-limitende wrappers på de offentlige RPC-navnene. Kun `anon` kan kalle wrapperne; interne funksjoner og rate-limit-hjelperen er ikke direkte kjørbare.
- La til klientgrenser for turneringsnavn og spillernavn, og skjuler rå Supabase-feilmeldinger fra sluttbrukeren.
- Beholdt `SECURITY DEFINER` på de offentlige RPC-wrapperne fordi dagens statiske klient bevisst bruker anon med tokenbasert autorisasjon. Supabase-advisorens tilsvarende varsler er derfor kjente og dokumenterte; `api_rate_limits` og `player_sessions` har RLS uten offentlige policyer med deny-by-default.

### Fase 2 – Gjøre gjenværende admin-operasjoner atomiske

**Status: fullført 2026-08-27**

**Formål**

- Fjerne siste behov for hele-state-skriving ved korrigering av kampresultater.
- Gjøre reopen/undo trygt ved samtidige admin-enheter.

**Arbeid**

1. Spesifisere undo-kontrakten: én siste handling per kamp, hvilken match/runde den gjelder, forventet revisjon og hvilke avledede felter som må gjenopprettes.
2. Lage servervaliderte RPC-er for reopen/undo av settresultat, poeng-/kampsteg og walkover der det er nødvendig, med radlås og compare-and-swap på revisjon.
3. Sikre at undo også gjenoppretter neste ventende kamp på riktig bane, rundestatus, cupvinner og bracketrelaterte felter.
4. Koble klientens undo-knapp til samme serialiserte skrivekø som øvrige admin-operasjoner.
5. Beholde lokal fallback uten Supabase, men vise tydelig når endringen bare er lokal.

**Akseptansekriterier**

- Reopen/undo kan ikke overskrive en nyere endring fra en annen admin.
- Undo kan bare brukes én gang på samme lagrede handling.
- Runde-, cup-, leaderboard- og banestatus blir konsistent etter undo.
- Hele-state-RPC brukes ikke for en atomisk kampkorrigering.

**Verifikasjon**

- Test for hvert undo-scenario, ugyldig kamp/status/token og stale revision.
- Sammenhengende test: registrer resultat → aktiver neste kamp → undo → bekreft full gjenoppretting.
- Cup-test med final/bronsefinale og round-robin-test med neste runde.

**Gjennomført i denne fasen**

- La til `admin_undo_match(...)` med egen server-side implementasjon, admin-token, radlås og compare-and-swap på forventet revisjon.
- Lagret komplett undo-snapshot for spillerpoeng, settresultat og walkover, inkludert kamp, eventuell neste ventende kamp, bane, rundestatus, turneringsstatus og cupvinner.
- Knyttet klientens `Angre resultat`/`Angre siste` til den serialiserte RPC-køen. Lokal fallback beholdes kun når Supabase ikke er konfigurert.
- Begrenset undo til siste aktive runde og én gjenoppretting per lagret handling. Eldre snapshot-format støttes uten å svekke revisjonskontrollen for nye snapshots.

**Verifikasjon**

- Positiv Supabase-test for settresultat og walkover: neste kamp ble startet, deretter ble kampstatus, neste kamp, bane og undo-snapshot gjenopprettet atomisk.
- Positiv Supabase-test for spillerpoeng: poeng og kamp ble rullet tilbake med snapshotet fjernet etter bruk.
- Negative tester for foreldet revisjon og nytt undo etter allerede utført undo ble avvist.
- Alle testene kjørte i rollback-transaksjoner; kontroll etterpå viste 0 turneringer, 0 spillerøkter og 0 rate-limit-rader.

### Fase 3 – Stabilere realtime, reconnect og stale state

**Status: fullført 2026-08-27**

**Formål**

- Gjøre fler-enhetsflyten forutsigbar når nettverket faller ut, siden lastes på nytt eller to adminer skriver samtidig.

**Arbeid**

1. Modellere realtime-statusene `connecting`, `connected`, `disconnected`, `reconnecting` og `error` i UI.
2. Håndtere channel-status og automatisk reconnect med kontrollert backoff, uten å opprette doble abonnementer.
3. Bruke serverrevisjon til å ignorere eldre realtime-payloads og hente fersk state etter reconnect.
4. Samordne realtime, online/offline-status, lokal cache og ventende skrivekø slik at offline-endringer ikke skjuler en serverkonflikt.
5. Gi admin en tydelig handling ved konflikt, mens spiller/tilskuer får lese siste kjente state og statusmelding.
6. Kjøre smoke-test på separate admin-, spiller- og tilskuerklienter med refresh, nettverksbrudd, samtidig resultat og reconnect.

**Akseptansekriterier**

- Maks ett aktivt realtime-abonnement per turnering/enhet.
- Nyeste serverrevisjon vinner; eldre payload kan ikke rulle state tilbake.
- Reconnect henter korrekt state uten manuell full restart.
- Feilstatus er synlig uten å avsløre tokens eller tekniske hemmeligheter.

**Gjennomført i denne fasen**

- La til statusmodellene `connecting`, `connected`, `disconnected`, `reconnecting` og `error` med oversatt statuspill og `aria-live`.
- Hindret doble Supabase-kanaler ved å gjenbruke kanal per turnering og ignorere callbacks fra gamle kanal-generasjoner.
- La til kontrollert reconnect-backoff på 1, 2, 5, 10 og 30 sekunder, og henter fersk state via `get_tournament_by_code(...)` etter reconnect.
- Ignorerer realtime-payloads med eldre revisjon. En nyere serverrevisjon vinner over ventende admin-state og viser en synlig `Last inn siste state`-handling ved konflikt.
- Gjør ventende admin-state og spillerpoeng købare i lokal lagring. Spillerpoeng kan sendes etter reconnect; admin-kampoperasjoner blokkeres tydelig offline fordi de ikke kan utføres optimistisk uten serverrevisjon.
- Oppdaterte app-shell/cache-busting til service-worker-cache `v41` og bundle-suffikset `padelstar-realtime-1`.

**Verifikasjon**

- `node --check app.js`
- `git diff --check`
- Lokal nettleser-smoke med to klienter mot samme app: begge viste `Online`/`connected`, og ingen konsollfeil ble registrert.
- Eksisterende Supabase stale-revisjonstest fra Fase 2 fortsatt avviser foreldet admin-skriving; ingen nye testdata ble opprettet i denne fasen.

### Fase 4 – Automatiserte regresjonstester

**Status: fullført 2026-08-27**

**Formål**

- Gjøre turneringsmotor, scoring, roller og databasekontrakter repeterbart testbare.

**Arbeid**

1. Etablere et minimalt testoppsett med eksisterende Node-/browser-verktøy; nye avhengigheter installeres ikke uten egen godkjenning.
2. Lage rene tester for scheduler: singles, doubles, rotasjon, sit-out, baner og deterministiske grenser.
3. Lage cup-tester for auto/manual lag, seeding, power-of-two, byes, oddetalls-bye, pending-slots, final og bronsefinale.
4. Lage scoringstester for 0/15/30/40, deuce, advantage, sett, kamp, ugyldig score og ledertabell.
5. Lage rolle-/modultester for admin, spiller, tilskuer, token og synlig/skjult navigasjon.
6. Lage SQL/RPC-kontraktstester for grants, revisions, race/conflict, rate limit og cleanup.
7. Koble testkommandoene til en lokal/verifiserbar CI-kjøring dersom repoet ikke allerede har dette.

**Akseptansekriterier**

- Testene feiler på en kjent regresjon og passer på korrigert kode.
- Alle prioriterte punkter over har minst én positiv og én negativ test.
- Testene kan kjøres uten produksjonsdata og uten å lekke tokens.

**Gjennomført hittil**

- Etablerte dependency-fritt `node:test`-oppsett via `npm test`.
- La til en testmodus i `app.js` som eksporterer turneringsmotoren til tester uten å starte DOM-/Realtime-oppstarten.
- La til første regresjonspakke for singles scheduler, doubles-rotasjon med sit-out, banetildeling, cup-byes/pending finaler, bronsefinale, tennispoeng/deuce/advantage, settvalidering og leaderboard.
- Utvidet pakken med rolle-/modultester for usaved state, admin, spiller, tilskuer, invitasjonsmatch og stripping av lokale admin-/spillertokens fra delt state.
- La til statiske SQL/RPC-kontraktstester for RLS, grants, private tabeller, anon-kolonnegrant uten `admin_token`, rate-limitende wrapper-RPC-er, `_impl`-revokes, revisjonsbasert compare-and-swap, spiller-tokenhash, radlåsing og single-use undo-snapshots.
- La til opt-in live Supabase-test som kjører create, read-grants, private-RPC-avvisning, gyldig admin-write, stale write-avvisning, join/spillertoken, spillerpoeng, ugyldig token-avvisning, rate-limit og cleanup.
- Knyttet `npm test` inn i GitHub Pages-workflowen før statisk artifact lastes opp.

**Verifikasjon hittil**

- `npm test` - 22 tester passerte.
- `node --check app.js`
- `node --check test/supabase-contract.test.js`
- `node --check test/live-supabase.test.js`
- `PADELSTAR_LIVE_SUPABASE=1 node --test test/live-supabase.test.js`
- `git diff --check`

### Fase 5 – Rydde struktur og tekst

**Status: fullført 2026-08-27**

**Formål**

- Redusere `app.js`-koblinger uten å endre observerbar funksjonalitet.
- Gjøre språk- og feilmeldinger konsistente.

**Arbeid**

1. Fryse testbaseline fra fase 4 før refaktorering.
2. Flytte oversettelsesdictionary og `t(...)` til `translations.js`, med `nb` som fallback for `nn`/`en`.
3. Dele ut rene domenegrenser for state/migrering, turneringsmotor, scoring, Supabase/realtime og visning i små, dokumenterte steg.
4. Beholde eksisterende globale browser-entrypoints inntil alle kallere er flyttet, slik at PWA-flyten ikke brytes.
5. Erstatte hardkodet brukertext gradvis, men la logg-/debugtekst og migreringskommentarer være teknisk tydelige.
6. Kjøre regresjonstest og browser-smoke-test etter hver modulgrense.

**Akseptansekriterier**

- Ingen funksjonsendring i opprett, join, admin, spiller, tilskuer, cup, scoring eller backup.
- Nye tekster følger samme nøkkel- og fallbackmønster.
- Moduler har tydelig ansvar og kan testes uten å starte hele UI-et der det er praktisk.

**Gjennomført hittil**

- Flyttet oversettelsesdictionary og fallback-oppslag til `translations.js`.
- Lastet `translations.js` før `app.js` i `index.html`, og oppdaterte testharnessen til samme scriptrekkefølge.
- Flyttet ren scheduler-/teamlogikk til `tournament-engine.js`, mens `app.js` beholder tynne delegater for eksisterende kall.
- Flyttet ren scoring, settvalidering, poengsummer, leaderboard og spillerstatusberegninger til `scoring-engine.js`.
- Flyttet state-migrering, sync-metadata, shared-state-sanitizing og remote-feilklassifisering til `state-manager.js`.
- Flyttet rene realtime-regler for kanalnavn, reconnect-backoff og statusklassifisering til `realtime-sync.js`.
- Oppdaterte service-worker-cache til `padelstar-v46` og la de nye domenemodulene inn i app-shell.
- La til regresjonstest for engelsk tekst, ukjent nøkkel og Bokmål-fallback.
- La til direkte motortest som bygger doubles-schedule og matchplan uten å gå via `app.js` state.
- La til direkte tester for scoring-, state- og realtime-modulene uten å gå via `app.js` state.

**Verifikasjon hittil**

- `npm test` - 27 tester passerte og 1 live-test ble korrekt skipped uten opt-in.
- `node --check translations.js`
- `node --check tournament-engine.js`
- `node --check scoring-engine.js`
- `node --check state-manager.js`
- `node --check realtime-sync.js`
- `node --check app.js`
- `node --check service-worker.js`
- Lokal browser-smoke med `python3 -m http.server 8080` og Playwright: forsiden rendret, app-shell var til stede, og `translations.js`, `tournament-engine.js`, `scoring-engine.js`, `state-manager.js` og `realtime-sync.js` ble lastet før `app.js`. En kjent lokal 404 for `/_vercel/insights/script.js` ble observert fordi enkel lokal server ikke har Vercel-endepunktet.

### Fase 6 – PWA, oppstart, offline og recovery

**Status: fullført 2026-08-27**

**Formål**

- Gjøre installert PWA mer robust på iPhone, Safari, Chrome og Android.

**Arbeid**

1. Måle kald oppstart, installert oppstart, app-shell, største assets og første interaksjon på representative viewport-størrelser.
2. Optimalisere kun dokumenterte flaskehalser: bildeformat/størrelse, fontlasting, script/cache og unødvendig første-render-arbeid.
3. Verifisere service-worker-strategi, cacheversjon, oppdatering og fallback ved offline navigasjon.
4. Innføre IndexedDB som robust lokal state-/kølagring med migreringsvei fra eksisterende localStorage; behold localStorage som kompatibilitetsfallback under overgang.
5. Kølegge bare eksplisitt støttede offline-handlinger, merke dem lokalt som ventende og sende dem etter reconnect med revisjonskontroll.
6. Lage recovery-flyt for siste kjente gode state, importert backup og konflikter; aldri overskriv serverstate automatisk etter ukjent konflikt.

**Akseptansekriterier**

- Appen starter og viser siste kjente visning offline.
- Cacheoppdatering kan verifiseres etter ny versjon uten fastlåst gammel app-shell.
- Lokal state overlever refresh og migrering.
- Offline handlinger blir enten synkronisert trygt eller tydelig presentert som ikke synkronisert.

**Gjennomført hittil**

- Gjorde service workeren mer oppdateringsvennlig med `skipWaiting()` og `clients.claim()`.
- Beholdt network-first-strategien, men hindrer caching av mislykkede same-origin-responser.
- Strammet offline navigasjonsfallback til cached `index.html`/app-shell.
- La til `padelstar-demo-last-good` som siste-kjente-gode recovery-kopi ved lokal state-lagring.
- `loadState()` faller tilbake til recovery-kopien hvis hovedstate i `localStorage` er korrupt.
- La til `offline-storage.js` som IndexedDB-speiling for state, recovery-kopi, rolle og sync-metadata, mens `localStorage` fortsatt er synkron oppstartsfallback.
- La til synlig recovery-beskjed når appen måtte starte fra siste-kjente-gode lokale state.
- Målte største app-shell-assets og byttet til skjermtilpassede PNG-varianter: `bg_img-1600.png`, `padelstar_logo-720.png`, `padelstar_button-540.png` og `zigonia-it_logo_gold-512.png`.
- Reduserte de fire målte startup-bildene fra ca. 3.2 MB til ca. 1.3 MB.
- La til testet assetbudsjett for startup-bildene.
- Oppdaterte service-worker-cache til `padelstar-v49`.

**Verifikasjon hittil**

- `npm test` - 33 tester passerte og 1 live-test ble korrekt skipped uten opt-in.
- `node --check offline-storage.js`
- `node --check app.js`
- `node --check service-worker.js`
- `node --check test/padelstar.test.js`
- `node --check test/pwa.test.js`
- Lokal browser-smoke med `python3 -m http.server 8080` og Playwright: app-shell rendret, `PadelstarOfflineStorage` var lastet, og IndexedDB var støttet i nettleseren. En kjent lokal 404 for `/_vercel/insights/script.js` ble observert fordi enkel lokal server ikke har Vercel-endepunktet.
- Offline navigasjon etter service-worker-installasjon ble verifisert med Playwright `network-state-set offline`; app-shell rendret fra cache med `deliveryType: "cache-storage"` og 200-status.
- Lokal navigasjonsmåling etter cache: DOM complete ca. 62 ms for HTML-navigasjonen fra service worker-cache.

### Fase 7 – Lanseringsgrunnlag og drift

**Status: fullført 2026-08-27**

**Formål**

- Gjøre betaen forståelig, sporbar og trygg å drifte.

**Arbeid**

1. Skrive kort personverntekst for navn, avatar, turneringsdata, tokens, realtime og eventuell analytics.
2. Avklare behandlingsansvarlig/kontakt, formål, lagringstid, sletting og geografisk driftsområde før teksten låses.
3. Implementere eller dokumentere utløp/sletting av turneringer og spillerøkter i tråd med valgt retensjon; sletting skal være eksplisitt og verifiserbar.
4. Dokumentere deploy/runbook for GitHub/Vercel, DNS, service worker, Supabase-migreringer, grants, advisors, backup og rollback.
5. Dokumentere feilhåndtering og observability: browser-status, Vercel Analytics, Supabase advisors, databasefeil og hva som ikke logges.
6. Verifisere produksjonsdeploy, HTTPS, offentlig join-lenke, PWA-assets, cacheversjon og live sync.
7. La GitHub-, Vercel- og Supabase-navn være uendret med mindre en konkret brukerbeslutning gjør rename nødvendig.

**Akseptansekriterier**

- Personverntekst og retensjon er godkjent av eier.
- En ny deploy kan gjennomføres og kontrolleres med dokumentert sjekkliste.
- Databaseendringer, backup, sletting og rollback har dokumentert fremgangsmåte.
- Publisert beta viser korrekt versjon, status og kontakt-/personvernlenke.

**Gjennomført hittil**

- La til `privacy.html` som et tydelig merket beta-utkast, med lenke fra appens footer og cache-busting til service-worker-cache `v50`.
- La til `data_retention.md` med foreslått 30-dagers retensjon etter avsluttet turnering, lokal lagring og slettingsprosedyre.
- La til `operations_runbook.md` med lokal verifikasjon, deploy, Supabase-migrering, backup, rollback, observability og produksjonssjekk.
- La til launch-readiness-tester for personvernside, retensjonsdokument og runbook.

**Verifikasjon hittil**

- `npm test` - 37 tester passerte og 1 live-test ble korrekt skipped uten opt-in.
- `node --check` passerte for nye moduler, service worker og testfiler.
- Lokal Playwright-smoke viste korrekt personvernsiden, footer-lenken og hovedappen. Kjent lokal begrensning er 404 på `/_vercel/insights/script.js` under enkel lokal server.

**Videre arbeid etter Fase 7**

- Spiller kan nå forlate sin lokale spillerøkt uten at deltakerlisten, kampoppsettet eller andre spilleres visning endres.
- Når profiler bygges, må profil-eid historikk kunne beholdes lenger og slettes innen 30 dager etter profilsletting.
- Profilmodell og kobling mellom profiler, turneringshistorikk og statistikk hører til en senere produktfase.
- Cleanup-funksjonen må få en fast automatisk trigger i Supabase-drift eller annen godkjent jobb; manuell kontrollert kjøring er dokumentert i runbooken.

### Fase 8 – Språkmotor, spillerøkt, tilgjengelighet og tilskuerlenke

**Status: fullført 2026-08-28**

**Formål**

- Fullføre språkmotoren før appen får mange nye synlige tekster.
- Gjøre det tydelig hva som skjer etter at en spiller forlater sin lokale spillerøkt.
- La spillere markere seg som ute av videre turnering uten å ødelegge historiske kamper, resultater eller andre spilleres visning.
- Gi publikum en ren read-only vei inn i turneringen uten personlig spillerstatus og uten skrivehandlinger.
- Gi første runde med synlige UI-forbedringer der de hører naturlig sammen med spillerøkt, rolle og sync.

**Arbeid**

1. Utvide `translations.js` fra enkel dictionary til en tydelig språkmotor for brukerflate: strukturert nøkkelnavn, variabler, fallback, manglende-nøkkel-håndtering og testdekning.
2. Flytte nye og eksisterende synlige brukerflatestrenger for spillerøkt, roller, sync og tilskuerlenke inn i språkmotoren før UI-et bygges videre.
3. Lage etterflyt etter `Forlat turnering` med valg for `Se som tilskuer`, `Velg spiller igjen` og `Bli med på nytt`.
4. Lage bedre tomtilstand i spillerpanelet etter forlatelse, med tydelige handlinger i stedet for bare tekst.
5. Skille mellom lokal forlatelse av spillerøkt og turneringsstatusen `utilgjengelig/reist`.
6. La spiller markere seg som ute av videre turnering, med tydelig bekreftelse og uten å fjerne spilleren fra historiske kamper.
7. Oppdatere scheduler/cup-start og videre runder slik at utilgjengelige spillere ikke trekkes inn i nye kamper, mens ferdige/aktive kamper beholder sine referanser.
8. Lage adminvisning med spillerstatus-chips for `Aktiv`, `Har forlatt enhet`, `Ute/reist`, `Venter` og `Spiller nå`.
9. Lage diskret rolleindikator for admin, spiller og tilskuer, slik at brukeren alltid ser hvilken visning/rolle som er aktiv.
10. Lage tilskuerlenke eller tilskuermodus som åpner turneringsvisningen direkte uten spillerstatus, spillerpoengføring eller join-handlinger.
11. Gjøre tilskuermodus tydelig med egen toppindikator og skjule personlig/handlingsrettet UI.
12. Lage mobil bunnnavigasjon for `Admin`, `Spiller` og `Turnering` der det gir bedre ergonomi enn toppfaner.
13. Gjøre sync-/offline-status mer forståelig i UI med tekst som `Online`, `Sender`, `Ikke sendt`, `Konflikt`, `Last inn siste` og `Prøv igjen`.
14. Legge inn enkel runde-/kampfremdrift som `Runde 2 av 5` og `6/12 kamper ferdig` der data finnes.
15. Teste lokal, Supabase og browserflyt for språkmotor, forlatelse, gjenvalg av spiller, utilgjengelighet, adminoversikt, mobilnavigasjon, sync-status og tilskuerlenke.

**Gjennomført hittil**

- Startet språkmotoren i `translations.js` med strukturerte nøkler, variabler, Bokmål-fallback og manglende-nøkkel-sporing.
- Flyttet første Fase 8-tekster for `Forlat turnering`, ventende spillerpoeng, sync-status og tilkoblingsstatus inn i språkmotoren.
- La inn støttede språk som én felles språkliste: Bokmål, Nynorsk, English (International), Español, Deutsch og Français.
- Språkvelgeren bygges fra språkmotoren, med statiske HTML-valg som fallback før JavaScript starter.
- Flyttet all synlig tekst i hovedappen fra `index.html` og `app.js` til oversettelsesnøkler, inkludert knapper, valglister, tomtilstander, dialoger, statusmeldinger, ARIA-etiketter, placeholders og metabeskrivelse.
- La inn automatisk nøkkeltest som sikrer at nye synlige apptekster har Bokmål-fallback, samt oversettelse av scorevalideringsfeil ved visning.
- Oppdaterte PWA-cache og scriptversjoner til `padelstar-v54`, `padelstar-i18n-4` og `padelstar-session-4`.
- La til etterflyt etter lokal forlatelse med tilskuer, spillerbytte og ny join.
- La til separat `availability`-status for `active` og `away`, slik at ute/reiste spillere ikke kommer med i nye round-robin- eller cup-runder mens historiske kamper beholdes.
- La til token-beskyttet `set_player_availability`-RPC i ny Supabase-migrering, med radlås og atomisk revisjonsøkning.
- La til offentlig `?spectate=KODE`-lenke, rolleindikator, tilskuerbegrensning og mobil bunnnavigasjon.
- Oppdaterte PWA-cache og scriptversjoner til `padelstar-v55`, `padelstar-i18n-5` og `padelstar-session-5`.
- Kjørte `20260828090000_player_availability.sql` i det koblede Supabase-prosjektet etter å ha synkronisert migreringshistorikken.

**Akseptansekriterier**

- Nye synlige UI-tekster i Fase 8 går via språkmotoren og har Bokmål-fallback.
- Alle synlige tekster i hovedappen er nå koblet til språkmotoren; lengre oversettelser i de fem øvrige språkene kan finpusses fortløpende uten nye hardkodede tekster.
- Språkmotoren støtter variabler for tellertekster, navn, runder og status uten strengbygging spredt i UI-koden.
- Etter `Forlat turnering` kan brukeren umiddelbart velge tilskuer, velge spiller igjen eller bli med på nytt.
- Spillerpanelet har en tydelig handlingsorientert tomtilstand etter forlatelse.
- En spiller som markerer seg ute/reist fjernes ikke fra tidligere kamper, tabellgrunnlag eller historikk.
- Nye runder bruker bare tilgjengelige spillere.
- Tilskuerlenke og ute/reist-status er implementert lokalt og live i Supabase med tokenbeskyttet RPC.
- Admin kan se forskjell på aktiv spiller, ute/reist spiller, spiller nå, venter og lokal spillerøkt som bare er forlatt på én enhet.
- Tilskuerlenken gir read-only turneringsvisning uten spillerfanens personlige status og uten skrivehandlinger.
- Mobilnavigasjon og rolleindikator gjør det tydelig om brukeren er admin, spiller eller tilskuer.
- Sync-/offline-status er handlingsklar uten tekniske ord som `state`, `sync` eller `revision` i brukerflaten.
- Eksisterende anonym join-flyt og adminflyt fungerer som før.

**Faseverifikasjon**

- `npm test`: 43 tester passerte, 1 opt-in live-test hoppet over uten live-testvariabler.
- `node --check app.js` og `node --check translations.js` passerte.
- `supabase migration list --linked`: alle lokale migreringer, inkludert tilgjengelighetsmigreringen, er synkronisert med live.
- Browser-smoke verifiserte språkvelger, tilskuerfallback, rollevisning og spansk/engelsk setup-flyt.

### Fase 9 – Brukerprofiler, historikk og profilstyrt sletting

**Status: fullført 2026-08-28**

**Formål**

- Gi spillere en varig identitet på tvers av turneringer uten å svekke dagens anonyme join-flyt.
- Gjøre tidligere turneringer, resultater og statistikk tilgjengelig som spillerhistorikk.
- Etablere tydelig eierskap og sletting for profilknyttede data.
- Forberede overgang fra lokal `Min spiller`-profil til serverknyttet profil uten å gjette brukeridentitet.

**Arbeid**

1. Definere profilmodell, stabil profil-ID, visningsnavn, avatar og hvordan en profil opprettes, velges og endres.
2. Knytte spilleridentitet, turneringsdeltakelse, kamper og statistikk til profilen uten å eksponere tokens.
3. Lage profilvisning med tidligere turneringer, resultater, poeng, statistikk og filtrering.
4. Lage `Min spiller`/profil-light med lokalt lagret navn og avatar som foreslås ved join før full konto/auth innføres.
5. Lage lokal turneringshistorikk for avsluttede turneringer med navn, dato, plassering, poeng og kamper, slik at den senere kan migreres til serverprofil.
6. Beholde anonym turneringsflyt og migrere eksisterende lokale spilleridentiteter uten å gjette brukeridentitet.
7. Lage profilsletting med 30 dagers forsinket sletting, status og mulighet for å angre før fristen.
8. Utvide Supabase RLS/RPC-er, cleanup-jobb og backup/import slik at profil-eide data behandles konsistent.
9. Forbedre admin-/sync-panelet med tydeligere status for `Ikke sendt`, `Serveren har nyere versjon`, `Last inn siste` og `Prøv igjen`.
10. Teste fler-enhetsflyt, profilbytte, historikk, sletting, retensjon og konflikter mellom lokal og live state.

**Akseptansekriterier**

- En spiller kan opprette eller velge sin profil uten at eksisterende anonym join-flyt brytes.
- Profilen viser kun spillerens egne historikk- og statistikkdata.
- Lokal profil-light foreslår navn/avatar ved join uten å kreve konto.
- Avsluttede turneringer kan lagres som lokal historikk og senere kobles til serverprofil etter eksplisitt brukerhandling.
- Profil-eide turneringer kan beholdes lenger enn 30 dager mens profilen består.
- Profilsletting markerer data for sletting og fjerner resterende profil-eide data innen 30 dager.
- Admin-/sync-panelet gjør konflikt/offline-status handlingsklart uten å lekke tokens eller tekniske hemmeligheter.
- Tokens, adminhemmeligheter og andre lokale skrivehemmeligheter inngår aldri i profilhistorikk eller eksport.
- RLS, RPC-er, cleanup og automatiserte tester dekker både positiv og negativ tilgang.

**Avklaringer før implementering**

- Om profil skal bruke e-post, passkey, magic link eller en annen identitetsmekanisme.
- Om en spiller kan ha flere profiler eller slå sammen historikk.
- Hvilke statistikkfelter som skal være synlige for profilen og eventuelt andre spillere.

**Gjennomført hittil**

- La til lokal profil-light med stabil profil-ID, visningsnavn, avatar og lokal lagring.
- Join-flyten foreslår profilens navn/avatar, men anonym join og eksisterende spillerflyt er fortsatt tilgjengelig.
- Avsluttede turneringer kan lagres som profilens lokale historikk med plassering, poeng, kamper, seire, sett og games.
- La til profilvisning med samlet statistikk og tidligere turneringer, isolert på profil-ID.
- La til 30 dagers slettestatus med angre-mulighet og automatisk lokal opprydding når fristen er passert.
- La til private Supabase-tabeller og tokenbeskyttede RPC-er for profil, historikk, slettingsstatus og intern cleanup.
- Profilhistorikk og eksport flytter ikke admin- eller spillertoken.

**Faseverifikasjon**

- Kjørte `20260828100000_player_profiles.sql`, `20260828103000_retention_cron.sql` og `20260828104500_profile_history_owner_key.sql` i koblet Supabase-prosjekt.
- Kontrollerte at `player_profiles` og `player_profile_history` finnes live med RLS, og at profilhistorikk har sammensatt eier-/historikknøkkel.
- Kontrollerte live `cron.job`: `padelstar-retention-cleanup` kjører daglig kl. 03:15 UTC og kaller begge cleanup-funksjonene.
- `npm test`: 47 tester totalt, 46 passerte og 1 opt-in live-test hoppet over uten testvariabler.
- Profilmanager-, Supabase-kontrakt- og PWA-testene passerte.
- Browser-smoke verifiserte oppretting/lagring av profil, persistering etter reload, profilforslag i join og historikkfilter.

### Fase 10 – UI-polish og mobil ergonomi

**Status: planlagt**

**Formål**

- Gjøre Padelstar mer behagelig, rask og tydelig i ekte turneringsbruk på mobil og desktop.
- Rydde de store arbeidsflatene slik at admin, spiller og tilskuer får hver sin naturlige rytme.
- Gjøre kamp-, tabell-, delings- og tomtilstander lettere å skanne under stress.

**Arbeid**

1. Samle `Opprett`, `Bli med` og `Fortsett` tydeligere på forsiden som tre startvalg.
2. Gjøre admin på mobil mer kompakt med sticky underfaner eller tydeligere separate arbeidsflater for `Styring`, `Del`, `Spillere` og `Kamper`.
3. Videreutvikle visuell rolleforskjell for admin, spiller og tilskuer i header/status.
4. Prioritere handlinger på adminkampkort: primær handling tydelig, sjeldne handlinger som walkover, avbryt og angre roligere eller samlet.
5. Gjøre spillerens `nå`-kort mer sportslig og ekstremt lett å skanne: bane, makker, motstander, score og status først.
6. Forbedre kampkort med klarere bane, status, score og kontrollhierarki.
7. Forbedre leaderboard med tydeligere forklaring på rangering: poeng, seire, sett, games og eventuelle sorteringshint.
8. Lage runde-/kampfilter for `Aktive`, `Neste`, `Ferdige` og `Mine`.
9. Gi cup-bracket egen fullbreddevisning eller bedre horisontal scroll når bracketen blir trang.
10. Forbedre tomtilstander før turneringsstart med en enkel trinnliste: del kode, legg til spillere, start når nok spillere er klare.
11. Vise `Sist oppdatert` i live-/sync-status når serverstate hentes eller realtime oppdateres.
12. Rydde teknisk språk ut av brukerflaten og holde tekniske begreper i tester/runbook.
13. Gjøre små knapper og ikonknapper mer tilgjengelige med bedre labels, tooltips og mobiltrefflate.
14. Strukturere delingspanelet med stor QR-kode, kopierknapper, join-lenke og tilskuerlenke side om side der skjermen har plass.
15. Lage bedre generelle tomtilstander for manglende kamper, spillere og valgt spiller.

**Akseptansekriterier**

- Mobil adminflyt kan brukes uten unødvendig scroll tilbake til toppnavigasjon.
- Spillerens viktigste kampinformasjon kan skannes på få sekunder på mobil.
- Kampkort har tydelig primærhandling og mindre visuelt støy fra sjeldne handlinger.
- Tilskuer/admin kan filtrere lange kampoversikter uten å miste kontekst.
- Cup-bracket er lesbar på mobil og desktop.
- Tomtilstander viser neste relevante handling, ikke bare forklarende tekst.
- Alle nye synlige tekster bruker språkmotoren fra Fase 8.

### Fase 11 – Filstruktur og prosjektorden

**Status: planlagt**

**Formål**

- Gjøre prosjektet lettere å navigere når appkode, tester, dokumentasjon og assets vokser.
- Flytte filer i en egen ren strukturendring uten funksjonsendringer, slik at eventuelle feil kan spores til path/import/cache og ikke blandes med produktendringer.

**Foreslått struktur**

```text
/
  index.html
  privacy.html
  manifest.webmanifest
  service-worker.js
  supabase-config.js
  app/
    app.js
    translations.js
    state-manager.js
    tournament-engine.js
    scoring-engine.js
    realtime-sync.js
    offline-storage.js
  styles/
    styles.css
  docs/
    development_plan.md
    documentation_log.md
    product_development.md
    data_retention.md
    operations_runbook.md
    migration_notes.md
    tournament_logic.md
  test/
  assets/
  supabase/
```

**Arbeid**

1. Beholde `README.md`, `package.json`, `vercel.json`, `manifest.webmanifest`, `service-worker.js`, `privacy.html`, `index.html` og `supabase-config.js` i root inntil hosting/PWA-kontrakter sier noe annet.
2. Flytte browsermoduler til `app/` og oppdatere `index.html`, service-worker app-shell, tester og dokumentasjon.
3. Flytte stylesheet til `styles/` og oppdatere asset-paths, preload/cache og tester.
4. Flytte plan-, produkt- og driftsdokumenter til `docs/`, men beholde README i root.
5. Kjøre full test, `node --check`, `git diff --check` og lokal browser-smoke etter flyttingen.

**Akseptansekriterier**

- Ingen observerbar funksjonsendring.
- Alle script/style/cache-paths peker til ny struktur.
- PWA-cache installerer og offline-fallback fungerer etter flytting.
- Tester og dokumentasjon bruker nye paths.
- Flyttingen committes separat fra språk-, profil- og UI-funksjoner.

## Tillatelser og avklaringer som må være på plass før implementering

Følgende ber jeg om eksplisitt godkjenning for før første implementeringscommit i denne fasen:

1. **Repo:** Tillat endringer i kildekode, SQL-schema, migreringer og dokumentasjon, med commit og push til `main` etter hver ferdig fase.
2. **Live Supabase:** Tillat lesing av schema/grants/advisors og kjøring av nødvendige DDL-migreringer mot prosjektet `sxzlljxodorkfrjnwfgr`.
3. **Midlertidige testdata:** Tillat at jeg oppretter testturneringer og spillerøkter med tydelig testkode i Supabase, og sletter bare disse etter hver test. Ingen eksisterende brukerdata skal slettes eller endres.
4. **Publisert beta:** Tillat read-only smoke-test mot `https://padelstar.app` og lokal PWA/browser-test. Dersom push automatisk utløser Vercel/GitHub Pages-deploy, tillat denne indirekte deployen.
5. **Eksterne tjenesteendringer:** Vercel-, GitHub-, DNS- eller Supabase-dashboardinnstillinger endres ikke uten særskilt godkjenning i tillegg. Jeg kan først kartlegge dem read-only.
6. **Avhengigheter:** Tillat ikke installasjon av nye npm-/systempakker som standard. Hvis test- eller rate-limitløsningen krever en ny avhengighet, stopper jeg og ber om separat godkjenning.
7. **Personvernvalg:** Før fase 7 trenger jeg din beslutning om behandlingsansvarlig/kontaktadresse, ønsket lagringstid for turneringer/spillerdata og om Vercel Analytics skal beholdes i betaen.

Standardforutsetning dersom du godkjenner uten andre valg: ingen konto-/auth-innføring i denne fasen, ingen rename av eksterne prosjekter, ingen sletting utover egne midlertidige testdata, og rate limiting holdes server-side så langt det er mulig innen dagens statiske arkitektur.

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
- på sikt opprette egen profil med fast avatar og statistikk

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
- avatar creator
- database med brukere så man kan logge inn fra flere enheter

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
9. Skriv personverntekst, fastsett dataretensjon og dokumenter produksjonsdrift. **Fullført i Fase 7.**
10. Fullfør språkmotoren, forbedre spillerøkt etter forlatelse, la spiller melde seg ute/reist og lag tilskuerlenke. **Planlagt i Fase 8.**
11. Bygg brukerprofiler, lokal profil-light, lokal turneringshistorikk, bedre sync-panel, profilknyttet historikk/statistikk og profilstyrt sletting innen 30 dager etter profilsletting. **Planlagt i Fase 9.**
12. Poler mobil- og turnerings-UI: forsidevalg, mobil admin, rolleindikatorer, kampkort, spillerens nå-kort, leaderboard, filtre, cup-bracket, tomtilstander, delingspanel og tilgjengelige småknapper. **Planlagt i Fase 10.**
13. Rydd filstruktur med appkode i `app/`, stylesheet i `styles/` og dokumentasjon i `docs/`, uten funksjonsendringer. **Planlagt i Fase 11.**

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
