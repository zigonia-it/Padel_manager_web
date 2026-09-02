-- Do not remove ended tournaments until every registered player profile in
-- the retained state has received its statistics in profile history.
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

  delete from public.tournaments as t
  where t.state->>'status' = 'Avsluttet'
    and coalesce(t.retention_expires_at, t.updated_at + make_interval(days => p_retention_days)) <= now()
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(t.state->'players', '[]'::jsonb)) as player
      where player->>'profileId' is not null
        and not exists (
          select 1
          from public.player_profile_history as history
          where history.profile_id::text = player->>'profileId'
            and history.tournament_id = t.id
        )
    );

  get diagnostics deleted_tournaments = row_count;
  delete from public.api_rate_limits where updated_at < now() - interval '1 day';
  return deleted_tournaments;
end;
$$;

revoke all on function public.cleanup_expired_tournaments(integer) from public, anon, authenticated;
