-- Add: real multi-step undo for live scoring, replacing the single
-- match.lastScoredMatchState snapshot with match.undoStack (a jsonb array),
-- pushed to before each scoring action and popped on undo -- matching the
-- client-side change in app/match-actions.js/app/score-actions.js.
--
-- match.lastScoredMatchState is independently read AND written by five
-- server functions, not just the undo RPC: save_player_point_impl (player
-- self-scoring), admin_set_result_impl, admin_match_action_impl (walkover
-- branch), admin_advance_cup_impl (new-match scaffolding), and
-- admin_undo_match_impl itself. All five are reproduced here in full with
-- only the undo-state lines changed -- every other line (validation,
-- optimistic-concurrency revision checks, cup-advancement logic, point/game/
-- set scoring math) is unchanged from the live definitions confirmed via
-- pg_get_functiondef before writing this migration.

-- 1. admin_undo_match_impl: pop the last entry off undoStack instead of
-- reading/clearing a single object. The restored match keeps the REMAINING
-- (already-popped) stack, so multiple consecutive undos work.
create or replace function public.admin_undo_match_impl(p_tournament_id uuid, p_admin_token text, p_match_id uuid, p_expected_revision integer)
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
  source_revision integer;
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

      if undo_state ? 'revision' then
        if coalesce(undo_state->>'revision', '') !~ '^[0-9]+$' then
          raise exception 'Invalid undo state';
        end if;
        source_revision := (undo_state->>'revision')::integer;
        if current_revision <> source_revision + 1 then
          raise exception 'Tournament state changed or not found';
        end if;
      end if;

      restored_match := (undo_state->'match')::jsonb - 'undoStack'::text;
      if restored_match->>'id' <> p_match_id::text then
        raise exception 'Invalid undo state';
      end if;
      restored_match := jsonb_set(restored_match, '{undoStack}', popped_stack, true);
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

-- 2. save_player_point_impl: push onto undoStack instead of overwriting a
-- single field. Only the undo-capture lines change; the point/game/set
-- scoring math below is untouched.
create or replace function public.save_player_point_impl(p_tournament_id uuid, p_invite_code text, p_player_id uuid, p_match_id uuid, p_team_index integer, p_player_token text)
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
  team_key text;
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

        team_key := case when p_team_index = 0 then 'teamOne' else 'teamTwo' end;
        if not exists (
          select 1
          from jsonb_array_elements(coalesce(match_item->team_key->'players', '[]'::jsonb)) player
          where player->>'id' = p_player_id::text
        ) then
          raise exception 'Player is not part of this match';
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
          'match', match_item - 'undoStack',
          'nextWaitingMatch', next_waiting_match,
          'roundId', round_item->'id',
          'roundStatus', round_item->'status',
          'tournamentStatus', current_state->'status',
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
        );
        match_item := jsonb_set(match_item, '{undoStack}', coalesce(match_item->'undoStack', '[]'::jsonb) || jsonb_build_array(undo_state), true);

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
        return current_state;
      end loop;
    end loop;
  end if;

  raise exception 'Match not found';
end;
$function$;

