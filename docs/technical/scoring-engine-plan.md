# Scoring engine: three configurable levels (Phase 14, built in 0.17.0)

Status: **built and verified in 0.17.0.** The plan of 2026-09-24 was revised the same day after the developer's answers (section 6).

## 1. What it is

One generic engine with three levels, each "**first to N, win by M**", every number 1..999, no hard cap:

| Level | Counts | Fields | Padel/tennis default |
|---|---|---|---|
| Game | points | `gameToWin`, `gameWinBy` | 4 points, win by 2 (0/15/30/40/A); golden point = win by 1 |
| Set | games | `gamesToWinSet`, `setWinBy`, `setDecider` | 6 games, win by 2, then next game (7-5, 7-6) or a tiebreak to 7 |
| Match | sets | `setsToWinMatch`, `matchWinBy` | first to N sets, no margin |

"Tennis and padel" is the default set of numbers. "**Points**" (badminton-like: first to 21, win by 2, best of several games) is the same engine with the game level set to one point, so the "games" of a set are the points and the sets are the games. What is shown (15/30/40/A or plain numbers, the SETT/GAMES/POENG columns) is decided by the UI from the rules: 15/30/40/A only when a game is the classic four points; points mode shows "games won" and "points".

`setDecider`: `nextGame` (legacy: the next game decides at 6-6), `tiebreak` (legacy: tiebreak to 7, win by 2), `continue` (play on until someone leads by `setWinBy`, no cap). Tennis deciders only make sense with `setWinBy` 2; any other margin plays on. Timed matches work in every mode: at time-out the leader on sets, then on games/points wins; level starts a deciding point (the next point wins).

Older tournaments carry only `gamesToWinSet`, `setsToWinMatch`, `gameMode`, `setTiebreak`; `normalizeRules` maps them onto the new rules exactly (`goldenPoint` = `gameWinBy` 1, `setTiebreak` = `tiebreak`). The stored match shape is unchanged (`currentGame`, `currentSet`, `completedSets`), so standings, statistics, corrections, approval and history needed no change: for points matches "games" in the statistics are points.

## 2. Where it lives

- `app/scoring-engine.js`: `normalizeRules` (clamps, legacy mapping), `rulesFromInput` / `rulesInputFromFormData` / `formValuesFromRules` (forms), `isSetComplete`, `validateSetScore`, `validateMatchSets`, `hasMatchWinner`, `applyPoint`/`awardPoint`, `pointLabel`, `finishedSetScores`, `isPointsMatch`.
- SQL twin (`supabase/migrations/20260924120000_generic_scoring_rules.sql`): `_scoring_rules`, `_scoring_set_complete`, `_scoring_match_won`, `save_player_point_impl` reissued, `_approval_validate_proposal(sets, rules)`, and `admin_set_result_impl`, `admin_correct_result_impl`, `match_result_action_impl` patched in place from their live definitions.
- One fixture file, `test/fixtures/scoring-scenarios.json` (37 scenarios), runs against both the JS engine (`test/scoring-rules.test.js`) and the SQL (`supabase/tests/scoring-rules.pglite.mjs`). `supabase/tests/generic-result-rules.pglite.mjs` covers typed results, corrections and disputes.
- UI: `app/scoring-rules-form.js` (Tennis / Points panels in the create wizard and in Styring), `match-card.js` scoreboard, `large-score.js`, `rules.js`, `rendering.js`, `set-score-dialog.js` (quick buttons for short lists, two number fields for long ones), `result-correction*.js`.

## 3. The developer's decisions (2026-09-24)

1. Defaults: game first to 4 points win by 2, set first to 6 games win by 2, match no margin, numbers up to 999; "refer to all sports when deciding".
2. Hard cap: none.
3. Best of several games: yes.
4. Table points: the UI decides what is shown (1 p = 15, 2 p = 30, 3 p = 40, 4 p = win if leading by 2).
5. Wording: "Tennis and points".
6. Round Robin and Cup: every tournament that uses points uses the engine.
7. Timed matches: yes.

Open question sent to the developer: "Match: 3 sets, no margin" is built as the ability to set it (first to N sets); the wizard still defaults to one set per match. Say whether new tournaments should default to best of 3 (first to 2) or first to 3.

## 4. Risks (checked)

- Padel path regression: all 23 legacy scenarios pass byte-identically in JS and SQL; stored numbers are the same because the deuce zone is compacted (4-4 is stored as 3-3).
- JS/SQL drift: one fixture file drives both.
- Old clients against the new server: a client that never sends the new fields is treated as tennis by `_scoring_rules`.
- Live migration: the three patches abort the migration if their target text is not found, so nothing is half-applied.
