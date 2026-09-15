# CHANGELOG.md

# Padelstar Changelog

Only verified completed changes belong here.

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

## Version rule

Do not change the application version merely to meet a date. A stable pre-1.0 build is preferable to an unverified `1.0.0`.
