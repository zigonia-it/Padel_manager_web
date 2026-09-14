# PROJECT.md

# Padelstar – Product Source of Truth

## Product

Padelstar is a multi-device padel tournament application/PWA for creating, running, scoring and displaying tournaments.

This document contains the consolidated product direction. Detailed implementation contracts belong in `docs/technical/`; release sequencing belongs in `ROADMAP.md`.

## Core principles

- Accounts are optional for basic tournament use.
- Shared active tournaments use backend/database state when multiple devices participate.
- Accounts provide permanent ownership, identity, history and statistics.
- Guest identity is temporary and tournament/session-scoped.
- Current implemented UI is the design authority.
- Product rules must not be silently changed to match old documentation.

## v1 tournament modes

Visible in v1.0.0:

- Round Robin
- Cup
- Liga

Other already implemented modes are retained but release-gated until later releases.

## Tournament ownership and lifecycle

- Guest can create a tournament.
- Logged-in user can create a permanently owned tournament.
- Guest-owned completed/aborted tournament remains read-only for 24 hours after finish/abort, after eligible permanent player stats are safely stored.
- If required stats persistence fails, guest cleanup is postponed.
- Account-owned completed tournaments can remain in permanent owner history while temporary/live technical data is cleaned.
- Owner may delete a completed tournament from own history without deleting other players' permanent personal stats.
- Inactive guest tournament: 30 days without real activity → `expired`; 7-day recovery period; then permanent deletion.
- Real activity includes match start, match end or tournament setup change. Passive viewing/refresh/TV does not reset inactivity.
- Reactivation restores the existing tournament state and resets inactivity timing.

## Accounts and identity

- Account is not required to create or join a tournament.
- Guest gets a temporary session identity for the active tournament.
- Guest session is not a permanent identity and is not converted into an account.
- No retroactive claiming of old guest statistics in first version.
- Secure guest-device transfer is a later feature; do not implement unsafe name-only takeover.
- Display names must be unique within a tournament, not globally.

## Player claiming and invitations

- Logged-in player may explicitly claim/link an existing unlinked player slot that represents them.
- Invitations do not occupy player slots before acceptance.
- Pending invitations remain valid until the first round actually starts.
- Pending invitations are discarded at first-round start.
- If an accepted invitation changes setup before first-round start, admin reviews/approves required regeneration/consequences.
- After cutoff, use replacement logic rather than invitation logic.
- v1 invitation flow must not depend on a friend list.

## Scoring

- Players may score their own active match.
- One active scorer at a time; others can live-view.
- Scorer can transfer control; admin can override; others may request control.
- If scorer is offline for 2 minutes, another match participant may take over through server-arbitrated takeover.
- Undo is available during active scoring, including reversing game/set consequences.
- Undo may go back to match start; reversed events remain in event history.
- Redo is available until a new scoring branch is created.
- Undo/Redo ends when final-result confirmation begins.

## Match completion and result approval

- Scorer reviews the computed final result and explicitly sends it for approval.
- At least one player per team approves.
- Submitter counts as approved for own team.
- Admin-added players without own device may auto-approve.
- Corrected proposal resets approvals and timing.
- Players get original proposal plus up to two player correction attempts; unresolved dispute then goes to admin.
- After 10 minutes admin is alerted and may approve.
- After 30 minutes auto-approval may occur only if nobody has disputed/marked the result wrong.
- Physical court is freed when the match physically ends even if result approval is unresolved.
- Dependencies that require the unresolved result must not guess an outcome.

## Admin scoring and corrections

- Admin may correct live score or set a final result and end an ongoing match.
- Finalized result corrections are admin-only.
- Correction creates history; it does not erase prior result history.
- Latest completed correction is authoritative.
- Correction reason is mandatory; `Annet` requires text.
- Consequences must be simulated before mutation.
- Admin receives a concrete consequence preview.
- Already-played later matches are never automatically rewritten/deleted.
- Affected future unstarted matches may be recalculated if admin chooses.
- Correction/consequence commit should be atomic; rollback on failure.
- Notifications are sent only after successful commit.
- Restoring an old result is itself a new correction.

