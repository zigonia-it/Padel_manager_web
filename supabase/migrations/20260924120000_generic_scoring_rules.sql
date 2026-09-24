-- Phase 14: the generic scoring rules (SQL twin of PadelstarScoring.normalizeRules / isSetComplete / hasMatchWinner).
-- Three levels, each "first to N, win by M", every number 1..999 (developer decision 2026-09-24):
--   game (points): gameToWin, gameWinBy   set (games): gamesToWinSet, setWinBy   match (sets): setsToWinMatch, matchWinBy
-- Tennis/padel is the default set of numbers; "points" scoring is the same engine with gameToWin = 1.
-- Older tournaments carry only gamesToWinSet, setsToWinMatch, gameMode and setTiebreak: they map onto these rules exactly.
-- The fixtures in test/fixtures/scoring-scenarios.json run against both the JS engine and these functions.

create or replace function public._scoring_pick(p_source jsonb, p_fallback jsonb, p_key text)
returns jsonb
language sql
immutable
as $$
  select case
    when jsonb_typeof(p_source) = 'object' and jsonb_typeof(p_source->p_key) not in ('null') and p_source ? p_key then p_source->p_key
    when jsonb_typeof(p_fallback) = 'object' and jsonb_typeof(p_fallback->p_key) not in ('null') then p_fallback->p_key
    else null
  end
$$;

