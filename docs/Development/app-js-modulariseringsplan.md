# Plan for oppdeling av `app/app.js`

**Sist kartlagt:** 2026-09-04  
**Kartlagt commit:** `f734e72` på `codex/padelstar-ui-refresh`
**Status:** Fase A er gjennomført og verifisert. Neste arbeid er ny gjennomgang av Fase B på denne baselinen.

## 1. Konklusjon

`app/app.js` er fortsatt composition root, men inneholder også flere resterende domener. Filen er 2503 linjer lang etter de verifiserte flyttingene. Prosjektet har allerede en etablert IIFE-/`window.Padelstar...`-arkitektur under `app/`, derfor bør videre oppdeling skje der og ikke ved å introdusere en parallell `js/`-struktur.

Målet for refaktoreringen bør være:

- `app/app.js` beholder mutable runtime-state, modulkomposisjon og koordinering.
- Rene funksjoner, DOM-registry, metadata, språk, event-binding og avgrensede kontrollere flyttes ut.
- Eksisterende `window.Padelstar...`-API-er beholdes.
- Hver flytting skjer i én separat commit med test, syntax-sjekk, `git diff --check` og lokal runtime-regresjon.

## 2. Hva som allerede er flyttet

Følgende områder har allerede egne moduler og skal ikke implementeres på nytt:

| Område | Nåværende fil(er) |
|---|---|
| App-events, workspace-events og admin-form-events | `app/app-events.js`, `app/workspace-events.js`, `app/admin-form-events.js` |
| Tournament engine/runtime/status/scheduler/state machine | `app/tournament-engine.js`, `app/tournament-runtime.js`, `app/tournament-status.js`, `app/tournament-scheduler.js`, `app/tournament-state-machine.js` |
| Scoring og score-mutasjoner | `app/scoring-engine.js`, `app/score-actions.js`, `app/score-submissions.js`, `app/result-submissions.js` |
| Remote state, admin-mutasjoner og spillerkø | `app/remote-state-write.js`, `app/remote-admin-actions.js`, `app/remote-player-score.js`, `app/remote-tournament.js` |
| Rendering av kamp, tabell, spiller, cup og workspace | `app/match-card.js`, `app/match-list.js`, `app/standings.js`, `app/player-list.js`, `app/cup-bracket.js`, `app/workspace-overview.js` |
| Profil, historikk og konto | `app/profile-session.js`, `app/profile-ui.js`, `app/profile-history.js`, `app/account-auth.js`, `app/admin-identity.js` |
| Navigasjon, roller og øktpolicy | `app/workspace-navigation.js`, `app/module-routing.js`, `app/session-policy.js`, `app/initial-view.js` |
| PWA, offline og realtime | `app/pwa-install.js`, `app/offline-storage.js`, `app/persistence.js`, `app/realtime-sync.js`, `app/realtime-connection.js` |
| Visuelle og lavere UI-tjenester | `app/avatar-system.js`, `app/player-visuals.js`, `app/accent-system.js`, `app/ui-feedback.js`, `app/notification-system.js`, `app/rendering.js` |
| Nye grenser fra siste kartlegging | `app/court-settings.js`, `app/setup-forms.js`, `app/tournament-queries.js`, `app/tournament-sharing.js` |

## 3. Faktisk innhold som fortsatt ligger i `app/app.js`

Linjenumrene er kontrollert mot kartlagt commit og skal brukes som startpunkt, ikke som permanente API-kontrakter.

