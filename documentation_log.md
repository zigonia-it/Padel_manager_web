# Padelstar - Dokumentasjonslogg

Sist oppdatert: 2026-08-27

Status: løpende prosjektlogg

Denne filen er den løpende prosjektloggen for Padelstar.

Regel: etter hver tydelige arbeidsøkt skal loggen oppdateres med hva som ble gjort, hvilke beslutninger som ble tatt, hvilke filer som ble endret, og hva som bør gjøres videre.

## 2026-08-27 - Porterte kampstart, avbrytelse og walkover til admin-RPC

- La til `admin_match_action(...)` som låser turneringsraden før endring og krever admin-token og forventet revisjon.
- Serveren validerer aktiv runde og kampstatus for `start`, `cancel` og `walkover`.
- Avbrytelse og walkover flytter neste ventende kamp til samme bane når det er relevant.
- Walkover lagrer undo-snapshot i state slik at eksisterende undo-flyt kan fortsette å fungere.
- Oppdaterte klienten slik at Supabase-tilkoblede adminer sender disse tre handlingene til RPC-en; lokal modus beholder eksisterende fallback.
- Serialiserte admin-skrivinger i klienten slik at ventende hele-state-lagring blir sendt før en kampaction.
- Kjørte migreringen `admin_match_actions` i Supabase-prosjektet `sxzlljxodorkfrjnwfgr`; Supabase registrerte den med versjon `20260826230954`.

### Endrede filer

- `app.js`
- `development_plan.md`
- `documentation_log.md`
- `supabase_schema.sql`
- `supabase/migrations/20260826230401_admin_match_actions.sql`

### Verifisering

- `node --check app.js`
- Supabase test: `start` økte revisjonen og satte kamp til `playing`.
- Supabase test: foreldet revisjon ble avvist.
- Supabase test: `cancel` satte neste ventende kamp til `playing` på frigitt bane.
- Supabase test: `walkover` satte vinner, status og walkover-markering korrekt.
- Kontrolltesten ryddet opp etter seg; ingen testturneringer ble liggende.

### Neste steg

- Portére settresultat og rundeavansement til validerte admin-operasjoner.

## 2026-08-27 - La til optimistisk kollisjonsvern for admin-state

- La til kolonnen `public.tournaments.revision`, som økes server-side ved hver godkjente state-endring.
- Oppdaterte `create_tournament`, `get_tournament_by_code`, `join_tournament` og `save_player_point` slik at state alltid bærer gjeldende revisjon.
- Endret `save_tournament_state` til å kreve forventet revisjon og avvise foreldede admin-skrivinger atomisk.
- Oppdaterte klienten med revisjonssporing, håndtering av samtidige lokale endringer og tydelig melding ved konflikt.
- Kjørte migreringen `atomic_admin_revisions` i Supabase-prosjektet `sxzlljxodorkfrjnwfgr`; Supabase registrerte den med versjon `20260826225931`.

### Endrede filer

- `app.js`
- `development_plan.md`
- `documentation_log.md`
- `supabase_schema.sql`
- `supabase/migrations/20260826225503_atomic_admin_revisions.sql`

### Verifisering

- `node --check app.js`
- Supabase test: lagring med forventet revisjon `0` ga revisjon `1`.
- Supabase test: ny lagring med foreldet revisjon `0` ble avvist.
- Bekreftet at gammel tre-parameter-signatur for `save_tournament_state` er fjernet og ny fire-parameter-signatur er aktiv.
- Kontrolltesten ryddet opp etter seg; ingen testturneringer ble liggende.

### Neste steg

- Portére validerte RPC-operasjoner for kampstart, resultat, walkover, avbrytelse og rundeavansement.

## 2026-08-27 - Bumpet produktversjon til 0.2 Beta

- Oppdaterte synlig appversjon fra `v. 0.1 (Beta)` til `v. 0.2 (Beta)`.
- Synkroniserte aktiv versjonsstatus i README og utviklingsplan.
- Bumpet service-worker-cache til `padelstar-v40` slik at PWA-en henter oppdatert app-shell.
- Lot backup-formatets interne `version: 1` stå uendret siden det ikke er produktversjonen.

### Endrede filer

- `index.html`
- `README.md`
- `development_plan.md`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Fortsette produksjonsklareringen fra `development_plan.md`.

## 2026-08-27 - Produksjonskontroll og sikrere spillerpoeng

- Verifiserte publisert `https://padelstar.app` i nettleser: `v. 0.2 (Beta)`, `padelstar_button-900.png` som hjem-knapp og Vercel Analytics-scriptet er aktive.
- Verifiserte publisert service-worker-cache `padelstar-v40`.
- La til serverutstedte spillertoken for Supabase-spillere; bare hash av tokenet lagres i `public.player_sessions`.
- Sikret `save_player_point(...)` mot manglende eller ugyldig spillertoken og fjernet den gamle fem-parameter-signaturen.
- Oppdaterte remote join og «Admin har lagt meg til» slik at begge oppretter en lokal spillerøkt med token.
- Fjernet spillertoken fra delt state og backup-eksport.
- Låste `player_sessions` med RLS uten offentlige lese-/skriverettigheter og låste `touch_updated_at`-funksjonens `search_path`.
- Fjernet offentlig execute-tilgang til den eksisterende `rls_auto_enable()`-funksjonen i Supabase.
- Kjørte migreringen `20260826223457_player_session_tokens` mot Supabase-prosjektet `sxzlljxodorkfrjnwfgr` via databasekanalen.

