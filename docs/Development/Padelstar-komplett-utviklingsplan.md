# Padelstar – komplett utviklingsplan

**Sist oppdatert:** 2026-09-04
**Status:** Masterplan
**Formål:** Samle eksisterende forbedringsarbeid og planlagte funksjoner i én prioritert utviklingsplan for Padelstar. Nåstatusen nedenfor overstyrer eldre formuleringer om hva som fortsatt bare er planlagt.

---

# 1. Målbilde

Padelstar skal utvikles til en moderne, mobilvennlig og installérbar turneringsapp for padel, med særlig fokus på:

- enkel opprettelse og deltakelse
- minst mulig administrasjon under aktiv turnering
- tydelig informasjon til hver enkelt spiller
- robust turneringslogikk
- fleksibel støtte for flere turneringsformer
- sanntidsoppdatering mellom enheter
- valgfri spillerkonto og påkrevd admininnlogging
- historikk og statistikk
- TV-/storskjermvisning
- en databasearkitektur som er klar for kommende funksjoner
- PWA-installasjon på desktop og mobile enheter

Hovedmålet skal være:

> **En admin skal i størst mulig grad kunne delta i turneringen selv uten å måtte administrere turneringen manuelt mellom hver kamp.**

---

# 2. Nåstatus etter branch-gjennomgang

Arbeidskopien på `codex/padelstar-ui-refresh` er en 0.5 Beta-baseline:

| Område | Status | Grunnlag |
|---|---|---|
| Kjerneflyt | Implementert | Opprett, join/QR, admin, spiller, tilskuer, scoring og avslutning er koblet i `index.html` og app-modulene. |
| Turneringsformater | Implementert lokalt | Round-robin, cup, Americano, lag-Americano, Mexicano, lag-Mexicano, Kongen av banen og gruppespill/sluttspill har motor- og kontrakttester. |
| Historikk og analyse | Implementert lokalt | Historikkberegning har egen modulgrense i `app/profile-history.js`. Spillerstatistikk, partner/head-to-head, sesongoppsummering og lokal rating/insight-beregning er testet. Vedvarende ratingdatabase og liga er ikke implementert. |
| Konto og profil | Implementert lokalt | Supabase Auth med passord, profiler, eierkobling og forsinket sletting er testet. Live Auth-flyt må verifiseres mot miljøet. |
| Live og sikkerhet | Implementert med produksjonsavhengig verifikasjon | RLS/RPC, tokenbinding, revisjon, rate limiting, realtime/reconnect og push-kontrakter er statisk/testmessig dekket; live-testen er forventet hoppet over lokalt. |
| PWA og offline | Implementert lokalt | Manifest, service worker, installasjonsfallback, recovery, IndexedDB-speiling og sync-kø er koblet inn og testet. |
| UI og responsivitet | Implementert lokalt | Felles blå scorecard-design, fullbredde setup/workspace, TV Mode, hamburger/drawer, språkvelger og CSS-konsolidering er kontrollert i kode/tester. Browser-smoke gjenstår når Playwright er tilgjengelig. |
| Produksjon | Delvis verifisert | Statisk hosting- og deploykonfigurasjon finnes, men ny deploy, live flerklientflyt og produksjonscache er ikke verifisert i denne arbeidsøkten. |

Funksjonsdetaljer og brukerflyt ligger i [app_flow.md](../app_flow.md). Kronologiske endringer og verifikasjonsgrenser ligger i [documentation.md](../documentation.md).

# 3. Viktige føringer

## 2.1 Dagens visuelle uttrykk skal beholdes

Planen skal ikke starte et nytt, konkurrerende visuelt redesign. Branchen har allerede gjennomført en konsolidert UI-/designoppdatering; videre arbeid skal bygge videre på denne baseline.

Gjeldende visuelle baseline skal videreføres:

- mørk marineblå hovedflate
- kjølige blå kontrastflater og kanter
- eksisterende logoer
- eksisterende typografi
- dagens kortstil
- eksisterende ikonstil
- nåværende spacing- og scorecard-komponentretning
- eksisterende merkevareuttrykk

Forbedringer skal primært gjøres innen:

- informasjonsarkitektur
- navigasjon
- modulstruktur
- funksjonsflyt
- turneringslogikk
- adminopplevelse
- spilleropplevelse
- datamodell
- robusthet
- responsivitet
- tilgjengelighet

Eksisterende designsystem bør brukes på nye komponenter.

Les og referer til disse filene under utviklingen:
   docs/Development/padelstar_funksjonalitet_forbedringer.md
   docs/Development/padelstar-pwa-installasjon-implementering.md
   docs/Development/Padelstar_brukerprofiler_og_innlogging.docx
   docs/Development/development_plan.md (dersom denne kolliderer med en av de andre, ikke bruk denne)

   Nye assets: docs/Development/New assets

Oppdater relevante dokumenteringsfiler til denne nye retningen.
---

# 4. Overordnet prioritering

Utviklingen anbefales gjennomført i følgende rekkefølge:

## Fase 1 – stabilisering og fundament

1. Forbedre eksisterende apputkast
2. Brukerprofiler og innlogging
3. Installerbar webapp / PWA
4. Databaseforberedelser og migrering
5. Dynamisk navigasjon og forenklet adminstruktur

## Fase 2 – ny turneringsmotor

