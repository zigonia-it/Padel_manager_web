# BUGS.md

# Padelstar – Active Bugs

Only **active** defects and known limitations are listed here. Everything found and fixed up to 2026-09-19 (account creation, tournament start, results, persistence, completion, Cup, guest claiming, realtime, undo, PWA icons, ...) is in `docs/archive/bugs-resolved-2026-09.md` (not authoritative).

## Bug completion rule

A bug is complete only when it was reproduced or clearly verified, the smallest safe fix is in, the relevant behaviour was tested, the critical path (create account → log in → create Round Robin → start → register results → persist to Supabase → complete → create a new tournament) was re-checked, and the status was updated. Do not spend time on long bug analysis documents.

## Active defects

- [x] ~~Beta feedback form cannot send from the live site.~~ Fixed 2026-09-20: `FEEDBACK_TO_EMAIL` held an API key instead of an address (Resend answered 422 on `to`); corrected in Vercel, redeployed, and the test message arrived. Open follow-up (developer): a stray Vercel variable whose *name* is a Resend API key, and that key should be revoked (see USER_ACTIONS).

- [x] **Sign-ups are being abused** (2026-09-20; the developer has saved the Turnstile secret, so sign-ups without the check are refused; unverified accounts are deleted after 7 days from 0.13.1): the Resend log shows "Confirm your email address" mails to strangers, some bounced. The "I'm not a robot" check is built and live on the forms (Cloudflare Turnstile widget `Padelstar`, site key in `supabase-config.js`), but Supabase does not enforce it until the developer pastes the Turnstile secret under Authentication -> Attack Protection and saves (`docs/technical/captcha-setup.md`). *Blocked on the developer.* Until then the Brukere and Logg tabs of the system page show the accounts and sign-ups, and accounts can be blocked or deleted there.
- [ ] **Editor formatting breaks tests**: a code formatter that reformats `index.html` on save changes the exact markup that some tests check (found 2026-09-20). Turn format-on-save off for that file; if `git diff index.html` is huge, restore the file and re-apply only the intended change.

## Known limitations (decided or accepted, not bugs to fix now)

- Two players with exactly the same name cannot be told apart by the claim flow; only the first match in the roster is reachable. Names are the only key the claim flow has.
- When players on **both** teams of one Round Robin match have withdrawn, the match is cancelled (no rule was given for it). In a Cup a cancelled match makes the best-placed losing team take the place (0.13.0).
- Corrections after the tournament is finished (built 0.10.0): only for finished, not cancelled tournaments, only by the admin, and a Cup result that later matches depend on stays blocked. Guests: the correction window ends when the 24-hour retention deletes the tournament.
- Invitation emails (built 0.10.0) are limited to 3 per address and tournament per hour and 40 per tournament; if the email fails the invitation is still saved and the admin gives the person the code.
- The hidden languages (nn, es, de, fr, sv, da) still have old privacy/guide text; they are not offered until Phase 21 completes them.
- Colour contrast (0.11.0): every text token is at least 4.5:1 on every surface in both themes, with two exceptions of the specified values: white on the lighter end of the light primary gradient is 4.1:1 (bold button text), and dark-theme gem initials for the darkest hues are 3.6 (onyx), 4.0 (sapphire) and 4.2 (garnet).
- The colour system uses `color-mix()` and `light-dark()`; browsers older than iOS 17.5 / Chrome 123 / Firefox 120 fall back to the dark ink for player initials, and older than iOS 16.2 / Chrome 111 lose the tinted washes.
- Sound and vibration depend on the browser: a browser may block sound until the page has been tapped once, and vibration does not exist on iPhone.
- The 8 invite-code cells are 31px wide on a 375px phone (eight must fit across).
- Not yet verified by a person on real devices: push notifications on a phone, sound levels, network loss during a running match (see `docs/USER_ACTIONS.md`).

## Other v1 feature bugs

- [ ] Add reproducible bugs here as they are found.