| Linjer | Ansvar | Vurdering |
|---:|---|---|
| 1–13 | Storage-nøkler | Trygt å flytte samlet. Ingen runtime-logikk. |
| 14–336 | Globale tjenestereferanser, factory-wiring, Supabase-konfigurasjon og sync-state | Må deles i config/factory/state-lag; høy sirkulær avhengighetsrisiko. |
| 343–489 | `elements`-registry med `document.querySelector(...)` | Svært lav risiko hvis modulen kun returnerer DOM-referanser. |
| 491–955 | Modulkomposisjon og dependency injection | Skal i hovedsak bli i composition root; ikke flyttes mekanisk. |
| 956–1125 | `initializeApp()` og direkte event-bindings | Kan deles i init og events, men event-rekkefølge må bevares. |
| 1128–1164 | Existing-player-oppslag og Supabase-aktivering | Medium risiko; kobler join, remote state, auth og rendering. |
| 1167–1203 | Tournament/profile wrappers og profile history orchestration | Mest wrappers; kan samles etter at avhengighetskartet er stabilt. |
| 1207–1547 | State-migrering, lokal persistence, remote sync, konflikt og retry | Høy risiko; siste store gjenværende kontrollområde. |
| 1549–1667 | PWA/meta, workspace-navigasjon, roller og `renderRoleVisibility` | Kan deles i meta, session/controller og navigation orchestration. |
| 1654–1810 | Sentral `render()` og workspace-koordinering | Høy risiko; bør flyttes sent sist til en renderer med eksplisitte callbacks. |
| 1813–1987 | Scorecard-hjelpere, lokal varsling og enkelte rendering wrappers | Delvis allerede flyttet; resterende wrappers bør ryddes etter renderer-flytting. |
| 1991–2170 | Join/player-session, leave-flow, availability, regler og turneringsinnstillinger | Medium/høy risiko fordi state, persistence og rollepolicy endres samtidig. |
| 2191–2420 | Turneringshandlinger, kamp-livssyklus og scoring wrappers | Mesteparten peker allerede til moduler; behold wrappers midlertidig for kompatibilitet. |
| 2424–2554 | Tekstformattering, escaping, invite-code, slugify og legacy migration | Pure helpers er lav risiko; legacy migration må verifiseres separat. |
| 2554–2622 | Initial view-kall og test-API | Composition-root ansvar; test-API skal beholdes stabilt. |

## 4. Foreslåtte moduler og avhengigheter

Strukturen tilpasses eksisterende repository:

### Lav risiko – bør tas først

| Foreslått fil | Ansvar | Avhengigheter | Skal ikke eie |
|---|---|---|---|
| `app/config/storage-keys.js` | Eksportere alle storage-nøkler, inkludert legacy-nøkler | Ingen | `localStorage`, state eller migrering |
| `app/bootstrap/dom-elements.js` | Bygge og returnere `elements`-registry | `document` injiseres | Event handlers eller rendering |
| `app/core/utilities.js` | `escapeHtml`, `escapeAttribute`, `appendEmptyText`, `createInviteCode`, `slugify` | Kun `crypto`/`Math` hvis nødvendig | App-state, DOM-oppslag og storage |
| `app/config/supabase-config.js` | Lese meta/global Supabase-konfigurasjon | `document`/`window` injiseres | Klientopprettelse, auth og RPC |
| `app/ui/theme.js` | `applyTheme` | `document` eller theme-element injiseres | Språk eller state |
| `app/bootstrap/app-meta.js` | `registerServiceWorker`, copyright-år og statiske metadata | `navigator`, `window`, `document` injiseres | App-init og remote sync |

### Medium risiko – etter lavrisikoflyttingene

| Foreslått fil | Ansvar | Avhengigheter | Merknad |
|---|---|---|---|
| `app/bootstrap/app-events.js` | Samle de resterende direkte `addEventListener`-bindingene i init-blokken | `elements` og callback-objekt | Eksisterende event-moduler beholdes; ingen domenelogikk skal flyttes hit |
| `app/bootstrap/app-init.js` | Orkestrere profil, preferences, services, auth, events, initial view og første render | Eksplisitte init-callbacks | Må ikke eie mutable state |
| `app/core/language-controller.js` | `loadUserLanguage`, `applyLanguage`, `syncLanguageOptions`, `t` og språk-change-flow | `PadelstarI18n`, `PadelstarI18nUi`, storage, state access, elements | Språk skal ikke skrives inn i delt remote state |
| `app/core/session-controller.js` | Leave-flow, current role, spectator mode og view/session transitions | `session-policy`, `module-routing`, persistence, rendering callbacks | Ikke flytt remote sync hit |
| `app/ui/app-renderer.js` | Sentral `render()`-orkestrering og role visibility | State getter, elements, alle renderer-callbacks, language/theme | Skal ikke mutere tournament state bortsett fra eksisterende språk-/court-lokalisering |

