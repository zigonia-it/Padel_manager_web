# CHANGELOG.md

# Padelstar Changelog

Only verified completed changes belong here.

## Unreleased

## 0.17.0

The generic scoring engine (Phase 14, in the 1.0 scope; developer's decisions 2026-09-24). Verified: 561 automated tests (new: 14 engine scenarios shared by JS and SQL, form/validation/quick-pick tests), 22 PGlite database suites green (new: `generic-result-rules`), the migration applied live and checked (legacy rules, a points result, the three patched functions, grants, and a rolled-back 8-point points match through `save_player_point_impl`), and the wizard, Styring rules form, live scoring of a full best-of-three points match and the tennis labels checked in the browser.

### Added
- **Three configurable levels.** Game (points), set (games) and match (sets) each follow "first to N, win by M", every number 1..999, no hard cap. Tennis and padel are the default numbers (game 4 points win by 2, set 6 games win by 2, first to N sets); older tournaments map onto the new rules exactly and all 23 existing scenarios pass unchanged, in JS and in SQL.
- **"Points" scoring** next to "Tennis and padel": first to N points, win by M, first to G games (best of several games), e.g. first to 21 win by 2. Works for Round Robin and Cup, live point-by-point (admin and players), typed results, corrections, approval, statistics and timed matches. Play continues without an upper limit until the margin is reached (20-20 goes on to 22-20).
- **Rules form**: a Scoring choice (Tennis and padel / Points) in the create wizard and in Styring. Tennis shows games per set, sets per match, tiebreak and an "Advanced rules" section (points per game, game margin, set margin, match margin); Points shows first to, win by and games to win the match.
- Set-result dialog: quick buttons for short lists of finished scores, two number fields when the list is long (first to 21).
- `_scoring_rules`, `_scoring_set_complete`, `_scoring_match_won` and `_approval_validate_proposal(sets, rules)` in the database; `save_player_point_impl` reissued; `admin_set_result_impl`, `admin_correct_result_impl` and `match_result_action_impl` patched in place (migration `20260924120000_generic_scoring_rules.sql`, applied live).

### Changed
- The scoreboard, large score, match summary, live overview and rules page follow the rules: 15/30/40/A only for four-point games, points matches show games won and running points.
- The rules page says "best of 2N-1 sets" for "first to N sets" (it said best of N).
- The game-mode select is replaced by the game margin field (1 = golden point); `gameMode` is still written for older readers.
- Rule limits raised: games per set and sets per match up to 999 (were 12 and 5).

### Known open question
- "Match: 3 sets, no margin": the engine can do it (first to N sets); new tournaments still default to one set per match until the developer decides the default (USER_ACTIONS).

## 0.16.2

Developer's decision 2026-09-22 ("keep the new one"): removed the older "Resultatforslag" result-proposal flow, keeping only the point-by-point live scoring + approval workflow as the single way to report a result. Verified: 538 automated tests (new: a dom-elements test locks in a wiring fix found while verifying this, an insights test for the replacement conflict finding), the live database grant revoked and checked, the change checked in the browser (dark/light, desktop/phone, admin and player views).

### Removed
- **The player-side "Registrer kampresultat" form** (typed set score, sent for the admin to pick between disagreeing proposals) and its admin-side "Resultatforslag" review panel. Deleted `app/result-submissions.js`, `app/score-submissions.js`, `app/remote-player-result.js` and all their wiring (dom-elements, event bindings, render dispatch, CSS, translations in all 8 languages).
- The database RPC `submit_match_result` is decommissioned: revoked from `anon` (applied live), kept defined rather than dropped since it never touched scores, standings or progression.

### Changed
- `assistantFindings()`'s `score_conflict` finding (Turnerings­assistenten) now looks at a player-scored result that is flagged for the admin (the only conflict state left), instead of the removed proposal mechanism it used to read.
- **Fixed while verifying this**: `#tournamentAssistant` / `#tournamentAssistantFindings` were never captured in `app/bootstrap/dom-elements.js`, so the tournament assistant panel has never rendered in production regardless of what it had to show. Now wired in.

## 0.16.1

Critical bug (developer, 2026-09-21): on a phone, pressing Personvern (or the guide) gave a blank screen with no way back. Verified: 540 automated tests (5 new in `test/info-dialog.test.js`) and the popup checked in a phone-sized browser. **I could not reproduce the blank screen** in the browser here (the popup rendered), so the fix removes every way the popup can trap a phone user rather than one identified cause: it needs a check on the real phone (USER_ACTIONS).

### Fixed
- **The X belongs to the dialog now, not to the page in the frame.** On a phone the popup fills the screen and its only close button was inside the frame, so a frame that stayed blank left nothing to press. The dialog has its own X (always on top, outside the frame); the page's own X is no longer shown inside the popup. Escape still closes it.
- **The frame is no longer lazy-loaded** (`loading="lazy"` on a frame inside a dialog is the most likely cause of a blank frame on iOS Safari).
- **Fallback:** if the page has not loaded within 8 seconds, or the frame shows something other than the page (for example an empty or wrong document), the popup closes and the guide/privacy page opens as an ordinary page (with its own back link). A page that loads properly cancels the wait.

## 0.16.0

The "expired, resume" notice (Phase 16; in the 1.0 scope by the developer's decision 2026-09-20). Verified: 536 automated tests (5 new in `test/expiry-notice.test.js`), the new PGlite suite `supabase/tests/tournament-expiry-status.pglite.mjs` (8 checks), the migration applied live, and the notice rendered and dismissed in the browser against a stubbed server.

### Added
- **Expiry notice for the admin.** A guest tournament with no real activity for 30 days is marked expired and deleted 7 days later. The admin now sees a notice at the top of the workspace: "Turneringen har vært inaktiv i over 30 dager og er markert som utløpt. Den slettes {dato} hvis du ikke fortsetter.", with a button "Fortsett turneringen". The button makes one real change to the tournament (`lastResumedAt`), which the database trigger answers by clearing the expiry (any real state write reactivates it; this was already so).
- `admin_tournament_expiry(uuid, text)` (migration `20260920240000_tournament_expiry_status.sql`, applied live): answers only to the tournament's admin token (rate-limited like the other admin functions) with `{expired, expiredAt, deletesAt}`; reading changes nothing. The app asks once per tournament and page load; a failure keeps the notice hidden. Account-owned tournaments never expire, so they never show it.

### Not done
- The notice is only seen when the admin opens the tournament (there is no email). A player or spectator sees nothing.

## 0.15.1

The colour spec was sent again (2026-09-20). Every value in it already matched `styles/tokens.css` (0.11.0); this batch adds what the new text has on top, and fixes primary buttons that never followed the spec. Verified: 531 automated tests (3 new in `test/color-tokens.test.js`), computed styles checked in the browser in both themes.

### Added
- **Logo-derived tokens** (both themes, exact values from the spec): `--accent-violet`, `--accent-violet-deep`, `--chrome-high/mid/low`, `--brand-navy`, the two ramps `--ramp-accent` (blue into violet) and `--ramp-gem`, and the themed `--btn-primary-shadow` (dark: the wide blue glow, light: a tighter deeper shadow).
- The accent ramp fills the progress bars (`.progress-track`, the create-wizard steps). Violet and chrome are never used as text colours (tested). `--ramp-gem` is defined for the brand monogram, but no component uses it yet: the header logo is an image, and the player gems keep the roster palette.

### Fixed
- **Primary buttons did not use the primary tokens.** A later override in `ui-consistency.css` gave `.primary` and the landing call-to-action a cyan-to-blue diagonal gradient and no shadow, so the spec's gradient (`--btn-primary-from/to`, pale-to-vivid on dark, deep blue with white text on light) and shadow were not what people saw. Both now use the tokens, and the other primary-style controls (active sub-tab, menu item, `.ds-btn-primary`) take their shadow from `--btn-primary-shadow` too. This is a visible change of the primary buttons in both themes: please look at it (USER_ACTIONS).
- The service worker precached `./assets/icons/vs_icon`; the file is now `vs_icon.png` (renamed in the working tree), so the reference follows it. The old extensionless file is removed.

## 0.15.0

Push categories (Phase 18; developer's decisions 2026-09-20: categories match/ready, results, withdrawal decisions and invitations, one "only my own matches" switch, choices stored on the push subscription). This version builds the tournament categories; **invitation push is not built yet** (it needs an account-level push subscription, see USER_ACTIONS). Verified: 514+ automated tests (new: `test/push-recipients.test.js` runs the TypeScript recipient rules directly, `test/push-preferences.test.js`), the new PGlite suite `supabase/tests/push-preferences.pglite.mjs` (15 checks), the migration applied live and the deployed function smoke-tested (unauthorized calls answer 401, bad requests 400). **Not tested with a real phone** (there were 0 push subscriptions in production): USER_ACTIONS.

### Added
- **Switches on the profile page** (panel "Varsler og lyd"): "Kampen min er klar, ny runde", "Resultater som er rettet", "Lagkameraten min har trukket seg og jeg må velge" and "Bare mine egne kamper (ny runde varsles alltid)". The choices belong to the device (`app/push-preferences.js`).
- **Enforced on the server.** The choices are copied to the device's push subscription (`push_subscriptions.prefs`, via `set_push_preferences`, which checks the player's token; guests and signed-in players). The `push-send` edge function reads them with the service role and filters before it sends (`supabase/functions/push-send/recipients.ts`): a switched-off category is not sent, "only my matches" narrows match and result messages to the players of that match (found in the tournament's state; a match that cannot be found bothers nobody who asked for it), and a new round is always announced.
- **Withdrawal push**: when the admin withdraws a player, the teammate of each affected match gets a push message ("Lagkameraten din har trukket seg. Velg om du vil spille alene eller gi walkover."), only to that teammate.
- Migration `20260920230000_push_preferences.sql` (applied live) and `push-send` version 4 deployed (same `verify_jwt: false`, the function authenticates with the tournament's admin token).

### Fixed
- A signed-in player could not switch push off: `delete_push_subscription` was granted to guests only. It is now granted to signed-in players too (same player-token check).
- The deployed `push-send` (v3) was older than the repository: it lacked the push-endpoint allow-list and the 100-subscription limit. Version 4 has both.

### Not built
- **Invitation push** (a push message to an account when it is invited): needs a push subscription per account (not per tournament), a subscribe switch on the profile page, and a server-side lookup of the invited account by email. Planned as the next step.
- A Cup round created by the server that blocks a match for a teammate's decision does not send the withdrawal push (only the admin's withdrawal action does).

## 0.14.0

Two-factor authentication for the system menu (developer's decision 2026-09-20), and a hint for common names. Verified: 514 automated tests (18 new in `test/system-two-factor.test.js`), the new PGlite suite `supabase/tests/system-owner-two-factor.pglite.mjs` (19 checks) and the existing owner suites, the migration applied live, the two-factor screens checked in the browser (dark and light). The live enrolment with a real authenticator app was done by the owner and confirmed working (2026-09-20).

### Added
- **Two-factor for System.** The owner signs in as before and opens System; the page then asks for a 6-digit code from an authenticator app (TOTP, Supabase Auth MFA). The first time it shows a QR code and the key to set the app up (any app that supports one-time codes works), with the advice to scan the QR code on two devices or save the key in a password manager. The page loads no administration data before the code has been accepted.
- **Enforced in the database.** `is_system_owner()`, which every owner function starts with (overview, lists, log, block, delete), now also requires an `aal2` session, so a password alone or a stolen password-only session reaches nothing, whatever the page does. The new `system_owner_status()` (works at the password level, answers only about the caller) lets the page and the menu link know that the caller is the owner and must enter or set up the code. Migration `20260920220000_system_owner_two_factor.sql` (applied live).
- The unverified-account cleanup (0.13.1) is unaffected (it runs in the database).

### Changed
- Name fields: a hint under the name on the join form and the profile form says that people with a common name should add the first letter of the surname (for example "Anna K."); the profile name (or nickname) is what fills the join form. The message for a duplicate name gives the same advice.

### Notes
- **Lost authenticator app without a backup:** the owner is locked out of System (not of the rest of the app) until the factor is removed in the database: `delete from auth.mfa_factors where user_id = (select user_id from public.system_owner);`. See `docs/technical/operations.md`.
- The Cloudflare Turnstile secret has been pasted into Supabase by the developer, so sign-ups without the check are refused.

## 0.13.1

Accounts whose email address is not verified within 7 days are deleted (developer's policy, 2026-09-20). Verified: `supabase/tests/unverified-user-cleanup.pglite.mjs` (17 checks), the migration applied live, and the live job, grants and due counts checked.

### Added
- **Automatic deletion of unverified accounts** (`cleanup_unverified_users()`, pg_cron job `padelstar-unverified-users`, daily 03:20). An account is deleted once 7 days have passed since it was created and its email is still not verified. Accounts that existed when the policy was set are deleted on **2026-09-28** at the earliest (nothing is deleted before then; at the time of applying, 41 of 45 accounts were unverified and all 41 come due that day). The system owner and any account that owns a tournament are never deleted. Each deletion is written to the system log with the reason and the account id only. The function is not callable from the API.
- The privacy page (nb, en) and the "check your email" message at sign-up say that unverified accounts are deleted after 7 days.
- Migration `20260920210000_unverified_user_cleanup.sql` (applied live).

### Not done
- No reminder email is sent before an account is deleted (see USER_ACTIONS).

## 0.13.0

Withdrawal in a Cup (developer's decision 2026-09-20). Verified: 504 automated tests (12 new in `test/cup-withdrawal.test.js`), a new PGlite suite for the migration (`supabase/tests/cup-withdrawal.pglite.mjs`, 28 checks; all 16 suites pass), the migration applied live and its grants checked, and the whole flow run in the browser (4 teams; players on both sides of a match withdraw; the confirmation dialog; declining changes nothing; confirming creates the next round with the best loser).

### Added
- **A player can withdraw in a Cup**, with the same conditions as in a Round Robin: the team's matches in the current round wait for the remaining teammate, who plays alone or gives a walkover (the admin can decide too). If nobody is left on a side the opponents win by walkover at once.
- **Teams that advance with a withdrawn player** meet the rules when the next round is created: a match with a withdrawn player waits for the teammate, a side with nobody left loses by walkover, both sides affected = the match is cancelled. The server does this in `admin_advance_cup` (guest and account tournaments); the local (offline) path does the same in `app/player-withdrawal.js` `handleNewRound`.
- **Lucky loser**: when both sides of a Cup match withdrew, the match is cancelled and the best-placed losing team of that round takes its place in the next round. The admin has to confirm ("Beste taper rykker opp", naming the team) and the server refuses to use a lucky loser without the confirmation (`p_confirm_lucky_loser`). The team gets a note on its match. "Best-placed" (the proposal was confirmed in use, see USER_ACTIONS): the losers of the round all reached the same round, so the games difference over the cup decides, then the order of their match; a team that lost by walkover or has nobody left is not a candidate. No candidate = nobody takes the place; an odd number of teams gives the last team a bye (also in the local path, which used to drop it).
- Migration `20260920200000_cup_withdrawal.sql` (applied live): `admin_advance_cup(uuid, text, integer, boolean default false)` replaces the three-argument function (old callers keep working) plus the private helpers `_cup_absent_players`, `_cup_absent_record`, `_cup_games_difference`, `_cup_lucky_losers`, `_cup_apply_withdrawals` (not callable from the API). `match_withdrawal_decision` needed no change.

### Changed
- The Cup no longer refuses withdrawal (the message `messages.withdrawBlockedCup` is gone). A walkover or decision in the final round now ends the Cup at once (`markCupCompleteIfDone`).

### Known limits
- A team that plays alone gets a new team id, so its earlier games (under the old id) do not count in the lucky-loser ranking.
- A walkover decided by the teammate through the database function in the final round does not by itself set the Cup champion on the TV page until the admin next acts; the standings are unaffected.

## 0.12.0

The lobby and the tournament workspace are one screen (developer's decision 2026-09-20). Verified: 492 automated tests; the critical path (create -> lobby -> start -> Styring -> results) and the lobby panel checked in the browser (dark and light, desktop and 375 px phone).

### Changed
- **Lobby is the first panel of the workspace** (Lobby / Styring / Kamper / Tabell): the separate lobby screen is gone. The side rail, the phone tab bar and the sub-tabs all open it, before and after the tournament has started. `showModule("lobby")` (used after creating a tournament and by older links) now opens the workspace with the Lobby panel for an admin.
- "Start turnering" and "Gå til styring" in the lobby lead straight to the Styring panel. After the start the lobby stays available as a read-only view: the start button, the add-players form and the court form are hidden and removing players is disabled (the same rule as in Styring).
- The phone tab bar holds five items (Lobby, Styring, Kamper, Tabell, TV Mode) and fits a 375 px screen without widening the page.

### Not changed
- Styring still has its own player management, share details and court settings (the advanced ones); the lobby panel offers the same first-run set-up beside them. Removing that duplication is a later clean-up, not a blocker.

## 0.11.1

- **Link fields** in Styring and the lobby (join link, spectator link) had no padding before the text: they are real fields with room now.
- **Footer**: "Denne siden er under Betautvikling" (the developer's text), translated in all languages.
- **"I'm not a robot" check**: the Cloudflare Turnstile widget `Padelstar` (Managed, host `padelstar.app`) was created and its public site key is in `supabase-config.js`, so the dialog now appears on sign-up and sign-in. Supabase does not check the token yet: the secret key still has to be entered under Authentication -> Attack Protection (by the developer, `docs/technical/captcha-setup.md` step 3).
- Note: a code formatter that reformats `index.html` on save breaks the tests that check its exact markup; keep the file's formatting as it is.

## 0.11.0

The colour system (developer's design decision 2026-09-20) and the sign-up check. Verified: 489 automated tests; both themes checked in the browser at desktop and phone widths on every main view, TV Mode, the privacy page and the dialogs with `scripts/contrast-audit.js` (nothing below 4.5:1 except the two exceptions listed below). No database changes.

### Changed
- **One token set, two themes** (`styles/tokens.css`): `:root` is the dark theme, `[data-theme="light"]` the light theme, with exactly the specified values. Dark is a lifted slate navy (page `#1b2438`, cards `#233049`, cards separate from the page by lightness); light is a soft blue-white (page `#eef3fa`, pure white cards). The themes are tuned separately (accent blue `#3d97f0` on dark is `#17559f` on light), and the light primary action is a solid deep-blue gradient with white text.
- **No colour literals in components.** A codemod (`scripts/migrate-colors.js`) rewrote 769 hex/rgb literals in 24 stylesheets to role tokens (surfaces, borders, ink, accents, primary/secondary buttons, washes, shadows). `scripts/color-audit.js` finds any that come back and `test/color-tokens.test.js` fails on them. The legacy variables are aliases of the tokens.
- The generated light layer is gone (`theme-light.css`, `tv-light.css`, the generator and its palette). The theme attribute is `data-theme` on `<html>` (was `data-theme-mode`). The saved choice (`padelstar-theme`) is unchanged; the device's `prefers-color-scheme` decides only on the first visit (no live following any more).
- **Player gem colours from one helper** (`gemFill`, `gemInk`, `gemTint` in `PadelstarAccentSystem`): the base hex fills the gem in both themes; the initials are the hex lightened 45 % on dark and darkened 30 % on light (light initials are at least 4.5:1 on white; the old value was 1.7:1); the row tint is `rgba(hex, .09)`. The palette follows the design (`gold` is now `#8a6a10`).
- TV Mode uses the same tokens and its switch; the browser bar colour (`theme-color`) follows the theme.
- Contrast: every text token is at least 4.5:1 on every surface in both themes (tested). Two known exceptions of the specified values: white on the lighter end of the light primary gradient (`#2f7fd4`) is 4.1:1 (bold button text), and the dark-theme gem initials for the darkest hues (onyx 3.6, sapphire 4.0, garnet 4.2) are below 4.5.

### Added
- **"I'm not a robot" check** for sign-up, sign-in and the admin sign-in link (Cloudflare Turnstile, `app/captcha.js`). Off until a site key is put in `supabase-config.js` and the secret in Supabase (Authentication -> Attack Protection): see `docs/technical/captcha-setup.md`. The privacy page names Cloudflare Turnstile; the Content-Security-Policy allows it.

### Operations
- GitHub Pages is switched off (the workflow was disabled and the site unpublished; it failed on every push and nothing referenced it). Vercel is the only host.

## 0.10.0

The developer's decisions of 2026-09-20 (batch 1). Verified: 484 automated tests, 15 database test files (all pass), the three new migrations (`20260920170000`, `20260920180000`, `20260920190000`) applied live and checked (grants, signup trigger via a rolled-back insert). Not built yet from that list: withdrawal in a Cup (with walkover and a lucky loser taking the place of two withdrawn teams) and the merge of lobby and workspace (0.11).

- Privacy page: a bottom section names the services used (Supabase in the EU, Vercel and its analytics, Resend, jsDelivr, flagcdn.com, quickchart.io).
- TV Mode in the phone's bottom tab bar; the TV page now fits a phone (stacked panels, nothing clipped, header fits 375px).
- System administration: a **Logg** tab (sign-ups, tournaments created / finished / deleted, the owner's own actions; ids and coarse facts only, kept 90 days, cleaned nightly by the job `padelstar-log-cleanup`) and **block / unblock / delete** for accounts in the Brukere tab (always confirmed, never the system owner or yourself; blocking ends the sessions, deleting cascades to profile, statistics and links and leaves owned tournaments without an owner). Migration `20260920170000` (29 database checks, applied and checked live, signup trigger verified with a rolled-back insert).
- Invitations by email (`api/invitation-email.js`): sent from `invitations@padelstar.app` after the invitation is saved; the function re-checks admin token, pending invitation and invite code with the database and is rate limited.

- The feedback API ignores surrounding quotes, spaces and line breaks in `RESEND_API_KEY`, `FEEDBACK_TO_EMAIL` and `FEEDBACK_FROM` (a pasted value with quotes made Resend answer 422).

- The feedback API's 502 now includes `providerStatus` and Resend's short error name (`providerError`), never the key, an address or Resend's message text, so a wrong key can be told from a sender/recipient mismatch (`docs/technical/feedback-setup.md`).
- **Corrections after the tournament is finished**: the admin can correct a finished result in a finished (not cancelled) tournament; the account statistics (matches, wins, sets, games) are recalculated in the same transaction (`_recompute_account_statistics`), and the finished tournament stays read-only otherwise (only results and revision may change, only through the correction function). In the app only the correction button is offered on finished matches. Profile → "Avsluttede turneringer" (`list_my_finished_tournaments`) opens one of your finished tournaments on any device. A Cup result that later matches depend on stays blocked.

## 0.9.2

Bug-fix batch from the developer's report of 2026-09-20 (second). Verified: 467 automated tests (new: `openTvMode` run against a fake window, the TV page and its generated light theme, the lobby's remove button, the rail's lobby item), and the fixes exercised in the browser (TV Mode in dark and light, the lobby, the rail). Not verifiable here: a real pop-up blocker and a real TV.

### Fixed
- **TV Mode opened in a new window and in the same window at the same time.** `window.open(url, "_blank", "noopener")` always returns `null`, which the code read as "pop-up blocked" and then also sent the current tab to the TV page. It is opened without that feature now, with the opener link cut by hand, and only a truly blocked pop-up falls back to the current tab. The old test pinned the buggy call; it now runs the function against a fake window.
- **TV Mode had no Lys/Mørk switch.** The TV page has a switch next to the clock that uses the same saved choice as the app (and follows the device until one is chosen). Its light theme is generated from `tv.css` by the same generator (`styles/tv-light.css`, corrections in `styles/tv-light-manual.css`); text contrast was checked.
- **Remove player was missing in the lobby.** Every player row has a "Fjern" button (same function and the same rule as in Styring: not after the schedule has started, then it is disabled).
- **No way back to the lobby from Styring.** The side rail (desktop) and the bottom tabs (phone) have a "Lobby" item first, shown to the admin while the tournament has not started.

## 0.9.1

Bug-fix batch from the developer's report of 2026-09-20. Verified: 463 automated tests, 13 database test files (all pass, including 36 new checks), the two new database migrations applied to the live project and checked there (grants and behaviour), and the fixes exercised in the browser at phone and desktop widths. Not verifiable without a real device or a second signed-in account: see `docs/USER_ACTIONS.md`.

### Fixed
- **Profile → "Mine aktive turneringer"**: every row now has a "Fortsett som admin" button, and a signed-in owner can open their own tournament from any device (created on the phone, continued on the Mac). The admin token used to exist only on the device that created the tournament; the new function `open_owned_tournament` (migration `20260920150000`) hands it to the verified owner only (`owner_user_id = auth.uid()`, rate-limited, the same answer for "not found" and "not yours"). An unstarted tournament opens in the lobby.
- **Language picker on iPhone**: tapping the flag opened the custom menu and then iOS's own language list. The picker was a `<label>` around the hidden native `<select>`, so a tap also activated the select. It is a `<div>` now.
- **Phone menu**: rebuilt as one column (language first, then the links, the Lys/Mørk switch full width) with opaque background, fits short screens (scrolls) and shows the language name. Before, two columns of unequal buttons overlapped and the theme switch was cut off.
- **Light mode, square panels and wrong colors**: the light theme generator dropped every later rule that reset a color (`background: transparent`, `border: 0`, ...), so the twin of an earlier rule won and panels got a background the dark theme never had (page sections, the workspace header, the footer, button shadows, ...). Reset rules are now carried over and the twins follow the browser's stylesheet load order. Also: the palette got the design's page, surface, border, accent and text colors for the `--figma-*` tokens, translucent light-blue fills stay light-blue (the design's `rgba(91,173,255,.14)`), primary buttons use the design's `#A1D6FF → #008DF9` gradient with dark text, secondary/ghost buttons are flat blue tints, the dark hero vignette no longer grays the light hero, placeholders are readable, the phone menu button's bars are dark. New audit `scripts/theme-parity-audit.js` finds any element the light theme fills, borders or shadows that the dark theme does not (it flagged the old build on every screen and reports nothing now).
- **System administration** (`admin.html`): now has tabs. Turneringer (search on name, status filter, paging, 25 per page), Brukere (search on e-mail, owner/confirmed/last sign-in/counts), Vedlikehold (what waits for cleanup and the scheduled jobs with their last run). Read-only, owner-only (`admin_list_tournaments`, `admin_list_users`, `admin_maintenance_status`, migration `20260920160000`; none is executable by `anon`; no tokens, invite codes or password data). Text no longer runs outside the page: the heading scales, names and addresses wrap, and on phones every table row becomes a card.
- The empty account status chip drawn as a stray circle on the signed-out account page; the join preview's avatar initials sat in a corner of the gem.

### Added
- `scripts/bump-asset-versions.js` (bumps the cache-busting versions of every changed asset and the service worker cache name; `--check` in CI-like use) and `scripts/theme-parity-audit.js`.

## 0.9.0

Released on the developer's authorization to bump verified milestones (2026-09-19): the theme system (Phase 27). Verified: 446 automated tests, the light theme is generated and checked in sync, resolution rules tested and checked live (light device on first use, manual override, persistence, "Følg enheten"), a contrast sweep of every main view (nothing below 3.5:1) and screenshots of the light theme. **Awaiting your eyes** on real screens: see `docs/USER_ACTIONS.md`.

### Fixed
- The sign-in and account form on phones: labels and inputs were 220px tall and pushed to the right (`.inline-form` is a column on phones but its labels kept their row sizing). It was present in 0.8.0 and earlier; found while checking light mode.

### Added
- **Light mode (Phase 27)**: a light look next to the dark one, switched with Lys/Mørk in the header or menu or with "Utseende" on the profile page, following the device on first use and remembered afterwards, applied instantly. Colors follow the Claude Design Light mockup; layout and markup are identical in both looks. `styles/theme-light.css` is generated by `scripts/build-light-theme.js` (a test fails if it is out of date); `scripts/contrast-audit.js` measures text contrast.

## 0.8.0

Released on the developer's authorization to bump verified milestones (2026-09-19). Covers roadmap Phases 13 (withdrawal), 15, 17, 18, 19, 22, 23, 25 and 26. Database migrations `20260920100000` (withdrawal decision), `20260920110000` (system owner), `20260920120000` (claim an unlinked slot) and `20260920130000` (invitations) were applied to the live project and checked there. Verified: 431 automated tests, the in-memory database tests for every migration, rolled-back checks on the live database, a live critical-path run in the browser (guest create → lobby with add player/name court → start → three rounds → finish → podium → new tournament form), and a layout audit at phone/tablet/desktop/wide/TV sizes. **Still awaiting a person on real devices/accounts** (see `docs/USER_ACTIONS.md`): the owner page as the signed-in owner, invitations with two accounts, notification sound/vibration on a phone, network loss in a running match, and the feedback email (needs the Vercel settings).

### Added
- **Claiming and invitations (Phase 17)**: a signed-in account can claim an unclaimed pre-added slot (it was refused before); the admin can invite people by email from the lobby, they see and accept or decline the invitation on their profile page, and nothing reserves a place until they join. Both changes are applied to the live database.
- **Lobby**: players can be added and courts named directly in the lobby (same rules and handlers as the Styring tab; both stay in sync). The Styring/Kamper/Tabell workspace is unchanged: merging it into the lobby is a bigger redesign and is left to your decision.
- **System owner (Phase 23)**: one protected system owner stored in the database (only the database owner can hand it over), an owner-only `admin.html` with a minimal overview, and a "System" menu link that only the owner sees. Nothing on the page is granted by the front end: the server decides.
- **Notifications (Phase 18)**: a bell with an unread badge and a notification center for the player (match ready, result to approve, teammate withdrew, result corrected, tournament finished), the Padelstar sounds (notification1 = your match is ready, notification2 = other updates) and vibration, with a "Varsler og lyd" settings panel on the profile page to turn sound and vibration on or off.
- **Guide and privacy as a popup (Phase 22)**: the footer links open the pages in a popup with an X inside the card (also Escape and a click outside); they follow the chosen language, including "device language" (they showed Norwegian on an English device). The privacy text and guide are in plain language, the guide covers scoring, approval and withdrawal, and the outdated retention text is gone.
- **TV Mode (Phase 19)**: always opens in a new tab; the button sits at the bottom of the side rail, which now fits the window height (no scrolling to reach it).
- **Menu and footer**: with a tournament running the top menu shows Home, Current tournament and Profile (plus language, online status and feedback); the footer feedback button now looks like the install button.
- **Phase 25**: responsive and touch-target fixes from a layout audit (the phone header bell, tap areas, long names wrap in the scoreboard, podium and TV standings), `scripts/ui-audit.js`, and a test that a failed statistics transfer changes nothing.
- **Phase 26**: technical documentation written from the verified implementation, `docs/BUGS.md` reduced to active defects (history archived), `docs/USER_ACTIONS.md`.
- Fixed three stale tests, filled `docs/technical/privacy-retention.md` and `operations.md`, and added a test that every asset carries the same `?v=` version on every page.
- **Player withdrawal without a replacement (Phase 13)**: "Trekk spiller" in the players list (after a confirmation that lists the effects). The player's finished matches and statistics stay. Their unplayed matches are kept and wait for the remaining teammate, who chooses to **play alone (1 against 2)** or **give a walkover** (the opponents win); the admin can decide for them, also in a later round. If nobody is left on that side the opponents win by walkover automatically; a match in progress is restarted at 0–0 and annulled first (its court goes to the next waiting match); a result awaiting approval blocks the withdrawal. A withdrawn player can be put back ("Sett tilbake", not while a match is being played 1 against 2) or replaced ("Bytt"), and a replacement takes over the waiting matches. Not offered in a Cup. Database: migration `20260920100000_withdrawal_decision.sql` (the teammate's own decision, with token check and rate limit).

## 0.7.0

Beta feature milestone, applied on the developer's instruction (2026-09-19). Everything below has automated tests (client, and the database logic run on an in-memory Postgres) and was checked in the browser; the items under "Verified live" were additionally run against the real Supabase database; the items under "Awaiting a live check" have only been tested against the in-memory copy.

### Added
- **Scorer roles (Phase 10)**: one active scorer per match (claim, request, transfer, admin override, takeover after 2 minutes offline), server-side undo/redo, a scorer panel on every match card.
- **Result approval (Phase 11)**: the winning point of a player-scored match goes up for approval (court freed at once); the scorer submits, one player per team approves, disputes with corrected proposals (max two, then the admin decides), 10-minute admin alert, 30-minute auto-approval, admin approve; auto-approved when nobody on the other side uses the app.
- **Result corrections (Phase 12)**: the admin can correct a finished result with a mandatory reason, after a consequence simulation (green/yellow/orange/red); the old result is kept in a history and can be restored; Cup results that later matches depend on are protected.
- **Player replacement (Phase 13)**: a replacement takes over the structural slot (unplayed matches follow it, finished matches keep the original), a running match restarts at 0–0 after a warning, a result awaiting approval blocks it, and the original can be put back.
- **Scoring rules (Phase 14)**: golden point, set tiebreak, timed matches with a countdown (a game won after time is up ends the match, a deciding golden-point game when level), a per-match rule snapshot, and a head-to-head standings tiebreak used by the app, the podium and TV Mode.
- **Guest retention (Phases 16/19)**: a finished guest tournament stays read-only for 24 hours (TV Mode and other devices can still show the result); abandoned guest tournaments expire after 30 idle days and are deleted after 7 more.
- **TV Mode (Phases 19/21)**: available in every supported language (Norwegian and English, guarded by a test), the app's gem avatars instead of generated faces (no third-party image service any more), matches awaiting approval and the match countdown.
- **Feedback button**: "Gi tilbakemelding" in the footer and the menu opens a form (type, message, optional email) that is emailed to the developer through a Vercel function and Resend; if that is not configured or reachable the user gets a ready-made email draft. The privacy page describes the data flow.
- Language: 96 missing English strings added, the footer, guide and privacy pages aligned with the product, mobile overflow fixes (walkover buttons, scoreboard names, create wizard), a plain 512px PWA icon.

### Changed
- Undo of a scored point for players now goes through the server (the scorer's undo), and a point the server rejects is dropped from the sync queue instead of blocking every later point.
- Security: leftover public execute grants revoked on two functions.

### Verified live (real Supabase database, 4 real players through the join RPC)
- Scorer claim, rejection of non-scorers, request/transfer, scoring for both teams.
- Approval: submit, teammate versus opponent approval, corrections and the two-correction limit, flagged results, admin approve, the real cron job escalating and auto-approving.
- Guest retention: a finished guest tournament stays readable (TV Mode shows it), and the cleanup deletes it after 24 hours while keeping the statistics receipt.
- A real 1-minute timed match in the browser, and the Phase 8 guest path (create, start, score, advance, finish).

### Verified live after the follow-up migrations were applied
- Undo and redo on a Round Robin with pre-generated rounds; live updates between devices (an open admin screen shows joins, every point, undo and a finished match without a reload); result corrections through the real dialog (a flipped winner, the history with reason/comment/level, and "Gjenopprett" restoring the original).

### Awaiting a live check
- The timed-match server path (a timed match scored by players), corrections of a Cup, push notifications after a correction, and the feedback email (needs the Vercel settings).

### Known gaps
- Withdrawal of a player without a replacement is not built; corrections are closed once a tournament is finished; personal-statistics recalculation (Phase 15), claiming and invitations (17), notification center (18), the system owner (23) and the resilience/responsive sweep (25) are not done. Leaked-password protection is unavailable on the free Supabase plan.

## 0.6.1

UI redesign imported from a Claude Design mockup, shipped across six reviewable commits (fonts/tokens → components → workspace content → nav shell → landing/login/join/create → lobby/podium/profil/install → cleanup), plus the TV Mode Cup bracket work and a database desync fix carried over from before the redesign started. No change to the Monday critical-path flow itself — same create/start/score/persist/finish behavior, restyled.

### Added
- Archivo (headings) + Instrument Sans (body) replacing Titillium Web + Inter, hosted locally as before (no Google Fonts CDN dependency).
- A reconciled design-token and component system (`styles/components-v2.css`): buttons, cards, status pills, a segmented control, and a two-layer clip-path "gem" avatar reusing the existing 16-color player-accent palette.
- Gem avatars replacing Dicebear-generated images everywhere across the main app (standings, match cards, player lists, the join-form preview) — TV Mode keeps its own independent avatar rendering by design, untouched.
- An owner-facing "Stilling" (standings) tab next to Styring/Kamper, wired into the existing dynamic subtab detection with no new routing code.
- A persistent workspace navigation shell: a sticky side rail on desktop (≥860px), a sticky bottom tab bar on mobile, replacing the old in-content subtab row. Implemented as a thin dispatcher onto the existing `showModule()`/`activateAdminPanel()` calls, re-deriving its active state from the DOM rather than tracking its own — it can't drift out of sync with real navigation.
- TV Mode (`tv.html`) now renders a real visual bracket-tree for Cup tournaments — rounds as columns connected by lines (measured from actual rendered positions via SVG, so it stays correct at any bracket size), winners highlighted, plus a "🏆 CUPMESTER" champion banner — instead of the generic points table.
- TV Mode is now adaptive: whenever there are no live or queued matches (between rounds, or the tournament finished), the empty LIVE/NEXT panels collapse and the bracket (Cup) or standings table (Round Robin) expands to use the full width and height instead of leaving most of the screen blank.
- `.claude/launch.json` for a local static-file preview server, so UI changes can be checked before they reach the live site.

### Fixed
- The install-instructions modal had no visible background at all: `background: var(--panel)` referenced a custom property that only exists inside TV Mode's own isolated token set, undefined everywhere else. Its heading also had no scoped font size and visually overlapped the close button.
- The Spillerprofil (career stats + tournament history) panel, reachable once signed in, had zero base layout CSS for its stat grid and history list — only color/border overrides for a grid that was never actually defined — so both rendered as unstyled stacked text instead of cards.
- `service-worker.js`'s offline precache list had drifted out of sync with the app's actual asset versions since before this redesign started, and was missing three files added during it entirely. Most notably, the 9 new Archivo/Instrument Sans font files were never precached — installed/offline PWA users would never get them, only the system fallback font.
- A Phase 2 redesign regression, caught during Phase 4: the general-purpose `.ghost` button class had been recolored to the new danger/error token, which made non-destructive buttons ("Opprett konto", "Lukk") read as error states. Reverted to a neutral color; genuinely destructive buttons keep their own separate styling.
- `admin_advance_round_impl` and `admin_advance_cup_impl` had the same `state`/`status` desync bug fixed in `admin_set_result_impl` for 0.6.0: newly-activated matches never got their `status` field updated (Cup's newly-built bracket matches didn't get a `status` key at all). Fixed; harmless today since nothing currently reads `status` for these matches, but closes the same class of bug for consistency.

### Verified
- Cup tournament format (docs/ROADMAP.md Phase 9) verified end-to-end as the authenticated account owner: bracket generation with auto team pairing, advancement from a finished round to the next (built from real winners/losers, not placeholders), the final and third-place match, automatic "Cup ferdig" completion with the correct winner recorded, and both the admin's and TV Mode's round-by-round bracket views.
- Monday critical path re-walked repeatedly across the redesign's six phases (create/join → start → register results → persist and sync to Supabase → refresh mid-tournament → finish → create another), guest and account-owned paths both, with no regression from any visual change.

## 0.6.0

Monday critical-path chain (create account → log in → create Round Robin → start → register results → persist to Supabase → complete → create new tournament) verified end-to-end this cycle, guest and account-owned paths both, including natural Round Robin completion (all rounds played to their own end, not force-finished) and full final standings. See `docs/BUGS.md` for full verification detail per critical-path step.

### Added
- Custom SMTP (Resend, domain `padelstar.app`) for Supabase Auth email delivery, replacing the unreliable shared built-in mailer.
- `?view=<module>` query param support in `app/initial-view.js` so external pages can deep-link into a specific app section (landing/setup-player/setup-admin/account).
- Single source of truth for the app version (`APP_VERSION` in `app/bootstrap/app-meta.js`), synced into the footer the same way the copyright year already was.
- Project hook (`.claude/settings.json`) warning when a `styles/*.css` or `app/**/*.js` file is edited without also bumping its `?v=` cache-bust reference in `index.html`/`guide.html`/`privacy.html`.

### Changed
- `guide.html` and `privacy.html` headers now match `index.html` exactly: same logo (icon+wordmark lockup), same hamburger menu component and pill-button styling, instead of a plain back-link.
- Tournament format picker now only offers Round Robin and Cup — Americano, Team-Americano, Mexicano, Team-Mexicano, King of the Court, and Groups+Playoffs were exposed with working client-side scheduling logic but no working server-side round-advancement RPC; hidden until each is wired and verified individually.

### Fixed
- Account confirmation emails were not arriving (Supabase's shared built-in mailer has poor deliverability) — fixed by configuring Resend SMTP.
- Confirmation-link redirects were broken for every real signup (Auth Site URL was still `http://localhost:3000`, a dev leftover) — corrected to `https://padelstar.app`.
- Tournament creation was broken (`create_tournament` RPC returning 400) after an out-of-order migration deploy left the database missing an expected column — fixed by applying the 3 missing chronological migrations.
- "Fullfør turnering" (finish tournament) crashed instead of showing its confirmation dialog — `app/bootstrap/dom-elements.js` never wired up the dialog's title element.
- The `finalize_tournament` database function the finish flow depends on did not exist on the live database at all — deployed.
- A pre-existing trigger was silently giving account-owned finished tournaments a 30-day expiry instead of the intended "kept indefinitely" — fixed by guarding it on `owner_user_id`; no data was actually lost, since the cleanup job separately already checked the same condition correctly.
- `app/guide-i18n.js` was destroying the logo image on `guide.html`'s back-link by overwriting it with translated text.
- Menu dropdown on `guide.html`/`privacy.html` rendered in the wrong place (missing a CSS positioning anchor) and was noticeably larger than on `index.html` (a `<button>`-only global line-height rule wasn't reaching the `<a>`-based menu links there).
- A logged-in account owner could not register results, advance rounds, perform match actions, undo a match, or delete a tournament — `admin_set_result`, `admin_advance_round`, `admin_advance_cup`, `admin_match_action`, `admin_undo_match`, and `delete_tournament` were granted to the `anon` Postgres role only, never `authenticated`. Fixed by granting all 6 to `authenticated`; verified end-to-end with a full authenticated-owner Round Robin playthrough.
- `admin_set_result_impl` updated a scored match's `state` field but never its separate `status` field, leaving a finished match's `status` stuck at `"active"`. Fixed by adding the matching `status` writes; verified directly against the database.

## Version rule

Do not change the application version merely to meet a date. A stable pre-1.0 build is preferable to an unverified `1.0.0`.
