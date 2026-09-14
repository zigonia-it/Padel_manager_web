# ROADMAP.md

# Padelstar – Active Release Roadmap

> **Primary objective:** Restore a reliably usable Padelstar as fast as possible.
>
> **Hard milestone:** functioning build by **Monday 21 September 2026**.
>
> **Version baseline:** The real current development version is `0.5.0`. The `0.6`/`0.6.0` text currently visible in the UI was set prematurely and is not evidence that 0.6.0 is complete. Version bumps are recommended only after coherent milestones are fully implemented and verified; Codex never applies them automatically.
>
> **Token reset:** **Saturday 19 September 2026 at 11:31**. Before the reset, spend tokens only on the shortest path to a functioning app and verified blockers.
>
> This is the **only active development plan**. The previous detailed `Padelstar_v1_0_0_plan.md` is superseded and may be archived.

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
- [ ] Complete the Round Robin. — every test used the admin "Fullfør turnering" override to finish early; a Round Robin has not yet been played to its own natural completion (all rounds/matches actually played out).
- [ ] Final standings/result are valid. — informal only (Round 1 standings updated correctly after results); no dedicated standings/table view has been checked, and nothing has reached a full-tournament final standing.
- [x] Finish/close the tournament cleanly.
- [x] Return to a state where a new tournament can be created.
- [x] Create/start a second tournament without manual cleanup or corrupted prior state.

Two items remain open (natural Round Robin completion, final standings) — see `docs/BUGS.md` "Tournament completion" for detail. Everything else in this chain is verified end-to-end, guest and account-owned paths both.

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
- [ ] Login/create-account flows are clearly separated. — UI has both, but not specifically assessed.
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
- [ ] Participant validation works. — not tested (no invalid/duplicate participant attempt made).
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
- [x] Admin view shows correct active state.
- [ ] Player/match view does not crash. — not tested (only the admin/Styring view was exercised this cycle).
- [x] Tournament start state is saved to Supabase/server.
- [x] Refresh after start restores the active tournament.

### Exit gate

- [x] A newly created Round Robin can be started and survives refresh.

---

# Phase 4 — Result registration and progression

- [x] Owner/admin can open an active match.
- [x] Owner/admin can register a valid result.
- [ ] Result validation works. — not tested (no invalid-score attempt made).
- [x] Result is saved to the correct match.
- [x] Result is persisted to Supabase/server.
- [ ] Tournament standings/ranking update correctly. — not directly checked (no dedicated standings/table view was opened this cycle).
- [x] Match becomes completed.
- [x] Court becomes available when appropriate.
- [x] Next match/round progression is valid.
- [x] Refresh after result entry restores the same authoritative result.
- [ ] Duplicate submit does not create duplicate/corrupt result state. — not tested.
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
- [ ] Current standings can be reconstructed/restored from saved tournament data. — tied to the standings gap noted above; not checked.
- [x] Refresh restores the tournament.
- [x] Closing/reopening the app restores the tournament where expected. — verified via full page navigation (fresh JS bootstrap each time), which is functionally equivalent to close/reopen.
- [x] Local cache/storage is not the sole authoritative copy — demonstrated directly via server-side SQL checks independent of browser state.
- [ ] Failed server write is surfaced rather than falsely presented as saved. — not tested (no failed-write scenario simulated).
- [ ] Basic reconnect/resync behavior is verified. — not tested (no offline/online transition simulated).

### Exit gate

- [x] A tournament can be started, partially played, app refreshed/reopened, and continued from server-backed state.

---

# Phase 6 — Complete tournament

- [ ] Round Robin reaches its valid completion condition. — not tested naturally; every test used the admin force-finish override instead.
- [ ] Final standings are calculated correctly. — not verified.
- [x] Admin can finish tournament.
- [x] Finished status persists server-side.
- [x] Completed tournament no longer behaves as active.
- [ ] Final result/standings remain readable as intended. — tied to the standings gap above; not checked.
- [x] Completion does not leave locks/scorer/session state that blocks future use.
- [ ] Abort/reset controls do not corrupt account or future tournament state. — "Nullstill turnering" (reset) was never exercised.

### Exit gate

- [x] Tournament completes cleanly and the owner returns to a usable post-tournament state.

---

# Phase 7 — Start another tournament

This is part of the Monday acceptance test, not an optional polish item.