### Endrede filer

- `app.js`
- `README.md`
- `development_plan.md`
- `documentation_log.md`
- `supabase_schema.sql`
- `supabase/migrations/20260826223457_player_session_tokens.sql`

### Verifisering

- `node --check app.js`
- `git diff --check`
- Supabase positiv/negativ RPC-test: gyldig token førte poeng, ugyldig token ble avvist.
- Supabase bekreftet 0 testturneringer og 0 player sessions etter kontrolltesten.
- Supabase bekreftet at `anon` ikke kan lese `player_sessions` eller kjøre `touch_updated_at`/`rls_auto_enable`.

### Neste steg

- Gjøre kampstart, resultat, walkover, avbrytelse og rundeavansement atomiske mot Supabase.

## 2026-08-27 - Topp-logo som hjem-knapp

- Gjorde `padelstar_button-900.png` i headeren klikkbar.
- Koblet logoen til eksisterende `landing`-modul slik at den åpner hjemvisningen uten full sidelasting.
- La til tastaturfokus og tilgjengelig navn for hjem-knappen.
- Bumpet service worker-cache til `padelstar-v39`.

### Endrede filer

- `index.html`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Verifisering

- Lokal browser bekreftet at header-logoen vises som `Gå til hjem`.
- `node --check app.js`
- `git diff --check`

### Neste steg

- Fortsette med produksjonsklaringen fra `development_plan.md`.

## 2026-08-27 - Synkronisert plan og prioritert neste fase

- Brukte `documentation_log.md` som canonical arbeidslogg; det finnes ikke en separat `development_log.md` i repoet.
- Synkroniserte `development_plan.md`, `product_development.md` og `README.md` med gjennomført spillerpoeng-RPC, cup-format, bracket, bronsefinale, walkover, undo, join-lenke, Padelstar-branding og produksjonsklar brukerflate.
- Fjernet foreldede planpunkter som beskrev allerede implementert cup- og Supabase-funksjonalitet som gjenstående.
- Prioriterte neste fase: produksjonsdeploy og DNS, tilgangssikkerhet, atomiske admin-operasjoner, realtime/reconnect, automatiserte regresjonstester, modulær kode, PWA-ytelse og personvern/dataretensjon.

### Endrede filer

- `development_plan.md`
- `product_development.md`
- `README.md`
- `documentation_log.md`

### Verifisering

- Kontrollerte at planene beskriver samme implementerte status som de siste logginnslagene.
- Kontrollerte at neste steg er prioritert og ikke dupliserer ferdig arbeid.

### Neste steg

- Starte med produksjonsdeploy og fler-enhetssmoke-test før videre datalagsarbeid.

## 2026-08-27 - Oppdatert topp-logo

- Byttet toppfeltets sammensatte tekst- og ikonlogo med `assets/padelstar_button-900.png`.
- Tilpasset logoens størrelse for både workspace-header og smal mobilvisning.
- Bumpet service worker-cache til `padelstar-v38`.

### Endrede filer

- `index.html`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Verifisering

- `file assets/padelstar_button-900.png`
- `node --check app.js`
- `git diff --check`

### Neste steg

- Kontrollere den nye logoen i publisert PWA etter neste deploy.

## 2026-08-27 - Produksjonsklarere brukerflate

- Fjernet synlige referanser til demo, testing og demospillere fra appen.
- Fjernet utviklerknappen for å åpne startsiden fra delingspanelet.
- Endret nullstilling til `Nullstill turnering` med tydelig bekreftelse før lokale og nettlagrede data slettes.
- Beholdt `v. 0.1 (Beta)` som eneste synlige produktmodenhetsmarkering.
- Bumpet service worker-cache til `padelstar-v37`.

### Endrede filer

- `app.js`
- `index.html`
- `service-worker.js`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`
- Sjekket at aktive appfiler ikke inneholder synlige demo-/testetiketter.

### Neste steg

- Fortsette produksjonsklarering av data- og tilgangsmodell før bred lansering.

## 2026-08-26 - Join-lenke bruker offentlig nettadresse

- Join-lenken bruker nå `https://padelstar.app/?join=...` når appen kjøres på en publisert adresse.
- Lokal utvikling på `localhost`/`127.0.0.1` beholder lokal origin slik at join-flyt kan testes lokalt.
- Bumpet service worker-cache til `padelstar-v36`.

### Endrede filer

- `app.js`
- `index.html`
- `service-worker.js`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`

### Neste steg

- Deploy endringen slik at den nye offentlige join-lenken brukes av publiserte turneringer.

## 2026-08-26 - Forenklede tilkoblingsetiketter

- Endret statuspillen fra `Live PWA` til `Online`.
- Endret lokal fallback fra `Lokal PWA`/`Lokal demo` til `Lokal`.
- `Offline` beholdes når nettleseren er frakoblet.
- Bumpet service worker-cache til `padelstar-v35`.

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`

