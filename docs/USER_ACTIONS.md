# USER ACTIONS / CONFIRMATIONS REQUIRED

Things only the developer can do or decide. Kept up to date while working. Order = recommended order.
Status: `[ ]` open, `[x]` done.

## 1. Fix first (something does not work for users today)

- [x] **Feedback form** works (2026-09-20): `FEEDBACK_TO_EMAIL` contained an API key, not an address; corrected, redeployed, test message received.
- [ ] **Clean up in Vercel and Resend.** (a) Vercel → padel-manager-web → Settings → Environment Variables: delete the third variable, whose *name* is a Resend API key (`re_Hvi…`). A key in a variable name is visible in plain text. (b) Resend → API Keys: revoke the key named "Feedback" (`re_Hvi…`) and the one named "FEEDBACK_TO_EMAIL" (`re_FQd…`), which is not used. Keep "RESEND_API_KEY" (the one the site uses). (c) Vercel shows "Deployment Storage 37.92 GB / 10 GB, exceeded free resources": old deployments count against it; delete old deployments (Deployments → ⋯ → Delete) or accept that Vercel may pause new deployments until it is under 10 GB.

- [ ] **Turn on the "I'm not a robot" check** (sign-ups are being abused: the Resend log shows confirmation mails to strangers). Claude cannot create the Cloudflare widget or enter the secret. Steps in `docs/technical/captcha-setup.md`: (1) Cloudflare -> Turnstile -> Add widget for `padelstar.app`, Managed; (2) send Claude the **site key** (public), it goes into `supabase-config.js`; (3) Supabase -> Authentication -> Attack Protection -> enable CAPTCHA, Cloudflare Turnstile, paste the **secret key**. Do (3) only after (2) is deployed, or sign-in breaks until it is.

## 2. Verify as a person (I cannot sign in or use real devices)

- [ ] **System owner page.** Sign in on padelstar.app (or the preview) as `sigurd.grodem@live.no`. Expect a **"System"** link in the top menu and `admin.html` showing counts and the latest tournaments. Then sign in as any other account (or signed out): no "System" link, and opening `admin.html` sends you away with a message.
- [ ] **Invitations with two real accounts.** Account A creates a tournament (not a guest one), lobby → "Inviter med e-post" → the email of account B. Account B (verified email) signs in → profile page → "Invitasjoner" → "Bli med" → join → A's list shows "Har blitt med". Also try "Avslå".
- [ ] **Claim a pre-added slot with an account.** Admin adds a player name in the lobby; a signed-in account joins with that exact name → it is linked (their statistics follow the account). A second account or a guest using the same name must be refused.
- [ ] **Withdrawal through the real database with two devices.** Start a Round Robin with several players, withdraw one on the admin device, then on the teammate's phone choose "Spill alene" / "Gi walkover" (the admin path was tested; the teammate's own RPC was tested against the real schema but not from a second device).
- [ ] **Notifications on a phone.** In a running tournament: does your own match trigger the bell, the sound (notification1 = match ready, notification2 = other updates) and vibration? Try the switches on the profile page ("Varsler og lyd") and the test button. Note that browsers may block sound until the page was tapped once, and iPhone has no vibration.
- [ ] **Network loss during a running match.** On a phone, airplane mode for ~30 s while scoring, then back online: the queued points must arrive, nothing lost or doubled.
- [ ] **Install on Windows/Linux** was accepted as confirmed (you cannot test it).

- [ ] **The new colours (0.11) on your own devices**, dark and light: the lifted slate dark theme, the soft blue-white light theme with white cards, the deep-blue primary button in light mode, player initials in the gems, TV Mode. Tell Claude any screen where something looks off. (Older text follows.) **Light mode on your own devices (0.9).** Switch Lys/Mørk (header on desktop, menu on phone, or Profil → Utseende) and click through: landing, create, lobby, matches, scoring, standings, podium, guide/privacy, feedback, notifications. Tell me any screen where something is hard to read, too pale or looks wrong; I fix those in `styles/theme-light-manual.css`. Also check that a phone set to light/dark switches Padelstar when "Følg enheten" is chosen.

- [ ] **0.9.1 fixes on real devices.** (a) iPhone: tap the flag in the menu, pick a language: only the custom list may open, never iOS's own list afterwards. (b) Phone menu: open it in dark and light, on a small phone too. (c) Create a tournament while signed in on the phone, sign in on the Mac, Profil → "Mine aktive turneringer" → "Fortsett som admin": it should open as admin (the lobby if not started). (d) Signed in as `sigurd.grodem@live.no`: `admin.html` → click through Oversikt, Turneringer, Brukere, Vedlikehold; look for text running outside the page. (e) Light mode: any screen where a panel still has a square background, a wrong color or a padding that looks off: tell me which screen, with a screenshot if you can.

- [ ] **0.9.2 fixes.** (a) TV Mode from the rail/menu opens exactly one new tab and the app stays where it is; with pop-ups blocked in the browser it falls back to the same tab. (b) On the TV page the Lys/Mørk switch works and stays chosen after a reload; try it on the real TV. (c) In the lobby remove a player; in Styring (before starting) click "Lobby" in the rail/bottom tabs.

## 3. Decisions I need (I made a safe default; tell me if you want it different)

- [ ] **Withdrawal in a Cup** (decided 2026-09-20: same conditions as Round Robin; all players of a team withdrawn = walkover; both sides withdrawn = the best-placed losing team takes the place, admin confirms): planned for 0.11, not built yet.
- [ ] **Players on both teams withdrawn** (in a Cup: see above; in Round Robin the match is cancelled): planned.
- [x] **Corrections after the tournament is finished**: decided 2026-09-20 (added to the statistics); built in 0.10.0.
- [x] **Invitations by email**: decided 2026-09-20; built in 0.10.0 (sender `invitations@padelstar.app`, verified domain). Needs a real check: invite an address in the lobby and look for the email.
- [x] **Privacy text**: decided 2026-09-20 (a bottom section naming the services); built in 0.10.0.
- [x] **TV Mode button** on the phone tab bar and TV on phones: decided 2026-09-20; built in 0.10.0.
- [ ] **Lobby vs. workspace** (decided 2026-09-20: merge into one screen): planned for 0.11, not built yet.
- [x] **System administration**: decided 2026-09-20: a log view and block/delete users (built, see CHANGELOG); everything else (force-finish, opening other people's tournaments, ...) is treated as privacy and is not built.
- [ ] **Push categories** (Phase 18: invites, results, "only my own matches") need a server-side change to the push function and real-device testing; not built. Confirm you want it in 0.8 or later.

## 4. Later, when the time comes

- [x] Light mode (Phase 27) was built from the local copy of the design files in `assets/padelstar-webapp-ui-design/` (colors only, as the roadmap says); the Claude Design connector was not needed. The real-device check is in section 2.
- [ ] Supabase leaked-password protection needs the Pro plan (accepted for now).
