create or replace function public.admin_advance_cup(
  p_tournament_id uuid,
  p_admin_token text,
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
      'completedSets', '[]'::jsonb,
      'currentSet', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'currentGame', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'startingTeamIndex', floor(random() * 2)::integer,
      'winnerTeamIndex', null,
      'isWalkover', false,
      'isThirdPlaceMatch', false,
      'lastScoredMatchState', null,
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
      'completedSets', '[]'::jsonb,
      'currentSet', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'currentGame', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'startingTeamIndex', floor(random() * 2)::integer,
      'winnerTeamIndex', null,
      'isWalkover', false,
      'isThirdPlaceMatch', true,
      'lastScoredMatchState', null,
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
$$;

revoke all on function public.admin_advance_cup(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.admin_advance_cup(uuid, text, integer) to anon;