## 2026-08-26 - Migrert og verifisert atomisk Supabase-synk for spillerpoeng

### Gjort

- La til `save_player_point(...)` som en egen begrenset Supabase RPC.
- RPC-en låser turneringsraden, validerer invitasjonskode, kampstatus, spillerens tilhørighet og lagindeks, og oppdaterer kun én poenghendelse.
- Portet eksisterende tennispoeng-, game-, sett- og kampavansementlogikk til den atomiske RPC-en.
- La til en seriell klientkø for spillerpoeng slik at raske trykk behandles i riktig rekkefølge.
- Stoppet spillerrollen fra å sende hele turneringsstate via admin-RPC.
- Oppdaterte rot-skjemaet og opprettet migration `20260826211047_player_score_rpc.sql`.
- Kjørte migrationen mot Supabase-prosjektet `sxzlljxodorkfrjnwfgr`.
- Bumpet service worker-cache til `padelstar-v30` for spillerpoeng-klienten.

### Beslutninger

- Admin fortsetter å bruke `save_tournament_state` med admin-token.
- Spillere sender bare kamp-ID, spiller-ID, lagindeks og invitasjonskode for ett poeng.
- RPC-en er et bevisst offentlig anon-endepunkt i dagens statiske MVP og må følges opp med rate limiting/sterkere spiller-token før bred produksjonsbruk.

### Endrede filer

- `app.js`
- `service-worker.js`
- `supabase_schema.sql`
- `supabase/migrations/20260826211047_player_score_rpc.sql`
- `development_plan.md`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`
- Supabase security advisors ble lest for å kontrollere eksisterende funksjons- og grant-mønster.
- Kjørte RPC-en direkte med gyldig spiller og bekreftet at `teamOne` økte fra `1` til `2`.
- Kjørte RPC-en med ukjent spiller og bekreftet avvisning.
- Bekreftet grants: `anon` kan kjøre RPC-en, `authenticated` kan ikke.
- Lokal browser verifiserte at spillerklienten kunne sende poeng og at live state ble oppdatert til `40-0`.

### Neste steg

- Følge opp rate limiting/sterkere spiller-token før bred produksjonsbruk.
- Fortsette med turneringstype-logikken fra `tournament_logic.md`.

## 2026-08-26 - Første automatiske cup-format

### Gjort

- La til formatvalg mellom `roundRobin` og `cup` i adminreglene.
- Implementerte automatisk cup-lagoppsett med paring av spillere to og to; en eventuell siste spiller ved oddetall sitter over i første runde.
- Implementerte seeding, bracket-størrelse til nærmeste power of 2 og byes.
- Implementerte dynamisk opprettelse av neste cup-runde fra vinnerlagene.
- La til migreringssikring for `settings.format` og `state.cup`.
- Rettet overgangstilstanden slik at neste cup-runde blir tilgjengelig når siste kamp i aktiv runde er ferdig.
- Bumpet service worker-cache til `padelstar-v31` etter automatisk cup-støtte.

### Beslutninger

- Første cup-snitt bruker automatisk lagoppsett og krever minst fire spillere; oddetall håndteres med sit-out for siste spiller.
- Manuelle lag, bronsefinale og full pending-bracket kommer senere.
- Round-robin-flyten beholdes uendret.

### Endrede filer

- `index.html`
- `app.js`
- `development_plan.md`
- `tournament_logic.md`
- `product_development.md`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`
- Lokal browser på `http://127.0.0.1:8091` med ren origin.
- Opprettet cup med åtte spillere og to baner.
- Bekreftet formatvalg, fire automatiske lag, to aktive kamper i første runde og vinnerne videre til runde 2.
- Bekreftet at fullført aktiv cup-runde viser `Start neste runde`.

### Neste steg

- Legge til tester for cup-seeding, byes og rundeavansement.
- Portere manuelle cup-lag, bronsefinale, walkover og undo.

## 2026-08-26 - Manuelle cup-lag

### Gjort

- La til valg mellom automatisk og manuelt cup-lagoppsett i admin.
- La til lagredigering før turneringsstart, med ett lag per linje og `+` mellom spillerne.
- Validerer at lagene har én eller to spillere, at spillerne finnes og at hver spiller bare brukes én gang.
- Koblede manuelle lag til cup-generatoren; spillere som ikke er med på et manuelt lag sitter over i første runde.
- Holder lagoppsettet låst etter at første runde er startet.
- Bumpet service worker-cache til `padelstar-v32`.

### Beslutninger

