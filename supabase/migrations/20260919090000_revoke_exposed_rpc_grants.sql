-- Phase 24 security audit: two SECURITY DEFINER functions kept the default PUBLIC execute grant.
--
-- upsert_player_profile_impl is the unrate-limited inner function of upsert_player_profile;
-- the wrapper (which enforces the rate limit) is the only intended entry point, exactly like
-- save_player_point_impl (execute: postgres only).
--
-- list_my_active_tournaments reads auth.uid() and is intended for signed-in users only.

revoke execute on function public.upsert_player_profile_impl(uuid, text, text, text, text) from public, anon, authenticated;

revoke execute on function public.list_my_active_tournaments() from public, anon;
grant execute on function public.list_my_active_tournaments() to authenticated;
