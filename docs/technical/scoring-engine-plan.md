# Scoring engine plan: the "points" mode (Phase 14, in scope for 1.0)

Status: **plan, not built.** Written 2026-09-24. Decisions marked **[D]** need the developer before Phase 2 starts.

## 1. Goal

Padel scoring (0/15/30/40, games, sets, tiebreak) is the only scoring the app knows. Add a second, generic **points mode**: a match (or each game of a match) is won by the first side to reach **N points with a margin of at least M**, optionally with a hard cap. Examples: 21 win by 2 (badminton-like), 24 win by 1 (Americano-style), 11 win by 2. It must work for Round Robin and Cup, live point-by-point (players and admin), admin set-result, corrections, the approval workflow, standings, statistics, TV Mode and the rules page.

Non-goals for 1.0: other sports' concepts (serve order, side switches, periods), the standalone reusable multi-sport engine (Priority 3, v1.5), Americano/Mexicano formats (Priority 2).

## 2. Where padel scoring is hard-wired today

| Layer | Place | What is padel-specific |
|---|---|---|
| Engine (JS) | `app/scoring-engine.js` `applyPoint`, `awardPoint`, `isSetComplete`, `validateSetScore`, `hasMatchWinner`, `pointLabel` | the 0-4 point model, deuce/advantage/golden point, games to win a set with a 2-game margin, tiebreak to 7 |
| Engine (SQL twin) | `save_player_point_impl` (`20260919120000_match_scorer_lease.sql`) | the same rules, re-implemented; `gamesToWinSet` also read in `admin_set_result_impl`, `match_result_action` (dispute/correct validation), `admin_correct_result`, `admin_undo_match`, `20260920180000_corrections_after_finish.sql` |
| Shared fixtures | `test/fixtures/scoring-scenarios.json` (23 scenarios) run by `test/scoring-rules.test.js` and `supabase/tests/scoring-rules.pglite.mjs` | keeps JS and SQL from drifting: **the mechanism to reuse** |
| Rule settings | `app/tournament-state.js` (`settings`), `app/admin-actions.js` `updateTournamentRules`, `app/create-wizard.js` step 2, `app/tournament-entry.js`, Styring rules form | `gamesToWinSet`, `setsToWinMatch`, `gameMode`, `setTiebreak`, `timedMinutes`, `pointMode` (table points) |
| Match rules snapshot | `match.rules` written on the first point (`snapshotRules`) | the engine reads the snapshot, so a later setting change cannot alter a running match |
| Display | `app/match-card.js` scoreboard table (SETT / GAME / POENG), `app/large-score.js`, `app/player-next-match.js`, `app/tv-mode.js`, `app/rules.js`, translations | the three columns, point labels 15/30/40/A, texts |
| Results | `completedSets: [{teamOne, teamTwo}]` per match; standings/statistics read sets and games (`leaderboardEntries`, `statsForPlayer`, `finalize_tournament`) | "games" = the numbers in `completedSets` |

## 3. Core design idea: a points match is a "set" whose "games" are points

To keep the blast radius small, points mode **reuses the existing result structure**:

- `match.completedSets` keeps its shape: `[{ teamOne: 21, teamTwo: 18 }]`. One entry = one game to N points. `setsToWinMatch` (1, 2 or 3) already gives "best of several games" for free.
- `match.currentSet` is the running score (`{teamOne, teamTwo}` = points); `currentGame` is unused in points mode.
- Everything downstream keeps working unchanged: standings (`gamesWon`/`gameDifference` become points scored/point difference), statistics, corrections, the approval workflow (`approval.completedSets`), history and the profile statistics. Table points (`pointMode: matches | sets | games`) keep their meaning ("games" = points scored).
- The **only** things that change are the rule functions (when is a set complete, what one point does) and the display.

Rule profile (added to `matchRules` / `settings`, snapshotted on the match like the padel rules):

```
scoringMode: "padel" | "points"          // absent = "padel": every existing tournament and fixture is unchanged
pointsToWin: N        (5..99, default 21)
winBy: M              (1..5,  default 2)
pointCap: C | null    // optional hard cap: at C the next point wins regardless of margin; C >= N + M - 1 (else invalid)
```

Rules in one place, `isPointsGameComplete(a, b, rules)`: the leader has at least N and leads by at least M, **or** the leader has reached the cap C. `applyPoint` in points mode: `currentSet[team] += 1`; if complete then push to `completedSets`, reset `currentSet`, and `matchWon` when `setsToWinMatch` is reached. `validateSetScore` (admin set-result, corrections, disputes) uses the same function, so a typed result and a scored result obey one rule.

