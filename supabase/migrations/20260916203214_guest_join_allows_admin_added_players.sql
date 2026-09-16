-- Fix: guests could never claim a player the admin had already added by name
-- ("Admin har lagt meg til" on the join page). join_tournament()'s guest guard
-- blocked ANY name match unconditionally, even for a roster entry nobody had
-- claimed a session for yet -- so every guest selecting a pre-added name got
-- "Player name already joined; sign in to rejoin", 100% of the time. The
-- guard's real purpose is to stop a second guest from squatting a name someone
-- else already actively claimed, not to block the first legitimate claim of an
-- admin-added seat. Narrowed the check to only block when a player_sessions
-- row already exists for that player id (i.e. someone already has a token for
-- it) rather than merely existing in the roster.
create or replace function public.join_tournament(p_invite_code text, p_player jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  existing_player jsonb;
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$'
    or p_player is null
    or jsonb_typeof(p_player) <> 'object'
    or length(trim(coalesce(p_player->>'name', ''))) not between 1 and 64 then
    raise exception 'Invalid player payload';
  end if;
  if not public.consume_api_rate_limit('join:' || upper(trim(p_invite_code)), 30, 600) then
    raise exception 'Rate limit exceeded';
  end if;
  if auth.uid() is null then
    select value into existing_player
    from public.tournaments t, jsonb_array_elements(coalesce(t.state->'players', '[]'::jsonb)) value
    where t.invite_code = upper(trim(p_invite_code))
      and lower(value->>'name') = lower(trim(p_player->>'name'))
    limit 1;
    if existing_player is not null and exists (
      select 1 from public.player_sessions
      where player_id = (existing_player->>'id')::uuid
    ) then
      raise exception 'Player name already joined; sign in to rejoin';
    end if;
  end if;
  return public.join_tournament_authenticated_impl(p_invite_code, p_player);
end;
$function$;