## Result error reports

Participants may report an incorrect finalized result and propose a correction. Multiple reports are grouped into an admin case. Admin decides; there is no majority auto-rule.

## Replacement/withdrawal

- Actual personal stats follow the actual person who played.
- Structural tournament history follows the player slot.
- Replacement inherits slot scheduling/partner/opponent structural history.
- Completed historical matches retain the actual participant.
- Original player may later return to the same slot.
- One physical person cannot occupy multiple active slots simultaneously.
- Replacing a participant during an active match resets/restarts that match at 0–0 and annuls the in-progress scoring.
- Awaiting-confirmation/disputed match must be resolved or properly annulled before participant replacement.

## Timed matches and rules

- Tournament may use normal finish or timed matches.
- At 00:00 the current game is completed; timer does not go negative.
- Tie-after-time behavior can use allowed draw, deciding game or deciding tiebreak according to the selected mode/rules.
- Scoring uses a generic minimum-points + required-margin engine.
- Classic display uses 0/15/30/40; tiebreak is numeric.
- Golden Point/No-ad and Deuce/Advantage are rule variants.
- Tournament scoring rules lock when the first match starts and remain visible as read-only.
- Each match snapshots its effective rule set.
- Cup may override time per round; only time is overridden per round.
- Clock architecture supports future countdown/count-up, pause, periods and overtime concepts while Padelstar exposes only relevant controls.

## History and statistics

- Account-owned tournament can remain in permanent history.
- Permanent personal stats belong to the actual registered player.
- Tournament-effect validity and actual personal match-stat validity are separate concepts where necessary.
- Correcting the actual result updates personal statistics to the authoritative result.
- Detailed point/event logs are operational; permanent history stores key events rather than every point.

## Notifications

- Support in-app notifications and push/PWA where platform allows.
- Distinguish necessary tournament notifications from optional notifications.
- Only optional notifications can be disabled inside Padelstar.
- First version uses system notification sounds; custom Padelstar sounds are later.
- In-app notification center has individual read/unread state.
- Opening the notification center does not mark all notifications read.
- Tournament-specific notifications are removed when the tournament finishes, except an optional final-result notification.
- Other notifications remain unread until viewed/handled according to their lifecycle.

## TV Mode

- Read-only.
- May open without a user account via dedicated viewing link/QR.
- Never grants admin/player permissions.
- Shows appropriate live tournament score/status/result information, not private account data.
- Normal completion → final standings/results.
- Reset/nullified tournament → show tournament ended/reset, not invented final results.

## Language

- Norwegian primary.
- English supported.
- Default follows device language.
- Manual override persists and wins over device language.
- User can return to `Følg enhetens språk`.
- Architecture must allow additional languages later.

## PWA

Padelstar is an installable PWA. Install UI must respect actual installability and standalone state. Installed standalone users should not be prompted to install again.

## Privacy and account deletion

- Account deletion uses a 30-day deletion period.
- Traceable account data and personal aggregate statistics are deleted after that period.
- Historical tournaments may retain unlinked historical display names and actual results where permitted by the product/privacy model.
- Active privacy/help text must match actual implementation.

## System owner

A protected `Systemeier` is required early.

- Exactly one active system owner.
- Separate protected top status.
- Automatically has all current/future system permissions.
- Cannot be modified/deactivated/removed by ordinary superusers.
- Backend/database authorization is authoritative.
- Advanced superuser permissions, permission sets, MFA/recovery and ownership-transfer flows can be expanded according to the roadmap.

## Social direction

Friend list and broader social functionality are **v2.0.0**, not v1.0.0.

First-version public profile exposure is minimal: other users see only display name. Friend list, when later implemented, is private.

## Later functionality

Potential 1.x/later work includes templates, additional tournament modes, expanded system administration, secure guest-device transfer, custom notification sounds, public template sharing/library and other approved roadmap items.

Permanent tamper-protected security audit logging is explicitly post-1.0.
