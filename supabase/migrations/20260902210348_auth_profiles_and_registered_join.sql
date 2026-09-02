create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_id text not null default 'smash',
  preferred_language text not null default 'nb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or length(trim(display_name)) between 1 and 64),
  constraint profiles_avatar check (avatar_id in ('smash', 'serve', 'wall', 'lob'))
);

alter table public.profiles enable row level security;
revoke all on table public.profiles from public, anon;
grant select, insert, update on table public.profiles to authenticated;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_insert_own on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_insert_own on public.profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.join_tournament(
  p_invite_code text,
  p_player jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  result jsonb;
  tournament_id uuid;
  current_state jsonb;
  existing_player jsonb;
  player_id uuid;
  authenticated_user uuid := auth.uid();
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

  if authenticated_user is not null then
    select t.id, t.state into tournament_id, current_state
    from public.tournaments t
    where t.invite_code = upper(trim(p_invite_code))
    for update;
    if current_state is null then raise exception 'Tournament not found'; end if;
    select value into existing_player
    from jsonb_array_elements(coalesce(current_state->'players', '[]'::jsonb)) value
    where lower(value->>'name') = lower(trim(p_player->>'name'))
    limit 1;
    if existing_player is not null and existing_player->>'userId' is not null
      and existing_player->>'userId' <> authenticated_user::text then
      raise exception 'Player name belongs to another account';
    end if;
  end if;

  result := public.join_tournament_impl(p_invite_code, p_player);

  if authenticated_user is not null then
    player_id := (result->>'playerId')::uuid;
    update public.tournaments t
    set state = jsonb_set(
      t.state,
      '{players}',
      coalesce((
        select jsonb_agg(
          case when value->>'id' = player_id::text
            then value || jsonb_build_object('userId', authenticated_user, 'guest', false, 'participantType', 'player')
            else value
          end
        )
        from jsonb_array_elements(coalesce(t.state->'players', '[]'::jsonb)) value
      ), '[]'::jsonb),
      true
    )
    where t.id = tournament_id
    returning t.state into current_state;
    result := jsonb_set(result, '{state}', current_state, true);
  end if;

  return result;
end;
$$;

revoke all on function public.join_tournament(text, jsonb) from public, authenticated;
grant execute on function public.join_tournament(text, jsonb) to anon, authenticated;
