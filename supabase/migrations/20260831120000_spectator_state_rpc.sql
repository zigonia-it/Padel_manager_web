-- Public spectator reads use an explicit whitelist instead of exposing the
-- complete join/admin payload. The underlying implementation remains private.
create or replace function public.get_spectator_tournament_by_code(
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  tournament_state jsonb;
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid invite code';
  end if;

  if not public.consume_api_rate_limit('spectator:' || upper(trim(p_invite_code)), 60, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  select jsonb_build_object(
    'id', t.id,
    'name', t.state->'name',
    'inviteCode', t.state->'inviteCode',
    'status', t.state->'status',
    'currentRound', t.state->'currentRound',
    'settings', t.state->'settings',
    'courts', t.state->'courts',
    'players', t.state->'players',
    'rounds', t.state->'rounds',
    'cup', t.state->'cup',
    'revision', to_jsonb(t.revision)
  )
  into tournament_state
  from public.tournaments as t
  where t.invite_code = upper(trim(p_invite_code))
  limit 1;

  return tournament_state;
end;
$$;

revoke all on function public.get_spectator_tournament_by_code(text) from public, anon, authenticated;
grant execute on function public.get_spectator_tournament_by_code(text) to anon;