Timed matches (`timedMinutes`): at time-out the game in progress is *not* finished mid-rally in points mode; the leader on sets, then on points wins; level = one deciding point (the next point wins), the direct analogue of today's deciding golden-point game. Reuses `timeWinnerTeamIndex`/`endReason`.

## 4. Phases (each ends with tests green; the padel scenarios must stay byte-identical)

1. **Rule model and validation (pure).** `scoringMode`/`pointsToWin`/`winBy`/`pointCap` in `matchRules`, `tournament-state.js` defaults and clamps, `updateTournamentRules`, `validateSetScore`/`isSetComplete` dispatching on mode. Unit tests including bad ranges (cap below N+M-1, N<M).
2. **Point-by-point engine, JS + SQL twin.** `applyPoint` points branch; `save_player_point_impl` gets the same branch in a new migration (`create or replace`, copy of the latest function, so this needs the live definition read first). Extend `scoring-scenarios.json` with points scenarios (21 win by 2 and extended games 22-20, cap 30, win by 1, best of 3, timed, deciding point, undo) run by **both** `test/scoring-rules.test.js` and the PGlite suite.
3. **Typed results, corrections, approval.** SQL validation in `admin_set_result_impl`, `match_result_action` (dispute/correct), `admin_correct_result`, corrections after finish; client `set-score-dialog`, `result-correction-dialog`. PGlite tests per function. Undo stack: unchanged (snapshots the match).
4. **UI.** Create wizard step 2 (a "Scoring" choice: Padel / Points; N, M, cap fields shown for Points), Styring rules form (locked once round 1 exists, as today), `rules.js` text, scoreboard table (POENG shows the running number, no SETT/GAME split for a single game; SETT stays for best-of), large score view, player match panel, TV Mode, translations nb + en.
5. **Statistics and standings check.** Confirm the leaderboard, head-to-head, podium, profile statistics and `finalize_tournament` read points correctly (mostly a verification pass plus fixtures).
6. **Verification and release.** Browser end-to-end in dark and light, desktop and phone: create a points tournament (Round Robin and Cup), score live as admin and as a player on a second session, approval, correction, undo, timed, finish, statistics. Docs, changelog, migration applied live, version bump.

Size: Phases 1-3 are the risky part (live scoring path, two implementations). Phases 4-6 are UI and verification. I would release it as one version after Phase 6 rather than dark-launching the engine, because the engine alone has no user-visible effect and a half-exposed mode is worse than none.

## 5. Risks and how they are contained

- **Regression in padel scoring (the critical path).** Every change is a new branch keyed on `scoringMode === "points"`; padel code paths are not edited, only dispatched to. The 23 existing scenarios plus all 538 tests must pass unchanged at every phase.
- **JS and SQL drift.** One fixture file drives both; a points scenario is not "done" until both pass.
- **Old clients against a new server.** A client without the mode never sends `scoringMode`; the server treats a missing mode as padel. A new-mode tournament opened by an old cached client would misrender: the service worker version bump forces the update, and the create wizard is the only place that can create a points tournament.
- **Live migration.** `save_player_point_impl` is the busiest function. Apply it only after the PGlite suite passes, then run a rolled-back live functional check like the earlier migrations.

## 6. Decisions needed **[D]**

1. Defaults and limits: N default 21 (range 5-99), win-by default 2 (1-5). OK?
2. Hard cap: include in the first version (optional, off by default)? It is small (one comparison) but adds one field to the wizard.
3. "Best of several games" in the first version? It comes almost free through `setsToWinMatch`, but the scoreboard then needs the SETT column for points mode too.
4. Table points in points mode: keep `pointMode` (matches / sets / games) with "games" meaning points scored, or add a dedicated mode? Recommendation: keep as is.
5. Naming in the UI: "Padel (games og sett)" and "Poeng (først til N)". OK, or other wording?
6. Both Round Robin and Cup from day one (recommended; the format does not care how a match is scored)?
7. Timed matches allowed in points mode (recommended yes, rule in section 3)?

## 7. Out of scope but noted

- Cup time overrides stay in 1.x (developer's decision 2026-09-21).
- The standalone multi-sport engine (Priority 3) is easier after this: `scoringMode` becomes the first real ruleset switch.
