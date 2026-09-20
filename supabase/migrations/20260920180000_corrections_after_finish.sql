-- Corrections after the tournament is finished (developer decision 2026-09-20): a result can still be corrected by the admin,
-- and the account statistics are recalculated from the corrected results in the same transaction.
--
--  * guard_tournament_finalization_update: a finished tournament stays read-only except for one transaction-local switch that only
--    admin_correct_result_impl sets, and even then only the results (rounds) and the revision may differ.
--  * _recompute_account_statistics: the same counting rules as finalize_tournament, applied to the existing statistics rows.
--  * admin_correct_result_impl: no longer refuses a finished tournament (a cancelled one stays closed). Same as the live
--    definition otherwise.

create or replace function public.guard_tournament_finalization_update()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if old.state->>'status' = 'Avsluttet' and new.state is distinct from old.state then
    if coalesce(current_setting('app.finished_correction', true), '') = 'on'
      and new.state->>'status' = 'Avsluttet'
      and (new.state - 'rounds' - 'revision') is not distinct from (old.state - 'rounds' - 'revision') then
      null; -- a correction of results: allowed
    else
      raise exception 'Finalized tournament is read-only';
    end if;
  end if;
  if new.state->>'status' = 'Avsluttet' and old.state->>'status' is distinct from 'Avsluttet'
    and not exists(select 1 from public.tournament_finalization_receipts where tournament_id = old.id) then
    raise exception 'Use finalize_tournament to save statistics before completion';
  end if;
  return new;
end $function$;

