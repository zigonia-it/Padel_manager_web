# Padelstar - Utviklingsplan

Sist oppdatert: 2026-08-29

Status: aktivt arbeidsdokument for gjenstående arbeid

## Formål

Dette dokumentet inneholder bare arbeid som ikke er gjennomført ennå, eller valg som må tas før et nytt arbeid starter. Gjennomførte faser, beslutninger, endrede filer og verifiseringer dokumenteres i [documentation_log.md](documentation_log.md).

Padelstar er en plattformuavhengig PWA for administrasjon og gjennomføring av padelturneringer. Produktretningen og det etablerte funksjonelle omfanget ligger i `product_development.md`.

## Gjenstående arbeid

### Fase 16 – Synlig, tilgjengelig og visuelt sterk UI

**Status: UI-implementasjon ferdig 2026-08-29; Lighthouse-oppfølging gjenstår**

#### Mål

Oppgradere det grafiske grensesnittet slik at Padelstar blir enklere å lese for personer med nedsatt syn, samtidig som appen får en tydeligere, mer moderne og mer sportslig visuell effekt.

Fasen skal forbedre de tre rollene separat:

- **Spiller:** neste kamp, bane, makker, motstandere og poeng skal kunne avleses på et øyeblikk.
- **Administrator:** live-drift, kampstyring og kritiske handlinger skal ha tydelig prioritet og lav feilrisiko.
- **Tilskuer:** aktive, kommende og ferdige kamper skal være lette å skanne uten å forstå adminflyten.

#### Designgrunnlag

Fasen tar utgangspunkt i:

- [Apple Human Interface Guidelines – Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/): større tekst, høyere kontrast, mer enn farge alene, redusert bevegelse og tilgjengelige kontrollstørrelser.
- [Apple Human Interface Guidelines – Typography](https://developer.apple.com/design/human-interface-guidelines/typography): robuste tekststørrelser og vekter, minst mulig truncation og layout som tåler større tekst.
- [Apple Human Interface Guidelines – Layout](https://developer.apple.com/design/human-interface-guidelines/layout): hierarki, gruppering, justering, progressive disclosure og tilpasning til skjermstørrelse.
- [Apple Human Interface Guidelines – Color](https://developer.apple.com/design/human-interface-guidelines/color/): farge skal være konsekvent, ha tilgjengelige varianter og ikke være eneste statussignal.
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/): AA-kontrast, tastaturfokus, reflow, mål for berøring og tilgjengelig tekstskalering.
- [Apple Sports](https://www.apple.com/newsroom/2024/02/introducing-apple-sports-a-new-app-for-sports-fans/): glanceable live-score, favoritter og tydelig vei mellom aktuelle og kommende kamper.
- [Tournated for tournament managers](https://www.tournated.com/en-US/solutions/tournament-managers): rollebaserte arbeidsflater, live-resultater, deltakerflyt og rangering samlet i en oversiktlig sportsoperasjon.

Referansene brukes som prinsippgrunnlag og arbeidsinspirasjon, ikke som kopiering av visuell profil eller innhold.

#### Lighthouse-baseline

Rapport mottatt 2026-08-29 fra simulert mobilmåling:

- samlet score: **91/100**
- SEO: **100/100**
- ytelse: **67/100**
- tilgjengelighet: **98/100**
- beste praksis: **100/100**
- LCP: **9,8 s**
- FCP: **1,8 s**
- CLS: **0**
- TBT: **0 ms**
- Speed Index: **7,4 s**
- største identifiserte mulighet: ubrukt JavaScript, om lag **0,5 s** mulig gevinst

Baseline skal brukes som før-måling. Den viser at innlastingen av den første synlige skjermen er den viktigste tekniske UI-utfordringen, selv om SEO, stabilitet og beste praksis allerede er sterke.

#### Implementeringsstatus

UI- og tilgjengelighetsdelen er gjennomført med sterkere tekstnivåer, fokusmarkering, stabile kontrollmål, mobil reflow, redusert blur/transparens, redusert bevegelse, tydeligere statusflater og komprimert hero-bakgrunn/logo. Systempreferanser brukes for økt kontrast, redusert transparens og redusert bevegelse.

Gjenstående arbeid er en separat ytelsesrunde mot publisert URL. Lokal Lighthouse på utviklingsserveren etter endringene ga ytelse **62/100**, LCP **7,4 s**, FCP **3,2 s**, Speed Index **3,2 s**, CLS **0,176**, TBT **0 ms**, tilgjengelighet **98/100**, SEO **100/100** og beste praksis **96/100**. Målingen er ikke sammenlignbar nok med mottatt produksjonsrapport til å lukke ytelsesmålet; årsaken til layoutskiftet i landingens hero og ubrukt JavaScript må følges opp etter deploy.

#### Planlagt arbeid

1. Gjøre en skjerm-for-skjerm-audit av landing, admin, spiller, tilskuer, kampkort, tabell, dialoger og mobilmeny. Registrere kontrast, leserekkefølge, tekstkutt, tetthet, fokus, touchmål og utydelige statuser.
2. Etablere et lite designsystem med tokens for bakgrunnslag, tekstnivåer, gullaksent, statusfarger, rammer, skygger, radius, spacing og fokus. Padelstar mørk/gull beholdes, men med en tydeligere high-contrast/daylight-variant for krevende lysforhold.
3. Lage tydeligere informasjonsprioritet: én fremhevet live-status, færre konkurrerende kort, mer luft rundt hovedinnholdet og progressive disclosure for sekundær informasjon.
4. Gjøre status forståelig uten farge alene. Kombinere tekst, ikon, form, plassering og eventuelt mønster for `live`, `venter`, `ferdig`, `pause`, `offline` og `feil`.
5. Bygge tekst og layout for minst 200 % tekstforstørrelse og 400 % zoom uten tap av funksjon. Ved stor tekst skal flerkolonneoppsett kunne bli stablet, og lange navn skal brytes i stedet for å overlappe eller kuttes.
6. Sikre lesbare kontrollstørrelser og avstand: 44 × 44 CSS-piksler som praktisk designmål for berøringskontroller, med WCAG 2.2 som minimumskrav der unntakene gjelder. Alle ikoner skal ha tilgjengelig navn og synlig fokus.
7. Forbedre kontrast uten å miste visuell effekt: ingen viktig tekst over uforutsigbare bakgrunnsbilder, ingen tynn gulltekst på mørk bakgrunn, og alle kjerneflater skal måles mot WCAG AA-krav på 4,5:1 for normal tekst og 3:1 for stor tekst.
8. Respektere `prefers-reduced-motion`, redusere blur/transparens ved behov og bruke rolige overganger. Animasjon skal fremheve live-hendelser, ikke konkurrere med lesing eller gi flimring.
9. Verifisere med tastatur, skjermleser, gråskala, økt kontrast, større tekst, redusert transparens, redusert bevegelse, 320 CSS-piksler og desktop/mobil i både stående og liggende visning.
10. Lage før-/etter-skjermbilder og en kort visuell beslutningslogg før komponentene implementeres.
11. Gjennomføre en ytelsesrunde før eller parallelt med redesign: finne hva som forsinker LCP, vurdere størrelsen og prioriteringen av hero-/bakgrunnsbilder, redusere ubrukt JavaScript, utsette ikke-kritiske tredjepartsskript og kontrollere fontlasting. Målingen skal gjentas med samme Lighthouse-oppsett.

#### Beslutningsport

- Godkjenne at mørk/gull beholdes som merkevare, men at lesbarhet alltid overstyrer dekor.
- Godkjenne om high-contrast/daylight skal være en eksplisitt brukerinnstilling eller følge systempreferanser.
- Velge hvilke live-data som skal være første visuelle fokus i hver rolle.

#### Akseptansekriterier

- Kjerneflytene oppfyller WCAG 2.2 AA for kontrast, tastatur, fokus, reflow og tekstforstørrelse.
- Ingen kritisk status eller handling kommuniseres kun med farge, glød eller animasjon.
- UI-et fungerer ved 200 % tekstforstørrelse og 400 % zoom uten overlapp eller tapt funksjon, med unntak av datatabeller der horisontal visning er nødvendig og tydelig håndtert.
- Alle primære berøringskontroller har stabil størrelse, tilstrekkelig avstand og synlig fokus.
- Admin-, spiller- og tilskuervisning har hver sin tydelige visuelle prioritet.
- Visuell effekt kommer fra komposisjon, typografisk hierarki, kontrast, dybde og live-status, ikke fra lavkontrast-glass, overdreven glow eller dekor som skjuler innhold.
- Lighthouse-ytelsen forbedres vesentlig fra baseline, med et første mål om LCP under 2,5 sekunder og ytelsesscore på minst 90 i samme simulerte mobilprofil. SEO- og beste praksis-score skal ikke falle.
- Før-/etter-skjermbilder og resultatet av tilgjengelighetstestene er dokumentert i `documentation_log.md`.

#### Avhengigheter

- Fasen starter med audit og designbeslutning før CSS-/HTML-implementering.
- Eksisterende språk- og komponentstruktur skal beholdes og utvides, ikke erstattes av hardkodet tekst.
- Endringer skal testes i lokal browser og på publisert URL før fasen markeres ferdig.

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
