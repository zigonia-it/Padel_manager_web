# Padelstar – gjennomgang og forbedring av funksjonalitet

Sist oppdatert: 2026-09-02

## Formål

Dette dokumentet beskriver funksjonelle og visuelle forbedringer som skal implementeres i Padelstar.

Målet er å:

- gjøre turneringsflyten tydeligere for både admin og spillere
- gi spillerne større kontroll over egne aktive kamper
- forbedre kampplanlegging og lagrotasjon
- gjøre baneinformasjon tydelig
- redusere unødvendige valg i grensesnittet
- gjøre regler og turneringsoppsett lettere å forstå

---

# 1. Funksjonelle endringer

## 1.1 Resultatregistrering for spillere

Alle spillere som deltar i en aktiv kamp skal kunne registrere og oppdatere resultatet i sin egen kamp.

### Regler

- En spiller kan kun registrere resultat i kamper spilleren selv deltar i.
- Spillere skal ikke kunne redigere andre spilleres kamper.
- Admin skal alltid kunne registrere eller korrigere resultat i alle kamper.
- Resultatendringer skal synkroniseres til alle deltakere i turneringen.
- Appen må håndtere samtidige oppdateringer på en trygg måte dersom flere spillere forsøker å registrere resultat samtidig.
- Når kampen er ferdigregistrert, skal resultatet brukes direkte i tabell/rangering.

---

## 1.2 Baner og banenavn

Admin skal kunne registrere hvilke baner som brukes i turneringen.

Banene skal kunne få både nummer og navn.

### Eksempel

- Bane 1 – Schala & Partners
- Bane 2 – Ringnes
- Bane 3 – Court X

Banen skal knyttes til kampen når kampplanen genereres.

### Visning

Banen skal vises tydelig på kampkortet, for eksempel:

> **Bane 2 · Ringnes**

Dette skal gjøre det enkelt for spillerne å se hvor neste kamp skal spilles.

---

# 2. Turneringslogikk

## 2.1 Terminologi

Følgende begreper skal brukes konsekvent i appen og i kodebasen:

### Turnering

Hele arrangementet fra start til slutt.

### Runde

En periode der spillerne er fordelt i faste lag.

Lagene beholdes gjennom hele runden.

Når alle nødvendige kamper mellom lagene i runden er ferdigspilt, avsluttes runden og nye lag opprettes.

### Kampomgang

En gruppe kamper som spilles samtidig på de tilgjengelige banene.

### Kamp

Ett lag mot ett annet lag.

---

## 2.2 Round robin-struktur

Dagens løsning randomiserer spillerne på nytt for hver kamp.

Dette skal endres.

Når en ny runde starter:

1. Spillerne fordeles i lag med to spillere på hvert lag.
2. Lagene skal beholdes gjennom hele runden.
3. Lagene skal spille mot de øvrige lagene i samme runde.
4. Først når round robin-planen for runden er fullført, kan neste runde starte.
5. I neste runde opprettes nye lagkombinasjoner.

---

## 2.3 Eksempel – 8 spillere

### Runde 1

Lagene kan eksempelvis være:

- Lag A: Spiller 1 + Spiller 2
- Lag B: Spiller 3 + Spiller 4
- Lag C: Spiller 5 + Spiller 6
- Lag D: Spiller 7 + Spiller 8

Round robin-planen kan da være:

| Kampomgang | Bane 1 | Bane 2 |
|---|---|---|
| 1 | Lag A vs Lag B | Lag C vs Lag D |
| 2 | Lag A vs Lag C | Lag B vs Lag D |
| 3 | Lag A vs Lag D | Lag B vs Lag C |

Når alle disse kampene er ferdigspilt, avsluttes runde 1.

Deretter opprettes nye lag for runde 2.

---

## 2.4 Lagrotasjon mellom runder

Når nye lag opprettes, skal systemet bruke historikken fra tidligere runder.

Målet er at spillerne skal få spille med flest mulig forskjellige makkere gjennom turneringen.

### Hovedregel

En spiller skal ikke få samme makker igjen før alle mulige andre makkere er brukt, så langt dette er matematisk mulig.

Eksempel på nye lag i runde 2:

- Spiller 1 + Spiller 3
- Spiller 2 + Spiller 5
- Spiller 4 + Spiller 7
- Spiller 6 + Spiller 8

---

## 2.5 Prioriteringsregler for kampgeneratoren

Det er ikke alltid matematisk mulig å oppnå samtidig at:

- alle spiller med alle
- alle spiller mot alle
- alle får nøyaktig like mange kamper
- alle får nøyaktig like mange pauser
- ingen makkerkombinasjoner gjentas

Kampgeneratoren skal derfor bruke følgende prioritering:

### Prioritet 1 – Unngå gjentatt makker

Ikke bruk samme lagkombinasjon på nytt før alle tilgjengelige alternative makkere er brukt, så langt dette er mulig.

### Prioritet 2 – Varier motstandere

Minimer hvor ofte den samme spilleren møter de samme motstanderne.

### Prioritet 3 – Jevnt antall kamper

Fordel kampene så jevnt som mulig mellom spillerne.

### Prioritet 4 – Jevn fordeling av pauser

Dersom ikke alle kan spille samtidig, skal pauser fordeles så jevnt som mulig.

---

## 2.6 Turneringshistorikk

Systemet bør lagre historikk per spiller slik at kampgeneratoren kan ta gode valg når nye runder genereres.

Eksempel på informasjon som bør kunne spores:

```text
player.teammates
player.opponents
player.matchesPlayed
player.restCount
```

Det kan også være hensiktsmessig å lagre antall ganger en bestemt spillerkombinasjon har vært:

- lagkamerater
- motstandere

Denne historikken skal brukes aktivt i genereringen av neste runde.

---

## 2.7 Spillere som ikke får plass i aktiv kampomgang

Dersom det er flere spillere enn tilgjengelige plasser på banene, vil enkelte spillere måtte ha pause.

Eksempel:

- 3 baner
- 4 spillere per bane
- totalt 12 aktive spillere per kampomgang
- 16 deltakere

Da må 4 spillere ha pause i hver kampomgang.

Pausefordelingen skal være så jevn som mulig.

Systemet skal prioritere spillere med færrest spilte kamper og færrest tidligere pauser når nye kampomganger planlegges.

---

# 3. Visuelle endringer

## 3.1 Avatarer

Den eksisterende listen der spilleren manuelt velger avatar skal fjernes.

Når en spiller registreres, skal appen automatisk tildele en tilfeldig avatar.

### Krav

- Avatar skal genereres/tildeles én gang ved registrering.
- Avatarvalget skal lagres sammen med spilleren.
- Spilleren skal beholde samme avatar på tvers av visninger og enheter.
- Avatar skal ikke randomiseres på nytt ved sideoppdatering eller ny innlogging i samme turnering.

Dette reduserer friksjon i registreringsprosessen og gjør spillerne enklere å identifisere visuelt.

---

## 3.2 Footer

Det skal legges inn mer vertikal spacing mellom:

- nederste innholdskort
- branding/logo i footer

Footer skal ikke oppleves som visuelt presset opp mot siste innholdsseksjon.

Spacing skal være konsistent på både desktop og mobil.

---

## 3.3 Språkvelger

Språkvelgeren skal forenkles visuelt.

I stedet for å vise hele språknavnet i lukket tilstand kan den vise flagg.

### Eksempel

- 🇳🇴 Norsk
- 🇬🇧 English
- 🇸🇪 Svenska

Når språkvelgeren er lukket, kan kun flagget vises.

Når menyen åpnes, skal både flagg og språkets navn vises.

### Viktig

Engelsk skal representeres av ett konsekvent flagg i språkvelgeren.

Unngå å bruke både britisk og amerikansk flagg samtidig dersom begge aktiverer samme engelske språkversjon.

Språkvelgeren skal fortsatt være tilgjengelig for skjermlesere og ha korrekt tekst/ARIA-label.

---

## 3.4 Kampkort

Det finnes fortsatt en vertikal linje langs venstre kant på kampkortene.

Denne hører ikke til i det nye visuelle uttrykket og skal fjernes.

Kontroller spesielt:

- `border-left`
- pseudo-elementer som `::before`
- gamle statusindikatorer
- arv fra tidligere kortkomponenter

Linjen skal fjernes uten å påvirke øvrig layout eller spacing.

---

# 4. Regler-kortet

Regler-kortet skal ikke bare vise generelle standardtekster.

Innholdet skal genereres dynamisk basert på turneringsinnstillingene.

---

## 4.1 Sett

Under seksjonen **Sett** skal det vises en kort forklaring basert på valgt kampformat.

Eksempel:

> Kampen spilles best av **3 sett**. Et sett vinnes normalt ved **6 games** med minst to games margin.

Verdiene skal hentes fra turneringsinnstillingene.

Eksempel på dynamiske verdier:

- antall sett
- games per sett
- krav til margin
- eventuell tie-break-logikk dersom dette støttes

Teksten skal automatisk endres når admin endrer turneringsreglene.

---

## 4.2 Rangering

Under seksjonen **Rangering** skal appen forklare hvordan tabellen beregnes.

Teksten skal avhenge av valgt poeng-/rangeringsmetode.

### Dersom rangering baseres på vunne kamper

Eksempel:

> Rangeringen avgjøres primært etter antall vunne kamper.

### Dersom rangering baseres på games

Eksempel:

> Rangeringen avgjøres primært etter totalt antall vunne games.

Dersom appen har sekundære tie-break-kriterier, skal disse også vises.

Eksempel:

> Ved lik poengsum rangeres spillerne etter games-differanse, deretter antall vunne games.

Regelteksten og den faktiske rangeringsalgoritmen skal bruke samme logikk og samme prioriteringsrekkefølge.

---

## 4.3 Pause

Under seksjonen **Pause** skal spilleren få informasjon om hvorfor pauser kan forekomme.

Eksempel:

> Dersom det er flere spillere enn tilgjengelige plasser på banene, vil enkelte spillere ha pause mellom kampene. Pausene fordeles så jevnt som mulig.

Dersom en spiller faktisk har pause i gjeldende kampomgang, skal dette også vises tydelig i spillerens egen visning.

Eksempel:

> **Pause denne omgangen**

Når neste kamp er kjent, kan spillerkortet også vise:

> **Neste kamp:** Bane 2 · Ringnes

---

# 5. Spillerens aktive status

Spillerens visning bør tydelig skille mellom følgende tilstander:

## Aktiv kamp

Vis:

- lagkamerat
- motstandere
- bane
- score/resultatkontroller
- kampstatus

## Pause

Vis tydelig:

> Pause denne omgangen

Eventuelt også informasjon om neste planlagte kamp.

## Venter på neste kampomgang

Vis eksempelvis:

> Venter på at gjeldende kamper skal fullføres.

## Turnering ferdig

Vis spillerens sluttplassering og oppsummering.

---

# 6. Foreslått turneringsstruktur

```text
Turnering

Runde 1
├── Lagene opprettes
│
├── Kampomgang 1
│   ├── Kamp 1
│   └── Kamp 2
│
├── Kampomgang 2
│   ├── Kamp 3
│   └── Kamp 4
│
└── Kampomgang 3
    ├── Kamp 5
    └── Kamp 6

Runde 2
├── Nye lag opprettes
├── Historikk fra tidligere runder vurderes
└── Ny round robin-plan genereres

Runde 3
└── osv.
```

---

# 7. Implementeringsprinsipper

Ved implementering skal eksisterende fungerende funksjonalitet beholdes så langt det er mulig.

Endringer skal gjøres modulært.

Særlig turneringsgeneratoren bør separeres fra UI-logikken slik at kampplanlegging kan testes uavhengig av visningen.

Det anbefales å ha egne funksjoner eller moduler for:

```text
generateTeams()
generateRoundRobinMatches()
assignCourts()
selectRestingPlayers()
calculateRanking()
updateMatchResult()
generateNextRound()
```

Navnene er kun eksempler og kan tilpasses eksisterende arkitektur.

---

# 8. Viktige tester

Før funksjonaliteten regnes som ferdig skal følgende scenarier testes:

- 4 spillere / 1 bane
- 6 spillere / 1 bane
- 8 spillere / 1 bane
- 8 spillere / 2 baner
- 10 spillere / 2 baner
- 12 spillere / 3 baner
- oddetall antall spillere
- flere spillere enn tilgjengelige baneplasser
- flere runder
- kontroll av gjentatte makkere
- kontroll av gjentatte motstandere
- jevn fordeling av pauser
- spiller registrerer resultat
- admin korrigerer resultat
- to enheter oppdaterer samme kamp
- sideoppdatering mens turnering er aktiv
- spiller reconnecter til aktiv turnering

---

# 9. Overordnet mål

Turneringsmotoren skal gå fra enkel randomisering til en balansert scheduler som bruker historikk fra tidligere kamper og runder.

Målet er at spillerne over tid skal:

1. spille med flest mulig forskjellige makkere
2. møte flest mulig forskjellige motstandere
3. få omtrent like mange kamper
4. få omtrent like mange pauser
5. alltid vite hvem de spiller med, hvem de møter og hvilken bane de skal spille på

Dette skal gi en mer rettferdig, oversiktlig og brukervennlig turneringsopplevelse.
