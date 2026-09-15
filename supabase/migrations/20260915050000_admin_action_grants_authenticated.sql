-- The admin_* action RPCs (and delete_tournament) authorize purely by
-- possession of the tournament's admin_token, checked inside the function
-- body -- not by which Postgres role calls them. They were only ever
-- granted EXECUTE to anon, never to authenticated, so a signed-in account
-- owner could create and finish a tournament but not register results,
-- advance rounds, perform match actions, undo a match, or delete a
-- tournament (found and fixed live in this app's first session, verified
-- via a full authenticated-owner Round Robin playthrough; docs/BUGS.md
-- "Authenticated (account-owned) path").
--
-- That fix was applied directly in the Supabase Dashboard SQL Editor and
-- was never captured as a migration file, so a fresh database restored
-- from `supabase/migrations/` would silently regress it (found while
-- investigating the Cup format, which depends on admin_advance_cup).
-- This migration makes the already-live grants reproducible. GRANT is
-- idempotent, so re-running this against the already-fixed database is a
-- no-op.
grant execute on function public.admin_set_result(uuid, text, uuid, integer, integer, integer) to authenticated;
grant execute on function public.admin_advance_round(uuid, text, integer) to authenticated;
grant execute on function public.admin_advance_cup(uuid, text, integer) to authenticated;
grant execute on function public.admin_match_action(uuid, text, uuid, text, integer, integer) to authenticated;
grant execute on function public.admin_undo_match(uuid, text, uuid, integer) to authenticated;
grant execute on function public.delete_tournament(uuid, text) to authenticated;
