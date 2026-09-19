-- Phase 11: result approval (approved spec: docs/archive/plans/Padelstar_v1_0_0_plan.md, FASE I).
-- REQUIRES migration 20260919120000_match_scorer_lease.sql (apply in order; that file also holds the shared
-- helpers _approval_team_of and _approval_finalize).
--
-- Flow
--   * The winning point of a player-scored match makes the match `awaitingApproval` with
--     approval.status = 'draft' (done in save_player_point_impl). The court is freed at once: the next
--     waiting match starts. Standings, statistics and round advance only count `finished` matches, so an
--     unapproved result waits ("dependent progression waits for the authoritative result").
--   * The active scorer explicitly submits the result (action `submit`). The scorer counts as approving
--     their own team. A team without any player that has a device (no player session) is auto-approved.
--     As soon as at least one player of each team has approved, the match becomes `finished`.
--   * The opponents can `approve`, or `dispute`. A dispute with a corrected proposal (`completedSets`)
--     resets all approvals (only the proposer's team has approved), restarts both timers and counts as a
--     correction; after two player corrections the next dispute flags the match for the admin. A dispute
--     without a proposal flags the match for the admin immediately.
--   * 10 minutes after submission the admin is alerted (approval.escalatedAt, shown in the admin UI).
--     30 minutes after submission an undisputed result is approved automatically. Auto-approval never runs
--     for flagged results. Drafts that are never submitted follow the same clock from the end of the match.
--   * The admin can approve any awaiting result (`admin_resolve_result`), or correct it with the existing
--     admin undo and re-score.
--   * Admin scoring / admin set-result are unchanged and finish a match immediately.
--
-- Timers are processed by process_result_approvals(), scheduled every minute with pg_cron.

-- ---------------------------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------------------------

-- True when both teams have at least one approval.
create or replace function public._approval_complete(p_approval jsonb)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
  select exists (select 1 from jsonb_array_elements(coalesce(p_approval->'approvals', '[]'::jsonb)) a where (a->>'teamIndex')::integer = 0)
     and exists (select 1 from jsonb_array_elements(coalesce(p_approval->'approvals', '[]'::jsonb)) a where (a->>'teamIndex')::integer = 1);
$function$;

-- Validates a corrected result proposed by a player. Returns the winner (0/1) or raises.
create or replace function public._approval_validate_proposal(p_sets jsonb, p_games_to_win_set integer, p_sets_to_win_match integer)
returns integer
language plpgsql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
declare
  entry jsonb;
  one integer;
  two integer;
  hi integer;
  lo integer;
  wins_one integer := 0;
  wins_two integer := 0;
begin
  if jsonb_typeof(p_sets) is distinct from 'array'
    or jsonb_array_length(p_sets) < 1
    or jsonb_array_length(p_sets) > (2 * p_sets_to_win_match - 1) then
    raise exception 'Invalid corrected result';
  end if;
  for entry in select value from jsonb_array_elements(p_sets) loop
    if jsonb_typeof(entry) is distinct from 'object'
      or jsonb_typeof(entry->'teamOne') is distinct from 'number'
      or jsonb_typeof(entry->'teamTwo') is distinct from 'number' then
      raise exception 'Invalid corrected result';
    end if;
    one := (entry->>'teamOne')::integer;
    two := (entry->>'teamTwo')::integer;
    hi := greatest(one, two);
    lo := least(one, two);
    -- same shapes the score engine accepts for a finished set (6-x with 2 margin, 7-5, 7-6)
    if not ((hi = p_games_to_win_set and hi - lo >= 2)
      or (hi = p_games_to_win_set + 1 and lo in (p_games_to_win_set - 1, p_games_to_win_set))) then
      raise exception 'Invalid corrected result';
    end if;
    if one > two then wins_one := wins_one + 1; else wins_two := wins_two + 1; end if;
  end loop;
  if greatest(wins_one, wins_two) <> p_sets_to_win_match or least(wins_one, wins_two) >= p_sets_to_win_match then
    raise exception 'Invalid corrected result';
  end if;
  return case when wins_one > wins_two then 0 else 1 end;
end
$function$;

revoke execute on function public._approval_complete(jsonb) from public, anon, authenticated;
revoke execute on function public._approval_validate_proposal(jsonb, integer, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Player actions: submit | approve | dispute
-- ---------------------------------------------------------------------------------------------

create or replace function public.match_result_action_impl(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_player_token text,
  p_action text,
  p_payload jsonb default null
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
  approval jsonb;
  my_team integer;
  team integer;
  approvals jsonb;
  winner integer;
  corrections integer;
  games_to_win_set integer;
  sets_to_win_match integer;
  now_ts timestamptz := now();
begin
  if p_tournament_id is null or p_invite_code is null or p_player_id is null or p_match_id is null
    or p_player_token is null or length(trim(p_player_token)) < 32
    or p_action is null or p_action not in ('submit', 'approve', 'dispute') then
    raise exception 'Invalid result payload';
  end if;

  if not exists (
    select 1 from public.player_sessions
    where tournament_id = p_tournament_id
      and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player token mismatch';
  end if;

  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id and invite_code = upper(trim(p_invite_code))
  for update;
  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  select l.r_idx, l.m_idx into r_idx, m_idx from public._scorer_locate(current_state, p_match_id) l;
  if r_idx is null then
    raise exception 'Match not found';
  end if;
  match_item := current_state->'rounds'->r_idx->'matches'->m_idx;
  my_team := public._approval_team_of(match_item, p_player_id);
  if my_team is null then
    raise exception 'Player is not part of this match';
  end if;
  if match_item->>'state' <> 'awaitingApproval' then
    raise exception 'Match is not awaiting approval';
  end if;
  approval := match_item->'approval';
  approvals := coalesce(approval->'approvals', '[]'::jsonb);

  if p_action = 'submit' then
    if approval->>'status' <> 'draft' then
      raise exception 'Result already submitted';
    end if;
    if match_item->'scorer'->>'playerId' is distinct from p_player_id::text then
      raise exception 'Only the active scorer can submit the result';
    end if;
    approvals := jsonb_build_array(jsonb_build_object('playerId', p_player_id, 'teamIndex', my_team, 'at', now_ts, 'submitter', true));
    -- A team without a single player that has a device cannot approve: it is approved automatically.
    for team in 0..1 loop
      if team <> my_team and not exists (
        select 1
        from jsonb_array_elements(coalesce(match_item->(case when team = 0 then 'teamOne' else 'teamTwo' end)->'players', '[]'::jsonb)) pl
        join public.player_sessions ps on ps.tournament_id = p_tournament_id and ps.player_id::text = pl->>'id'
      ) then
        approvals := approvals || jsonb_build_array(jsonb_build_object('playerId', null, 'teamIndex', team, 'at', now_ts, 'auto', true, 'reason', 'no_device'));
      end if;
    end loop;
    approval := approval || jsonb_build_object(
      'status', 'pending', 'submittedBy', p_player_id, 'submittedAt', now_ts, 'approvals', approvals,
      'escalateAt', now_ts + interval '10 minutes', 'autoApproveAt', now_ts + interval '30 minutes') - 'escalatedAt';

  elsif p_action = 'approve' then
    if approval->>'status' = 'flagged' then
      raise exception 'Result is flagged for admin review';
    end if;
    if approval->>'status' <> 'pending' then
      raise exception 'Result has not been submitted yet';
    end if;
    if not exists (select 1 from jsonb_array_elements(approvals) a where a->>'playerId' = p_player_id::text) then
      approvals := approvals || jsonb_build_array(jsonb_build_object('playerId', p_player_id, 'teamIndex', my_team, 'at', now_ts));
    end if;
    approval := jsonb_set(approval, '{approvals}', approvals, true);

  else -- dispute
    if approval->>'status' <> 'pending' then
      raise exception 'Result is not open for dispute';
    end if;
    if p_payload is not null and jsonb_typeof(p_payload->'completedSets') = 'array' then
      games_to_win_set := coalesce((match_item->'rules'->>'gamesToWinSet')::integer, (current_state->'settings'->>'gamesToWinSet')::integer, 6);
      sets_to_win_match := coalesce((match_item->'rules'->>'setsToWinMatch')::integer, (current_state->'settings'->>'setsToWinMatch')::integer, 1);
      winner := public._approval_validate_proposal(p_payload->'completedSets', games_to_win_set, sets_to_win_match);
      corrections := coalesce((approval->>'corrections')::integer, 0) + 1;
      if corrections > 2 then
        -- Two player corrections are the limit: the admin has to decide.
        approval := approval || jsonb_build_object('status', 'flagged', 'flag', 'corrections', 'corrections', corrections, 'disputedBy', p_player_id, 'flaggedAt', now_ts);
      else
        approval := approval || jsonb_build_object(
          'status', 'pending', 'completedSets', p_payload->'completedSets', 'winnerTeamIndex', winner,
          'corrections', corrections, 'submittedBy', p_player_id, 'submittedAt', now_ts, 'correctedBy', p_player_id,
          'approvals', jsonb_build_array(jsonb_build_object('playerId', p_player_id, 'teamIndex', my_team, 'at', now_ts, 'proposer', true)),
          'escalateAt', now_ts + interval '10 minutes', 'autoApproveAt', now_ts + interval '30 minutes') - 'escalatedAt';
      end if;
    else
      approval := approval || jsonb_build_object('status', 'flagged', 'flag', 'disputed', 'disputedBy', p_player_id, 'flaggedAt', now_ts);
    end if;
  end if;

  match_item := jsonb_set(match_item, '{approval}', approval, true);
  if approval->>'status' = 'pending' and public._approval_complete(approval) then
    match_item := public._approval_finalize(match_item, false, to_jsonb(p_player_id));
  end if;

  current_state := jsonb_set(current_state, array['rounds', r_idx::text, 'matches', m_idx::text], match_item, false);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state, revision = current_revision
  where id = p_tournament_id and revision = current_revision - 1;
  return current_state;
end
$function$;

create or replace function public.match_result_action(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_player_token text,
  p_action text,
  p_payload jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_player_token is null or trim(p_player_token) !~ '^[0-9a-f]{48}$' then
    raise exception 'Invalid result payload';
  end if;
  if not public.consume_api_rate_limit('player-result:' || trim(p_player_token), 60, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.match_result_action_impl(p_tournament_id, p_invite_code, p_player_id, p_match_id, p_player_token, p_action, p_payload);
end
$function$;

revoke execute on function public.match_result_action_impl(uuid, text, uuid, uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.match_result_action(uuid, text, uuid, uuid, text, text, jsonb) from public;
grant execute on function public.match_result_action(uuid, text, uuid, uuid, text, text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Admin: approve any awaiting result as it stands.
-- (To change a result the admin undoes it with admin_undo_match and scores it again.)
-- ---------------------------------------------------------------------------------------------

create or replace function public.admin_resolve_result_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
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
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16
    or p_match_id is null or p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Invalid result payload';
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

  select l.r_idx, l.m_idx into r_idx, m_idx from public._scorer_locate(current_state, p_match_id) l;
  if r_idx is null then
    raise exception 'Match not found';
  end if;
  match_item := current_state->'rounds'->r_idx->'matches'->m_idx;
  if match_item->>'state' <> 'awaitingApproval' then
    raise exception 'Match is not awaiting approval';
  end if;

  match_item := public._approval_finalize(match_item, false, '"admin"'::jsonb);
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

create or replace function public.admin_resolve_result(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid result payload';
  end if;
  if not public.consume_api_rate_limit('admin-result:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.admin_resolve_result_impl(p_tournament_id, p_admin_token, p_match_id, p_expected_revision);
end
$function$;

revoke execute on function public.admin_resolve_result_impl(uuid, text, uuid, integer) from public, anon, authenticated;
revoke execute on function public.admin_resolve_result(uuid, text, uuid, integer) from public;
grant execute on function public.admin_resolve_result(uuid, text, uuid, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- Timers: 10 minutes -> admin alert, 30 minutes -> auto-approval (never for flagged results).
-- ---------------------------------------------------------------------------------------------

create or replace function public.process_result_approvals()
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  t record;
  new_state jsonb;
  r_idx integer;
  m_idx integer;
  match_item jsonb;
  approval jsonb;
  changed boolean;
  touched integer := 0;
begin
  for t in
    select id, state, revision
    from public.tournaments
    where state @? '$.rounds[*].matches[*] ? (@.state == "awaitingApproval")'
    for update skip locked
  loop
    new_state := t.state;
    changed := false;
    for r_idx in 0..(jsonb_array_length(coalesce(new_state->'rounds', '[]'::jsonb)) - 1) loop
      for m_idx in 0..(jsonb_array_length(coalesce(new_state->'rounds'->r_idx->'matches', '[]'::jsonb)) - 1) loop
        match_item := new_state->'rounds'->r_idx->'matches'->m_idx;
        if match_item->>'state' <> 'awaitingApproval' then
          continue;
        end if;
        approval := match_item->'approval';
        if approval->>'status' in ('draft', 'pending')
          and (approval->>'autoApproveAt')::timestamptz <= now() then
          match_item := public._approval_finalize(match_item, true, '"auto"'::jsonb);
          new_state := jsonb_set(new_state, array['rounds', r_idx::text, 'matches', m_idx::text], match_item, false);
          changed := true;
        elsif approval->>'escalatedAt' is null
          and approval->>'status' in ('draft', 'pending')
          and (approval->>'escalateAt')::timestamptz <= now() then
          match_item := jsonb_set(match_item, '{approval,escalatedAt}', to_jsonb(now()), true);
          new_state := jsonb_set(new_state, array['rounds', r_idx::text, 'matches', m_idx::text], match_item, false);
          changed := true;
        end if;
      end loop;
    end loop;
    if changed then
      new_state := jsonb_set(new_state, '{revision}', to_jsonb(t.revision + 1), true);
      update public.tournaments set state = new_state, revision = t.revision + 1 where id = t.id;
      touched := touched + 1;
    end if;
  end loop;
  return touched;
end
$function$;

revoke execute on function public.process_result_approvals() from public, anon, authenticated;

do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('padelstar-result-approvals', '* * * * *', 'select public.process_result_approvals();');
  end if;
end
$schedule$;
