# Padelstar – samlet utviklingsplan

Sist oppdatert: 2026-08-31
Status: aktiv plan for neste utviklingsperiode
Produktstatus: 0.2 Beta

Dette dokumentet samler den eksisterende utviklingsplanen, tidligere faseplaner og den siste tekniske evalueringen av appen. Det beskriver arbeid som gjenstår, prioritert etter brukerimpact, driftsrisiko og sikkerhet.

## 1. Nåværende baseline

Padelstar er en statisk, responsiv PWA med Supabase live sync. Appen støtter:

- oppretting og deling av turneringer via kode, QR og lenke
- round-robin og cup med automatisk/manuelt lagoppsett
- byes, bronsefinale, walkover, scoring og undo
- admin-, spiller- og tilskuerroller
- realtime, lokal lagring, recovery-kopi og IndexedDB-speiling
- lokal profil, historikk, oversettelser og opt-in-varsler

Eksisterende kode og database har allerede gode grenser rundt turneringsmotor, scoring, state-migrering, realtime og Supabase RPC-er. Nåværende standardkjøring viser 62 beståtte tester og én opt-in live-test som ikke kjøres uten live-testvariabler. JavaScript-filer passerer `node --check`, og lokal browser-smoke er etablert for desktop og mobil.

### Kjente begrensninger i baseline

- `app/app.js` er omtrent 4 400 linjer og har ansvar for store deler av hele frontend-flyten.
- `package.json` har kun `npm test`; lint, typekontroll, formattering og CI-validering er ikke komplett etablert i arbeidskopien.
- Testene dekker primært ren logikk og statiske SQL-kontrakter. Full nettleserflyt og fler-enhetstest må kjøres systematisk i CI.
- Live-modus har begrenset offline-støtte. Enkelte admin-operasjoner blokkeres offline, mens spillerpoeng kan køes.
- Push-funksjonen må verifiseres og CORS-kontrakten må kompletteres før den regnes som produksjonsklar.

## 2. Prioritert mål

Målet er å gjøre betaen robust nok for kontrollerte, ekte småturneringer uten å utvide scope med betaling, obligatoriske kontoer eller andre funksjoner som ikke er nødvendige for live-flyten.

Prioritert rekkefølge:

1. Lukke produksjonskritiske feil i push og nettverksflyt.
2. Etablere ekte browser-, live- og CI-verifisering.
3. Gjøre offline-, kø- og konfliktflyten tydelig og pålitelig.
4. Redusere frontend-kompleksitet uten funksjonell regresjon.
5. Styrke personvern, invite-sikkerhet og tilgjengelighet.
6. Ta stilling til driftsovervåking og eventuell full kontomigrering.
7. Gjennomføre valgte produktforbedringer etter ny prioritering.

## 3. Arbeidsregler

- Ingen produksjonsendring uten tydelig scope, akseptansekriterier og verifikasjon.
- Ingen deploy, live-migrering, credential-endring eller sletting av data uten eksplisitt godkjenning.
- Nye endringer skal testes og dokumenteres i `docs/documentation_log.md`.
- Midlertidige testturneringer skal være tydelig merket og slettes etter testen.
- Ingen hemmeligheter skal lagres i repo eller frontend.
- Eksisterende brukerdata skal ikke brukes som testfixture.
- Hver fase avsluttes med gjennomgått diff, testresultat og dokumentasjonsoppdatering.

## 4. Faseplan

### Fase 16 – Push-varsler og produksjonskritisk nettverk

**Prioritet:** P0
**Status:** gjennomført og live-verifisert

#### Arbeid

1. Legg til komplett CORS-respons i `supabase/functions/push-send/index.ts`, inkludert `Access-Control-Allow-Methods: POST`.
2. Verifiser preflight, autentisering med admin-token og faktisk sending fra produksjonsklient.
3. Legg til timeout og kontrollert feilhåndtering for Web Push.
4. Vurder rate limiting for push-endepunktet og beskyttelse mot gjentatt sending.
5. Rydd automatisk ugyldige subscriptions og logg aggregert sendestatus uten personopplysninger.