### Høy risiko – tas sist

| Foreslått fil | Ansvar | Avhengigheter | Risiko |
|---|---|---|---|
| `app/remote/remote-state-controller.js` | `applyRemoteState`, conflict handling, sanitize og remote notices | state setter, migration, persistence, realtime, profile history | Revisjon, tokens, pending writes og realtime kan endres utilsiktet |
| `app/remote/remote-sync-controller.js` | queue/retry/flush og sync metadata | timers, `remote-state-write`, remote RPC, navigator, persistence | Rekkefølge og idempotens må verifiseres |
| `app/player/session-actions.js` | join/leave/replace/availability | player-state, session-policy, profile, remote/local persistence | Rolle- og retention-regler ligger i samme flyt |
| `app/tournament/tournament-actions.js` | `activateRound`, end tournament og settings orchestration | tournament-runtime/status, retention, event log, persistence | Påvirker hele kamp- og retention-flyten |
| `app/bootstrap/test-api.js` | Samle `window.PadelstarTest`-eksportene | Offentlige wrappers fra app.js | Må ikke endre test-API uten eksplisitt migrering |

## 5. Mutable state som bør bli i `app.js` først

Første refaktorering bør la følgende bli i composition root, fordi de deles på tvers av flere moduler eller må kunne byttes atomisk:

- `state` og `profile`.
- `defaultTournament` og `elements`-referansen, inntil registry-modulen er testet i isolasjon.
- `supabaseClient` og `supabaseClientActivated`.
- Remote-køens timers/sekvens: `remoteSaveTimer`, `remoteRetryTimer`, `remoteRetryAttempt`, `remoteWriteChain`, `remoteMutationSequence`, `lastRemotePersistedSequence`, `isApplyingRemoteState`, `remoteConflict`.
- Pending sync: `pendingAdminSync`, `pendingPlayerScores`, `syncLastAttemptAt`, `syncLastError`, `recoveredFromLastGood`.
- Aktiv UI/session: `activeModule`, `spectatorMode`, `tvMode`, `spectatorPreviousRole`, `localLeftPlayerId`, `largeScoreMatchId`, `pendingSetScoreMatchId`, `matchFilters`.
- `wrappedScorecardPlayersFrame` og andre render-scheduler-flagg som må koordineres med én render-loop.

Disse kan senere samles i et eksplisitt `appContext`, men det bør ikke gjøres samtidig med første modul-flytting. Moduler skal få getters/setters eller callbacks, ikke direkte tilgang til globale variabler.

## 6. Områder som skal flyttes senere

Følgende skal ikke være første refaktorering:

- `applyRemoteState` og all konflikt-/retry-håndtering.
- `render()` før alle under-renderere har eksplisitte, testede API-er.
- Kampstart, scoring, undo, walkover og retention.
- `activateSupabaseClient`, auth state-change og realtime-kobling.
- `migrateState`, `migrateMatch` og legacy localStorage før backward-compatibility fixtures finnes.
- Event-bindinger som endrer både state, URL, rolle og remote state i samme handler.

## 7. Verifiserbar gjennomføringsrekkefølge

