# ROADMAP.md

# Padelstar Release Roadmap

> This is the active work queue. Work **one phase at a time**. Do not inspect the entire roadmap before starting implementation.

## Status

- [ ] Not started
- [x] Done and verified
- `🟡` Needs adjustment
- `🧪` Needs verification
- `❌` Missing
- `🔒` Implemented but release-gated
- `⏭️` Later version

---

# v1.0.0

## Phase 0 – Focused baseline

- [ ] Confirm current application version.
- [ ] Confirm build/run/test commands.
- [ ] Identify active entry points relevant to v1 scope.
- [ ] Confirm authoritative docs structure.
- [ ] Do **not** perform a full repo rewrite or archive review.

## Phase 1 – Release gating

- [ ] Inventory tournament modes only.
- [ ] Round Robin visible.
- [ ] Cup visible.
- [ ] Liga visible.
- [ ] Other existing modes retained.
- [ ] Other existing modes cleanly hidden/release-gated.
- [ ] Verify gating does not break hidden modes.

## Phase 2 – Tournament core

- [ ] Create guest tournament.
- [ ] Create account-owned tournament.
- [ ] Participants add/edit/remove correctly.
- [ ] Unique display name within tournament.
- [ ] Courts add/edit/name correctly.
- [ ] Matches/runds generate correctly.
- [ ] Tournament progression works.
- [ ] Finish/abort/reset flows work.

## Phase 3 – Round Robin

- [ ] Teams of two.
- [ ] Required round-robin meetings.
- [ ] Reshuffle logic.
- [ ] Avoid repeated teammate where possible.
- [ ] Slot partner/opponent history.
- [ ] Table/ranking.
- [ ] Replacement-compatible structure.
- [ ] Regression tests.

## Phase 4 – Cup

- [ ] Bracket generation.
- [ ] Advancement/elimination.
- [ ] Final.
- [ ] Result-dependent future path.
- [ ] Correction consequence handling.
- [ ] No automatic rewrite of already-played matches.
- [ ] Admin choices for affected future path.
- [ ] Regression tests.

## Phase 5 – Liga

- [ ] League setup.
- [ ] Match generation.
- [ ] Table calculation.
- [ ] Ranking.
- [ ] Correction recalculation.
- [ ] Final standings.
- [ ] Guest and account-owned flows.
- [ ] Regression tests.

## Phase 6 – Scoring and rules

- [ ] Generic minimum-points/margin engine.
- [ ] 0/15/30/40 display.
- [ ] Deuce/Advantage.
- [ ] Golden Point/No-ad.
- [ ] Tiebreak.
- [ ] Rule snapshots per match.
- [ ] Rules lock at first match start.
- [ ] Read-only rule overview.
- [ ] Relevant UI only.

## Phase 7 – Player live scoring

- [ ] Player can score own active match.
- [ ] One active scorer.
- [ ] Others live-view.
- [ ] Scorer transfer.
- [ ] Scorer request.
- [ ] Admin override.
- [ ] Offline takeover after 2 minutes.
- [ ] Server arbitration.
- [ ] Undo.
- [ ] Redo.
- [ ] Event history.
- [ ] Multi-device verification.

## Phase 8 – Result approval

- [ ] Explicit `Send resultat til godkjenning`.
- [ ] At least one approval per team.
- [ ] Submitter approval for own team.
- [ ] Device-less admin-added player handling.
- [ ] Wrong/dispute flow.
- [ ] Correction proposal resets approvals.
- [ ] Maximum two player correction attempts.
- [ ] 10-minute admin alert.
- [ ] 30-minute conditional auto-approval.
- [ ] Court freed independently from result approval.
- [ ] Dependent progression waits for authoritative result.

## Phase 9 – Admin correction/consequence engine

- [ ] Admin correct live score.
- [ ] Admin set final result/end match.
- [ ] Finalized correction admin-only.
- [ ] Preserve prior correction history.
- [ ] Mandatory correction reason.
- [ ] `Annet` requires comment.
- [ ] Simulate consequences before mutation.
- [ ] Concrete consequence preview.
- [ ] Future unstarted-match handling.
- [ ] Already-played matches never auto-rewritten.
- [ ] Atomic commit/rollback.
- [ ] Notifications only after success.
- [ ] Restore old result as new correction.
- [ ] Regression tests.

