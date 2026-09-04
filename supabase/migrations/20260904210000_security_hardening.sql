-- Security hardening for the current public RPC boundaries.

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
  trusted_owner_profile_id text := case when auth.uid() is null then null else auth.uid()::text end;
begin
  if next_id is null or next_invite_code is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid tournament payload';
  end if;
  if exists (select 1 from public.tournaments where id = next_id) then
    raise exception 'Tournament already exists';
  end if;

  saved_state := p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision' - 'ownerProfileId';
  saved_state := jsonb_set(saved_state, '{revision}', '0'::jsonb, true);

  insert into public.tournaments (id, invite_code, admin_token, state, revision, owner_user_id, claimed_at, owner_profile_id, retention_expires_at)
  values (next_id, next_invite_code, p_admin_token, saved_state, 0, auth.uid(), case when auth.uid() is null then null else now() end,
    trusted_owner_profile_id, case when trusted_owner_profile_id is null then now() + interval '7 days' else null end);
  return saved_state;
end;
$$;

-- Anonymous joins may create a new guest, but may not mint a fresh token for an
-- existing player merely by knowing the invite code and display name.
create or replace function public.join_tournament(
  p_invite_code text,
  p_player jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  existing_player jsonb;
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$'
    or p_player is null
    or jsonb_typeof(p_player) <> 'object'
    or length(trim(coalesce(p_player->>'name', ''))) not between 1 and 64 then
    raise exception 'Invalid player payload';
  end if;
  if not public.consume_api_rate_limit('join:' || upper(trim(p_invite_code)), 30, 600) then
    raise exception 'Rate limit exceeded';
  end if;
  if auth.uid() is null then
    select value into existing_player
    from public.tournaments t, jsonb_array_elements(coalesce(t.state->'players', '[]'::jsonb)) value
    where t.invite_code = upper(trim(p_invite_code))
      and lower(value->>'name') = lower(trim(p_player->>'name'))
    limit 1;
    if existing_player is not null then
      raise exception 'Player name already joined; sign in to rejoin';
    end if;
  end if;
  return public.join_tournament_authenticated_impl(p_invite_code, p_player);
end;
$$;

-- The spectator RPC is the only public read contract. Remove the broad table
-- read policy that bypassed its whitelist.
drop policy if exists "Public can read tournament states for realtime" on public.tournaments;
revoke select on public.tournaments from public, anon, authenticated;

-- A push endpoint is an external destination, so only HTTPS Web Push endpoints
-- are accepted and each player is capped to a small bounded subscription set.
create or replace function public.upsert_push_subscription(uuid, text, uuid, text, jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
declare next_endpoint text := trim(coalesce($5->>'endpoint', ''));
begin
  if $1 is null or $3 is null or $4 is null or length(trim($4)) < 32 or $5 is null
    or jsonb_typeof($5) <> 'object' or next_endpoint !~ '^https://' or length(next_endpoint) > 2048
    or $5->'keys' is null then raise exception 'Invalid push subscription payload'; end if;
  if (select count(*) from public.push_subscriptions where tournament_id = $1 and player_id = $3) >= 5
    and not exists (select 1 from public.push_subscriptions where tournament_id = $1 and player_id = $3 and endpoint = next_endpoint) then
    raise exception 'Too many push subscriptions';
  end if;
  if not exists (select 1 from public.player_sessions where tournament_id = $1 and player_id = $3 and token_hash = encode(extensions.digest(trim($4), 'sha256'), 'hex'))
    or not exists (select 1 from public.tournaments where id = $1 and invite_code = upper(trim($2))) then raise exception 'Player session mismatch'; end if;
  insert into public.push_subscriptions (tournament_id, player_id, endpoint, subscription) values ($1, $3, next_endpoint, $5)
  on conflict (endpoint) do update set tournament_id = excluded.tournament_id, player_id = excluded.player_id, subscription = excluded.subscription, updated_at = now();
  return true;
end; $$;
