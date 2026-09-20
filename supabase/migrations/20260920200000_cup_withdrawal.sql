-- Withdrawal in a Cup (developer's decision 2026-09-20).
--
-- Same conditions as in a Round Robin: a player who withdrew leaves their team's matches waiting for the remaining
-- teammate (play alone / walkover; the admin can decide too). Nobody left on a side = walkover for the opponents.
-- Both sides of a match affected = the match is cancelled and the best-placed losing team of the round takes its place
-- in the next round, but only when the admin confirms (`p_confirm_lucky_loser`). "Best-placed": all candidates lost in
-- the same round, so the games difference over the cup decides, then the order of their match.
--
-- A Cup builds its next round on the server (admin_advance_cup), so the rules are enforced here:
--   * `_cup_apply_withdrawals` puts the matches of a new round in the right state when a player of theirs has withdrawn
--     (the client applies the same rules to the current round when the player withdraws: app/player-withdrawal.js),
--   * `_cup_lucky_losers` picks the replacement teams and admin_advance_cup_impl refuses to use them unless confirmed.
-- match_withdrawal_decision needs no change: it works on any match that waits for a decision.
-- The advance function gets a fourth parameter with a default, so existing callers keep working.

drop function if exists public.admin_advance_cup(uuid, text, integer);
drop function if exists public.admin_advance_cup_impl(uuid, text, integer);

create or replace function public._cup_absent_players(p_state jsonb, p_team jsonb)
returns jsonb
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select coalesce(jsonb_agg(tp.value order by tp.ordinality), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_team->'players', '[]'::jsonb)) with ordinality as tp(value, ordinality)
  where exists (
    select 1 from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb)) sp
    where sp->>'id' = tp.value->>'id'
      and coalesce((sp->>'withdrawn')::boolean, false)
      and sp->>'replacedBy' is null
  );
$$;

create or replace function public._cup_absent_record(p_team jsonb, p_absent jsonb, p_team_index integer, p_now timestamptz)
returns jsonb
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select jsonb_build_object(
    'playerId', p_absent->>'id',
    'teamIndex', p_team_index,
    'teammateId', (
      select tp.value->>'id'
      from jsonb_array_elements(coalesce(p_team->'players', '[]'::jsonb)) with ordinality as tp(value, ordinality)
      where tp.value->>'id' is distinct from p_absent->>'id'
      order by tp.ordinality
      limit 1
    ),
    'absent', jsonb_build_object('id', p_absent->>'id', 'name', p_absent->>'name', 'accent', p_absent->'accent'),
    'absentIndex', coalesce((
      select tp.ordinality - 1
      from jsonb_array_elements(coalesce(p_team->'players', '[]'::jsonb)) with ordinality as tp(value, ordinality)
      where tp.value->>'id' = p_absent->>'id'
    ), 0),
    'status', 'pending',
    'at', p_now
  );
$$;

-- The games a team won minus the games it lost over every played (not walked-over) match of the cup.
create or replace function public._cup_games_difference(p_rounds jsonb, p_team_id text)
returns integer
language sql
stable
set search_path to 'public', 'pg_catalog'
as $$
  select coalesce(sum(
    case
      when m.value->'teamOne'->>'id' = p_team_id then (s.value->>'teamOne')::integer - (s.value->>'teamTwo')::integer
      when m.value->'teamTwo'->>'id' = p_team_id then (s.value->>'teamTwo')::integer - (s.value->>'teamOne')::integer
      else 0
    end
  ), 0)::integer
  from jsonb_array_elements(coalesce(p_rounds, '[]'::jsonb)) r,
       jsonb_array_elements(coalesce(r.value->'matches', '[]'::jsonb)) m,
       jsonb_array_elements(coalesce(m.value->'completedSets', '[]'::jsonb)) s
  where m.value->>'state' = 'finished'
    and coalesce(m.value->>'isWalkover', 'false') <> 'true';
$$;

-- The losing teams that take the place of a match in which both sides withdrew: one team per such match, the
-- best-placed first. All candidates lost in this round (they reached the same round), so they are ranked by the games
-- difference over the cup, then by the order of their match. A team that lost by walkover did not play and a team
-- without a present player cannot play on: neither is a candidate.
create or replace function public._cup_lucky_losers(p_state jsonb, p_round jsonb, p_rounds jsonb)
returns jsonb
language plpgsql
stable
set search_path to 'public', 'pg_catalog'
as $$
declare
  missing integer;
  candidates jsonb;