1. **Baseline:** dokumenter commit, linjeinventar og kjør `npm test`, `npm run check:syntax`, `git diff --check` og lokal browser smoke.
2. **Konfigurasjon:** flytt storage keys og Supabase config reader. Test at alle referanser og cache-busting-paths fortsatt løses.
3. **Pure helpers:** flytt utilities. Legg til isolerte tester for escaping, invite-code-format og slugify.
4. **DOM registry:** flytt `elements`. Verifiser at alle aktive HTML-id-er finnes og at appen laster uten console-feil.
5. **Meta/theme:** flytt service-worker-registrering, copyright og theme. Verifiser PWA-/cache-testene.
6. **Events:** samle resterende direkte listeners i én bootstrap-eventmodul. Verifiser keyboard, drawer, språk, dialoger, forms og navigation.
7. **Init:** flytt init-orkestrering. Verifiser scriptrekkefølge, initial URL/session restore og første render.
8. **Language:** flytt språk-controller. Verifiser device/manual språk, fallback, profile sync og at delt state ikke får språkfelt.
9. **Renderer:** flytt sentral `render()` etter at callback-grensene er stabile. Verifiser alle roller, admin-tabs, TV Mode, scorecard og responsive viewports.
10. **Session/player:** flytt leave/join/availability og existing-player-flow. Verifiser lokal, spectator og remote rolleflyt.
11. **Remote:** flytt remote-state og remote-sync kontroller. Verifiser revision/conflict, offline-kø, reconnect, tokenbinding og RPC-kontrakter.
12. **Sluttkontroll:** fjern kun wrappers uten referanser, oppdater HTML service worker, tester og dokumentasjon, og mål at `app.js` kun er composition root.

### Fersk gjennomføringsstatus