-- 3. admin_set_result_impl: same push-onto-stack change as above; scoring
-- math and cup-completion logic below untouched.
create or replace function public.admin_set_result_impl(p_tournament_id uuid, p_admin_token text, p_match_id uuid, p_team_one_score integer, p_team_two_score integer, p_expected_revision integer)
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
  current_set jsonb;
  completed_sets jsonb;
  undo_state jsonb;
  next_waiting_match jsonb;
  round_index integer;
  match_index integer;
  round_match_index integer;
  next_waiting_index integer;
  games_to_win_set integer;
  sets_to_win_match integer;
  set_one_wins integer;
  set_two_wins integer;
  final_round_number integer;
  final_match jsonb;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_match_id is null
    or p_team_one_score is null
    or p_team_two_score is null
    or p_team_one_score < 0
    or p_team_two_score < 0
    or p_team_one_score = p_team_two_score
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid set result payload';
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

  games_to_win_set := greatest(1, least(12, coalesce((current_state->'settings'->>'gamesToWinSet')::integer, 6)));
  sets_to_win_match := greatest(1, least(5, coalesce((current_state->'settings'->>'setsToWinMatch')::integer, 1)));
  if not (
    (greatest(p_team_one_score, p_team_two_score) = games_to_win_set
      and greatest(p_team_one_score, p_team_two_score) - least(p_team_one_score, p_team_two_score) >= 2)
    or (greatest(p_team_one_score, p_team_two_score) = games_to_win_set + 1
      and least(p_team_one_score, p_team_two_score) in (games_to_win_set - 1, games_to_win_set))
  ) then
    raise exception 'Invalid set score';
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

        if round_item->>'status' <> 'active' then
          raise exception 'Match is not in the active round';
        end if;
        if match_item->>'state' not in ('playing', 'waiting') then
          raise exception 'Match is not available for a set result';
        end if;

        next_waiting_index := null;
        next_waiting_match := null;
        for round_match_index in 0..(jsonb_array_length(matches) - 1) loop
          if round_match_index <> match_index and matches->round_match_index->>'state' = 'waiting' then
            next_waiting_index := round_match_index;
            next_waiting_match := matches->round_match_index;
            exit;
          end if;
        end loop;

        undo_state := jsonb_build_object(
          'match', match_item - 'undoStack',
          'nextWaitingMatch', next_waiting_match,
          'roundId', round_item->'id',
          'roundStatus', round_item->'status',
          'tournamentStatus', current_state->'status',
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
        );
        current_set := jsonb_build_object(
          'teamOne', p_team_one_score,
          'teamTwo', p_team_two_score
        );
        completed_sets := coalesce(match_item->'completedSets', '[]'::jsonb) || jsonb_build_array(current_set);
        set_one_wins := (
          select count(*) from jsonb_array_elements(completed_sets) set_item
          where (set_item->>'teamOne')::integer > (set_item->>'teamTwo')::integer
        );
        set_two_wins := (
          select count(*) from jsonb_array_elements(completed_sets) set_item
          where (set_item->>'teamTwo')::integer > (set_item->>'teamOne')::integer
        );

        match_item := jsonb_set(match_item, '{undoStack}', coalesce(match_item->'undoStack', '[]'::jsonb) || jsonb_build_array(undo_state), true);
        match_item := jsonb_set(match_item, '{currentSet}', current_set, true);
        match_item := jsonb_set(match_item, '{currentGame}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
        match_item := jsonb_set(match_item, '{completedSets}', completed_sets, true);
        if greatest(set_one_wins, set_two_wins) >= sets_to_win_match then
          match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
          match_item := jsonb_set(match_item, '{status}', '"completed"'::jsonb, true);
          match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(case when set_one_wins > set_two_wins then 0 else 1 end), true);
          match_item := jsonb_set(match_item, '{isWalkover}', 'false'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);

          if next_waiting_index is not null then
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'state'], '"playing"'::jsonb, true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'status'], '"active"'::jsonb, true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtId'], match_item->'courtId', true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtName'], match_item->'courtName', true);
          end if;
        else
          match_item := jsonb_set(match_item, '{state}', '"playing"'::jsonb, true);
          match_item := jsonb_set(match_item, '{status}', '"active"'::jsonb, true);
          match_item := jsonb_set(match_item, '{currentSet}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
        end if;

        matches := jsonb_set(matches, ARRAY[match_index::text], match_item, false);
        round_item := jsonb_set(round_item, '{matches}', matches, true);
        rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
        current_state := jsonb_set(current_state, '{rounds}', rounds, true);

        if current_state->'settings'->>'format' = 'cup'
          and not exists (
            select 1
            from jsonb_array_elements(matches) round_match
            where round_match->>'state' not in ('finished', 'cancelled')
          ) then
          final_round_number := null;
          if jsonb_array_length(coalesce(current_state->'cup'->'bracket'->'rounds', '[]'::jsonb)) > 0 then
            final_round_number := (
              current_state->'cup'->'bracket'->'rounds'->(jsonb_array_length(current_state->'cup'->'bracket'->'rounds') - 1)->>'roundNumber'
            )::integer;
          end if;
          if final_round_number is not null and (round_item->>'roundNumber')::integer = final_round_number then
            select value into final_match
            from jsonb_array_elements(matches) value
            where value->>'isThirdPlaceMatch' <> 'true'
            limit 1;
            round_item := jsonb_set(round_item, '{status}', '"finished"'::jsonb, true);
            current_state := jsonb_set(current_state, ARRAY['rounds', round_index::text], round_item, true);
            current_state := jsonb_set(current_state, '{status}', '"Cup ferdig"'::jsonb, true);
            if final_match is not null then
              current_state := jsonb_set(
                current_state,
                '{cup,winnerTeam}',
                case when final_match->>'winnerTeamIndex' = '0' then final_match->'teamOne' else final_match->'teamTwo' end,
                true
              );
            end if;
          end if;
        end if;

        current_revision := current_revision + 1;
        current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
        update public.tournaments
        set state = current_state,
            revision = current_revision
        where id = p_tournament_id;
        return current_state;
      end loop;
    end loop;
  end if;

  raise exception 'Match not found';
end;
$function$;

-- 4. admin_match_action_impl: same push-onto-stack change, walkover branch
-- only (start/cancel never captured undo state and still don't).
create or replace function public.admin_match_action_impl(p_tournament_id uuid, p_admin_token text, p_match_id uuid, p_action text, p_team_index integer, p_expected_revision integer)
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
  undo_state jsonb;
  next_waiting_match jsonb;
  round_index integer;
  match_index integer;
  round_match_index integer;
  next_waiting_index integer;
  final_round_number integer;
  final_match jsonb;
  target_found boolean := false;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_match_id is null
    or p_action is null
    or p_action not in ('start', 'cancel', 'walkover')
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid admin match action payload';
  end if;

  if p_action = 'walkover' and (p_team_index is null or p_team_index not in (0, 1)) then
    raise exception 'Invalid walkover team';
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

        target_found := true;
        if round_item->>'status' <> 'active' then
          raise exception 'Match is not in the active round';
        end if;

        if p_action = 'start' then
          if match_item->>'state' <> 'waiting' then
            raise exception 'Match is not waiting';
          end if;
          match_item := jsonb_set(match_item, '{state}', '"playing"'::jsonb, true);
        elsif p_action = 'cancel' then
          if match_item->>'state' in ('finished', 'cancelled') then
            raise exception 'Match is already completed';
          end if;
          match_item := jsonb_set(match_item, '{state}', '"cancelled"'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedSets}', '[]'::jsonb, true);
          match_item := jsonb_set(match_item, '{winnerTeamIndex}', 'null'::jsonb, true);
          match_item := jsonb_set(match_item, '{isWalkover}', 'false'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);
        else
          if match_item->>'state' in ('finished', 'cancelled') then
            raise exception 'Match is already completed';
          end if;

          next_waiting_index := null;
          next_waiting_match := null;
          for round_match_index in 0..(jsonb_array_length(matches) - 1) loop
            if round_match_index <> match_index and matches->round_match_index->>'state' = 'waiting' then
              next_waiting_index := round_match_index;
              next_waiting_match := matches->round_match_index;
              exit;
            end if;
          end loop;

          undo_state := jsonb_build_object(
            'match', match_item - 'undoStack',
            'nextWaitingMatch', next_waiting_match,
            'roundId', round_item->'id',
            'roundStatus', round_item->'status',
            'tournamentStatus', current_state->'status',
            'revision', to_jsonb(current_revision),
            'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
          );
          match_item := jsonb_set(match_item, '{undoStack}', coalesce(match_item->'undoStack', '[]'::jsonb) || jsonb_build_array(undo_state), true);
          match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedSets}', '[]'::jsonb, true);
          match_item := jsonb_set(match_item, '{currentSet}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
          match_item := jsonb_set(match_item, '{currentGame}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
          match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(p_team_index), true);
          match_item := jsonb_set(match_item, '{isWalkover}', 'true'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);
        end if;

        matches := jsonb_set(matches, ARRAY[match_index::text], match_item, false);

        if p_action in ('cancel', 'walkover') then
          if next_waiting_index is null then
            next_waiting_index := null;
            for round_match_index in 0..(jsonb_array_length(matches) - 1) loop
              if matches->round_match_index->>'state' = 'waiting' then
                next_waiting_index := round_match_index;
                exit;
              end if;
            end loop;
          end if;
          if next_waiting_index is not null then
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'state'], '"playing"'::jsonb, true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtId'], match_item->'courtId', true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtName'], match_item->'courtName', true);
          end if;
        end if;

        round_item := jsonb_set(round_item, '{matches}', matches, true);
        rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
        current_state := jsonb_set(current_state, '{rounds}', rounds, true);

        if p_action = 'walkover'
          and current_state->'settings'->>'format' = 'cup'
          and not exists (
            select 1
            from jsonb_array_elements(matches) round_match
            where round_match->>'state' not in ('finished', 'cancelled')
          ) then
          final_round_number := null;
          if jsonb_array_length(coalesce(current_state->'cup'->'bracket'->'rounds', '[]'::jsonb)) > 0 then
            final_round_number := (
              current_state->'cup'->'bracket'->'rounds'->(jsonb_array_length(current_state->'cup'->'bracket'->'rounds') - 1)->>'roundNumber'
            )::integer;
          end if;
          if final_round_number is not null and (round_item->>'roundNumber')::integer = final_round_number then
            select value into final_match
            from jsonb_array_elements(matches) value
            where value->>'isThirdPlaceMatch' <> 'true'
            limit 1;
            round_item := jsonb_set(round_item, '{status}', '"finished"'::jsonb, true);
            current_state := jsonb_set(current_state, ARRAY['rounds', round_index::text], round_item, true);
            current_state := jsonb_set(current_state, '{status}', '"Cup ferdig"'::jsonb, true);
            if final_match is not null then
              current_state := jsonb_set(
                current_state,
                '{cup,winnerTeam}',
                case when final_match->>'winnerTeamIndex' = '0' then final_match->'teamOne' else final_match->'teamTwo' end,
                true
              );
            end if;
          end if;
        end if;

        current_revision := current_revision + 1;
        current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
        update public.tournaments
        set state = current_state,
            revision = current_revision
        where id = p_tournament_id;
        return current_state;
      end loop;
    end loop;
  end if;

  if not target_found then
    raise exception 'Match not found';
  end if;

  raise exception 'Match action failed';
