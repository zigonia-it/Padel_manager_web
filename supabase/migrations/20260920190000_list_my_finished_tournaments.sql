-- The signed-in owner's finished tournaments (newest 20), so one can be opened again on any device to correct a result
-- (corrections after the tournament is finished, 20260920180000). Reads auth.uid() internally; never a client-supplied id.
create or replace function public.list_my_finished_tournaments()
 returns jsonb
 language sql
 stable
 security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(x.j order by x.ended desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', t.id,
      'name', t.state->>'name',
      'inviteCode', t.invite_code,
      'status', t.state->>'status',
      'playerCount', jsonb_array_length(coalesce(t.state->'players', '[]'::jsonb)),
      'roundCount', jsonb_array_length(coalesce(t.state->'rounds', '[]'::jsonb)),
      'endedAt', coalesce(t.ended_at, t.updated_at)
    ) as j, coalesce(t.ended_at, t.updated_at) as ended
    from public.tournaments t
    where t.owner_user_id = auth.uid()
      and t.state->>'status' = 'Avsluttet'
      and coalesce(t.state->>'lifecycleStatus', 'completed') <> 'cancelled'
    order by coalesce(t.ended_at, t.updated_at) desc
    limit 20
  ) x;
$function$;

revoke all on function public.list_my_finished_tournaments() from public, anon;
grant execute on function public.list_my_finished_tournaments() to authenticated;