begin
  select count(*) into missing
  from jsonb_array_elements(coalesce(p_round->'matches', '[]'::jsonb)) m
  where coalesce(m->>'isThirdPlaceMatch', 'false') <> 'true'
    and m->>'state' = 'cancelled'
    and coalesce((m->'withdrawal'->>'bothSides')::boolean, false);
  if missing = 0 then
    return jsonb_build_object('missing', 0, 'teams', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(c.team order by c.diff desc, c.idx), '[]'::jsonb) into candidates
  from (
    select l.team,
           public._cup_games_difference(p_rounds, l.team->>'id') as diff,
           m.ordinality as idx
    from jsonb_array_elements(coalesce(p_round->'matches', '[]'::jsonb)) with ordinality as m(value, ordinality)
    cross join lateral (
      select case when m.value->>'winnerTeamIndex' = '0' then m.value->'teamTwo' else m.value->'teamOne' end as team
    ) l
    where coalesce(m.value->>'isThirdPlaceMatch', 'false') <> 'true'
      and m.value->>'state' = 'finished'
      and m.value->>'winnerTeamIndex' is not null
      and coalesce(m.value->>'isWalkover', 'false') <> 'true'
      and jsonb_array_length(public._cup_absent_players(p_state, l.team)) < jsonb_array_length(coalesce(l.team->'players', '[]'::jsonb))
  ) c;

  return jsonb_build_object('missing', missing, 'teams', coalesce((
    select jsonb_agg(t.value order by t.ordinality)
    from jsonb_array_elements(candidates) with ordinality as t(value, ordinality)
    where t.ordinality <= missing
  ), '[]'::jsonb));
end;
$$;

-- Puts the matches of a newly created round in the right state when a player of theirs has withdrawn (same rules as
-- app/player-withdrawal.js): nobody left on a side = walkover for the opponents; both sides affected = cancelled (a
-- lucky loser takes the place in the next round); otherwise the match waits for the remaining teammate's decision.
create or replace function public._cup_apply_withdrawals(p_state jsonb, p_matches jsonb, p_now timestamptz)
returns jsonb
language plpgsql
stable
set search_path to 'public', 'pg_catalog'
as $$
declare
  result jsonb := '[]'::jsonb;
  m jsonb;
  abs0 jsonb;
  abs1 jsonb;
  n0 integer;
  n1 integer;
  gone0 boolean;
  gone1 boolean;
  side integer;
  rec jsonb;
