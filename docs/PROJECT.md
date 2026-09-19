# PROJECT.md

# Padelstar – Product Source of Truth

Padelstar is a multi-device padel tournament application/PWA for creating, running, scoring and displaying tournaments.

## Immediate delivery objective

The shortest critical product path is:

1. Owner can create an account.
2. Owner can log in.
3. Owner can create a tournament.
4. Owner can select/create Round Robin.
5. Tournament can start.
6. Results can be registered.
7. Tournament state/results persist to the server/Supabase.
8. Tournament can be completed cleanly.
9. Owner can create/start a new tournament afterwards.

This flow must be reliable before lower-priority features consume development time.

## Core principles

- Accounts are optional for ordinary tournament participation, but account ownership/history is supported.
- Shared active tournament state uses backend/database state when multiple devices participate.
- Current implemented UI is the design authority.
- Product rules must not be silently changed to match old documentation.
- Round Robin and Cup are the v1.0 tournament modes. Liga is pushed out to a later release (see `ROADMAP.md` Priority 2) per explicit developer decision.
- For the Monday usable-build milestone, Round Robin is mandatory; Cup may follow if time remains.

## Ownership/account

- Owner/account user can create and log in.
- Guest use remains possible where designed.
- Account-owned tournaments may persist in history.
- Security-sensitive owner/admin access is enforced backend/database-side.

## Round Robin

- Tournament setup can create a valid Round Robin.
- Tournament starts into a valid playable state.
- Matches/results update the tournament correctly.
- Standings/ranking update correctly.
- Tournament can reach a completed final state.
- A completed tournament must not prevent creating a new one.

## Server persistence

The backend/Supabase is authoritative for shared tournament data.

Critical tournament state must survive:

- refresh;
- reopening the app;
- ordinary device/network reconnection scenarios.

Do not treat browser local storage as the only backup/source for active shared tournament state.

## Result entry

Players/admin flows may evolve, but the immediate milestone requires that the owner/admin can reliably register match results and advance the Round Robin tournament.

Approved richer player-scoring/result-confirmation behavior remains part of the broader v1 roadmap.

## v1.0 direction

Beyond the Monday critical path, v1.0 includes the approved core functionality for:

- Round Robin;
- Cup;
- scoring/rules;
- shared live state;
- player scoring;
- result approval/correction;
- replacements;
- timed matches;
- auth/account;
- history/statistics;
- retention;
- claiming/invitations;
- notifications;
- TV Mode;
- PWA;
- i18n;
- help/privacy;
- initial system-owner foundation.

Detailed sequencing is in `ROADMAP.md`.

## Later versions

1.x may add templates, additional tournament modes and expanded system administration.

2.0.0 is the social expansion, including friend-list/social functionality.

Permanent tamper-protected security audit logging is post-1.0.

## Version baseline

The actual current development baseline is `0.7.0`.

`0.7.0` was applied on the developer's explicit instruction (2026-09-19) for the beta feature milestone (scorer roles, result approval and correction, timed matches and scoring rules, player replacement, TV Mode in every supported language, feedback button); `docs/CHANGELOG.md` lists which parts have been verified live and which still await it. `0.6.0` was set once the Monday critical path was verified end-to-end; `0.6.1` is a verified UI-redesign/polish batch on top of it (fonts, design tokens, gem avatars, workspace nav shell, a handful of real bug fixes) that changed no critical-path behavior.

Version changes are milestone-based:

- patch (`0.5.x`) for verified bug-fix batches;
- minor (`0.x.0`) for coherent verified feature milestones;
- `1.0.0` only after the complete v1.0 Definition of Done.

Codex may recommend a version after a completed verified milestone, but only the developer decides whether to apply the version change.
