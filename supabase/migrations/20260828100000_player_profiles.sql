create table if not exists public.player_profiles (
  id uuid primary key,
  token_hash text not null,
  display_name text not null,
  avatar_id text not null default 'smash',
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_profiles_name_length check (length(display_name) between 1 and 64),
  constraint player_profiles_avatar check (avatar_id in ('smash', 'serve', 'wall', 'lob')),
  constraint player_profiles_token_hash_length check (length(token_hash) = 64)
);

create table if not exists public.player_profile_history (
  id uuid not null,
  profile_id uuid not null references public.player_profiles(id) on delete cascade,
  tournament_id uuid,
  tournament_name text not null,
  ended_at timestamptz not null,
  placement integer,
  points integer not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  sets integer not null default 0,
  games integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (profile_id, id),
  constraint player_profile_history_numbers check (
    points >= 0 and matches >= 0 and wins >= 0 and sets >= 0 and games >= 0
  )
);

alter table public.player_profiles enable row level security;
alter table public.player_profile_history enable row level security;
revoke all privileges on table public.player_profiles from public, anon, authenticated;
revoke all privileges on table public.player_profile_history from public, anon, authenticated;

create index if not exists player_profile_history_profile_ended_idx
on public.player_profile_history (profile_id, ended_at desc);

