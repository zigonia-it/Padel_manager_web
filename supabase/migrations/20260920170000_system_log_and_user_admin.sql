-- System owner administration, part 3: a log of what happens in the system, and blocking / deleting accounts.
--
-- The log records only ids and coarse facts (no names, no e-mail addresses, no tournament content): who signed up
-- (account id), tournaments created / finished / deleted (tournament id, status, whether an account owns it) and the owner's own
-- actions (block, unblock, delete). Entries are kept 90 days. The table is closed to the API roles; only the owner-only
-- function admin_list_log reads it. Logging can never break the thing being logged: every writer swallows its own errors.
--
-- Blocking sets auth.users.banned_until (Supabase refuses new sign-ins and token refreshes) and ends the account's sessions.
-- Deleting removes the account; the database cascades to its profile row, statistics and tournament links, and tournaments it
-- owned stay but lose their owner (they then follow the normal guest lifecycle). The system owner can never be blocked or deleted,
-- and nobody can block or delete themselves here.

create table if not exists public.system_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  kind text not null,
  subject_type text not null,
  subject_id text,
  actor_id uuid,
  detail jsonb not null default '{}'::jsonb
);
create index if not exists system_log_at_idx on public.system_log (at desc);
create index if not exists system_log_kind_idx on public.system_log (kind, at desc);
alter table public.system_log enable row level security;
revoke all on public.system_log from public, anon, authenticated;