## Phase 10 – Replacement/withdrawal

- [ ] Replace player.
- [ ] Personal stats follow person.
- [ ] Structural history follows slot.
- [ ] Historical actual participants preserved.
- [ ] Original player can return.
- [ ] One active slot per physical person.
- [ ] Future schedule follows slot.
- [ ] Active-match replacement restart/reset.
- [ ] Awaiting-confirmation/dispute block replacement.
- [ ] Regression tests.

## Phase 11 – Timed matches/clock

- [ ] Normal untimed match.
- [ ] X-minute match.
- [ ] Authoritative start timestamp.
- [ ] 1-minute visual warning.
- [ ] 00:00 behavior.
- [ ] Finish current game.
- [ ] No negative timer.
- [ ] Tie options.
- [ ] Cup per-round time override.
- [ ] Rule/time lock.
- [ ] Refresh/offline/resync.
- [ ] Clock foundation does not expose irrelevant future controls.

## Phase 12 – Auth/account

- [ ] Create account.
- [ ] Login.
- [ ] Logout.
- [ ] Separate login/create flows.
- [ ] Clear auth errors.
- [ ] Profile auth state.
- [ ] Profile login button.
- [ ] Account not required for guest create/join.
- [ ] Permanent user ID.
- [ ] Account deletion lifecycle.
- [ ] Auth/RLS tests.

## Phase 13 – History/statistics

- [ ] Account-owned tournament history.
- [ ] Owner history deletion.
- [ ] Other players' permanent stats unaffected by owner deletion.
- [ ] Personal W/L.
- [ ] Games/sets/stat recalculation after correction.
- [ ] Actual-person stats.
- [ ] Guest has no permanent personal history.
- [ ] No retroactive guest-stat claiming.

## Phase 14 – Retention/cleanup

- [ ] Guest completed/aborted retention = 24 hours.
- [ ] Read-only during retention.
- [ ] Permanent eligible stats saved before deletion.
- [ ] Failed stats persistence postpones cleanup.
- [ ] 30-day inactive guest expiry.
- [ ] Real-activity definition correct.
- [ ] 7-day expired recovery.
- [ ] Reactivation.
- [ ] Permanent deletion.
- [ ] Account deletion = 30-day period.
- [ ] Privacy text matches behavior.

## Phase 15 – Claiming/invitations

- [ ] Claim existing unlinked player slot.
- [ ] Secure account-to-slot link.
- [ ] Invitation without friend list.
- [ ] Invitation does not occupy slot before acceptance.
- [ ] Accept/reject.
- [ ] Pending invitation cutoff at first-round start.
- [ ] Admin consequence review if accepted participant changes setup.
- [ ] After cutoff use replacement flow.
- [ ] Guest temporary session identity.
- [ ] No insecure name-only device takeover.

## Phase 16 – Notifications

- [ ] In-app notifications.
- [ ] Push/PWA where allowed.
- [ ] Necessary vs optional.
- [ ] Only optional can be disabled in app.
- [ ] Notification center.
- [ ] Individual read/unread.
- [ ] Opening center does not mark all read.
- [ ] Tournament notification cleanup at tournament finish.
- [ ] Optional final-result notification retention.
- [ ] First version uses system sounds.

## Phase 17 – TV Mode

- [ ] Read-only.
- [ ] No account required.
- [ ] Dedicated link/QR.
- [ ] No admin/player rights.
- [ ] Live score/status.
- [ ] No private account data.
- [ ] Final standings/results after normal completion.
- [ ] Ended/reset state after nullification.
- [ ] Timer visual warning without TV sound/vibration.
- [ ] 16:9 verification.

## Phase 18 – PWA

