# Padel Manager Web

Sist oppdatert: 2026-08-21

Status: statisk webapp klar for første hostingtest

Padel Manager er en statisk webapp for å sette opp og følge en padelturnering på tvers av mobil, nettbrett og PC/Mac. Appen bruker foreløpig lokal nettleserlagring, men er strukturert slik at Supabase/realtime kan kobles på senere.

## Innhold

- `index.html` - appstruktur og visninger
- `styles.css` - responsivt design
- `app.js` - lokal demo-logikk for turnering, spillere, runder, kamper og resultater
- `assets/` - logo, appikoner og Orbitron-font fra SwiftUI-prosjektet
- `manifest.webmanifest` - start på PWA-oppsett
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

Appen kan hostes som en ren statisk side. Last opp hele prosjektmappen, inkludert `assets/`, `manifest.webmanifest`, `service-worker.js`, `index.html`, `styles.css` og `app.js`.

Anbefalte førstevalg:

1. GitHub Pages: bruk repoets hovedmappe som static site.
2. Netlify: dra prosjektmappen inn som nytt statisk site, eller koble til GitHub-repoet.
3. Cloudflare Pages: koble til GitHub-repoet, la build command stå tom, og sett output directory til `/`.

## Støttet nå

1. Admin kan opprette turnering, legge inn spillere, velge avatar og bruke konkrete banenummer.
2. Spillere kan bli med via invitekode/QR eller velge en profil admin allerede har lagt til.
3. Hele turneringsoppsettet genereres ved start, slik at spillere kan se alle sine kamper.
4. Poengføring bruker tennisstruktur med games, sett og valgbart antall sett for match.
5. Admin kan føre poeng direkte eller sette resultat via popup.
6. Tilskuermodus viser kompakte livekort for pågående kamper.
7. Appen har PWA-manifest og service worker for første installasjonstest.

## Neste tekniske steg

1. Koble datamodellen mot Supabase.
2. Legge inn realtime-oppdateringer mellom enheter.
3. Fullføre oversettelser for all dynamisk tekst.
4. Splitte JavaScript-koden i mindre moduler når funksjonaliteten har stabilisert seg.