#### Akseptansekriterier

- Push-kall passerer nettleserens preflight.
- Ugyldig eller manglende admin-token gir 401 uten lekkasje av detaljer.
- En kampstart eller rundeendring sender maksimalt én forventet varsling per hendelse.
- Ugyldige subscriptions fjernes uten at én feil stopper resten av utsendingen.

#### Verifikasjon

- Unit-/kontrakttest av CORS-headers og payloadgrenser.
- Nettlesertest med tillatt og avslått varsling.
- Live smoke med én midlertidig testturnering og cleanup.

### Fase 17 – Browser-, live- og CI-verifisering

**Prioritet:** P0
**Status:** delvis gjennomført; desktop-/mobil-smoke og Pages-gate er etablert, flerklient/live-flyt gjenstår

#### Arbeid

1. Etabler Playwright-smoke for desktop og mobil viewport.
2. Test hele flyten: opprett admin → join spiller → realtime lobby → start runde → scoring → resultat → tilskuer.
3. Test separate admin-, spiller- og tilskuerklienter.
4. Test refresh, reconnect, offline/online, lokal recovery og rollebevaring.
5. Kjør opt-in live Supabase-test med dedikerte testvariabler og automatisk sletting.
6. Etabler CI-jobb som kjører tester, syntax check, lint/typekontroll når dette er innført, og artifact-/PWA-validering før deploy.

#### Akseptansekriterier

- Kritisk brukerflyt er automatisert på minst én mobil og én desktop viewport.
- Live-testen kjører eksplisitt i et isolert testmiljø og etterlater ingen testdata.
- CI stopper deploy ved feil i test, syntax, PWA-shell eller sikkerhetskontrakt.
- Flaky tester blir identifisert og dokumentert, ikke skjult gjennom gjentatte retries.

#### Verifikasjon

- `npm test`
- `node --check` for alle browser- og API-filer
- Playwright smoke lokalt og i CI
- `PADELSTAR_LIVE_SUPABASE=1 npm test` i godkjent live-testmiljø

### Fase 18 – Offline-kø, sync og konfliktmodell

**Prioritet:** P1
**Status:** delvis gjennomført; synlig konfliktvalg og retry er etablert, full kø-/konfliktmodell gjenstår

#### Arbeid

1. Dokumenter hvilke operasjoner som kan utføres offline og hvilke som krever serverrevisjon.
2. Gjør pending-operasjoner synlige med tydelig status, antall og siste forsøk.
3. Skill mellom lokal state, køede operasjoner og bekreftet server-state.
4. Implementer retry med backoff og kontrollert gjenopptakelse etter nettretur.
5. Lag en eksplisitt konfliktvisning for admin med valg mellom å laste siste server-state eller beholde lokal backup.
6. Verifiser at scoring, round advance, undo, walkover og kampstart ikke kan gi falsk bekreftelse lokalt.

#### Akseptansekriterier

- Brukeren ser alltid om en endring er lokal, køet, bekreftet eller avvist.
- En nettverksfeil fører ikke til at data blir stille borte.
- Stale revisions kan ikke overskrive nyere server-state.
- Recovery-kopi og sync-metadata kan gjenoppta en avbrutt økt uten tokenlekkasje.

#### Verifikasjon

- Deterministiske tester av kø, retry, stale revision og konflikt.
- Playwright-test med simulert nettverksbrudd.
- Reload mens køen inneholder ventende operasjoner.

### Fase 19 – Frontend-struktur og kvalitetssperrer

**Prioritet:** P1
**Status:** delvis gjennomført; RPC-transportseam er isolert, videre moduloppdeling og lint/typekontroll gjenstår

#### Arbeid

