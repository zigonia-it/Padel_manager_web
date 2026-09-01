# Migrering fra SwiftUI til web

Sist oppdatert: 2026-08-21

Status: migreringsnotater

Kilde-repo: `zigonia-it/PadelManager`

## Viktige Swift-filer som bør være fasit

- `PadelManager/Core/Session/Engines/TournamentScheduler.swift`
- `PadelManager/Core/Session/Engines/LeaderboardCalculator.swift`
- `PadelManager/Core/Session/Engines/GameEngine.swift`
- `PadelManager/Core/Session/Engines/CupEngine.swift`
- `PadelManager/Core/Models/Player.swift`
- `PadelManager/Core/Models/Team.swift`
- `PadelManager/Core/Models/Match.swift`
- `PadelManager/Core/Models/MatchState.swift`
- `PadelManager/Core/Models/TeamGameScore.swift`
- `PadelManager/Core/Models/TournamentSettings.swift`

## Portet til webutkastet

- Logo, appikoner, Orbitron-font og hovedfarger fra SwiftUI-prosjektet.
- Berger-rotasjon for partner-runder.
- Singles-runder for færre enn fire spillere.
- `waiting`, `playing` og `finished` som første matchstatuser.
- `teamOne`, `teamTwo`, `sittingOut`, `currentSet`, `completedSets` og `winnerTeamIndex` i matchmodellen.
- Leaderboard med poengmodus for `games`, `sets` og `matches`.

## Bevisst ikke portet ennå

- SwiftUI-visninger.
- SwiftData/CoreData-lagring.
- In-app purchase / Pro-funksjoner.
- Native iOS-varslinger.
- Cup/bracket-flyt.
- Full game scoring med poeng inni hvert game.

## Anbefalt neste steg

1. Splitte `app.js` i moduler: `models.js`, `scheduler.js`, `leaderboard.js`, `storage.js` og `ui.js`.
2. Lage små tester for scheduler og leaderboard.
3. Koble lokal lagring til Supabase når basisflyten føles riktig.
4. Publisere første testversjon.
