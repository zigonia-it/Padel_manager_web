# Beta feedback: setup

The "Gi tilbakemelding / Give feedback" button posts to `/api/feedback` (`api/feedback.js`, a Vercel serverless function),
which emails the message to you through [Resend](https://resend.com). Nothing is stored; if the function is not
configured or reachable the user gets a ready-made email draft instead.

## One-time setup

1. Create a free Resend account (100 emails/day) with the email address where you want to receive feedback.
2. In Resend: **API Keys -> Create API Key** (sending access). Copy the key (`re_...`).
3. In Vercel: **Project -> Settings -> Environment Variables**, add for *Production* (and Preview if you want to test there):
   - `RESEND_API_KEY` = the key from step 2
   - `FEEDBACK_TO_EMAIL` = your email address (the one you signed up to Resend with)
   - `FEEDBACK_FROM` (optional) = e.g. `Padelstar <feedback@yourdomain.com>` once you have verified a domain in Resend.
     Without it the free `onboarding@resend.dev` sender is used, which Resend only delivers to the address you signed up with.
4. Redeploy (Vercel only reads new variables on a new deployment).
5. Test: open the deployed site, "Gi tilbakemelding", send a message, and check your inbox (and spam).

## Behaviour and limits

- Types: bug, suggestion, question, other. Message 5-2000 characters, optional reply email.
- Sent with the email: app version, language, current view, role, screen size and browser type. Never tournament codes or tokens.
- Protection: hidden honeypot field, 5 messages per 10 minutes per client address (best effort per server instance),
  plain-text email only, line breaks stripped from single-line fields.
- Privacy: described on `privacy.html` (Vercel and Resend process the message).
- Errors seen by the user: offline, not configured (503/404), too many messages (429), or a provider failure (502).
