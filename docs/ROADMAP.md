# ROADMAP.md

# Padelstar – Active Release Roadmap

> **Primary objective:** Restore a reliably usable Padelstar as fast as possible.
>
> **Hard milestone:** functioning build by **Monday 21 September 2026**.
>
> **Version baseline:** `0.6.1` — the Monday critical path was verified end-to-end for `0.6.0` (see `docs/CHANGELOG.md`), and `0.6.1` is a verified UI-redesign/polish batch on top of it that changed no critical-path behavior. Version bumps are recommended only after coherent milestones are fully implemented and verified; Codex never applies them automatically — this one was applied on explicit developer instruction.
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

**Not yet run as a single continuous pass.** Every step below has been verified individually (see Phases 1–7 above and `docs/BUGS.md`), but split across separate guest-mode and account-owned sessions rather than one unbroken clean-session run-through, and a few Phase 1–7 items remain open (validation errors, logout, failed-write surfacing). Natural Round Robin completion and final standings are now verified (see Phase 4/6 above). Recommended next step before calling Monday fully done: one uninterrupted pass through this exact checklist, starting from a logged-out state.

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

- [x] Bracket generation. — verified: 8 players auto-paired into 4 teams, bracket correctly pre-created with 2 rounds (semifinal slots filled, final round + third-place slot pending).
- [x] Advancement/elimination. — verified: `admin_advance_cup` correctly detects a finished semifinal round and generates the final + third-place matches from the actual winners/losers.
- [x] Final. — verified: final match built from the two semifinal winners, correctly flagged as the bracket's final round (`finalMatchId` set).
- [x] Result-dependent future path. — verified: round 2's bracket slots started as "pending" (winners not yet known) and were filled in with the real teams only once semifinal results existed.
- [x] Final standings/result. — winner detection works correctly (`cup.winnerTeam`, `status: "Cup ferdig"` set automatically once the last match of the final round is scored — no extra click needed), and both the admin's Kamper tab and TV Mode (`tv.html`) render a full round-by-round bracket view with per-round winners and a champion banner. See BUGS.md.
- [x] End-to-end regression test. — manual pass: created an 8-player/4-court Cup tournament as the authenticated owner (with third-place match enabled), played both semifinals, the final, and the third-place match to completion, verified the bracket and winner at every step via direct DB checks, then finalized the tournament (kept, not deleted, per the account-owned path). No automated test suite exists in this project — this is the same manual-verification standard used for Round Robin.

## Phase 10 — Player live scoring

- [ ] Player can score own active match.
- [ ] One active scorer.
- [ ] Others live-view.
- [ ] Scorer transfer/request.
- [ ] Admin override.
- [ ] Offline takeover.
- [ ] Undo/Redo.
- [ ] Multi-device verification.

## Phase 11 — Result approval

- [ ] Explicit submission for approval.
- [ ] Required approvals.
- [ ] Dispute/correction proposal.
- [ ] 10-minute admin escalation.
- [ ] 30-minute conditional auto-approval.
- [ ] Dependent progression waits for authoritative result.
- [ ] Concrete `score_conflict` state when two submissions for the same match disagree; auto-confirmed only when submissions match, otherwise routed to admin.
- [ ] Visible "flagged for review" state for admin/referee escalation beyond auto-resolve.

## Phase 12 — Result correction/consequences

- [ ] Admin-only finalized correction.
- [ ] Correction history.
- [ ] Mandatory reason.
- [ ] Consequence simulation.
- [ ] Future-match handling.
- [ ] Already-played matches protected.
- [ ] Atomic commit/rollback.
- [ ] Successful-change notifications.
- [ ] Regression tests.

## Phase 13 — Replacement/withdrawal

- [ ] Structural slot vs actual-person behavior.
- [ ] Personal stats follow actual player.
- [ ] Historical participant preserved.
- [ ] Active-match restart rules.
- [ ] Disputed/unconfirmed match restrictions.
- [ ] Regression tests.

## Phase 14 — Timed matches/scoring rules

- [ ] Generic point/margin engine.
- [ ] Classic scoring.
- [ ] No-ad/Golden Point.
- [ ] Tiebreak.
- [ ] Timed matches.
- [ ] 00:00 finish-current-game behavior.
- [ ] Rule lock/snapshots.
- [ ] Cup time overrides.

## Phase 15 — Permanent history/statistics

- [ ] Account-owned history.
- [ ] Personal statistics.
- [ ] Corrections recalculate authoritative stats.
- [ ] Owner history deletion does not delete other players' stats.
- [ ] Guest has no permanent account history.