6. Tournament State Machine
7. Ny Round Robin-logikk
8. Pause-/bye-logikk
9. Kampkø og automatisk banetildeling
10. Personlig «Min neste kamp»

## Fase 3 – kampflyt og livebruk

11. Court Queue
12. Resultatregistrering for spillere
13. Resultatkontroll og konflikthåndtering
14. Hendelseslogg og Undo
15. Spillerbytte under aktiv turnering
16. TV Mode som erstatter dagens Spectator View, se docs/Development/TV-mode forslag til layout.png for forslag til visuell layout.

## Fase 4 – historikk og statistikk

17. Turneringshistorikk
18. Spillerhistorikk
19. Spillerstatistikk
20. Partnerstatistikk
21. Head-to-head

## Fase 5 – flere turneringsformer

22. Americano
23. Lag-Americano
24. Mexicano
25. Lag-Mexicano
26. Kongen av banen
27. Cup / utslagsturnering
28. Gruppespill + sluttspill

## Fase 6 – videre plattformfunksjoner

29. Rating / Elo
30. Ligaer og sesonger
31. Varslinger
32. Tournament Assistant
33. Videre automatisering og analyser

---

# 4. Fase 1 – forbedre eksisterende apputkast

Dette arbeidet skal gjennomføres før større nye funksjoner introduseres.
Se docs/Development/Padelstar-komplett-utviklingsplan.md
---

## 4.1 En-sides app / modulbasert visning

Padelstar skal fungere som en SPA der kun relevante moduler er synlige.

Forslag til hovedmoduler:

- Landing
- Opprett turnering
- Bli med
- Aktiv turnering – admin
- Aktiv turnering – spiller
- TV Mode
- Historikk
- Profil
- Innstillinger

Kun aktiv modul skal være synlig og ta plass i layouten.

---

## 4.2 Landing

Landing vises når ingen turnering er aktiv.

Primære handlinger:

- **Opprett turnering**
- **Bli med**

Sekundært:

- eventuelt installer app
- historikk dersom innlogget
- profil dersom innlogget

---

## 4.3 Opprett turnering

Admin skal kunne konfigurere:

- turneringsnavn
- turneringsmodus
- antall baner
- banenavn
- antall spillere
- poeng-/scoringsregler
- antall runder
- eventuelle pauser
- språk
- øvrige modusspesifikke innstillinger

Turneringen opprettes først som `draft`.

---

## 4.4 Bli med

Spiller skal kunne bli med via:

- QR-kode
- direkte lenke
- turneringskode

QR finnes allerede og skal derfor **ikke bygges på nytt før den er evaluert**.

### QR-gjennomgang

Eksisterende QR-funksjon skal testes for:

- riktig direktekobling til turneringen
- automatisk utfylling av turneringskode
- mobilvennlighet
- utløpte eller avsluttede turneringer
- ugyldige koder
- sikkerhet
- dobbelregistrering av samme spiller
- åpning fra installert PWA
- åpning fra vanlig nettleser

Hvis dagens løsning fungerer godt, beholdes den.

---

# 5. Resultatregistrering

Alle spillere skal kunne registrere resultat i sin egen aktive kamp.

## Tilgang

### Spiller

Kan:

- åpne egen aktive kamp
- skrive inn resultat
- sende inn resultat

Kan ikke:

- endre andre kamper
- endre turneringsoppsett
- endre andre spilleres data

### Admin

Kan:

- registrere alle resultater
- korrigere resultater
- bekrefte konflikter
- gjenåpne kamp
- overstyre feilregistreringer

---

# 6. Baner og banenavn

Admin skal kunne opprette egne navn på banene.

Eksempel:

```text
Bane 1 – Schala & Partners
Bane 2 – Ringnes
Bane 3 – Pepsi
Bane 4 – Adidas
```

Banenavn skal vises i:

- kampkort
- Min neste kamp
- Court Queue
- adminoversikt
- TV Mode
- varslinger

---

# 7. Brukerprofiler og innlogging

## 7.1 Prinsipp

### Spiller

Innlogging er valgfritt.

Spilleren skal kunne delta som gjest.

Beslutning: Gjestedeltakere skal kun eksistere i turneringens aktive/live state. Når admin avslutter turneringen, skal gjestens spilleridentitet, statistikk, kamp- og annen historikk fjernes fra lagret turneringsstate. Registrerte spillere med koblet profil og admin-deltakeren kan beholde historikk og statistikk.

### Admin

Innlogging er påkrevd.

Dette gjør det mulig å:

- knytte turneringer til riktig eier
- administrere turnering fra flere enheter
- lagre historikk
- hente tidligere turneringer
- utvikle rating og liga senere
- redusere risiko for uautorisert administrasjon

---

## 7.2 Profilstruktur

Forslag:

```text
profiles
- id
- auth_user_id
- display_name
- avatar_url
- preferred_language
- created_at
- updated_at
```

---

## 7.3 Turneringsdeltaker

Innlogget spiller og gjest skal bruke samme turneringsstruktur.

```text
tournament_players
- id
- tournament_id
- profile_id nullable
- display_name
- player_status
- joined_at
- left_at
```

Dermed kan:

- en gjest senere opprette konto
- historikk senere kobles til profil
- turneringsmotoren være uavhengig av autentisering

---

# 8. Installerbar webapp / PWA

Padelstar skal kunne installeres som webapp.

Støtte bør testes for:

- Windows
- macOS
- Android
- iPhone
- iPad