- Manuelle lag lagres som `cupTeams` i turneringsstate og bruker eksisterende spiller-ID-er og accents.
- Et manuelt lag kan foreløpig bestå av én eller to spillere, slik at samme cup-motor også kan brukes til single-lag.
- Bronsefinale, pending-bracket, walkover og undo er fortsatt egne gjenstående porteringssteg.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`

### Neste steg

- Portere pending-bracket og bronsefinale.
- Legge til walkover- og undo-flyt.

## 2026-08-26 - Cup-bracket og bronsefinale

### Gjort

- La til eksplisitt cup-bracket i turneringsstate med pending-slots for senere runder.
- Viser første runde, pending finale og eventuell pending bronsefinale i adminvisningen.
- Oppdaterer bracket-slots når vinnerne fra forrige runde er klare.
- La til valgfri bronsefinale mellom taperne fra semifinalene.
- Markerer cupen som ferdig når finalen og eventuell bronsefinale er ferdige.
- Bumpet service worker-cache til `padelstar-v33`.

### Beslutninger

- Bracketet lagres som `state.cup.bracket` med `match`- og `pending`-slots.
- Bronsefinalen behandles som en egen kamp i finalerunden, men påvirker ikke hvilket lag som vinner cupen.
- Eldre cuper uten eksplisitt bracket fortsetter med eksisterende dynamiske rundeavansement.

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `development_plan.md`
- `tournament_logic.md`
- `product_development.md`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `git diff --check`
- Lokal browser på `http://127.0.0.1:8095` med ren origin.
- Bekreftet pending finale og bronsefinale etter cupstart.
- Fullførte første runde og bekreftet at finale og bronsefinale ble opprettet med riktige lag.
- Fullførte begge sluttkampene og bekreftet `Fullført`, vinner i bracket og ingen browser-feil.

### Neste steg

- Legge til walkover og undo.

## 2026-08-26 - Walkover og ett-stegs undo

### Gjort

- La til admin-knapper for å registrere walkover til hvert av lagene.
- Walkover markerer vinner, setter kampstatus til ferdig og påvirker ikke game- eller settresultater.
- La til ett-stegs undo for siste poeng, settresultat eller walkover.
- Undo gjenoppretter også kampstatus, turneringsstatus og eventuell neste kamp som ble startet automatisk.
- Markerer walkover tydelig i kampkortet og bracketet.
- Bumpet service worker-cache til `padelstar-v34`.

### Beslutninger

- Undo lagrer kun siste handling per kamp, i tråd med iOS-modellens `lastScoredMatchState`.
- Walkover er en admin-operasjon; spillerrollen får fortsatt bare poengknapper.
- Full historikk og flere undo-steg er ikke en del av denne porteringen.

### Endrede filer

- `app.js`
- `styles.css`
- `index.html`
- `service-worker.js`
- `development_plan.md`
- `tournament_logic.md`
- `product_development.md`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `git diff --check`
- Lokal browser på `http://127.0.0.1:8096` med ren origin.
- Bekreftet at admin-kortet viser to walkover-kontroller.
- Registrerte et 6-0-resultat og bekreftet at `Angre resultat` gjenopprettet kampen til 0-0 og `playing`.
- Bekreftet ingen browser-feil etter reload.

### Neste steg

- Skille tydeligere mellom host/admin og spilleridentitet i datalaget.
- Gjøre øvrige kampoperasjoner atomiske mot Supabase.

## 2026-08-26 - Spiller kan føre poeng i egen kamp

### Gjort

- Gjorde poengknappene tilgjengelige i spillerens egen pågående kamp.
- Begrenset spillerkontrollene til poengføring; admin beholder bane-, sett-, kamp- og avbryt-funksjoner.
- Fjernet funksjonen fra listen over planlagte funksjoner.

### Beslutninger

- En spiller får bare poengkontroller når valgt spiller er med i kampen og kampen har status `playing`.
- Ventende, avsluttede og andre spilleres kamper viser ingen redigeringskontroller.
- Den eksisterende lagrings- og realtime-arkitekturen beholdes; separat serverautorisert spiller-skriving må hardnes i neste datalagfase.

### Endrede filer

- `app.js`
- `README.md`
- `development_plan.md`
- `service-worker.js`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `git diff --check`
- Lokal browser på `http://127.0.0.1:8090`.
- Opprettet en aktiv kamp med Ada, Bo, Cato og Dina.
- Valgte Ada som spiller og bekreftet at egen pågående kamp viser bare poengknapper.
- Trykket `Poeng Ada & Dina` og bekreftet at stillingen endret seg fra `0-0` til `15-0`.

### Neste steg

- Legge inn automatiserbare tester for kampgenerator, scoring, leaderboard og rolle-/modulvisning.
- Samle opprydding av midlertidige testturneringer.

## 2026-08-26 - Verifisert hjem- og fortsett-flyt etter merge

### Gjort

- Merget `codex/padelstar-post-beta-0.1` inn i `main` som fast-forward.
- Opprettet ny arbeidsgren `codex/padelstar-post-beta-0.2` fra den sammenslåtte `main`.
- Verifiserte lokalt i browser at en aktiv turnering viser `Hjem` i menyen.
- Verifiserte at hjemvisningen viser resume-panelet med turneringsnavn, spillere, baner og invitasjonskode.
- Verifiserte at `Fortsett som admin` returnerer til adminmodulen med samme turneringsstate.

### Beslutninger

- Nye endringer skal bygges videre på den sammenslåtte Padelstar-beta-historikken.
- Browser-verifiseringen bruker en midlertidig testturnering som må slettes etter testen.

### Endrede filer

- `documentation_log.md`

### Verifisering

- Lokal browser på `http://127.0.0.1:8090`.
- Opprettet `Codex Home Flow Test 2046` med invitasjonskode `ZXZRU`.
- Bekreftet flyten aktiv turnering → `Hjem` → `Fortsett som admin`.

