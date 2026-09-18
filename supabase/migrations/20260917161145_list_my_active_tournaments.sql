-- Add: let a signed-in user's profile screen list their own currently-active
-- tournaments (distinct from account_tournament_statistics, which only holds
-- finished tournaments written by finalize_tournament). The tournaments table
-- has row-level security enabled with no policies (deny-all for direct
-- selects), matching this app's established pattern of RPC-gated access to
-- the full tournament blob rather than table-level RLS policies -- so this
-- needs a SECURITY DEFINER function reading auth.uid() internally, never a
-- client-supplied user id, the same way every other identity-sensitive read
-- in this schema works.
create or replace function public.list_my_active_tournaments()
 returns jsonb
 language sql
 security definer
 set search_path to 'public'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'name', t.state->>'name',
    'inviteCode', t.invite_code,
    'status', t.state->>'status',
    'playerCount', jsonb_array_length(coalesce(t.state->'players', '[]'::jsonb)),
    'roundCount', jsonb_array_length(coalesce(t.state->'rounds', '[]'::jsonb)),
    'updatedAt', t.updated_at
  ) order by t.updated_at desc), '[]'::jsonb)
  from public.tournaments t
  where t.owner_user_id = auth.uid()
    and t.state->>'status' <> 'Avsluttet';
$function$;

grant execute on function public.list_my_active_tournaments() to authenticated;