---

## 8.1 Teknisk grunnlag

Appen skal ha:

```text
manifest.webmanifest
service-worker.js
icons/
```

Manifest bør minimum inneholde:

```text
name
short_name
start_url
display
background_color
theme_color
icons
```

---

## 8.2 Installering

Når plattformen støtter direkte installasjon, kan Padelstar vise:

```text
Installer Padelstar
```

Funksjonen skal være diskret og følge eksisterende design.

---

## 8.3 Oppdateringsflyt

Når ny frontend-versjon er tilgjengelig:

```text
Ny versjon av Padelstar er tilgjengelig.

[Oppdater]
```

Dette er viktig for å unngå at turneringsdeltakere bruker forskjellige frontend-versjoner samtidig.

---

## 8.4 Offline-strategi

Padelstar bør ikke late som aktive turneringer fungerer fullt offline dersom de er avhengige av Supabase.

Offline bør primært støtte:

- app-shell
- logoer
- statiske ressurser
- tydelig beskjed ved mistet forbindelse

Eksempel:

```text
Du er frakoblet.

Resultater synkroniseres når forbindelsen er tilbake.
```

Eventuell offline resultatkø bør behandles som en senere funksjon.

---

# 9. Database – fundament for kommende funksjoner

Databasen bør klargjøres tidlig for:

- nye turneringsformer
- historikk
- spillerprofiler
- rating
- ligaer
- statistikk
- kampstatus
- resultatkonflikter
- spillerbytter
- TV Mode
- hendelseslogg

Viktig turneringsinformasjon bør ikke ligge kun i store JSON-objekter dersom dataene skal kunne analyseres senere.

---

# 10. Foreslått datamodell

## 10.1 tournaments

```text
id
owner_user_id
name
tournament_mode
status
language
created_at
started_at
completed_at
settings_json
```

Mulige statuser:

```text
draft
registration
ready
active
paused
completed
cancelled
```

---

## 10.2 tournament_players

```text
id
tournament_id
profile_id nullable
display_name
player_status
joined_at
left_at
seed nullable
rating_before nullable
rating_after nullable
```

---

## 10.3 courts

```text
id
tournament_id
number
name
status
sort_order
```

---

## 10.4 rounds

```text
id
tournament_id
round_number
status
created_at
started_at
completed_at
```

---

## 10.5 teams

```text
id
tournament_id
round_id nullable
team_number
persistent_team boolean
```

---

## 10.6 team_players

```text
team_id
tournament_player_id
```

---

## 10.7 matches

```text
id
tournament_id
round_id nullable
court_id nullable
team_a_id
team_b_id
status
queue_position
started_at
completed_at
```

---

## 10.8 match_scores

```text
id
match_id
team_a_score
team_b_score
submitted_by
submission_type
status
created_at
confirmed_at
```

---

## 10.9 tournament_events

Denne tabellen legger grunnlaget for hendelseslogg og Undo.

```text
id
tournament_id
event_type
actor_id
entity_type
entity_id
payload_json
created_at
```

---

## 10.10 tournament_modes

Kan enten være kodebasert eller konfigurerbar tabell.

Minimum identifikatorer:

```text
round_robin
americano
team_americano
mexicano
team_mexicano
king_of_court
knockout
groups_playoffs
```

---

# 11. Databaseindekser og integritet

Legg tidlig inn relevante indekser på:

```text
tournament_id
profile_id
round_id
court_id
status
created_at
```

Bruk foreign keys mellom sentrale tabeller.

Kritisk data bør ikke slettes fysisk uten god grunn.

Vurder `archived_at` eller soft delete for historikkdata.

---

# 12. Supabase og tilgangskontroll

RLS bør brukes der det er relevant.

Prinsipp:

### Admin

Kan skrive til turneringer brukeren eier.

### Spiller

Kan lese aktiv turnering som vedkommende deltar i og registrere score i egne kamper.

### TV Mode

Skal ha kun nødvendig read-only tilgang.

### Gjester

Må få begrenset tilgang gjennom turneringskontekst/token, ikke generell skrivetilgang til databasen.

---

# 13. Dynamisk hovedmeny

Dagens meny bør gjøres mer kontekstavhengig.

Målet er å unngå en statisk meny med mange valg som ikke er relevante.

---

## 13.1 Alltid synlig

Menyen bør alltid kunne vise:

- Hjem
- aktiv funksjon
- språk
- eventuell profil / konto
- eventuell overflow-meny

---

## 13.2 Eksempel – ingen aktiv turnering

```text
Hjem
Opprett
Bli med
Språk
Profil
```

---

## 13.3 Eksempel – spiller i aktiv turnering

```text
Hjem
Min kamp
Turnering
Språk
⋯
```

---

## 13.4 Eksempel – admin i aktiv turnering

```text
Hjem
Turnering
Admin
Språk
⋯
```

---

## 13.5 Aktiv funksjon

Den funksjonen brukeren befinner seg i skal være tydelig markert.

Unødvendige menypunkter skjules.

Dette gir:

- mindre visuelt rot
- bedre mobilopplevelse
- enklere navigasjon
- mindre behov for ekstra faner

---

# 14. Forenklet Admin View

Adminområdet trenger ikke nødvendigvis fire eller flere separate faner.

Målet bør være en mer operativ **kontrollflate**.

---

## 14.1 Forslag til struktur

### Turnering