## Phase 16 — Retention/cleanup

- [ ] Guest completed/aborted retention.
- [ ] Stats saved before guest deletion.
- [ ] 30-day inactivity → expired.
- [ ] 7-day recovery.
- [ ] Account deletion lifecycle.
- [ ] Privacy documentation matches implementation.

## Phase 17 — Claiming/invitations

- [ ] Claim unlinked slot.
- [ ] Invitations without friend list.
- [ ] Acceptance/cutoff rules.
- [ ] Guest temporary session identity.
- [ ] No unsafe name-only takeover.
- [ ] Retroactive guest-stat claiming (a guest player later links their historical stats to an account) — explicitly pending a fresh product decision, not yet approved.

## Phase 18 — Notifications

- [ ] In-app notifications.
- [ ] Push/PWA where supported.
- [ ] Richer push categories: invites, results, "notify me for my own matches only" — beyond today's match-ready/round-ready triggers.
- [ ] Necessary vs optional.
- [ ] Notification center.
- [ ] Individual read/unread.
- [ ] Lifecycle cleanup.
- [ ] System sounds for first version.

## Phase 19 — TV Mode

- [ ] Read-only public viewing.
- [ ] Link/QR.
- [ ] Opens in new window/tab.
- [ ] No admin/player rights.
- [ ] Live score/status.
- [ ] Final standings/result after completion.
- [ ] Reset/nullified state handled correctly.
- [ ] Court Queue view ("Playing now / Next / After that" per court) reused across admin, player, and TV Mode surfaces.
- [ ] Nicer public/shareable results page built on the existing spectator RPC, embeddable on a club's own website.

## Phase 20 — PWA

- [ ] Manifest.
- [ ] Service worker.
- [ ] Installability.
- [ ] Standalone detection.
- [ ] Correct install CTA.
- [ ] Cache/update behavior.
- [ ] Desktop/mobile install guide.

## Phase 21 — Language/i18n

- [ ] Norwegian.
- [ ] English.
- [ ] Device default.
- [ ] Persistent manual override.
- [ ] `Følg enhetens språk`.
- [ ] Key surfaces translated.
- [ ] Selector redesign: closed state shows only the current language's flag (no permanent language name/code next to it — `index.html`'s `.language-current` currently renders both `.language-current-flag` and a `.language-current-name` span; drop the visible name, keep it available to assistive tech via the existing `aria-label`). Opening the selector clearly lists the available languages.
- [ ] Production language list trimmed to only fully translated and verified languages — for the v1.0.0 Release Candidate that's Norwegian Bokmål (`nb`) and English (`en`) only; `nn`/`es`/`de`/`fr`/`sv`/`da` (currently all offered in `index.html`'s `#languageSelect` and the custom `.language-options` dropdown) are hidden from the production selector until each is independently completed and verified, then can be re-added one at a time — same "flag it off until verified" pattern already used for the tournament-format picker (docs/BUGS.md P1, Americano/Mexicano/etc.).
- [ ] No untranslated keys or fallback strings visible in either shipped language.
- [ ] Switching language updates the interface immediately, no reload required (already true today via `app/core/language-controller.js` — verify it still holds once the selector is redesigned).
- [ ] Selector and switching work consistently on desktop and mobile.

## Phase 22 — Help/privacy/info

- [ ] Guide matches current product.
- [ ] Privacy matches actual data flow.
- [ ] Navigation matches current UI.
- [ ] Contradictory old text removed.

## Phase 23 — Initial system owner

- [ ] Exactly one protected Systemeier.
- [ ] Backend/database enforcement.
- [ ] Cannot be removed/restricted by ordinary superuser.
- [ ] Unauthorized system-admin access blocked.
- [ ] Minimum owner administration verified.

## Phase 24 — v1 security/data integrity

- [ ] Supabase RLS for v1 flows.
- [ ] Stable IDs for auth/relations.
- [ ] Guest/player/admin/owner/TV access.
- [ ] Duplicate/race handling.
- [ ] Correction atomicity.
- [ ] Cleanup cannot destroy required permanent data.

## Phase 25 — v1 resilience and UI verification

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
- [ ] No unintended overlap: text/buttons/icons/cards never collide, fixed/sticky elements never cover interactive content, at mobile/tablet/standard-desktop/wide-desktop widths. Intentional overlap (modals, dropdowns, menus, tooltips) is exempt.
- [ ] Long translated strings (English is often longer than Norwegian) don't cause overlap or broken layout at any of the above widths — check this against whichever languages Phase 21 ships for the v1.0 RC.

