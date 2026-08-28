alter table public.tournaments
  add column if not exists ended_at timestamptz,
  add column if not exists retention_expires_at timestamptz;

create or replace function public.set_tournament_lifecycle_dates()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  if coalesce(old.state->>'status', '') <> 'Avsluttet'
    and coalesce(new.state->>'status', '') = 'Avsluttet' then
    new.ended_at = coalesce(new.ended_at, now());
    new.retention_expires_at = coalesce(new.retention_expires_at, new.ended_at + interval '30 days');
  end if;
  return new;
end;
$$;

drop trigger if exists tournaments_lifecycle_dates on public.tournaments;
create trigger tournaments_lifecycle_dates
before update on public.tournaments
for each row
execute function public.set_tournament_lifecycle_dates();

update public.tournaments
set ended_at = coalesce(ended_at, updated_at),
    retention_expires_at = coalesce(retention_expires_at, updated_at + interval '30 days')
where state->>'status' = 'Avsluttet';

create or replace function public.cleanup_expired_tournaments(
  p_retention_days integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  deleted_tournaments integer;
begin
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'Invalid retention window';
  end if;
  delete from public.tournaments
  where state->>'status' = 'Avsluttet'
    and coalesce(retention_expires_at, updated_at + make_interval(days => p_retention_days)) <= now();
  get diagnostics deleted_tournaments = row_count;
  delete from public.api_rate_limits where updated_at < now() - interval '1 day';
  return deleted_tournaments;
end;
$$;

revoke all on function public.cleanup_expired_tournaments(integer) from public, anon, authenticated;