Vis:

- turneringsstatus
- runde
- fremdrift
- aktive kamper
- neste kamper
- baneoversikt

### Spillere

Vis:

- deltakere
- status
- pauser
- bytte/fjern spiller

### Resultater

Vis:

- nylige resultater
- konflikter
- korrigering

### Innstillinger

Mindre brukte funksjoner kan ligge under:

```text
⋯ Mer
```

eller i et panel/dialog.

---

## 14.2 Admin-dashboard

Eksempel:

```text
VEGVESENET PADEL

Runde 3 av 6

8 / 12 kamper ferdige

2 aktive
2 klare

--------------------------------

Bane 1
PÅGÅR

Bane 2
PÅGÅR

Bane 3
NESTE

--------------------------------

[Neste handling]
[Spillere]
[Resultater]
[⋯]
```

Admin skal ikke måtte navigere mellom mange faner for vanlige handlinger.

---

# 15. Tournament State Machine

Turneringen skal være styrt av eksplisitte tilstander.

---

## 15.1 Turneringsstatus

```text
draft
registration
ready
active
paused
completed
cancelled
```

---

## 15.2 Rundestatus

```text
scheduled
active
completed
```

---

## 15.3 Kampstatus

```text
scheduled
ready
active
completed
cancelled
```

Normal flyt:

```text
scheduled
   ↓
ready
   ↓
active
   ↓
completed
```

---

# 16. Hvorfor State Machine er viktig

Den gjør det mulig å automatisere:

- neste kamp
- banetildeling
- varslinger
- TV Mode
- spillerens aktive visning
- fremdriftsindikator
- resultatkontroll
- avslutning av runde
- start av ny runde

UI skal lese status fra turneringsmotoren i stedet for å gjette status fra enkeltfelter.

---

# 17. Scheduler som separat modul

Scheduler bør være en egen logisk komponent.

Den skal ha ansvar for:

- laggenerering
- kampgenerering
- partnerhistorikk
- motstanderhistorikk
- pausefordeling
- banetildeling
- kampkø
- neste mulige kamp
- modusspesifikke regler

UI skal ikke inneholde turneringsalgoritmene.

---

# 18. Ny Round Robin-logikk

Dagens randomisering per kamp skal erstattes.

## Prinsipp

En runde oppretter lag med to spillere.

Eksempel:

```text
Runde 1

Lag A
Sigurd + Anders

Lag B
Thomas + Henrik

Lag C
Jonas + Martin

Lag D
Espen + Lars
```

Lagene beholdes gjennom hele runden.

Alle relevante lag møter hverandre før nye partnerkombinasjoner opprettes.

---

# 19. Generering av nye lag

Ved ny runde skal algoritmen prioritere:

1. færrest gjentatte partnere
2. færrest gjentatte motstandere
3. likt antall kamper
4. likt antall pauser
5. minst mulig lang ventetid
6. tilfeldig valg kun mellom løsninger med omtrent samme kvalitet

---

# 20. Partnerhistorikk

Systemet bør registrere:

```text
player_a
player_b
times_as_partners
```

og bruke dette i scoring av nye kombinasjoner.

---

# 21. Motstanderhistorikk

Systemet bør også vite hvor ofte spillere har møtt hverandre.

Dette kan brukes som sekundær optimalisering.

Partnerduplikater bør normalt straffes hardere enn gjentatte motstandere.

---

# 22. Pause-/bye-logikk

For deltakerantall som ikke passer perfekt med antall baner skal scheduler kontrollere pauser.

Regel:

> Ingen spiller bør få sin andre pause før alle andre har hatt minst én pause, så langt turneringsstrukturen tillater det.

Systemet bør registrere:

```text
matches_played
bye_count
last_played_round
consecutive_matches
```

---

# 23. Hvilebalanse

Scheduler bør forsøke å unngå:

- samme spiller i mange kamper på rad
- samme spiller med mange pauser
- svært ujevn kampmengde

Dette bør være en optimalisering, ikke en absolutt regel dersom turneringsformatet gjør det umulig.

---

# 24. Automatisk kampkø

Matcher som kan spilles skal settes i kø.

Eksempel:

```text
Bane 1
Pågår: Kamp 8
Neste: Kamp 11
Deretter: Kamp 13

Bane 2
Pågår: Kamp 9
Neste: Kamp 10
Deretter: Kamp 14
```

---

# 25. Automatisk banetildeling

Når en bane blir ledig:

1. fullført kamp markeres `completed`
2. banen markeres ledig
3. scheduler finner neste spillbare kamp
4. kampen tildeles banen
5. kampen settes `ready`
6. relevante spillergrensesnitt oppdateres

Dette reduserer behovet for manuell styring.

---

# 26. «Min neste kamp»

Player View skal prioritere spillerens egen situasjon.

Eksempel:

```text
MIN NESTE KAMP

Bane 2 – Ringnes

Sigurd + Anders
vs
Thomas + Henrik

Neste på banen
```

---

## 26.1 Spillerstatus

Mulige visninger:

```text
Spiller nå
Neste
2 kamper igjen
Pause
Ferdig for i dag
```

Dette bør være mer fremtredende enn hele turneringsoversikten.

---

# 27. Mine kamper

Under hovedkortet kan spilleren se:

```text
✓ Kamp 1    21–18
✓ Kamp 2    17–21
▶ Kamp 3    Neste
○ Kamp 4
○ Kamp 5
```