### Neste steg

- Rydde testturneringen fra Supabase etter eksplisitt bekreftelse.
- Fortsette med neste produksjonsklarering i `development_plan.md`.

## 2026-08-26 - Hjemvisning under aktiv turnering

### Gjort

- Gjorde `Hjem` tilgjengelig i menyen også når en turnering er aktiv.
- Endret `showStart()` slik at den alltid viser landing/hjem, ikke automatisk turneringsvisning.
- Lot resume-panelet på hjemvisningen være veien tilbake til admin-, spiller- eller turneringsmodulen.
- Bumpet service worker-cache til `padelstar-v28`.
- Fjernet punktet om hjem-/tilbakeflyt fra aktiv utviklingsplan.

### Beslutninger

- Hjemvisningen skal ikke avslutte eller nullstille turneringen.
- Aktiv turnering kan fortsatt fortsettes via `Fortsett som admin` eller `Fortsett turnering`.

### Endrede filer

- `app.js`
- `index.html`
- `service-worker.js`
- `development_plan.md`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`
- Sjekket at alle filer i service worker app-shell finnes lokalt.
- Kjørte lokal mobilflyt i browser på `http://localhost:8090`:
  - opprettet testturnering `Codex Home Test 2044`
  - bekreftet at aktiv turnering viser `Hjem`, `Bli med`, `Admin`, `Spiller` og `Turnering`
  - gikk til `Hjem`
  - bekreftet at hjemvisningen viser resume-panelet for aktiv turnering
  - brukte `Fortsett som admin` tilbake til adminmodulen
  - brukte `Nullstill demo`
  - bekreftet i Supabase at invitekode `3J7V3` hadde `remaining = 0`

### Neste steg

- Browser-verifisere flyten: opprett turnering, gå til `Hjem`, fortsett tilbake til aktiv turnering.

## 2026-08-26 - La planlagte funksjoner inn i README

### Gjort

- La til en kort `Planlagte funksjoner`-seksjon i `README.md`.
- Beholdt README som forklarende dokument, men gjorde plass til en produktnær oversikt over kommende funksjoner.

### Beslutninger

- README kan vise planlagte funksjoner på høyt nivå.
- Detaljert arbeidsrekkefølge og tekniske oppgaver skal fortsatt ligge i `development_plan.md`.

### Endrede filer

- `README.md`
- `documentation_log.md`

### Neste steg

- Synkronisere denne listen med `development_plan.md` når større funksjoner flyttes fra plan til ferdig app.

## 2026-08-26 - Gjort README mer forklarende

### Gjort

- Skrev om `README.md` fra planpreget tekst til en forklaring av hva appen er og hvordan den fungerer.
- Endret formuleringen fra bare `statisk webapp` til `responsiv PWA som kan hostes statisk`.
- Flyttet fokuset i README til produkt, roller, prosjektstruktur, lokal kjøring, Supabase, publisering og dokumentasjonskart.
- Presiserte i `development_plan.md` at appen er responsiv, men fortsatt kan hostes statisk.

### Beslutninger

- README skal forklare prosjektet, ikke fungere som operativ utviklingsplan.
- Videre prioriteringer og åpne tekniske punkter skal ligge i `development_plan.md`.

### Endrede filer

- `README.md`
- `development_plan.md`
- `documentation_log.md`

### Neste steg

- Holde README kort og produktnært når nye funksjoner legges til.

## 2026-08-26 - Lagt inn prosjektmetadata

### Gjort

- La inn offisiell metadata for appen i dokumentasjonen:
  - Navn: Padelstar
  - Undertittel: Padel Manager
  - Utvikler: Sigurd Steen Grødem
  - Firma: Zigonia IT
- Oppdaterte HTML metadata med `application-name`, `author` og mer presis description.
- Byttet topptekst/eyebrow i appen til `Padel Manager`.
- La inn utvikler/firma i footer.
- Oppdaterte manifestbeskrivelse med samme metadata.
- Bumpet service worker-cache til `padelstar-v27`.

### Beslutninger

- `Padelstar` er appnavnet.
- `Padel Manager` brukes som undertittel/kategori, ikke som gammelt produktnavn.
- Sigurd Steen Grødem og Zigonia IT skal være synlig i footer og dokumentasjon.

### Endrede filer

- `index.html`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `README.md`
- `development_plan.md`
- `product_development.md`
- `documentation_log.md`

### Neste steg

- Verifisere etter deploy at tittel, footer og PWA-metadata vises riktig i publisert app.

## 2026-08-26 - Supabase cleanup-RPC for testturneringer

### Gjort

