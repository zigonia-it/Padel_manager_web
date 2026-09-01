# Padelstar

Live app: https://padelstar.app

Sist oppdatert: 2026-09-01

Status: 0.3 Beta, responsiv PWA som kan hostes statisk med Supabase live sync

Aktiv utviklingsplan ligger i `docs/development_plan.md`. Historiske planer og designutkast ligger i `docs/archive/`.

Metadata:
- Navn: Padelstar
- Undertittel: Padel Manager
- Utvikler: Sigurd Steen Grødem

Padelstar er en responsiv PWA for å opprette, administrere og følge padelturneringer på mobil, nettbrett og desktop. Appen kan hostes som statiske filer, men bruker Supabase for delt turneringsdata, live sync og sanntidsoppdateringer mellom enheter.

## Hva appen gjør

- Lar admin opprette en turnering og dele invitasjonskode/QR-lenke.
- Lar spillere bli med fra egen enhet.
- Lar spillere forlate sin lokale spillerøkt uten å slette spilleren eller endre turneringen for andre.
- Lar admin velge om han også deltar som spiller.
- Viser egne moduler for landing page, oppsett, admin, spiller og turneringsvisning.
- Skjuler inaktive moduler slik at de ikke tar plass i layouten.
- Støtter round-robin og cup med automatisk/manuelt lagoppsett, byes og valgfri bronsefinale.
- Støtter walkover, ett-stegs undo, QR-kode og offentlig join-lenke.
- Synkroniserer turneringsstate live via Supabase når live-config er aktiv.
- Krever serverutstedt spillertoken for spillerstyrt poengføring mot Supabase.
- Fungerer lokalt i nettleseren med localStorage fallback, siste-kjente-gode recovery-kopi og IndexedDB-speiling der nettleseren støtter det.
- Har Web Share med kopieringsfallback, opt-in lokale PWA-varsler og valgfri admin-kontoknytting via Supabase Auth.

## Status etter Fase 12–15

Fase 0–15 er ferdige. Fase 15 inkluderer Web Share, lokale opt-in-varsler og konfigurert serverdrevet push.

## Roller og visninger

- Admin styrer turneringen, spillere, baner, kamper og resultater.
- Spiller ser egen status, neste kamp, makker, motstandere og relevante resultater.
- Turnering/tilskuer viser livekampene og oversikten uten personlig spillerstatus.
- Admin kan også ha spilleridentitet dersom `Admin spiller selv` velges ved opprettelse.

## Prosjektstruktur

- `index.html` - appstruktur, metadata og moduler.
- `styles/styles.css` - base, tokens, layout og komponentstil for Padelstar.
- `styles/responsive.css` - samlet responsiv toppbar, hamburger og språk-/modulmeny.
- `app/translations.js` - språkmotor med strukturerte nøkler, variabler, fallback og manglende-nøkkel-sporing for brukerflate.
- `app/tournament-engine.js` - ren scheduler- og teamlogikk for turneringsoppsett.
- `app/scoring-engine.js` - ren scoring, settvalidering, poengsummer og leaderboard/statistikk.
- `app/state-manager.js` - state-migrering, lokal sync-metadata, shared-state-sanitizing og remote-feilklassifisering.
- `app/realtime-sync.js` - rene realtime-regler for kanalnavn, reconnect-backoff og statusklassifisering.
- `app/offline-storage.js` - IndexedDB-speiling av lokal state, rolle og sync-kø med localStorage som fallback.
- `app/observability.js` - rate-begrenset, personvernbevisst teknisk telemetry til Vercel Analytics.
- `app/ui-effects.js` - isolerte, reduced-motion-kompatible fokus- og score-feedback-effekter.
- `app/navigation.js` - felles modulnavigasjon, hamburger, Escape-lukking og aktiv meny.
- `app/i18n-ui.js` - brukerens lokale språkvalg og DOM-oversettelser.
- `app/storage.js` - tolerant JSON-persistens og recovery-hjelpere.
- `app/rendering.js` - felles tekst- og match-renderingshjelpere.
- `app/remote-rpc.js` - samlet transportseam for Supabase RPC-kall.
- `app/remote-tournament.js` - Supabase-operasjoner for oppretting, invitasjon og join.
- `app/admin-actions.js` - adminregler, manuelle cup-lag og banekonfigurasjon.
- `app/player-actions.js` - spillerens tilgjengelighetsflyt og remote/local oppdatering.
- `scripts/browser-smoke.sh` - deterministisk desktop-/mobil-smoke med blokkert ekstern backend.
- `api/health.js` - cachefri Vercel health-endpoint for ekstern monitorering.
- `privacy.html` - offentlig beta-utkast for personvern.
- `docs/data_retention.md` - retensjon, sletting og profilhistorikk-policy.
- `docs/operations_runbook.md` - deploy, database, backup, rollback og produksjonssjekker.
- `app/app.js` - browser-entrypoint, modulvisning, localStorage, Supabase-kall og tynne delegater til domenemodulene.
- `assets/` - logo, appikoner, designassets og fonter.
- `manifest.webmanifest` - PWA-manifest.
- `service-worker.js` - app-shell-cache for PWA.
- `supabase-config.js` - Supabase URL/nøkkel for live sync.
- `supabase_schema.sql` - databaseoppsett for live-turneringer.
- `supabase/migrations/` - Supabase migration-filer.
- `supabase/migrations/20260831120000_spectator_state_rpc.sql` - separat whitelistet spectator-oppslag.
- `Visual redesign/` - referansearkiv for den visuelle redesignen, ikke aktiv runtime-kode.
- `docs/archive/` - historiske planer og lokalt QA-materiale.

## Kjør lokalt

Start en enkel lokal server fra prosjektmappen:

```bash
python3 -m http.server 8080
```

Åpne deretter:

```text
http://localhost:8080
```

Direkte åpning av `index.html` fungerer for deler av grunnflyten, men lokal server er best for PWA, service worker, assets og realistisk browser-test.

## Supabase live sync

Når `supabase-config.js` inneholder prosjekt-URL og publishable/anon key, bruker appen Supabase Realtime for å dele samme turnering mellom admin, spillere og tilskuere.

```js
window.PADELSTAR_SUPABASE = {
  url: "https://din-prosjekt-id.supabase.co",
  anonKey: "din-anon-eller-publishable-key",
};
```

Databaseoppsettet ligger i `supabase_schema.sql` og som migrasjoner under `supabase/migrations/`.

## Publisering

Appen er laget slik at den kan publiseres som en statisk frontend på Vercel. Supabase håndterer live-dataene, mens Vercel leverer HTML, CSS, JavaScript, PWA-manifest, service worker og assets.

Nåværende produksjonsadresse:

```text
https://padelstar.app
```

## Dokumentasjon

- `docs/development_plan.md` - aktiv arbeidsplan og neste tekniske prioriteringer.
- `docs/product_development.md` - produktretning, roller, turneringsregler og videre idéer.
- `docs/tournament_logic.md` - turneringslogikk hentet fra tidligere iOS-app.
- `docs/migration_notes.md` - notater for porting fra SwiftUI/iOS.
- `docs/documentation_log.md` - løpende logg over beslutninger og utført arbeid.

Prosjektregel: etter hver tydelige arbeidsøkt skal `docs/documentation_log.md` oppdateres.