---

# 28. Court Queue

Court Queue skal gi en tydelig banevisning.

Eksempel:

```text
BANE 2 – RINGNES

PÅGÅR
Sigurd / Henrik
vs
Anders / Thomas

----------------

NESTE
Jonas / Lars
vs
Martin / Espen

----------------

DERETTER
Magnus / Ole
vs
Per / Daniel
```

Court Queue kan vises i:

- admin
- spilleroversikt
- TV Mode

---

# 29. Resultatkonflikter

Når flere spillere kan registrere score, må samtidige innsendinger håndteres.

Eksempel:

```text
Registrering A
21–17

Registrering B
21–18
```

Systemet skal ikke automatisk overskrive resultatet.

Kampen får status:

```text
score_conflict
```

Admin kan velge korrekt resultat.

Alternativt kan resultat bekreftes hvis begge sider registrerer identisk score.

---

# 30. Resultatredigering

Admin skal kunne:

- endre score
- se tidligere score
- se hvem som registrerte
- se tidspunkt
- gjenåpne kamp
- lagre korrigert resultat

Historikken skal beholdes.

---

# 31. Hendelseslogg

Alle viktige turneringshandlinger bør logges.

Eksempel:

```text
14:22 Kamp 14 startet
14:31 Henrik registrerte 21–17
14:32 Kamp 14 ble avsluttet
14:34 Admin endret resultat til 21–18
```

---

# 32. Undo

Admin bør kunne angre relevante handlinger.

Eksempel:

```text
[Angre siste handling]
```

Undo skal helst implementeres gjennom reverserbare hendelser, ikke ved tilfeldig overskriving av databasefelt.

Handlinger som bør kunne angres:

- scoreendring
- feilaktig kampavslutning
- banetildeling
- spillerbytte
- kampstatus

---

# 33. Spillerbytte under aktiv turnering

Admin skal kunne erstatte en spiller.

Eksempel:

```text
Thomas
↓
Erstatt med
Magnus
```

Mulige strategier:

### Overtar plass

Ny spiller overtar den opprinnelige spillerens fremtidige kamper.

### Ny spiller

Historikken beholdes separat fra byttetidspunktet.

Valg bør lagres eksplisitt.

---

# 34. Spiller forlater turneringen

Systemet må håndtere:

- spiller trekker seg
- skade
- må gå tidlig
- diskvalifikasjon

Scheduler skal kunne regenerere resterende kamper uten å ødelegge historiske resultater.

---

# 35. TV Mode

Dagens **Spectator View skal videreutvikles og erstattes av TV Mode**.

TV Mode skal være laget for:

- TV
- prosjektor
- stor skjerm
- nettbrett i kiosk
- skjerm i padelhall

se "docs/Development/TV-mode forslag til layout.png" for forslag til visuell layout.

---

## 35.1 TV Mode – livevisning

Vis:

```text
BANE 1
Sigurd / Anders
14 – 12
Thomas / Henrik

BANE 2
Jonas / Martin
21 – 18
Espen / Lars
```

---

## 35.2 Neste kamper

TV Mode skal kunne vise:

```text
NESTE PÅ BANE 1

Sigurd / Thomas
vs
Anders / Jonas
```

---

## 35.3 Ranking

TV Mode skal kunne vise leaderboard dersom turneringsmodus bruker ranking.

Eksempel:

```text
1. Sigurd       84
2. Anders       79
3. Thomas       75
4. Jonas        71
```

---

## 35.4 Automatisk rotasjon

TV Mode kan rotere mellom:

1. aktive kamper
2. neste kamper
3. ranking
4. turneringsstatus

Rotasjon bør kunne slås av/på.

---

## 35.5 Read-only

TV Mode skal ikke kunne endre turneringsdata.

---

# 36. Turneringshistorikk

Innloggede administratorer skal kunne åpne tidligere turneringer.

Historikken skal vise:

- dato
- turneringsnavn
- turneringsmodus
- antall spillere
- sluttresultat
- kamper
- vinnere
- varighet

---

# 37. Spillerhistorikk

Innloggede spillere kan over tid få:

- tidligere turneringer
- kamper
- resultater
- plasseringer
- partnere
- motstandere

Gjestedata skal ikke automatisk antas å tilhøre samme person kun fordi navnet er likt.

---

# 38. Spillerstatistikk

Mulige nøkkeltall:

```text
Turneringer
Kamper
Seire
Tap
Seiersprosent
Poeng vunnet
Poeng tapt
Poengdifferanse
Gjennomsnittlig plassering
```

---

# 39. Partnerstatistikk

Eksempel:

```text
Mest spilte partner
Thomas

Kamper sammen
24

Seiersprosent
66,7 %
```

---

# 40. Head-to-head

Eksempel:

```text
Sigurd vs Thomas

Kamper: 14

Sigurd
8 seire

Thomas
6 seire
```

Dette bør først implementeres når historikkdataene er stabile.

---

# 41. Turneringsmoduser

Turneringsmotoren bør utvikles slik at hver modus bruker samme grunnkomponenter:

- spillere
- lag
- kamper
- baner
- status
- resultater
- ranking

Forskjellen ligger i scheduler og rankingregler.

---

# 42. Lokale navn på turneringsmoduser

Der engelske navn er innarbeidet i padelmiljøet kan de beholdes.

