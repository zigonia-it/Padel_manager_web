-- Phase 23: the initial system owner (Systemeier).
--
--   * Exactly one protected system owner, stored server-side in public.system_owner (a singleton: the primary key is a
--     constant, so a second row is impossible).
--   * The row cannot be deleted, truncated or changed through SQL by any ordinary role: triggers refuse it. The one
--     deliberate way to hand the role to someone else is for the database owner to set
--     `set app.system_owner_transfer = 'confirmed'` in their own session and update user_id, which is visible in the
--     migration/operations history and impossible from the app.
--   * The table is closed to the API roles (RLS on, no policies, no grants). The app can only ask two questions
--     through SECURITY DEFINER functions: is_system_owner() (about the caller only) and admin_overview() (owner only).
--   * Deleting the owner's account (auth.users) is refused while the row references it.
--   * The frontend alone can never grant access: every check happens here, against auth.uid().
--
-- Seeded with the developer's verified account (approved 2026-09-19): sigurd.grodem@live.no.

create table if not exists public.system_owner (
  singleton boolean primary key default true check (singleton),
  user_id uuid not null unique references auth.users (id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.system_owner enable row level security;
revoke all on public.system_owner from public, anon, authenticated;

create or replace function public.system_owner_guard()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if tg_op = 'UPDATE' and current_setting('app.system_owner_transfer', true) = 'confirmed' then
    return new;
  end if;
  raise exception 'The system owner is protected and cannot be changed or removed';
end
$function$;

drop trigger if exists system_owner_row_guard on public.system_owner;
create trigger system_owner_row_guard
  before update or delete on public.system_owner
  for each row execute function public.system_owner_guard();

drop trigger if exists system_owner_truncate_guard on public.system_owner;
create trigger system_owner_truncate_guard
  before truncate on public.system_owner
  for each statement execute function public.system_owner_guard();

-- Seed the single owner. Fails loudly (rolling the migration back) if the account does not exist.
do $seed$
declare
  owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email) = 'sigurd.grodem@live.no';
  if owner_id is null then
    raise exception 'The system owner account does not exist in auth.users';
  end if;
  insert into public.system_owner (user_id) values (owner_id) on conflict do nothing;
end
$seed$;

-- Is the signed-in user the system owner? Answers only about the caller.
create or replace function public.is_system_owner()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select auth.uid() is not null
    and exists (select 1 from public.system_owner where user_id = auth.uid());
$function$;

-- The minimum owner administration: counts and the latest tournaments (no tokens, no invite codes, no personal data).
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;
  return jsonb_build_object(
    'generatedAt', now(),
    'counts', jsonb_build_object(
      'tournaments', (select count(*) from public.tournaments),
      'running', (select count(*) from public.tournaments where coalesce(state->>'status', '') <> 'Avsluttet' and expired_at is null),
      'finished', (select count(*) from public.tournaments where state->>'status' = 'Avsluttet'),
      'expired', (select count(*) from public.tournaments where expired_at is not null),
      'accountOwned', (select count(*) from public.tournaments where owner_user_id is not null),
      'profiles', (select count(*) from public.player_profiles)
    ),
    'recentTournaments', (
      select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
      from (
        select id, state->>'name' as name, state->>'status' as status, created_at, updated_at,
               (owner_user_id is not null) as account_owned,
               jsonb_array_length(coalesce(state->'players', '[]'::jsonb)) as players
        from public.tournaments
        order by created_at desc
        limit 20
      ) x
    )
  );
end
$function$;

revoke execute on function public.system_owner_guard() from public, anon, authenticated;
revoke execute on function public.is_system_owner() from public, anon;
revoke execute on function public.admin_overview() from public, anon;
grant execute on function public.is_system_owner() to authenticated;
grant execute on function public.admin_overview() to authenticated;
