# Padelstar - Driftsrunbook

Sist oppdatert: 2026-08-28

Status: beta-runbook for statisk Vercel-hosting med Supabase live sync

## Lokal verifisering

1. Kjør `npm test`.
2. Kjør `node --check` på endrede JavaScript-filer.
3. Kjør `git diff --check`.
4. Start lokal server med `python3 -m http.server 8080`.
5. Åpne `http://localhost:8080` og kontroller at app-shell, logoer, moduler og service worker laster.
6. For PWA-endringer: verifiser offline navigasjon etter service-worker-installasjon.

## Deploy

1. Kontroller `git status --short` og at bare forventede filer er endret.
2. Kjør full lokal verifisering.
3. Commit endringen med tydelig fase-/formålsmelding.
4. Push til tilkoblet GitHub-branch.
5. La Vercel bygge fra repoet. GitHub Pages-workflowen kjører også `npm test` før Pages-artifact.
6. Etter deploy: åpne `https://padelstar.app` og kontroller versjon, footer, personvernlenke, manifest og service-worker-cache.

## Supabase-migrering

1. Les migreringen og bekreft at den ikke eksponerer admin-token eller private hjelpefunksjoner.
2. Kjør kontraktstester lokalt.
3. Kjør eventuell migrering mot riktig prosjekt etter eksplisitt godkjenning.
4. Verifiser grants, RLS og relevante RPC-kontrakter.
5. Kjør opt-in live-test med midlertidig testturnering dersom endringen berører live sync.

## Retensjonsjobb

- Retensjonsvinduet er 30 dager etter at admin eksplisitt avslutter turneringen (`state.status = 'Avsluttet'`).
- Kjør `select public.cleanup_expired_tournaments();` fra betrodd Supabase-drift eller en kontrollert databasejobb.
- Funksjonen er `SECURITY DEFINER`, men er tilbakekalt fra `public`, `anon` og `authenticated`; den skal ikke eksponeres i klienten.
- Jobben sletter også rate-limit-rader som ikke er oppdatert på 24 timer.
- Kontroller returverdien og verifiser at ingen aktive turneringer ble berørt. Første produksjonskjøring skal gjøres manuelt og loggføres.
- Endre ikke 30-dagersvinduet før `data_retention.md` og personvernteksten er oppdatert og godkjent.
- Fase 9-migreringen oppretter den idempotente `padelstar-retention-cleanup`-jobben i Supabase `pg_cron`, planlagt daglig kl. 03:15 UTC.
- Jobben kjører `cleanup_expired_tournaments()` og `cleanup_expired_player_profiles()` fra betrodd databaseinfrastruktur, aldri fra klienten.
- Kontroller `cron.job` etter migrering og loggfør returverdien uten profil-ID-er eller tokens.

## Backup og rollback

- Frontend rollback: revert deploy/commit eller promoter forrige Vercel-deployment.
- PWA-cache: bump `cacheName` i `service-worker.js` ved app-shell-endringer.
- Supabase rollback: bruk reverserende migrering eller restore etter konkret vurdering. Ikke slett produksjonsdata uten eksplisitt eiergodkjenning.
- Bruk appens backup/import for turneringsstate når admin må gjenopprette én turnering lokalt.

## Feilhåndtering og observability

- Browseren viser sync-status: lokal, online, offline, reconnecting, pending eller conflict.
- Kjente lokale avvik: `/_vercel/insights/script.js` gir 404 under enkel lokal server.
- Vercel Analytics kan brukes til aggregert trafikk dersom eier beholder det i beta.
- Supabase-advisors, RLS/grants og RPC-kontraktstester brukes etter databaseendringer.
- Ikke logg admin-token, spillertoken, backupinnhold eller personlige kontaktopplysninger i console eller dokumentasjon.

## Produksjonssjekk

- HTTPS svarer på `https://padelstar.app`.
- Footer viser utvikler, copyright og personvernlenke.
- `privacy.html` er tilgjengelig.
- `manifest.webmanifest` peker til riktige ikoner.
- `service-worker.js` har forventet cacheversjon.
- Join-lenke bruker `https://padelstar.app/?join=...`.
- Opprett, join, live update og offline fallback er smoke-testet.

### Siste produksjonskontroll 2026-08-28

- `https://padelstar.app/` svarte med HTTPS og HTTP 200.
- `https://padelstar.app/service-worker.js` svarte med HTTP 200.
- `https://padelstar.app/privacy.html` svarte med HTTP 200 og viste godkjent foreløpig kontakt, 30-dagersregel og Analytics-valg.
- `https://padelstar.app/service-worker.js` svarte med HTTP 200 etter deploy.
- Supabase-retensjonsmigreringen ble kjørt live og funksjonens tilgangsvern ble kontrollert read-only.
- `https://padelstar.app` leverte `app/`/`styles/`-strukturen og service worker v58.
- Tre isolerte browser-sesjoner verifiserte admin, spiller og tilskuer mot samme live-turnering; testturneringen ble slettet etter testen.
- `PADELSTAR_LIVE_SUPABASE=1 npm test` passerte med 48 av 48 tester, inkludert live RPC/RLS/rate-limit/cleanup-test.
- Offline reload beholdt app-shell, spillerrolle og lokal turneringsstate; websocket-feil ved frakobling håndteres av reconnect-status.
- Realtime-smoke observerte at admin mottok spillerens join i samme turnering uten manuell refresh.