Der en naturlig norsk betegnelse finnes, kan den brukes i UI.

Forslag:

| Intern ID | Norsk visningsnavn |
|---|---|
| round_robin | Alle mot alle |
| americano | Americano |
| team_americano | Lag-Americano |
| mexicano | Mexicano |
| team_mexicano | Lag-Mexicano |
| king_of_court | Kongen av banen |
| knockout | Cup |
| groups_playoffs | Gruppespill + sluttspill |

Appens oversettelsesfiler bør avgjøre visningsnavnet.

Interne ID-er skal være språkuavhengige.

---

# 43. Alle mot alle

Dette er videreutviklingen av dagens Round Robin-modus.

Prinsipp:

- lag opprettes
- alle relevante lag møter hverandre
- nye partnerkombinasjoner genereres mellom rundene

---

# 44. Americano

Prinsipp:

- spillere får nye partnere
- individuelle poeng samles
- partnerkombinasjoner roteres

Leaderboard baseres på individuell score.

---

# 45. Lag-Americano

Fast partner gjennom turneringen.

Ranking føres per lag.

---

# 46. Mexicano

Ny kampoppsett bestemmes av løpende plassering.

Spillere med lignende ranking møtes.

Dette krever at scheduler kan regenerere neste runde basert på aktuelle resultater.

---

# 47. Lag-Mexicano

Som Mexicano, men med faste lag.

---

# 48. Kongen av banen

Typisk prinsipp:

```text
Vinnere → opp en bane
Tapere → ned en bane
```

Systemet bør støtte:

- antall baner
- tidsbaserte runder
- poengbaserte runder
- automatisk flytting mellom baner

---

# 49. Cup

Vanlig utslagsturnering.

Støtte senere for:

- seed
- bye
- kvartfinale
- semifinale
- finale
- bronsefinale

---

# 50. Gruppespill + sluttspill

Eksempel:

```text
Gruppe A
Gruppe B
Gruppe C
Gruppe D

↓

Kvartfinale

↓

Semifinale

↓

Finale
```

Denne modusen kan gjenbruke både Round Robin- og Cup-motor.

---

# 51. Rating / Elo

Rating bør planlegges i databasen nå, men implementeres senere.

Mulig profil:

```text
Sigurd

Rating
1542

+18 siste turnering
```

---

## 51.1 Viktig prinsipp

Rating må ikke blandes direkte med vanlig turneringsscore.

Turneringsresultater lagres separat.

Rating beregnes etterpå.

Dette gjør at ratingalgoritmen kan endres uten å omskrive historiske kamper.

---

# 52. Ligaer og sesonger

Senere kan flere turneringer samles i:

```text
Sesong høst 2026
```

med:

- sammenlagt poeng
- rating
- antall deltakelser
- seire
- sluttplassering

---

# 53. Varslinger

Når PWA-grunnlaget er stabilt kan varslinger introduseres.

Eksempel:

```text
Du spiller neste kamp på Bane 3.
```

eller:

```text
Kampen din er klar.
```

---

## 53.1 Varslingstyper

Mulige typer:

- neste kamp
- kampen er klar
- baneendring
- resultatkonflikt
- turnering starter
- turnering avsluttet

Push-varslinger krever eksplisitt brukeraksept.

---

# 54. Tournament Assistant

Tournament Assistant kan i første versjon være en regelmotor, ikke AI.

Den analyserer turneringens tilstand.

Eksempel:

```text
TURNERINGSASSISTENT

⚠ Bane 3 har vært aktiv i 31 minutter

⚠ Runde 4 venter på ett resultat

✓ Alle spillere har omtrent lik spilletid

✓ Ingen partnerkombinasjoner er gjentatt

Estimert ferdig: 17:04
```

---

# 55. Tournament Assistant – mulige kontroller

Systemet kan oppdage:

- kamp som varer uvanlig lenge
- manglende resultat
- tom bane med spillbar kamp i kø
- skjev pausefordeling
- gjentatt partner
- spiller med mange kamper på rad
- turnering som står fast
- uventet statuskonflikt

---

# 56. Internasjonalisering

All ny UI-tekst skal legges i oversettelsessystemet.

Unngå hardkodet tekst i komponentene.

Minimum:

```text
nb
en
```

Interne enum-verdier skal aldri oversettes i databasen.

Eksempel:

```text
king_of_court
```

kan vises som:

```text
Kongen av banen
```

på norsk.

---

# 57. Responsive krav

Alle nye funksjoner skal testes på:

- liten mobil
- stor mobil
- nettbrett
- laptop
- desktop
- TV / stor skjerm

Player View skal prioriteres for mobil.

Admin View skal fungere godt både på mobil og større skjerm.

TV Mode optimaliseres separat for store skjermer.

---

# 58. Tilgjengelighet

Nye komponenter bør minimum ha:

- god kontrast
- tastaturnavigasjon
- synlig fokus
- tilgjengelige labels
- forståelig status uten kun farge
- tilstrekkelig trykkflate på mobil

Eksempel:

Ikke bruk bare grønn farge for ferdig kamp.

Bruk også:

```text
✓ Ferdig
```

---

# 59. Sanntidsoppdatering

Supabase Realtime bør brukes der det gir mening.

Typiske data:

- kampstatus
- score
- banestatus
- spillerstatus
- neste kamp
- turneringsstatus

Unngå unødvendig abonnement på hele databasen.