- [x] From the completed tournament state, owner can navigate to create a new tournament.
- [x] New tournament gets a new independent ID.
- [x] Prior tournament data does not leak into new setup.
- [ ] Prior active-match/scorer state does not leak into new tournament. — plausible given clean setup forms observed, but not specifically stress-tested.
- [x] New participants/courts can be configured.
- [x] New Round Robin can start.
- [ ] First result can be registered. — the tournaments created *after* completing a previous one were finished before any result was registered on them (single-match ownership/retention tests); this specific combination (post-completion tournament → register a result on it) hasn't been exercised yet.
- [x] Both tournaments remain internally distinct.

### Exit gate

- [x] Two tournaments can be created and run sequentially without manual database/browser cleanup.

---

# Phase 8 — Monday end-to-end verification

Run this only after Phases 1–7 are individually passing.

**Not yet run as a single continuous pass.** Every step below has been verified individually (see Phases 1–7 above and `docs/BUGS.md`), but split across separate guest-mode and account-owned sessions rather than one unbroken clean-session run-through, and a few Phase 1–7 items remain open (validation errors, logout, failed-write surfacing, standings, natural Round Robin completion). Recommended next step before calling Monday fully done: one uninterrupted pass through this exact checklist.

## Clean-session test

- [ ] Start from logged-out/clean app state.
- [ ] Create owner account.
- [ ] Log in.
- [ ] Create Round Robin.
- [ ] Add participants/courts.
- [ ] Start tournament.
- [ ] Register first result.
- [ ] Refresh.
- [ ] Verify result/tournament restored from server.
- [ ] Continue remaining matches.
- [ ] Finish tournament.
- [ ] Verify final standings.
- [ ] Create a second tournament.
- [ ] Start second tournament.
- [ ] Register at least one result.
- [ ] No critical console/runtime errors occurred.
- [ ] No manual database fix/local-storage deletion was required.

## Browser/device sanity

- [ ] Primary desktop browser works.
- [ ] Primary mobile/PWA path is usable if currently supported.
- [ ] Layout does not block core controls.
- [ ] Supabase/network failure gives safe visible behavior.

## Monday release decision

- [ ] If the full v1.0 Definition of Done is also satisfied, release `1.0.0`.
- [ ] Otherwise deploy/keep the functioning pre-1.0 build.
- [ ] Never call an unverified build `1.0.0` solely because of the date.

---

# PRIORITY 1 — v1.0.0 completion

Only start these after the Monday critical path is working end-to-end, unless a Priority 1 feature is required to fix a Priority 0 blocker.

## Phase 9 — Cup

- [ ] Bracket generation.
- [ ] Advancement/elimination.
- [ ] Final.
- [ ] Result-dependent future path.
- [ ] Final standings/result.
- [ ] End-to-end regression test.

## Phase 10 — Liga

- [ ] League setup.
- [ ] Match generation.
- [ ] Table/ranking.
- [ ] Final standings.
- [ ] End-to-end regression test.

## Phase 11 — Player live scoring

- [ ] Player can score own active match.
- [ ] One active scorer.
- [ ] Others live-view.
- [ ] Scorer transfer/request.
- [ ] Admin override.
- [ ] Offline takeover.
- [ ] Undo/Redo.
- [ ] Multi-device verification.

## Phase 12 — Result approval

- [ ] Explicit submission for approval.
- [ ] Required approvals.
- [ ] Dispute/correction proposal.
- [ ] 10-minute admin escalation.
- [ ] 30-minute conditional auto-approval.
- [ ] Dependent progression waits for authoritative result.
- [ ] Concrete `score_conflict` state when two submissions for the same match disagree; auto-confirmed only when submissions match, otherwise routed to admin.
- [ ] Visible "flagged for review" state for admin/referee escalation beyond auto-resolve.

## Phase 13 — Result correction/consequences

- [ ] Admin-only finalized correction.
- [ ] Correction history.
- [ ] Mandatory reason.
- [ ] Consequence simulation.
- [ ] Future-match handling.
- [ ] Already-played matches protected.
- [ ] Atomic commit/rollback.
- [ ] Successful-change notifications.
- [ ] Regression tests.

## Phase 14 — Replacement/withdrawal

- [ ] Structural slot vs actual-person behavior.
- [ ] Personal stats follow actual player.
- [ ] Historical participant preserved.
- [ ] Active-match restart rules.
- [ ] Disputed/unconfirmed match restrictions.
- [ ] Regression tests.

## Phase 15 — Timed matches/scoring rules

- [ ] Generic point/margin engine.
- [ ] Classic scoring.
- [ ] No-ad/Golden Point.
- [ ] Tiebreak.
- [ ] Timed matches.
- [ ] 00:00 finish-current-game behavior.
- [ ] Rule lock/snapshots.
- [ ] Cup time overrides.