create or replace function public._log_system_event(p_kind text, p_subject_type text, p_subject_id text, p_actor uuid default null, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  insert into public.system_log (kind, subject_type, subject_id, actor_id, detail)
  values (p_kind, p_subject_type, p_subject_id, p_actor, coalesce(p_detail, '{}'::jsonb));
exception when others then
  null; -- the log must never break what it observes
end
$function$;
revoke execute on function public._log_system_event(text, text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function public._log_tournament_event()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if tg_op = 'INSERT' then
    perform public._log_system_event('tournament_created', 'tournament', new.id::text, null,
      jsonb_build_object('accountOwned', new.owner_user_id is not null, 'format', new.state->'settings'->>'format'));
  elsif tg_op = 'UPDATE' then
    if new.state->>'status' = 'Avsluttet' and coalesce(old.state->>'status', '') <> 'Avsluttet' then
      perform public._log_system_event('tournament_finished', 'tournament', new.id::text, null,
        jsonb_build_object('accountOwned', new.owner_user_id is not null));
    end if;
  elsif tg_op = 'DELETE' then
    perform public._log_system_event('tournament_deleted', 'tournament', old.id::text, null,
      jsonb_build_object('status', old.state->>'status', 'accountOwned', old.owner_user_id is not null, 'expired', old.expired_at is not null));
    return old;
  end if;
  return new;
exception when others then
  if tg_op = 'DELETE' then return old; end if;
  return new;
end
$function$;
revoke execute on function public._log_tournament_event() from public, anon, authenticated;

drop trigger if exists tournaments_log_insert on public.tournaments;
create trigger tournaments_log_insert after insert on public.tournaments for each row execute function public._log_tournament_event();
drop trigger if exists tournaments_log_update on public.tournaments;
create trigger tournaments_log_update after update on public.tournaments for each row
  when (old.state->>'status' is distinct from new.state->>'status') execute function public._log_tournament_event();
drop trigger if exists tournaments_log_delete on public.tournaments;
create trigger tournaments_log_delete after delete on public.tournaments for each row execute function public._log_tournament_event();

create or replace function public._log_user_signup()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  perform public._log_system_event('user_signed_up', 'user', new.id::text);
  return new;
exception when others then
  return new;
end
$function$;
revoke execute on function public._log_user_signup() from public, anon, authenticated;

drop trigger if exists users_log_signup on auth.users;
create trigger users_log_signup after insert on auth.users for each row execute function public._log_user_signup();

-- The owner reads the log, newest first. p_kind is 'all', 'user' or 'tournament'.
create or replace function public.admin_list_log(p_kind text default 'all', p_limit integer default 25, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  off integer := greatest(coalesce(p_offset, 0), 0);
  prefix text := case when p_kind in ('user', 'tournament') then p_kind || '\_%' else '%' end;
  total bigint;
  result jsonb;
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;
  select count(*) into total from public.system_log where kind like prefix;
  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.at desc, x.id desc), '[]'::jsonb) into result
  from (
    select id, at, kind, subject_type, subject_id, actor_id, detail
    from public.system_log where kind like prefix
    order by at desc, id desc limit lim offset off
  ) x;
  return jsonb_build_object('total', total, 'limit', lim, 'offset', off, 'rows', result);
end
$function$;

-- Block or unblock an account. Blocking also ends its sessions.
create or replace function public.admin_block_user(p_user_id uuid, p_blocked boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;
  if p_user_id is null or p_blocked is null then raise exception 'Invalid request'; end if;
  if p_user_id = auth.uid() or exists (select 1 from public.system_owner where user_id = p_user_id) then
    raise exception 'The system owner cannot be blocked';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'User not found'; end if;
  update auth.users set banned_until = case when p_blocked then now() + interval '100 years' else null end where id = p_user_id;
  if p_blocked then
    begin delete from auth.sessions where user_id = p_user_id; exception when undefined_table then null; end;
  end if;
  perform public._log_system_event(case when p_blocked then 'user_blocked' else 'user_unblocked' end, 'user', p_user_id::text, auth.uid());
  return jsonb_build_object('id', p_user_id, 'blocked', p_blocked);
end
$function$;

-- Delete an account (irreversible). Its profile, statistics and tournament links go with it; tournaments it owned lose their owner.
create or replace function public.admin_delete_user(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  owned integer;
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;
  if p_user_id is null then raise exception 'Invalid request'; end if;
  if p_user_id = auth.uid() or exists (select 1 from public.system_owner where user_id = p_user_id) then
    raise exception 'The system owner cannot be deleted';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then raise exception 'User not found'; end if;
  select count(*) into owned from public.tournaments where owner_user_id = p_user_id;
  delete from auth.users where id = p_user_id;
  perform public._log_system_event('user_deleted', 'user', p_user_id::text, auth.uid(), jsonb_build_object('ownedTournaments', owned));
  return jsonb_build_object('id', p_user_id, 'deleted', true, 'ownedTournaments', owned);
end
$function$;

-- admin_list_users now also says whether an account is blocked.
create or replace function public.admin_list_users(
  p_search text default null,
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  lim integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  off integer := greatest(coalesce(p_offset, 0), 0);
  pattern text := public._admin_like(nullif(trim(coalesce(p_search, '')), ''));
  has_search boolean := nullif(trim(coalesce(p_search, '')), '') is not null;
  total bigint;
  result jsonb;
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;

  select count(*) into total from auth.users u where not has_search or coalesce(u.email, '') ilike pattern;

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb) into result
  from (
    select u.id,
           u.email,
           (u.email_confirmed_at is not null) as email_confirmed,
           (u.banned_until is not null and u.banned_until > now()) as blocked,
           u.created_at,
           u.last_sign_in_at,
           (select count(*) from public.tournaments t where t.owner_user_id = u.id) as owned_tournaments,
           (select count(*) from public.tournament_account_players p where p.user_id = u.id) as played_tournaments,
           (select count(*) from public.account_tournament_statistics s where s.user_id = u.id) as finished_tournaments,
           exists (select 1 from public.system_owner o where o.user_id = u.id) as is_system_owner
    from auth.users u
    where not has_search or coalesce(u.email, '') ilike pattern
    order by u.created_at desc
    limit lim offset off
  ) x;

  return jsonb_build_object('total', total, 'limit', lim, 'offset', off, 'rows', result);
end
$function$;

-- Log entries older than 90 days are removed every night.
create or replace function public.cleanup_system_log()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  removed integer;
begin
  delete from public.system_log where at < now() - interval '90 days';
  get diagnostics removed = row_count;
  return removed;
end
$function$;
revoke execute on function public.cleanup_system_log() from public, anon, authenticated;

do $schedule$
begin
  if to_regnamespace('cron') is not null then
    begin
      perform cron.unschedule('padelstar-log-cleanup');
    exception when others then null;
    end;
    perform cron.schedule('padelstar-log-cleanup', '40 3 * * *', 'select public.cleanup_system_log()');
  end if;
end
$schedule$;

revoke execute on function public.admin_list_log(text, integer, integer) from public, anon;
revoke execute on function public.admin_block_user(uuid, boolean) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_list_log(text, integer, integer) to authenticated;
grant execute on function public.admin_block_user(uuid, boolean) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;
