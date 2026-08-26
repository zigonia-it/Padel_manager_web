# Padelstar

Live app: https://padelstar.app

Sist oppdatert: 2026-08-26

Status: 0.1 Beta, responsiv PWA som kan hostes statisk med Supabase live sync

Metadata:
- Navn: Padelstar
- Undertittel: Padel Manager
- Utvikler: Sigurd Steen Grødem
- Firma: Zigonia IT

Padelstar er en responsiv PWA for å opprette, administrere og følge padelturneringer på mobil, nettbrett og desktop. Appen kan hostes som statiske filer, men bruker Supabase for delt turneringsdata, live sync og sanntidsoppdateringer mellom enheter.

## Hva appen gjør

- Lar admin opprette en turnering og dele invitasjonskode/QR-lenke.
- Lar spillere bli med fra egen enhet.
- Lar admin velge om han også deltar som spiller.
- Viser egne moduler for landing page, oppsett, admin, spiller og turneringsvisning.
- Skjuler inaktive moduler slik at de ikke tar plass i layouten.
- Synkroniserer turneringsstate live via Supabase når live-config er aktiv.
- Fungerer lokalt i nettleseren med localStorage fallback.

## Planlagte funksjoner

Padelstar er i beta. Neste funksjoner handler først og fremst om å gjøre live-turneringer mer robuste og bedre å bruke i en faktisk padelhall.

- Mer robust scoring, kampstart og rundeavansement mot Supabase.
- Mulighet for aktive spillere til å føre poeng i egen kamp.
- Bedre hjem-/tilbakeflyt fra alle aktive visninger.
- Mer komplett realtime-synk mellom admin, spiller og turneringsvisning.
- Tester for kampgenerator, scoring, leaderboard og rolle-/modulvisning.
- Videre UI-polish for mobil, nettbrett og desktop.
- Raskere og mer stabil PWA-opplevelse når appen åpnes fra hjemskjerm på iPhone.

## Roller og visninger

- Admin styrer turneringen, spillere, baner, kamper og resultater.
- Spiller ser egen status, neste kamp, makker, motstandere og relevante resultater.
- Turnering/tilskuer viser livekampene og oversikten uten personlig spillerstatus.
- Admin kan også ha spilleridentitet dersom `Admin spiller selv` velges ved opprettelse.

## Prosjektstruktur

- `index.html` - appstruktur, metadata og moduler.
- `styles.css` - responsivt design og Padelstar-visuell stil.
- `app.js` - turneringslogikk, modulvisning, localStorage og Supabase sync.
- `assets/` - logo, appikoner, designassets og fonter.
- `manifest.webmanifest` - PWA-manifest.
- `service-worker.js` - app-shell-cache for PWA.
- `supabase-config.js` - Supabase URL/nøkkel for live sync.
- `supabase_schema.sql` - databaseoppsett for live-turneringer.
- `supabase/migrations/` - Supabase migration-filer.

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

- `development_plan.md` - aktiv arbeidsplan og neste tekniske prioriteringer.
- `product_development.md` - produktretning, roller, turneringsregler og videre idéer.
- `tournament_logic.md` - turneringslogikk hentet fra tidligere iOS-app.
- `migration_notes.md` - notater for porting fra SwiftUI/iOS.
- `documentation_log.md` - løpende logg over beslutninger og utført arbeid.

Prosjektregel: etter hver tydelige arbeidsøkt skal `documentation_log.md` oppdateres.
