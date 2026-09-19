-- Phase 13: a player withdraws without a replacement.
--
-- The client marks the withdrawn player and puts each of their unplayed matches in the state
-- `awaitingWithdrawalDecision` (status `blocked`) with `match.withdrawal = { playerId, teamIndex, teammateId,
-- absent, absentIndex, status: 'pending' }`. The remaining teammate then decides:
--
--   * `playAlone` - the teammate plays 1 against 2; the absent player is removed from the team and the
--                   match goes back to `waiting` (and starts at once when a court is free), or
--   * `walkover`  - the opponents win by walkover.
--
-- The admin can decide on the teammate's behalf through the normal admin state write, so only the teammate
-- needs this function. It is additive: it does not change any existing function, and a match in the new state
-- is invisible to every existing scheduler (they only pick `waiting` matches).

create or replace function public.match_withdrawal_decision_impl(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_player_token text,
  p_decision text
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
  withdrawal jsonb;
  team_index integer;
  team_key text;
  remaining jsonb;
  matches jsonb;
  free_court jsonb;
  now_ts timestamptz := now();
begin
  if p_tournament_id is null or p_invite_code is null or p_player_id is null or p_match_id is null
    or p_player_token is null or length(trim(p_player_token)) < 32
    or p_decision is null or p_decision not in ('playAlone', 'walkover') then
    raise exception 'Invalid withdrawal decision';
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
  if current_state->>'status' = 'Avsluttet' then
    raise exception 'The tournament is finished';
  end if;

  select l.r_idx, l.m_idx into r_idx, m_idx from public._scorer_locate(current_state, p_match_id) l;
  if r_idx is null then
    raise exception 'Match not found';
  end if;
  match_item := current_state->'rounds'->r_idx->'matches'->m_idx;
  withdrawal := match_item->'withdrawal';
  if match_item->>'state' is distinct from 'awaitingWithdrawalDecision'
    or jsonb_typeof(withdrawal) is distinct from 'object'
    or withdrawal->>'status' is distinct from 'pending' then
    raise exception 'The match is not waiting for a withdrawal decision';
  end if;
  -- only the remaining teammate decides here (the admin decides through the admin write)
  if withdrawal->>'teammateId' is distinct from p_player_id::text then
    raise exception 'Only the remaining teammate can decide';
  end if;

  team_index := (withdrawal->>'teamIndex')::integer;
  team_key := case when team_index = 0 then 'teamOne' else 'teamTwo' end;

  if p_decision = 'walkover' then
    match_item := jsonb_set(match_item, '{withdrawal}', withdrawal || jsonb_build_object('status', 'walkover', 'decidedBy', 'teammate', 'decidedAt', now_ts), true);
    match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
    match_item := jsonb_set(match_item, '{status}', '"completed"'::jsonb, true);
    match_item := jsonb_set(match_item, '{completedSets}', '[]'::jsonb, true);
    match_item := jsonb_set(match_item, '{currentSet}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
    match_item := jsonb_set(match_item, '{currentGame}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
    match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(1 - team_index), true);
    match_item := jsonb_set(match_item, '{isWalkover}', 'true'::jsonb, true);
    match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now_ts), true);
  else
    -- the team without the absent player, named the way the client names a team
    select coalesce(jsonb_agg(p.value order by p.ordinality), '[]'::jsonb)
    into remaining
    from jsonb_array_elements(match_item->team_key->'players') with ordinality as p(value, ordinality)
    where p.value->>'id' is distinct from withdrawal->>'playerId';
    if jsonb_array_length(remaining) = 0 then
      raise exception 'Nobody is left on the team';
    end if;
    match_item := jsonb_set(match_item, array[team_key, 'players'], remaining, true);
    match_item := jsonb_set(match_item, array[team_key, 'displayName'], to_jsonb((
      select string_agg(p.value->>'name', ' & ' order by p.ordinality)
      from jsonb_array_elements(remaining) with ordinality as p(value, ordinality)
    )), true);
    match_item := jsonb_set(match_item, '{withdrawal}', withdrawal || jsonb_build_object('status', 'playAlone', 'decidedBy', 'teammate', 'decidedAt', now_ts), true);
    match_item := jsonb_set(match_item, '{state}', '"waiting"'::jsonb, true);
    match_item := jsonb_set(match_item, '{status}', '"scheduled"'::jsonb, true);

    -- start at once when a court is free in this round
    matches := coalesce(current_state->'rounds'->r_idx->'matches', '[]'::jsonb);
    select c.value into free_court
    from jsonb_array_elements(coalesce(current_state->'courts', '[]'::jsonb)) with ordinality as c(value, ordinality)
    where not exists (
      select 1 from jsonb_array_elements(matches) m
      where m->>'state' = 'playing' and m->>'courtId' is not distinct from c.value->>'id'
    )
    order by c.ordinality
    limit 1;
    if free_court is not null then
      match_item := jsonb_set(match_item, '{state}', '"playing"'::jsonb, true);
      match_item := jsonb_set(match_item, '{status}', '"active"'::jsonb, true);
      match_item := jsonb_set(match_item, '{courtId}', coalesce(free_court->'id', 'null'::jsonb), true);
      match_item := jsonb_set(match_item, '{courtName}', coalesce(free_court->'name', 'null'::jsonb), true);
      match_item := jsonb_set(match_item, '{startedAtCourt}', to_jsonb(now_ts), true);
    end if;
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

create or replace function public.match_withdrawal_decision(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_player_token text,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_player_token is null or trim(p_player_token) !~ '^[0-9a-f]{48}$' then
    raise exception 'Invalid withdrawal decision';
  end if;
  if not public.consume_api_rate_limit('player-withdrawal:' || trim(p_player_token), 30, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.match_withdrawal_decision_impl(p_tournament_id, p_invite_code, p_player_id, p_match_id, p_player_token, p_decision);
end
$function$;

revoke execute on function public.match_withdrawal_decision_impl(uuid, text, uuid, uuid, text, text) from public, anon, authenticated;
revoke execute on function public.match_withdrawal_decision(uuid, text, uuid, uuid, text, text) from public;
grant execute on function public.match_withdrawal_decision(uuid, text, uuid, uuid, text, text) to anon, authenticated;
