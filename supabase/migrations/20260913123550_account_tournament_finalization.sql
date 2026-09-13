-- Account statistics survive tournament deletion. Account bindings are separate
-- from client-writable JSON; only authenticated join/create may establish them.
create table public.tournament_account_players (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (tournament_id, player_id),
  unique (tournament_id, user_id)
);
create table public.account_tournament_statistics (
  user_id uuid not null references auth.users(id) on delete cascade,
  tournament_id uuid not null, -- deliberately NO tournament FK
  ended_at timestamptz not null,
  outcome text not null check (outcome in ('completed', 'cancelled')),
  matches integer not null check (matches >= 0),
  wins integer not null check (wins >= 0 and wins <= matches),
  sets integer not null check (sets >= 0),
  games integer not null check (games >= 0),
  primary key (user_id, tournament_id)
);
create table public.tournament_finalization_receipts (
  tournament_id uuid primary key,
  admin_token_hash text not null,
  outcome text not null check (outcome in ('completed', 'cancelled')),
  revision integer not null,
  deleted boolean not null,
  finalized_at timestamptz not null default now()
);
alter table public.tournament_account_players enable row level security;
alter table public.account_tournament_statistics enable row level security;
alter table public.tournament_finalization_receipts enable row level security;
revoke all on public.tournament_account_players, public.account_tournament_statistics,
  public.tournament_finalization_receipts from public, anon, authenticated;
grant select on public.account_tournament_statistics to authenticated;
create policy account_statistics_read_own on public.account_tournament_statistics
  for select to authenticated using (user_id = auth.uid());

