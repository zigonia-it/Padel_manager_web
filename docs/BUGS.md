# BUGS.md

# Padelstar – Active Bugs

Only **active** defects and known limitations are listed here. Everything found and fixed up to 2026-09-19 (account creation, tournament start, results, persistence, completion, Cup, guest claiming, realtime, undo, PWA icons, ...) is in `docs/archive/bugs-resolved-2026-09.md` (not authoritative).

## Bug completion rule

A bug is complete only when it was reproduced or clearly verified, the smallest safe fix is in, the relevant behaviour was tested, the critical path (create account → log in → create Round Robin → start → register results → persist to Supabase → complete → create a new tournament) was re-checked, and the status was updated. Do not spend time on long bug analysis documents.

## Active defects

- [x] ~~Beta feedback form cannot send from the live site.~~ Fixed 2026-09-20: `FEEDBACK_TO_EMAIL` held an API key instead of an address (Resend answered 422 on `to`); corrected in Vercel, redeployed, and the test message arrived. Open follow-up (developer): a stray Vercel variable whose *name* is a Resend API key, and that key should be revoked (see USER_ACTIONS).

## Known limitations (decided or accepted, not bugs to fix now)

- Two players with exactly the same name cannot be told apart by the claim flow; only the first match in the roster is reachable. Names are the only key the claim flow has.
- Withdrawing a player is not offered in a **Cup** (the bracket refers to team ids); use "Bytt". Decision pending.
- When players on **both** teams of one match have withdrawn, the match is cancelled (no rule was given for it). Decision pending.
- Corrections of a result are closed once the tournament is finished, so statistics cannot change afterwards. Decision pending if post-finish corrections are wanted.
- Invitations are shown in the app only; no email is sent to the invited person. Decision pending.
- The hidden languages (nn, es, de, fr, sv, da) still have old privacy/guide text; they are not offered until Phase 21 completes them.
- Dark mode: white text on the mid-blue primary buttons is 3.8:1 (below 4.5:1); existing design, not changed by the light theme.
- Light mode uses `color-mix()` for players' own colors; browsers older than iOS 16.2 / Chrome 111 fall back to the dark-theme color there.
- Sound and vibration depend on the browser: a browser may block sound until the page has been tapped once, and vibration does not exist on iPhone.
- The 8 invite-code cells are 31px wide on a 375px phone (eight must fit across).
- Not yet verified by a person on real devices: push notifications on a phone, sound levels, network loss during a running match (see `docs/USER_ACTIONS.md`).

## Other v1 feature bugs

- [ ] Add reproducible bugs here as they are found.