## Phase 26 — Documentation consolidation

- [ ] `PROJECT.md` matches current approved product behavior.
- [ ] `ROADMAP.md` is the only active development plan.
- [ ] `BUGS.md` contains only active defects.
- [ ] `CHANGELOG.md` contains completed verified release changes.
- [ ] Relevant `docs/technical/*` reflects verified implementation.
- [ ] Superseded plans moved to `docs/archive/plans/`.
- [ ] Old contradictory design/development docs archived.
- [ ] Archive clearly marked non-authoritative.

## Phase 27 — Theme system (light/dark mode)

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
- [ ] Manual gem/accent-color picker on join + profile screens — built on the `ui-makeover` branch, client-side and migration complete, **blocked on the developer applying the migration**. A 16-swatch picker (new `app/accent-picker.js`, reused for both forms) now sits on `#joinTournamentForm` and `#profileForm`; the chosen value is threaded end-to-end through the full param chain on both the local and remote join paths (`tournament-entry.js` → `app.js` → `remote-tournament.js`/`session-controller.js`/`player-state.js` → `tournament-state.js`'s `createPlayer()`) and through the profile save path (`profile-session.js` → `profile-manager.js`, plus a `p_accent` param added to the `upsert_player_profile` RPC call). Live-database investigation before writing any code confirmed the exact gap: `join_tournament_impl`'s player-building allow-list had no `accent` key at all (silently dropping it, mirroring the existing `avatarId` allow-list pattern to fix), and `player_profiles` had no `accent` column and `upsert_player_profile_impl` no matching param. Migration written to `supabase/migrations/20260917101913_player_accent_choice.sql` (not applied — `apply_migration` is blocked as a "Production Deploy" action; hand off via the Supabase Dashboard SQL Editor per this repo's established workflow). Found and fixed three real bugs during verification, all the same "shadow wrapper drops new param" class as item 2's `createTournament()` bug: `app.js` has its own separate `addPlayer()`, `createPlayer()`, and two `createPlayer:` DI-arrow wrappers that each independently forward to the real implementation — all four needed the new `accent` param added, or it was silently dropped exactly like `avatarId` would have been. Verified end-to-end against the *live* Supabase project (not a mock): joining for real with a chosen swatch color confirmed the color is correctly threaded all the way to the RPC call (traced via the real player object built client-side), and — as expected before the migration lands — the server's current `join_tournament_impl` drops the field and the client's existing `normalizeAccent()` self-heal silently assigns the usual index-based color instead, proving both that the client fix is correct and that the migration is the one remaining piece. Profile-side picker verified fully client-side (local profile save/reload correctly persists and re-selects the chosen swatch, and a saved profile's color correctly pre-selects the join picker) — the profile's remote sync (`p_accent` in `upsert_player_profile`) has the same pending-migration blocker as the join path. Mobile width checked. **Remaining**: developer applies the migration file, then a live join re-verification confirms the chosen color survives the RPC round-trip instead of falling back to index-cycling.
- [x] Podium / post-tournament celebration screen (final standings as a 1st/2nd/3rd podium layout with a trophy header, "Ny turnering" CTA) — built on the `ui-makeover` branch. Finishing a guest tournament wipes `state` as part of the same action (see `docs/BUGS.md`-style note: a guest tournament is deleted server-side on finish), so the podium can't read live state after the fact — `app/app.js`'s `endTournament()` now captures a `leaderboardEntries()` snapshot immediately before calling finalize, and `app/podium.js` renders from that snapshot alone. "Se full tabell" expands an inline full-ranked list from the same snapshot rather than navigating to the live standings tab, so it works identically whether the tournament was deleted (guest) or retained (owner). Verified in-browser at desktop and mobile widths, both a played-out and a force-finished tournament, and that "Ny turnering" reaches a genuinely clean create form (found and fixed a related bug: the create form's player textarea kept the previous tournament's names since navigating there doesn't reset form fields — `syncCreateFormDefaults()` is now called first).
- [ ] Deeper Kamper/Styring visual pass matching the mockup's flatter list-row match-card and settings-row layout — deferred in the 0.6.1 redesign specifically because `match-card.js`'s scoring buttons are wired by CSS class name, making a markup rewrite there real risk to live scoring; do this once Phase 10 (player live scoring) or Phase 25 (resilience) verification gives a safe window to touch that code without conflating a markup change with a scoring-logic change.

The design itself kept evolving in the source `claude.ai/design` conversation after the 5 items above were scoped, adding a real scoring-table redesign for "Min kamp" and a handful of smaller suggestions. Tracked here as further Phase 28 items, same ascending-risk-order discipline, on the `ui-makeover` branch:

- [x] Lobby / pre-start waiting room screen — a dedicated `data-module="lobby"` screen shown right after `handleCreate()` succeeds (instead of dropping straight into the workspace), with the invite code, QR code, a live player list, and a single "Start turnering" CTA — pulling that moment out of the Styring tab's busy rules-editing panel into its own focused screen. Almost entirely built from existing pieces: `app/link-utils.js`'s `createQrCodeUrl()`/`createJoinLink()`, `app/tournament-status.js`'s `generateRoundBlockReason()` for the same start-button guard the Styring tab's button already uses, and `app/tournament-runtime.js`'s `generateFullTournamentSchedule()`. New `app/lobby.js` module, wired into the render dispatcher and `module-routing.js` (needed its own `"lobby"` special-case there, alongside podium's — `normalizeModule()` would otherwise fall through to `fallbackTournamentModule()` and silently redirect a brand-new tournament straight to the admin panel instead of the lobby). "Gå til styring" lets an admin skip straight to the full admin panel if they need the rules form or backup tools before starting. Found and fixed a real bug during verification: the lobby's own "Start turnering" handler generated the round correctly in memory but never called `saveState()` — the very next realtime sync from the server (still holding the old, round-less state) silently overwrote the in-memory round, so the round appeared to vanish; fixed by mirroring the existing `#generateRoundButton` handler's exact `saveState(); render();` tail. Verified live against the real Supabase project end-to-end (create → land in lobby → Start turnering → round 1 actually persists and the workspace shows it), mobile width checked.
- [x] Profile screen additions: "Mine aktive turneringer" and "Kontoinnstillinger" — built on the `ui-makeover` branch, both scoped inside the existing authenticated-only `.profile-light-panel` (already hidden for guests via `account-auth.js`'s `elements.profileLightPanel?.classList.toggle("hidden", !user)`, so both new sections inherit that gating for free). Kontoinnstillinger reuses data `account-auth.js`'s `render()` already computes elsewhere on the same screen (`user.email`, `user.created_at`, `user.email_confirmed_at`) — no new query. Active tournaments needed a genuinely new read: the `tournaments` table has row-level security enabled with zero policies (confirmed live — deny-all for direct client selects), matching this app's established pattern of gating all tournament-blob access through `SECURITY DEFINER` RPCs rather than table-level RLS policies (the same reasoning as `join_tournament_impl`, `get_tournament_by_code_impl`, etc.). New `list_my_active_tournaments()` RPC (`supabase/migrations/20260917161145_list_my_active_tournaments.sql`, not yet applied — same Dashboard-SQL-Editor handoff as the accent-picker migration) reads `auth.uid()` internally, never a client-supplied id, and returns tournaments owned by that user with `status <> 'Avsluttet'`. Verified the render logic and layout with realistic mock data injected client-side (both sections render correctly, status chips, mobile width checked) — full end-to-end verification against the real RPC is blocked on the same pending-migration/real-credentials limitation as the accent picker and needs a signed-in account to exercise for real.
- [x] Six small design-chat suggestions — built on the `ui-makeover` branch, one commit, each independent and low-risk (no scoring-engine changes):
  - **Header scoping**: no code needed. Checked `#tournamentTitle`/`#roundLabel` (`index.html:477-478`) — they already live inside the workspace module's header, hidden on landing/login by the same show/hide loop as every other module. The mockup's flaw (title/version showing before a tournament exists) doesn't exist in this app's actual structure.
  - **Empty states**: Stilling already had one (`app/standings.js`'s `appendEmptyText(container, t("tournament.standingsEmpty"))`). The mockup's "ticker" has no equivalent concept anywhere in this app (TV-mode-only decorative idea in the original design, never built) — nothing to add an empty state to.
  - **Gem-color identification**: `app/court-queue.js`'s court-strip team names were plain text; now wrapped with `teamAccentStyle(team)` (already used on match cards, reused as-is) via a new `.court-queue-team` class with a colored left border, so a player's own accent color now identifies them on the court queue too.
  - **Offline unsynced-results indicator**: `app/admin-status.js` already tracked `pendingRemoteWriteCount()` for the admin's connection pill; now also surfaced on the player's own identity card (`app/player-controls.js`) as a small amber "sender (N)" chip when there are unsynced writes — reusing the existing counter, no new tracking.
  - **Waiting-state detail**: `app/player-next-match.js`'s "waiting" branch now computes how many other queued matches (by `queuePosition`, already used for the court queue's ordering) come before the player's own uncourted match, and shows "Du spiller om N kamper" when that count is positive — matching the mockup's "du spiller om 2 kamper" wording.
  - **Round-end summary**: `#generateRoundButton`'s handler (`app/admin-form-events.js`) now awaits a confirmation dialog with a round recap ("3/3 kamper spilt i runde 1. Klar for neste runde?") before advancing, whenever it's completing an active round rather than generating round 1 — reuses the existing `<dialog>`/`requestConfirmation()` mechanism already used for cancel-match/finish-tournament confirmations. Found and fixed a real bug during verification: the DI wrapper for `requestConfirmation` inside `admin-form-events.js`'s instantiation only forwarded a single `message` argument, silently dropping the custom title on every call from that file — the dialog worked but always showed the generic "Bekreft handling" title instead of "Runde N ferdig" until fixed to route through the existing `requestConfirmationWithTitle()` two-argument wrapper.
  - Verified live: full round 1→2 transition through the real UI (play 3 matches to completion, confirm the round-end dialog shows the correct round number and score, confirm accepting it correctly generates round 2), court-queue gem colors and the waiting-player hint both confirmed rendering correctly with real tournament data (6 players, 1 court, forcing a queue).

## Phase 29 — v1.0 Definition of Done

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

- [ ] Rule templates.
- [ ] Time templates.
- [ ] Tournament templates.
- [ ] Court templates.
- [ ] Participant templates.
- [ ] Official standard templates.
- [ ] Setup conveniences for the above templates: reuse-last-setup, favorites, archive/restore.
- [ ] Additional tournament modes: Americano, Team-Americano, Mexicano, Team-Mexicano, King of the Court, Groups+Playoffs are already exposed in the UI with client-side scheduling logic (`app/tournament-modes.js`) but have no server-side round-advancement RPC (`admin_advance_round_impl` only accepts `roundRobin`) — deactivated in the UI until each is server-wired and verified end-to-end like Round Robin; re-enable one at a time as they pass verification.
- [ ] Liga tournament format (league setup, match generation, table/ranking, final standings) — pushed out of the v1.0 Monday/RC critical scope per explicit developer decision; Round Robin and Cup remain the v1.0 formats. Revisit once both are fully stable and the Priority 1 phases above are done.
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
- [ ] Superusers and granular permissions — concrete deliverable: build out `admin.html` (currently a placeholder stub) as the owner's/superusers' app-administration surface: template creation, permissions management, and other app-wide functions, distinct from in-tournament admin controls. A visual reference for this exists (screen 14 of the Claude Design UI redesign handoff, see `.claude/plans/we-can-plan-new-playful-volcano.md`): a Systemeier-only `admin.html` shell with Oversikt/Brukere/Turneringer/Retention/Logger tabs — metric cards, a searchable user table (block/delete actions), a system-wide tournament list, and retention/log views. Deliberately not built as part of that UI redesign — it's new functionality needing backend endpoints (user listing, block/delete, retention job status, log access) that don't exist yet, not a restyle of something already there.
- [ ] Permission sets.
- [ ] MFA/step-up/recovery where required.
- [ ] Secure guest-device transfer.
- [ ] Template sharing/public library when approved — concrete deliverable: a template marketplace living inside the `admin.html` dashboard above.
- [ ] Custom Padelstar notification sounds.
- [ ] Player result-error reporting/admin cases (D67–D71) if not already implemented.
- [ ] Owner Admin global theme management, built on Phase 27's theme architecture and living inside the `admin.html` dashboard above: Systemeier selects which installed theme (standard PADELSTAR, plus future seasonal ones — Christmas, Winter, Pride, Summer, etc.) is the app-wide default, stored centrally (not just in the admin's own browser) so it applies to all users without a redeploy. Visual theme (standard/Christmas/Pride/...) and display mode (light/dark) stay separate concepts, combinable freely (e.g. "Christmas + Dark"). Each installed theme carries an explicit status (`active`/`available`/`disabled`/`development`); only `active` ones are selectable as the production default, and a theme that fails to load falls back to the standard PADELSTAR theme safely. Changing the global theme must never touch tournament or user data.
- [ ] Scheduled theme activation (e.g. auto-switch to Christmas Dec 1–26) — build the manual Owner Admin theme switch above first; automatic scheduling is a later enhancement on top of it, not required alongside it.

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
