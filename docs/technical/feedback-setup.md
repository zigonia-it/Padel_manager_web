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
- A 502 also carries `providerStatus` and, when Resend names it, `providerError`: `401`/`invalid_api_key` = wrong or revoked key; `403`/`validation_error` = the sender is not allowed to send to that address (the free `onboarding@resend.dev` sender only delivers to the address you signed up to Resend with, so `FEEDBACK_TO_EMAIL` must be exactly that address, or you verify a domain and set `FEEDBACK_FROM`); `422` = a malformed address (`providerField` names which one: `to` = `FEEDBACK_TO_EMAIL`, `from` = `FEEDBACK_FROM`): check `FEEDBACK_TO_EMAIL` (one plain address) and, if you set it, `FEEDBACK_FROM` (`Name <address@your-verified-domain>`; delete the variable to use the free sender). Surrounding quotes and spaces in the values are ignored.

## Troubleshooting: "Feedback can't be sent from the app right now"

That message means the endpoint answered `503 notConfigured` (or `404` on a local preview, where `/api` does not exist).
On the deployed site check what it says (this sends nothing):

```bash
curl -s -X POST https://padelstar.app/api/feedback -H "Content-Type: application/json" \
  -d '{"category":"bug","message":"config check","website":"","email":""}' -w "\nHTTP %{http_code}\n"
```

- `503` with `"missing": ["RESEND_API_KEY"]` (or `FEEDBACK_TO_EMAIL`, or both): the *running* deployment cannot see that variable.
  Check the exact name (no spaces), that **Production** is ticked for it, and then **redeploy** (Deployments -> ... -> Redeploy).
  Adding a variable does not change a deployment that already exists.
- `502`: the variables are read, but Resend refused the send. Check the API key and that `FEEDBACK_TO_EMAIL` is the address you
  registered with Resend (required while using the free `onboarding@resend.dev` sender); Resend's dashboard shows the exact error.
- `200 {"ok":true}`: it works; check inbox and spam.

(Note: that command carries a valid payload, so once configured it *does* send a real email to you.)

## Invitation emails (`api/invitation-email.js`)

When an admin invites someone by email in the lobby, the app first saves the invitation in the database, then asks `/api/invitation-email` to send the email through Resend. The function re-checks everything with the database (the admin token via `admin_list_invitations`, a *pending* invitation for exactly that address, and that the invite code belongs to that tournament), so it cannot be used to send arbitrary mail. Limits per hour: 3 mails per address and tournament, 40 per tournament, 30 per client.

- Uses `RESEND_API_KEY` (already set for the feedback form). The default sender is `Padelstar <invitations@padelstar.app>`; `padelstar.app` is a verified domain in Resend, so mail can go to any address. Override with `INVITE_FROM` if needed.
- If the email fails, the invitation is still saved and listed; the admin is told to give the person the code instead.
- The person also sees the invitation under Profil after signing in with that (verified) address.