begin
  for m in select value from jsonb_array_elements(coalesce(p_matches, '[]'::jsonb)) loop
    abs0 := public._cup_absent_players(p_state, m->'teamOne');
    abs1 := public._cup_absent_players(p_state, m->'teamTwo');
    n0 := jsonb_array_length(abs0);
    n1 := jsonb_array_length(abs1);
    if (n0 = 0 and n1 = 0) or m->>'state' is distinct from 'waiting' then
      result := result || jsonb_build_array(m);
      continue;
    end if;
    gone0 := n0 > 0 and n0 >= jsonb_array_length(coalesce(m->'teamOne'->'players', '[]'::jsonb));
    gone1 := n1 > 0 and n1 >= jsonb_array_length(coalesce(m->'teamTwo'->'players', '[]'::jsonb));

    if (gone0 and gone1) or (n0 > 0 and n1 > 0 and not gone0 and not gone1) then
      rec := public._cup_absent_record(m->'teamOne', abs0->0, 0, p_now)
        || jsonb_build_object('bothSides', true, 'secondAbsent', jsonb_build_object('id', abs1->0->>'id', 'name', abs1->0->>'name', 'accent', abs1->0->'accent'));
      m := jsonb_set(m, '{withdrawal}', rec, true);
      m := jsonb_set(m, '{state}', '"cancelled"'::jsonb, true);
      m := jsonb_set(m, '{status}', '"cancelled"'::jsonb, true);
    elsif gone0 or gone1 then
      side := case when gone0 then 0 else 1 end;
      rec := public._cup_absent_record(case when side = 0 then m->'teamOne' else m->'teamTwo' end, case when side = 0 then abs0->0 else abs1->0 end, side, p_now)
        || jsonb_build_object('status', 'walkover', 'decidedBy', 'auto', 'decidedAt', p_now);
      m := jsonb_set(m, '{withdrawal}', rec, true);
      m := jsonb_set(m, '{state}', '"finished"'::jsonb, true);
      m := jsonb_set(m, '{status}', '"completed"'::jsonb, true);
      m := jsonb_set(m, '{completedSets}', '[]'::jsonb, true);
      m := jsonb_set(m, '{currentSet}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
      m := jsonb_set(m, '{currentGame}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
      m := jsonb_set(m, '{winnerTeamIndex}', to_jsonb(1 - side), true);
      m := jsonb_set(m, '{isWalkover}', 'true'::jsonb, true);
      m := jsonb_set(m, '{completedAt}', to_jsonb(p_now), true);
    else
      side := case when n0 > 0 then 0 else 1 end;
      rec := public._cup_absent_record(case when side = 0 then m->'teamOne' else m->'teamTwo' end, case when side = 0 then abs0->0 else abs1->0 end, side, p_now);
      m := jsonb_set(m, '{withdrawal}', rec, true);
      m := jsonb_set(m, '{state}', '"awaitingWithdrawalDecision"'::jsonb, true);
      m := jsonb_set(m, '{status}', '"blocked"'::jsonb, true);
    end if;
    result := result || jsonb_build_array(m);
  end loop;
  return result;
end;
$$;

create or replace function public.admin_advance_cup_impl(p_tournament_id uuid, p_admin_token text, p_expected_revision integer, p_confirm_lucky_loser boolean default false)
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
  lucky jsonb;
  lucky_teams jsonb := '[]'::jsonb;
  lucky_index integer := 0;
  lucky_round_number integer;
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

  -- Both sides of a match withdrew (the match is cancelled): the best-placed losing team of the round takes the place,
  -- and only after the admin has confirmed it.
  lucky := public._cup_lucky_losers(current_state, previous_round, rounds);
  lucky_teams := lucky->'teams';
  if jsonb_array_length(lucky_teams) > 0 and not coalesce(p_confirm_lucky_loser, false) then
    raise exception 'Lucky loser confirmation required';
  end if;
  lucky_round_number := coalesce(next_round_number, previous_round_number + 1);

  if jsonb_array_length(matches) > 0 then
    for match_index in 0..(jsonb_array_length(matches) - 1) loop
      match_item := matches->match_index;
      if match_item->>'state' = 'cancelled'
        and coalesce((match_item->'withdrawal'->>'bothSides')::boolean, false)
        and coalesce(match_item->>'isThirdPlaceMatch', 'false') <> 'true'
        and lucky_index < jsonb_array_length(lucky_teams) then
        advancing_teams := advancing_teams || jsonb_build_array(
          (lucky_teams->lucky_index) || jsonb_build_object('luckyLoserRound', lucky_round_number)
        );
        lucky_index := lucky_index + 1;
      end if;
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

  if jsonb_array_length(lucky_teams) > 0 then
    losing_teams := coalesce((
      select jsonb_agg(l.value order by l.ordinality)
      from jsonb_array_elements(losing_teams) with ordinality l(value, ordinality)
      where not exists (select 1 from jsonb_array_elements(lucky_teams) lt where lt->>'id' = l.value->>'id')
    ), '[]'::jsonb);
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

  -- players who withdrew earlier: their matches wait for the teammate's decision, are won by walkover or cancelled
  matches := public._cup_apply_withdrawals(current_state, matches, now());

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

create or replace function public.admin_advance_cup(
  p_tournament_id uuid,
  p_admin_token text,
  p_expected_revision integer,
  p_confirm_lucky_loser boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid cup advance payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_advance_cup_impl(p_tournament_id, p_admin_token, p_expected_revision, coalesce(p_confirm_lucky_loser, false));
end;
$$;


revoke all on function public._cup_absent_players(jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._cup_absent_record(jsonb, jsonb, integer, timestamptz) from public, anon, authenticated;
revoke all on function public._cup_games_difference(jsonb, text) from public, anon, authenticated;
revoke all on function public._cup_lucky_losers(jsonb, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public._cup_apply_withdrawals(jsonb, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.admin_advance_cup_impl(uuid, text, integer, boolean) from public, anon, authenticated;
revoke all on function public.admin_advance_cup(uuid, text, integer, boolean) from public, anon, authenticated;
grant execute on function public.admin_advance_cup(uuid, text, integer, boolean) to anon, authenticated;
