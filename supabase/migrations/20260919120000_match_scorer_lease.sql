-- Phase 10: player live scoring with one active scorer per match.
--
-- Approved spec (docs/archive/plans/Padelstar_v1_0_0_plan.md, FASE H):
--   * one active scorer per match, visible to everyone (stored on the match as `scorer`);
--   * the scorer can transfer the role, other participants can request it, the admin can override;
--   * concurrent takeovers are decided by the server (the tournament row is locked, first valid request wins);
--   * after 2 minutes without contact another participant may take over; the old scorer does not get the
--     role back automatically; every change is logged (`scorerLog`);
--   * undo / redo of scored points, undone events stay in the event history (`eventLog`), a new point
--     after an undo drops the redo branch.
--
-- Match JSON additions: scorer {playerId, claimedAt}, scorerRequest {playerId, requestedAt},
-- scorerLog [...], eventLog [...], redoStack [...]. Heartbeats live in their own table so that pure
-- keep-alives never bump the tournament revision (which would break the admin's optimistic saves).
--
-- save_player_point_impl now (a) requires the caller to be the active scorer (the first point on an
-- unclaimed match claims the role), (b) lets the scorer score for both teams, and (c) clears the redo branch.

create table if not exists public.match_scorer_heartbeats (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid not null,
  player_id uuid not null,
  heartbeat_at timestamptz not null default now(),
  primary key (tournament_id, match_id)
);
alter table public.match_scorer_heartbeats enable row level security;
revoke all on public.match_scorer_heartbeats from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Internal helpers (never exposed through the API).
-- ---------------------------------------------------------------------------------------------

create or replace function public._scorer_locate(p_state jsonb, p_match_id uuid, out r_idx integer, out m_idx integer)
language plpgsql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
declare
  ri integer;
  mi integer;
  rounds jsonb := coalesce(p_state->'rounds', '[]'::jsonb);
  matches jsonb;
begin
  r_idx := null;
  m_idx := null;
  for ri in 0..(jsonb_array_length(rounds) - 1) loop
    matches := coalesce(rounds->ri->'matches', '[]'::jsonb);
    for mi in 0..(jsonb_array_length(matches) - 1) loop
      if matches->mi->>'id' = p_match_id::text then
        r_idx := ri;
        m_idx := mi;
        return;
      end if;
    end loop;
  end loop;
end
$function$;

create or replace function public._scorer_match_has_player(p_match jsonb, p_player_id uuid)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
  select exists (
    select 1
    from jsonb_array_elements(
      coalesce(p_match#>'{teamOne,players}', '[]'::jsonb) || coalesce(p_match#>'{teamTwo,players}', '[]'::jsonb)
    ) as player
    where player->>'id' = p_player_id::text
  );
$function$;

-- Appends an entry to a jsonb array field of a match, keeping only the newest p_cap entries.
create or replace function public._scorer_append(p_match jsonb, p_field text, p_entry jsonb, p_cap integer)
returns jsonb
language plpgsql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
declare
  entries jsonb := coalesce(p_match->p_field, '[]'::jsonb) || jsonb_build_array(p_entry);
begin
  while jsonb_array_length(entries) > p_cap loop
    entries := entries - 0;
  end loop;
  return jsonb_set(p_match, array[p_field], entries, true);
end
$function$;

-- Restores a captured undo/redo snapshot onto a match (and the waiting match it may have started).
-- The scorer role, its log and the event log are not part of a score snapshot, so the current values win.
create or replace function public._scorer_restore(
  p_state jsonb,
  p_round_idx integer,
  p_match_idx integer,
  p_snapshot jsonb,
  p_undo_stack jsonb,
  p_redo_stack jsonb
)
returns jsonb
language plpgsql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
declare
  state_out jsonb := p_state;
  round_item jsonb := p_state->'rounds'->p_round_idx;
  matches jsonb := coalesce(p_state->'rounds'->p_round_idx->'matches', '[]'::jsonb);
  current_match jsonb := p_state->'rounds'->p_round_idx->'matches'->p_match_idx;
  restored jsonb;
  next_waiting jsonb;
  next_idx integer;
  existing_next jsonb;
  keep_field text;
begin
  if jsonb_typeof(p_snapshot->'match') <> 'object' then
    raise exception 'Invalid undo state';
  end if;
  restored := (p_snapshot->'match') - 'undoStack' - 'redoStack';
  if restored->>'id' is distinct from current_match->>'id' then
    raise exception 'Invalid undo state';
  end if;

  restored := restored - 'scorer' - 'scorerRequest' - 'scorerLog' - 'eventLog';
  foreach keep_field in array array['scorer', 'scorerRequest', 'scorerLog', 'eventLog'] loop
    if current_match ? keep_field then
      restored := jsonb_set(restored, array[keep_field], current_match->keep_field, true);
    end if;
  end loop;
  restored := jsonb_set(restored, '{undoStack}', p_undo_stack, true);
  restored := jsonb_set(restored, '{redoStack}', p_redo_stack, true);
  matches := jsonb_set(matches, array[p_match_idx::text], restored, false);

  next_waiting := p_snapshot->'nextWaitingMatch';
  if jsonb_typeof(next_waiting) = 'object' then
    select entry.ordinality - 1
    into next_idx
    from jsonb_array_elements(matches) with ordinality as entry(value, ordinality)
    where entry.value->>'id' = next_waiting->>'id'
    limit 1;
    if next_idx is null then
      raise exception 'Undo state no longer matches current round';
    end if;
    existing_next := matches->next_idx;
    if existing_next->>'state' not in ('waiting', 'playing')
      or jsonb_array_length(coalesce(existing_next->'undoStack', '[]'::jsonb)) > 0 then
      raise exception 'Tournament state changed or not found';
    end if;
    matches := jsonb_set(matches, array[next_idx::text], next_waiting, false);
  end if;

  round_item := jsonb_set(round_item, '{matches}', matches, true);
  if p_snapshot->>'roundStatus' is not null then
    round_item := jsonb_set(round_item, '{status}', to_jsonb(p_snapshot->>'roundStatus'), true);
  end if;
  state_out := jsonb_set(state_out, array['rounds', p_round_idx::text], round_item, false);
  if p_snapshot ? 'tournamentStatus' then
    state_out := jsonb_set(state_out, '{status}', p_snapshot->'tournamentStatus', true);
  end if;
  if state_out ? 'cup' and p_snapshot ? 'cupWinnerTeam' then
    state_out := jsonb_set(state_out, '{cup,winnerTeam}', p_snapshot->'cupWinnerTeam', true);
  end if;
  return state_out;
end
$function$;

revoke execute on function public._scorer_locate(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public._scorer_match_has_player(jsonb, uuid) from public, anon, authenticated;
revoke execute on function public._scorer_append(jsonb, text, jsonb, integer) from public, anon, authenticated;
revoke execute on function public._scorer_restore(jsonb, integer, integer, jsonb, jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Scorer actions for players: claim, request, decline, release, transfer, heartbeat, undo, redo.
-- ---------------------------------------------------------------------------------------------

create or replace function public.match_scorer_action_impl(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_player_token text,
  p_action text,
  p_target_player_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  current_revision integer;
  r_idx integer;
  m_idx integer;
  round_item jsonb;
  match_item jsonb;
  scorer jsonb;
  request jsonb;
  heartbeat timestamptz;
  is_scorer boolean;
  target uuid;
  undo_stack jsonb;
  redo_stack jsonb;
  entry jsonb;
  redo_entry jsonb;
  next_idx integer;
  matches jsonb;
  event_type text;
begin
  if p_tournament_id is null or p_invite_code is null or p_player_id is null or p_match_id is null
    or p_player_token is null or length(trim(p_player_token)) < 32
    or p_action is null
    or p_action not in ('claim', 'request', 'decline', 'release', 'transfer', 'heartbeat', 'undo', 'redo') then
    raise exception 'Invalid scorer payload';
  end if;

  if not exists (
    select 1 from public.player_sessions
    where tournament_id = p_tournament_id
      and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player token mismatch';
  end if;

  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id and invite_code = upper(trim(p_invite_code))
  for update;
  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  select l.r_idx, l.m_idx into r_idx, m_idx from public._scorer_locate(current_state, p_match_id) l;
  if r_idx is null then
    raise exception 'Match not found';
  end if;
  round_item := current_state->'rounds'->r_idx;
  match_item := round_item->'matches'->m_idx;

  if not public._scorer_match_has_player(match_item, p_player_id) then
    raise exception 'Player is not part of this match';
  end if;

  scorer := case when jsonb_typeof(match_item->'scorer') = 'object' then match_item->'scorer' else null end;
  request := case when jsonb_typeof(match_item->'scorerRequest') = 'object' then match_item->'scorerRequest' else null end;
  is_scorer := scorer is not null and scorer->>'playerId' = p_player_id::text;
  select h.heartbeat_at into heartbeat
  from public.match_scorer_heartbeats h
  where h.tournament_id = p_tournament_id and h.match_id = p_match_id;

  if p_action = 'heartbeat' then
    if not is_scorer then
      raise exception 'Not the active scorer';
    end if;
    insert into public.match_scorer_heartbeats (tournament_id, match_id, player_id, heartbeat_at)
    values (p_tournament_id, p_match_id, p_player_id, now())
    on conflict (tournament_id, match_id) do update set player_id = excluded.player_id, heartbeat_at = excluded.heartbeat_at;
    return current_state;
  end if;

  if p_action = 'claim' then
    if match_item->>'state' <> 'playing' then
      raise exception 'Match is not currently playing';
    end if;
    if scorer is not null and not is_scorer then
      if heartbeat is not null and heartbeat > now() - interval '2 minutes' then
        raise exception 'Match already has an active scorer';
      end if;
      if heartbeat is null
        and coalesce((scorer->>'claimedAt')::timestamptz, now() - interval '1 day') > now() - interval '2 minutes' then
        raise exception 'Match already has an active scorer';
      end if;
    end if;
    match_item := jsonb_set(match_item, '{scorer}', jsonb_build_object('playerId', p_player_id, 'claimedAt', now()), true);
    if request is not null and request->>'playerId' = p_player_id::text then
      match_item := match_item - 'scorerRequest';
    end if;
    match_item := public._scorer_append(match_item, 'scorerLog', jsonb_build_object(
      'at', now(), 'from', scorer->'playerId', 'to', p_player_id,
      'reason', case when scorer is null then 'claimed' when is_scorer then 'reclaimed' else 'offline_takeover' end), 30);
    insert into public.match_scorer_heartbeats (tournament_id, match_id, player_id, heartbeat_at)
    values (p_tournament_id, p_match_id, p_player_id, now())
    on conflict (tournament_id, match_id) do update set player_id = excluded.player_id, heartbeat_at = excluded.heartbeat_at;

  elsif p_action = 'request' then
    if scorer is null then
      raise exception 'No active scorer; claim the role instead';
    end if;
    if is_scorer then
      raise exception 'You are already the scorer';
    end if;
    if request is not null and request->>'playerId' <> p_player_id::text
      and coalesce((request->>'requestedAt')::timestamptz, now() - interval '1 day') > now() - interval '2 minutes' then
      raise exception 'Another scorer request is pending';
    end if;
    match_item := jsonb_set(match_item, '{scorerRequest}', jsonb_build_object('playerId', p_player_id, 'requestedAt', now()), true);

  elsif p_action = 'decline' then
    if not is_scorer then
      raise exception 'Not the active scorer';
    end if;
    match_item := match_item - 'scorerRequest';

  elsif p_action = 'release' then
    if not is_scorer then
      raise exception 'Not the active scorer';
    end if;
    match_item := match_item - 'scorer' - 'scorerRequest';
    match_item := public._scorer_append(match_item, 'scorerLog', jsonb_build_object(
      'at', now(), 'from', p_player_id, 'to', null, 'reason', 'released'), 30);
    delete from public.match_scorer_heartbeats where tournament_id = p_tournament_id and match_id = p_match_id;

  elsif p_action = 'transfer' then
    if not is_scorer then
      raise exception 'Not the active scorer';
    end if;
    target := coalesce(p_target_player_id, (request->>'playerId')::uuid);
    if target is null or target = p_player_id or not public._scorer_match_has_player(match_item, target) then
      raise exception 'Invalid scorer transfer target';
    end if;
    match_item := jsonb_set(match_item, '{scorer}', jsonb_build_object('playerId', target, 'claimedAt', now()), true) - 'scorerRequest';
    match_item := public._scorer_append(match_item, 'scorerLog', jsonb_build_object(
      'at', now(), 'from', p_player_id, 'to', target, 'reason', 'transferred'), 30);
    insert into public.match_scorer_heartbeats (tournament_id, match_id, player_id, heartbeat_at)
    values (p_tournament_id, p_match_id, target, now())
    on conflict (tournament_id, match_id) do update set player_id = excluded.player_id, heartbeat_at = excluded.heartbeat_at;

  elsif p_action = 'undo' or p_action = 'redo' then
    if not is_scorer then
      raise exception 'Not the active scorer';
    end if;
    if r_idx <> jsonb_array_length(current_state->'rounds') - 1 then
      raise exception 'Match is not in the current round';
    end if;
    if round_item->>'status' not in ('active', 'finished') then
      raise exception 'Match is not available for undo';
    end if;
    undo_stack := coalesce(match_item->'undoStack', '[]'::jsonb);
    redo_stack := coalesce(match_item->'redoStack', '[]'::jsonb);
    matches := round_item->'matches';

    if p_action = 'undo' then
      if jsonb_typeof(undo_stack) <> 'array' or jsonb_array_length(undo_stack) = 0 then
        raise exception 'No undo available for this match';
      end if;
      entry := undo_stack->(jsonb_array_length(undo_stack) - 1);
      -- What redo has to bring back: the match exactly as it is now, plus the waiting match the snapshot restores.
      next_idx := null;
      if jsonb_typeof(entry->'nextWaitingMatch') = 'object' then
        select e.ordinality - 1 into next_idx
        from jsonb_array_elements(matches) with ordinality as e(value, ordinality)
        where e.value->>'id' = entry->'nextWaitingMatch'->>'id' limit 1;
      end if;
      redo_entry := jsonb_build_object(
        'undoEntry', entry,
        'target', jsonb_build_object(
          'match', match_item - 'undoStack' - 'redoStack',
          'nextWaitingMatch', case when next_idx is null then null else matches->next_idx end,
          'roundId', round_item->'id',
          'roundStatus', round_item->'status',
          'tournamentStatus', current_state->'status',
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)));
      current_state := public._scorer_restore(current_state, r_idx, m_idx, entry, undo_stack - (jsonb_array_length(undo_stack) - 1), redo_stack || jsonb_build_array(redo_entry));
      event_type := 'undo';
    else
      if jsonb_typeof(redo_stack) <> 'array' or jsonb_array_length(redo_stack) = 0 then
        raise exception 'No redo available for this match';
      end if;
      redo_entry := redo_stack->(jsonb_array_length(redo_stack) - 1);
      current_state := public._scorer_restore(current_state, r_idx, m_idx, redo_entry->'target',
        undo_stack || jsonb_build_array(redo_entry->'undoEntry'), redo_stack - (jsonb_array_length(redo_stack) - 1));
      event_type := 'redo';
    end if;
    round_item := current_state->'rounds'->r_idx;
    match_item := round_item->'matches'->m_idx;
    match_item := public._scorer_append(match_item, 'eventLog', jsonb_build_object(
      'at', now(), 'type', event_type, 'playerId', p_player_id), 300);
    insert into public.match_scorer_heartbeats (tournament_id, match_id, player_id, heartbeat_at)
    values (p_tournament_id, p_match_id, p_player_id, now())
    on conflict (tournament_id, match_id) do update set player_id = excluded.player_id, heartbeat_at = excluded.heartbeat_at;
  end if;

  current_state := jsonb_set(current_state, array['rounds', r_idx::text, 'matches', m_idx::text], match_item, false);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state, revision = current_revision
  where id = p_tournament_id and revision = current_revision - 1;
  return current_state;
end
$function$;

create or replace function public.match_scorer_action(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_player_token text,
  p_action text,
  p_target_player_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_player_token is null or trim(p_player_token) !~ '^[0-9a-f]{48}$' then
    raise exception 'Invalid scorer payload';
  end if;
  if not public.consume_api_rate_limit('player-score:' || trim(p_player_token), 240, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.match_scorer_action_impl(
    p_tournament_id, p_invite_code, p_player_id, p_match_id, p_player_token, p_action, p_target_player_id);
end
$function$;

revoke execute on function public.match_scorer_action_impl(uuid, text, uuid, uuid, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.match_scorer_action(uuid, text, uuid, uuid, text, text, uuid) from public;
grant execute on function public.match_scorer_action(uuid, text, uuid, uuid, text, text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Admin override: assign (or clear) the scorer of a match.
-- ---------------------------------------------------------------------------------------------

create or replace function public.admin_set_match_scorer_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_player_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  current_revision integer;
  r_idx integer;
  m_idx integer;
  match_item jsonb;
  previous jsonb;
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16
    or p_match_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid scorer payload';
  end if;

  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id and admin_token = p_admin_token
  for update;
  if current_state is null then
    raise exception 'Admin token mismatch or tournament not found';
  end if;
  if current_revision <> p_expected_revision then
    raise exception 'Tournament state changed or not found';
  end if;

  select l.r_idx, l.m_idx into r_idx, m_idx from public._scorer_locate(current_state, p_match_id) l;
  if r_idx is null then
    raise exception 'Match not found';
  end if;
  match_item := current_state->'rounds'->r_idx->'matches'->m_idx;
  previous := match_item->'scorer'->'playerId';

  if p_player_id is null then
    match_item := match_item - 'scorer' - 'scorerRequest';
    delete from public.match_scorer_heartbeats where tournament_id = p_tournament_id and match_id = p_match_id;
  else
    if not public._scorer_match_has_player(match_item, p_player_id) then
      raise exception 'Player is not part of this match';
    end if;
    match_item := jsonb_set(match_item, '{scorer}', jsonb_build_object('playerId', p_player_id, 'claimedAt', now()), true) - 'scorerRequest';
    insert into public.match_scorer_heartbeats (tournament_id, match_id, player_id, heartbeat_at)
    values (p_tournament_id, p_match_id, p_player_id, now())
    on conflict (tournament_id, match_id) do update set player_id = excluded.player_id, heartbeat_at = excluded.heartbeat_at;
  end if;
  match_item := public._scorer_append(match_item, 'scorerLog', jsonb_build_object(
    'at', now(), 'from', previous, 'to', p_player_id, 'reason', 'admin_override'), 30);

  current_state := jsonb_set(current_state, array['rounds', r_idx::text, 'matches', m_idx::text], match_item, false);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state, revision = current_revision
  where id = p_tournament_id and revision = p_expected_revision;
  if not found then
    raise exception 'Tournament state changed or not found';
  end if;
  return current_state;
end
$function$;

create or replace function public.admin_set_match_scorer(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_player_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid scorer payload';
  end if;
  if not public.consume_api_rate_limit('admin-scorer:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.admin_set_match_scorer_impl(p_tournament_id, p_admin_token, p_match_id, p_player_id, p_expected_revision);
end
$function$;

revoke execute on function public.admin_set_match_scorer_impl(uuid, text, uuid, uuid, integer) from public, anon, authenticated;
revoke execute on function public.admin_set_match_scorer(uuid, text, uuid, uuid, integer) from public;
grant execute on function public.admin_set_match_scorer(uuid, text, uuid, uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- save_player_point_impl: only the active scorer scores; the scorer may score for both teams.
-- ---------------------------------------------------------------------------------------------

create or replace function public.save_player_point_impl(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_team_index integer,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  rounds jsonb;
  round_item jsonb;
  matches jsonb;
  match_item jsonb;
  current_game jsonb;
  current_set jsonb;
  completed_sets jsonb;
  scoring_key text;
  other_key text;
  round_index integer;
  match_index integer;
  scoring_points integer;
  other_points integer;
  scoring_games integer;
  other_games integer;
  games_to_win_set integer;
  sets_to_win_match integer;
  set_one_wins integer;
  set_two_wins integer;
  next_waiting_index integer;
  waiting_match_index integer;
  current_revision integer;
  undo_state jsonb;
  next_waiting_match jsonb;
  scorer jsonb;
begin
  if p_tournament_id is null
    or p_invite_code is null
    or p_player_id is null
    or p_match_id is null
    or p_team_index not in (0, 1)
    or p_player_token is null
    or length(trim(p_player_token)) < 32 then
    raise exception 'Invalid player score payload';
  end if;

  if not exists (
    select 1
    from public.player_sessions
    where tournament_id = p_tournament_id
      and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player token mismatch';
  end if;

  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id
    and invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);

  games_to_win_set := greatest(1, least(12, coalesce((current_state->'settings'->>'gamesToWinSet')::integer, 6)));
  sets_to_win_match := greatest(1, least(5, coalesce((current_state->'settings'->>'setsToWinMatch')::integer, 1)));
  rounds := coalesce(current_state->'rounds', '[]'::jsonb);

  if jsonb_array_length(rounds) > 0 then
    for round_index in 0..(jsonb_array_length(rounds) - 1) loop
      round_item := rounds->round_index;
      matches := coalesce(round_item->'matches', '[]'::jsonb);
      if jsonb_array_length(matches) = 0 then
        continue;
      end if;

      for match_index in 0..(jsonb_array_length(matches) - 1) loop
        match_item := matches->match_index;
        if (match_item->>'id')::uuid <> p_match_id then
          continue;
        end if;

        if match_item->>'state' <> 'playing' then
          raise exception 'Match is not currently playing';
        end if;

        if not public._scorer_match_has_player(match_item, p_player_id) then
          raise exception 'Player is not part of this match';
        end if;

        -- One active scorer: the first point on an unclaimed match claims the role.
        scorer := case when jsonb_typeof(match_item->'scorer') = 'object' then match_item->'scorer' else null end;
        if scorer is null then
          match_item := jsonb_set(match_item, '{scorer}', jsonb_build_object('playerId', p_player_id, 'claimedAt', now()), true);
          match_item := public._scorer_append(match_item, 'scorerLog', jsonb_build_object(
            'at', now(), 'from', null, 'to', p_player_id, 'reason', 'claimed'), 30);
        elsif scorer->>'playerId' <> p_player_id::text then
          raise exception 'Not the active scorer';
        end if;

        next_waiting_index := null;
        next_waiting_match := null;
        for waiting_match_index in 0..(jsonb_array_length(matches) - 1) loop
          if waiting_match_index <> match_index and matches->waiting_match_index->>'state' = 'waiting' then
            next_waiting_index := waiting_match_index;
            next_waiting_match := matches->waiting_match_index;
            exit;
          end if;
        end loop;

        undo_state := jsonb_build_object(
          'match', match_item - 'undoStack' - 'redoStack',
          'nextWaitingMatch', next_waiting_match,
          'roundId', round_item->'id',
          'roundStatus', round_item->'status',
          'tournamentStatus', current_state->'status',
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
        );
        match_item := jsonb_set(match_item, '{undoStack}', coalesce(match_item->'undoStack', '[]'::jsonb) || jsonb_build_array(undo_state), true);
        -- A new point after an undo drops the redo branch.
        match_item := jsonb_set(match_item, '{redoStack}', '[]'::jsonb, true);
        match_item := public._scorer_append(match_item, 'eventLog', jsonb_build_object(
          'at', now(), 'type', 'point', 'playerId', p_player_id, 'teamIndex', p_team_index), 300);

        scoring_key := case when p_team_index = 0 then 'teamOne' else 'teamTwo' end;
        other_key := case when p_team_index = 0 then 'teamTwo' else 'teamOne' end;
        current_game := coalesce(match_item->'currentGame', '{"teamOne": 0, "teamTwo": 0}'::jsonb);
        scoring_points := coalesce((current_game->>scoring_key)::integer, 0);
        other_points := coalesce((current_game->>other_key)::integer, 0);

        if scoring_points = 4 or (scoring_points = 3 and other_points < 3) then
          current_set := coalesce(match_item->'currentSet', '{"teamOne": 0, "teamTwo": 0}'::jsonb);
          scoring_games := coalesce((current_set->>scoring_key)::integer, 0) + 1;
          current_set := jsonb_set(current_set, ARRAY[scoring_key], to_jsonb(scoring_games), true);
          current_game := '{"teamOne": 0, "teamTwo": 0}'::jsonb;

          other_games := coalesce((current_set->>other_key)::integer, 0);
          if (scoring_games = games_to_win_set and scoring_games - other_games >= 2)
            or (scoring_games = games_to_win_set + 1 and other_games in (games_to_win_set - 1, games_to_win_set)) then
            completed_sets := coalesce(match_item->'completedSets', '[]'::jsonb) || jsonb_build_array(current_set);
            set_one_wins := (
              select count(*) from jsonb_array_elements(completed_sets) set_item
              where (set_item->>'teamOne')::integer > (set_item->>'teamTwo')::integer
            );
            set_two_wins := (
              select count(*) from jsonb_array_elements(completed_sets) set_item
              where (set_item->>'teamTwo')::integer > (set_item->>'teamOne')::integer
            );
            match_item := jsonb_set(match_item, '{completedSets}', completed_sets, true);
            if greatest(set_one_wins, set_two_wins) >= sets_to_win_match then
              match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
              match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(case when set_one_wins > set_two_wins then 0 else 1 end), true);
              match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);
              next_waiting_index := null;
              for waiting_match_index in 0..(jsonb_array_length(matches) - 1) loop
                if matches->waiting_match_index->>'state' = 'waiting' then
                  next_waiting_index := waiting_match_index;
                  exit;
                end if;
              end loop;
              if next_waiting_index is not null then
                matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'state'], '"playing"'::jsonb, true);
                matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtId'], match_item->'courtId', true);
                matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtName'], match_item->'courtName', true);
              end if;
            else
              current_set := '{"teamOne": 0, "teamTwo": 0}'::jsonb;
            end if;
          end if;
        elsif scoring_points = 3 and other_points = 3 then
          current_game := jsonb_set(current_game, ARRAY[scoring_key], '4'::jsonb, true);
        elsif other_points = 4 then
          current_game := jsonb_set(current_game, ARRAY[other_key], '3'::jsonb, true);
        else
          current_game := jsonb_set(current_game, ARRAY[scoring_key], to_jsonb(scoring_points + 1), true);
        end if;

        match_item := jsonb_set(match_item, '{currentSet}', coalesce(current_set, match_item->'currentSet'), true);
        match_item := jsonb_set(match_item, '{currentGame}', current_game, true);
        matches := jsonb_set(matches, ARRAY[match_index::text], match_item, false);
        round_item := jsonb_set(round_item, '{matches}', matches, true);
        rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
        current_state := jsonb_set(current_state, '{rounds}', rounds, true);
        current_revision := current_revision + 1;
        current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
        update public.tournaments
        set state = current_state,
            revision = current_revision
        where id = p_tournament_id
          and revision = current_revision - 1;

        insert into public.match_scorer_heartbeats (tournament_id, match_id, player_id, heartbeat_at)
        values (p_tournament_id, p_match_id, p_player_id, now())
        on conflict (tournament_id, match_id) do update set player_id = excluded.player_id, heartbeat_at = excluded.heartbeat_at;
        return current_state;
      end loop;
    end loop;
  end if;

  raise exception 'Match not found';
end;
$function$;

-- ---------------------------------------------------------------------------------------------
-- admin_undo_match_impl: an admin undo restores the score snapshot but must keep the current scorer
-- role, its log and the event history, and it drops any pending redo branch.
-- (Same as the live definition, plus the marked block.)
-- ---------------------------------------------------------------------------------------------

create or replace function public.admin_undo_match_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  current_revision integer;
  rounds jsonb;
  round_item jsonb;
  matches jsonb;
  match_item jsonb;
  undo_stack jsonb;
  popped_stack jsonb;
  undo_state jsonb;
  restored_match jsonb;
  next_waiting_match jsonb;
  existing_next_match jsonb;
  round_index integer;
  match_index integer;
  next_waiting_index integer;
  keep_field text;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_match_id is null
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid undo payload';
  end if;

  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id
    and admin_token = p_admin_token
  for update;

  if current_state is null then
    raise exception 'Admin token mismatch or tournament not found';
  end if;

  if current_revision <> p_expected_revision then
    raise exception 'Tournament state changed or not found';
  end if;

  rounds := coalesce(current_state->'rounds', '[]'::jsonb);
  if jsonb_array_length(rounds) = 0 then
    raise exception 'No match available for undo';
  end if;

  for round_index in 0..(jsonb_array_length(rounds) - 1) loop
    round_item := rounds->round_index;
    matches := coalesce(round_item->'matches', '[]'::jsonb);
    if jsonb_array_length(matches) = 0 then
      continue;
    end if;

    for match_index in 0..(jsonb_array_length(matches) - 1) loop
      match_item := matches->match_index;
      if (match_item->>'id')::uuid <> p_match_id then
        continue;
      end if;

      if round_index <> jsonb_array_length(rounds) - 1 then
        raise exception 'Match is not in the current round';
      end if;

      if round_item->>'status' not in ('active', 'finished') then
        raise exception 'Match is not available for undo';
      end if;

      undo_stack := match_item->'undoStack';
      if jsonb_typeof(undo_stack) <> 'array' or jsonb_array_length(undo_stack) = 0 then
        raise exception 'No undo available for this match';
      end if;
      undo_state := undo_stack->(jsonb_array_length(undo_stack) - 1);
      if undo_state is null
        or jsonb_typeof(undo_state) <> 'object'
        or jsonb_typeof(undo_state->'match') <> 'object' then
        raise exception 'No undo available for this match';
      end if;
      popped_stack := undo_stack - (jsonb_array_length(undo_stack) - 1);

      restored_match := (undo_state->'match')::jsonb - 'undoStack'::text;
      if restored_match->>'id' <> p_match_id::text then
        raise exception 'Invalid undo state';
      end if;
      restored_match := jsonb_set(restored_match, '{undoStack}', popped_stack, true);

      -- Phase 10: keep the current scorer role / log / event history, drop the redo branch.
      restored_match := restored_match - 'redoStack' - 'scorer' - 'scorerRequest' - 'scorerLog' - 'eventLog';
      foreach keep_field in array array['scorer', 'scorerRequest', 'scorerLog', 'eventLog'] loop
        if match_item ? keep_field then
          restored_match := jsonb_set(restored_match, array[keep_field], match_item->keep_field, true);
        end if;
      end loop;
      restored_match := jsonb_set(restored_match, '{redoStack}', '[]'::jsonb, true);
      matches := jsonb_set(matches, ARRAY[match_index::text], restored_match, false);

      next_waiting_match := undo_state->'nextWaitingMatch';
      if jsonb_typeof(next_waiting_match) = 'object' then
        select entry.ordinality - 1
        into next_waiting_index
        from jsonb_array_elements(matches) with ordinality as entry(value, ordinality)
        where entry.value->>'id' = next_waiting_match->>'id'
        limit 1;

        if next_waiting_index is null
          or (matches -> next_waiting_index)->>'id' <> next_waiting_match->>'id' then
          raise exception 'Undo state no longer matches current round';
        end if;

        existing_next_match := matches -> next_waiting_index;
        if existing_next_match->>'state' not in ('waiting', 'playing')
          or jsonb_array_length(coalesce(existing_next_match->'undoStack', '[]'::jsonb)) > 0 then
          raise exception 'Tournament state changed or not found';
        end if;
        matches := jsonb_set(matches, ARRAY[next_waiting_index::text], next_waiting_match, false);
      end if;

      round_item := jsonb_set(round_item, '{matches}', matches, true);
      if undo_state->>'roundStatus' is not null then
        round_item := jsonb_set(round_item, '{status}', to_jsonb(undo_state->>'roundStatus'), true);
      end if;
      rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
      current_state := jsonb_set(current_state, '{rounds}', rounds, true);
      if undo_state ? 'tournamentStatus' then
        current_state := jsonb_set(current_state, '{status}', undo_state->'tournamentStatus', true);
      end if;
      if current_state ? 'cup' and undo_state ? 'cupWinnerTeam' then
        current_state := jsonb_set(current_state, '{cup,winnerTeam}', undo_state->'cupWinnerTeam', true);
      end if;

      current_revision := current_revision + 1;
      current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
      update public.tournaments
      set state = current_state,
          revision = current_revision
      where id = p_tournament_id
        and revision = p_expected_revision;
      if not found then
        raise exception 'Tournament state changed or not found';
      end if;
      return current_state;
    end loop;
  end loop;

  raise exception 'Match not found';
end;
$function$;
