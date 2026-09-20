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
5. Etter deploy: åpne `https://padelstar.app` og kontroller versjon, footer, personvernlenke, manifest og at `/api/health` svarer `ok: true` med riktig versjon. **Kontroller alltid versjonen etter en merge**: merge-committen til PR #16 startet ikke en produksjonsdeploy i Vercel (2026-09-20); en tom commit via en PR startet den.
6. Vercel sletter gamle deployments etter 30 dager (retention). Lagringen for deployments kan gå over gratisgrensen; slett gamle deployments for hånd hvis Vercel nekter en ny deploy.
7. GitHub Pages er slått av (workflowen og siden er deaktivert 2026-09-20); Vercel er eneste vert.
8. Verktøy: `node scripts/bump-asset-versions.js` (bumper `?v=`-versjoner og cache-navnet etter endringer; `--check` verifiserer), `node scripts/color-audit.js` (ingen fargeliteraler utenfor `styles/tokens.css`), `scripts/ui-audit.js`, `scripts/contrast-audit.js` og `scripts/theme-parity-audit.js` (leses inn i nettleseren mot lokal preview).
9. En kodeformaterer som formaterer `index.html` ved lagring endrer markup som testene sjekker nøyaktig; slå av formatering ved lagring for den filen.

## Supabase-migrering

1. Les migreringen og bekreft at den ikke eksponerer admin-token eller private hjelpefunksjoner (`*_impl` skal ikke kunne kalles av `anon`/`authenticated`).
2. Kjør databasetestene (PGlite) lokalt.
3. Migreringer kjøres av utvikleren i Supabase SQL Editor etter eksplisitt godkjenning, og bare mot riktig prosjekt.
4. Verifiser grants, RLS og relevante RPC-kontrakter (Supabase advisors).
5. Kjør en live-sjekk med en midlertidig testturnering dersom endringen berører live sync, og rydd opp etterpå.

## Miljøvariabler (Vercel)

- `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` (og valgfritt `FEEDBACK_FROM`) for tilbakemeldingsknappen. `RESEND_API_KEY` brukes også av invitasjons-e-posten (`api/invitation-email.js`; valgfritt `INVITE_FROM`, standard `Padelstar <invitations@padelstar.app>`, domenet er verifisert i Resend). Ny variabel krever ny deployment. Verdier lagt inn med anførselstegn eller mellomrom ignoreres. Se `docs/technical/feedback-setup.md`.
- Aldri legg en nøkkel i variabelens *navn*, og aldri en nøkkel i `FEEDBACK_TO_EMAIL` (2026-09-20: det ga 422 fra Resend).
- "Jeg er ikke en robot": Cloudflare Turnstile. Nettstedsnøkkelen (offentlig) ligger i `supabase-config.js` (`captchaSiteKey`); den hemmelige nøkkelen legges inn av utvikleren i Supabase (Authentication -> Attack Protection). Se `docs/technical/captcha-setup.md`.
- Supabase-adresse og publiserbar nøkkel ligger i klienten; hemmelige nøkler skal aldri ligge i repoet.

## Retensjonsjobber

- `padelstar-retention-cleanup` (`pg_cron`, hver time) kjører `cleanup_expired_tournaments()` og `cleanup_expired_player_profiles()`. Funksjonene er `SECURITY DEFINER` og tilbakekalt fra `public`, `anon` og `authenticated`.
- `padelstar-result-approvals` (hvert minutt) eskalerer og auto-godkjenner resultater som venter.
- `padelstar-log-cleanup` (03:40 daglig) sletter systemloggen eldre enn 90 dager (`cleanup_system_log()`).
- `padelstar-unverified-users` (03:20 daglig) sletter kontoer uten bekreftet e-post 7 dager etter opprettelse, men ikke før 2026-09-28 (`cleanup_unverified_users()`; hopper over systemeieren og turneringseiere; logger `user_deleted` med årsak `unverifiedEmail`).
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

## Tofaktor for systemmenyen (0.14)

- Systemeieren bruker en autentiseringsapp (TOTP, Supabase Auth MFA). Databasen krever `aal2` i JWT-en i `is_system_owner()`, så alle eierfunksjoner avviser en økt uten kode.
- Supabase-innstilling: Authentication -> Sign In / Providers (Multi-Factor): TOTP må være slått på for at innmelding av appen skal virke.
- Første gang viser admin.html QR-kode og nøkkel. Skann på to enheter eller lagre nøkkelen i en passordbehandler som sikkerhetskopi.
- Mistet app uten sikkerhetskopi: kjør i Supabase SQL-editor `delete from auth.mfa_factors where user_id = (select user_id from public.system_owner);` og sett opp på nytt. Dette rører bare tofaktoren, ikke kontoen.
