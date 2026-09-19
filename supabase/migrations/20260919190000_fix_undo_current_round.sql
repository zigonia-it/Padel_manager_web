-- Fix found in the first live run (2026-09-19): scorer undo/redo and admin undo refused with
-- "Match is not in the current round" because they required the match to sit in the LAST entry of `rounds`,
-- but Round Robin generates every round up front (round 1 active, rounds 2-3 scheduled).
-- The check is now "no later round has started" (_round_is_latest_started).
-- Same definitions as in 20260919120000_match_scorer_lease.sql (which has been corrected as well).

-- A match can only be undone/redone while its round is the latest one that has started. Round Robin
-- generates every round up front, so the round in play is not necessarily the last entry of `rounds`.
create or replace function public._round_is_latest_started(p_state jsonb, p_round_idx integer)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
  select not exists (
    select 1
    from jsonb_array_elements(coalesce(p_state->'rounds', '[]'::jsonb)) with ordinality as r(value, ordinality)
    where r.ordinality - 1 > p_round_idx and r.value->>'status' in ('active', 'finished')
  );
$function$;

revoke execute on function public._round_is_latest_started(jsonb, integer) from public, anon, authenticated;

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
    if not public._round_is_latest_started(current_state, r_idx) then
      raise exception 'Match is not in the current round';
    end if;
    if round_item->>'status' not in ('active', 'finished') then
      raise exception 'Match is not available for undo';
    end if;
    if match_item->>'state' = 'awaitingApproval' and match_item->'approval'->>'status' is distinct from 'draft' then
      raise exception 'Result already submitted for approval';
    end if;
    if match_item->>'state' = 'finished' then
      raise exception 'Result already approved';
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

      if not public._round_is_latest_started(current_state, round_index) then
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
