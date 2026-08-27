create table if not exists public.api_rate_limits (
  bucket_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint api_rate_limits_bucket_hash_length check (length(bucket_hash) = 64),
  constraint api_rate_limits_request_count_nonnegative check (request_count >= 0)
);

alter table public.api_rate_limits enable row level security;
revoke all privileges on table public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  bucket_hash_value text;
  allowed boolean;
begin
  if p_bucket is null
    or length(p_bucket) = 0
    or length(p_bucket) > 256
    or p_limit is null
    or p_limit < 1
    or p_window_seconds is null
    or p_window_seconds < 1 then
    raise exception 'Invalid rate limit payload';
  end if;

  bucket_hash_value := encode(extensions.digest(p_bucket, 'sha256'), 'hex');
  insert into public.api_rate_limits (bucket_hash, window_started_at, request_count, updated_at)
  values (bucket_hash_value, now(), 1, now())
  on conflict (bucket_hash) do update
  set window_started_at = case
        when public.api_rate_limits.window_started_at <= now() - (p_window_seconds * interval '1 second')
          then now()
        else public.api_rate_limits.window_started_at
      end,
      request_count = case
        when public.api_rate_limits.window_started_at <= now() - (p_window_seconds * interval '1 second')
          then 1
        else public.api_rate_limits.request_count + 1
      end,
      updated_at = now()
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;

alter table public.player_sessions enable row level security;
revoke all privileges on table public.player_sessions from public, anon, authenticated;

alter table public.tournaments enable row level security;
drop policy if exists "Public can read tournament states for realtime" on public.tournaments;
create policy "Public can read tournament states for realtime"
on public.tournaments
for select
to anon
using (true);

revoke all privileges on table public.tournaments from anon, authenticated;
revoke select on public.tournaments from public, anon, authenticated;
grant select (id, invite_code, state, revision, created_at, updated_at) on public.tournaments to anon;

alter function public.create_tournament(jsonb, text) rename to create_tournament_impl;
alter function public.get_tournament_by_code(text) rename to get_tournament_by_code_impl;
alter function public.save_tournament_state(uuid, text, jsonb, integer) rename to save_tournament_state_impl;
alter function public.join_tournament(text, jsonb) rename to join_tournament_impl;
alter function public.save_player_point(uuid, text, uuid, uuid, integer, text) rename to save_player_point_impl;
alter function public.admin_advance_cup(uuid, text, integer) rename to admin_advance_cup_impl;
alter function public.admin_advance_round(uuid, text, integer) rename to admin_advance_round_impl;
alter function public.admin_set_result(uuid, text, uuid, integer, integer, integer) rename to admin_set_result_impl;
alter function public.admin_match_action(uuid, text, uuid, text, integer, integer) rename to admin_match_action_impl;
alter function public.delete_tournament(uuid, text) rename to delete_tournament_impl;