1. Frys testbaseline før refaktorering.
2. Del `app/app.js` i tydelige områder for navigasjon, rendering, sync, varsler, profiler og turneringshandlinger.
3. Samle gjentatt remote-write-logikk i én kontrollert klient for RPC-kø, revisjon og feilhåndtering.
4. Introduser ESLint og formattering med liten, repo-tilpasset konfigurasjon.
5. Legg til JSDoc-typer eller gradvis TypeScript for sentrale state- og RPC-payloads.
6. Unngå at render av hele workspace skjer ved hver liten scoringendring der delvis oppdatering er trygt.

#### Akseptansekriterier

- Ingen observerbar endring i roller, scoring, sync eller PWA-flyt.
- Hver flyttet modul har stabil offentlig seam og relevante tester.
- Lint/typekontroll kan kjøres lokalt og i CI.
- Remote-write-logikken har ett sted for kø, revisjon og konfliktbehandling.

#### Verifikasjon

- Full eksisterende testpakke før og etter hvert refaktorsteg.
- Browser-smoke på kritiske flyter.
- `git diff --check`, syntax check og lint/typekontroll.

### Fase 20 – Invite-sikkerhet og personvern

**Prioritet:** P1
**Status:** delvis gjennomført; dedikert spectator-RPC er lagt til som migrasjon, produksjonsmigrering og full personvernrevisjon gjenstår

#### Arbeid

1. Vurder lengre eller mer entropiske invitasjonskoder enn dagens korte kodeformat.
2. Skill mellom state som trengs for join og state som vises offentlig til tilskuere.
3. Kontroller om navn, avatarer og historikk eksponeres mer enn nødvendig gjennom offentlig lookup.
4. Vurder per-IP/enhet-beskyttelse i tillegg til token- og kodebasert rate limiting.
5. Dokumenter trusselmodell, retensjon, tokenlivssyklus og konsekvensen av stjålet admin-token.

#### Akseptansekriterier

- Tilskuer får kun nødvendige data for read-only-visning.
- Brute-force og langsiktig enumerering av invitasjonskoder er tilstrekkelig begrenset for betaens risikonivå.
- Ingen token eller private adminfelt finnes i delt state, backup eller offentlig UI.

#### Verifikasjon

- SQL-/grant-/RLS-kontrakttester.
- Negativ test av kodeenumerering og ugyldige tokens.
- Gjennomgang av personverntekst mot faktisk dataflyt.

### Fase 21 – Tilgjengelighet og brukeropplevelse

**Prioritet:** P1/P2
**Status:** delvis gjennomført; kritiske admin-dialoger og appens feilmeldings-toast er migrert, full dialog- og QA-gjennomgang gjenstår

Detaljert UI-plan ligger i [ui_improvement_plan.md](ui_improvement_plan.md) i prosjektroten. Den planen styrer visuell harmonisering, moduloverganger, mikrointeraksjoner, dialoger og visuell QA.

#### Arbeid

1. Erstatt gradvis `alert()` og `confirm()` med tilgjengelige dialoger og inline-status.
2. Forbedre loading-, error-, empty- og offline-states.
3. Verifiser tastaturnavigasjon, fokusflyt, dialoglukking og skjermleserstatus.
4. Gjør scoring på mobil mer ergonomisk med tydeligere primærhandlinger og større touchmål.
5. Kjør manuell og automatisert tilgjengelighetskontroll på landing, join, admin, spiller og tilskuer.

#### Akseptansekriterier

- Kritiske handlinger kan utføres uten mus.
- Feil og sync-status er forståelige uten å lese konsollen.
- Dialoger håndterer fokus og Escape korrekt.
- Mobil scoring kan brukes med én hånd uten utilsiktede trykk.

### Fase 22 – Senere visuell redesign

**Prioritet:** P2
**Status:** aktivert; første implementasjon gjennomført, full visuell QA gjenstår

Detaljert mål- og implementeringsplan ligger i [padelstar_later_visual_redesign_plan.md](padelstar_later_visual_redesign_plan.md). Planen er nå aktivert som Fase 22 etter brukerens eksplisitte prioritering.

#### Aktiveringskriterier

