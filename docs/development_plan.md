# Padelstar – samlet utviklingsplan

Sist oppdatert: 2026-09-01

Status: aktivt operativt arbeidsdokument

## Formål og styringsregel

Dette dokumentet er den eneste aktive planen for videre arbeid. Det beskriver dagens baseline, åpne beslutninger, prioriterte faser, akseptansekriterier og verifikasjon. Gjennomført arbeid føres i [documentation.md](documentation.md) i kronologisk rekkefølge.

Padelstar er en plattformuavhengig vanilla-JavaScript-PWA for å opprette, dele, administrere og følge padelturneringer på mobil, nettbrett og desktop. Supabase brukes for valgfri live-synk, mens lokal lagring og service worker gir offline-fallback.

## Gjeldende baseline

Følgende er implementert og skal behandles som beskyttet funksjonalitet:

- Round-robin med singles for små spillergrupper og partnerrotasjon for større grupper.
- Cup-format med automatisk/manuelt lagoppsett, byes, bracket, bronsefinale, walkover og ett-stegs undo.
- Admin-, spiller- og tilskuervisning med rollebasert synlighet og spillerstyrt poengføring.
- Lokal state, recovery-kopi, offline-speiling, sync-kø, realtime reconnect og konfliktfeedback.
- Supabase RPC-er med RLS, grants, tokenbinding, revisjonskontroll, rate limiting og automatisk retensjonsjobb.
- Norsk bokmål, nynorsk, engelsk, spansk, tysk og fransk, med språkpreferanse per bruker/enhet og oversatt personvernside.
- Felles responsiv toppbar, hamburger/drawer, språkvelger, modulnavigasjon og Escape-lukking.
- Ett aktivt visuelt tema, konsoliderte CSS-lag og DiceBear Gaze-avatarer med deterministisk seed.
- PWA-cache, GitHub Pages-verifisering, statisk hosting og eksisterende Vercel/Supabase-konfigurasjon.

## Ikke-forhandlingsbare krav

- Bevar eksisterende turnerings-, scoring-, join-, admin-, spiller-, tilskuer-, offline- og personvernflyt.
- Ikke legg admin-token, spiller-token, service-role-nøkkel eller privat VAPID-nøkkel i klientkode, backup eller logger.
- Ikke omskriv eller slett kjørte Supabase-migrasjoner. Nye databaseendringer er nye migrasjonsfiler.
- Ikke bland brukerens språkpreferanse inn i delt turneringsstate.
- Ikke slett usikre filer direkte; arkiver dem etter referansesøk.
- Alle funksjonsendringer krever tester, `git diff --check`, dokumentasjon og verifisert deploy.

## Prioritert videre plan

### Fase A – Fullfør strukturkonsolideringen

Mål: gjøre modulgrensene reelle og holde `app/app.js` som en liten entrypoint.

Arbeid:

- Kartlegg gjenværende funksjoner i `app/app.js` etter ansvar: bootstrap, profil, remote, rendering, admin, spiller, turneringsdomene og UI-feedback.
- Flytt én sammenhengende ansvarsenhet om gangen til eksisterende eller nye moduler.
- Utvid modul-API-ene med eksplisitte avhengigheter, uten globale sideeffekter.
- Fjern døde CSS-regler for historiske landing-/workspace-menyer og gamle temafaser når referansesøk bekrefter at de ikke brukes.
- Hold `app/app.js` som entrypoint til slutt, og oppdater README, service worker og tester ved hver filflytting.

Akseptansekriterier:

- Hver flyttet ansvarsenhet har en testbar modulgrense.
- Ingen aktiv HTML-, JS-, CSS-, service-worker- eller dokumentasjonsreferanse peker til flyttede/arkiverte filer.
- Ingen endring i brukerflyt eller Supabase-kontrakt.

### Fase B – Sikkerhets- og personvernverifisering

Mål: verifisere hele angrepsflaten etter strukturendringene.

Arbeid:

- Kjør standard sikkerhetsskanning av repositoryet på siste commit.
- Gjennomgå funn for secrets, DOM/XSS-sinks, Supabase RPC/RLS/grants, tokenbinding, service worker, cache og deploykonfigurasjon.
- Rett validerte funn med minste nødvendige endring og legg til regresjonstest.
- Kontroller at personverntekst, retensjonspolicy og implementert databasejobb fortsatt beskriver samme virkelighet.

Akseptansekriterier:

- Skanningen er fullført med dokumenterte funn eller eksplisitt dokumenterte begrensninger.
- Alle reportable funn er rettet, akseptert med eierbeslutning eller blokkert med tydelig begrunnelse.
- Ingen hemmeligheter eller private tokenverdier finnes i tracked filer.

### Fase C – Produksjons- og brukerflytregresjon

Mål: verifisere hele appen etter hver større endring.

Påkrevd kontroll:

- `npm test`
- `npm run check:syntax`
- `git diff --check`
- Browser-smoke på desktop, medium/tablet og mobil.
- Hamburger åpne/lukke, språkvelger i drawer, navigasjon, Escape, språk per bruker/enhet og offline fallback.
- Opprett, join/QR, admin, spiller, tilskuer, poeng, kampstart, walkover, undo, realtime og retensjonsflyt.
- Ingen horisontal overflow, avkuttede logoer eller skjulte fokusringer.
- Service-worker-cache inneholder alle aktive shell-filer og ingen arkiverte filer.

### Fase D – Valgstyrte produktforbedringer

Disse starter ikke før scope, personvern og akseptansekriterier er besluttet:

- Ekstern driftsvarsling for `/api/health`.
- Full konto- og tokenmigrering for administratorer.
- Mer avansert tiebreak/poengføring.
- PDF-eksport av tabell og resultat.
- Utvidet profilhistorikk og karrierestatistikk.
- Mer avansert offline-konflikthåndtering.
- Eventuell egen avatarvelger/opplasting; DiceBear Gaze er gjeldende baseline.

## Dokumentasjons- og leveranseflyt

1. Registrer beslutning og scope her før et nytt initiativ starter.
2. Implementer i små, verifiserbare commits.
3. Oppdater [documentation.md](documentation.md) med dato, endring, tester og commit/deploy.
4. Arkiver erstattede planer under `docs/archive/plans/` og historiske logger under `docs/archive/history/`.
5. Kjør full verifikasjon før push.
6. Push til `origin/main` når brukerens arbeidsflyt uttrykkelig inkluderer publisering.

## Eierbeslutninger som fortsatt er åpne

- Skal ekstern monitor for health-endepunktet innføres, og hvem mottar varsler?
- Skal admin-konto bli obligatorisk, eller skal lokal/tokenbasert tilgang beholdes?
- Hvilke produktforbedringer skal prioriteres etter beta?
- Skal Vercel Analytics beholdes etter beta-evalueringen?