- Installerte og verifiserte Supabase CLI, Vercel CLI og 12ui CLI.
- Opprettet Supabase migration med CLI: `20260826202526_delete_tournament_rpc.sql`.
- La til `delete_tournament(p_tournament_id uuid, p_admin_token text)` som admin-token-beskyttet RPC.
- Oppdaterte rot-skjemaet `supabase_schema.sql` med samme funksjon og grants.
- Knyttet `Nullstill demo` til remote sletting når Supabase er aktiv og lokal admin-token finnes.
- Kjørte migrationen på Supabase-prosjektet `sxzlljxodorkfrjnwfgr`.
- Verifiserte at `anon` kan kjøre funksjonen, mens `public` og `authenticated` ikke har execute-grant.
- Testet sletting i transaksjon med midlertidig rad og rollback.
- Slettet Playwright-testturneringen `PASTM` fra live Supabase og verifiserte at den ikke finnes lenger.
- Bumpet service worker-cache til `padelstar-v26`.
- Fjernet cleanup-punktet fra aktiv utviklingsplan etter at det var implementert.

### Beslutninger

- Sletting av turnering gjøres via RPC med både turnerings-ID og admin-token, ikke direkte tabell-delete fra klient.
- Lokal reset skal fortsatt fungere selv om remote-sletting feiler, men feilen logges og vises som statusmelding.
- `delete_tournament` eksponeres bare eksplisitt til `anon`, i samme klient-RPC-mønster som resten av den statiske appen.

### Endrede filer

- `app.js`
- `index.html`
- `service-worker.js`
- `supabase_schema.sql`
- `supabase/migrations/20260826202526_delete_tournament_rpc.sql`
- `development_plan.md`
- `documentation_log.md`

### Verifisering

- `node --check app.js`
- `python3 -m json.tool manifest.webmanifest`
- `git diff --check`
- Sjekket at alle filer i service worker app-shell finnes lokalt.
- Kjørte lokal mobilflyt i browser på `http://localhost:8090`:
  - opprettet testturnering `Codex Cleanup Test 2031`
  - bekreftet admin-spiller-flyt med `Admin`, `Spiller` og `Turnering` i menyen
  - bekreftet at testturneringen ble skrevet til Supabase med invitekode `HSGGF`
  - trykket `Nullstill demo`
  - bekreftet at appen returnerte til landing page
  - bekreftet i Supabase at `HSGGF` hadde `remaining = 0`

### Neste steg

- Teste `Nullstill demo` på publisert Padelstar etter deploy, slik at remote-raden faktisk forsvinner fra brukerflyten.

## 2026-08-26 - Padelstar-branding og lettere PWA-assets

### Gjort

- Opprettet post-beta arbeidsgren `codex/padelstar-post-beta-0.1`.
- Oppdaterte appnavn i manifest, README, aktiv utviklingsplan og produktdokument til Padelstar.
- Byttet appikon, apple touch icon og små logoer til nye Padelstar-assets.
- Genererte lettere webvarianter:
  - `assets/icons/padelstar-256.png`
  - `assets/icons/padelstar-512.png`
  - `assets/padelstar_logo-1200.png`
  - `assets/bg_img-2200.png`
  - `assets/padelstar_button-900.png`
- Oppdaterte service worker-cache fra `padel-manager-v24` til `padelstar-v25`.
- Tok tunge/originale logo- og bakgrunnsfiler ut av app-shell-cachen.
- Byttet Supabase-configvariabel til `PADELSTAR_SUPABASE`, med bakoverkompatibel alias for gammel `PADEL_MANAGER_SUPABASE`.
- Byttet localStorage-nøkler til `padelstar-*`, med migrering fra gamle `padel-manager-*`-nøkler.
- Justerte gullpaletten til en litt gulere Padelstar-tone.
- Fjernet `Bytt`-knappen fra spillerens `Din status`-kort.
- La inn oppfølging i `development_plan.md` om å rydde testturnering fra Supabase og lage trygg cleanup/sletting for egne testturneringer.

### Beslutninger

- Originale store bildefiler beholdes som kildeassets, men webappen skal bruke optimaliserte varianter der bildene vises små eller lastes i app shell.
- Ekstern rename av GitHub-repo, Vercel-prosjekt og Supabase-prosjekt gjøres ikke automatisk fra kodeendringen.
- Gammel lokal lagring og gammel Supabase-configvariabel støttes midlertidig for å unngå brå brudd for eksisterende beta-test.

### Endrede filer

- `index.html`
- `styles.css`
- `app.js`
- `manifest.webmanifest`
- `service-worker.js`
- `supabase-config.js`
- `supabase/config.toml`
- `README.md`
- `development_plan.md`
- `product_development.md`
- `documentation_log.md`
- `assets/`

### Neste steg

- Verifisere lokalt med browser at Padelstar-assets lastes uten 404 og at spillerstatuskortet ikke viser `Bytt`.
- Avklare om GitHub-, Vercel- og Supabase-prosjektnavn skal endres i tjenestene.

## 2026-08-26 - Ryddet utviklingsplan etter oppdateringslogikk

### Gjort

- Leste nye oppdateringsregler i `development_plan.md`.
- Fjernet ferdig én-sides modulspesifikasjon og tidligere responsiv UI-arbeidsliste fra aktiv utviklingsplan.
- Oppdaterte nåværende fokus med neste fase: turneringsmotor, databaseoperasjoner, realtime og tester.
- Justerte publiseringsdelen slik den beskriver faktisk status for GitHub Pages, Vercel og Supabase.
- Ryddet utviklingsrekkefølgen slik gjennomførte punkter ikke lenger står som åpne oppgaver.

### Beslutninger

