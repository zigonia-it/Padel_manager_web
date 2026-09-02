-- Players submit result proposals; only admin result flow changes match scores.
create or replace function public.submit_match_result_impl(p_tournament_id uuid, p_invite_code text, p_player_id uuid, p_match_id uuid, p_team_one integer, p_team_two integer, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare current_state jsonb; current_revision integer; round_value jsonb; match_value jsonb; player_value jsonb; submission_value jsonb; submissions jsonb := '[]'::jsonb; events jsonb := '[]'::jsonb; match_found boolean := false; player_in_match boolean := false; next_status text := 'pending'; same_score boolean; has_submission boolean := false; has_different boolean := false; round_index integer; match_index integer;
begin
  if p_tournament_id is null or p_player_id is null or p_match_id is null or p_team_one is null or p_team_two is null or p_team_one < 0 or p_team_two < 0 or p_player_token is null then raise exception 'Invalid match result payload'; end if;
  select state, revision into current_state, current_revision from public.tournaments where id = p_tournament_id and invite_code = upper(trim(p_invite_code)) for update;
  if current_state is null then raise exception 'Tournament not found'; end if;
  if current_state->>'status' = 'Avsluttet' then raise exception 'Tournament has ended'; end if;
  if not exists (select 1 from public.player_sessions where tournament_id = p_tournament_id and player_id = p_player_id and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')) then raise exception 'Player token mismatch'; end if;
  for round_value, round_index in select value, ordinality - 1 from jsonb_array_elements(coalesce(current_state->'rounds', '[]'::jsonb)) with ordinality loop
    for match_value, match_index in select value, ordinality - 1 from jsonb_array_elements(coalesce(round_value->'matches', '[]'::jsonb)) with ordinality loop
      if match_value->>'id' = p_match_id::text then
        match_found := true;
        for player_value in select value from jsonb_array_elements(coalesce(match_value->'teamOne'->'players', '[]'::jsonb) || coalesce(match_value->'teamTwo'->'players', '[]'::jsonb)) loop
          if player_value->>'id' = p_player_id::text then player_in_match := true; end if;
        end loop;
      end if;
    end loop;
  end loop;
  if not match_found or not player_in_match then raise exception 'Player cannot submit this match result'; end if;
  submissions := coalesce(current_state->'scoreSubmissions', '[]'::jsonb);
  for submission_value in select value from jsonb_array_elements(submissions) loop
    if submission_value->>'matchId' = p_match_id::text and coalesce(submission_value->>'status', 'pending') in ('pending', 'confirmed', 'conflict') then
      same_score := (submission_value->>'teamOne')::integer = p_team_one and (submission_value->>'teamTwo')::integer = p_team_two;
      if same_score then has_submission := true; else has_different := true; end if;
    end if;
  end loop;
  if has_different then next_status := 'conflict'; elsif has_submission then next_status := 'confirmed'; end if;
  match_value := jsonb_set(match_value, '{scoreStatus}', to_jsonb(case when next_status = 'conflict' then 'score_conflict' else next_status end), true);
  current_state := jsonb_set(current_state, ARRAY['rounds', round_index::text, 'matches', match_index::text], match_value, true);
  submissions := submissions || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'matchId', p_match_id, 'teamOne', p_team_one, 'teamTwo', p_team_two, 'submittedBy', p_player_id, 'status', next_status, 'submittedAt', now()));
  current_state := jsonb_set(current_state, '{scoreSubmissions}', submissions, true);
  events := (coalesce(current_state->'events', '[]'::jsonb) || jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'tournamentId', p_tournament_id, 'eventType', 'score_submitted', 'entityType', 'match', 'entityId', p_match_id, 'actorId', p_player_id, 'payload', jsonb_build_object('teamOne', p_team_one, 'teamTwo', p_team_two, 'status', next_status), 'createdAt', now())));
  current_state := jsonb_set(current_state, '{events}', (select jsonb_agg(value) from jsonb_array_elements(events) with ordinality where ordinality > greatest(0, jsonb_array_length(events) - 200)), true);
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision + 1), true);
  update public.tournaments set state = current_state, revision = current_revision + 1, updated_at = now() where id = p_tournament_id;
  return current_state;
end; $$;

create or replace function public.submit_match_result(p_tournament_id uuid, p_invite_code text, p_player_id uuid, p_match_id uuid, p_team_one integer, p_team_two integer, p_player_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if p_player_token is null or trim(p_player_token) !~ '^[0-9a-f]{48}$' then raise exception 'Invalid player result payload'; end if;
  if not public.consume_api_rate_limit('player-result:' || trim(p_player_token), 60, 60) then raise exception 'Rate limit exceeded'; end if;
  return public.submit_match_result_impl(p_tournament_id, p_invite_code, p_player_id, p_match_id, p_team_one, p_team_two, p_player_token);
end; $$;

revoke all on function public.submit_match_result_impl(uuid, text, uuid, uuid, integer, integer, text) from public, anon, authenticated;
revoke all on function public.submit_match_result(uuid, text, uuid, uuid, integer, integer, text) from public, authenticated;
grant execute on function public.submit_match_result(uuid, text, uuid, uuid, integer, integer, text) to anon;
