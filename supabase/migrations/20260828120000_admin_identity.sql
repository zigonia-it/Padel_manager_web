alter table public.tournaments
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz;

create index if not exists tournaments_owner_user_id_idx
  on public.tournaments (owner_user_id)
  where owner_user_id is not null;

create or replace function public.claim_tournament(
  p_tournament_id uuid,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  claimed public.tournaments;
begin
  if auth.uid() is null or p_tournament_id is null or p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Authentication required';
  end if;

  update public.tournaments
  set owner_user_id = auth.uid(), claimed_at = coalesce(claimed_at, now())
  where id = p_tournament_id
    and admin_token = p_admin_token
    and (owner_user_id is null or owner_user_id = auth.uid())
  returning id, owner_user_id, claimed_at into claimed;

  if claimed.id is null then
    raise exception 'Tournament claim denied';
  end if;

  return jsonb_build_object('id', claimed.id, 'ownerUserId', claimed.owner_user_id, 'claimedAt', claimed.claimed_at);
end;
$$;

revoke all on function public.claim_tournament(uuid, text) from public, anon;
grant execute on function public.claim_tournament(uuid, text) to authenticated;
