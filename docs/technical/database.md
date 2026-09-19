# Database (Supabase / Postgres)

Verified against the live project on 2026-09-19 (all migrations through `20260920130000_tournament_invitations.sql`).

## Security model

- The browser only ever uses the public (anon) key. Every table has row-level security **enabled**; almost all have **no policy**, so the API roles cannot read or write them directly.
- All access goes through `SECURITY DEFINER` functions that check a secret themselves:
  - **admin token** (stored on the tournament, sent by the admin's device) for admin actions;
  - **player token** (stored only as a SHA-256 hash in `player_sessions`) for player actions;
  - `auth.uid()` for signed-in actions (profile, statistics, invitations, system owner).
- Functions ending in `_impl` do the work and are **not executable** by `anon`/`authenticated`; the public wrapper checks the token format, applies `consume_api_rate_limit` and calls the `_impl`.
- Write functions lock the tournament row (`FOR UPDATE`) and compare `expected_revision`: a stale write is refused, a successful one bumps `revision` and broadcasts it (`notify_tournament_revision`, channel `tournament:<id>`).
- Errors are plain exceptions with stable texts that the client maps to messages.

## Tables

| Table | Purpose | Access |
|---|---|---|
| `tournaments` | one row per tournament: `state` (jsonb), `revision`, `invite_code`, `admin_token`, `owner_user_id`, lifecycle dates | RPC only |
| `player_sessions` | one row per player device: `token_hash` | RPC only |
| `tournament_account_players` | which account is linked to which player slot (cascade-deleted with the tournament) | RPC only |
| `account_tournament_statistics` | permanent history per account (no foreign key to `tournaments` on purpose) | own rows readable (RLS policy) |
| `tournament_finalization_receipts` | proof that statistics were saved; blocks deletion before that | RPC only |
| `tournament_invitations` | invitations by email (Phase 17) | RPC only |
| `system_owner` | the one protected system owner (Phase 23) | closed; guarded by triggers |
| `profiles`, `player_profiles`, `player_profile_history` | account profile and local-profile history | policies / RPC |
| `push_subscriptions` | Web Push subscriptions per tournament and player | RPC only |
| `match_scorer_heartbeats` | which device is alive as a match's scorer | RPC only |
| `api_rate_limits` | request counters for the rate limit | internal |

## Function groups

- **Tournament**: `create_tournament`, `get_tournament_by_code`, `get_spectator_tournament_by_code`, `save_tournament_state`, `delete_tournament`, `finalize_tournament`, `clear_tournament_expiry`, `claim_tournament`.
- **Admin match/round**: `admin_match_action`, `admin_set_result`, `admin_undo_match`, `admin_advance_round`, `admin_advance_cup`, `admin_set_match_scorer`, `admin_resolve_result`, `admin_correct_result`.
- **Players**: `join_tournament`, `set_player_availability`, `claim_player_account`, `save_player_point`, `submit_match_result`, `match_scorer_action`, `match_result_action`, `match_withdrawal_decision`.
- **Profile/history**: `upsert_player_profile`, `get_player_profile_history`, `save_player_profile_history`, `request_player_profile_deletion`, `cancel_player_profile_deletion`, `list_my_active_tournaments`.
- **Invitations**: `admin_invite_player`, `admin_list_invitations`, `admin_cancel_invitation`, `list_my_invitations`, `decline_invitation`.
- **System owner**: `is_system_owner`, `admin_overview`.
- **Push**: `upsert_push_subscription`, `delete_push_subscription` (sending is the Edge Function `supabase/functions/push-send`).
- **Jobs (pg_cron, never callable from the client)**: `process_result_approvals` (every minute), `cleanup_expired_tournaments` and `cleanup_expired_player_profiles` (job `padelstar-retention-cleanup`, hourly).

## Guards (triggers)

- A finished tournament (`state.status = 'Avsluttet'`) is read-only, and cannot be marked finished except through `finalize_tournament` (which writes statistics and a receipt first).
- A tournament cannot be deleted before its receipt exists.
- The system owner row cannot be updated, deleted or truncated (only the database owner can hand the role over, see the migration).

## Migrations

- Files live in `supabase/migrations/` with a timestamp prefix and run in order. The developer applies them in the Supabase SQL Editor (or a tool that is allowed to); each one is tested first with the in-memory Postgres tests in `supabase/tests/*.pglite.mjs` (`npm install --no-save @electric-sql/pglite`, then `node supabase/tests/<name>.pglite.mjs`).
- A migration must be additive and compatible with the version of the app that is live when it is applied.
- After a change run the Supabase advisors; the expected findings are "RLS enabled, no policy" (intended) and "SECURITY DEFINER function executable by anon/authenticated" for the token-checked functions listed above, plus leaked-password protection (a Pro-plan feature).

## Retention (see `privacy-retention.md`)

Guest tournaments are kept read-only for 24 hours after they finish; a tournament idle for 30 days expires and is deleted 7 days later unless the admin resumes it; account-owned tournaments and all statistics are kept.
