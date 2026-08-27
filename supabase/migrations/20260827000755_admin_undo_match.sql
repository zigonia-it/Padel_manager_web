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
set search_path = public, pg_catalog
as $$
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
          'match', match_item - 'lastScoredMatchState',
          'nextWaitingMatch', next_waiting_match,
          'roundId', round_item->'id',
          'roundStatus', round_item->'status',
          'tournamentStatus', current_state->'status',
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
        );
        match_item := jsonb_set(match_item, '{lastScoredMatchState}', undo_state, true);

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
$$;

revoke all on function public.save_player_point_impl(uuid, text, uuid, uuid, integer, text) from public, anon, authenticated;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef(
    'public.admin_set_result_impl(uuid,text,uuid,integer,integer,integer)'::regprocedure
  );
  definition := replace(
    definition,
    $needle$'tournamentStatus', current_state->'status',
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)$needle$,
    $replacement$'tournamentStatus', current_state->'status',
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)$replacement$
  );
  execute definition;
end;
$$;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef(
    'public.admin_match_action_impl(uuid,text,uuid,text,integer,integer)'::regprocedure
  );
  definition := replace(
    definition,
    $needle$'tournamentStatus', current_state->'status',
            'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)$needle$,
    $replacement$'tournamentStatus', current_state->'status',
            'revision', to_jsonb(current_revision),
            'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)$replacement$
  );
  execute definition;
end;
$$;

create or replace function public.admin_undo_match_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_state jsonb;
  current_revision integer;
  rounds jsonb;
  round_item jsonb;
  matches jsonb;
  match_item jsonb;
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

      undo_state := match_item->'lastScoredMatchState';
      if undo_state is null
        or jsonb_typeof(undo_state) <> 'object'
        or jsonb_typeof(undo_state->'match') <> 'object' then
        raise exception 'No undo available for this match';
      end if;

      if undo_state ? 'revision' then
        if coalesce(undo_state->>'revision', '') !~ '^[0-9]+$' then
          raise exception 'Invalid undo state';
        end if;
        source_revision := (undo_state->>'revision')::integer;
        if current_revision <> source_revision + 1 then
          raise exception 'Tournament state changed or not found';
        end if;
      end if;

      restored_match := (undo_state->'match')::jsonb - 'lastScoredMatchState'::text;
      if restored_match->>'id' <> p_match_id::text then
        raise exception 'Invalid undo state';
      end if;
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
          or jsonb_typeof(existing_next_match->'lastScoredMatchState') = 'object' then
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
$$;

revoke all on function public.admin_undo_match_impl(uuid, text, uuid, integer) from public, anon, authenticated;

create or replace function public.admin_undo_match(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid undo payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_undo_match_impl(
    p_tournament_id,
    p_admin_token,
    p_match_id,
    p_expected_revision
  );
end;
$$;

revoke all on function public.admin_undo_match(uuid, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_undo_match(uuid, text, uuid, integer) to anon;
