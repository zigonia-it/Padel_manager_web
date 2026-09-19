-- Phase 17 (Q1): a signed-in player can claim an admin-added slot that nobody has claimed or linked yet.
--
-- Before: join_tournament_authenticated_impl refused every signed-in account that named an existing roster entry unless
-- that entry was already bound to the same account, so an account could never claim a pre-added seat (only a guest could,
-- and a guest identity can never be turned into an account). join_tournament_impl reuses an existing name's slot and
-- issues a NEW session token, so the guard must stay strict about slots someone else already holds.
--
-- Now, for a signed-in caller naming an existing player:
--   * bound to this account          -> rejoin (unchanged)
--   * bound to another account       -> refused (unchanged message)
--   * already claimed by a device
--     (has a session, no account)    -> refused: no name-only takeover of a claimed slot (unchanged message)
--   * never claimed and not linked   -> allowed: this is the explicit claim; the slot is linked to the account
-- Everything else (account already joined with another player, finished tournaments, guests) is as before.

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
  ) then
    -- not this account's slot: only a slot that nobody has linked or claimed may be claimed
    if exists (select 1 from public.tournament_account_players
                 where tournament_id = tid and player_id = (existing_player->>'id')::uuid)
       or exists (select 1 from public.player_sessions
                    where tournament_id = tid and player_id = (existing_player->>'id')::uuid) then
      raise exception 'Player name belongs to another session';
    end if;
  end if;
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

revoke all on function public.join_tournament_authenticated_impl(text, jsonb) from public, anon, authenticated;
