# USER ACTIONS / CONFIRMATIONS REQUIRED

Things only the developer can do or decide. Kept up to date while working. Order = recommended order.
Status: `[ ]` open, `[x]` done.

## 1. Fix first (something does not work for users today)

- [ ] **Feedback form cannot send from padelstar.app.**
  Production answers `503 {"missing":["RESEND_API_KEY","FEEDBACK_TO_EMAIL"]}`: the running deployment sees neither variable (I have no access to the Vercel team `zigonia-it`).
  1. Vercel → project `padel-manager-web` → Settings → Environment Variables. Add **`RESEND_API_KEY`** (key from resend.com → API Keys) and **`FEEDBACK_TO_EMAIL`** (the address you signed up to Resend with). Tick **Production**. Optional: `FEEDBACK_FROM`.
  2. **Redeploy** (Deployments → the latest → ⋯ → Redeploy). Variables are not applied to existing deployments.
  3. Check: `curl -s -X POST https://padelstar.app/api/feedback -H "Content-Type: application/json" -d '{"category":"bug","message":"config check"}' -w "\n%{http_code}\n"` → expect `200`, and the email arrives (this sends a real email to you). Details: `docs/technical/feedback-setup.md`.

## 2. Verify as a person (I cannot sign in or use real devices)

- [ ] **System owner page.** Sign in on padelstar.app (or the preview) as `sigurd.grodem@live.no`. Expect a **"System"** link in the top menu and `admin.html` showing counts and the latest tournaments. Then sign in as any other account (or signed out): no "System" link, and opening `admin.html` sends you away with a message.
- [ ] **Invitations with two real accounts.** Account A creates a tournament (not a guest one), lobby → "Inviter med e-post" → the email of account B. Account B (verified email) signs in → profile page → "Invitasjoner" → "Bli med" → join → A's list shows "Har blitt med". Also try "Avslå".
- [ ] **Claim a pre-added slot with an account.** Admin adds a player name in the lobby; a signed-in account joins with that exact name → it is linked (their statistics follow the account). A second account or a guest using the same name must be refused.
- [ ] **Withdrawal through the real database with two devices.** Start a Round Robin with several players, withdraw one on the admin device, then on the teammate's phone choose "Spill alene" / "Gi walkover" (the admin path was tested; the teammate's own RPC was tested against the real schema but not from a second device).
- [ ] **Notifications on a phone.** In a running tournament: does your own match trigger the bell, the sound (notification1 = match ready, notification2 = other updates) and vibration? Try the switches on the profile page ("Varsler og lyd") and the test button. Note that browsers may block sound until the page was tapped once, and iPhone has no vibration.
- [ ] **Network loss during a running match.** On a phone, airplane mode for ~30 s while scoring, then back online: the queued points must arrive, nothing lost or doubled.
- [ ] **Install on Windows/Linux** was accepted as confirmed (you cannot test it).

- [ ] **Light mode on your own devices (0.9).** Switch Lys/Mørk (header on desktop, menu on phone, or Profil → Utseende) and click through: landing, create, lobby, matches, scoring, standings, podium, guide/privacy, feedback, notifications. Tell me any screen where something is hard to read, too pale or looks wrong; I fix those in `styles/theme-light-manual.css`. Also check that a phone set to light/dark switches Padelstar when "Følg enheten" is chosen.

- [ ] **0.9.1 fixes on real devices.** (a) iPhone: tap the flag in the menu, pick a language: only the custom list may open, never iOS's own list afterwards. (b) Phone menu: open it in dark and light, on a small phone too. (c) Create a tournament while signed in on the phone, sign in on the Mac, Profil → "Mine aktive turneringer" → "Fortsett som admin": it should open as admin (the lobby if not started). (d) Signed in as `sigurd.grodem@live.no`: `admin.html` → click through Oversikt, Turneringer, Brukere, Vedlikehold; look for text running outside the page. (e) Light mode: any screen where a panel still has a square background, a wrong color or a padding that looks off: tell me which screen, with a screenshot if you can.

- [ ] **0.9.2 fixes.** (a) TV Mode from the rail/menu opens exactly one new tab and the app stays where it is; with pop-ups blocked in the browser it falls back to the same tab. (b) On the TV page the Lys/Mørk switch works and stays chosen after a reload; try it on the real TV. (c) In the lobby remove a player; in Styring (before starting) click "Lobby" in the rail/bottom tabs.

## 3. Decisions I need (I made a safe default; tell me if you want it different)

- [ ] **Withdrawal in a Cup** is blocked (a Cup bracket refers to team ids). Use "Bytt" instead. Do you want withdrawal in Cups too? (needs a design for the bracket)
- [ ] **Players on both teams withdrawn from the same match** → the match is **cancelled**. Alternative: the two teammates each decide (walkover / play 1 against 1).
- [ ] **Corrections after the tournament is finished** are closed. Do you want them (needs statistics to be recalculated)?
- [ ] **Invitations by email**: shown in the app only, no email is sent. Do you want an email through Resend as well (needs the feedback setup above and a sender domain)?
- [ ] **Privacy text** names Supabase, Vercel, Vercel Analytics and Resend once in parentheses (a privacy notice normally has to name who handles the data). Remove them anyway?
- [ ] **TV Mode button** is at the bottom of the desktop side rail and in the phone menu. Also add it to the phone bottom tab bar?
- [ ] **Lobby vs. workspace**: I added "add players" and "name courts" to the lobby and kept Styring/Kamper/Tabell as they are. Do you want the workspace merged into one lobby screen (bigger redesign)?
- [ ] **System administration, what next?** 0.9.1 gave `admin.html` read-only tabs (tournaments, users, maintenance). Not built until you decide: blocking/deleting users, force-finishing or deleting a tournament, opening any tournament as admin (support), a log view (there is no server-side log table today), and the global theme switch. Each of these is a new power over user data: tell me which you want and how they must be protected (confirmation, audit trail).
- [ ] **Push categories** (Phase 18: invites, results, "only my own matches") need a server-side change to the push function and real-device testing; not built. Confirm you want it in 0.8 or later.

## 4. Later, when the time comes

- [x] Light mode (Phase 27) was built from the local copy of the design files in `assets/padelstar-webapp-ui-design/` (colors only, as the roadmap says); the Claude Design connector was not needed. The real-device check is in section 2.
- [ ] Supabase leaked-password protection needs the Pro plan (accepted for now).
