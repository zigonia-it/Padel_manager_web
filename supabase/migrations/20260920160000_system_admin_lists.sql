-- System owner administration, part 2: searchable tournament and account lists and the state of the cleanup jobs.
-- Read-only. Every function first checks is_system_owner() (auth.uid() against the protected system_owner row); none is
-- executable by anon. No tokens, invite codes or password data are ever returned. Account e-mail addresses are personal data
-- and are returned only to the system owner, who is the operator of the service.

-- A search term is matched literally: %, _ and \ are escaped.
create or replace function public._admin_like(p_term text)
returns text
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
  select '%' || replace(replace(replace(coalesce(p_term, ''), '\', '\\'), '%', '\%'), '_', '\_') || '%';
$function$;

create or replace function public.admin_list_tournaments(
  p_search text default null,
  p_status text default 'all',
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
  status_filter text := case when p_status in ('running', 'finished', 'expired') then p_status else 'all' end;
  pattern text := public._admin_like(nullif(trim(coalesce(p_search, '')), ''));
  has_search boolean := nullif(trim(coalesce(p_search, '')), '') is not null;
  total bigint;
  result jsonb;
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;

  select count(*) into total
  from public.tournaments t
  where (not has_search or coalesce(t.state->>'name', '') ilike pattern)
    and (status_filter = 'all'
      or (status_filter = 'finished' and t.state->>'status' = 'Avsluttet')
      or (status_filter = 'expired' and t.expired_at is not null)
      or (status_filter = 'running' and coalesce(t.state->>'status', '') <> 'Avsluttet' and t.expired_at is null));

  select coalesce(jsonb_agg(row_to_json(x)::jsonb order by x.created_at desc), '[]'::jsonb) into result
  from (
    select t.id,
           t.state->>'name' as name,
           t.state->>'status' as status,
           t.state->'settings'->>'format' as format,
           jsonb_array_length(coalesce(t.state->'players', '[]'::jsonb)) as players,
           jsonb_array_length(coalesce(t.state->'rounds', '[]'::jsonb)) as rounds,
           (t.owner_user_id is not null) as account_owned,
           t.expired_at,
           t.retention_expires_at,
           t.created_at,
           t.updated_at
    from public.tournaments t
    where (not has_search or coalesce(t.state->>'name', '') ilike pattern)
      and (status_filter = 'all'
        or (status_filter = 'finished' and t.state->>'status' = 'Avsluttet')
        or (status_filter = 'expired' and t.expired_at is not null)
        or (status_filter = 'running' and coalesce(t.state->>'status', '') <> 'Avsluttet' and t.expired_at is null))
    order by t.created_at desc
    limit lim offset off
  ) x;

  return jsonb_build_object('total', total, 'limit', lim, 'offset', off, 'rows', result);
end
$function$;

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

-- The scheduled cleanup jobs (pg_cron) with their last run, and how much is waiting for the next cleanup.
create or replace function public.admin_maintenance_status()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  jobs jsonb := '[]'::jsonb;
begin
  if not public.is_system_owner() then
    raise exception 'Not authorized';
  end if;

  if to_regclass('cron.job') is not null and to_regclass('cron.job_run_details') is not null then
    execute $q$
      select coalesce(jsonb_agg(jsonb_build_object(
        'name', j.jobname,
        'schedule', j.schedule,
        'active', j.active,
        'lastRun', (select jsonb_build_object('status', d.status, 'startedAt', d.start_time, 'endedAt', d.end_time)
                    from cron.job_run_details d where d.jobid = j.jobid order by d.start_time desc limit 1)
      ) order by j.jobname), '[]'::jsonb)
      from cron.job j
    $q$ into jobs;
  end if;

  return jsonb_build_object(
    'generatedAt', now(),
    'jobs', jobs,
    'waiting', jsonb_build_object(
      'expired', (select count(*) from public.tournaments where expired_at is not null),
      'expiredDeletionDue', (select count(*) from public.tournaments where expired_at is not null and expired_at < now() - interval '7 days'),
      'finishedRetentionDue', (select count(*) from public.tournaments where retention_expires_at is not null and retention_expires_at < now()),
      'idleOver30Days', (select count(*) from public.tournaments where expired_at is null and coalesce(state->>'status', '') <> 'Avsluttet' and updated_at < now() - interval '30 days'),
      'profileDeletionDue', (select count(*) from public.player_profiles where deletion_scheduled_for is not null and deletion_scheduled_for < now())
    )
  );
end
$function$;

revoke execute on function public._admin_like(text) from public, anon, authenticated;
revoke execute on function public.admin_list_tournaments(text, text, integer, integer) from public, anon;
revoke execute on function public.admin_list_users(text, integer, integer) from public, anon;
revoke execute on function public.admin_maintenance_status() from public, anon;
grant execute on function public.admin_list_tournaments(text, text, integer, integer) to authenticated;
grant execute on function public.admin_list_users(text, integer, integer) to authenticated;
grant execute on function public.admin_maintenance_status() to authenticated;
