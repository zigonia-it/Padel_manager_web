# Padelstar – UI-forbedringsplan

Sist oppdatert: 2026-08-31
Status: delvis gjennomført
Baseline: visuelt sterk mørk/gull-profil, men med for stort sprang mellom landing og resten av appen
Before implementing the existing Padelstar UI improvement plan, revise the plan to reflect a broader visual redesign.

The existing plan remains the technical and UX foundation, especially its principles regarding:

- accessibility
- performance
- reduced motion
- realtime stability
- module transitions
- scoring feedback
- dialogs
- responsive behavior
- visual regression testing

However, the visual ambition has changed.

The previous non-goal:

"Ikke lage en ny visuell redesign fra grunnen"

is no longer valid.

Padelstar should now receive a substantial visual redesign while preserving its existing functionality, application architecture and tournament logic.

## New visual direction

Use the supplied reference images as visual inspiration.

Do not copy their branding, colors or exact layouts.

Extract their common design principles:

- premium sports/tournament application aesthetic
- layered surfaces
- elevated cards
- strong visual depth
- large rounded geometry
- subtle glass/translucent surfaces
- floating controls
- strong typography hierarchy
- tactile buttons
- status-driven UI
- polished micro-interactions
- visually prominent current/live content
- restrained gaming influence

The application should feel like a professional native-quality sports/tournament product rather than a conventional responsive website.

## Desktop and mobile

Desktop and mobile are equally important.

Do not use a mobile-first or desktop-first philosophy.

Instead use adaptive responsive design where the same components and information hierarchy are intentionally recomposed for:

- compact
- medium
- expanded

layouts.

Desktop should make intelligent use of horizontal space through grids, contextual side panels and simultaneous tournament information.

Mobile should prioritize current state, next match and relevant player actions.

Neither experience should feel like a stretched or collapsed version of the other.

## Padelstar-specific UX priority

During an active tournament, Padelstar should visually become a live tournament control center.

The interface should immediately communicate:

For players:
- Am I playing now?
- When do I play next?
- Which court?
- Who is my teammate?
- Who are my opponents?
- What is the score/status?

For admins:
- Which matches are currently running?
- Which courts are occupied?
- Which matches are next?
- What is the tournament progress?
- Does anything require attention?

Use hierarchy, card prominence, status indicators and layout to answer these questions.

## New UI-1 scope

Expand UI-1 from simple visual harmonization into creation of a complete Padelstar design system.

Before modifying individual screens, define:

### Foundations
- application background
- surfaces
- elevated surfaces
- glass surfaces
- borders
- shadows/elevation
- spacing
- typography
- responsive behavior
- motion
- focus states

### Geometry
Define reusable radius tokens for:
- controls
- secondary cards
- primary cards
- hero panels
- pills

### Core components
Create or standardize reusable components for:

- AppShell
- navigation
- primary/secondary/ghost/danger buttons
- icon buttons
- pills/chips
- status badges
- tournament hero card
- match card
- player/team card
- court card
- stat card
- section header
- tabs
- filters
- dialogs
- toast/status messages
- empty states
- loading/skeleton states

Do not implement the redesign as isolated CSS overrides.

Build the design system first and migrate the application to it.

## Visual elevation model

Use approximately four layers:

1. application background
2. structural/section surfaces
3. elevated content cards
4. floating navigation, dialogs and controls

Use brightness, subtle borders, shadows, transparency and selective blur to distinguish these levels.

Avoid excessive borders and excessive glassmorphism.

## Existing Padelstar identity

Retain the dark/gold Padelstar identity as the starting point.

However, the existing exact colors are not immutable.

Adjust surface colors, gold tones, contrast and accent intensity if necessary to achieve a coherent premium design.

Gold should function primarily as an accent and interaction color rather than covering large portions of the interface.

## Cards

Cards should become one of the defining elements of Padelstar.

They should feel like tactile interface objects rather than bordered HTML containers.

Use:

- generous radius
- subtle elevation
- internal spacing
- restrained gradients
- faint edge highlights
- clear hierarchy
- contextual status treatment