- **Baseline, 2026-09-04:** `npm test` passerte med 187 tester og 1 forventet live-Supabase-skip; `npm run check:syntax` og `git diff --check` passerte. Lokal browser-smoke lastet landing og aktiv workspace. Den eneste console-feilen var lokal 404 for `/_vercel/insights/script.js`, som ikke er en app-modulfeil.
- **Fase 2, 2026-09-04:** storage-nøkler er flyttet til `app/config/storage-keys.js`, og Supabase-config-lesing er flyttet til `app/config/supabase-config.js`. HTML- og service-worker-referanser er oppdatert, og `package.json` sin syntakssjekk dekker nå også underkataloger.
- **Fase 2-verifikasjon:** isolerte config-tester, full testpakke (189 bestått, 1 forventet live-skip), full syntakssjekk og `git diff --check` passerte. Begge nye scriptressurser svarte HTTP 200 lokalt, og nettleseren bekreftet at storage-registry og Supabase-config-globalen var tilgjengelige etter reload.
- **Gjenværende fase 2-arbeid:** ingen kjent kodeendring mangler i denne grensen. Live Supabase-flyt er fortsatt ikke kjørt fordi den eksplisitte live-testen krever `PADELSTAR_LIVE_SUPABASE=1` og et tilgjengelig verifiseringsmiljø.
- **Fase 3, 2026-09-04:** `escapeHtml`, `escapeAttribute`, `appendEmptyText`, `createInviteCode` og `slugify` er flyttet til `app/core/utilities.js` med eksplisitt dokument- og random-avhengighet. HTML, service worker og testharness er oppdatert.
- **Fase 3-verifikasjon:** isolerte utility-tester og full testpakke passerte med 192 beståtte tester og 1 forventet live-Supabase-skip. Full syntakssjekk, `git diff --check`, lokal HTTP 200 for utility-scriptet og nettleser-reload med synlig landing er kontrollert. Den eneste console-feilen er fortsatt lokal 404 for `/_vercel/insights/script.js`.
- **Fase 4, 2026-09-04:** `elements`-registry er flyttet til `app/bootstrap/dom-elements.js` med injisert `document`. HTML og service worker er oppdatert, og `app.js` beholder kun composition-root-kallet.
- **Fase 4-verifikasjon:** DOM-registry-testen bekrefter 145 unike oppslag og immutable resultat. Full testpakke passerte med 193 beståtte tester og 1 forventet live-Supabase-skip, i tillegg til full syntakssjekk og `git diff --check`. Nettleser-reload viste landing uten app-feil; eneste console-feil er lokal 404 for `/_vercel/insights/script.js`.
- **Fase 5, 2026-09-04:** service-worker-registrering/copyright er flyttet til `app/bootstrap/app-meta.js`, og classic theme + `theme-color` er flyttet til `app/ui/theme.js`. HTML- og service-worker-referanser er oppdatert.
- **Fase 5-verifikasjon:** isolerte meta/theme-tester og full testpakke passerte med 195 beståtte tester og 1 forventet live-Supabase-skip. Full syntakssjekk, `git diff --check` og browser-reload passerte; ekte nettleser viste `classic` theme, copyright `2026`, landing og 145 registry-elementer. Eneste console-feil er lokal 404 for `/_vercel/insights/script.js`.
- **Fase 6, 2026-09-04:** de resterende direkte kontroll-listenerne fra `initializeApp()` er samlet i `app/bootstrap/app-events.js`. Callback-logikken er fortsatt injisert fra `app.js`, mens eksisterende domain-event-moduler og globale/realtime-listeners er beholdt.
- **Fase 6-verifikasjon:** egen bootstrap-event-test bekrefter 18 bindinger til eksplisitte callbacks. Full testpakke passerte med 197 beståtte tester og 1 forventet live-Supabase-skip, samt full syntakssjekk og `git diff --check`. Browser-reload viste landing, `PadelstarBootstrapEvents` og classic theme uten app-feil; eneste console-feil er lokal 404 for `/_vercel/insights/script.js`.
- **Fase 7, 2026-09-04:** startup-orkestreringen er flyttet til `app/bootstrap/app-init.js`. `app.js` beholder eksplisitte callback-adaptere og mutable state, mens init-modulen kun styrer den dokumenterte rekkefølgen.
- **Fase 7-verifikasjon:** sekvens-testen bekrefter alle 23 init-steg i riktig rekkefølge. Full testpakke passerte med 199 beståtte tester og 1 forventet live-Supabase-skip, samt full syntakssjekk og `git diff --check`. Browser-reload viste landing med `PadelstarAppInit`, `PadelstarBootstrapEvents` og classic theme tilgjengelig; eneste console-feil er lokal 404 for `/_vercel/insights/script.js`.
- **Fase 8, 2026-09-04:** språkorkestreringen er flyttet til `app/core/language-controller.js`. `app.js` bruker nå controlleren for lasting, oversettelsesadapter, apply/sync og manuell/device-endring, mens `app/i18n-ui.js` beholder DOM-oppdateringene.
- **Fase 8-verifikasjon:** controller-testene dekker fallback/mode, apply-rekkefølge og manuell endring med profil-sync. Full testpakke passerte med 203 beståtte tester og 1 forventet live-Supabase-skip (204 totalt), full syntakssjekk og `git diff --check`. Browser verifiserte reload, tilgjengelig controller, norsk initialvisning og faktisk bytte til engelsk med oppdatert heading; eneste console-feil er lokal 404 for `/_vercel/insights/script.js`.
- **Fase 9, 2026-09-04:** sentral `render()`-orkestrering er flyttet til `app/ui/app-renderer.js`. `app.js` beholder kun composition-root-adapteren, mens renderer-modulen mottar state, DOM og eksplisitte render-callbacks.
- **Fase 9-verifikasjon:** rendererens test-mode-isolasjon og callback-grense er testet. Fokuserte tester passerte med 129/129, full syntax- og diff-sjekk passerer, og browser reload viste aktiv `PadelstarAppRenderer`, `PadelstarAppInit` og fungerende oversatt UI. Språkvalg ble bekreftet persistert på tvers av reload; eneste console-feil er lokal 404 for `/_vercel/insights/script.js`.
- **Fase 10, 2026-09-04:** join, leave, spectator-leave og existing-player-oppslag er flyttet til `app/core/session-controller.js`. Underliggende spillerstate og availability beholdes i de eksisterende player-modulene.
- **Fase 10-verifikasjon:** fokuserte app-/PWA-/session-tester passerte med 130/130, full testpakke passerte med 207 beståtte tester og 1 forventet live-Supabase-skip (208 totalt), samt full syntakssjekk og `git diff --check`. Eksisterende local/admin/spectator-leave-regresjoner passerer i app-harnesset.
- **Remote state-delgrense, 2026-09-04:** `applyRemoteState` og konfliktmarkering er flyttet til `app/core/remote-state-controller.js`. Appens eksisterende remote-tournament/RPC-moduler bruker fortsatt samme callback-kontrakt.
- **Remote state-verifikasjon:** isolert test bekrefter stale-revisjon, RPC-oppdatering og bevaring av selected player, admin-token, player-token og owner-identitet. Fokuserte tester passerte med 131/131, full testpakke med 209 beståtte tester og 1 forventet live-Supabase-skip (210 totalt), syntax/diff passerte, og browser reload viste aktiv remote-state-controller. Live Supabase er fortsatt ikke verifisert uten eksplisitt live-miljø.
- **Remote sync-delgrense, 2026-09-04:** debounce, skrivekø, retry/backoff og pending-write flush er flyttet til `app/core/remote-sync-controller.js`. RPC- og scorekø-modulene beholder sine eksisterende API-er.
- **Remote sync-verifikasjon:** isolert sync-test bekrefter 350 ms debounce og sekvensjustering ved flush. Full testpakke passerte med 211 beståtte tester og 1 forventet live-Supabase-skip (212 totalt), syntax/diff passerte, og browser viste aktiv state- og sync-controller i desktop/tablet/mobil-størrelser. Live Supabase/Auth/RPC/Realtime er fortsatt ikke verifisert uten eksplisitt live-miljø.
- **Fase A-sluttkontroll, 2026-09-04:** legacy remote/session-fallbacker er fjernet fra `app.js`; branchens nye grenser er lastet fra HTML/service worker. Full testpakke passerte 212/212 uten feil (211 bestått, 1 forventet live-skip), browser verifiserte desktop og mobil uten horisontal overflow, og `git diff --check`/syntax passerer. Fase A er dermed lukket med live Supabase som eksplisitt miljøbegrensning.