-- Do not backfill account bindings from client-submitted userId/profileId JSON.
-- Existing account players must authenticate and reclaim their own session.
create or replace function public.join_tournament_authenticated_impl(p_invite_code text, p_player jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  tid uuid; current_state jsonb; existing_player jsonb; result jsonb;
  uid uuid := auth.uid(); pid uuid;
begin
  select id, state into tid, current_state from public.tournaments
    where invite_code = upper(trim(p_invite_code)) for update;
  if tid is null or current_state->>'status' = 'Avsluttet' then raise exception 'Tournament not active'; end if;
  select value into existing_player from jsonb_array_elements(coalesce(current_state->'players', '[]'))
    where lower(value->>'name') = lower(trim(p_player->>'name')) limit 1;
  if existing_player is not null and not exists (
    select 1 from public.tournament_account_players
    where tournament_id = tid and player_id = (existing_player->>'id')::uuid and user_id = uid
  ) then raise exception 'Player name belongs to another session'; end if;
  if uid is not null and exists (select 1 from public.tournament_account_players
    where tournament_id = tid and user_id = uid and player_id <> coalesce((existing_player->>'id')::uuid, gen_random_uuid()))
    then raise exception 'Account already joined'; end if;
  result := public.join_tournament_impl(p_invite_code, p_player - 'userId' - 'profileId');
  pid := (result->>'playerId')::uuid;
  if uid is not null then
    insert into public.tournament_account_players values (tid, pid, uid) on conflict do nothing;
  end if;
  update public.tournaments t set state = jsonb_set(t.state, '{players}', (
    select jsonb_agg(case when value->>'id' = pid::text then
      (value - 'userId' - 'profileId') || jsonb_build_object('userId', uid, 'guest', uid is null)
      else value end) from jsonb_array_elements(t.state->'players')
  )) where id = tid returning state into current_state;
  return jsonb_set(result, '{state}', current_state);
end $$;
revoke all on function public.join_tournament_authenticated_impl(text, jsonb) from public, anon, authenticated;

create or replace function public.finalize_tournament(
  p_tournament_id uuid, p_admin_token text, p_expected_revision integer,
  p_outcome text default 'completed'
) returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  t public.tournaments; receipt public.tournament_finalization_receipts;
  binding record; m jsonb; s jsonb; terminal jsonb; round_value jsonb;
  updated_rounds jsonb := '[]'; updated_matches jsonb;
  side integer; n_matches integer; n_wins integer; n_sets integer; n_games integer;
  token_hash text; terminal_time timestamptz := now();
begin
  if p_tournament_id is null or length(coalesce(p_admin_token, '')) < 16
    or p_expected_revision is null or p_expected_revision < 0
    or p_outcome is null or p_outcome not in ('completed', 'cancelled') then
    raise exception 'Invalid finalization payload';
  end if;
  token_hash := encode(extensions.digest(p_admin_token, 'sha256'), 'hex');
  -- Serializes retries including those arriving after the tournament is deleted.
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));
  select * into receipt from public.tournament_finalization_receipts where tournament_id = p_tournament_id;
  if found then
    if receipt.admin_token_hash <> token_hash then raise exception 'Admin token mismatch'; end if;
    select state into terminal from public.tournaments where id = p_tournament_id;
    return jsonb_build_object('id', p_tournament_id, 'outcome', receipt.outcome,
      'deleted', receipt.deleted, 'statisticsSaved', true, 'revision', receipt.revision, 'state', terminal);
  end if;
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.admin_token <> p_admin_token then raise exception 'Admin token mismatch or tournament not found'; end if;
  if t.revision <> p_expected_revision then raise exception 'Tournament state changed'; end if;

  -- Derive all account statistics from the same locked final snapshot. Any
  -- invalid data or write failure aborts this transaction, including deletion.
  for binding in select * from public.tournament_account_players where tournament_id = t.id loop
    n_matches := 0; n_wins := 0; n_sets := 0; n_games := 0;
    for m in select match_value from jsonb_array_elements(coalesce(t.state->'rounds', '[]')) r,
      lateral jsonb_array_elements(coalesce(r->'matches', '[]')) match_value loop
      if m->>'state' <> 'finished' then continue; end if;
      side := null;
      if exists(select 1 from jsonb_array_elements(coalesce(m#>'{teamOne,players}', '[]')) p where p->>'id' = binding.player_id::text) then side := 0;
      elsif exists(select 1 from jsonb_array_elements(coalesce(m#>'{teamTwo,players}', '[]')) p where p->>'id' = binding.player_id::text) then side := 1;
      end if;
      if side is null then continue; end if;
      n_matches := n_matches + 1;
      if (m->>'winnerTeamIndex')::integer = side then n_wins := n_wins + 1; end if;
      for s in select value from jsonb_array_elements(coalesce(m->'completedSets', '[]')) loop
        if (s->>'teamOne')::integer < 0 or (s->>'teamTwo')::integer < 0 then raise exception 'Invalid set score'; end if;
        if side = 0 then
          n_games := n_games + (s->>'teamOne')::integer;
          if (s->>'teamOne')::integer > (s->>'teamTwo')::integer then n_sets := n_sets + 1; end if;
        else
          n_games := n_games + (s->>'teamTwo')::integer;
          if (s->>'teamTwo')::integer > (s->>'teamOne')::integer then n_sets := n_sets + 1; end if;
        end if;
      end loop;
    end loop;
    insert into public.account_tournament_statistics values
      (binding.user_id, t.id, terminal_time, p_outcome, n_matches, n_wins, n_sets, n_games);
  end loop;

  for round_value in select value from jsonb_array_elements(coalesce(t.state->'rounds', '[]')) loop
    select coalesce(jsonb_agg(case when value->>'state' = 'finished' then value else
      value || '{"state":"cancelled","status":"cancelled"}'::jsonb end), '[]') into updated_matches
      from jsonb_array_elements(coalesce(round_value->'matches', '[]'));
    updated_rounds := updated_rounds || jsonb_build_array(round_value || jsonb_build_object('status', 'completed', 'matches', updated_matches));
  end loop;
  terminal := (t.state - 'adminToken' - 'playerToken' - 'selectedPlayerId') || jsonb_build_object(
    'status', 'Avsluttet', 'lifecycleStatus', p_outcome, 'endedAt', terminal_time,
    'ownerUserId', t.owner_user_id, 'revision', t.revision + 1, 'rounds', updated_rounds);
  insert into public.tournament_finalization_receipts values
    (t.id, token_hash, p_outcome, t.revision + 1, t.owner_user_id is null, terminal_time);
  if t.owner_user_id is null then
    delete from public.tournaments where id = t.id;
    terminal := null;
  else
    update public.tournaments set state = terminal, revision = t.revision + 1,
      ended_at = terminal_time, retention_expires_at = null where id = t.id;
  end if;
  return jsonb_build_object('id', t.id, 'outcome', p_outcome, 'deleted', t.owner_user_id is null,
    'statisticsSaved', true, 'revision', t.revision + 1, 'state', terminal);
end $$;
revoke all on function public.finalize_tournament(uuid, text, integer, text) from public;
grant execute on function public.finalize_tournament(uuid, text, integer, text) to anon, authenticated;

-- Deletion may only follow the statistics transaction, including legacy callers.
create or replace function public.guard_tournament_history_deletion()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not exists (select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then
    raise exception 'Finalize tournament statistics before deletion';
  end if;
  return old;
end $$;
revoke all on function public.guard_tournament_history_deletion() from public, anon, authenticated;
create trigger tournament_history_before_delete before delete on public.tournaments
  for each row execute function public.guard_tournament_history_deletion();

create or replace function public.cleanup_expired_tournaments(p_retention_days integer default 7)
returns integer language plpgsql security definer set search_path = public, pg_catalog as $$
declare n integer;
begin
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then raise exception 'Invalid retention window'; end if;
  delete from public.tournaments t where t.owner_user_id is null and t.state->>'status' = 'Avsluttet'
    and exists (select 1 from public.tournament_finalization_receipts r where r.tournament_id = t.id);
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.cleanup_expired_tournaments(integer) from public, anon, authenticated;

-- Rejoining an existing guest/session as an account requires possession of its
-- server-issued token, never merely a matching name or client profile ID.
create or replace function public.claim_player_account(
  p_tournament_id uuid, p_player_id uuid, p_player_token text
) returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
declare uid uuid := auth.uid(); current_state jsonb; bound_user uuid;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  select state into current_state from public.tournaments where id = p_tournament_id for update;
  if current_state is null or current_state->>'status' = 'Avsluttet' then raise exception 'Tournament not active'; end if;
  if not exists (select 1 from public.player_sessions where tournament_id = p_tournament_id
    and player_id = p_player_id and token_hash = encode(extensions.digest(p_player_token, 'sha256'), 'hex')) then
    raise exception 'Player session mismatch';
  end if;
  select user_id into bound_user from public.tournament_account_players
    where tournament_id = p_tournament_id and player_id = p_player_id;
  if bound_user is not null and bound_user <> uid then raise exception 'Player belongs to another account'; end if;
  insert into public.tournament_account_players values (p_tournament_id, p_player_id, uid) on conflict do nothing;
  return true;
end $$;
revoke all on function public.claim_player_account(uuid, uuid, text) from public, anon;
grant execute on function public.claim_player_account(uuid, uuid, text) to authenticated;

-- Preserve the existing creation validation and bind only the creator's selected
-- admin-player to the verified auth identity. A local profile is not ownership.
alter function public.create_tournament_impl(jsonb, text) rename to create_tournament_before_account_lifecycle;
revoke all on function public.create_tournament_before_account_lifecycle(jsonb, text) from public, anon, authenticated;
create function public.create_tournament_impl(p_state jsonb, p_admin_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare result jsonb; uid uuid := auth.uid(); admin_player jsonb;
begin
  result := public.create_tournament_before_account_lifecycle(p_state - 'ownerUserId' - 'ownerProfileId', p_admin_token);
  update public.tournaments set owner_user_id = uid, owner_profile_id = uid::text,
    retention_expires_at = null,
    state = state || jsonb_build_object('ownerUserId', uid, 'ownershipType', case when uid is null then 'guest' else 'account' end,
      'persistenceType', case when uid is null then 'temporary' else 'permanent' end)
    where id = (result->>'id')::uuid returning state into result;
  if uid is not null then
    select value into admin_player from jsonb_array_elements(coalesce(p_state->'players', '[]'))
      where value->>'joinedFrom' = 'admin-self' and value->>'participantType' = 'admin-player' limit 1;
    if admin_player is not null then
      insert into public.tournament_account_players values ((result->>'id')::uuid, (admin_player->>'id')::uuid, uid);
    end if;
  end if;
  return result;
end $$;
revoke all on function public.create_tournament_impl(jsonb, text) from public, anon, authenticated;

-- Legacy state saves must not sanitize finished matches before finalization.
-- A terminal tournament cannot be reopened or scored by an outdated client.
create function public.guard_tournament_finalization_update()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if old.state->>'status' = 'Avsluttet' and new.state is distinct from old.state then
    raise exception 'Finalized tournament is read-only';
  end if;
  if new.state->>'status' = 'Avsluttet' and old.state->>'status' is distinct from 'Avsluttet'
    and not exists(select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then
    raise exception 'Use finalize_tournament to save statistics before completion';
  end if;
  return new;
end $$;
revoke all on function public.guard_tournament_finalization_update() from public, anon, authenticated;
create trigger tournament_finalization_before_update before update on public.tournaments
  for each row execute function public.guard_tournament_finalization_update();

-- Authenticated players/admins use the same token/revision guarded public RPCs.
-- Signing in must not remove permissions previously available to guests.
grant execute on function public.create_tournament(jsonb, text) to authenticated;
grant execute on function public.get_tournament_by_code(text) to authenticated;
grant execute on function public.get_spectator_tournament_by_code(text) to authenticated;
grant execute on function public.save_tournament_state(uuid, text, jsonb, integer) to authenticated;
grant execute on function public.save_player_point(uuid, text, uuid, uuid, integer, text) to authenticated;
