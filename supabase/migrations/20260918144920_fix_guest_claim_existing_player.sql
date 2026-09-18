-- Fix: join_tournament_authenticated_impl's account-ownership guard blocked
-- EVERY guest from claiming an admin-added existing player, unconditionally.
--
-- The guard `not exists (select 1 from tournament_account_players where ...
-- and user_id = uid)` is meant to stop a signed-in account from claiming a
-- player name already linked to a DIFFERENT signed-in account. But for a
-- guest, auth.uid() is null, and `user_id = null` is never true in SQL
-- (three-valued logic: unknown, not false) -- so the `exists(...)` is always
-- false and `not exists(...)` is always true whenever existing_player is not
-- null, meaning every guest hit "Player name belongs to another session" the
-- instant they tried to claim ANY already-existing player, regardless of
-- whether it was ever actually claimed by anyone.
--
-- This sits one layer deeper than the already-fixed guard in join_tournament
-- itself (its player_sessions-existence check correctly allows a guest's
-- first claim through) -- join_tournament calls this function afterward, so
-- both guards had to be correct for the flow to work, and only one was.
-- Reproduced live: a fresh guest browser, invite code for a tournament with
-- one admin-added player ("Carl", never claimed before), clicking "Admin har
-- lagt meg til" -> Carl still failed with this exact message even after the
-- other guest-join migration was applied.
--
-- Fix: scope the account-ownership check to authenticated callers only --
-- guests are already correctly gated by join_tournament's player_sessions
-- check one layer up, so they should simply skip this account-linkage guard
-- entirely rather than fail it vacuously.
create or replace function public.join_tournament_authenticated_impl(p_invite_code text, p_player jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  tid uuid; current_state jsonb; existing_player jsonb; result jsonb;
  uid uuid := auth.uid(); pid uuid;
begin
  select id, state into tid, current_state from public.tournaments
    where invite_code = upper(trim(p_invite_code)) for update;
  if tid is null or current_state->>'status' = 'Avsluttet' then raise exception 'Tournament not active'; end if;
  select value into existing_player from jsonb_array_elements(coalesce(current_state->'players', '[]'))
    where lower(value->>'name') = lower(trim(p_player->>'name')) limit 1;
  if uid is not null and existing_player is not null and not exists (
    select 1 from public.tournament_account_players
    where tournament_id = tid and player_id = (existing_player->>'id')::uuid and user_id = uid
  ) then raise exception 'Player name belongs to another session'; end if;
  if uid is not null and exists (select 1 from public.tournament_account_players
    where tournament_id = tid and user_id = uid and player_id <> coalesce((existing_player->>'id')::uuid, gen_random_uuid()))
    then raise exception 'Account already joined'; end if;
  result := public.join_tournament_impl(p_invite_code, p_player - 'userId' - 'profileId');
  pid := (result->>'playerId')::uuid;
  if uid is not null then
    insert into public.tournament_account_players values (tid, pid, uid) on conflict do nothing;
  end if;
  update public.tournaments t set state = jsonb_set(t.state, '{players}', (
    select jsonb_agg(case when value->>'id' = pid::text then
      (value - 'userId' - 'profileId') || jsonb_build_object('userId', uid, 'guest', uid is null)
      else value end) from jsonb_array_elements(t.state->'players')
  )) where id = tid returning state into current_state;
  return jsonb_set(result, '{state}', current_state);
end $function$;