Primary/current content should have more visual prominence than secondary information.

## Navigation

Make navigation feel application-native.

Desktop may use an appropriate compact navigation rail, sidebar or app bar.

Mobile may use floating bottom navigation.

Both must belong to the same visual system.

Do not force identical navigation geometry across radically different viewport sizes.

## Motion

Retain the motion principles from the existing plan.

Motion must communicate:

- state
- direction
- confirmation
- hierarchy

rather than exist as decoration.

Preserve reduced-motion support.

## Implementation strategy

Update `ui_improvement_plan.md` before implementing the redesign.

Restructure the implementation sequence approximately as:

1. UI-1 — Design system and visual foundation
2. UI-2 — App shell and responsive navigation
3. UI-3 — Core cards and tournament information hierarchy
4. UI-4 — Landing, Create and Join redesign
5. UI-5 — Active tournament / Admin redesign
6. UI-6 — Player and spectator redesign
7. UI-7 — Motion and realtime micro-interactions
8. UI-8 — Dialogs, sharing and action feedback
9. UI-9 — Accessibility, performance and visual QA

For every phase define:

- objective
- implementation work
- acceptance criteria
- verification

Preserve the valuable verification requirements already present in the existing plan, including Playwright screenshots, reduced-motion testing, keyboard testing, responsive testing, Lighthouse where appropriate, `npm test`, and `git diff --check`.

## Important

Do NOT start implementing the redesign yet.

First:

1. inspect the existing Padelstar codebase,
2. inspect the existing UI improvement plan,
3. inspect the supplied visual references,
4. identify which existing components can be retained/refactored,
5. update `ui_improvement_plan.md` into a detailed implementation plan for the new design direction.

The updated plan should be specific to the actual Padelstar codebase rather than a generic UI redesign checklist.

After updating the plan, stop and present the revised plan for review before implementation begins.

## 1. Mål

Videreutvikle uttrykket uten å gjøre appen tyngre eller mer prangende. UI-et skal føles som én sammenhengende produktflate fra landing til join, admin, spiller og tilskuer.

Hovedmålene er:

- skape visuell kontinuitet mellom landing og arbeidsflate
- gjøre modulbytter roligere og mer forståelige
- bruke animasjon til å forklare status og retning, ikke bare som dekor
- gjøre scoring, filtre, faner og dialoger mer responsive
- bevare god ytelse på mobil og støtte `prefers-reduced-motion`

## 2. Designretning

Landing-siden har i dag mer hero-preg, større logo, mer luft og tydeligere markedsføringsuttrykk enn arbeidsflaten. Arbeidsflaten er mer kompakt, informasjonsrik og panelbasert. Forskjellen skal reduseres uten å fjerne landingens tydelige inngangspunkt.

### Felles visuelt språk

- behold mørk/gull-paletten, men bruk samme overflatefarger, kantlinjer og dybde på begge deler
- la landingens paneler bruke samme `--surface-radius`, border-behandling og overlay-logikk som workspace
- reduser forskjellen i bakgrunnens lysstyrke, blur og dekorintensitet mellom landing og workspace
- bruk samme typografiske hierarki for eyebrow, overskrift, hjelpetekst og status
- la CTA-er og arbeidsflateknapper dele en tydelig felles knappelogikk, selv om primærknappen fortsatt kan være større på landing
- bruk accentfarge og statusfarger på samme måte i begge flater

### Bevegelsesprinsipper

- korte overganger: normalt 160–280 ms
- større flatebytter: normalt 280–420 ms
- bruk `transform` og `opacity` fremfor layoutanimasjoner
- én tydelig bevegelsesretning per overgang
- unngå kontinuerlig pulsering som konkurrerer med scoring og status
- alle ikke-nødvendige bevegelser skal respektere `prefers-reduced-motion: reduce`

## 3. Faseplan

### UI-1 – Felles visuell grunnmur

**Prioritet:** P1
**Status:** gjennomført første pass

#### Arbeid

