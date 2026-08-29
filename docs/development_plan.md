# Padelstar - Utviklingsplan

Sist oppdatert: 2026-08-29

Status: aktivt arbeidsdokument for gjenstående arbeid

## Formål

Dette dokumentet inneholder bare arbeid som ikke er gjennomført ennå, eller valg som må tas før et nytt arbeid starter. Gjennomførte faser, beslutninger, endrede filer og verifiseringer dokumenteres i [documentation_log.md](documentation_log.md).

Padelstar er en plattformuavhengig PWA for administrasjon og gjennomføring av padelturneringer. Produktretningen og det etablerte funksjonelle omfanget ligger i `product_development.md`.

## Gjenstående arbeid

### 1. Valgfri ekstern driftsvarsling

Vurdere om `/api/health` skal kobles til en ekstern monitor for aktiv varsling ved driftsfeil.

Før oppstart må følgende avklares:

- leverandør og kostnad
- varslingskanal og ansvarlig mottaker
- databehandling og personvern
- terskler for feil, treghet og gjentatte feil

### 2. Eventuell full konto- og tokenmigrering

Vurdere om kompatibel admin-kontoknytting senere skal utvides til full erstatning av lokal admin-token.

Før oppstart må følgende avklares:

- obligatorisk eller valgfri konto for administrator
- flere administratorer og rollemodell
- sessionsutløp, tilbakekalling og enhetsbytte
- migrering av eksisterende turneringer uten tap av tilgang
- RLS- og recovery-strategi

### 3. Produktforbedringer etter ny beslutning

Følgende kan vurderes som separate initiativer når de prioriteres:

- mer avansert tiebreak- og poengføring
- PDF-eksport av tabell og turneringsresultat
- egen avatarvelger eller avataropplasting
- utvidet historikk og karrierestatistikk
- mer avansert offline-konflikthåndtering

## Arbeidsregler

- Ikke start et nytt punkt uten at scope, personvern, datalagring og akseptansekriterier er avklart.
- Nye endringer skal testes, dokumenteres i `documentation_log.md` og publiseres med en sporbar commit.
- Ingen hemmeligheter skal lagres i repoet eller i klientkode.
- Vercel Analytics beholdes med mindre et nytt, uttrykkelig valg endrer dette.
- Eksisterende brukerdata skal ikke brukes som testdata; midlertidige testdata skal kunne identifiseres og slettes.

## Dokumentasjonsflyt

1. Skriv plan og beslutningsport her før nytt arbeid starter.
2. Flytt gjennomførte punkter til `documentation_log.md` etter verifisering.
3. La denne filen inneholde bare åpne beslutninger og neste arbeid.
