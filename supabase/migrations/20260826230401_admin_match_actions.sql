create or replace function public.admin_match_action(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_action text,
  p_team_index integer,
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
            'match', match_item - 'lastScoredMatchState',
            'nextWaitingMatch', next_waiting_match,
            'roundId', round_item->'id',
            'roundStatus', round_item->'status',
            'tournamentStatus', current_state->'status',
            'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
          );
          match_item := jsonb_set(match_item, '{lastScoredMatchState}', undo_state, true);
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
$$;

revoke all on function public.admin_match_action(uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_match_action(uuid, text, uuid, text, integer, integer) to anon;
