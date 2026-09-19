# Padelstar - Driftsrunbook

Sist oppdatert: 2026-09-19 (versjon 0.7.0 + gren `v0.8`)

Status: beta-runbook for statisk Vercel-hosting med Supabase live sync og to Vercel-funksjoner (`/api/health`, `/api/feedback`).

## Lokal verifisering

1. Kjør `npm test` (kjør `node --test`). Databasetestene kjøres separat: `npm install --no-save @electric-sql/pglite`, deretter `node supabase/tests/<navn>.pglite.mjs`.
2. Kjør `node --check` på endrede JavaScript-filer.
3. Start lokal server (`python3 -m http.server 8420`) og åpne appen. Kontroller at app-shell, moduler og service worker laster.
4. For PWA-endringer: bump `cacheName` i `service-worker.js` og `?v=`-versjonene i `index.html` samtidig (testene låser dem).

## Deploy

1. Kontroller `git status --short` og at bare forventede filer er endret.
2. Kjør full lokal verifisering.
3. Én gren per versjon (`v0.8`, `v0.9`, ...). Ikke start en ny gren før gjeldende er stabil og kan merges til `main`.
4. Åpne en PR mot `main`. Vercel bygger en preview per PR og produksjon fra `main`.
5. Etter deploy: åpne `https://padelstar.app` og kontroller versjon, footer, personvernlenke, manifest og at `/api/health` svarer `ok: true`.

## Supabase-migrering

1. Les migreringen og bekreft at den ikke eksponerer admin-token eller private hjelpefunksjoner (`*_impl` skal ikke kunne kalles av `anon`/`authenticated`).
2. Kjør databasetestene (PGlite) lokalt.
3. Migreringer kjøres av utvikleren i Supabase SQL Editor etter eksplisitt godkjenning, og bare mot riktig prosjekt.
4. Verifiser grants, RLS og relevante RPC-kontrakter (Supabase advisors).
5. Kjør en live-sjekk med en midlertidig testturnering dersom endringen berører live sync, og rydd opp etterpå.

## Miljøvariabler (Vercel)

- `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` (og valgfritt `FEEDBACK_FROM`) for tilbakemeldingsknappen. Ny variabel krever ny deployment. Se `docs/technical/feedback-setup.md`.
- Supabase-adresse og publiserbar nøkkel ligger i klienten; hemmelige nøkler skal aldri ligge i repoet.

## Retensjonsjobber

- `padelstar-retention-cleanup` (`pg_cron`, hver time) kjører `cleanup_expired_tournaments()` og `cleanup_expired_player_profiles()`. Funksjonene er `SECURITY DEFINER` og tilbakekalt fra `public`, `anon` og `authenticated`.
- `padelstar-result-approvals` (hvert minutt) eskalerer og auto-godkjenner resultater som venter.
- Kontroller `cron.job` etter migrering. Loggfør returverdier uten profil-ID-er eller tokens.
- Frister og oppførsel er beskrevet i `docs/technical/privacy-retention.md`.

## Backup og rollback

- Frontend: revert commit/PR eller promoter forrige Vercel-deployment.
- PWA-cache: bump `cacheName` i `service-worker.js` ved app-shell-endringer.
- Supabase: bruk en reverserende migrering eller restore etter konkret vurdering. Ikke slett produksjonsdata uten eksplisitt eiergodkjenning.
- Admin kan gjenopprette én turnering fra appens backup/import.

## Feilhåndtering og observability

- Nettleseren viser sync-status: lokal, online, offline, reconnecting, pending eller conflict.
- `GET /api/health` skal returnere HTTP 200 med `ok: true`; en ekstern monitor kan kontrollere dette uten å sende brukerdata.
- Klienten sender bare begrensede tekniske hendelser til Vercel Analytics. Tokens, navn, backupinnhold og turneringsstate sendes ikke.
- Ikke logg admin-token, spillertoken, backupinnhold eller kontaktopplysninger i console eller dokumentasjon.

## Produksjonssjekk

- HTTPS svarer på `https://padelstar.app`, og `/api/health` viser riktig versjon.
- Footer viser utvikler, copyright og personvernlenke; `privacy.html` er tilgjengelig.
- `manifest.webmanifest` peker til riktige ikoner, og `service-worker.js` har forventet cacheversjon.
- Join-lenke bruker `https://padelstar.app/?join=...`.
- Opprett, join, live update, resultatregistrering, avslutning og offline fallback er smoke-testet.
- Tilbakemeldingsknappen sender en melding som kommer frem i innboksen.