## Phase 16 — Permanent history/statistics

- [ ] Account-owned history.
- [ ] Personal statistics.
- [ ] Corrections recalculate authoritative stats.
- [ ] Owner history deletion does not delete other players' stats.
- [ ] Guest has no permanent account history.

## Phase 17 — Retention/cleanup

- [ ] Guest completed/aborted retention.
- [ ] Stats saved before guest deletion.
- [ ] 30-day inactivity → expired.
- [ ] 7-day recovery.
- [ ] Account deletion lifecycle.
- [ ] Privacy documentation matches implementation.

## Phase 18 — Claiming/invitations

- [ ] Claim unlinked slot.
- [ ] Invitations without friend list.
- [ ] Acceptance/cutoff rules.
- [ ] Guest temporary session identity.
- [ ] No unsafe name-only takeover.
- [ ] Retroactive guest-stat claiming (a guest player later links their historical stats to an account) — explicitly pending a fresh product decision, not yet approved.

## Phase 19 — Notifications

- [ ] In-app notifications.
- [ ] Push/PWA where supported.
- [ ] Richer push categories: invites, results, "notify me for my own matches only" — beyond today's match-ready/round-ready triggers.
- [ ] Necessary vs optional.
- [ ] Notification center.
- [ ] Individual read/unread.
- [ ] Lifecycle cleanup.
- [ ] System sounds for first version.

## Phase 20 — TV Mode

- [ ] Read-only public viewing.
- [ ] Link/QR.
- [ ] No admin/player rights.
- [ ] Live score/status.
- [ ] Final standings/result after completion.
- [ ] Reset/nullified state handled correctly.
- [ ] Court Queue view ("Playing now / Next / After that" per court) reused across admin, player, and TV Mode surfaces.
- [ ] Nicer public/shareable results page built on the existing spectator RPC, embeddable on a club's own website.

## Phase 21 — PWA

- [ ] Manifest.
- [ ] Service worker.
- [ ] Installability.
- [ ] Standalone detection.
- [ ] Correct install CTA.
- [ ] Cache/update behavior.
- [ ] Desktop/mobile install guide.

## Phase 22 — Language/i18n

- [ ] Norwegian.
- [ ] English.
- [ ] Device default.
- [ ] Persistent manual override.
- [ ] `Følg enhetens språk`.
- [ ] Key surfaces translated.

## Phase 23 — Help/privacy/info

- [ ] Guide matches current product.
- [ ] Privacy matches actual data flow.
- [ ] Navigation matches current UI.
- [ ] Contradictory old text removed.

## Phase 24 — Initial system owner

- [ ] Exactly one protected Systemeier.
- [ ] Backend/database enforcement.
- [ ] Cannot be removed/restricted by ordinary superuser.
- [ ] Unauthorized system-admin access blocked.
- [ ] Minimum owner administration verified.

## Phase 25 — v1 security/data integrity

- [ ] Supabase RLS for v1 flows.
- [ ] Stable IDs for auth/relations.
- [ ] Guest/player/admin/owner/TV access.
- [ ] Duplicate/race handling.
- [ ] Correction atomicity.
- [ ] Cleanup cannot destroy required permanent data.

## Phase 26 — v1 resilience and UI verification

- [ ] Network loss during active match.
- [ ] Refresh during active match.
- [ ] Stale client state.
- [ ] Duplicate result submit.
- [ ] Concurrent scoring/takeover attempt.
- [ ] Failed database write.
- [ ] Failed permanent-stat transfer.
- [ ] Desktop responsive verification.
- [ ] Mobile responsive verification.
- [ ] Tablet verification where relevant.
- [ ] TV 16:9 verification.
- [ ] Touch targets usable.
- [ ] Status does not rely only on color.

## Phase 27 — Documentation consolidation

- [ ] `PROJECT.md` matches current approved product behavior.
- [ ] `ROADMAP.md` is the only active development plan.
- [ ] `BUGS.md` contains only active defects.
- [ ] `CHANGELOG.md` contains completed verified release changes.
- [ ] Relevant `docs/technical/*` reflects verified implementation.
- [ ] Superseded plans moved to `docs/archive/plans/`.
- [ ] Old contradictory design/development docs archived.
- [ ] Archive clearly marked non-authoritative.

## Phase 28 — v1.0 Definition of Done