Hver fase skal stoppe ved første regresjon. Det er ikke tillatt å gå videre basert på statiske mønstre alene dersom den berørte brukerflyten ikke også er kjørt.

Fase B-notat 2026-09-04: sikkerhetshardening og synkronisering av manuell schema-artifakt er implementert på commit `e10f5ae`. Autoritativ Standard security scan `132d1370-5afa-4a20-ba22-4f349af7e4d9` er fullført med komplett dekning og 0 reportable funn. Live Supabase-kontrakttest bestod, og samlet testpakke passerer 215/215 når live-testen aktiveres. Fase B er lukket; eneste scanbegrensning er at separat produksjonskonfigurasjon ikke ble lest.

Fase C-notat 2026-09-04: ny regresjonsverifisering etter Fase A/B bestod på desktop 1440, medium 768 og mobil 390 med opprettelse, start, adminnavigasjon, kampvisning og overflow-kontroll. En feilaktig desktop-assertion som krevde lik bredde på to-kolonne setup-panel og skjema er korrigert til å kontrollere at skjemaet holder seg innenfor panelet. Målrettet browser-gjennomgang bekreftet også engelsk språkbytte, oversatte feature-kort, mobilmeny og Escape-lukking.

## 8. Akseptansekriterier for selve refaktoreringen

- Hver flyttet enhet har én tydelig `window.Padelstar...`-grense og eksplisitte avhengigheter.
- Ingen ny modul leser `localStorage`, DOM eller global state uten at dette er en del av modulens dokumenterte ansvar.
- Ingen aktiv HTML-/service-worker-referanse peker på en manglende eller arkivert fil.
- Alle eksisterende tester består, og nye tester dekker selve grensen – ikke bare at filen eksisterer.
- Lokal runtime er verifisert etter hver grense på desktop, tablet og mobil.
- Live Supabase/Auth/RPC/Realtime/push verifiseres separat og omtales som uverifisert når miljøet ikke er tilgjengelig.
- Ingen endring i observerbar funksjon, språkvalg, roller, tokenhåndtering, retention eller Supabase-kontrakt.
