# "I'm not a robot" check (Cloudflare Turnstile)

Why: the sign-up form could be used to send "Confirm your email address" mails to strangers (the Resend log showed this). The check
stops automated sign-ups. It covers sign-up, sign-in with password and the admin sign-in link, because Supabase applies its CAPTCHA
protection to all of them.

How it works in the app: `app/captcha.js` opens a small dialog with the Turnstile checkbox before each protected action and passes
the token to Supabase Auth (`options.captchaToken`). Turnstile tokens work once, so every action gets a fresh check. Without a site key
the app behaves as before.

## Setup (in this order, so nobody is locked out)

1. **Cloudflare** (free, a Cloudflare account is needed): Turnstile -> Add widget. Name `Padelstar`, hostnames `padelstar.app` (add `localhost` if you want to test locally),
   widget mode **Managed**. Copy the **site key** (public) and keep the **secret key** private.
2. **Site key into the app** (done 2026-09-20: the widget `Padelstar` exists in Cloudflare and its public site key is in `supabase-config.js`): put the site key in `supabase-config.js` (`captchaSiteKey`), commit and deploy (or send it to Claude). It is public by design.
   With the site key set but Supabase not yet checking, sign-up still works (the token is simply ignored).
3. **Supabase** -> Authentication -> Attack Protection (or Settings -> Bot and Abuse Protection): enable CAPTCHA, provider **Cloudflare Turnstile**, paste the **secret key**. Save.
   From this moment Supabase refuses sign-ups and sign-ins without a valid token.
4. Test: open padelstar.app in a private window, "Opprett konto": the dialog with the checkbox must appear, and the confirmation mail must arrive.

If something goes wrong: switch CAPTCHA off in Supabase (step 3) and sign-in works again immediately; the app needs no change.

Privacy: Turnstile sees the visitor's IP address and browser; it is listed in the privacy text (services section) and allowed in the
Content-Security-Policy (`vercel.json`: `challenges.cloudflare.com` for scripts and frames).
