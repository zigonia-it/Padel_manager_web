# Tournament logic

Describes the implemented rules. The client (`app/*.js`) and the database functions implement the same rules; the shared scoring scenarios in `test/fixtures/scoring-scenarios.json` are run by both `test/scoring-rules.test.js` and `supabase/tests/scoring-rules.pglite.mjs`.

## Formats

- **Round Robin** (v1.0): every round is generated when the tournament starts (round 1 active, later rounds scheduled). A round can only be advanced when all its matches are finished or cancelled. Points: match points, set points or game points (a setting), with a head-to-head tiebreak between tied players.
- **Cup** (v1.0): bracket with optional third-place match; automatic or manual teams; advancing a round builds the next one from the winners.
- Other modes exist in code (`app/tournament-modes.js`) but are not offered until each is wired to a server-side round function and verified. Liga is a later version.

## Match states

`waiting` → `playing` → `awaitingApproval` → `finished`; also `cancelled` and `awaitingWithdrawalDecision`.

- Courts: a match is started on a free court of its round; when a match ends (or is annulled) its court goes to the next waiting match.
- `awaitingApproval` (player-scored results): the winning point of a player-scored match does not finish it; the court is freed at once and standings wait for the approval.
- `awaitingWithdrawalDecision`: a player withdrew and the match waits for their teammate (see below). No scheduler starts such a match.

## Scoring rules

- Points inside a game: 0/15/30/40, deuce and advantage, or **golden point** (a rule setting).
- A set is won at the configured number of games with a two-game margin; at the tiebreak point a **set tiebreak** is played (rule setting).
- **Timed matches**: a countdown per match; a game that ends after time is up ends the match; if the match is level a **deciding golden-point game** is played.
- Every match keeps a snapshot of the rules it started with.
- Undo/redo: server-side for players (the scorer), a single-step stack for the admin; not allowed for a submitted result.

## Scoring roles and result approval (player scoring)

- One **active scorer** per match: claim, request, transfer, admin override; takeover after 2 minutes offline (heartbeat).
- After the winning point the result is a *draft*; the scorer submits it. One player of **each** team approves (or disputes, optionally with a corrected proposal, max two corrections, then it is flagged for the admin).
- The admin is alerted after 10 minutes and the result is approved automatically after 30 minutes; the admin can approve at any time. If only one team uses the app the result is approved when it is submitted.

## Corrections

The admin can correct a finished result with a mandatory reason (entry error, wrong team, players agreed, referee decision, restore, other + comment), after a consequence simulation (green/yellow/orange/red). The old result is kept in the match's correction history and can be restored (a restore is another correction). Cup results that later matches depend on are protected; nothing can be corrected after the tournament is finished, and statistics are computed from the final state.

### Corrections after the tournament is finished (0.10.0)

A finished (not cancelled) tournament still accepts a correction from the admin. The result and the correction history change; the tournament stays finished and read-only otherwise; the account statistics (matches, wins, sets, games) are recalculated from the corrected results in the same transaction. In a Cup a winner change that later matches depend on is refused. A guest tournament can be corrected only until the 24-hour retention deletes it (guests have no statistics).

## Replacement and withdrawal

- Every player has a structural `slotId`. **Replacement** moves the slot to a new person in every unplayed match; finished matches keep who played; a running match restarts at 0–0 after a warning; a result awaiting approval blocks it. The original can be put back.
- **Withdrawal without a replacement**: the player's finished matches and statistics stay; their unplayed matches are kept and wait for the remaining teammate, who plays alone (1 against 2) or gives a walkover; the admin can decide for them. If nobody is left on that side the opponents win by walkover automatically; a match where players on both teams withdrew is cancelled; a running match is annulled first. A withdrawn player can be put back (not while a match is being played 1 against 2) or replaced. **In a Cup** the same rules apply to the matches of the current round; a team that advances with a withdrawn player meets them when the next round is created (`admin_advance_cup` on the server, `handleNewRound` locally). Both sides of a match affected = the match is cancelled and the best-placed losing team of the round (games difference over the cup, then match order; not a walkover loser, not a team without players) takes the place after the admin confirms (`p_confirm_lucky_loser`).

### Withdrawal in a Cup (decided 2026-09-20, planned for 0.12, not built)

- The same conditions as in a Round Robin: the remaining teammate plays alone or gives a walkover; the admin can decide.
- If all players of one team have withdrawn, a walkover is enforced for the opponents and the bracket advances.
- If both sides of a match have withdrawn, the best-placed losing team takes their place; the admin confirms (proposal for "best-placed": the round reached, then the games difference; to be confirmed in the design).
- Until this is built, use "Bytt" (replacement) in a Cup.

## Statistics

Per tournament and account: matches, wins, sets, games — computed at the finish from the final locked state, and recalculated when a result is corrected after the finish (see `database.md`). Guests get no permanent history.
