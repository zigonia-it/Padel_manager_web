# Implementasjonsstatus mot masterplan

Dette er en kort sporbar status for arbeidet som er kontrollert mot [Padelstar-komplett-utviklingsplan.md](Padelstar-komplett-utviklingsplan.md). Masterplanen gjelder ved motstrid.

Gjeldende produktversjon: **0.5 (Beta)**. Sist kontrollert: **2026-09-12** på `main`, baseline `621c4eb`.

## Fersk verifikasjon 2026-09-12

Kontrollert mot `main`, commit `621c4eb`, med lokale dokumentasjonsendringer og fjerning av seks byte-identiske `test/* 2.js`-kopier. Ingen produksjonskode er endret eller publisert.

| Kontroll | Resultat | Hva den faktisk dekker |
|---|---|---|
| `npm test` | 216 totalt: 215 bestått, 0 feil, 1 live-skip | Lokal regresjon etter fjerning av testkopier. Tidligere 224 inkluderte åtte dupliserte testtilfeller. |
| `PADELSTAR_LIVE_SUPABASE=1 node --test test/live-supabase.test.js` | 1/1 bestått | Ekte RPC-opprettelse, join, poengføring, stale-revisjon, token-/tilgangskontroller og bekreftet sletting av egen testturnering. |
| `scripts/browser-smoke.sh`, desktop og mobil | Begge bestått | Lokal opprettelse, start, admin/kampvisning og initial overflow-kontroll ved 1440 og 390 px. Ekstern backend er blokkert i dette testoppsettet. |
| `npm run check:syntax` og `git diff --check` | Bestått | JavaScript-syntaks og patchformat. |
| Produksjon HTTP | HTTP 200; health `ok: true`, versjon `0.5-beta` | Tilgjengelighet. Publisert `index.html` og `app/tournament-entry.js` er byte-identiske med lokal baseline. Dette bekrefter ikke hele deployen. |

**Samlet vurdering: delvis verifisert.** Innlogging med testkonto, påmelding fra separat nettleser/enhet, observerte realtime-oppdateringer og offline/reconnect i produksjon er ikke kjørt. Ingen kjent testkonto er tilgjengelig; bruker opplyser at det er usikkert om en finnes. Den anonyme RPC-testen erstatter ikke denne brukerflyten. Push og produksjonens PWA-oppdateringsflyt er heller ikke verifisert på nytt.

Neste avgrensede kontroll: bruk en dedikert testkonto til innlogging og opprettelse, meld inn en spiller fra en separat klient, før et resultat, og bekreft at begge klienter konvergerer etter frakobling/tilkobling. Bruk kun en merket testturnering og rydd den etterpå.

## Avklart kontomodell og verifikasjonsgrense

Konto er ikke nødvendig for å opprette eller delta i en turnering, heller ikke på flere enheter. Databasen brukes for delt aktiv turneringsdata også for gjester. Konto gir permanent eierskap og turneringshistorikk for oppretteren, og permanent personlig statistikk for innloggede spillere. En gjesteeid turnering slettes etter avslutning eller avbrytelse, først når statistikken til registrerte spillere er lagret uavhengig av turneringen.

Anonym databaseopprettelse er i tråd med den presiserte modellen og er ikke i seg selv et implementasjonsgap. Tidligere konklusjon om innloggingssperre trekkes tilbake. Detaljert kravgrunnlag er [konto-, database- og turneringsflyt](konto-database-turneringsflyt.md). Full etterlevelse av permanent kontokoblet statistikk, slettingsrekkefølge og uavhengighet fra turneringsobjektet er ikke verifisert i denne dokumentasjonsrettingen.

## Kontrollert og implementert

- Avklart kontomodell: Konto er ikke nødvendig for å opprette eller delta i en turnering, heller ikke på flere enheter. Databasen brukes for delt aktiv turneringsdata også for gjester. Konto gir permanent eierskap og turneringshistorikk for oppretteren, og permanent personlig statistikk for innloggede spillere. En gjesteeid turnering slettes etter avslutning eller avbrytelse, først når statistikken til registrerte spillere er lagret uavhengig av turneringen. Dagens kode knytter `ownerUserId` når admin er innlogget.
- Konto kan opprettes, logges inn og logges ut med e-post og passord. Den gamle magiske lenke-flaten er skjult.
- Registrerte kontoer har en 1:1 `public.profiles`-rad med RLS. Gjestespillere kan fortsatt bli med uten konto.
- En innlogget spiller knyttes til `user_id` ved påmelding; konto er fortsatt ikke obligatorisk for spillere.
- Fase 2–6-modulene, turneringsformater, statistikk, historikk, hendelser, lokal ratingberegning, insights, varsler og PWA-grunnlag er koblet inn i appen og dekkes av testene. Vedvarende ratingdatabase og liga er fortsatt ikke implementert.
- TV Mode ligger på egen `tv.html` med separat CSS/runtime, responsiv layout, offline-status, roterende meldinger og historikkvennlig tilbakeknapp.
- Aktive assets ligger under `assets/` sortert i `logos/`, `backgrounds/`, `icons/`, `ui/` og `fonts/`. Arkivmateriale ligger under `assets/archive/` og brukes ikke av runtime.
- Ikke-forside-modulene bruker nå et felles UI-lag med TV Mode som visuell referanse: mørk marineblå flate, kjølige blå borders, 12–16 px radius, felles typografihierarki og dempet modul-animasjon. Forsiden følger samme blå designsystem, med egen landing-komposisjon og uten konkurrerende fotografisk hero-bakgrunn.
- Språkfallback følger region: Bokmål, Nynorsk, svensk og dansk faller tilbake til Bokmål, mens engelsk, spansk, tysk og fransk faller tilbake til English før global Bokmål-fallback ved manglende nøkkel.
- Admin kan lagre flere turneringer lokalt, åpne dem igjen fra hjemmesiden og holde aktiv turneringsstate adskilt mellom turneringene.
- Konto-/profilflyten bruker Supabase Auth for e-post/passord og kan gjenbruke innlogget profilnavn ved admin-oppretting og spillerpåmelding. Passord lagres ikke i applikasjonstabeller.
- Retensjon er oppdatert: profiler slettes ikke automatisk, sletting skjer 30 dager etter uttrykkelig forespørsel, og avsluttede turneringer beholdes til registrert spillerstatistikk er overført til profilhistorikk.
- Hjemmesiden lenker til den flerspråklige [korte bruksanvisningen](../../guide.html), som dekker admin, profilspiller, gjestespiller og tilskuer.

## Produktvalg som ikke skal endres uten godkjenning

De avtalte meny-, layout-, rolle-, profil-, språk- og retensjonsvalgene er samlet i [produktbeslutninger og endringsvern](produktbeslutninger.md). Nye faser kan forbedre implementasjonen, men skal ikke endre disse observerbare valgene uten uttrykkelig tillatelse.

## Bevisst senere arbeid fra masterplanen

Masterplanen markerer vedvarende ratingdatabase/liga, gjest-til-konto-konvertering og enkelte avanserte offline-/analyseutvidelser som senere arbeid. Lokal ratingberegning og insights finnes allerede, og skal ikke omtales som helt uimplementert.

TV Mode skal senere kunne følge språket til brukeren som aktiverer visningen. Metoden velges ved implementering ut fra den da gjeldende navigasjons- og synkroniseringsløsningen, slik at språkverdien overføres robust uten å gjøre TV-siden avhengig av intern app-state.
