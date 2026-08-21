create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id uuid primary key,
  invite_code text not null unique,
  admin_token text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments enable row level security;

drop policy if exists "Public can read tournament states for realtime" on public.tournaments;
create policy "Public can read tournament states for realtime"
on public.tournaments
for select
to anon
using (true);

revoke insert, update, delete on public.tournaments from anon;
grant select on public.tournaments to anon;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at
before update on public.tournaments
for each row
execute function public.touch_updated_at();

create or replace function public.create_tournament(
  p_state jsonb,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid := (p_state->>'id')::uuid;
  next_invite_code text := upper(p_state->>'inviteCode');
  saved_state jsonb;
begin
  if next_id is null or next_invite_code is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid tournament payload';
  end if;

  saved_state := p_state - 'adminToken' - 'selectedPlayerId';

  insert into public.tournaments (id, invite_code, admin_token, state)
  values (next_id, next_invite_code, p_admin_token, saved_state)
  on conflict (id) do update
  set invite_code = excluded.invite_code,
      admin_token = excluded.admin_token,
      state = excluded.state;

  return saved_state;
end;
$$;

create or replace function public.get_tournament_by_code(
  p_invite_code text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select state
  from public.tournaments
  where invite_code = upper(trim(p_invite_code))
  limit 1;
$$;

create or replace function public.save_tournament_state(
  p_tournament_id uuid,
  p_admin_token text,
  p_state jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_state jsonb;
begin
  saved_state := p_state - 'adminToken' - 'selectedPlayerId';

  update public.tournaments
  set state = saved_state,
      invite_code = upper(saved_state->>'inviteCode')
  where id = p_tournament_id
    and admin_token = p_admin_token
  returning state into saved_state;

  if saved_state is null then
    raise exception 'Admin token mismatch or tournament not found';
  end if;

  return saved_state;
end;
$$;

create or replace function public.join_tournament(
  p_invite_code text,
  p_player jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_state jsonb;
  next_players jsonb;
  existing_player jsonb;
  player_name text := trim(p_player->>'name');
begin
  select state into current_state
  from public.tournaments
  where invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  if player_name = '' then
    raise exception 'Player name is required';
  end if;

  select value into existing_player
  from jsonb_array_elements(current_state->'players') value
  where lower(value->>'name') = lower(player_name)
  limit 1;

  if existing_player is not null then
    return current_state;
  end if;

  if jsonb_array_length(current_state->'rounds') > 0 then
    raise exception 'Tournament has already started';
  end if;

  next_players := coalesce(current_state->'players', '[]'::jsonb) || jsonb_build_array(p_player);
  current_state := jsonb_set(current_state, '{players}', next_players, true);

  update public.tournaments
  set state = current_state
  where invite_code = upper(trim(p_invite_code));

  return current_state;
end;
$$;

grant execute on function public.create_tournament(jsonb, text) to anon;
grant execute on function public.get_tournament_by_code(text) to anon;
grant execute on function public.save_tournament_state(uuid, text, jsonb) to anon;
grant execute on function public.join_tournament(text, jsonb) to anon;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournaments'
  ) then
    alter publication supabase_realtime add table public.tournaments;
  end if;
end;
$$;
