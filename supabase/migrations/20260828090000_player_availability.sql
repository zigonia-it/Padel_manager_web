create or replace function public.set_player_availability_impl(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_availability text,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_state jsonb;
  current_revision integer;
  next_state jsonb;
  next_players jsonb;
begin
  if p_tournament_id is null
    or p_invite_code is null
    or p_player_id is null
    or p_availability not in ('active', 'away')
    or p_player_token is null
    or length(trim(p_player_token)) < 32 then
    raise exception 'Invalid player availability payload';
  end if;

  if not exists (
    select 1
    from public.player_sessions
    where tournament_id = p_tournament_id
      and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player token mismatch';
  end if;

  select state, revision
  into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id
    and invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  select jsonb_agg(
    case
      when value->>'id' = p_player_id::text
        then jsonb_set(value, '{availability}', to_jsonb(p_availability), true)
      else value
    end
  )
  into next_players
  from jsonb_array_elements(coalesce(current_state->'players', '[]'::jsonb)) value;

  if next_players is null then
    raise exception 'Player not found';
  end if;

  next_state := jsonb_set(current_state, '{players}', next_players, true);
  next_state := jsonb_set(next_state, '{revision}', to_jsonb(current_revision + 1), true);

  update public.tournaments
  set state = next_state,
      revision = current_revision + 1
  where id = p_tournament_id
    and revision = current_revision;

  return next_state;
end;
$$;

create or replace function public.set_player_availability(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_availability text,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.consume_api_rate_limit('availability:' || coalesce(p_player_token, 'missing'), 30, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.set_player_availability_impl(
    p_tournament_id,
    p_invite_code,
    p_player_id,
    p_availability,
    p_player_token
  );
end;
$$;

revoke all on function public.set_player_availability_impl(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_player_availability(uuid, text, uuid, text, text) from public, authenticated;
grant execute on function public.set_player_availability(uuid, text, uuid, text, text) to anon;
