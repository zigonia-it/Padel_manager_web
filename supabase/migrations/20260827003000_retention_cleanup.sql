-- Internal retention job. Run this from trusted database maintenance only.
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
    and updated_at < now() - make_interval(days => p_retention_days);

  get diagnostics deleted_tournaments = row_count;

  delete from public.api_rate_limits
  where updated_at < now() - interval '1 day';

  return deleted_tournaments;
end;
$$;

revoke all on function public.cleanup_expired_tournaments(integer) from public, anon, authenticated;