create or replace function public.upsert_player_profile_impl(
  p_profile_id uuid,
  p_profile_token text,
  p_display_name text,
  p_avatar_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  existing_token_hash text;
  next_name text := trim(coalesce(p_display_name, ''));
  next_avatar text := case when p_avatar_id in ('smash', 'serve', 'wall', 'lob') then p_avatar_id else 'smash' end;
  saved_profile public.player_profiles;
begin
  if p_profile_id is null or p_profile_token is null or length(trim(p_profile_token)) < 32
    or length(next_name) < 1 or length(next_name) > 64 then
    raise exception 'Invalid profile payload';
  end if;

  select token_hash into existing_token_hash
  from public.player_profiles
  where id = p_profile_id
  for update;

  if existing_token_hash is not null
    and existing_token_hash <> encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex') then
    raise exception 'Profile token mismatch';
  end if;

  insert into public.player_profiles (id, token_hash, display_name, avatar_id)
  values (p_profile_id, encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex'), next_name, next_avatar)
  on conflict (profile_id, id) do update
  set display_name = excluded.display_name,
      avatar_id = excluded.avatar_id,
      deletion_requested_at = null,
      deletion_scheduled_for = null,
      updated_at = now()
  returning * into saved_profile;

  return jsonb_build_object('profile', jsonb_build_object(
    'id', saved_profile.id,
    'displayName', saved_profile.display_name,
    'avatarId', saved_profile.avatar_id,
    'createdAt', saved_profile.created_at,
    'updatedAt', saved_profile.updated_at,
    'deletionRequestedAt', saved_profile.deletion_requested_at,
    'deletionScheduledFor', saved_profile.deletion_scheduled_for
  ));
end;
$$;

create or replace function public.save_player_profile_history_impl(
  p_profile_id uuid,
  p_profile_token text,
  p_history jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  history_id uuid;
begin
  if p_profile_id is null or p_profile_token is null or length(trim(p_profile_token)) < 32
    or p_history is null or jsonb_typeof(p_history) <> 'object' then
    raise exception 'Invalid profile history payload';
  end if;

  if not exists (
    select 1 from public.player_profiles
    where id = p_profile_id
      and token_hash = encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex')
  ) then
    raise exception 'Profile token mismatch';
  end if;

  history_id := (p_history->>'id')::uuid;
  if history_id is null or length(trim(coalesce(p_history->>'tournamentName', ''))) < 1
    or (p_history->>'endedAt') is null then
    raise exception 'Invalid profile history payload';
  end if;

  insert into public.player_profile_history (
    id, profile_id, tournament_id, tournament_name, ended_at, placement, points, matches, wins, sets, games
  ) values (
    history_id,
    p_profile_id,
    nullif(p_history->>'id', '')::uuid,
    left(trim(p_history->>'tournamentName'), 120),
    (p_history->>'endedAt')::timestamptz,
    nullif(p_history->>'placement', '')::integer,
    greatest(0, coalesce((p_history->>'points')::integer, 0)),
    greatest(0, coalesce((p_history->>'matches')::integer, 0)),
    greatest(0, coalesce((p_history->>'wins')::integer, 0)),
    greatest(0, coalesce((p_history->>'sets')::integer, 0)),
    greatest(0, coalesce((p_history->>'games')::integer, 0))
  )
  on conflict (id) do update
  set tournament_name = excluded.tournament_name,
      ended_at = excluded.ended_at,
      placement = excluded.placement,
      points = excluded.points,
      matches = excluded.matches,
      wins = excluded.wins,
      sets = excluded.sets,
      games = excluded.games;

  return true;
end;
$$;

create or replace function public.request_player_profile_deletion_impl(
  p_profile_id uuid,
  p_profile_token text
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  scheduled_for timestamptz := now() + interval '30 days';
begin
  update public.player_profiles
  set deletion_requested_at = now(), deletion_scheduled_for = scheduled_for, updated_at = now()
  where id = p_profile_id
    and token_hash = encode(extensions.digest(trim(coalesce(p_profile_token, '')), 'sha256'), 'hex')
    and length(trim(coalesce(p_profile_token, ''))) >= 32;
  if not found then raise exception 'Profile token mismatch'; end if;
  return scheduled_for;
end;
$$;

create or replace function public.cancel_player_profile_deletion_impl(
  p_profile_id uuid,
  p_profile_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.player_profiles
  set deletion_requested_at = null, deletion_scheduled_for = null, updated_at = now()
  where id = p_profile_id
    and token_hash = encode(extensions.digest(trim(coalesce(p_profile_token, '')), 'sha256'), 'hex')
    and length(trim(coalesce(p_profile_token, ''))) >= 32;
  if not found then raise exception 'Profile token mismatch'; end if;
  return true;
end;
$$;

create or replace function public.cleanup_expired_player_profiles(
  p_retention_days integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  deleted_profiles integer;
begin
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'Invalid retention window';
  end if;
  delete from public.player_profiles
  where deletion_scheduled_for is not null
    and deletion_scheduled_for <= now()
    and deletion_requested_at <= now() - make_interval(days => p_retention_days);
  get diagnostics deleted_profiles = row_count;
  return deleted_profiles;
end;
$$;

create or replace function public.upsert_player_profile(
  p_profile_id uuid, p_profile_token text, p_display_name text, p_avatar_id text
)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.consume_api_rate_limit('profile:' || coalesce(p_profile_token, 'missing'), 30, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.upsert_player_profile_impl(p_profile_id, p_profile_token, p_display_name, p_avatar_id);
end;
$$;

create or replace function public.save_player_profile_history(
  p_profile_id uuid, p_profile_token text, p_history jsonb
)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.consume_api_rate_limit('profile-history:' || coalesce(p_profile_token, 'missing'), 60, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.save_player_profile_history_impl(p_profile_id, p_profile_token, p_history);
end;
$$;

create or replace function public.request_player_profile_deletion(p_profile_id uuid, p_profile_token text)
returns timestamptz language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.consume_api_rate_limit('profile-delete:' || coalesce(p_profile_token, 'missing'), 10, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.request_player_profile_deletion_impl(p_profile_id, p_profile_token);
end;
$$;

create or replace function public.cancel_player_profile_deletion(p_profile_id uuid, p_profile_token text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not public.consume_api_rate_limit('profile-cancel-delete:' || coalesce(p_profile_token, 'missing'), 10, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.cancel_player_profile_deletion_impl(p_profile_id, p_profile_token);
end;
$$;

revoke all on function public.upsert_player_profile_impl(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.save_player_profile_history_impl(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.request_player_profile_deletion_impl(uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_player_profile_deletion_impl(uuid, text) from public, anon, authenticated;
revoke all on function public.cleanup_expired_player_profiles(integer) from public, anon, authenticated;
revoke all on function public.upsert_player_profile(uuid, text, text, text) from public, authenticated;
revoke all on function public.save_player_profile_history(uuid, text, jsonb) from public, authenticated;
revoke all on function public.request_player_profile_deletion(uuid, text) from public, authenticated;
revoke all on function public.cancel_player_profile_deletion(uuid, text) from public, authenticated;
grant execute on function public.upsert_player_profile(uuid, text, text, text) to anon;
grant execute on function public.save_player_profile_history(uuid, text, jsonb) to anon;
grant execute on function public.request_player_profile_deletion(uuid, text) to anon;
grant execute on function public.cancel_player_profile_deletion(uuid, text) to anon;

-- Run retention from trusted database infrastructure, never from the client.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema extensions;
    if not exists (select 1 from cron.job where jobname = 'padelstar-retention-cleanup') then
      perform cron.schedule(
        'padelstar-retention-cleanup',
        '15 3 * * *',
        $job$select public.cleanup_expired_tournaments(); select public.cleanup_expired_player_profiles();$job$
      );
    end if;
  end if;
end;
$$;