Abonner på relevant turnering.

---

# 60. Konflikthåndtering

Frontend skal ikke anta at lokalt state alltid er sannheten.

Viktige operasjoner bør valideres i backend/database.

Eksempel:

To enheter forsøker å avslutte samme kamp.

Systemet skal:

- validere kampstatus
- hindre inkonsistente skriver
- returnere oppdatert tilstand

---

# 61. Migreringsstrategi

Nye funksjoner bør introduseres uten å bryte eksisterende turneringer.

Forslag:

## Migrering 1

Opprett nye normaliserte tabeller.

## Migrering 2

Flytt eller map eksisterende data.

## Migrering 3

La frontend lese ny modell.

## Migrering 4

Fjern gammel struktur først når ny modell er bekreftet stabil.

---

# 62. Feature flags

Større funksjoner kan utvikles bak feature flags.

Eksempel:

```text
enable_tv_mode
enable_new_scheduler
enable_profiles
enable_rating
```

Dette gjør det mulig å teste ny funksjonalitet uten å eksponere den for alle brukere.

---

# 63. Logging og feilsporing

Kritiske feil bør logges med nok kontekst.

Eksempel:

```text
tournament_id
match_id
user_id
operation
timestamp
error
```

Persondata skal ikke logges unødvendig.

---

# 64. Testing

## 64.1 Scheduler-tester

Test blant annet:

```text
4 spillere
5 spillere
6 spillere
7 spillere
8 spillere
9 spillere
10 spillere
11 spillere
12 spillere
13 spillere
16 spillere
```

med varierende antall baner.

---

## 64.2 Test partnerduplikater

Kontroller at algoritmen minimerer gjentatte partnere.

---

## 64.3 Test pauser

Kontroller at:

- pauser fordeles
- kampmengde er balansert
- spillere ikke blir glemt

---

## 64.4 Test samtidighet

Simuler:

- to scoreinnsendinger
- admin + spiller
- to adminenheter
- spiller som byttes mens kamper genereres

---

## 64.5 PWA-testing

Test:

- installasjon
- oppdatering
- deep links
- QR
- refresh på undersider
- offline-status
- service worker update

---

# 65. Akseptansekriterier – fase 1

Fase 1 kan regnes som ferdig når:

- spiller kan bli med uten konto
- admin må være innlogget
- admin eier turneringen
- PWA kan installeres på støttede plattformer
- QR-funksjonen er verifisert eller forbedret
- banenavn fungerer
- spillere kan registrere resultat i egne kamper
- databasen støtter ny struktur
- hovedmenyen er dynamisk
- adminområdet er forenklet
- eksisterende visuell profil er bevart

---

# 66. Akseptansekriterier – fase 2

Fase 2 kan regnes som ferdig når:

- alle kamper har eksplisitt status
- alle runder har eksplisitt status
- scheduler er separert fra UI
- Round Robin følger ny laglogikk
- partnerduplikater minimeres
- pauser fordeles fornuftig
- systemet kan finne neste spillbare kamp
- ledig bane kan få ny kamp automatisk
- spiller ser Min neste kamp

---

# 67. Akseptansekriterier – fase 3

Fase 3 kan regnes som ferdig når:

- Court Queue fungerer
- scorekonflikter håndteres
- admin kan korrigere score
- hendelseslogg finnes
- relevante handlinger kan angres
- spiller kan erstattes
- TV Mode fungerer
- Spectator View er erstattet eller migrert
- realtime-visninger er stabile

---

# 68. Akseptansekriterier – fase 4

Fase 4 kan regnes som ferdig når:

- avsluttede turneringer lagres
- historiske kamper kan åpnes
- profiler kan vise statistikk
- partnerstatistikk fungerer
- head-to-head kan beregnes fra historiske data

---

# 69. Akseptansekriterier – fase 5

Fase 5 kan regnes som ferdig når samme grunnmotor støtter flere turneringsmoduser uten separate kopier av hele appflyten.

Minst følgende bør være tilgjengelige:

- Alle mot alle
- Americano
- Lag-Americano
- Mexicano
- Lag-Mexicano
- Kongen av banen
- Cup
- Gruppespill + sluttspill

---

# 70. Akseptansekriterier – fase 6

Fase 6 kan regnes som ferdig når:

- rating kan beregnes fra historiske kamper
- sesonger kan samle flere turneringer
- varslinger fungerer på støttede plattformer
- Tournament Assistant kan identifisere relevante turneringsproblemer

---

# 71. Foreslått kodearkitektur

Eksempel:

```text
src/
├─ app/
│  ├─ router/
│  ├─ navigation/
│  └─ state/
│
├─ features/
│  ├─ auth/
│  ├─ profiles/
│  ├─ tournaments/
│  ├─ players/
│  ├─ courts/
│  ├─ matches/
│  ├─ scoring/
│  ├─ history/
│  ├─ tv-mode/
│  └─ statistics/
│
├─ tournament-engine/
│  ├─ scheduler/
│  ├─ state-machine/
│  ├─ pairing/
│  ├─ courts/
│  ├─ scoring/
│  └─ modes/
│
├─ services/
│  ├─ supabase/
│  ├─ realtime/
│  ├─ notifications/
│  └─ pwa/
│
├─ components/
│
├─ i18n/
│
└─ styles/
```

---

# 72. Turneringsmotor – foreslått modusarkitektur