end;
$function$;

-- 5. admin_advance_cup_impl: newly-scaffolded matches get an empty
-- undoStack array instead of a null lastScoredMatchState.
create or replace function public.admin_advance_cup_impl(p_tournament_id uuid, p_admin_token text, p_expected_revision integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  current_revision integer;
  rounds jsonb;
  previous_round jsonb;
  bracket jsonb;
  bracket_rounds jsonb;
  bracket_round jsonb;
  next_round jsonb;
  matches jsonb := '[]'::jsonb;
  match_item jsonb;
  team_one jsonb;
  team_two jsonb;
  advancing_teams jsonb;
  next_bye_teams jsonb := '[]'::jsonb;
  losing_teams jsonb := '[]'::jsonb;
  sitting_out jsonb := '[]'::jsonb;
  slots jsonb := '[]'::jsonb;
  previous_index integer;
  previous_round_number integer;
  bracket_index integer;
  next_bracket_index integer;
  next_round_number integer;
  last_bracket_round_number integer;
  team_index integer;
  match_index integer;
  regular_match_count integer := 0;
  next_waiting_index integer;
  court_count integer;
  started_count integer := 0;
  final_match jsonb;
  third_place_match jsonb;
  is_final_round boolean := false;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid cup advance payload';
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

  if current_state->'settings'->>'format' <> 'cup' then
    raise exception 'Cup advancement requires cup format';
  end if;
  if current_state->>'status' = 'Cup ferdig' then
    raise exception 'Cupen er ferdig';
  end if;

  rounds := coalesce(current_state->'rounds', '[]'::jsonb);
  if jsonb_array_length(rounds) = 0 then
    raise exception 'No cup round to advance';
  end if;

  previous_index := jsonb_array_length(rounds) - 1;
  previous_round := rounds->previous_index;
  if previous_round->>'status' not in ('active', 'finished') then
    raise exception 'Cup round is not ready to advance';
  end if;

  matches := coalesce(previous_round->'matches', '[]'::jsonb);
  if jsonb_array_length(matches) = 0
    or exists (
      select 1
      from jsonb_array_elements(matches) round_match
      where coalesce(round_match->>'state', '') not in ('finished', 'cancelled')
    ) then
    raise exception 'Alle kamper må være ferdige før neste runde';
  end if;

  previous_round := jsonb_set(previous_round, '{status}', '"finished"'::jsonb, true);
  rounds := jsonb_set(rounds, ARRAY[previous_index::text], previous_round, false);
  previous_round_number := (previous_round->>'roundNumber')::integer;
  bracket := coalesce(current_state->'cup'->'bracket', '{}'::jsonb);
  bracket_rounds := coalesce(bracket->'rounds', '[]'::jsonb);
  next_bracket_index := null;
  next_round_number := null;

  if jsonb_array_length(bracket_rounds) > 0 then
    last_bracket_round_number := (
      bracket_rounds->(jsonb_array_length(bracket_rounds) - 1)->>'roundNumber'
    )::integer;
    for bracket_index in 0..(jsonb_array_length(bracket_rounds) - 1) loop
      if (bracket_rounds->bracket_index->>'roundNumber')::integer > previous_round_number
        and (next_round_number is null or (bracket_rounds->bracket_index->>'roundNumber')::integer < next_round_number) then
        next_bracket_index := bracket_index;
        next_round_number := (bracket_rounds->bracket_index->>'roundNumber')::integer;
      end if;
    end loop;
  end if;

  advancing_teams := coalesce(
    (
      select case
        when jsonb_typeof(value->'byeTeams') = 'array' then value->'byeTeams'
        else '[]'::jsonb
      end
      from jsonb_array_elements(bracket_rounds) value
      where (value->>'roundNumber')::integer = previous_round_number
      limit 1
    ),
    case
      when jsonb_typeof(current_state->'cup'->'byeTeams') = 'array' then current_state->'cup'->'byeTeams'
      else '[]'::jsonb
    end,
    '[]'::jsonb
  );

  if jsonb_array_length(matches) > 0 then
    for match_index in 0..(jsonb_array_length(matches) - 1) loop
      match_item := matches->match_index;
      if match_item->>'state' = 'finished'
        and match_item->>'winnerTeamIndex' is not null
        and coalesce(match_item->>'isThirdPlaceMatch', 'false') <> 'true' then
        if match_item->>'winnerTeamIndex' = '0' then
          advancing_teams := advancing_teams || jsonb_build_array(match_item->'teamOne');
          losing_teams := losing_teams || jsonb_build_array(match_item->'teamTwo');
        else
          advancing_teams := advancing_teams || jsonb_build_array(match_item->'teamTwo');
          losing_teams := losing_teams || jsonb_build_array(match_item->'teamOne');
        end if;
      end if;
    end loop;
  end if;

  matches := '[]'::jsonb;

  if jsonb_array_length(advancing_teams) >= 2
    and jsonb_array_length(advancing_teams) % 2 = 1 then
    next_bye_teams := jsonb_build_array(advancing_teams->(jsonb_array_length(advancing_teams) - 1));
    sitting_out := sitting_out || coalesce(advancing_teams->(jsonb_array_length(advancing_teams) - 1)->'players', '[]'::jsonb);
  end if;

  current_state := jsonb_set(current_state, '{cup,byeTeams}', next_bye_teams, true);
  if jsonb_array_length(advancing_teams) < 2 then
    current_state := jsonb_set(current_state, '{rounds}', rounds, true);
    current_state := jsonb_set(current_state, '{status}', '"Cup ferdig"'::jsonb, true);
    current_state := jsonb_set(current_state, '{cup,winnerTeam}', coalesce(advancing_teams->0, 'null'::jsonb), true);
    current_revision := current_revision + 1;
    current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
    update public.tournaments
    set state = current_state,
        revision = current_revision
    where id = p_tournament_id;
    return current_state;
  end if;

  if next_round_number is null then
    next_round_number := previous_round_number + 1;
  end if;
  is_final_round := last_bracket_round_number is null or next_round_number = last_bracket_round_number;
  court_count := greatest(1, jsonb_array_length(coalesce(current_state->'courts', '[]'::jsonb)));

  for team_index in 0..((jsonb_array_length(advancing_teams) / 2) - 1) loop
    team_one := advancing_teams->(team_index * 2);
    team_two := advancing_teams->(team_index * 2 + 1);
    match_item := jsonb_build_object(
      'id', gen_random_uuid(),
      'tournamentId', p_tournament_id,
      'rotationNumber', next_round_number,
      'teamOne', team_one,
      'teamTwo', team_two,
      'sittingOut', sitting_out,
      'state', 'waiting',
      'status', 'scheduled',
      'completedSets', '[]'::jsonb,
      'currentSet', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'currentGame', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'startingTeamIndex', floor(random() * 2)::integer,
      'winnerTeamIndex', null,
      'isWalkover', false,
      'isThirdPlaceMatch', false,
      'undoStack', '[]'::jsonb,
      'courtId', coalesce(current_state->'courts'->(team_index % court_count)->'id', 'null'::jsonb),
      'courtName', coalesce(current_state->'courts'->(team_index % court_count)->'name', 'null'::jsonb),
      'completedAt', null
    );
    matches := matches || jsonb_build_array(match_item);
    regular_match_count := regular_match_count + 1;
  end loop;

  if is_final_round
    and coalesce(current_state->'cup'->>'includesThirdPlaceMatch', 'false') = 'true'
    and jsonb_array_length(losing_teams) >= 2 then
    third_place_match := jsonb_build_object(
      'id', gen_random_uuid(),
      'tournamentId', p_tournament_id,
      'rotationNumber', next_round_number,
      'teamOne', losing_teams->0,
      'teamTwo', losing_teams->1,
      'sittingOut', sitting_out,
      'state', 'waiting',
      'status', 'scheduled',
      'completedSets', '[]'::jsonb,
      'currentSet', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'currentGame', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'startingTeamIndex', floor(random() * 2)::integer,
      'winnerTeamIndex', null,
      'isWalkover', false,
      'isThirdPlaceMatch', true,
      'undoStack', '[]'::jsonb,
      'courtId', coalesce(current_state->'courts'->(regular_match_count % court_count)->'id', 'null'::jsonb),
      'courtName', coalesce(current_state->'courts'->(regular_match_count % court_count)->'name', 'null'::jsonb),
      'completedAt', null
    );
    matches := matches || jsonb_build_array(third_place_match);
  else
    third_place_match := null;
  end if;

  if jsonb_array_length(matches) > 0 then
    for match_index in 0..(jsonb_array_length(matches) - 1) loop
      if matches->match_index->>'state' = 'waiting' and started_count < court_count then
        matches := jsonb_set(matches, ARRAY[match_index::text, 'state'], '"playing"'::jsonb, true);
        matches := jsonb_set(matches, ARRAY[match_index::text, 'status'], '"active"'::jsonb, true);
        started_count := started_count + 1;
      end if;
    end loop;
  end if;

  next_round := jsonb_build_object(
    'id', gen_random_uuid(),
    'roundNumber', next_round_number,
    'status', 'active',
    'createdAt', now(),
    'startedAt', now(),
    'sittingOut', sitting_out,
    'matches', matches
  );
  rounds := rounds || jsonb_build_array(next_round);

  if next_bracket_index is not null then
    bracket_round := bracket_rounds->next_bracket_index;
    if regular_match_count > 0 then
      for match_index in 0..(regular_match_count - 1) loop
        slots := slots || jsonb_build_array(jsonb_build_object(
          'type', 'match',
          'matchId', matches->match_index->'id'
        ));
      end loop;
    end if;
    bracket_round := jsonb_set(bracket_round, '{slots}', slots, true);
    bracket_round := jsonb_set(bracket_round, '{byeTeams}', next_bye_teams, true);
    if third_place_match is not null then
      bracket_round := jsonb_set(bracket_round, '{thirdPlaceSlot}', jsonb_build_object(
        'type', 'match',
        'matchId', third_place_match->'id'
      ), true);
    elsif bracket_round->'thirdPlaceSlot'->>'type' = 'pending' then
      bracket_round := jsonb_set(bracket_round, '{thirdPlaceSlot}', 'null'::jsonb, true);
    end if;
    bracket_rounds := jsonb_set(bracket_rounds, ARRAY[next_bracket_index::text], bracket_round, false);
    bracket := jsonb_set(bracket, '{rounds}', bracket_rounds, true);
    if is_final_round then
      select value into final_match
      from jsonb_array_elements(matches) value
      where coalesce(value->>'isThirdPlaceMatch', 'false') <> 'true'
      limit 1;
      bracket := jsonb_set(bracket, '{finalMatchId}', coalesce(final_match->'id', 'null'::jsonb), true);
      bracket := jsonb_set(bracket, '{thirdPlaceMatchId}', coalesce(third_place_match->'id', 'null'::jsonb), true);
    end if;
    current_state := jsonb_set(current_state, '{cup,bracket}', bracket, true);
  end if;

  current_state := jsonb_set(current_state, '{rounds}', rounds, true);
  current_state := jsonb_set(current_state, '{currentRound}', to_jsonb(next_round_number), true);
  current_state := jsonb_set(current_state, '{status}', '"Runde pågår"'::jsonb, true);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state,
      revision = current_revision
  where id = p_tournament_id;

  return current_state;
end;
$function$;