1. Fase 17–21 er gjennomført med dokumentert test- og browser-verifisering.
2. Appens kjerneflyter, scoring, realtime, sync og permissions er stabile.
3. Baseline-skjermbilder for compact, medium og expanded layout er tatt.
4. \`ui_improvement_plan.md\` er gjennomgått som historisk/teknisk input.

#### Omfang ved aktivering

- Etabler et samlet designsystem for farger, flater, typografi, spacing, radius, fokus, motion og responsive layoutmodi.
- Redesign app-shell, landing, setup, workspace, livekamp og supporting modules med bevart funksjonell og teknisk oppførsel.
- Prioriter adaptiv compact/medium/expanded-komposisjon, premium sportsuttrykk, tydelig live-status, tactile controls og kontrollert dybde.
- Ikke lås ny fargepalett i denne implementasjonen; behold mørk/gull midlertidig og vurder endelig accent-/overflatebalanse etter at den nye strukturen er visuelt verifisert.
- Bevar tournament logic, scoring, permissions, realtime-protokoll, accessibility, performance og backend-kontrakter.
- Gjennomfør visuell regresjon, tilgjengelighetskontroll, performancekontroll og dokumentert handoff.

#### Verifikasjon

- Følg alle aktiveringskriterier og quality gates i [padelstar_later_visual_redesign_plan.md](padelstar_later_visual_redesign_plan.md).
- Fase 22 er startet med et avgrenset, referanseledet designsystem- og surface-pass. Bred komponentmigrering og endelig visuell QA fullføres etter at alle layoutmodi er kontrollert.

### Fase 23 – Driftsovervåking og kontoavklaringer

**Prioritet:** P2
**Status:** beslutningspunkt

#### Beslutninger før arbeid

- Skal `/api/health` kobles til ekstern monitorering?
- Hvem skal motta varsler, og hvilke terskler gjelder?
- Skal admin-token fortsatt være valgfri hovedmekanisme, eller skal konto bli obligatorisk?
- Skal flere administratorer støttes?
- Hvordan skal sessionsutløp, tilbakekalling, enhetsbytte og recovery fungere?

Ingen full kontomigrering startes før disse beslutningene er dokumentert sammen med RLS-, personvern- og migreringsstrategi.

### Fase 24 – Valgte produktforbedringer

**Prioritet:** P2/P3
**Status:** avventer produktprioritering

Mulige initiativer:

- full tiebreak- og poengføring
- PDF-eksport av tabell og turneringsresultat
- utvidet profilhistorikk og karrierestatistikk
- forbedret avatarvelger eller avataropplasting
- mer avansert turneringsoppsett og lagbalansering

Hvert initiativ må få eget scope, databehov, personvernvurdering og akseptansekriterier før oppstart.

## 5. Verifikasjonsmatrise

| Område | Minimumskrav | Bevis |
|---|---|---|
| Domenelogikk | Scheduler, cup og scoring er korrekte | Node-tester |
| Supabase | RLS, grants, token og revisjon håndheves | SQL-kontrakter og live-test |
| Realtime | Nyeste state vinner og reconnect fungerer | Fler-klient smoke |
| Offline | Kø og recovery mister ikke brukerens endring | Simulert nettverksbrudd |
| PWA | Shell, service worker og fallback fungerer | Playwright + PWA-tester |
| Push | Preflight, auth og utsending fungerer | Browser- og live smoke |
| Tilgjengelighet | Tastatur, fokus og statusmeldinger fungerer | axe/manual QA |
| Drift | Deploy, health og cleanup kan kontrolleres | CI/runbook/monitor |

## 6. Dokumentasjonsflyt

1. Oppdater dette dokumentet ved faseendringer og ved hver commit som flytter status.
2. Kopier gjennomført arbeid, beslutninger og verifikasjonsresultater til `docs/documentation_log.md`.
3. Marker uverifiserte punkter eksplisitt.
4. Oppdater README først når faktisk brukerfunksjonalitet eller produksjonsstatus endres.
5. Ikke marker en fase som ferdig basert på kodegjennomgang alene når kjørbar verifikasjon er tilgjengelig.
