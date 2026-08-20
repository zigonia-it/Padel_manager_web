# Padel Manager Web

Sist oppdatert: 2026-08-21

Status: prosjektoversikt

Et første webutkast for Padel Manager, basert på `development_plan.md` og kjerneflyten fra SwiftUI-repoet `zigonia-it/PadelManager`.

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

Åpne `index.html` direkte i nettleseren, eller start en enkel lokal server:

```bash
python3 -m http.server 8080
```

Deretter åpner du:

```text
http://localhost:8080
```

## Neste steg

1. Lage lobby og join-flyt.
2. Legge inn navn og avatar ved påmelding.
3. Legge inn QR-kode for invitasjon.
4. Splitte JavaScript-koden i mindre moduler.
5. Koble datamodellen mot Supabase.
6. Legge inn realtime-oppdateringer.
7. Publisere første demo.
