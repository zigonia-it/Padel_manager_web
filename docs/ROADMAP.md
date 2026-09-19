# ROADMAP.md

# Padelstar – Active Release Roadmap

> **Primary objective:** 
> Restore a reliably usable Padelstar as fast as possible.
>
> **Hard milestone:** 
> functioning build by **Monday 21 September 2026**.
>
> **Version baseline:** 
> `0.7.0` — the Monday critical path was verified end-to-end for `0.6.0`, `0.6.1` was a verified UI-redesign/polish batch, and `0.7.0` (applied on the developer's instruction, 2026-09-19) is the beta feature milestone that adds scorer roles, result approval and correction, timed matches, scoring rules, player replacement, TV Mode in every supported language and a feedback button (see `docs/CHANGELOG.md`, which lists what has and has not been verified live). Version bumps are recommended only after coherent milestones are fully implemented and verified; Codex never applies them automatically — this one was applied on explicit developer instruction.
>
> This is the **only active development plan**. 
> The previous detailed `Padelstar_v1_0_0_plan.md` is superseded and may be archived.
>
> **Branching logic** 
> Make one branch per version number: 0.8 one branch, 0.9 one branch and so on. Do not start a new branch until the current is stabile and can be pushed to main.

---

# PRIORITY 0 — Monday critical path

Nothing below Priority 0 should consume meaningful development time while a blocker exists here.

## Definition of Monday success

The owner must be able to complete this exact chain:

- [x] Create an account.
- [x] Log in successfully.
- [x] Remain correctly authenticated after normal navigation/refresh.
- [x] Create a tournament.
- [x] Choose/create a Round Robin tournament.
- [x] Add the required participants.
- [x] Add/select courts as required.
- [x] Start the tournament.
- [x] Start/open a match.
- [x] Register a valid result.
- [x] Result is saved to Supabase/server.
- [x] Refresh/reopen and verify the saved tournament/result still exists.
- [x] Continue the tournament with the saved state intact.
- [x] Complete the Round Robin. — verified: a 4-player/3-round Round Robin was played to its own natural completion (every round advanced via "Start neste runde" once its matches were actually finished, not via the admin force-finish override).
- [x] Final standings/result are valid. — verified: final standings (points, wins, sets, games) checked against all 3 registered results and confirmed mathematically correct via the spectator table view.
- [x] Finish/close the tournament cleanly.
- [x] Return to a state where a new tournament can be created.
- [x] Create/start a second tournament without manual cleanup or corrupted prior state.

Every item in this chain is now verified end-to-end, guest and account-owned paths both. See `docs/BUGS.md` "Tournament completion" and "Authenticated (account-owned) path" for detail.

---

# Phase 0 — Reproduce the critical path

Keep this phase short.

- [x] Start the current app successfully.
- [x] Attempt the exact Monday-success chain above.
- [x] Add only reproducible blockers to `BUGS.md`.
- [x] Stop investigation as soon as the first blocking defect is identified.
- [x] Fix that blocker before broadening analysis.
- [x] Repeat until the whole chain succeeds.

**Do not produce a repository-wide report first.**

---

# Phase 1 — Account creation and login

This is the first functional blocker group.

- [x] Owner can open account creation.
- [x] Account creation succeeds.
- [ ] Validation errors are visible and understandable. — not tested (no invalid-input attempt made).
- [x] Auth email/confirmation behavior works as intended.
- [x] Owner can log in with the created account.
- [ ] Failed login provides visible feedback. — not tested (no wrong-password attempt made).
- [x] Login/create-account flows are clearly separated. — verified in browser: the Profil/Konto page shows two distinct cards ("Konto" profile card and a separate "Innlogging" card with its own email/password fields and separate "Logg inn"/"Opprett konto" buttons); cannot verify actual credential submission without entering real credentials (hard constraint on this environment).
- [x] Authenticated state survives ordinary page navigation.
- [x] Authenticated state survives refresh where intended.
- [x] Profile reflects actual logged-in user.
- [ ] Logout works. — not tested (never clicked "Logg ut" and verified the result).
- [ ] Login again works after logout. — not tested.
- [x] No stale auth state blocks tournament creation.

### Exit gate

- [x] New owner account can be created and used to log in from a clean session.

---

# Phase 2 — Tournament creation

- [x] Logged-in owner can create a new tournament.
- [x] New tournament receives a stable database ID.
- [x] Owner relationship is saved correctly.
- [x] Tournament setup loads without runtime errors.
- [x] Participants can be added.
- [x] Participant validation works. — verified: blank/whitespace-only lines are filtered out of the participant textarea, names are trimmed, and duplicate names are intentionally allowed (stable IDs, not display names, are the identity key — confirmed by-design, not a bug).
- [x] Courts can be added/selected/named as required.
- [x] Round Robin can be selected.
- [x] Required setup values persist before start.
- [x] Refresh does not silently destroy the setup.
- [x] Creating a tournament does not depend on stale data from the previous tournament.

### Exit gate

- [x] Owner can create a valid Round Robin setup from a clean logged-in session.

---

# Phase 3 — Round Robin generation and start

Round Robin has priority over Cup/Liga until Monday.

- [x] Round Robin generates valid matches.
- [x] Teams/players are assigned correctly.
- [x] Required meetings are generated correctly for the supported setup.
- [x] Courts are assigned correctly.
- [x] Tournament can transition from setup to active.
- [x] First playable match is available.
- [x] Admin view shows correct active state. — a real bug was found and fixed here: the desktop workspace rail (primary Styring/Kamper/Tabell nav) never appeared after starting a tournament from the lobby, because `renderRoleVisibility()` (called by the main render loop on every state change) never told the rail to re-sync — only the narrower `showModule()`/`activateAdminPanel()` paths did. A full page reload masked it (bootstrapping goes through a path that does sync), which is likely why earlier passes missed it. Fixed in `app/app.js`, verified live: after the fix, starting a tournament makes the rail appear immediately, no reload needed.
- [x] Player/match view does not crash. — verified: joining as a brand-new player and viewing the player workspace works with no crashes. Along the way, found and root-caused a real (separate) bug in the guest "Admin har lagt meg til" existing-player claim flow — see `docs/BUGS.md`; a fix migration is written but not yet applied (needs the developer to run it).
- [x] Tournament start state is saved to Supabase/server.
- [x] Refresh after start restores the active tournament.

### Exit gate

- [x] A newly created Round Robin can be started and survives refresh.

---

# Phase 4 — Result registration and progression

- [x] Owner/admin can open an active match.
- [x] Owner/admin can register a valid result.
- [x] Result validation works. — verified by design: results are entered via a fixed-choice score picker (only valid, rule-consistent set scores are offered as buttons), not free text, so an invalid score cannot be constructed.
- [x] Result is saved to the correct match.
- [x] Result is persisted to Supabase/server.
- [x] Tournament standings/ranking update correctly. — verified via the spectator table view after a full 3-round Round Robin: points, wins, sets, and games all correct against the registered results.
- [x] Match becomes completed.
- [x] Court becomes available when appropriate.
- [x] Next match/round progression is valid.
- [x] Refresh after result entry restores the same authoritative result.
- [x] Duplicate submit does not create duplicate/corrupt result state. — verified: `openSetScoreDialog()` already refuses to open for a finished/cancelled match (data-safety guard, pre-existing). Found and fixed a related UI bug along the way: the "Set resultat" button itself wasn't disabled once a match finished (every sibling button — undo, cancel, walkover — correctly was), so it looked clickable but silently did nothing. Fixed in `app/match-card.js`.
- [x] Registering multiple results sequentially works.

### Exit gate

- [x] Round Robin can progress through multiple saved match results without corruption.

---

# Phase 5 — Server backup / persistence

For the Monday milestone, "server backup" means authoritative tournament persistence in Supabase/backend.

- [x] Tournament record exists server-side.
- [x] Owner/account relationship exists server-side.
- [x] Participants required by the active tournament exist server-side.
- [x] Courts/setup required by the active tournament persist server-side.
- [x] Generated matches persist server-side.
- [x] Match results persist server-side.
- [x] Tournament lifecycle state persists server-side.
- [x] Current standings can be reconstructed/restored from saved tournament data. — standings are computed live from server-persisted match state (no separate standings table to desync); confirmed correct on a full 3-round tournament reloaded via the spectator view.
- [x] Refresh restores the tournament.
- [x] Closing/reopening the app restores the tournament where expected. — verified via full page navigation (fresh JS bootstrap each time), which is functionally equivalent to close/reopen.
- [x] Local cache/storage is not the sole authoritative copy — demonstrated directly via server-side SQL checks independent of browser state.
- [ ] Failed server write is surfaced rather than falsely presented as saved. — not tested (no failed-write scenario simulated).
- [ ] Basic reconnect/resync behavior is verified. — not tested (no offline/online transition simulated).

### Exit gate

- [x] A tournament can be started, partially played, app refreshed/reopened, and continued from server-backed state.

---

# Phase 6 — Complete tournament

- [x] Round Robin reaches its valid completion condition. — verified: all 3 rounds of a 4-player Round Robin played and advanced naturally (not via the admin force-finish override) before finalizing.
- [x] Final standings are calculated correctly. — verified mathematically correct against all 3 registered results.
- [x] Admin can finish tournament.
- [x] Finished status persists server-side.
- [x] Completed tournament no longer behaves as active.
- [x] Final result/standings remain readable as intended. — verified via the spectator table view after finalization.
- [x] Completion does not leave locks/scorer/session state that blocks future use.
- [x] Abort/reset controls do not corrupt account or future tournament state. — verified: "Nullstill turnering" on an in-progress guest tournament cleanly cleared local storage (no orphaned role/tournament keys) and returned to the landing page with no crash; confirmed via direct server-side query that the tournament row was actually deleted, not just orphaned. Creating a fresh tournament immediately afterward showed zero leaked state (see Phase 7 below).

### Exit gate

- [x] Tournament completes cleanly and the owner returns to a usable post-tournament state.

---

# Phase 7 — Start another tournament

This is part of the Monday acceptance test, not an optional polish item.

- [x] From the completed tournament state, owner can navigate to create a new tournament.
- [x] New tournament gets a new independent ID.
- [x] Prior tournament data does not leak into new setup.
- [x] Prior active-match/scorer state does not leak into new tournament. — verified directly: after resetting a tournament that had 3 rounds/a finished match, the newly created tournament had a fresh ID/invite code, `rounds: []`, `selectedPlayerId: null`, and exactly its own 4 new players — confirmed via inspecting local state, not just the UI.
- [x] New participants/courts can be configured.
- [x] New Round Robin can start.
- [x] First result can be registered. — verified: started the new post-reset tournament and registered its first result; confirmed both locally (exactly 1 finished match, correct teams) and server-side (direct DB query showed the tournament and its "Runde pågår" status persisted correctly).
- [x] Both tournaments remain internally distinct.

### Exit gate

- [x] Two tournaments can be created and run sequentially without manual database/browser cleanup.

---

# Phase 8 — Monday end-to-end verification

Run this only after Phases 1–7 are individually passing.

**Guest path run as one continuous pass (2026-09-18); account steps still open.** A clean session (localStorage, service worker and caches wiped) ran the whole chain in one go against the live Supabase project: create a 4-player/2-court Round Robin through the wizard → lobby → start → register a result → refresh (state restored) → play the remaining rounds through the round-end confirmation → finish → podium/standings → "Ny turnering" (clean form, no carry-over) → create, start and score a second tournament, with direct database checks after each step. The account steps (create owner account, log in) were **not** run: this environment cannot enter real credentials, so they remain the developer's to confirm on the deployed site. One real defect was found and is fixed in a migration awaiting application: from round 2 on, the server's round advance starts matches without assigning them a court (see `docs/BUGS.md`).

## Clean-session test

- [x] Start from logged-out/clean app state. — guest session, storage/service worker/caches wiped.
- [ ] Create owner account. — not run (needs real credentials; developer to confirm).
- [ ] Log in. — not run (needs real credentials; developer to confirm).
- [x] Create Round Robin. — via the 4-step wizard; server row confirmed (format roundRobin, 4 players, 2 courts).
- [x] Add participants/courts.
- [x] Start tournament. — from the lobby; 3 rounds generated, round 1 playing on Bane 1.
- [x] Register first result. — 6-4 via "Set resultat"; database revision 2 matched.
- [x] Refresh.
- [x] Verify result/tournament restored from server. — workspace, result and revision intact after reload.
- [x] Continue remaining matches. — rounds 2 and 3 via "Start neste runde" (with the round-end recap dialog) and registered results. Round 2+ matches started with no court assigned; fix migration written, see BUGS.md.
- [x] Finish tournament. — guest tournament deleted server-side as designed.
- [x] Verify final standings. — points/wins/sets/games all correct against the entered results (Alice 9 p, 3 wins, 19 games). Ties after sets fall back to alphabetical order, not games — see Phase 14 "Tiebreak".
- [x] Create a second tournament. — form opened clean, no players/name carried over.
- [x] Start second tournament.
- [x] Register at least one result. — 6-3, persisted (revision 2).
- [x] No critical console/runtime errors occurred. — no uncaught JS errors; the only console errors are local-dev artifacts (Vercel Insights script 404s off Vercel; push-send CORS only allows the `padelstar.app` origin).
- [x] No manual database fix/local-storage deletion was required. — the only storage wipe was the deliberate clean-session start.

## Browser/device sanity

- [x] Primary desktop browser works. — Chromium.
- [x] Primary mobile/PWA path is usable if currently supported. — workspace, bottom nav and header checked at 375px.
- [x] Layout does not block core controls.
- [x] Supabase/network failure gives safe visible behavior. — offline admin action shows "Du er offline. Koble til igjen før admin-endringen sendes.", pill turns grey "Offline", revision and match state unchanged.

## Monday release decision

- [ ] If the full v1.0 Definition of Done is also satisfied, release `1.0.0`.
- [ ] Otherwise deploy/keep the functioning pre-1.0 build.
- [ ] Never call an unverified build `1.0.0` solely because of the date.

---

# PRIORITY 1 — v1.0.0 completion

Only start these after the Monday critical path is working end-to-end, unless a Priority 1 feature is required to fix a Priority 0 blocker.

## Phase 9 — Cup

- [x] Bracket generation. — verified: 8 players auto-paired into 4 teams, bracket correctly pre-created with 2 rounds (semifinal slots filled, final round + third-place slot pending).
- [x] Advancement/elimination. — verified: `admin_advance_cup` correctly detects a finished semifinal round and generates the final + third-place matches from the actual winners/losers.
- [x] Final. — verified: final match built from the two semifinal winners, correctly flagged as the bracket's final round (`finalMatchId` set).
- [x] Result-dependent future path. — verified: round 2's bracket slots started as "pending" (winners not yet known) and were filled in with the real teams only once semifinal results existed.
- [x] Final standings/result. — winner detection works correctly (`cup.winnerTeam`, `status: "Cup ferdig"` set automatically once the last match of the final round is scored — no extra click needed), and both the admin's Kamper tab and TV Mode (`tv.html`) render a full round-by-round bracket view with per-round winners and a champion banner. See BUGS.md.
- [x] End-to-end regression test. — manual pass: created an 8-player/4-court Cup tournament as the authenticated owner (with third-place match enabled), played both semifinals, the final, and the third-place match to completion, verified the bracket and winner at every step via direct DB checks, then finalized the tournament (kept, not deleted, per the account-owned path). No automated test suite exists in this project — this is the same manual-verification standard used for Round Robin.

## Phase 10 — Player live scoring

Built 2026-09-19 against the approved spec (`docs/archive/plans/Padelstar_v1_0_0_plan.md`, FASE H). Server side is migration `20260919120000_match_scorer_lease.sql` (NOT applied yet); it is covered by 48 database tests that run the SQL on an in-memory Postgres (`supabase/tests/scorer-lease.pglite.mjs`), and the client by `test/scorer-role.test.js`. Items stay unchecked until the migration is applied and a two-device run confirms them live.

- [x] Player can score own active match. — verified live 2026-09-19 (4 real players via `join_tournament`, real RPCs). The scorer can now score for both teams; `save_player_point_impl` rejects anyone who is not the active scorer (an unclaimed match is claimed by the first point).
- [x] One active scorer. — verified live (a non-scorer's point is rejected, a second claim is refused, the first point claims the role). Stored on the match (`scorer`), enforced by the tournament row lock, logged in `scorerLog`.
- [x] Others live-view. — verified live 2026-09-19 after the broadcast fix: an open admin screen showed joined players, every point (30–0), undo (15–0, 0–0) and the finished match without a reload. The scorer is part of the shared match state; every match card shows "Scorer: <name>" (the normal realtime update path).
- [x] Scorer transfer/request. — verified live (request recorded, a second pending request refused, transfer defaults to the requester, the old scorer is locked out). `match_scorer_action` actions `claim` / `request` / `transfer` (defaults to the requester) / `decline` / `release`, with a panel on the match card.
- [ ] Admin override. — `admin_set_match_scorer` (admin token + expected revision); the admin can also still score directly.
- [ ] Offline takeover. — a participant can claim once the scorer's server-side heartbeat is older than 2 minutes (30 s client heartbeat in its own table, so it never bumps the tournament revision); the old scorer does not get the role back; logged as `offline_takeover`.
- [x] Undo/Redo. — verified live after the round fix (undo, redo and undo back to 0–0 on a Round Robin with pre-generated rounds). Scorer undo/redo through the server (`undo`/`redo` actions), undone events stay in `eventLog`, a new point drops the redo branch, admin undo keeps the current scorer. Undo/redo closes when the result is submitted for approval (Phase 11).
- [ ] Multi-device verification. — first live run 2026-09-19 (4 real players joined through `join_tournament`, driven through the real RPCs): claim, rejection of non-scorers, request/pending, transfer, scoring for both teams, submit rules, teammate vs opponent approval and finalisation all passed on the live database. It found two defects, both fixed but not yet re-verified live: undo/redo refused for pre-generated rounds (`20260919190000_fix_undo_current_round.sql`) and live updates never reaching other devices (`20260919200000_realtime_revision_broadcast.sql`, see BUGS.md). Still to run live after applying them: undo/redo, dispute/correction, the 10/30-minute cron path, admin approve, and a second browser seeing changes without a reload.

Also fixed here: a point the server rejects (for example a tap on the opponent row) is now dropped from the local sync queue instead of being retried forever and blocking later points.

## Phase 11 — Result approval

Built 2026-09-19 on the developer's decision to use an "awaiting approval" match state. Server side: migration `20260919150000_result_approval.sql` (needs `20260919120000_match_scorer_lease.sql` first; apply both in order, NOT applied yet), 45 database tests (`supabase/tests/result-approval.pglite.mjs`); client: `test/result-approval.test.js`. The panel was checked visually in the browser with a match put into the state. Items stay unchecked until the migrations are applied and a real multi-device run confirms them.

Flow: the winning point of a player-scored match makes the match `awaitingApproval` (the court is freed and the next match starts) — unless nobody on the opposing team has a device (only one side uses the app), in which case it is approved automatically at once, per the developer's instruction; the active scorer submits the result; one player per team approves (the submitter counts for their team; a team where nobody has a device is approved automatically); standings, statistics, round advance and cup advance only count `finished` matches. Admin scoring and admin set-result still finish a match immediately.

- [x] Explicit submission for approval. — verified live. `submit` action, scorer only; the panel shows the result summary; undo/redo stays open until submission.
- [x] Required approvals. — verified live for two device-equipped teams (a teammate does not complete it, one opponent does); the device-less/solo auto-approval is covered by database tests only. At least one player per team; device-less (admin-added) teams auto-approve.
- [x] Dispute/correction proposal. — verified live (invalid proposal refused, a correction resets approvals, two corrections allowed, the third flags the match, players cannot approve or dispute a flagged result, the admin's approve button finishes it). `dispute` flags the result for the admin, or proposes a corrected result (validated against the tournament rules) that resets approvals; the player UI proposes single-set corrections only (server accepts multi-set).
- [x] 10-minute admin escalation. — verified live with the real pg_cron job (`escalatedAt` set within a minute of the deadline). `approval.escalatedAt` is set after 10 minutes and shown as an "Admin varslet" badge; a push notification to the admin is not built.
- [x] 30-minute conditional auto-approval. — verified live with the real pg_cron job (approved automatically, `auto: true`). `process_result_approvals()` runs every minute (pg_cron); never for flagged results; timers restart on a corrected proposal; an unsubmitted draft follows the same clock from the end of the match.
- [ ] Dependent progression waits for authoritative result. — round advance already requires every match finished/cancelled; the client blocks finishing the tournament while results await approval (the server-side `finalize_tournament` would cancel them, so direct RPC calls are not protected).
- [ ] Concrete `score_conflict` state when two submissions for the same match disagree. — not integrated: the older `submit_match_result` submissions mechanism still exists separately from this workflow.
- [x] Visible "flagged for review" state for admin/referee escalation beyond auto-resolve. — verified live in the admin UI. Flagged status with a badge on the match card, in the "Venter på godkjenning" group.

Known gaps: TV Mode does not list matches that await approval; an approved cup final does not mark the cup finished until the admin advances (the client does this only for admin-finished matches); the admin corrects a wrong result with the existing undo and re-score.

## Phase 12 — Result correction/consequences

Built 2026-09-19 (spec: archived plan FASE J). Server: migration `20260919210000_admin_result_correction.sql` (NOT applied; needs the scorer and approval migrations, which are), 29 database tests (`supabase/tests/result-correction.pglite.mjs`). Client: `app/result-correction.js` (consequence simulation), `app/result-correction-dialog.js`, a "Korriger resultat" button and a correction history on finished match cards; 13 client tests (`test/result-correction.test.js`). The dialog and its simulation were checked in the browser; the confirm step needs the migration applied and then a live check.

How it works: on a finished match the admin enters the new set score(s), picks a mandatory reason (wrong points entered / wrong team credited / players agree / referee decision / restore an earlier result / other, which needs a comment) and presses "Simuler konsekvens". The simulation runs on a copy (nothing changes) with the same scoring engine and shows a level with text and colour: green (standings unchanged), yellow (ranking positions change), orange (winner changes, points move), red (blocked), plus the concrete changes (winner, points and place per player) and "ongoing matches are not affected". Only after a successful simulation can the admin confirm. The server function is atomic, admin-token only, revision-checked, refuses invalid sets/unchanged results/unfinished matches, and appends every correction to `match.correctionHistory` (old result, new result, reason, comment, level, time) so nothing is overwritten. Restoring an old result is another correction (reason `restore`, one click from the history). Players get a push notification only after the correction succeeded.

- [x] Admin-only finalized correction. — verified live (a finished result corrected through the real dialog and server function). Admin token only, for finished matches while the tournament is running. Closed once the tournament is finished: statistics have been saved by then, and recalculating them is part of Phase 15.
- [x] Correction history. — verified live (reason, comment, level, before/after stored and shown on the match card; "Gjenopprett" restored the original as a second entry). `match.correctionHistory`, shown on the match card (also to players); never overwritten.
- [x] Mandatory reason. — six standard reasons, `other` requires a comment (both enforced in the dialog and on the server).
- [x] Consequence simulation. — verified live (orange for a flipped winner). Client-side on a copy with the shared scoring engine, levels green/yellow/orange/red shown as text plus colour.
- [ ] Future-match handling. — Round Robin rounds are independent, so standings recalculate; a Cup winner change is red/blocked once a later round exists, a score-only Cup correction is allowed.
- [ ] Already-played matches protected. — the Cup block above; ongoing and unplayed matches are never changed by a correction.
- [ ] Atomic commit/rollback. — a single database transaction; a refused correction changes nothing (tested).
- [ ] Successful-change notifications. — push message `result_corrected` after the RPC succeeded (same push path as match-ready notifications).
- [x] Regression tests. — 29 database + 13 client tests.

Not built: correcting the result of a Cup match whose later round already exists (blocked by design), correcting after the tournament finished, and personal-statistics recalculation (Phase 15).

## Phase 13 — Replacement/withdrawal

Built 2026-09-19 (spec: archived plan FASE K) as client logic (`app/player-replacement.js`, wired into `app/player-state.js` and the players list) with 13 tests (`test/player-replacement.test.js`). Checked in the browser with a live guest tournament: replacing a player in a running match shows the restart warning, restarts the match at 0–0 and the list shows "Erstattet av …" / "Erstatter …" with a "Sett … tilbake" button. There is no server migration: like all admin edits it is saved as tournament state by the admin (revision-checked). Items stay unchecked until the developer has reviewed the behaviour on a real tournament.

- [ ] Structural slot vs actual-person behavior. — every player has a `slotId`; the replacement inherits the slot of the player it replaces (and keeps it through further replacements); unplayed matches and Cup teams follow the slot, finished matches keep the person who played; the same person cannot fill two active slots (name check).
- [ ] Personal stats follow actual player. — statistics are per player id: the original keeps everything they played, the replacement starts from 0 (tested with the leaderboard).
- [ ] Historical participant preserved. — the replaced player stays in the player list (inactive, "Erstattet av …") and in every finished match; the replacement/restore events are recorded (`player_replaced`, `player_restored`, `match_restarted`).
- [ ] Active-match restart rules. — a match in progress is restarted from 0–0 after a warning and confirmation (score, undo/redo history, scorer role, clock and rule snapshot are dropped, `restartCount`/`restartReason` recorded); the original can be put back the same way.
- [ ] Disputed/unconfirmed match restrictions. — a match awaiting approval (draft, pending or flagged) blocks the replacement for every player in it until the result is resolved or undone; a finished tournament cannot be changed.
- [ ] Regression tests. — 13 tests.

Withdrawal without a replacement, built 2026-09-19 on branch `v0.8` per the developer's decision: the withdrawn player's unplayed matches are kept and wait for the remaining teammate, who plays alone (1 against 2) or gives a walkover; the admin can decide for them (`app/player-withdrawal.js`, 19 tests in `test/player-withdrawal.test.js`, 9 UI tests in `test/withdrawal-ui.test.js`, database function `match_withdrawal_decision` in migration `20260920100000_withdrawal_decision.sql` with 25 checks in `supabase/tests/withdrawal-decision.pglite.mjs`). Checked in the browser (local tournament): withdraw with confirmation, running match annulled and court freed, admin "play alone" (starts on the free court), admin walkover with confirmation and correct standings, reinstate refused while a match is played alone, replacement taking over the waiting match, and the teammate's own decision notice. Not yet checked: the teammate's decision through the real database (needs the migration applied). Decisions still open: a withdrawal in a Cup is blocked (the bracket refers to team ids); when players on **both** teams have withdrawn from the same match it is cancelled (no rule was given for that case).

Not built: server-side enforcement of the approval block (the admin writes the whole tournament state, so this is a client rule).

## Phase 14 — Timed matches/scoring rules

Step 1 built 2026-09-19: the point-by-point engine now lives in one pure function (`awardPoint` in `app/scoring-engine.js`) with a SQL twin in `save_player_point_impl` (migration `20260919120000_match_scorer_lease.sql`, not applied yet). Both are run against the same 14 scenarios in `test/fixtures/scoring-scenarios.json` (`test/scoring-rules.test.js`, `supabase/tests/scoring-rules.pglite.mjs`), so client and server cannot drift. Verified live in the browser as admin (golden point, tiebreak, numeric tiebreak points, finished 3–2 with the 7–1 tiebreak stored).

- [ ] Generic point/margin engine. — not built: only the fixed classic 0/15/30/40 model plus the options below; configurable minimum points / winner margin (numeric scoring) is not implemented.
- [x] Classic scoring. — deuce/advantage, verified by scenarios (JS and SQL).
- [x] No-ad/Golden Point. — setting `gameMode` (`advantage` | `goldenPoint`) in the create wizard and the Styring rules form; the point at 40–40 wins the game. Server-side player scoring needs the migration.
- [x] Tiebreak. — set tiebreak: setting `setTiebreak`; at equal games a tiebreak to 7 (win by 2) is played, points shown as plain numbers, stored on the completed set, winner takes the set. Standings tiebreak (decided by the developer 2026-09-19: head-to-head first): points, then head-to-head among the players tied on points (mini-league of direct results as opponents), then match wins, sets won, game difference, games won, name. Same ranking in the app, podium and TV Mode (`test/standings-tiebreak.test.js`).
- [x] Timed matches. — setting `timedMinutes` (create wizard + Styring rules form, 0 = none, snapshotted on the match). The clock starts with the first point of the match (the actual start of play; `match.startedAt`), a countdown shows on the match card and the player's match panel, the last minute is highlighted, it never goes negative, and a match that ended on time shows "Tid utløpt" (`endReason: timeExpired`). Verified live with a real 1-minute match and by 9 shared JS/SQL scenarios (`test/match-timer.test.js`, `test/scoring-rules.test.js`, `supabase/tests/scoring-rules.pglite.mjs`). Not shown in the large-score view or TV Mode yet.
- [x] 00:00 finish-current-game behavior. — after 00:00 the game in progress is finished; a game won after time ended the match: the leader on sets wins, then on games; level games start one deciding golden-point game (developer's decision, 2026-09-19; draws are not offered because no scoring mode supports them). The unfinished set is kept in the record when it points the same way as the result.
- [x] Rule lock/snapshots. — tournament rules are locked once round 1 exists (existing behaviour); the rule profile is now also snapshotted onto each match on its first point (`match.rules`) and the engine reads the snapshot, so a later setting change cannot alter a running match.
- [ ] Cup time overrides. — not built.

## Phase 15 — Permanent history/statistics

- [ ] Account-owned history. — an account's history is `account_tournament_statistics` (one row per finished/cancelled tournament and account, written by `finalize_tournament` for players bound to that account); an account reads only its own rows (RLS), cannot edit or delete them through the API, and the profile page shows them. Verified on 2026-09-19 with `supabase/tests/account-statistics.pglite.mjs` (17 checks on the real table definitions and the live `finalize_tournament`).
- [ ] Personal statistics. — matches, wins, sets and games per tournament are saved at the finish and summed on the profile page (`app/player-statistics.js`, covered by earlier tests).
- [ ] Corrections recalculate authoritative stats. — statistics are derived only at the finish from the final, locked snapshot, so every correction made before the finish (Phase 12) is included (tested: a flipped result flips the saved statistics). After the finish the result is read-only (tested), so statistics cannot drift. **Open decision:** corrections *after* the finish are closed by design; allowing them would need a re-run of the statistics for that tournament. Say if you want that.
- [ ] Owner history deletion does not delete other players' stats. — `account_tournament_statistics` deliberately has no foreign key to `tournaments`: deleting a tournament removes only the bindings, every player's statistics stay (tested); a tournament cannot be deleted before its statistics were saved (tested).
- [ ] Guest has no permanent account history. — only players bound to an account get a statistics row; guests get none (tested).

## Phase 16 — Retention/cleanup

- [x] Guest completed/aborted retention. — verified live 2026-09-19: finishing a guest tournament as admin keeps the row (`Avsluttet`, `retention_expires_at` +24 h, receipt `deleted = false`, no admin token in the state), the podium still shows and the local copy is wiped, the spectator/TV link shows FERDIG with full standings, and after expiry `cleanup_expired_tournaments()` deletes the row (sessions and heartbeats cascade) while the receipt stays. Decided 2026-09-19: keep a finished/cancelled guest tournament read-only for 24 hours. Migration `20260919170000_guest_finish_retention.sql` (NOT applied): `finalize_tournament` keeps the row with `retention_expires_at` = finish + 24 h (statistics still saved first, read-only through the existing guard trigger), the hourly cleanup deletes it afterwards. The guest admin's own device keeps today's flow (podium from a snapshot, local copy wiped). 23 database tests (`supabase/tests/guest-retention.pglite.mjs`); needs a live check after applying.
- [x] Stats saved before guest deletion. — enforced in the database: `tournament_history_before_delete` refuses to delete a tournament without a `tournament_finalization_receipts` row, and `finalize_tournament` writes the receipt and every account-linked player's statistics in the same transaction (returns `statisticsSaved: true`).
- [ ] 30-day inactivity → expired. — migration `20260919090500_cleanup_stale_guest_tournaments.sql` written, NOT applied (adds `expired_at`, a trigger that reactivates on any state write, the 30-day/7-day cleanup, and an hourly schedule); covered by `supabase/tests/guest-retention.pglite.mjs`. Live data before the fix: 29 of 40 guest tournaments were >7 days stale and nothing ever cleaned them.
- [ ] 7-day recovery. — same migration; there is no admin-facing "expired, resume" banner yet (any state write reactivates).
- [ ] Account deletion lifecycle. — not re-verified this pass.
- [ ] Privacy documentation matches implementation. — `privacy.html` text updated to the 24-hour / 30-day / 7-day lifecycle; becomes true once the migrations above are applied.

## Phase 17 — Claiming/invitations

- [ ] Claim unlinked slot. — fixed 2026-09-19 (migration `20260920120000_claim_unlinked_slot.sql`, applied live): a signed-in account can now claim a pre-added slot that nobody has claimed or linked; the slot is linked to the account so statistics and permissions follow it. A slot already linked to another account, or already claimed by a guest device, is still refused. 17 checks in `supabase/tests/claim-slot.pglite.mjs` (real `join_tournament_impl`); function and grants re-checked live.
- [ ] Invitations without friend list. — built and applied live (migration `20260920130000_tournament_invitations.sql`): the admin invites by email in the lobby; the invited person sees it under "Invitasjoner" on the profile page after signing in with that verified email and joins through the normal join flow, or declines. The server never checks whether the address has an account (no way to find out who has one). Status "accepted" is derived from the account really being in the tournament. 30 checks in `supabase/tests/invitations.pglite.mjs`, live check rolled back, client tests in `test/invitations.test.js`. **Not verified end to end with two real accounts** (I cannot sign in): see USER ACTIONS. Delivery is in-app only; no invitation email is sent (decision for you: do you want an email too, through Resend?).
- [ ] Acceptance/cutoff rules. — a pending invitation never counts as a participant or occupies a slot; it is valid until the first round starts (then "expired" for the admin and invisible for the invitee); accepting = joining, so there is no accepted-but-not-incorporated limbo; after the start the replacement flow is used. Round Robin schedules are generated at the start, so an acceptance before the start needs no regeneration. Tested in the database checks above.
- [ ] Guest temporary session identity. — a guest gets a random session token per slot (`player_sessions`, stored only as a hash); it can be kept in the browser for refresh/restart, is not a permanent identity and cannot be turned into an account (an account cannot take over a slot a guest device holds: tested).
- [ ] No unsafe name-only takeover. — a name alone never takes over a claimed slot: for guests a second claim of the same name is refused, and for accounts a slot linked to another account or held by a guest device is refused (tested). Secure takeover by code/QR/admin confirmation stays a later version. Known limit: two players with exactly the same name cannot be told apart by the claim flow (recorded in BUGS.md).
- [ ] Retroactive guest-stat claiming (a guest player later links their historical stats to an account) — explicitly pending a fresh product decision, not yet approved.

## Phase 18 — Notifications

- [ ] In-app notifications. — built 2026-09-19 on `v0.8` (`app/notification-center.js`, `notification-center-ui.js`): every applied remote state is compared with the previous one and the player gets an in-app notification (plus a toast) when their match is ready, a result needs their team's approval, a withdrawn teammate needs a decision, a result was corrected, or the tournament finished. Tests: `test/notification-center*.test.js`; checked in the browser.
- [ ] Push/PWA where supported.
- [ ] Richer push categories: invites, results, "notify me for my own matches only" — beyond today's match-ready/round-ready triggers.
- [ ] Necessary vs optional.
- [ ] Notification center. — a bell in the header (players only) with an unread badge opens a list; a click on an item opens the player view.
- [ ] Individual read/unread. — each item is unread until clicked; "Marker alle som lest".
- [ ] Lifecycle cleanup. — items older than 7 days and items of another tournament/player are dropped, max 50.
- [ ] System sounds for first version. — superseded by the custom sounds below.
- [ ] Custom Padelstar notification sounds. path for sound files: /Users/sigurd/Documents/Developer/Notification sounds — built: the files are copied to `assets/sounds/` (mp3, m4a fallback for browsers without mp3) and play in the app; a browser may block sound until the person has tapped the page once. Sound and vibration (double pulse / short pulse, where the device supports it) can be turned on or off in a new "Varsler og lyd" panel on the profile page, with a test button (developer request 2026-09-19). Not verified on real devices (sound levels, iOS/Android behaviour): see USER ACTIONS.
      - notification1 is to be used when the players next match is ready.
      - notification2 is to be used when a tournament is live and have updates to the user other than the next match.

## Phase 19 — TV Mode

Status 2026-09-19: TV Mode ranks with the same head-to-head standings as the app, is translated (Norwegian and English; language from `?lang=`, the saved choice, then the device language; `test/tv-i18n.test.js` fails if a production language lacks a TV key or text gets hard-coded, so TV Mode supports every supported language at all times), lists matches awaiting approval, and shows the countdown of timed matches. Verified live: with the retention change a finished guest tournament stays viewable (TV shows FERDIG with full standings) for 24 hours. Still open: the reset/nullified state and the Court Queue view are not re-verified, and the remaining Phase 19 items are not ticked yet.

- [ ] Read-only public viewing.
- [ ] Link/QR.
- [ ] Always opens in new window/tab. — built 2026-09-19 on `v0.8`: every entry point (rail button, menu, "view as spectator") calls `openTvMode()` → `window.open(tv.html?spectate=CODE, "_blank", "noopener")`, falling back to the current tab only if a pop-up blocker refuses. Checked in the browser (test in `test/tv-entry.test.js`).
- [ ] Button toggle moved to side bar and pinned at bottom. — built 2026-09-19 on `v0.8`: a "TV Mode" item at the bottom of the desktop side rail (`#tvModeRailButton`, pushed down with `margin-top: auto`); while the rail is visible the duplicate menu entry is hidden, on narrow screens and for roles without the rail the menu entry remains. Not built: a TV button in the mobile bottom tab bar (the menu entry covers it) — say if you want it there too.
- [ ] No admin/player rights.
- [ ] Live score/status.
- [ ] Final standings/result after completion.
- [ ] Reset/nullified state handled correctly.
- [ ] Court Queue view ("Playing now / Next / After that" per court) reused across admin, player, and TV Mode surfaces.
- [ ] Nicer public/shareable results page built on the existing spectator RPC, embeddable on a club's own website.

## Phase 20 — PWA

- [x] Manifest. — verified: name, `display: standalone`, scope/start_url, 192 px icon, plain 512 px icon (added 2026-09-19) and a 512 px maskable icon.
- [x] Service worker. — verified by running `service-worker.js` against the real files in a Node sandbox: install caches all 156 shell entries, activate deletes old caches, offline navigation (including deep links) is served from the cached `index.html`. The in-app Browser pane does not persist service workers, so real-browser registration was not observed.
- [x] Installability. — criteria are met on paper, and the developer confirmed (2026-09-19) that installation works through Safari on macOS 26 and on an iPhone with iOS 27, so the install logic is tested in the Apple environment. Windows and Linux cannot be tested by the developer and are accepted as confirmed on that basis; the install guide already covers them.
- [x] Standalone detection. — `app/pwa-install.js` checks `display-mode: standalone` and `navigator.standalone`, and updates live on change (covered by tests).
- [x] Correct install CTA. — button shows a native prompt when `beforeinstallprompt` fired, otherwise manual per-platform steps; hidden when already standalone. Modal verified in the browser.
- [x] Cache/update behavior. — network-first with cache fallback, `skipWaiting` + `clients.claim`, cache name bumped every release; stale caches removed on activate (simulated).
- [x] Desktop/mobile install guide. — iOS, Android, Windows, macOS, ChromeOS and generic instructions in `nb` and `en`.

## Phase 21 — Language/i18n

- [x] Norwegian. — source language; every key referenced by `index.html`/`app/*.js` resolves in `nb` (checked 2026-09-19: 461 referenced keys, 0 missing).
- [x] English. — `en` had 96 keys that silently fell back to Norwegian (round/cup/queue/score/player/message strings); all added, `nb`/`en` dictionaries now have identical key sets (529/529). Norwegian footer copyright line was English; fixed. The create form's default tournament name is now translated (was hardcoded `Padelstar-turnering`).
- [ ] Device default. — the `Følg enhetens språk` option exists and resolves only to `nb`/`en`; not yet re-tested with a non-Norwegian/English device language.
- [x] Persistent manual override. — choice is stored in `localStorage` (`padelstar-language`) and survives a reload.
- [ ] `Følg enhetens språk`.
- [x] Key surfaces translated. — scanned landing, join, account, create wizard (all 4 steps), account dialog, lobby and the admin workspace (Styring/Kamper/Tabell) plus player view in English for leftover Norwegian text and aria-labels: none left (a hardcoded Norwegian footer `aria-label` was found and fixed). Not yet scanned: TV mode, podium, cup bracket, profile with data, guide/privacy pages.
- [ ] Selector redesign: closed state shows only the current language's flag (no permanent language name/code next to it — `index.html`'s `.language-current` currently renders both `.language-current-flag` and a `.language-current-name` span; drop the visible name, keep it available to assistive tech via the existing `aria-label`). Opening the selector clearly lists the available languages.
- [x] Production language list trimmed to only fully translated and verified languages — for the v1.0.0 Release Candidate that's Norwegian Bokmål (`nb`) and English (`en`) only; `nn`/`es`/`de`/`fr`/`sv`/`da` (currently all offered in `index.html`'s `#languageSelect` and the custom `.language-options` dropdown) are hidden from the production selector until each is independently completed and verified, then can be re-added one at a time — same "flag it off until verified" pattern already used for the tournament-format picker (docs/BUGS.md P1, Americano/Mexicano/etc.).
- [x] No untranslated keys or fallback strings visible in either shipped language. — see the key-parity result above; re-run the key check whenever strings are added.
- [x] Switching language updates the interface immediately, no reload required (already true today via `app/core/language-controller.js` — verify it still holds once the selector is redesigned). — verified after the redesign.
- [x] Selector and switching work consistently on desktop and mobile. — verified at 375px, 768px and desktop width.

## Phase 22 — Help/privacy/info

- [ ] Guide matches current product. Use clear and easy language, not production notes or technical language. (Use "in the cloud" instead of "supabase" etc. Its for the user/player, not the developer. — rewritten for `nb`/`en` (create wizard, lobby, guest use without account, invite code/QR, profile colour).
- [ ] Privacy matches actual data flow. — added push-subscription and colour-choice data and the real retention lifecycle; the retention wording depends on migration `20260919090500_...` being applied.
- [x] Display in chosen language — verified by the developer for the app (Norwegian, device language, English). Fixed 2026-09-19 on `v0.8`: the guide and privacy pages did not understand the saved value `device` and showed Norwegian on an English device; they now share `app/page-language.js` (tests in `test/page-language.test.js`).
- [ ] Contradictory old text nust be removed. — done on `v0.8`: the outdated retention text in `app/privacy-i18n.js` (which a hidden override was silently replacing) is gone; one source of truth, mirrored in `privacy.html`. The hidden languages (nn/es/de/fr) still carry old text and stay hidden until Phase 21 completes them.
- [ ] Use clear and easy language, not production notes or technical language. (Use "in the cloud" instead of "supabase" etc. Its for the user/player, not the developer. — privacy text rewritten in plain nb/en ("in the cloud", "on your device"); the guide gained "during a match" and "if a player has to leave". Decision for you: the privacy text still names Supabase, Vercel, Vercel Analytics and Resend once each, in parentheses, because a privacy notice normally has to name who processes the data; say if you want them removed anyway.
- [ ] Always opens in popup with an x button on the top right to close. — built on `v0.8`: the footer links to the guide and privacy page open a popup (`app/info-dialog.js`) with the page inside and an X in the card's top right corner (also Escape and a click outside); the links still work as normal links when opened in a new tab or without JavaScript. Framing is allowed for the site itself only (`frame-ancestors 'self'`). Checked in the browser in nb and en.

## Phase 23 — Initial system owner (v.0.8.0 reqiurement)

- [ ] Exactly one protected Systemeier. — built and applied to the live database 2026-09-19 (migration `20260920110000_system_owner.sql`): singleton table `public.system_owner` seeded with `sigurd.grodem@live.no` (the developer's decision). Verified live: one row, the account id matches.
- [ ] Backend/database enforcement. — the table is closed to `anon`/`authenticated` (RLS on, no grants); triggers refuse delete, truncate and any update unless the database owner deliberately sets `app.system_owner_transfer = 'confirmed'`; deleting the owner's account is refused (foreign key restrict). All checks run on `auth.uid()` in SECURITY DEFINER functions. 22 checks in `supabase/tests/system-owner.pglite.mjs` and the same protections re-checked on the live database (rolled back).
- [ ] Cannot be removed/restricted by ordinary superuser. — there is no superuser concept yet (Priority 2); the protection does not depend on one. Only the database owner can transfer the role, on purpose, in SQL.
- [ ] Unauthorized system-admin access blocked. — `is_system_owner()` / `admin_overview()` are not executable by `anon`, and refuse any signed-in user who is not the owner (verified live). `admin.html` sends a signed-out visitor to sign-in and a stranger Home with a message, and requests no administration data before the server confirmed ownership (`test/system-admin.test.js`; the signed-out redirect was checked in the browser). The menu link "System" exists only for the owner.
- [ ] Minimum owner administration verified. — `admin.html` shows counts (tournaments, running, finished, expired, with account, profiles) and the 20 latest tournaments, without tokens, invite codes or personal data. Database side verified live as the owner; the page itself as the signed-in owner still needs your check (I cannot sign in for you): see USER ACTIONS.

## Phase 24 — v1 security/data integrity

- [x] Supabase RLS for v1 flows. — audited 2026-09-19: all 10 public tables have RLS enabled; 8 have no policies (deny-all) and are reachable only through token-checked `SECURITY DEFINER` RPCs by design. Advisor findings: `upsert_player_profile_impl` and `list_my_active_tournaments` had leftover PUBLIC execute (fix: migration `20260919090000_revoke_exposed_rpc_grants.sql`, applied by the developer and confirmed by the advisors on 2026-09-19); leaked-password protection is disabled — it is a Supabase Pro-plan feature and the project is on the free plan, so it cannot be enabled (accepted 2026-09-19; the password rules of Supabase Auth still apply). Revisit if the project moves to Pro.
- [ ] Stable IDs for auth/relations.
- [ ] Guest/player/admin/owner/TV access.
- [ ] Duplicate/race handling.
- [ ] Correction atomicity.
- [x] Cleanup cannot destroy required permanent data. — deletion is guarded by a database trigger that requires saved statistics; cleanup never touches account-owned tournaments, `account_tournament_statistics` or receipts; tournaments with account-linked players are skipped rather than deleted.

## Phase 25 — v1 resilience and UI verification

- [ ] Network loss during active match. — covered by tests: a transient error keeps a player's point queued for retry, scorer/result actions refuse to run offline with a message, admin writes wait and show "pending" (`test/scorer-role.test.js`, `test/result-approval.test.js`, `test/pwa.test.js`). **Not yet tried with a real network cut on a phone** (airplane mode during a running match): see USER ACTIONS.
- [x] Refresh during active match. — verified live in the Phase 8 pass (a full reload restored the running tournament from the server) and by the last-known-good recovery tests; a reloaded page also keeps its scorer role because the state comes from the server.
- [x] Stale client state. — every write carries the expected revision and the server refuses an old one; the client rejects older remote states and offers "refresh from server" or "keep my local copy" (`test/remote-state-controller.test.js`, `test/supabase-contract.test.js`, the opt-in live test, and the Realtime catch-up in `test/realtime-broadcast.test.js`).
- [x] Duplicate result submit. — a second submit is refused ("already submitted"), one approval per team, corrections limited to two (`supabase/tests/result-approval.pglite.mjs`); finalizing twice adds nothing (`account-statistics.pglite.mjs`).
- [ ] Concurrent scoring/takeover attempt. — one active scorer per match with claim, request, transfer and a takeover only after 2 minutes offline (`scorer-lease.pglite.mjs`); all writes lock the tournament row (`FOR UPDATE`, checked by `test/supabase-contract.test.js`). A truly parallel two-connection race is not exercised by the in-memory database and has not been run live.
- [ ] Failed database write. — server writes are single transactions that roll back completely on error (finalization, corrections, replacement of state are tested that way) and the client keeps unsent changes and shows the sync state; a real failing write on the live system has not been provoked.
- [x] Failed permanent-stat transfer. — finalization is one transaction: with a corrupt result it is refused, writes no statistics and no receipt, leaves the tournament running, and succeeds once the data is fixed (`supabase/tests/account-statistics.pglite.mjs`, 22 checks).
- [ ] Desktop responsive verification. — Audited 2026-09-19 with `scripts/ui-audit.js` (sideways scroll, elements beyond the edge, tap targets, overlapping controls, clipped text) on a local tournament: landing, join, create, account, lobby, the three admin tabs and the player view, plus the podium (phone) and TV Mode. 1280x800 (English) and 1920x1080 (Norwegian): clean after fixing long names cut off in the scoreboard. Still to check: the signed-in profile page and a Cup bracket (they need an account / a Cup).
- [ ] Mobile responsive verification. — 375x812 in Norwegian and English: clean after fixes (the notification bell wrapped in the phone header, footer links and read-only link fields were too small to tap, the scoreboard +/- were 30px wide, long names cut off on the podium). Same open views as desktop.
- [ ] Tablet verification where relevant. — 768x1024 (English): clean. Same open views as desktop.
- [x] TV 16:9 verification. — 1920x1080 and 1280x720: the screen fits exactly with no scrolling and nothing overlaps; long standings names now wrap instead of being cut off.
- [x] Touch targets usable. — on screens up to 900px every tap target is at least 32px and the footer links and link fields have 44px areas; the 8 invite-code cells are 31px wide by 41px high because eight fit across a phone (kept on purpose). Inline text links on desktop are mouse targets.
- [x] Status does not rely only on color. — match states, the connection pill, approval badges and withdrawal states all carry text; switches show their state by the thumb position and `role="switch"`; standings use numbers.
- [x] No unintended overlap: text/buttons/icons/cards never collide, fixed/sticky elements never cover interactive content, at mobile/tablet/standard-desktop/wide-desktop widths. Intentional overlap (modals, dropdowns, menus, tooltips) is exempt. — the audit reports no overlapping controls in the audited views at any width; the sticky bottom tab bar on phones is an intentional overlay and sits after the content.
- [x] Long translated strings (English is often longer than Norwegian) don't cause overlap or broken layout at any of the above widths — check this against whichever languages Phase 21 ships for the v1.0 RC. — the two shipped languages (Norwegian and English) were both audited at 375px and English also at 768px and 1280px.

## Phase 26 — Documentation consolidation 
**With each phase update these documents**

- [ ] `PROJECT.md` matches current approved product behavior.
- [ ] `ROADMAP.md` is the only active development plan.
- [ ] `BUGS.md` contains only active defects.
- [ ] `CHANGELOG.md` contains completed verified release changes.
- [ ] Relevant `docs/technical/*` reflects verified implementation.
- [ ] Superseded plans moved to `docs/archive/plans/`.
- [ ] Old contradictory design/development docs archived.
- [ ] Archive clearly marked non-authoritative.

## Phase 27 — Theme system (light/dark mode) (Version 0.9.0 reqiurement)

An extensible theme system rather than isolated page-specific styling — dark mode remains PADELSTAR's primary visual identity, light mode is the second v1.0-required mode, and the architecture must not need rewriting to add future seasonal themes (see the Priority 2 "Owner Admin global theme management" entry below, which builds on this).

- [ ] Dark mode (current default) and light mode both implemented, same layout/spacing/hierarchy/component structure in both — only token values change, not markup.
- [ ] `prefers-color-scheme` respected on first use; a manual selection overrides it and persists between sessions (same persistence pattern as the existing language preference in `app/core/language-controller.js`).
- [ ] Switching theme applies immediately, no reload.
- [ ] Contrast verified in both modes: text, buttons, cards, dialogs, forms, and interactive/focus states all stay readable.
- [ ] Architecture is token/CSS-custom-property/theme-class based (extending Phase 1's `styles/base.css` token system and `styles/components-v2.css`, not a parallel styling system), so a future theme only needs to define its own token values (background/surface/accent/text colors, gradients, shadows, decorative assets, logo variant) without touching component markup or logic.
- [ ] Theme resolution priority defined and implemented: (1) user's manual light/dark choice, (2) `prefers-color-scheme`, (3) dark fallback.
- [ ] Out of v1.0 scope, do not let these delay the RC: seasonal/event themes (Christmas, Winter, Pride, Summer, etc.), Owner Admin theme management, and scheduled automatic theme activation — tracked separately under Priority 2.

## Phase 28 — Claude Design UI completion

The `0.6.1` UI redesign (fonts, design tokens, gem avatars, the persistent workspace nav shell) shipped across 6 phases — see `docs/CHANGELOG.md`. These are the pieces of that same Claude Design mockup that were deliberately deferred because building them is new functionality/interaction, not a restyle of something already there, and the redesign's own working assumption was to never risk the Monday critical path for a visual-only change. Design reference: the handoff bundle behind that redesign (screens covering create/join/Kamper), and the roadmap phases these final gems fold into: 4-step create wizard folds into Phase 2's tournament-creation flow; the match-card visual pass touches Phase 10 (player live scoring)/Phase 4's result registration; the podium screen is new ground with no existing phase, tracked here directly.

- [x] Multi-step create wizard (Turneringsnavn+format → Regler → Spillere → Bekreft, with a progress bar) replacing today's single-page create form — built on the `ui-makeover` branch. This pulled real functionality forward into creation time that didn't exist before: the old single-page form had no format/rules fields at all (every tournament was hardcoded Round Robin with default rules; format/rules only became choosable *after* creation via the Styring tab). Extended `app/tournament-state.js`'s `createTournament()` and `app/tournament-entry.js`'s `handleCreate()` to accept format/rules, validated with the exact same allow-lists the post-creation `updateTournamentRules()` already used. Cup team setup still happens post-creation via the existing (already-working) flow — the wizard only needed to correctly thread `format` through instead of hardcoding `"roundRobin"`. Found and fixed two real bugs during verification: (1) `app.js` had its own separate `createTournament()` wrapper that silently dropped the new fields before forwarding to `tournament-state.js` — format/rules chosen in the wizard were being discarded even though every other layer was correct; confirmed via direct DB inspection that the server-stored tournament had the wrong format despite the form, `handleCreate()`, and `tournament-state.js` all individually checking out. (2) Reopening "Opprett" via the nav link (not just the podium's "Ny turnering" button) left the wizard stuck on whatever step was last visited, with stale field values, since `syncCreateFormDefaults()` was only wired to specific entry points, not `showModule("setup-admin")` generally — fixed by calling it centrally from the `showModule()` wrapper whenever the target is `"setup-admin"`. Verified: Round Robin and Cup tournaments both created correctly end-to-end (server-side format confirmed via direct SQL query), Monday critical path continues working unchanged from a wizard-created tournament (start → register result → persist), Enter-key-in-name-field does not prematurely submit (no `type="submit"` control exists in the form — the step-4 button is `type="button"`, wired directly to `handleCreate()`), per-step validation blocks advancing past an empty required field, mobile width layout verified, and reopening the form now always resets cleanly to step 1.
- [x] 8-cell invite-code input (auto-advance between cells, paste-fills-all) replacing the plain text field on the join screen — built on the `ui-makeover` branch. A real hidden `<input name="inviteCode">` (visually hidden via CSS, not `type="hidden"`/`display:none` — both are barred from HTML5 constraint validation, which would have silently broken the existing `required` behavior) stays the actual form field `handleJoin()` reads; the 8 visible cells are kept in sync with it in both directions. Found and fixed a real bug during verification: `app/setup-forms.js`'s `prefillInviteCodeFromUrl()` calls its own internal `prefillJoinForm()` directly, not through any app.js wrapper — so wrapping only the app.js-level function (the first fix attempted) left the `?join=CODE` URL-prefill path, "rejoin", and the workspace-navigation auto-prefill silently showing 8 empty cells despite the hidden field being correctly set. Fixed by threading a `syncInviteCodeCells` callback into `setup-forms.js` itself and calling it at the one true source (`prefillJoinForm()`), so all 3 real call sites are covered by construction rather than by remembering to wrap each one. Verified: typing auto-advances and uppercases, paste fills all 8 cells from a middle cell, Backspace on an empty cell moves back, `?join=CODE` and a full create-wizard-to-join round trip both work end-to-end (confirmed the joined player was correctly added and selected), mobile width checked.
- [x] Manual gem/accent-color picker on join + profile screens — built on the `ui-makeover` branch. A 16-swatch picker (new `app/accent-picker.js`, reused for both forms) now sits on `#joinTournamentForm` and `#profileForm`; the chosen value is threaded end-to-end through the full param chain on both the local and remote join paths (`tournament-entry.js` → `app.js` → `remote-tournament.js`/`session-controller.js`/`player-state.js` → `tournament-state.js`'s `createPlayer()`) and through the profile save path (`profile-session.js` → `profile-manager.js`, plus a `p_accent` param added to the `upsert_player_profile` RPC call). Live-database investigation before writing any code confirmed the exact gap: `join_tournament_impl`'s player-building allow-list had no `accent` key at all (silently dropping it, mirroring the existing `avatarId` allow-list pattern to fix), and `player_profiles` had no `accent` column and `upsert_player_profile_impl` no matching param. Migration written to `supabase/migrations/20260917101913_player_accent_choice.sql`, applied by the developer via the Supabase Dashboard SQL Editor. Found and fixed three real bugs during verification, all the same "shadow wrapper drops new param" class as item 2's `createTournament()` bug: `app.js` has its own separate `addPlayer()`, `createPlayer()`, and two `createPlayer:` DI-arrow wrappers that each independently forward to the real implementation — all four needed the new `accent` param added, or it was silently dropped exactly like `avatarId` would have been. Verified end-to-end against the *live* Supabase project post-migration: joined for real with a deliberately non-default swatch ("onyx"), then confirmed via a direct database query that the joined player's stored `accent` field is exactly `"onyx"` — the full client → RPC → database round-trip, not just the client-side threading. Profile-side picker verified fully client-side (local profile save/reload correctly persists and re-selects the chosen swatch, and a saved profile's color correctly pre-selects the join picker). Mobile width checked.
- [x] Podium / post-tournament celebration screen (final standings as a 1st/2nd/3rd podium layout with a trophy header, "Ny turnering" CTA) — built on the `ui-makeover` branch. Finishing a guest tournament wipes `state` as part of the same action (see `docs/BUGS.md`-style note: a guest tournament is deleted server-side on finish), so the podium can't read live state after the fact — `app/app.js`'s `endTournament()` now captures a `leaderboardEntries()` snapshot immediately before calling finalize, and `app/podium.js` renders from that snapshot alone. "Se full tabell" expands an inline full-ranked list from the same snapshot rather than navigating to the live standings tab, so it works identically whether the tournament was deleted (guest) or retained (owner). Verified in-browser at desktop and mobile widths, both a played-out and a force-finished tournament, and that "Ny turnering" reaches a genuinely clean create form (found and fixed a related bug: the create form's player textarea kept the previous tournament's names since navigating there doesn't reset form fields — `syncCreateFormDefaults()` is now called first).
- [x] Kamper: collapsible list-row match cards matching the mockup's flatter layout — deferred in the 0.6.1 redesign specifically because `match-card.js`'s scoring buttons were wired by CSS class name at the time, making a markup rewrite there real risk to live scoring; unblocked once the Phase 29 item 4 scoring-table redesign moved point/undo wiring onto stable `data-point-team`/`data-undo-team` attributes instead. Each match card now shows an always-visible summary row (round/match label, court, status pill, team names, a compact `SETT/GAME` score readout via the existing `scoreSummary()`) with a chevron; clicking it expands to reveal the full team cards, scoreboard table, and (for admins) the court/action controls, which now live inside a new `.match-card-body` wrapper instead of always being rendered. A live match auto-expands by default (`match.state === "playing"`); other matches default collapsed, and any manual toggle is remembered in a module-scoped `Map` in `app/match-card.js` so it survives the frequent full-list re-renders scoring triggers (confirmed live: toggling a waiting match open, then awarding a point on the live match, correctly left the toggled match's state untouched). Reused unchanged: the item-4 scoreboard table, `scoreSummary()`/`matchContextText()` (already existed in `app/rendering.js`, just not previously wired into `match-card.js`), and the shared `.hidden` utility for the collapse itself. New small `styles/match-list-collapse.css`. Found and fixed a real mobile bug during verification: the new chevron (`position: absolute`, top-right of the card) initially overlapped the court name/status pill text at ≤680px, where `.match-top-actions` was already flush against the card's right edge — fixed by reserving right padding on the new `.match-summary` wrapper. Applies identically to the admin's Kamper tab and the player's own "Dine kamper" list (both go through the same `createMatchCard()`/`renderGroupedMatches()` path) — verified both. Mobile width checked after the chevron fix.
- [x] Styring: flatter settings-row visual pass matching the mockup's grouped-card/label+value-row layout — restyled `#tournamentSettingsForm` (the rules-editing form: format, cup team setup, third-place match, table points, games/sets per match) into a single grouped card (`.settings-group`, titled "Regler") with each field as a full-width row (label on the left, its native `<select>`/`<input type="number">`/checkbox right-aligned and pill-styled) instead of the previous stacked-label form-field layout. Deliberately kept every control natively editable — the mockup's own "Innstillinger" screen shows read-only rows with a static value badge, but that's a settings *summary*, not this app's actual rules-editing UI, and removing edit capability would be a functionality regression nothing in this pass asked for; the row/value visual language was applied to the real `<select>`/`<input>` controls instead of replacing them with static text. Left `#courtSettingsForm`/`#courtNamesForm` (court count/names), the backup/end/reset buttons, and the admin-identity panel unchanged — they're separate concerns from the mockup's rules-focused settings screen. New `styles/settings-rows.css`; new `admin.rulesGroupTitle` i18n key (nb/nn/en/es, matching the coverage of the other keys in this same form). Verified live: both `<select>`s and both number inputs remain fully interactive (typed a new `gamesToWinSet` value, saved, confirmed via `state.settings` it persisted correctly), the Cup-conditional rows (`cupTeamSetupModeField`/`cupThirdPlaceField`) still show/hide correctly and render with the same row styling when format is Cup, mobile width checked.

The design itself kept evolving in the source `claude.ai/design` conversation after the 5 items above were scoped, adding a real scoring-table redesign for "Min kamp" and a handful of smaller suggestions. Tracked here as further Phase 28 items, same ascending-risk-order discipline, on the `ui-makeover` branch:

- [x] Lobby / pre-start waiting room screen — a dedicated `data-module="lobby"` screen shown right after `handleCreate()` succeeds (instead of dropping straight into the workspace), with the invite code, QR code, a live player list, and a single "Start turnering" CTA — pulling that moment out of the Styring tab's busy rules-editing panel into its own focused screen. Almost entirely built from existing pieces: `app/link-utils.js`'s `createQrCodeUrl()`/`createJoinLink()`, `app/tournament-status.js`'s `generateRoundBlockReason()` for the same start-button guard the Styring tab's button already uses, and `app/tournament-runtime.js`'s `generateFullTournamentSchedule()`. New `app/lobby.js` module, wired into the render dispatcher and `module-routing.js` (needed its own `"lobby"` special-case there, alongside podium's — `normalizeModule()` would otherwise fall through to `fallbackTournamentModule()` and silently redirect a brand-new tournament straight to the admin panel instead of the lobby). "Gå til styring" lets an admin skip straight to the full admin panel if they need the rules form or backup tools before starting. Found and fixed a real bug during verification: the lobby's own "Start turnering" handler generated the round correctly in memory but never called `saveState()` — the very next realtime sync from the server (still holding the old, round-less state) silently overwrote the in-memory round, so the round appeared to vanish; fixed by mirroring the existing `#generateRoundButton` handler's exact `saveState(); render();` tail. Verified live against the real Supabase project end-to-end (create → land in lobby → Start turnering → round 1 actually persists and the workspace shows it), mobile width checked.
- [x] Profile screen additions: "Mine aktive turneringer" and "Kontoinnstillinger" — built on the `ui-makeover` branch, both scoped inside the existing authenticated-only `.profile-light-panel` (already hidden for guests via `account-auth.js`'s `elements.profileLightPanel?.classList.toggle("hidden", !user)`, so both new sections inherit that gating for free). Kontoinnstillinger reuses data `account-auth.js`'s `render()` already computes elsewhere on the same screen (`user.email`, `user.created_at`, `user.email_confirmed_at`) — no new query. Active tournaments needed a genuinely new read: the `tournaments` table has row-level security enabled with zero policies (confirmed live — deny-all for direct client selects), matching this app's established pattern of gating all tournament-blob access through `SECURITY DEFINER` RPCs rather than table-level RLS policies (the same reasoning as `join_tournament_impl`, `get_tournament_by_code_impl`, etc.). New `list_my_active_tournaments()` RPC (`supabase/migrations/20260917161145_list_my_active_tournaments.sql`), applied by the developer via the Supabase Dashboard SQL Editor — reads `auth.uid()` internally, never a client-supplied id, and returns tournaments owned by that user with `status <> 'Avsluttet'`. Verified the render logic and layout with realistic mock data injected client-side (both sections render correctly, status chips, mobile width checked) and confirmed the RPC itself is live via direct schema inspection — full end-to-end verification against the real RPC still needs a signed-in real account to exercise (this session cannot enter real credentials), so this remains for the developer to confirm on next sign-in.
- [x] Six small design-chat suggestions — built on the `ui-makeover` branch, one commit, each independent and low-risk (no scoring-engine changes):
  - **Header scoping**: no code needed. Checked `#tournamentTitle`/`#roundLabel` (`index.html:477-478`) — they already live inside the workspace module's header, hidden on landing/login by the same show/hide loop as every other module. The mockup's flaw (title/version showing before a tournament exists) doesn't exist in this app's actual structure.
  - **Empty states**: Stilling already had one (`app/standings.js`'s `appendEmptyText(container, t("tournament.standingsEmpty"))`). The mockup's "ticker" has no equivalent concept anywhere in this app (TV-mode-only decorative idea in the original design, never built) — nothing to add an empty state to.
  - **Gem-color identification**: `app/court-queue.js`'s court-strip team names were plain text; now wrapped with `teamAccentStyle(team)` (already used on match cards, reused as-is) via a new `.court-queue-team` class with a colored left border, so a player's own accent color now identifies them on the court queue too.
  - **Offline unsynced-results indicator**: `app/admin-status.js` already tracked `pendingRemoteWriteCount()` for the admin's connection pill; now also surfaced on the player's own identity card (`app/player-controls.js`) as a small amber "sender (N)" chip when there are unsynced writes — reusing the existing counter, no new tracking.
  - **Waiting-state detail**: `app/player-next-match.js`'s "waiting" branch now computes how many other queued matches (by `queuePosition`, already used for the court queue's ordering) come before the player's own uncourted match, and shows "Du spiller om N kamper" when that count is positive — matching the mockup's "du spiller om 2 kamper" wording.
  - **Round-end summary**: `#generateRoundButton`'s handler (`app/admin-form-events.js`) now awaits a confirmation dialog with a round recap ("3/3 kamper spilt i runde 1. Klar for neste runde?") before advancing, whenever it's completing an active round rather than generating round 1 — reuses the existing `<dialog>`/`requestConfirmation()` mechanism already used for cancel-match/finish-tournament confirmations. Found and fixed a real bug during verification: the DI wrapper for `requestConfirmation` inside `admin-form-events.js`'s instantiation only forwarded a single `message` argument, silently dropping the custom title on every call from that file — the dialog worked but always showed the generic "Bekreft handling" title instead of "Runde N ferdig" until fixed to route through the existing `requestConfirmationWithTitle()` two-argument wrapper.
  - Verified live: full round 1→2 transition through the real UI (play 3 matches to completion, confirm the round-end dialog shows the correct round number and score, confirm accepting it correctly generates round 2), court-queue gem colors and the waiting-player hint both confirmed rendering correctly with real tournament data (6 players, 1 court, forcing a queue).
- [x] "Min kamp" scoring-table redesign, unified across the admin match card and the player's own view — built on the `ui-makeover` branch. Replaced the old big tap-to-score buttons with a shared SETT/GAME/POENG table (`app/match-card.js`'s new `scoreboardTableMarkup()`/`bindScoreboardTable()`, reused as-is by `app/player-next-match.js` for the player's own active match) — SETT/GAME are read-only derived counters, only POENG is interactive, matching the developer's explicit interaction decision. Undo went from a single snapshot (`match.lastScoredMatchState`) to a real multi-step stack (`match.undoStack`, array, pushed before every scoring action and popped one entry at a time), with a `state-manager.js` migration (`migrateUndoState()`) converting any in-flight tournament's old single snapshot into a one-entry stack so nothing is lost across the format change — covered by a dedicated `test/state-manager-undo-migration.test.js` (4 cases). Mid-implementation, discovered via a live-database query (`grep`-equivalent over `pg_proc` source) that the field being renamed is independently read *and* written by 5 separate production PL/pgSQL RPCs (`save_player_point_impl`, `admin_set_result_impl`, `admin_match_action_impl`, `admin_advance_cup_impl`, `admin_undo_match_impl`) — not just a client-side concern. Flagged this to the developer mid-task rather than silently scaling back or proceeding; the developer chose the full server rewrite. All 5 functions were reproduced verbatim from their live `pg_get_functiondef()` source with only the undo-capture/read logic changed to the array shape, written to `supabase/migrations/20260918083449_match_undo_stack.sql`, applied by the developer via the Supabase Dashboard SQL Editor.
  Found and fixed a real bug during live verification, in the same "shadow wrapper" family as earlier items but inverted: the new scoreboard's "−" button is wired to the same `reopenMatch()` used by the admin's existing big "Angre siste" button, which is *unconditionally* admin-remote-gated (`isCurrentUserAdmin()` required whenever Supabase is configured) — harmless before this change, since players never had an undo control at all. Now that the redesign gives players their own interactive "−" on their own match, clicking it as a player silently no-op'd (no toast, no error — `canWrite()` just returned `false`). Fixed by making the scoreboard's undo click handler role-aware (mirroring the exact role check `awardTennisPoint()` already uses for the "+" button): a player undoing their own point now pops the stack locally via `undoMatch()` directly (there is no player-scoped remote undo RPC — `save_player_point_impl` only supports adding points — matching the existing local-first pattern already used for a player's own point *awards*), while admin clicks keep going through the existing remote-first `reopenMatch()` path unchanged.
  Found and fixed a second real bug after the migration was applied, this one in the migration's own SQL: `admin_undo_match_impl` carried over a check from the old single-snapshot function that assumed every undo-stack push maps to exactly one server revision increment. That held for the old model (at most one pending undo, always freshly captured) but not for the new array-based stack — `app/core/remote-sync-controller.js`'s `queueRemoteSave()` debounces admin point-award saves by 350ms, so several rapid taps can share the same not-yet-synced local revision while still pushing distinct, individually-poppable entries. Reproduced live: award 3 points quickly (one coalesced save), undo once (worked), undo again (failed with `"Tournament state changed or not found"` even though nothing conflicted) — confirmed via a direct DB read that the state was untouched, not corrupted, just rejected. Fixed by dropping the erroneous per-entry check in `supabase/migrations/20260918144500_fix_admin_undo_match_revision_check.sql` (the primary `p_expected_revision` check, unchanged, already provides the real concurrency guard), applied by the developer.
  Verified live against the real Supabase project, post-migration: point award confirmed correct including deuce/advantage cascading (watched directly); a player's own self-scoring flow (award → multi-step undo, 3 consecutive pops each correctly stepping back exactly one point) verified end-to-end, both via the UI and by inspecting the underlying `undoStack` state directly; the player's own "Min kamp" view confirmed rendering the same interactive table as the admin's card; **admin's own multi-step undo re-verified after the revision-check fix** — 3 consecutive undo clicks against a live tournament, each correctly restoring exactly one prior point (40→30→15→0), confirmed via direct DB reads of `revision`/`currentGame`/`undoStack` length at each step, not just the UI. Mobile width checked on both admin and player views. Test tournaments cleaned up from Supabase after verification.

- [x] Landing page, header, footer, language picker and connection pill aligned to the design file — the landing hero is now a rounded gradient card with left-aligned copy (no more clipped hero content; the old `.intro` grid + `overflow: hidden` cut off the account hint), feature cards and the always-visible "Dine turneringer" card (with an empty state) share one 1080px column, the header is the design's compact sticky blurred bar (60px icon, 200px wordmark, version text beside it), the footer is the design's install + links row over a single centred credit line, and the language picker is a compact flag-only button (the "Språk" label and language name were redundant next to the flag; the open menu still lists names in proper case — a `.language-picker span { text-transform: uppercase }` rule in `layout.css` had been forcing them uppercase). The connection pill is now a neutral grey badge by default and only turns green (with the pulsing dot) when `data-status="connected"`, so "Offline" never reads as healthy. Fixed a real pre-existing bug this exposed: `#connectionStatus` carried a static `data-i18n="localPwa"` (which translates to "Offline"), so every generic translation pass overwrote the live text set by `syncConnectionStatus()` — the pill could say "Offline" while `data-status` was "connected". The attribute is removed and pinned by a test. Verified live at desktop and mobile widths, online and offline states.

## Phase 29 - Debugging
- Fix and repair all the current bugs in the BUGS.md list.

## Phase 30 — v1.0 Definition of Done

- [x] Priority 0 critical path passes end-to-end.
- [x] Round Robin verified.
- [x] Cup verified.
- [ ] Required player/result flows verified.
- [ ] Auth/account verified.
- [ ] Server persistence verified.
- [ ] History/retention required for v1 verified.
- [ ] Notifications/TV/PWA/i18n/help/privacy required for v1 verified.
- [ ] Minimum Systemeier verified.
- [ ] Theme system (Phase 27: dark + light mode) verified.
- [ ] Claude Design UI completion (Phase 28) verified.
- [ ] No known critical data-integrity defect.
- [ ] No known critical auth/authorization defect.
- [ ] Production build succeeds.
- [ ] Production smoke test succeeds.
- [ ] Docs match shipped behavior.
- [ ] Release-gated later features remain gated.
- [ ] Developer explicitly approves version change to `1.0.0`.

---

# PRIORITY 2 — Later 1.x
## Templates v.1.1
- [ ] Rule templates.
- [ ] Time templates.
- [ ] Tournament templates.
- [ ] Court templates.
- [ ] Participant templates.
- [ ] Official standard templates.
- [ ] Setup conveniences for the above templates: reuse-last-setup, favorites, archive/restore.

## Additional tournaments v.1.2
- [ ] Additional tournament modes: Americano, Team-Americano, Mexicano, Team-Mexicano, King of the Court, Groups+Playoffs are already exposed in the UI with client-side scheduling logic (`app/tournament-modes.js`) but have no server-side round-advancement RPC (`admin_advance_round_impl` only accepts `roundRobin`) — deactivated in the UI until each is server-wired and verified end-to-end like Round Robin; re-enable one at a time as they pass verification.
- [ ] Liga tournament format (league setup, match generation, table/ranking, final standings) — pushed out of the v1.0 Monday/RC critical scope per explicit developer decision; Round Robin and Cup remain the v1.0 formats. Revisit once both are fully stable and the Priority 1 phases above are done.
- [ ] Redesign the in-tournament admin UI ("Styring" tab): contextual visibility — hide/collapse settings that can't be changed given the tournament's current state (e.g. court-count/format settings once active) — before considering a fuller redesign.
- [ ] Player-first UI: "Min neste kamp" (my next match) and "Mine kamper" (my matches) surfaced more prominently than the full tournament overview.

## Tournament assitant and pdf-share v1.3
- [ ] PDF export of standings/results.
- [ ] Tournament Assistant: rule-based (non-AI) live-insights engine surfacing things like a stuck court, a missing result, playtime imbalance, repeated partner pairings, plus an estimated finish time.
- [ ] Rating/Elo system as a separate post-hoc calculation layer over raw match results (not mixed into stored scores, so the algorithm can change without rewriting history).
- [ ] Leagues & seasons: group multiple tournaments into a season with combined points/rating/participation/wins/final standing.
- [ ] Club/venue entity: group recurring tournaments under a venue for regular groups.
- [ ] Recurring league automation: auto-generate next week's tournament from a saved template + last week's roster.

## Calendar export and other features v1.4
- [ ] Organizer analytics dashboard: average match duration, court utilization, no-show rate, built on the existing tournament `events[]` activity log.
- [ ] Calendar/.ics export and reminders for scheduled tournaments.
- [ ] Sponsor/prize-pool display (informational only — name, logo, prize description; no payment processing).
- [ ] Photo/highlight attachment per match.
- [ ] Expanded system administration.
- [ ] Superusers and granular permissions — concrete deliverable: build out `admin.html` (currently a placeholder stub) as the owner's/superusers' app-administration surface: template creation, permissions management, and other app-wide functions, distinct from in-tournament admin controls. A visual reference for this exists (screen 14 of the Claude Design UI redesign handoff, see `.claude/plans/we-can-plan-new-playful-volcano.md`): a Systemeier-only `admin.html` shell with Oversikt/Brukere/Turneringer/Retention/Logger tabs — metric cards, a searchable user table (block/delete actions), a system-wide tournament list, and retention/log views. Deliberately not built as part of that UI redesign — it's new functionality needing backend endpoints (user listing, block/delete, retention job status, log access) that don't exist yet, not a restyle of something already there.
- [ ] Permission sets.
- [ ] MFA/step-up/recovery where required.
- [ ] Secure guest-device transfer.
- [ ] Template sharing/public library when approved — concrete deliverable: a template marketplace living inside the `admin.html` dashboard above.
- [ ] Player result-error reporting/admin cases (D67–D71) if not already implemented.
- [ ] Owner Admin global theme management, built on Phase 27's theme architecture and living inside the `admin.html` dashboard above: Systemeier selects which installed theme (standard PADELSTAR, plus future seasonal ones — Christmas, Winter, Pride, Summer, etc.) is the app-wide default, stored centrally (not just in the admin's own browser) so it applies to all users without a redeploy. Visual theme (standard/Christmas/Pride/...) and display mode (light/dark) stay separate concepts, combinable freely (e.g. "Christmas + Dark"). Each installed theme carries an explicit status (`active`/`available`/`disabled`/`development`); only `active` ones are selectable as the production default, and a theme that fails to load falls back to the standard PADELSTAR theme safely. Changing the global theme must never touch tournament or user data.
- [ ] Scheduled theme activation (e.g. auto-switch to Christmas Dec 1–26) — build the manual Owner Admin theme switch above first; automatic scheduling is a later enhancement on top of it, not required alongside it.

## Debugging
- Fix and repair all the current bugs in the BUGS.md list.

---
# PRIORITY 3 — Scoring engine v1.5
- [ ] Standalone reusable scoring engine: generalize `app/scoring-engine.js` into an engine decoupled from padel-specific concepts, usable to power scoring for other point/set/match-based sports apps (football, handball, hockey, etc.), with padel as one configured ruleset on top of a generic core. Bigger commitment than a simple multi-sport mode — scope once the padel-specific engine is stable, since a shared interface is harder to change once other consumers depend on it.

## Additional languages part 1
- [ ] French
- [ ] German
- [ ] Spanish
- [ ] Norsk - Nynorsk
- [ ] Dutch
- [ ] Portugies
 
  **Do not mark finished until the whole app is translated to the languages above**

---

# PRIORITY 4 — v2.0.0 Social

- [ ] Player dashboard: a personal hub beyond a stats page — next match at a glance, avatar/profile picture change, a Discord-style status message; becomes the home the rest of this section attaches to.
- [ ] Friend requests.
- [ ] Mutual friend list.
- [ ] Private friend list.
- [ ] Friend-based invitations.
- [ ] Friend status.

## Rivalries and achivements v2.1
- [ ] Rivalries/head-to-head stats between two specific players across all shared tournaments.
- [ ] Achievements/badges layered on existing per-account tournament statistics — confirmed as a good addition, detailed design deferred to a later planning pass.
- [ ] Broader social activity/profile functionality, including optional public statistics sharing and optional social activity/history — both explicitly pending a future product decision.

## Additional languages part 2
- [ ] Polish
- [ ] Samisk
- [ ] Arabic
- [ ] Chinese
- [ ] Japanise
- [ ] Turkish
- [ ] Russian

**Do not mark finished until the whole app is translated to the languages above**

---

## Debugging
- Fix and repair all the current bugs in the BUGS.md list.

---

# Post-1.0 architecture backlog

- [ ] Permanent tamper-protected security audit log.
- [ ] Broader public template ecosystem.