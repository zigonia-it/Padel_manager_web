# Gjennomføring av konto- og turneringslivssyklus

Kravgrunnlag: [konto-, database- og turneringsflyt](konto-database-turneringsflyt.md).
Baseline: `e666717`. Status: under implementering, ikke publisert.

## Verifiserte gap

- `app/app.js:endTournament` lagrer bare den lokale profilens historikk og saniterer deretter kampdata. Det gir ingen garanti for permanent statistikk til alle kontospillere.
- `handleResetTournament` fortsetter å fjerne lokal state selv når remote sletting feiler.
- Permanente lokale turneringer identifiseres med `ownerProfileId`, som ikke er det samme som en autentisert kontoeier.
- Nyeste lokale cleanup-migrasjon kan slette gjesteeide turneringer etter alder, uten krav om avslutning eller ferdig statistikkoverføring.
- Databaseopprettelse uten konto er tilsiktet og skal beholdes.
- Sist inspiserte produksjonsmigrasjonsliste endte på `20260902210348`; lokale senere migrasjoner må ikke antas å være deployet.

## Implementering og bevis

| Krav | Endring/bevis | Status |
|---|---|---|
| Ikke avslutte/slette før alle resultater og statistikk er lagret | Ny `app/tournament-finalization.js` venter på flush og serverbekreftelse | Modul testet; runtime/database ikke integrert |
| Trygge nye forsøk | Modul deler pågående kall og lar feil forsøkes igjen; server må fortsatt gi idempotent kvittering | Klientdel testet |
| Lokal kjøring uten nett | Lokal avslutning/avbrytelse kloner state, avslutter uferdige kamper og hevder ikke at serverstatistikk er lagret | Modul testet |
| Permanente kontospillerdata uavhengig av turnering | Ny migrasjon med transaksjonell sluttføring, separate kontostatistikkrader og kvittering | Isolert kjernetest bestått; full integrasjon gjenstår |
| Kontoalternativer for opprett/join | Eksisterende flyt må utvides | Ikke implementert |
| Testkonto og flere klienter | Bruker har autorisert opprettelse av testkonto | Gjenstår |

Fokusert kontroll: `node --test test/tournament-finalization.test.js`, 4/4 bestått. `git diff --check` bestått. Modulen er bevisst ikke lastet av appen før serverkontrakten finnes og helheten kan testes.

## Neste integrasjon

1. Implementer transaksjonell `finalize_tournament` med serverberegnet statistikk, autentiserte spillerbindinger og idempotent kvittering; sikre cleanup og direkte sletteveier.
2. Test databasefeil/rollback, gjentatte forsøk og kontostatistikk etter sletting i isolert database.
3. Koble klientmodulen til sluttføring og avbrytelse; fjern klientstyrt forhåndssletting.
4. Fullfør kontoalternativer, kontohistorikk og testkonto/flerklientkontroller.

Målet er fortsatt hele kravflyten; den isolerte klientmodulen er ikke en ferdig leveranse.

## Databasearbeid 2026-09-13

Ny lokal migrasjon: `20260913123550_account_tournament_finalization.sql`.

- `finalize_tournament` låser turneringen, beregner kontospillerstatistikk og lagrer kvittering før sletting av gjesteeide turneringer. Statistikk har ingen fremmednøkkel til turneringen.
- Kvittering med hash av admintoken gir idempotent gjentakelse etter sletting, uten å lagre gjestens kamp-/persondata i kvitteringen.
- Separate serverstyrte kontobindinger; oppretter kobles fra `auth.uid()`, eksisterende spillerøkt kan knyttes med autentisering og gyldig spillertoken.
- Direkte sletting og gammel klientstyrt avslutning blokkeres før statistikktransaksjonen. Aktive turneringer slettes ikke på grunn av alder.
- `scripts/verification/finalization-database.cjs` kjørte mot isolert PGlite/PostgreSQL: gjestesletting, uavhengig statistikk, kontoeiers beholdte turnering, idempotens, feil token, slettevern og rollback/retry ved injisert statistikkfeil bestod.
- Testfixturen bruker et minimalt eksisterende schema og SHA-256-adapter, ikke en full Supabase-instans. Auth/join/create-integrasjon, eksisterende datamigrering og full migrasjonskjede må fortsatt verifiseres. Den lokale migrasjonen er ikke produksjonsklar alene og er ikke deployet.
- Klientmodulens fire tester bestod på nytt. Ingen produksjonsendring, testkonto eller publisering er utført ennå.

Kjør isolert databasekontroll med `PADELSTAR_PGLITE_MODULE=/path/to/@electric-sql/pglite node scripts/verification/finalization-database.cjs`. Verifikasjonsmotoren er installert midlertidig i `/tmp/padelstar-db-verification`, uten nye runtime-avhengigheter i appen.
