# Padelstar

Live app: https://padelstar.app

Sist oppdatert: 2026-08-26

Status: 0.1 Beta, statisk webapp med Supabase live sync

Padelstar er en statisk webapp for å sette opp og følge en padelturnering på tvers av mobil, nettbrett og PC/Mac. Appen kan kjøre lokalt uten backend, og bruker Supabase Realtime når `supabase-config.js` er fylt inn.

## Innhold

- `index.html` - appstruktur og visninger
- `styles.css` - responsivt design
- `app.js` - turneringslogikk, lokal fallback og Supabase live sync
- `assets/` - logo, appikoner, designassets og fonter
- `manifest.webmanifest` - start på PWA-oppsett
- `supabase-config.js` - Supabase URL/nøkkel for live sync
- `supabase_schema.sql` - databaseoppsett for delt turnering og realtime
- `supabase/migrations/` - samme databaseoppsett som Supabase/GitHub migration
- `development_plan.md` - overordnet plan
- `product_development.md` - samlet produktutviklingsdokument for webversjonen
- `migration_notes.md` - notater om hva som bør porteres fra SwiftUI-appen
- `documentation_log.md` - løpende logg over beslutninger, utført arbeid og neste steg

## Prosjektregel

Etter hver tydelige arbeidsøkt skal `documentation_log.md` oppdateres.

Loggen skal kort beskrive:

- hva som ble gjort
- viktige beslutninger
- filer som ble endret
- hva som bør gjøres videre

Målet er at prosjektet alltid skal være mulig å plukke opp igjen uten å miste kontekst.

## Kjør lokalt

Start en enkel lokal server fra prosjektmappen:

```bash
python3 -m http.server 8080
```

Deretter åpner du:

```text
http://localhost:8080
```

Direkte åpning av `index.html` fungerer også for grunnflyten, men lokal server er best for PWA/service worker-test.

## Publisering

Appen kan hostes som en ren statisk side. Last opp hele prosjektmappen, inkludert `assets/`, `manifest.webmanifest`, `service-worker.js`, `supabase-config.js`, `index.html`, `styles.css` og `app.js`.

Publiseringsspor:

1. Vercel: koblet til repoet for `padelstar.app`.
2. GitHub Pages: tidligere brukt som første statiske testspor.

Produksjonsadresse:

```text
https://padelstar.app
```

## Supabase live sync

For at flere enheter skal se samme turnering live:

1. Opprett et Supabase-prosjekt.
2. Kjør databaseoppsettet på én av disse måtene:
   - Manuelt: åpne SQL Editor og kjør hele `supabase_schema.sql`.
   - GitHub: koble repoet til Supabase og bruk `supabase/migrations/`.
3. Gå til Project Settings -> Data API / API.
4. Kopier Project URL og anon/publishable key.
5. Fyll inn `supabase-config.js`:

```js
window.PADELSTAR_SUPABASE = {
  url: "https://din-prosjekt-id.supabase.co",
  anonKey: "din-anon-eller-publishable-key",
};
```

Når configen er fylt inn, viser appen `Live PWA` i toppen. Admin-enheten oppretter turneringen og får lokal admin-token. Spillere og tilskuere kan åpne invite/QR-lenken fra egne enheter og se samme turnering via Supabase Realtime.

Ved GitHub-integrasjon i Supabase:

- Velg dette repoet.
- Sett Working directory til `.`.
- Supabase finner migration-filen under `supabase/migrations/`.

## Støttet nå

1. Admin kan opprette turnering, legge inn spillere, velge avatar og bruke konkrete banenummer.
2. Spillere kan bli med via invitekode/QR eller velge en profil admin allerede har lagt til.
3. Hele turneringsoppsettet genereres ved start, slik at spillere kan se alle sine kamper.
4. Poengføring bruker tennisstruktur med games, sett og valgbart antall sett for match.
5. Admin kan føre poeng direkte eller sette resultat via popup.
6. Tilskuermodus viser kompakte livekort for pågående kamper.
7. Appen har PWA-manifest, service worker og Supabase live sync for første fler-enhetstest.
8. Padelstar-branding, appikon og lette PWA-assets er tatt i bruk.

## Neste tekniske steg

1. Teste live sync på ekte telefoner via publisert Padelstar-adresse.
2. Gjøre scoring og rundeavansement mer atomisk mot Supabase.
3. Fullføre oversettelser for all dynamisk tekst.
4. Splitte JavaScript-koden i mindre moduler når funksjonaliteten har stabilisert seg.
