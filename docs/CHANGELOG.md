# CHANGELOG.md

# Padelstar Changelog

Only verified completed changes belong here.

## Unreleased

## 0.7.0

Beta feature milestone, applied on the developer's instruction (2026-09-19). Everything below has automated tests (client, and the database logic run on an in-memory Postgres) and was checked in the browser; the items under "Verified live" were additionally run against the real Supabase database, the items under "Awaiting a live check" need their migrations applied first (see the pull request for the list) and have only been tested against the in-memory copy.

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

### Awaiting a live check (migrations must be applied first)
- Undo/redo (`20260919190000`), live updates between devices (`20260919200000`), result corrections (`20260919210000`), the timed-match server path, and the feedback email (needs the Vercel settings).

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