```text
modes/
├─ round-robin
├─ americano
├─ team-americano
├─ mexicano
├─ team-mexicano
├─ king-of-court
├─ knockout
└─ groups-playoffs
```

Alle moduler bør implementere et felles grensesnitt, eksempelvis:

```text
createTournament()
generateRound()
generateMatches()
calculateStandings()
canAdvance()
completeRound()
completeTournament()
```

Detaljene kan tilpasses faktisk teknologistack.

---

# 73. Viktig arkitekturprinsipp

Unngå:

```text
if mode === "americano"
...
else if mode === "mexicano"
...
else if ...
```

spredt gjennom hele UI-et.

Modusspesifikk logikk bør ligge i turneringsmotoren.

UI skal så langt som mulig spørre motoren:

```text
Hva skal vises?
Hva er neste kamp?
Hva er ranking?
Kan runden avsluttes?
```

---

# 74. Utviklingsrekkefølge i praksis

## Sprint / arbeidspakke 1

- eksisterende funksjonsforbedringer
- banenavn
- score fra spiller
- QR review
- feilretting

## Sprint / arbeidspakke 2

- profiler
- auth
- admin-eierskap
- gjestespiller

## Sprint / arbeidspakke 3

- PWA
- manifest
- service worker
- installasjon
- update flow

## Sprint / arbeidspakke 4

- databaseskjema
- migrering
- RLS
- historikk-klare tabeller

## Sprint / arbeidspakke 5

- dynamisk navbar
- ny Admin View
- redusere antall faner

## Sprint / arbeidspakke 6

- State Machine
- ny scheduler
- ny Round Robin

## Sprint / arbeidspakke 7

- bye-logikk
- court scheduler
- Min neste kamp
- Court Queue

## Sprint / arbeidspakke 8

- resultatkonflikt
- event log
- Undo
- spillerbytte

## Sprint / arbeidspakke 9

- TV Mode
- migrering fra Spectator View

## Sprint / arbeidspakke 10

- historikk
- statistikk

## Sprint / arbeidspakke 11+

- nye turneringsmoduser
- rating
- liga
- varslinger
- Tournament Assistant

---

# 75. Hva som ikke bør bygges for tidlig

Følgende bør **ikke prioriteres foran kjernemotoren**:

- avansert Elo
- ligaer
- mye profilkosmetikk
- sosial feed
- achievements
- avansert AI
- omfattende personalisering
- betalingssystem

Disse funksjonene har liten verdi dersom turneringsmotoren ikke først er stabil.

---

# 76. Endelig mål for Player View

En spiller skal kunne åpne Padelstar og umiddelbart forstå:

```text
Spiller jeg nå?

Hvis ikke:
Når spiller jeg?

Hvor spiller jeg?

Hvem spiller jeg med?

Hvem spiller jeg mot?

Hva skjedde i mine tidligere kamper?

Hvordan ligger jeg an?
```

Dette skal kunne forstås uten å åpne flere menyer.

---

# 77. Endelig mål for Admin View

En admin skal umiddelbart kunne se:

```text
Hva skjer akkurat nå?

Er noen baner ledige?

Er en kamp klar?

Mangler et resultat?

Er det en konflikt?

Hvem spiller neste?

Har noen fått urettferdig mange pauser?

Har turneringen stoppet opp?
```

Vanlige handlinger skal være tilgjengelige direkte.

Sjeldne handlinger kan ligge under sekundærmeny.

---

# 78. Endelig mål for automatisering

Når en kamp avsluttes skal systemet i størst mulig grad kunne:

```text
Resultat registrert
        ↓
Kamp ferdig
        ↓
Tabell oppdatert
        ↓
Bane ledig
        ↓
Neste spillbare kamp funnet
        ↓
Kamp tildelt bane
        ↓
Spillere får ny status
        ↓
TV Mode oppdateres
        ↓
Eventuelt varsel sendes
```

uten at admin må utføre hvert steg.

---

# 79. Strategisk sluttmål

Padelstar skal utvikles fra en turneringsgenerator til en komplett **turneringsmotor og liveplattform for padel**.

Kjernen bør være:

```text
Profiler
   ↓
Turnering
   ↓
Scheduler
   ↓
Kamper
   ↓
Baner
   ↓
Resultater
   ↓
Historikk
   ↓
Statistikk
   ↓
Rating / liga
```

med tre ulike brukerflater over samme datagrunnlag:

```text
ADMIN VIEW
PLAYER VIEW
TV MODE
```

Dette gir en tydelig teknisk retning og gjør at nye funksjoner senere kan bygges på toppen av samme plattform i stedet for som separate løsninger.

---

# 80. Kort oppsummert anbefalt rekkefølge

```text
1. Forbedre eksisterende app
2. Brukerprofiler / admininnlogging
3. PWA / installerbar app
4. Databaseforberedelser
5. Dynamisk navigasjon
6. Forenklet Admin View
7. Tournament State Machine
8. Ny Round Robin
9. Pausebalansering
10. Automatisk kamp-/banekø
11. Min neste kamp
12. Court Queue
13. Resultatkontroll
14. Event log / Undo
15. Spillerbytte
16. TV Mode
17. Historikk
18. Statistikk
19. Nye turneringsmoduser
20. Rating
21. Ligaer
22. Varslinger
23. Tournament Assistant
```

Dette er den anbefalte masterrekkefølgen for videre utvikling av Padelstar.
