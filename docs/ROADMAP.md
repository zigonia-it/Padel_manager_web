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

- [ ] Create an account.
- [ ] Log in successfully.
- [ ] Remain correctly authenticated after normal navigation/refresh.
- [ ] Create a tournament.
- [ ] Choose/create a Round Robin tournament.
- [ ] Add the required participants.
- [ ] Add/select courts as required.
- [ ] Start the tournament.
- [ ] Start/open a match.
- [ ] Register a valid result.
- [ ] Result is saved to Supabase/server.
- [ ] Refresh/reopen and verify the saved tournament/result still exists.
- [ ] Continue the tournament with the saved state intact.
- [ ] Complete the Round Robin.
- [ ] Final standings/result are valid.
- [ ] Finish/close the tournament cleanly.
- [ ] Return to a state where a new tournament can be created.
- [ ] Create/start a second tournament without manual cleanup or corrupted prior state.

If this chain works reliably, the Monday milestone is achieved even if some wider v1.0 functionality remains unfinished.

---

# Phase 0 — Reproduce the critical path

Keep this phase short.

- [ ] Start the current app successfully.
- [ ] Attempt the exact Monday-success chain above.
- [ ] Add only reproducible blockers to `BUGS.md`.
- [ ] Stop investigation as soon as the first blocking defect is identified.
- [ ] Fix that blocker before broadening analysis.
- [ ] Repeat until the whole chain succeeds.

**Do not produce a repository-wide report first.**

---

# Phase 1 — Account creation and login

This is the first functional blocker group.

- [ ] Owner can open account creation.
- [ ] Account creation succeeds.
- [ ] Validation errors are visible and understandable.
- [ ] Auth email/confirmation behavior works as intended.
- [ ] Owner can log in with the created account.
- [ ] Failed login provides visible feedback.
- [ ] Login/create-account flows are clearly separated.
- [ ] Authenticated state survives ordinary page navigation.
- [ ] Authenticated state survives refresh where intended.
- [ ] Profile reflects actual logged-in user.
- [ ] Logout works.
- [ ] Login again works after logout.
- [ ] No stale auth state blocks tournament creation.

### Exit gate

- [ ] New owner account can be created and used to log in from a clean session.

---

# Phase 2 — Tournament creation

- [ ] Logged-in owner can create a new tournament.
- [ ] New tournament receives a stable database ID.
- [ ] Owner relationship is saved correctly.
- [ ] Tournament setup loads without runtime errors.
- [ ] Participants can be added.
- [ ] Participant validation works.
- [ ] Courts can be added/selected/named as required.
- [ ] Round Robin can be selected.
- [ ] Required setup values persist before start.
- [ ] Refresh does not silently destroy the setup.
- [ ] Creating a tournament does not depend on stale data from the previous tournament.

### Exit gate

- [ ] Owner can create a valid Round Robin setup from a clean logged-in session.

---

# Phase 3 — Round Robin generation and start

Round Robin has priority over Cup/Liga until Monday.

- [ ] Round Robin generates valid matches.
- [ ] Teams/players are assigned correctly.
- [ ] Required meetings are generated correctly for the supported setup.
- [ ] Courts are assigned correctly.
- [ ] Tournament can transition from setup to active.
- [ ] First playable match is available.
- [ ] Admin view shows correct active state.
- [ ] Player/match view does not crash.
- [ ] Tournament start state is saved to Supabase/server.
- [ ] Refresh after start restores the active tournament.

### Exit gate

- [ ] A newly created Round Robin can be started and survives refresh.

---

# Phase 4 — Result registration and progression

- [ ] Owner/admin can open an active match.
- [ ] Owner/admin can register a valid result.
- [ ] Result validation works.
- [ ] Result is saved to the correct match.
- [ ] Result is persisted to Supabase/server.
- [ ] Tournament standings/ranking update correctly.
- [ ] Match becomes completed.
- [ ] Court becomes available when appropriate.
- [ ] Next match/round progression is valid.
- [ ] Refresh after result entry restores the same authoritative result.
- [ ] Duplicate submit does not create duplicate/corrupt result state.
- [ ] Registering multiple results sequentially works.

### Exit gate

- [ ] Round Robin can progress through multiple saved match results without corruption.

---

# Phase 5 — Server backup / persistence

For the Monday milestone, "server backup" means authoritative tournament persistence in Supabase/backend.

- [ ] Tournament record exists server-side.
- [ ] Owner/account relationship exists server-side.
- [ ] Participants required by the active tournament exist server-side.
- [ ] Courts/setup required by the active tournament persist server-side.
- [ ] Generated matches persist server-side.
- [ ] Match results persist server-side.
- [ ] Tournament lifecycle state persists server-side.
- [ ] Current standings can be reconstructed/restored from saved tournament data.
- [ ] Refresh restores the tournament.
- [ ] Closing/reopening the app restores the tournament where expected.
- [ ] Local cache/storage is not the sole authoritative copy.
- [ ] Failed server write is surfaced rather than falsely presented as saved.
- [ ] Basic reconnect/resync behavior is verified.

### Exit gate

- [ ] A tournament can be started, partially played, app refreshed/reopened, and continued from server-backed state.

---

# Phase 6 — Complete tournament

- [ ] Round Robin reaches its valid completion condition.
- [ ] Final standings are calculated correctly.
- [ ] Admin can finish tournament.
- [ ] Finished status persists server-side.
- [ ] Completed tournament no longer behaves as active.
- [ ] Final result/standings remain readable as intended.
- [ ] Completion does not leave locks/scorer/session state that blocks future use.
- [ ] Abort/reset controls do not corrupt account or future tournament state.

### Exit gate

- [ ] Tournament completes cleanly and the owner returns to a usable post-tournament state.

---

# Phase 7 — Start another tournament

This is part of the Monday acceptance test, not an optional polish item.

- [ ] From the completed tournament state, owner can navigate to create a new tournament.
- [ ] New tournament gets a new independent ID.
- [ ] Prior tournament data does not leak into new setup.
- [ ] Prior active-match/scorer state does not leak into new tournament.
- [ ] New participants/courts can be configured.
- [ ] New Round Robin can start.
- [ ] First result can be registered.
- [ ] Both tournaments remain internally distinct.

### Exit gate

- [ ] Two tournaments can be created and run sequentially without manual database/browser cleanup.

---

# Phase 8 — Monday end-to-end verification

Run this only after Phases 1–7 are individually passing.

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

## Phase 19 — Notifications

- [ ] In-app notifications.
- [ ] Push/PWA where supported.
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
- [ ] Additional tournament modes.
- [ ] Expanded system administration.
- [ ] Superusers and granular permissions.
- [ ] Permission sets.
- [ ] MFA/step-up/recovery where required.
- [ ] Secure guest-device transfer.
- [ ] Template sharing/public library when approved.
- [ ] Custom Padelstar notification sounds.
- [ ] Player result-error reporting/admin cases (D67–D71) if not already implemented.

---

# PRIORITY 3 — v2.0.0 Social

- [ ] Friend requests.
- [ ] Mutual friend list.
- [ ] Private friend list.
- [ ] Friend-based invitations.
- [ ] Friend status.
- [ ] Broader social activity/profile functionality.

---

# Post-1.0 architecture backlog

- [ ] Permanent tamper-protected security audit log.
- [ ] Broader public template ecosystem.
- [ ] Generic multi-sport expansion.
- [ ] Additional languages.
