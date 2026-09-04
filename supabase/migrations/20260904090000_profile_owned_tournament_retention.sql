-- Permanent tournament storage belongs to the creator's local player profile.
-- A tournament without owner_profile_id is temporary and expires after seven days.
alter table public.tournaments
  add column if not exists owner_profile_id text;

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
  next_owner_profile_id text := nullif(trim(p_state->>'ownerProfileId'), '');
begin
  if next_id is null or next_invite_code is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid tournament payload';
  end if;

  saved_state := p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision';
  saved_state := jsonb_set(saved_state, '{revision}', '0'::jsonb, true);

  insert into public.tournaments (id, invite_code, admin_token, state, revision, owner_user_id, claimed_at, owner_profile_id, retention_expires_at)
  values (next_id, next_invite_code, p_admin_token, saved_state, 0, auth.uid(), case when auth.uid() is null then null else now() end,
    next_owner_profile_id, case when next_owner_profile_id is null then now() + interval '7 days' else null end)
  on conflict (id) do update
  set invite_code = excluded.invite_code,
      admin_token = excluded.admin_token,
      state = excluded.state,
      revision = 0,
      owner_user_id = coalesce(public.tournaments.owner_user_id, excluded.owner_user_id),
      claimed_at = coalesce(public.tournaments.claimed_at, excluded.claimed_at),
      owner_profile_id = coalesce(public.tournaments.owner_profile_id, excluded.owner_profile_id),
      retention_expires_at = case when coalesce(public.tournaments.owner_profile_id, excluded.owner_profile_id) is null then coalesce(public.tournaments.retention_expires_at, excluded.retention_expires_at) else null end;

  return saved_state;
end;
$$;

create or replace function public.save_tournament_state_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_state jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  saved_state jsonb;
  next_owner_profile_id text;
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16 or p_state is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid tournament state payload';
  end if;
  saved_state := public.sanitize_ended_tournament_state(p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision');
  next_owner_profile_id := nullif(trim(saved_state->>'ownerProfileId'), '');
  update public.tournaments as t
  set state = jsonb_set(saved_state, '{revision}', to_jsonb(t.revision + 1), true),
      revision = t.revision + 1,
      invite_code = upper(saved_state->>'inviteCode'),
      owner_profile_id = coalesce(t.owner_profile_id, next_owner_profile_id),
      retention_expires_at = case when coalesce(t.owner_profile_id, next_owner_profile_id) is null then coalesce(t.retention_expires_at, now() + interval '7 days') else null end
  where t.id = p_tournament_id and t.admin_token = p_admin_token and t.revision = p_expected_revision
  returning t.state into saved_state;
  if saved_state is null then raise exception 'Tournament state changed or not found'; end if;
  return saved_state;
end;
$$;

create or replace function public.cleanup_expired_tournaments(p_retention_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare deleted_tournaments integer;
begin
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'Invalid retention window';
  end if;
  delete from public.tournaments
  where owner_profile_id is null
    and coalesce(retention_expires_at, created_at + make_interval(days => p_retention_days)) <= now();
  get diagnostics deleted_tournaments = row_count;
  delete from public.api_rate_limits where updated_at < now() - interval '1 day';
  return deleted_tournaments;
end;
$$;

revoke all on function public.cleanup_expired_tournaments(integer) from public, anon, authenticated;