create or replace function public._scoring_level(p_value jsonb, p_default integer)
returns integer
language sql
immutable
as $$
  select case
    when p_value is null then p_default
    when jsonb_typeof(p_value) = 'number' then greatest(1, least(999, floor((p_value #>> '{}')::numeric)))::integer
    when jsonb_typeof(p_value) = 'string' and (p_value #>> '{}') ~ '^-?[0-9]+(\.[0-9]+)?$' then greatest(1, least(999, floor((p_value #>> '{}')::numeric)))::integer
    else p_default
  end
$$;

create or replace function public._scoring_rules(p_source jsonb, p_fallback jsonb default null)
returns jsonb
language plpgsql
immutable
as $$
declare
  game_mode text := case when public._scoring_pick(p_source, p_fallback, 'gameMode') = '"goldenPoint"'::jsonb then 'goldenPoint' else 'advantage' end;
  set_win_by integer := public._scoring_level(public._scoring_pick(p_source, p_fallback, 'setWinBy'), 2);
  decider_pick jsonb := public._scoring_pick(p_source, p_fallback, 'setDecider');
  set_decider text;
  win_by integer;
  timed integer;
begin
  set_decider := case
    when decider_pick in ('"nextGame"'::jsonb, '"tiebreak"'::jsonb, '"continue"'::jsonb) then decider_pick #>> '{}'
    when public._scoring_pick(p_source, p_fallback, 'setTiebreak') = 'true'::jsonb then 'tiebreak'
    else 'nextGame'
  end;
  if set_win_by <> 2 then
    set_decider := 'continue';
  end if;
  timed := greatest(0, coalesce(floor(case
    when jsonb_typeof(public._scoring_pick(p_source, p_fallback, 'timedMinutes')) = 'number'
      then (public._scoring_pick(p_source, p_fallback, 'timedMinutes') #>> '{}')::numeric end), 0))::integer;
  win_by := public._scoring_level(public._scoring_pick(p_source, p_fallback, 'gameWinBy'), case when game_mode = 'goldenPoint' then 1 else 2 end);
  return jsonb_build_object(
    'scoringMode', case when public._scoring_pick(p_source, p_fallback, 'scoringMode') = '"points"'::jsonb then 'points' else 'tennis' end,
    'gamesToWinSet', public._scoring_level(public._scoring_pick(p_source, p_fallback, 'gamesToWinSet'), 6),
    'setsToWinMatch', public._scoring_level(public._scoring_pick(p_source, p_fallback, 'setsToWinMatch'), 1),
    'gameToWin', public._scoring_level(public._scoring_pick(p_source, p_fallback, 'gameToWin'), 4),
    'gameWinBy', win_by,
    'setWinBy', set_win_by,
    'matchWinBy', public._scoring_level(public._scoring_pick(p_source, p_fallback, 'matchWinBy'), 1),
    'setDecider', set_decider,
    'gameMode', case when win_by = 1 then 'goldenPoint' else 'advantage' end,
    'setTiebreak', set_decider = 'tiebreak',
    'timedMinutes', timed);
end;
$$;

-- Is a set at this score finished? (a = one side's games/points, b = the other's)
create or replace function public._scoring_set_complete(p_a integer, p_b integer, p_rules jsonb)
returns boolean
language plpgsql
immutable
as $$
declare
  target integer := (p_rules->>'gamesToWinSet')::integer;
  winner integer := greatest(p_a, p_b);
  loser integer := least(p_a, p_b);
begin
  if p_rules->>'setDecider' = 'continue' then
    -- only scores that play can reach: at the target with the margin, or beyond it with exactly the margin
    return (winner = target and winner - loser >= (p_rules->>'setWinBy')::integer)
      or (winner > target and winner - loser = (p_rules->>'setWinBy')::integer and (p_rules->>'setWinBy')::integer >= 2);
  end if;
  return (winner = target and winner - loser >= 2)
    or (winner = target + 1 and loser in (target - 1, target));
end;
$$;

-- Has one side won the match, given the completed sets?
create or replace function public._scoring_match_won(p_sets jsonb, p_rules jsonb)
returns boolean
language sql
immutable
as $$
  with counts as (
    select
      count(*) filter (where (s->>'teamOne')::integer > (s->>'teamTwo')::integer) as one,
      count(*) filter (where (s->>'teamTwo')::integer > (s->>'teamOne')::integer) as two
    from jsonb_array_elements(coalesce(p_sets, '[]'::jsonb)) s
  )
  select (one >= (p_rules->>'setsToWinMatch')::integer and one - two >= (p_rules->>'matchWinBy')::integer)
      or (two >= (p_rules->>'setsToWinMatch')::integer and two - one >= (p_rules->>'matchWinBy')::integer)
  from counts
$$;

revoke all on function public._scoring_pick(jsonb, jsonb, text) from public, anon, authenticated;
revoke all on function public._scoring_level(jsonb, integer) from public, anon, authenticated;
revoke all on function public._scoring_rules(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._scoring_set_complete(integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public._scoring_match_won(jsonb, jsonb) from public, anon, authenticated;

-- save_player_point_impl: the point engine on the generic rules (copy of the scorer-lease version; the changes are the
-- rule profile snapshot, the game/set/match decisions and the deciding game of a timed match).
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
  game_to_win integer;
  game_win_by integer;
  game_floor integer;
  lowest_points integer;
  set_one_wins integer;
  set_two_wins integer;
  next_waiting_index integer;
  waiting_match_index integer;
  current_revision integer;
  undo_state jsonb;
  next_waiting_match jsonb;
  scorer jsonb;
  rules jsonb;
  set_decider text;
  in_tiebreak boolean;
  game_won boolean;
  tiebreak_won boolean;
  tiebreak_points jsonb;
  time_minutes integer;
  time_expired boolean;
  deciding boolean;
  match_over boolean;
  time_winner integer;
  games_one integer;
  games_two integer;
  winner_index integer;
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

        -- Rule profile snapshot (Phase 14): taken from the tournament settings on the match's first point.
        -- A snapshot written before the three-level rules is completed from the tournament settings.
        rules := public._scoring_rules(match_item->'rules', current_state->'settings');
        if jsonb_typeof(match_item->'rules') is distinct from 'object' then
          match_item := jsonb_set(match_item, '{rules}', rules, true);
        end if;
        -- The clock of a timed match starts with the first point.
        if match_item->>'startedAt' is null then
          match_item := jsonb_set(match_item, '{startedAt}', to_jsonb(now()), true);
        end if;
        games_to_win_set := (rules->>'gamesToWinSet')::integer;
        sets_to_win_match := (rules->>'setsToWinMatch')::integer;
        game_to_win := (rules->>'gameToWin')::integer;
        game_win_by := (rules->>'gameWinBy')::integer;
        set_decider := rules->>'setDecider';
        deciding := coalesce((match_item->>'decidingGame')::boolean, false);
        if deciding then
          game_win_by := 1; -- the deciding game of a timed match: the next point wins
        end if;
        in_tiebreak := coalesce((match_item->>'inTiebreak')::boolean, false);

        scoring_key := case when p_team_index = 0 then 'teamOne' else 'teamTwo' end;
        other_key := case when p_team_index = 0 then 'teamTwo' else 'teamOne' end;
        current_game := coalesce(match_item->'currentGame', '{"teamOne": 0, "teamTwo": 0}'::jsonb);
        current_set := coalesce(match_item->'currentSet', '{"teamOne": 0, "teamTwo": 0}'::jsonb);
        scoring_points := coalesce((current_game->>scoring_key)::integer, 0);
        other_points := coalesce((current_game->>other_key)::integer, 0);
        game_won := false;
        tiebreak_won := false;
        tiebreak_points := null;

        if in_tiebreak then
          current_game := jsonb_set(current_game, ARRAY[scoring_key], to_jsonb(scoring_points + 1), true);
          if scoring_points + 1 >= 7 and scoring_points + 1 - other_points >= 2 then
            game_won := true;
            tiebreak_won := true;
            tiebreak_points := current_game;
          end if;
        elsif scoring_points + 1 >= game_to_win and scoring_points + 1 - other_points >= game_win_by then
          game_won := true;
        else
          current_game := jsonb_set(current_game, ARRAY[scoring_key], to_jsonb(scoring_points + 1), true);
          -- Keep the counts small in the deuce zone (both one short of the target or more): only the difference
          -- matters, so 4-4 is stored as 3-3, exactly like the 40-40 / advantage model this generalises.
          game_floor := game_to_win - 1;
          lowest_points := least(scoring_points + 1, other_points);
          if lowest_points > game_floor then
            current_game := jsonb_build_object(
              scoring_key, scoring_points + 1 - (lowest_points - game_floor),
              other_key, other_points - (lowest_points - game_floor));
          end if;
        end if;

        match_over := false;
        time_winner := null;
        if game_won then
          current_game := '{"teamOne": 0, "teamTwo": 0}'::jsonb;
          if tiebreak_won then
            current_set := jsonb_build_object(scoring_key, games_to_win_set + 1, other_key, games_to_win_set);
            in_tiebreak := false;
          else
            current_set := jsonb_set(current_set, ARRAY[scoring_key], to_jsonb(coalesce((current_set->>scoring_key)::integer, 0) + 1), true);
          end if;
          scoring_games := coalesce((current_set->>scoring_key)::integer, 0);
          other_games := coalesce((current_set->>other_key)::integer, 0);
          completed_sets := coalesce(match_item->'completedSets', '[]'::jsonb);

          if not tiebreak_won and set_decider = 'tiebreak'
            and scoring_games = games_to_win_set and other_games = games_to_win_set then
            in_tiebreak := true;
          elsif public._scoring_set_complete(scoring_games, other_games, rules) then
            completed_sets := completed_sets
              || jsonb_build_array(case when tiebreak_points is null then current_set else current_set || jsonb_build_object('tiebreak', tiebreak_points) end);
            match_item := jsonb_set(match_item, '{completedSets}', completed_sets, true);
            set_one_wins := (select count(*) from jsonb_array_elements(completed_sets) set_item where (set_item->>'teamOne')::integer > (set_item->>'teamTwo')::integer);
            set_two_wins := (select count(*) from jsonb_array_elements(completed_sets) set_item where (set_item->>'teamTwo')::integer > (set_item->>'teamOne')::integer);
            if public._scoring_match_won(completed_sets, rules) then
              match_over := true;
            else
              current_set := '{"teamOne": 0, "teamTwo": 0}'::jsonb;
            end if;
          end if;

          -- Timed match: a game won after the clock ran out ends the match. The leader on sets, then on games,
          -- wins; when level a deciding golden-point game (or the tiebreak that is due) decides.
          time_minutes := coalesce((rules->>'timedMinutes')::integer, 0);
          time_expired := time_minutes > 0
            and match_item->>'startedAt' is not null
            and now() >= (match_item->>'startedAt')::timestamptz + time_minutes * interval '1 minute';
          if not match_over and (deciding or time_expired) then
            if deciding then
              time_winner := p_team_index;
            else
              set_one_wins := (select count(*) from jsonb_array_elements(completed_sets) set_item where (set_item->>'teamOne')::integer > (set_item->>'teamTwo')::integer);
              set_two_wins := (select count(*) from jsonb_array_elements(completed_sets) set_item where (set_item->>'teamTwo')::integer > (set_item->>'teamOne')::integer);
              games_one := (select coalesce(sum((set_item->>'teamOne')::integer), 0) from jsonb_array_elements(completed_sets) set_item) + coalesce((current_set->>'teamOne')::integer, 0);
              games_two := (select coalesce(sum((set_item->>'teamTwo')::integer), 0) from jsonb_array_elements(completed_sets) set_item) + coalesce((current_set->>'teamTwo')::integer, 0);
              if set_one_wins <> set_two_wins then
                time_winner := case when set_one_wins > set_two_wins then 0 else 1 end;
              elsif games_one <> games_two then
                time_winner := case when games_one > games_two then 0 else 1 end;
              else
                deciding := true;
              end if;
            end if;
            if time_winner is not null then
              -- keep the unfinished set in the record when it points the same way as the result
              if (current_set->>'teamOne')::integer <> (current_set->>'teamTwo')::integer
                and (case when (current_set->>'teamOne')::integer > (current_set->>'teamTwo')::integer then 0 else 1 end) = time_winner then
                completed_sets := completed_sets || jsonb_build_array(jsonb_build_object(
                  'teamOne', (current_set->>'teamOne')::integer, 'teamTwo', (current_set->>'teamTwo')::integer));
              end if;
              match_item := jsonb_set(match_item, '{completedSets}', completed_sets, true);
              match_item := jsonb_set(match_item, '{timeWinnerTeamIndex}', to_jsonb(time_winner), true);
              match_item := jsonb_set(match_item, '{endReason}', '"timeExpired"'::jsonb, true);
              deciding := false;
              match_over := true;
            end if;
          end if;

          if match_over then
            winner_index := coalesce(time_winner, case when set_one_wins > set_two_wins then 0 else 1 end);
            -- Phase 11: the match is not final until the result is approved. The court is freed now
            -- (the next waiting match starts), the scorer submits the result, the teams approve it.
            match_item := jsonb_set(match_item, '{state}', '"awaitingApproval"'::jsonb, true);
            match_item := jsonb_set(match_item, '{approval}', jsonb_build_object(
              'status', 'draft',
              'winnerTeamIndex', winner_index,
              'completedSets', completed_sets,
              'approvals', '[]'::jsonb,
              'corrections', 0,
              'endedAt', now(),
              'escalateAt', now() + interval '10 minutes',
              'autoApproveAt', now() + interval '30 minutes'), true);
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
            -- Only one side uses the app: nobody on the other team can approve or dispute, so the result is
            -- approved automatically when the scorer registers the winning point (no submit step).
            if not exists (
              select 1
              from jsonb_array_elements(coalesce(match_item->(case when public._approval_team_of(match_item, p_player_id) = 0 then 'teamTwo' else 'teamOne' end)->'players', '[]'::jsonb)) opp
              join public.player_sessions ps on ps.tournament_id = p_tournament_id and ps.player_id::text = opp->>'id'
            ) then
              match_item := jsonb_set(match_item, '{approval,approvals}', jsonb_build_array(
                jsonb_build_object('playerId', p_player_id, 'teamIndex', public._approval_team_of(match_item, p_player_id), 'at', now(), 'submitter', true),
                jsonb_build_object('playerId', null, 'teamIndex', 1 - public._approval_team_of(match_item, p_player_id), 'at', now(), 'auto', true, 'reason', 'no_device')), true);
              match_item := jsonb_set(match_item, '{approval,submittedBy}', to_jsonb(p_player_id), true);
              match_item := jsonb_set(match_item, '{approval,autoReason}', '"noOpponentDevice"'::jsonb, true);
              match_item := public._approval_finalize(match_item, true, '"auto"'::jsonb);
            end if;
          end if;
        end if;

        match_item := jsonb_set(match_item, '{inTiebreak}', to_jsonb(in_tiebreak), true);
        match_item := jsonb_set(match_item, '{decidingGame}', to_jsonb(deciding), true);
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
-- Typed results, corrections and disputes on the generic rules.
-- _approval_validate_proposal(sets, rules): every set must be finished by the set rule, no match may be decided before
-- the last set, and the whole must decide the match. Returns the winning team index (0 or 1).
-- ---------------------------------------------------------------------------------------------
create or replace function public._approval_validate_proposal(p_sets jsonb, p_rules jsonb)
returns integer
language plpgsql
immutable
as $function$
declare
  entry jsonb;
  one integer;
  two integer;
  idx integer := 0;
  total integer;
  prefix jsonb := '[]'::jsonb;
  wins_one integer := 0;
  wins_two integer := 0;
begin
  if jsonb_typeof(p_sets) is distinct from 'array'
    or jsonb_array_length(p_sets) < 1 then
    raise exception 'Invalid corrected result';
  end if;
  total := jsonb_array_length(p_sets);
  if (p_rules->>'matchWinBy')::integer = 1 and total > (2 * (p_rules->>'setsToWinMatch')::integer - 1) then
    raise exception 'Invalid corrected result';
  end if;
  for entry in select value from jsonb_array_elements(p_sets) loop
    idx := idx + 1;
    if jsonb_typeof(entry) is distinct from 'object'
      or jsonb_typeof(entry->'teamOne') is distinct from 'number'
      or jsonb_typeof(entry->'teamTwo') is distinct from 'number' then
      raise exception 'Invalid corrected result';
    end if;
    one := (entry->>'teamOne')::integer;
    two := (entry->>'teamTwo')::integer;
    if not public._scoring_set_complete(one, two, p_rules) then
      raise exception 'Invalid corrected result';
    end if;
    prefix := prefix || jsonb_build_array(jsonb_build_object('teamOne', one, 'teamTwo', two));
    if idx < total and public._scoring_match_won(prefix, p_rules) then
      raise exception 'Invalid corrected result';
    end if;
    if one > two then wins_one := wins_one + 1; else wins_two := wins_two + 1; end if;
  end loop;
  if not public._scoring_match_won(prefix, p_rules) then
    raise exception 'Invalid corrected result';
  end if;
  return case when wins_one > wins_two then 0 else 1 end;
end
$function$;

revoke all on function public._approval_validate_proposal(jsonb, jsonb) from public, anon, authenticated;

-- The older three-argument form stays as a thin wrapper.
create or replace function public._approval_validate_proposal(p_sets jsonb, p_games_to_win_set integer, p_sets_to_win_match integer)
returns integer
language sql
immutable
as $$
  select public._approval_validate_proposal(
    p_sets,
    public._scoring_rules(jsonb_build_object('gamesToWinSet', p_games_to_win_set, 'setsToWinMatch', p_sets_to_win_match)))
$$;

-- The three result functions below are patched in place from their live definitions (small, exact edits), so nothing else
-- in them can drift. A patch that does not find its target aborts the migration.
create or replace function pg_temp._patch_fn(p_sig regprocedure, p_old text, p_new text)
returns void
language plpgsql
as $$
declare
  def text := pg_get_functiondef(p_sig);
begin
  if position(p_old in def) = 0 then
    raise exception 'patch target not found in %: %', p_sig, left(p_old, 80);
  end if;
  execute replace(def, p_old, p_new);
end
$$;

select pg_temp._patch_fn(
  'public.admin_correct_result_impl(uuid, text, uuid, jsonb, text, text, text, integer)'::regprocedure,
  'new_winner := public._approval_validate_proposal(p_completed_sets, games_to_win_set, sets_to_win_match);',
  'new_winner := public._approval_validate_proposal(p_completed_sets, public._scoring_rules(match_item->''rules'', current_state->''settings''));');

select pg_temp._patch_fn(
  'public.match_result_action_impl(uuid, text, uuid, uuid, text, text, jsonb)'::regprocedure,
  'winner := public._approval_validate_proposal(p_payload->''completedSets'', games_to_win_set, sets_to_win_match);',
  'winner := public._approval_validate_proposal(p_payload->''completedSets'', public._scoring_rules(match_item->''rules'', current_state->''settings''));');

-- admin_set_result_impl: one typed set at a time
select pg_temp._patch_fn(
  'public.admin_set_result_impl(uuid, text, uuid, integer, integer, integer)'::regprocedure,
  E'  games_to_win_set integer;\n',
  E'  rules jsonb;\n  games_to_win_set integer;\n');

select pg_temp._patch_fn(
  'public.admin_set_result_impl(uuid, text, uuid, integer, integer, integer)'::regprocedure,
  E'  if not (\n    (greatest(p_team_one_score, p_team_two_score) = games_to_win_set\n      and greatest(p_team_one_score, p_team_two_score) - least(p_team_one_score, p_team_two_score) >= 2)\n    or (greatest(p_team_one_score, p_team_two_score) = games_to_win_set + 1\n      and least(p_team_one_score, p_team_two_score) in (games_to_win_set - 1, games_to_win_set))\n  ) then',
  E'  rules := public._scoring_rules(null, current_state->''settings'');\n  if not public._scoring_set_complete(p_team_one_score, p_team_two_score, rules) then');

select pg_temp._patch_fn(
  'public.admin_set_result_impl(uuid, text, uuid, integer, integer, integer)'::regprocedure,
  'if greatest(set_one_wins, set_two_wins) >= sets_to_win_match then',
  'if public._scoring_match_won(completed_sets, rules) then');