1. Kartlegg alle overflater, paneler, knapper, chips og navigasjonsnivåer.
2. Samle visuelle tokens for overflate, border, skygge, radius, spacing, fokus og motion.
3. Juster landingens overflater slik at de deler workspace-ets visuelle tyngde.
4. Gjør bakgrunnsbehandling og overlay mer konsistent på landing, setup og workspace.
5. Definer tydelig forskjell mellom primær, sekundær, ghost, danger og statusbaserte kontroller.

#### Akseptansekriterier

- Landing, setup og workspace oppleves som samme app.
- Ingen ny separat designspråkvariant introduseres uten begrunnelse.
- Kontrast og lesbarhet beholdes på mobil, desktop og ved høy kontrast.

#### Verifikasjon

- Visuell sammenligning av landing, join, admin, spiller og tilskuer.
- Manuell test med `prefers-contrast: more` og `prefers-reduced-transparency: reduce`.
- `npm test` og `git diff --check`.

### UI-2 – Sammenhengende overgang mellom moduler

**Prioritet:** P1
**Status:** gjennomført første pass

Det finnes allerede en enkel fade/slide for `.app-module`, men den bør gjøres mer konsistent og kobles tydeligere til navigasjonen.

#### Arbeid

1. Standardiser inn- og ut-animasjon for landing, setup og workspace.
2. Bruk retningsbestemt overgang når brukeren går mellom hovedområder, men hold samme retning på mobil der layouten endres til bunnnavigasjon.
3. Animer ikke hele siden unødvendig ved hver stateoppdatering eller realtime-hendelse.
4. Bevar scroll-posisjon der det er naturlig, og flytt fokus til ny hovedoverskrift ved modulbytte.
5. La aktiv navigasjonsmarkør endres samtidig med innholdet, uten merkbar forsinkelse.
6. Håndter raske gjentatte klikk slik at gamle overgangsklasser ikke blir hengende igjen.

#### Akseptansekriterier

- Modulbytte føles som navigasjon i samme app, ikke som full sidelasting.
- Ingen flimring, dobbeltinnhold eller hopp i layout.
- Tastaturbrukere får fokus på riktig ny seksjon.
- Animasjonen slås av eller reduseres automatisk ved redusert bevegelse.

#### Verifikasjon

- Playwright-test av alle hovedmodulbytter.
- Test med rask navigasjon, nettleserens back/forward og mobil bunnnavigasjon.
- Test med `prefers-reduced-motion: reduce`.

### UI-3 – Mikrointeraksjoner som forklarer status

**Prioritet:** P1/P2
**Status:** gjennomført første pass

#### Arbeid

1. Gi knapper en diskret pressed-state og tydelig overgang mellom idle, hover, focus og disabled.
2. Animer statusendring for tilkobling, pending sync, ferdig kamp og ny runde med kort highlight, ikke permanent blinking.
3. Gi scoring en liten, kontrollert bekreftelse på riktig lag og oppdater resultatet uten å flytte hele kortet unødvendig.
4. Animer progress bars og leaderboard-endringer med kort easing.
5. Bruk skeleton eller stabil loading-state ved initial remote loading i stedet for tomme paneler.
6. Bruk toast/statusmelding for kopiering, lagring, konflikt og varsler med konsistent inn-/ut-animasjon.

#### Akseptansekriterier

- Brukeren forstår hva som nettopp skjedde uten å lese konsollen.
- Animasjoner stjeler ikke fokus fra kamp og scoring.
- Oppdateringer fra realtime ser ut som bekreftelser, ikke tilfeldige hopp.
- Statusmeldinger er tilgjengelige med `aria-live`.

#### Verifikasjon

- Test scoring, sync, kampstart, ferdig kamp og konflikt visuelt.
- Kontroller at oppdatering ikke gir horisontal overflow eller uønsket scroll.
- Test med redusert bevegelse og lavere ytelse på mobil.

### UI-4 – Bedre intern navigasjon i workspace

**Prioritet:** P1/P2
**Status:** delvis gjennomført

#### Arbeid

