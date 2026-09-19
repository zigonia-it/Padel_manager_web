# Architecture

## What it is

A static web app / PWA (no build step) served by Vercel, talking to Supabase for shared state, plus two small Vercel functions. Everything is vanilla JavaScript.

## Front end

- **Pages**: `index.html` (the app), `guide.html`, `privacy.html`, `tv.html` (TV Mode), `admin.html` (system owner only, Phase 23).
- **Modules**: `app/*.js`, each `window.PadelstarXxx = (() => { function create({ ...deps }) { ... } })()` with dependencies injected, so most logic runs in Node tests without the browser. `app/app.js` wires everything (state, persistence, sync, rendering). Pure logic lives in `tournament-engine.js`, `scoring-engine.js`, `player-replacement.js`, `player-withdrawal.js`, `notification-center.js`, `result-correction.js`.
- **State**: one tournament object (`state`), saved locally (localStorage + IndexedDB mirror + last-known-good copy) and, for a shared tournament, written to Supabase with an expected revision. Remote states are applied by `app/core/remote-state-controller.js`, which rejects older revisions.
- **Live updates**: Supabase Realtime broadcast on `tournament:<id>` carries only the new revision; the client then fetches the state through `get_tournament_by_code` (`app/realtime-connection.js`).
- **Rendering**: `app/ui/app-renderer.js` calls the small render modules (match list, standings, player list, lobby, ...).
- **Styles**: `styles/*.css`; the classic theme rules in `ui-consistency.css` load last and win. New rules go in the topic file and use `body[data-theme="classic"]` when they must beat it.
- **Color modes** (Phase 27): `<html data-theme-mode="light|dark">`, set before first paint by an inline script on every page and afterwards by `app/color-mode.js` (priority: saved manual choice, then `prefers-color-scheme`, then dark). The dark theme is the source; `styles/theme-light.css` is **generated** from it by `node scripts/build-light-theme.js` using `scripts/light-theme-palette.json` (pairs from the Claude Design Light mockup) plus rules, and only contains colors. Do not edit it by hand: change the palette or the generator, or put corrections in `styles/theme-light-manual.css`. After changing any stylesheet run the generator (`test/light-theme.test.js` fails if the file is stale). TV Mode is always dark.
- **i18n**: `app/translations.js` (Norwegian Bokmål and English are the shipped languages; the others are hidden until complete). Every new text needs both. `guide.html`, `privacy.html`, `tv.html` and `admin.html` follow the saved language through `app/page-language.js` (including "device language").
- **Notifications**: `notification-system.js` (OS/push), `notification-center.js` + `-ui.js` (in-app center, sounds in `assets/sounds/`, vibration, settings on the profile page).

## PWA and cache-busting (important)

- `service-worker.js` precaches the app shell and serves network-first with a cache fallback; bump `cacheName` in every release.
- Every asset is loaded with `?v=padelstar-<name>-<n>`. **When a file changes, bump its number everywhere it appears** (`index.html`, `service-worker.js`, `guide.html`, `privacy.html`, `tv.html`, and the tests that pin it). `test/asset-versions.test.js` fails if a file has different versions on different pages, but it cannot know that a file changed; compare against `main` after edits.
- New modules must also be loaded in the VM harness in `test/padelstar.test.js`.

## Server side

- **Supabase**: see `database.md`.
- **Vercel functions** (`api/`): `health.js` (`/api/health`, reports the version) and `feedback.js` (emails the beta feedback through Resend; needs `RESEND_API_KEY` and `FEEDBACK_TO_EMAIL`, see `feedback-setup.md`).
- **Edge Function**: `supabase/functions/push-send` sends Web Push notifications.
- **Headers/CSP**: `vercel.json` (same-origin framing only, needed for the guide/privacy popup).

## Tests

`node --test` (unit and page-structure tests) and the database tests in `supabase/tests/*.pglite.mjs`. `scripts/ui-audit.js` (layout, tap targets, overlaps) and `scripts/contrast-audit.js` (WCAG text contrast in the current theme) are audits to run in the browser console against the local preview.
