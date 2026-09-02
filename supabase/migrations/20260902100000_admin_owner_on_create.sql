alter table public.tournaments
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

create or replace function public.create_tournament_impl(
  p_state jsonb,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  next_id uuid := (p_state->>'id')::uuid;
  next_invite_code text := upper(p_state->>'inviteCode');
  saved_state jsonb;
begin
  if next_id is null or next_invite_code is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid tournament payload';
  end if;

  saved_state := p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision';
  saved_state := jsonb_set(saved_state, '{revision}', '0'::jsonb, true);

  insert into public.tournaments (id, invite_code, admin_token, state, revision, owner_user_id, claimed_at)
  values (next_id, next_invite_code, p_admin_token, saved_state, 0, auth.uid(), case when auth.uid() is null then null else now() end)
  on conflict (id) do update
  set invite_code = excluded.invite_code,
      admin_token = excluded.admin_token,
      state = excluded.state,
      revision = 0,
      owner_user_id = coalesce(public.tournaments.owner_user_id, excluded.owner_user_id),
      claimed_at = coalesce(public.tournaments.claimed_at, excluded.claimed_at);

  return saved_state;
end;
$$;

revoke all on function public.create_tournament_impl(jsonb, text) from public, anon, authenticated;
