-- Fix: admin_advance_round_impl started the next round's matches ("playing" /
-- "active") but never assigned them a court. Round 1 is scheduled and courted by
-- the client (activateRound -> PadelstarTournamentScheduler.assignNextCourt), but
-- once the tournament is server-connected, every later round is advanced by this
-- RPC, so from round 2 on a live match had courtId/courtName = null: the match
-- card read "Ikke tildelt bane" and the court queue showed every court LEDIG
-- while matches were being played. Because admin_set_result_impl hands a freed
-- court to the next waiting match by copying the finished match's court, the
-- null then propagated through the rest of the tournament.
--
-- Reproduced on the live database: 4 players / 2 courts Round Robin, play round 1,
-- "Start neste runde" -> round 2's match state=playing, court_id=null.
--
-- Fix: assign started matches to the tournament's courts in order (same order the
-- client uses) and clear queuePosition, matching assignNextCourt(). Everything
-- else is unchanged from the live definition.
create or replace function public.admin_advance_round_impl(p_tournament_id uuid, p_admin_token text, p_expected_revision integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  current_revision integer;
  rounds jsonb;
  active_round jsonb;
  next_round jsonb;
  matches jsonb;
  active_index integer;
  next_index integer;
  round_scan_index integer;
  match_scan_index integer;
  court_count integer;
  court_list jsonb;
  court_item jsonb;
  started_count integer := 0;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid round advance payload';
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

  if coalesce(current_state->'settings'->>'format', 'roundRobin') <> 'roundRobin' then
    raise exception 'Cup round advancement requires bracket action';
  end if;

  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  rounds := coalesce(current_state->'rounds', '[]'::jsonb);
  active_index := null;
  next_index := null;

  if jsonb_array_length(rounds) > 0 then
    for round_scan_index in 0..(jsonb_array_length(rounds) - 1) loop
      if rounds->round_scan_index->>'status' = 'active' then
        active_index := round_scan_index;
        exit;
      end if;
    end loop;
  end if;

  if active_index is null then
    raise exception 'No active round to advance';
  end if;

  active_round := rounds->active_index;
  matches := coalesce(active_round->'matches', '[]'::jsonb);
  if jsonb_array_length(matches) = 0
    or exists (
      select 1
      from jsonb_array_elements(matches) round_match
      where coalesce(round_match->>'state', '') not in ('finished', 'cancelled')
    ) then
    raise exception 'Alle kamper må være ferdige før neste runde';
  end if;

  active_round := jsonb_set(active_round, '{status}', '"finished"'::jsonb, true);
  rounds := jsonb_set(rounds, ARRAY[active_index::text], active_round, false);

  if active_index + 1 <= jsonb_array_length(rounds) - 1 then
    for round_scan_index in (active_index + 1)..(jsonb_array_length(rounds) - 1) loop
      if rounds->round_scan_index->>'status' = 'scheduled' then
        next_index := round_scan_index;
        exit;
      end if;
    end loop;
  end if;

  if next_index is not null then
    next_round := rounds->next_index;
    if next_round->>'startedAt' is null then
      next_round := jsonb_set(next_round, '{startedAt}', to_jsonb(now()), true);
    end if;
    next_round := jsonb_set(next_round, '{status}', '"active"'::jsonb, true);
    matches := coalesce(next_round->'matches', '[]'::jsonb);
    court_list := coalesce(current_state->'courts', '[]'::jsonb);
    court_count := greatest(1, jsonb_array_length(court_list));
    if jsonb_array_length(matches) > 0 then
      for match_scan_index in 0..(jsonb_array_length(matches) - 1) loop
        if matches->match_scan_index->>'state' = 'waiting' and started_count < court_count then
          matches := jsonb_set(matches, ARRAY[match_scan_index::text, 'state'], '"playing"'::jsonb, true);
          matches := jsonb_set(matches, ARRAY[match_scan_index::text, 'status'], '"active"'::jsonb, true);
          matches := jsonb_set(matches, ARRAY[match_scan_index::text, 'queuePosition'], 'null'::jsonb, true);
          court_item := court_list->started_count;
          if jsonb_typeof(court_item) = 'object' then
            matches := jsonb_set(matches, ARRAY[match_scan_index::text, 'courtId'], coalesce(court_item->'id', 'null'::jsonb), true);
            matches := jsonb_set(matches, ARRAY[match_scan_index::text, 'courtName'], coalesce(court_item->'name', 'null'::jsonb), true);
          end if;
          started_count := started_count + 1;
        end if;
      end loop;
    end if;
    next_round := jsonb_set(next_round, '{matches}', matches, true);
    rounds := jsonb_set(rounds, ARRAY[next_index::text], next_round, false);
    current_state := jsonb_set(current_state, '{currentRound}', to_jsonb((next_round->>'roundNumber')::integer), true);
    current_state := jsonb_set(current_state, '{status}', '"Runde pågår"'::jsonb, true);
  else
    current_state := jsonb_set(current_state, '{status}', '"Runde fullført"'::jsonb, true);
  end if;

  current_state := jsonb_set(current_state, '{rounds}', rounds, true);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state,
      revision = current_revision
  where id = p_tournament_id;

  return current_state;
end;
$function$;