1. Gjør overgang mellom admin-faner, spiller-/tilskuerflater og kampfiltre mer tydelig.
2. Bruk aktiv indikator som glir eller fades mellom faner uten å endre layout-høyde.
3. La panelinnhold få en kort inn-animasjon når filteret endres, men unngå animasjon av hundrevis av elementer.
4. Behold kampkortets posisjon når resultatet oppdateres.
5. Fremhev “nå”-kampen med rolig statusaccent og tydelig hierarki fremfor stor bevegelse.
6. Gjør mobilens faste bunnnavigasjon visuelt integrert med resten av workspace.

#### Akseptansekriterier

- Det er tydelig hvilken del av workspace brukeren ser på.
- Filterendring føles umiddelbar, men ikke brå.
- Kampkort flytter seg ikke uforutsigbart under scoring eller realtime.
- Bunnnavigasjonen dekker ikke innhold eller fokus på små skjermer.

### UI-5 – Dialoger, deling og handlingsfeedback

**Prioritet:** P2
**Status:** delvis gjennomført

#### Arbeid

1. Erstatt gradvis `alert()` og `confirm()` med egne dialoger som følger appens visuelle språk.
2. Animer dialoger med kort fade/scale eller slide fra relevant kontekst.
3. Bruk tydelig primær- og sekundærhandling, spesielt for walkover, avslutning, sletting og konflikt.
4. Gi QR-, kopierings- og delingsflyt en tydelig ferdig-state.
5. Sikre fokusfelle, Escape-lukking, korrekt `aria-labelledby` og retur av fokus.

#### Akseptansekriterier

- Kritiske bekreftelser er forståelige og tilgjengelige.
- Dialoganimasjon kan avbrytes uten at handlingen blir uklar.
- Feil, suksess og venting har konsistente visuelle mønstre.

### UI-6 – Ytelse, tilgjengelighet og visuell QA

**Prioritet:** P1
**Status:** delvis gjennomført; browser-smoke og reduced-motion-kontrakt er etablert, full visuell QA gjenstår

#### Arbeid

1. Bruk bare GPU-vennlige egenskaper i overgangene der det er mulig.
2. Unngå animasjoner som tvinger frem gjentatte layoutberegninger.
3. Test ved 320 px, 390 px, 768 px, 1024 px og desktopbredde.
4. Verifiser kontrast, tastatur, skjermleserstatus, touchmål og redusert bevegelse.
5. Mål at animasjoner ikke forverrer LCP, INP eller opplevd scoring-respons.
6. Lag en liten visuell regresjonspakke med skjermbilder av landing, join, admin, spiller og tilskuer.

#### Akseptansekriterier

- Ingen kritisk flyt blir tregere på vanlig mobil.
- `prefers-reduced-motion` fjerner transformasjoner som ikke er nødvendige.
- Ingen horisontal overflow eller layoutskift introduseres.
- Visuelle endringer kan sammenlignes mellom commits.

#### Verifikasjon

- Playwright screenshots ved definerte viewport-størrelser.
- Lighthouse før/etter større UI-endringer.
- Manuell keyboard- og reduced-motion-gjennomgang.
- Full `npm test` og syntax check.

## 4. Anbefalt implementeringsrekkefølge

1. UI-1: harmoniser flater, tokens og bakgrunner.
2. UI-2: gjør modulbytte og fokusflyt konsekvent.
3. UI-3: legg inn status- og scoring-mikrointeraksjoner.
4. UI-4: forbedre faner, filtre, kampkort og mobil navigasjon.
5. UI-5: moderniser dialoger og handlingsfeedback.
6. UI-6: gjennomfør ytelses-, tilgjengelighets- og visuell regresjonstest.

## 5. Ikke-mål

- Ikke lage en ny visuell redesign fra grunnen.
- Ikke bruke tunge animasjonsbiblioteker uten at native CSS/JavaScript er utilstrekkelig.
- Ikke animere realtime-state på en måte som skjuler den faktiske statusen.
- Ikke prioritere dekorative effekter foran scoring, lesbarhet og driftssikkerhet.