- `development_plan.md` skal bare vise aktivt/gjenstående arbeid.
- Ferdig arbeid dokumenteres i `documentation_log.md` og fjernes fra den operative planen.
- Videre arbeid bør styres av `tournament_logic.md` når iOS-logikken portes videre.

### Endrede filer

- `development_plan.md`
- `documentation_log.md`

### Neste steg

- Følge samme dokumentflyt ved neste commit.

## 2026-08-26 - Dokumentert turneringslogikk fra iOS-appen

### Gjort

- Leste gjennom sentrale Swift-filer fra `PadelManager-main` for turneringsmotor, kampflyt, scoring, leaderboard og cup.
- Opprettet `tournament_logic.md` som portingsreferanse for webappen.
- Dokumenterte round-robin-logikk, cup-logikk, kampstatus, scoring, walkover, undo, leaderboard, persistens og hvordan admin som spiller bør modelleres i webappen.

### Beslutninger

- Admin skal forstås som rolle/host utenfor selve turneringsmotoren.
- Dersom admin deltar, må admin også representeres som en spiller i turneringen.
- iOS-logikken skal brukes som funksjonell referanse, men database- og sanntidsflyt må modelleres eksplisitt for webappen.

### Endrede filer

- `tournament_logic.md`
- `documentation_log.md`

### Neste steg

- Bruke `tournament_logic.md` som sjekkliste når database-tabeller, API-operasjoner og sanntidsoppdateringer videreutvikles.

## 2026-08-26 - Menykomponent og in-app hamburgerfix

### Gjort

- Fjernet bruk av `menu_style.png` som bakgrunn i de faktiske menyflatene, fordi assetet inneholder statisk tekst fra designreferansen.
- Kodet hovedmeny og admin-underfaner som ekte responsive HTML/CSS-elementer.
- Beholdt `menu_highlight.png` som aktiv menyindikator og hamburgerstrek.
- La inn egen workspace-hamburger for mobil og smale nettbrett.
- Gjorde hamburgerlogikken mer robust med delegert click-håndtering, `aria-expanded` som synlighetsfallback og automatisk lukking ved Escape, hash-endring, visningsbytte og klikk utenfor menyen.
- Bumpet CSS-, JS- og service worker-versjon for å unngå gammel PWA-cache.
- Verifiserte i in-app-browser med mobil viewport at workspace-hamburgeren åpner menyen med `opacity: 1` og viser `Admin`, `Spiller` og `Tilskuer`.

### Beslutninger

- Menyutseendet skal bygges i kode, ikke ved å legge inn statiske screenshots som UI-bakgrunn.
- `menu_style.png` kan bare brukes som visuell referanse, ikke som aktiv menyasset.
- Hamburger skal trigges på bredde under 900px, uten avhengighet til `orientation: portrait`, fordi in-app/mobile viewport ikke alltid rapporterer orientation slik CSS-regelen forventer.

### Endrede filer

- `index.html`
- `styles.css`
- `app.js`
- `service-worker.js`
- `development_plan.md`
- `documentation_log.md`

### Neste steg

- Gjøre videre visuell opprydding av panelbredder og avstander i admin-, spiller- og tilskuervisning.
- Teste faktisk telefon/iPad etter hard refresh eller ny cacheversjon.

## 2026-08-26 - Ny landing page-retning og responsiv UI-plan

### Gjort

- La inn nye designassets i prosjektet og committet dem separat tidligere som `20bebf4 Add new design assets`.
- Brukte `landing_page.jpg` som designreferanse for en kodet forside i HTML/CSS.
- Bygget en ny landing hero med:
  - mørkt padel-bakgrunnsbilde fra `bg_img.png`
  - stor Padel Manager-logo fra `padel_manager logo_1x.png`
  - flytende toppmeny
  - gull `Get Started`-knapp
  - `No App Needed`-tekst
  - Zigonia-logo nederst til venstre
  - Padel Manager-badge fra `padel_manager_button.png` nederst til høyre
- La inn smooth scroll fra landingmeny og CTA til riktig seksjon.
- La inn hamburgernavigasjon for telefon og iPad i stående modus.
- Oppdaterte knapper mot uttrykket i `button.png`.
- Beholdt individuelle spillerfarger i spillerbadges etter tilbakemelding.
- Oppdaterte service worker-cacheversjon og assetliste for nye CSS/assets.
- Dokumenterte en ny førsteprioritet i `development_plan.md` for å rydde opp i responsiv UI etter skjermbildene fra admin-, spiller- og tilskuervisning.

### Beslutninger

- `landing_page.jpg` skal være designfasit, men ikke brukes som flatt UI-bilde.
- Forsiden skal bygges av ekte, responsive HTML/CSS-elementer.
- `bg_img.png`, `padel_manager logo_1x.png`, `menu_highlight.png`, `button.png` og `padel_manager_button.png` er hovedassets for ny designretning.
- Spillerfarger er funksjonelle og skal beholdes, også når badges får ny visuell stil.
- Før neste funksjonsarbeid skal appvisningene ryddes opp visuelt og responsivt.

### Observerte problemer

