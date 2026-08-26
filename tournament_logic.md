# Turneringslogikk fra iOS-appen

Sist oppdatert: 2026-08-26

Status: referanse for webimplementasjonen

Dette dokumentet beskriver turneringslogikken slik den var modellert i den tidligere iOS-appen `PadelManager-main`. Dokumentet er ment som en praktisk portingsreferanse for webappen, ikke som en instruksjonsfil fra iOS-prosjektet.

## Webstatus per 2026-08-26

Webappen støtter nå `roundRobin` og et første `cup`-format med automatisk eller manuelt lagoppsett. Cupen seeder lagene, håndterer byes til nærmeste toerpotens, viser pending-slots, oppretter neste runde fra vinnerlagene og kan opprette valgfri bronsefinale. Admin kan også registrere walkover og angre siste kampsteg med ett-stegs undo.

## Kilder i iOS-prosjektet

- `PadelManager/Core/Session/SessionManager.swift`
- `PadelManager/Core/Session/Engines/TournamentScheduler.swift`
- `PadelManager/Core/Session/Engines/GameEngine.swift`
- `PadelManager/Core/Session/Engines/LeaderboardCalculator.swift`
- `PadelManager/Core/Session/Engines/CupEngine.swift`
- `PadelManager/Core/Models/Match.swift`
- `PadelManager/Core/Models/TournamentSettings.swift`
- `PadelManager/Core/Models/TournamentFormat.swift`
- `PadelManager/Core/Models/CupBracket.swift`

## Hovedmodell

iOS-appen bygger en turnering rundt disse hovedobjektene:

- `Player`: spiller med `id`, `name` og visuell `accent`.
- `Team`: ett eller flere `Player`-objekter, med egen `id`, `accent` og `displayName`.
- `Match`: to lag, rundenummer, eventuelle spillere som sitter over, kampstatus, ferdige sett, pågående sett, pågående game, startende lag, vinner, walkover-status og eventuell banetekst.
- `TournamentSettings`: antall games for settseier, antall sett for kampseier, poengmodell, turneringsformat, cup-lagmodus og bronsefinalevalg.
- `CupBracket`: runder og slots for utslagsturnering, inkludert pending-slots, byes og valgfri bronsefinale.

Kampstatus har tre verdier:

- `waiting`: kampen er opprettet, men ikke startet.
- `playing`: kampen er aktiv og kan få poeng.
- `finished`: kampen er ferdig og har vinner.

## Standardinnstillinger

Standard turnering i iOS-appen bruker:

- `gamesToWinSet = 3`
- `setsToWinMatch = 1`
- `pointMode = games`
- `format = roundRobin`
- `cupTeamSetupMode = auto`
- `includesThirdPlaceMatch = false`

## Spilleroppsett

Navn trimmes før spilleren legges til. Duplikater avvises med case- og aksentinsensitiv sammenligning, slik at for eksempel samme navn med ulik casing ikke kan legges inn to ganger.

Maks antall spillere avhenger av format:

- Round-robin: 2 til 16 spillere.
- Cup med automatisk lagoppsett: 2 til 32 spillere.
- Cup med manuelt lagoppsett: minst 2 ferdige lag.

iOS-appen har ikke et eget administratørrolle-begrep i turneringsmotoren. For webappen betyr det at "admin spiller / spiller ikke" bør ligge utenpå turneringsmotoren: dersom admin deltar, opprettes admin også som `Player`; dersom admin ikke deltar, finnes admin bare som rolle/host.

## Round-robin-format

Når turneringen starter, shuffles spillerlisten først. Deretter genereres kamper forskjellig basert på antall spillere.

### 2-3 spillere

Ved færre enn 4 spillere genereres single-runder:

- Hver spiller møter alle andre spillere en gang.
- Hver kamp består av `Team(players: [spiller])` mot `Team(players: [spiller])`.
- Spillere som ikke er i den aktuelle kampen markeres som `sittingOut`.
- Antall kamper er `n * (n - 1) / 2`.

### 4 eller flere spillere

Ved 4 eller flere spillere genereres partner-runder med rotasjon:

- Ved oddetall legges det inn en tom plass (`nil`) slik at en spiller sitter over hver runde.
- Antall runder er `antall deltakere etter eventuell tom plass - 1`.
- Første deltaker holdes fast.
- Resten av deltakerne roteres ett steg for hver runde.
- I hver runde pares første og siste, andre og nest siste, osv.
- Et par med to spillere blir et lag.
- Et par med en spiller og tom plass betyr at spilleren sitter over.

Når lagene for en runde er laget, genereres alle unike lag-mot-lag-kamper i den runden. Rundenummeret lagres som `rotationNumber`, og samme `sittingOut`-liste kopieres til kampene i runden.

Konsekvens: Round-robin i iOS-appen er ikke bare "alle spillere mot alle". For fire eller flere spillere er det en partnerrotasjon der hvert rundeoppsett først lager lag, og deretter spiller alle lagene i den runden mot hverandre.

## Cup-format

Cup-formatet er single elimination med to mulige lagoppsett:

- `auto`: spillerlisten shuffles, og spillere pares fortløpende to og to. Ved oddetall blir siste spiller uten lag og sitter over i første runde.
- `manual`: ferdige `cupTeams` brukes direkte.

Webimplementert del:

- formatet kan velges i admin før turneringsstart
- automatisk lagoppsett parer spillerne to og to
- manuelt lagoppsett kan definere én eller to spillere per lag
- lagene seedes og bracket-størrelsen rundes opp til nærmeste toerpotens
- byes går videre til neste runde
- neste runde opprettes fra vinnerlagene
- pending-slots vises for senere bracket-runder
- bronsefinale opprettes mellom semifinaletaperne når valget er aktivert
- walkover kan registreres til valgfritt lag i en aktiv eller ventende kamp
- siste poeng-, settresultat- eller walkover-handling kan angres

Gjenstår i webporteringen:

- full kamp-/bracket-historikk utover siste undo-steg

Når cupen starter:

- Lagene får egne accents for tydeligere lagbadges.
- Bracket-størrelsen settes til nærmeste toerpotens som er minst like stor som antall lag.
- Hvis antall lag ikke fyller bracketen, får noen lag bye.
- Lagene shuffles for seedingen.
- De første `byeCount` lagene går rett videre fra runde 1.
- Resten pares i førsterundekamper.
- Senere runder opprettes som pending-slots slik at hele bracketstrukturen kan vises fra start.

Når siste ventende kamp i en cup-runde er ferdig:

- Hvis det fortsatt finnes en `waiting`-kamp i samme runde, flyttes aktiv indeks til den.
- Hvis alle kampene i runden er ferdige, samles vinnere fra kampene og lag med bye.
- Disse lagene pares til neste runde.
- Nye kamper appendes til `matches`.
- Bracketens pending-slots erstattes med kamp-ID-er.
- Når det ikke finnes flere runder, settes `currentMatchIndex` til `nil`, og turneringen regnes som komplett.

Bronsefinale:

- Bronsefinale er valgfri.
- Den legges på finalerunden som et eget `thirdPlaceSlot`.
- Når semifinaler er ferdige og det står igjen to finalelag, lages bronsekampen mellom de to tapende semifinalelagene.

## Kampflyt

Ved turneringsstart settes:

- `matches` til generert kampplan.
- `currentMatchIndex` til `0` hvis det finnes kamper.
- `tournamentStarted` til `true`.
- leaderboard og rundedata regnes ut.
- snapshot lagres umiddelbart.

En kamp må være `waiting` før den kan startes. Når `startCurrentMatch()` kjøres, endres status til `playing`.

Poeng kan bare registreres når aktiv kamp har status `playing`.

Når en kamp er `finished`, kan flyten gå videre:

- Round-robin: finn neste kamp etter nåværende indeks med status `waiting`; hvis ingen finnes, settes `currentMatchIndex` til `nil`.
- Cup: finn neste ventende kamp i samme eller neste genererte del av cupen; hvis ingen finnes, beregnes neste runde; hvis ingen ny runde finnes, er turneringen ferdig.

iOS-appen støtter også å velge kamp direkte, gå til forrige/neste kamp og sette banetekst på en kamp.

## Poeng og scoring

iOS-appen bruker tennis-/padelscoring på game-nivå:

- Interne pointverdier `0`, `1`, `2`, `3` vises som `0`, `15`, `30`, `40`.
- Ved `40-40` uten advantage er stillingen deuce.
- Hvis laget som scorer ved deuce får poeng, får laget advantage.
- Hvis motstander scorer når et lag har advantage, nulles advantage og kampen går tilbake til deuce.
- Hvis laget med advantage scorer igjen, vinner laget gamet.
- Hvis et lag scorer fra 40 uten at motstander er på 40, vinner laget gamet.

Når et lag vinner et game:

- Lagets games i pågående sett økes med 1.
- Pågående game resettes.
- Hvis lagets games er minst `gamesToWinSet`, vinner laget settet.

Når et lag vinner et sett:

- Pågående sett legges til i `completedSets`.
- Pågående sett resettes.
- Hvis laget har vunnet minst `setsToWinMatch`, settes kampen til `finished` og `winnerTeamIndex` settes.

Viktig portingsdetalj: iOS-motoren sjekker bare terskelen `gamesToWinSet`. Den krever ikke to games margin for å vinne settet.

## Walkover

En kamp kan avsluttes som walkover mens den er `waiting` eller `playing`.

Ved walkover:

- Kampen settes til `finished`.
- `winnerTeamIndex` settes til valgt vinnerlag.
- `isWalkover` settes til `true`.
- Leaderboard og avledet kampstate beregnes på nytt.

Walkover gir kampseier, men legger ikke automatisk inn game- eller settresultater i `completedSets`.

## Undo

iOS-appen lagrer kampens tilstand rett før siste registrerte poeng eller walkover i `lastScoredMatchState`.

Undo:

- Gjenoppretter aktiv kamp til forrige lagrede kampstate.
- Nuller `lastScoredMatchState`.
- Regner leaderboard og kampstate på nytt.
- Gjelder bare siste handling i nåværende kamp, ikke historikk på tvers av flere kamper.

## Leaderboard

Leaderboard beregnes ut fra `matches`, `players` og valgt `pointMode`.

Poengmodellene:

- `games`: hver spiller får poeng for games vunnet i ferdige sett. Hvis kampen ikke er ferdig, telles også games i pågående sett.
- `sets`: spillere på laget som vant et ferdig sett får 1 poeng per sett.
- `matches`: spillere på vinnerlaget får 3 poeng per vunnet kamp.

Statistikk per spiller:

- `matchesPlayed`: teller kamper spilleren har deltatt i som ikke lenger er `waiting`.
- `matchWins`: teller ferdige kamper der spillerens lag vant.
- `setsWon`: teller ferdige sett vunnet av spillerens lag.
- `gamesWon`: teller games vunnet i ferdige sett, pluss pågående sett dersom kampen ikke er ferdig.

Sortering:

1. Høyest poeng.
2. Flest kampseire.
3. Flest sett vunnet.
4. Navn alfabetisk.

## Persistens og historikk

iOS-appen lagrer aktiv turnering som `TournamentState` i `UserDefaults`, med en eldre `AppSessionSnapshot` som migreringsvei.

Lagret aktiv state inneholder:

- innstillinger
- spillere
- kamper
- om turneringen er startet
- aktiv kamp-ID
- tekst i spillerinput
- cup-lag og bracket når formatet er cup

Turneringshistorikk arkiveres når en aktiv turnering avsluttes. Historikken lagres lokalt og speiles til iCloud key-value store. Historikkentry inneholder spillerantall, kampantall, settings og ferdig leaderboard med rangering.

## Relevans for webappen

Dette er kjerneoppførselen som bør bevares når webappen kobles mot database og publiseres:

- Turneringens spillere, settings, kamper, aktiv kamp, cup-bracket og leaderboard må være eksplisitt state i databasen.
- Admin-rollen bør være separat fra `Player`.
- En admin som deltar må også ha en `Player`-rad/kobling i turneringen.
- Skjermflyten i webappen kan være rollebasert, men kampmotoren bør ikke forutsette at host alltid spiller.
- Round-robin-planlegging, cup-avansement, scoring, walkover og leaderboard bør være deterministisk nok til at klienter som oppdateres i sanntid viser samme state.
- Scoring bør ideelt kjøres som én atomisk database/API-operasjon per poeng for å unngå kollisjoner mellom flere enheter.