create or replace function public._recompute_account_statistics(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  t public.tournaments; binding record; m jsonb; s jsonb; side integer;
  n_matches integer; n_wins integer; n_sets integer; n_games integer;
begin
  select * into t from public.tournaments where id = p_tournament_id;
  if not found then return; end if;
  for binding in select * from public.tournament_account_players where tournament_id = t.id loop
    n_matches := 0; n_wins := 0; n_sets := 0; n_games := 0;
    for m in select match_value from jsonb_array_elements(coalesce(t.state->'rounds', '[]')) r,
      lateral jsonb_array_elements(coalesce(r->'matches', '[]')) match_value loop
      if m->>'state' <> 'finished' then continue; end if;
      side := null;
      if exists(select 1 from jsonb_array_elements(coalesce(m#>'{teamOne,players}', '[]')) p where p->>'id' = binding.player_id::text) then side := 0;
      elsif exists(select 1 from jsonb_array_elements(coalesce(m#>'{teamTwo,players}', '[]')) p where p->>'id' = binding.player_id::text) then side := 1;
      end if;
      if side is null then continue; end if;
      n_matches := n_matches + 1;
      if (m->>'winnerTeamIndex')::integer = side then n_wins := n_wins + 1; end if;
      for s in select value from jsonb_array_elements(coalesce(m->'completedSets', '[]')) loop
        if (s->>'teamOne')::integer < 0 or (s->>'teamTwo')::integer < 0 then raise exception 'Invalid set score'; end if;
        if side = 0 then
          n_games := n_games + (s->>'teamOne')::integer;
          if (s->>'teamOne')::integer > (s->>'teamTwo')::integer then n_sets := n_sets + 1; end if;
        else
          n_games := n_games + (s->>'teamTwo')::integer;
          if (s->>'teamTwo')::integer > (s->>'teamOne')::integer then n_sets := n_sets + 1; end if;
        end if;
      end loop;
    end loop;
    -- wins can never exceed matches (a table constraint): a corrected result keeps that true by construction
    update public.account_tournament_statistics
      set matches = n_matches, wins = n_wins, sets = n_sets, games = n_games
      where user_id = binding.user_id and tournament_id = t.id;
  end loop;
end
$function$;
revoke execute on function public._recompute_account_statistics(uuid) from public, anon, authenticated;

create or replace function public.admin_correct_result_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_completed_sets jsonb,
  p_reason text,
  p_comment text,
  p_displayed_level text,
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
  old_winner integer;
  new_winner integer;
  games_to_win_set integer;
  sets_to_win_match integer;
  entry jsonb;
  finished boolean;
  updated integer;
  clean_comment text := nullif(trim(coalesce(p_comment, '')), '');
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16
    or p_match_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid correction payload';
  end if;
  if p_reason is null or p_reason not in ('entryError', 'wrongTeam', 'playersAgreed', 'refereeDecision', 'restore', 'other') then
    raise exception 'A valid reason is required';
  end if;
  if p_reason = 'other' and clean_comment is null then
    raise exception 'A comment is required when the reason is Other';
  end if;
  if clean_comment is not null and length(clean_comment) > 500 then
    raise exception 'The comment is too long';
  end if;
  if p_displayed_level is not null and p_displayed_level not in ('green', 'yellow', 'orange', 'red') then
    raise exception 'Invalid correction payload';
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
  finished := current_state->>'status' = 'Avsluttet';
  -- After the tournament is finished a result can still be corrected (and the statistics follow), except in a cancelled tournament.
  if finished and current_state->>'lifecycleStatus' = 'cancelled' then
    raise exception 'Corrections are closed for a cancelled tournament';
  end if;

  select l.r_idx, l.m_idx into r_idx, m_idx from public._scorer_locate(current_state, p_match_id) l;
  if r_idx is null then
    raise exception 'Match not found';
  end if;
  match_item := current_state->'rounds'->r_idx->'matches'->m_idx;
  if match_item->>'state' <> 'finished' then
    raise exception 'Only finished results can be corrected';
  end if;

  games_to_win_set := coalesce((match_item->'rules'->>'gamesToWinSet')::integer, (current_state->'settings'->>'gamesToWinSet')::integer, 6);
  sets_to_win_match := coalesce((match_item->'rules'->>'setsToWinMatch')::integer, (current_state->'settings'->>'setsToWinMatch')::integer, 1);
  new_winner := public._approval_validate_proposal(p_completed_sets, games_to_win_set, sets_to_win_match);
  old_winner := (match_item->>'winnerTeamIndex')::integer;

  if match_item->'completedSets' = p_completed_sets and old_winner is not distinct from new_winner then
    raise exception 'The corrected result is the same as the current result';
  end if;

  -- Later matches that already depend on this result are protected.
  if new_winner is distinct from old_winner
    and current_state->'settings'->>'format' = 'cup'
    and exists (
      select 1 from jsonb_array_elements(coalesce(current_state->'rounds', '[]'::jsonb)) with ordinality as r(value, ordinality)
      where r.ordinality - 1 > r_idx and jsonb_array_length(coalesce(r.value->'matches', '[]'::jsonb)) > 0
    ) then
    raise exception 'Later matches already depend on this result';
  end if;

  entry := jsonb_build_object(
    'at', now(),
    'by', 'admin',
    'reason', p_reason,
    'comment', clean_comment,
    'level', p_displayed_level,
    'winnerChanged', new_winner is distinct from old_winner,
    'before', jsonb_build_object('completedSets', match_item->'completedSets', 'winnerTeamIndex', match_item->'winnerTeamIndex'),
    'after', jsonb_build_object('completedSets', p_completed_sets, 'winnerTeamIndex', new_winner));
  match_item := public._scorer_append(match_item, 'correctionHistory', entry, 50);
  match_item := jsonb_set(match_item, '{completedSets}', p_completed_sets, true);
  match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(new_winner), true);
  match_item := jsonb_set(match_item, '{correctedAt}', to_jsonb(now()), true);
  -- a time-ended match keeps its history, but the corrected sets now decide the winner
  match_item := match_item - 'timeWinnerTeamIndex';
  if jsonb_typeof(match_item->'approval') = 'object' then
    match_item := jsonb_set(match_item, '{approval,completedSets}', p_completed_sets, true);
    match_item := jsonb_set(match_item, '{approval,winnerTeamIndex}', to_jsonb(new_winner), true);
  end if;

  current_state := jsonb_set(current_state, array['rounds', r_idx::text, 'matches', m_idx::text], match_item, false);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  -- the read-only guard on finished tournaments lets exactly this change through (results and revision only)
  if finished then perform set_config('app.finished_correction', 'on', true); end if;
  update public.tournaments
  set state = current_state, revision = current_revision
  where id = p_tournament_id and revision = p_expected_revision;
  get diagnostics updated = row_count;
  if finished then perform set_config('app.finished_correction', 'off', true); end if;
  if updated = 0 then
    raise exception 'Tournament state changed or not found';
  end if;
  if finished then perform public._recompute_account_statistics(p_tournament_id); end if;
  return current_state;
end
$function$;

revoke execute on function public.admin_correct_result_impl(uuid, text, uuid, jsonb, text, text, text, integer) from public, anon, authenticated;