- Desktop/appvisningene har for store toppnav-/tabtekster i enkelte bredder.
- Rollelabels kan overlappe hovedmenytekst.
- Admin-, spiller- og tilskuervisning trenger bedre skalering, avstand og kortstruktur.
- Invitasjonskodekort og toppheader må verifiseres på desktop og nettbrett.

### Endrede filer

- `index.html`
- `styles.css`
- `app.js`
- `service-worker.js`
- `development_plan.md`
- `product_development.md`
- `documentation_log.md`
- `README.md`

### Neste steg

- Gjennomføre førsteprioriteten i `development_plan.md`.
- Teste desktop, iPad portrait/landscape og mobil med Playwright.
- Verifisere admin-, spiller- og tilskuervisning etter UI-oppryddingen.
- Lage commit når UI-et er ryddet og dokumentasjonen stemmer.

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

## 2026-08-26 - En-sides modulflyt, Supabase-verifisering og publiseringsklar cache

### Gjort

- La om appen til en en-sides modulflyt der bare aktiv modul vises og inaktive moduler får `display: none`.
- Delte startsiden i egne moduler for `Landing`, `Setup admin`, `Setup player`, `Admin`, `Player` og `Turnering`.
- Endret menylogikken slik at modulvalg følger app-state og rolle:
  - uten aktiv turnering vises `Hjem`, `Create` og `Join`
  - admin i aktiv turnering ser `Join`, `Admin` og `Turnering`
  - spiller i aktiv turnering ser `Join`, `Spiller` og `Turnering`
- Gjorde `Turnering` til erstatning for den gamle tilskuervisningen.
- Forhåndsutfyller invitekode i Join-modulen når en lokal aktiv turnering finnes.
- Rettet async submit-feil i join-skjemaet ved å beholde form-referansen før `await`.
- Verifiserte Supabase-prosjektet `Padel Manager` (`sxzlljxodorkfrjnwfgr`) og bekreftet tabell, RLS, realtime og RPC-er.
- La til migrasjonen `20260826152343_secure_public_api_grants.sql` og strammet live database-grants:
  - `anon` har bare `SELECT` på `public.tournaments`
  - `anon` har `EXECUTE` på nødvendige RPC-funksjoner
  - `authenticated` og `PUBLIC` har ikke unødvendige grants på appens tabell/funksjoner
- Testet Supabase create/join via REST/RPC med publishable key og slettet midlertidig testturnering etterpå.
- Bumpet Service Worker-cache til `padel-manager-v23` og oppdaterte app-shell til nye CSS/JS cache-bustere.
- La til `vercel.json` med headers for statisk hosting og service worker-cache på Vercel.

### Beslutninger

- GitHub Pages brukes videre som publiseringskanal siden repoet allerede har en fungerende Pages-workflow fra repo-roten.
- Vercel er koblet til samme GitHub-repo som ekstra publiseringsspor.
- Supabase-funksjonene beholder `SECURITY DEFINER`, men eksponeres eksplisitt og smalt til `anon` fordi appen er en statisk klient uten egen server.
- Databasen lagrer fremdeles turneringsstate som JSONB i én tabell for å holde MVP-flyten enkel; normalisering kan tas senere når produktflyten er stabil.

### Testet

- `node --check app.js`
- Playwright-flyt lokalt:
  - landing viser bare landingsmodulen
  - Create åpner admin-oppsett
  - Join åpner spilleroppsett
  - opprettet turnering gir aktiv adminvisning
  - Turnering viser tidligere tilskuerinnhold
  - Join + spillerregistrering viser spiller-modulen uten konsollfeil
- Supabase REST/RPC:
  - `create_tournament`
  - `join_tournament`
  - grant-kontroll etter migrasjon

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `supabase_schema.sql`
- `supabase/migrations/20260826152343_secure_public_api_grants.sql`
- `vercel.json`
- `documentation_log.md`

### Neste steg

- Committe og pushe til `main` slik at GitHub Pages publiserer siste versjon.
- Sjekke GitHub Actions Pages-deploy etter push.
- Åpne publisert URL og teste create/join på live-siden med Supabase.

## 2026-08-26 - Admin kan velge egen spillerprofil

### Gjort

- La til valg i Create-modulen for om admin også spiller i turneringen.
- Viser spillernavnfelt for admin kun når `Admin spiller selv` er valgt.
- Oppretter admin som første spiller når valget er aktivt.
- Setter admin-spilleren med `joinedFrom: "admin-self"` og `participantType: "admin-player"`.
- Beholder lokal rolle som `admin`, men setter samtidig `selectedPlayerId`, slik at både Admin- og Spiller-modulen er tilgjengelig for samme bruker.
- Viser `Admin spiller` på spillerprofilkortet for denne typen spiller.
- Bumpet Service Worker-cache til `padel-manager-v24`.

### Testet

- `node --check app.js`
- Playwright lokalt:
  - create uten admin som spiller viser `Join`, `Admin` og `Turnering`
  - create med admin som spiller viser `Join`, `Admin`, `Spiller` og `Turnering`
  - Spiller-modulen viser admin-spilleren med label `Admin spiller`
  - ingen konsollfeil

### Endrede filer

- `index.html`
- `app.js`
- `styles.css`
- `service-worker.js`
- `documentation_log.md`