revoke all on function public.create_tournament_impl(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_tournament_by_code_impl(text) from public, anon, authenticated;
revoke all on function public.save_tournament_state_impl(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.join_tournament_impl(text, jsonb) from public, anon, authenticated;
revoke all on function public.save_player_point_impl(uuid, text, uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.admin_advance_cup_impl(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_advance_round_impl(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_set_result_impl(uuid, text, uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_match_action_impl(uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.delete_tournament_impl(uuid, text) from public, anon, authenticated;

create or replace function public.create_tournament(
  p_state jsonb,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_state is null
    or jsonb_typeof(p_state) <> 'object'
    or pg_column_size(p_state) > 262144
    or p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or length(coalesce(p_state->>'name', '')) not between 1 and 80
    or coalesce(p_state->>'inviteCode', '') !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid tournament payload';
  end if;

  if not public.consume_api_rate_limit('create:' || p_admin_token, 10, 3600) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.create_tournament_impl(p_state, p_admin_token);
end;
$$;

create or replace function public.get_tournament_by_code(
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid invite code';
  end if;

  if not public.consume_api_rate_limit('get:' || upper(trim(p_invite_code)), 60, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.get_tournament_by_code_impl(p_invite_code);
end;
$$;

create or replace function public.save_tournament_state(
  p_tournament_id uuid,
  p_admin_token text,
  p_state jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_state is null
    or jsonb_typeof(p_state) <> 'object'
    or pg_column_size(p_state) > 262144
    or p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_state->>'id' <> p_tournament_id::text
    or coalesce(p_state->>'inviteCode', '') !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid tournament state payload';
  end if;

  if not public.consume_api_rate_limit('admin-state:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.save_tournament_state_impl(p_tournament_id, p_admin_token, p_state, p_expected_revision);
end;
$$;

create or replace function public.join_tournament(
  p_invite_code text,
  p_player jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
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

  return public.join_tournament_impl(p_invite_code, p_player);
end;
$$;

create or replace function public.save_player_point(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_team_index integer,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_player_token is null or trim(p_player_token) !~ '^[0-9a-f]{48}$' then
    raise exception 'Invalid player score payload';
  end if;

  if not public.consume_api_rate_limit('player-score:' || trim(p_player_token), 240, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.save_player_point_impl(
    p_tournament_id,
    p_invite_code,
    p_player_id,
    p_match_id,
    p_team_index,
    p_player_token
  );
end;
$$;

create or replace function public.admin_advance_cup(
  p_tournament_id uuid,
  p_admin_token text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid cup advance payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_advance_cup_impl(p_tournament_id, p_admin_token, p_expected_revision);
end;
$$;

create or replace function public.admin_advance_round(
  p_tournament_id uuid,
  p_admin_token text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid round advance payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_advance_round_impl(p_tournament_id, p_admin_token, p_expected_revision);
end;
$$;

create or replace function public.admin_set_result(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_team_one_score integer,
  p_team_two_score integer,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid set result payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_set_result_impl(
    p_tournament_id,
    p_admin_token,
    p_match_id,
    p_team_one_score,
    p_team_two_score,
    p_expected_revision
  );
end;
$$;

create or replace function public.admin_match_action(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_action text,
  p_team_index integer,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid admin match action payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_match_action_impl(
    p_tournament_id,
    p_admin_token,
    p_match_id,
    p_action,
    p_team_index,
    p_expected_revision
  );
end;
$$;

create or replace function public.delete_tournament(
  p_tournament_id uuid,
  p_admin_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid delete payload';
  end if;

  if not public.consume_api_rate_limit('delete:' || p_admin_token, 10, 3600) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.delete_tournament_impl(p_tournament_id, p_admin_token);
end;
$$;

revoke all on function public.create_tournament(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_tournament_by_code(text) from public, anon, authenticated;
revoke all on function public.save_tournament_state(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.join_tournament(text, jsonb) from public, anon, authenticated;
revoke all on function public.save_player_point(uuid, text, uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.admin_advance_cup(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_advance_round(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_set_result(uuid, text, uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_match_action(uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.delete_tournament(uuid, text) from public, anon, authenticated;

grant execute on function public.create_tournament(jsonb, text) to anon;
grant execute on function public.get_tournament_by_code(text) to anon;
grant execute on function public.save_tournament_state(uuid, text, jsonb, integer) to anon;
grant execute on function public.join_tournament(text, jsonb) to anon;
grant execute on function public.save_player_point(uuid, text, uuid, uuid, integer, text) to anon;
grant execute on function public.admin_advance_cup(uuid, text, integer) to anon;
grant execute on function public.admin_advance_round(uuid, text, integer) to anon;
grant execute on function public.admin_set_result(uuid, text, uuid, integer, integer, integer) to anon;
grant execute on function public.admin_match_action(uuid, text, uuid, text, integer, integer) to anon;
grant execute on function public.delete_tournament(uuid, text) to anon;