- [ ] Manifest.
- [ ] Service worker.
- [ ] Installability.
- [ ] Standalone detection.
- [ ] Install CTA only when relevant.
- [ ] Desktop install guide.
- [ ] Mobile install guide.
- [ ] Cache/update behavior.
- [ ] Installed-app regression test.

## Phase 19 – Language/i18n

- [ ] Norwegian.
- [ ] English.
- [ ] Device language default.
- [ ] Persistent manual override.
- [ ] `Følg enhetens språk`.
- [ ] Remove inappropriate hard-coded visible strings.
- [ ] Admin/player/TV/notifications/help coverage.
- [ ] Future-language extensibility.

## Phase 20 – Help/privacy/information

- [ ] User guide matches current product.
- [ ] Privacy page matches actual data flow.
- [ ] Guest/account retention described correctly.
- [ ] Account deletion described correctly.
- [ ] Notifications described where required.
- [ ] Navigation matches current UI.
- [ ] Old contradictory privacy text removed.

## Phase 21 – Initial system owner

- [ ] Exactly one protected `Systemeier`.
- [ ] Separate from ordinary user.
- [ ] All system-level access.
- [ ] Cannot be removed/restricted by ordinary superuser.
- [ ] Backend/database enforcement.
- [ ] Unauthorized system-admin access blocked before data load.
- [ ] Minimal owner administration verified.
- [ ] Advanced permissions remain later unless required for secure owner foundation.

## Phase 22 – v1 security/data integrity

- [ ] Supabase RLS review for v1 flows.
- [ ] Stable IDs used for authorization/relations.
- [ ] Guest rights.
- [ ] Player own-match rights.
- [ ] Admin rights.
- [ ] Owner rights.
- [ ] TV read-only rights.
- [ ] Scoring race conditions.
- [ ] Scorer takeover race conditions.
- [ ] Final-result duplicate/race handling.
- [ ] Correction atomicity.
- [ ] Cleanup cannot delete required permanent data.

## Phase 23 – v1 regression/release

- [ ] Round Robin full regression.
- [ ] Cup full regression.
- [ ] Liga full regression.
- [ ] Other modes remain gated, not deleted.
- [ ] Guest flow.
- [ ] Account flow.
- [ ] Multi-device scoring.
- [ ] Result approval.
- [ ] Correction.
- [ ] Replacement.
- [ ] Timed match.
- [ ] Retention.
- [ ] Notifications.
- [ ] TV Mode.
- [ ] PWA.
- [ ] i18n.
- [ ] Privacy/help.
- [ ] Systemeier.
- [ ] Critical security/RLS.
- [ ] Production build.
- [ ] Production smoke test.
- [ ] Active docs updated.
- [ ] Developer approves version change.
- [ ] Set/tag/release `1.0.0`.

---

# 1.1.x / later 1.x

- [ ] Regelmaler.
- [ ] Tidsmaler.
- [ ] Turneringsmaler.
- [ ] Banemaler.
- [ ] Deltakermaler.
- [ ] Official standard templates.
- [ ] Template version history.
- [ ] Favorites/archive/restore.
- [ ] `Bruk sist oppsett`.
- [ ] Additional tournament modes activated incrementally.
- [ ] Expanded system administration.
- [ ] Superusers.
- [ ] Granular permissions.
- [ ] Permission sets.
- [ ] MFA/step-up where required.
- [ ] Template sharing/public library when approved.
- [ ] Custom Padelstar notification sounds when approved.
- [ ] Secure guest-device transfer when implemented safely.

# 2.0.0 – Social Padelstar

- [ ] Friend requests.
- [ ] Mutual friend list.
- [ ] Private friend list.
- [ ] Friend-based tournament invitations.
- [ ] Friend status visible to involved users.
- [ ] Broader social activity.
- [ ] Expanded social profile only after explicit product decisions.
- [ ] Avatar/public stats/history only if later approved.

# Post-1.0 / architecture backlog

- [ ] Permanent tamper-protected security audit log.
- [ ] Public/unlisted user template ecosystem.
- [ ] Generic multi-sport expansion.
- [ ] Additional languages.
- [ ] Other tournament modes.