- [ ] Priority 0 critical path passes end-to-end.
- [ ] Round Robin verified.
- [ ] Cup verified.
- [ ] Liga verified.
- [ ] Required player/result flows verified.
- [ ] Auth/account verified.
- [ ] Server persistence verified.
- [ ] History/retention required for v1 verified.
- [ ] Notifications/TV/PWA/i18n/help/privacy required for v1 verified.
- [ ] Minimum Systemeier verified.
- [ ] No known critical data-integrity defect.
- [ ] No known critical auth/authorization defect.
- [ ] Production build succeeds.
- [ ] Production smoke test succeeds.
- [ ] Docs match shipped behavior.
- [ ] Release-gated later features remain gated.
- [ ] Developer explicitly approves version change to `1.0.0`.

---

# PRIORITY 2 — Later 1.x

- [ ] Rule templates.
- [ ] Time templates.
- [ ] Tournament templates.
- [ ] Court templates.
- [ ] Participant templates.
- [ ] Official standard templates.
- [ ] Setup conveniences for the above templates: reuse-last-setup, favorites, archive/restore.
- [ ] Additional tournament modes: Americano, Team-Americano, Mexicano, Team-Mexicano, King of the Court, Groups+Playoffs are already exposed in the UI with client-side scheduling logic (`app/tournament-modes.js`) but have no server-side round-advancement RPC (`admin_advance_round_impl` only accepts `roundRobin`) — deactivated in the UI until each is server-wired and verified end-to-end like Round Robin; re-enable one at a time as they pass verification.
- [ ] Redesign the in-tournament admin UI ("Styring" tab): contextual visibility — hide/collapse settings that can't be changed given the tournament's current state (e.g. court-count/format settings once active) — before considering a fuller redesign.
- [ ] Player-first UI: "Min neste kamp" (my next match) and "Mine kamper" (my matches) surfaced more prominently than the full tournament overview.
- [ ] PDF export of standings/results.
- [ ] Tournament Assistant: rule-based (non-AI) live-insights engine surfacing things like a stuck court, a missing result, playtime imbalance, repeated partner pairings, plus an estimated finish time.
- [ ] Rating/Elo system as a separate post-hoc calculation layer over raw match results (not mixed into stored scores, so the algorithm can change without rewriting history).
- [ ] Leagues & seasons: group multiple tournaments into a season with combined points/rating/participation/wins/final standing.
- [ ] Club/venue entity: group recurring tournaments under a venue for regular groups.
- [ ] Recurring league automation: auto-generate next week's tournament from a saved template + last week's roster.
- [ ] Organizer analytics dashboard: average match duration, court utilization, no-show rate, built on the existing tournament `events[]` activity log.
- [ ] Calendar/.ics export and reminders for scheduled tournaments.
- [ ] Sponsor/prize-pool display (informational only — name, logo, prize description; no payment processing).
- [ ] Photo/highlight attachment per match.
- [ ] Expanded system administration.
- [ ] Superusers and granular permissions — concrete deliverable: build out `admin.html` (currently a placeholder stub) as the owner's/superusers' app-administration surface: template creation, permissions management, and other app-wide functions, distinct from in-tournament admin controls.
- [ ] Permission sets.
- [ ] MFA/step-up/recovery where required.
- [ ] Secure guest-device transfer.
- [ ] Template sharing/public library when approved — concrete deliverable: a template marketplace living inside the `admin.html` dashboard above.
- [ ] Custom Padelstar notification sounds.
- [ ] Player result-error reporting/admin cases (D67–D71) if not already implemented.

---

# PRIORITY 3 — v2.0.0 Social

- [ ] Player dashboard: a personal hub beyond a stats page — next match at a glance, avatar/profile picture change, a Discord-style status message; becomes the home the rest of this section attaches to.
- [ ] Friend requests.
- [ ] Mutual friend list.
- [ ] Private friend list.
- [ ] Friend-based invitations.
- [ ] Friend status.
- [ ] Rivalries/head-to-head stats between two specific players across all shared tournaments.
- [ ] Achievements/badges layered on existing per-account tournament statistics — confirmed as a good addition, detailed design deferred to a later planning pass.
- [ ] Broader social activity/profile functionality, including optional public statistics sharing and optional social activity/history — both explicitly pending a future product decision.

---

# Post-1.0 architecture backlog

- [ ] Permanent tamper-protected security audit log.
- [ ] Broader public template ecosystem.
- [ ] Standalone reusable scoring engine: generalize `app/scoring-engine.js` into an engine decoupled from padel-specific concepts, usable to power scoring for other point/set/match-based sports apps (football, handball, hockey, etc.), with padel as one configured ruleset on top of a generic core. Bigger commitment than a simple multi-sport mode — scope once the padel-specific engine is stable, since a shared interface is harder to change once other consumers depend on it.
- [ ] Additional languages.
