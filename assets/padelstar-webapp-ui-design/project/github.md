repo: zigonia-it/Padel_manager_web
branch: main

## Last sync

date: 2026-09-15T21:02:00Z

### Updated in this project

- Rebuilt all 14 screens as one clickable Design Component, Norwegian copy lifted from `app/translations.js`.
- Replaced the floating-panel layout with a persistent workspace shell: side rail on desktop, bottom tabs on mobile.
- Kept the real blue token palette (`--gold: #4fa8ff` on `#070d17`), dropped the court photo background for flat navy.
- Swapped the retired gold app icon for a mark cropped from the current blue `main_logo.png`; downscaled the Games and Match win renders to 96px for the TV standings heading, match-card stat row and podium.

## Screen map

| Screen | Built from |
| --- | --- |
| Forside | `index.html`, `app/initial-view.js`, `app/translations.js` |
| Logg inn | `app/account-auth.js` |
| Opprett (wizard) | `app/admin-form-events.js`, `app/court-settings.js` |
| Bli med med kode | `app/link-utils.js`, `app/player-state.js` |
| Lobby | `app/player-list.js` |
| Kamper (live) | `app/match-card.js`, `app/match-list.js`, `app/court-queue.js`, `app/match-actions.js` |
| Stilling | `app/player-statistics.js` |
| Min kamp | `app/player-next-match.js` |
| Innstillinger | `app/court-settings.js`, `app/admin-status.js` |
| Podium | `app/historical-records.js` |
| Profil | `app/profile-manager.js`, `app/profile-history.js` |
| Installer / offline | `service-worker.js`, `app/offline-storage.js` |
| TV Mode | `tv.html`, `styles/tv.css`, `app/tv-mode.js` — three-panel spectator layout (LIVE / NESTE KAMP / STILLING), centered round + title header, status footer; cup swaps the third panel for the bracket tree |
| Administrasjon | `app/admin-actions.js`, `app/admin-identity.js`, `supabase/migrations/*retention*` |

## Design tokens taken from the repo

- Page `#070d17`, surfaces `#0e1a2c` / `#16273f`, border `rgba(159,207,255,.13)`
- Accent blue `#4fa8ff`, bright `#62b6ff`, dark `#236ca8`; finished `#8ee0ad`
- Player gem palette from `app/accent-system.js`
- Radii 6–16px, 44px minimum tap target (per `styles/base.css`)
