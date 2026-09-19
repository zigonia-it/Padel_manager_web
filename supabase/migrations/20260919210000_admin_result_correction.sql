-- Phase 12: admin correction of a finished result (approved spec: docs/archive/plans/Padelstar_v1_0_0_plan.md, FASE J).
--
--   * Only the admin (admin token) can change a finished result.
--   * The old result is never overwritten: every correction is appended to match.correctionHistory
--     (who, when, reason, comment, before, after, displayed consequence level). "Restore the old result" is
--     simply another correction that uses the old sets and the reason `restore`.
--   * A reason is mandatory (standard reasons, `other` needs a comment).
--   * Atomic: one transaction, so a failure changes nothing (full rollback).
--   * Safety: later matches that already depend on the result are protected. In a Cup, a correction that changes the
--     winner is refused once a later round exists ("Already-played matches protected"). Round Robin rounds are
--     independent, so the standings are simply recalculated from the corrected matches.
--   * Corrections are closed once the tournament is finished (statistics have been saved).
--   * Matches still awaiting approval are not corrected here (approve them, or undo and re-score).
--   * Ongoing matches are never touched.
--
-- The consequence simulation (before/after standings, level green/yellow/orange/red) runs in the client with the
-- same scoring engine; this function enforces the safety rules and records the level the admin was shown.

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
  if current_state->>'status' = 'Avsluttet' then
    raise exception 'Corrections are closed once the tournament is finished';
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
  update public.tournaments
  set state = current_state, revision = current_revision
  where id = p_tournament_id and revision = p_expected_revision;
  if not found then
    raise exception 'Tournament state changed or not found';
  end if;
  return current_state;
end
$function$;

create or replace function public.admin_correct_result(
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
begin
  if p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid correction payload';
  end if;
  if not public.consume_api_rate_limit('admin-correct:' || p_admin_token, 60, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.admin_correct_result_impl(p_tournament_id, p_admin_token, p_match_id, p_completed_sets, p_reason, p_comment, p_displayed_level, p_expected_revision);
end
$function$;

revoke execute on function public.admin_correct_result_impl(uuid, text, uuid, jsonb, text, text, text, integer) from public, anon, authenticated;
revoke execute on function public.admin_correct_result(uuid, text, uuid, jsonb, text, text, text, integer) from public;
grant execute on function public.admin_correct_result(uuid, text, uuid, jsonb, text, text, text, integer) to anon, authenticated;
