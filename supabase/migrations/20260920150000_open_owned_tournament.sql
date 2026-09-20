-- Let a signed-in owner resume their own tournament as admin from any device.
-- The admin token is stored only on the device that created the tournament; until now a second device had no way
-- to get it, so "Mine aktive turneringer" could list a tournament but not open it. Ownership is decided by the
-- database (tournaments.owner_user_id = auth.uid()), never by anything the client sends.
create or replace function public.open_owned_tournament(p_tournament_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  t public.tournaments;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_tournament_id is null then
    raise exception 'Tournament not found';
  end if;
  if not public.consume_api_rate_limit('own:' || auth.uid()::text, 30, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  select * into t from public.tournaments where id = p_tournament_id and owner_user_id = auth.uid();
  if t.id is null then
    -- Same answer for "does not exist" and "belongs to someone else".
    raise exception 'Tournament not found';
  end if;

  return jsonb_build_object(
    'state', jsonb_set(t.state, '{revision}', to_jsonb(t.revision), true),
    'adminToken', t.admin_token
  );
end;
$$;

revoke all on function public.open_owned_tournament(uuid) from public, anon;
grant execute on function public.open_owned_tournament(uuid) to authenticated;
