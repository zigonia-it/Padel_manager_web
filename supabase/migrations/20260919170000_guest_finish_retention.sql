-- Phase 16 / 19: a finished or cancelled guest tournament is kept read-only for 24 hours.
-- (Approved plan FASE P1: "Avsluttet/avbrutt guest-owned turnering beholdes 24 timer", statistics are saved
-- first, final standings/matches stay viewable, no new results, data is deleted after 24 hours.)
--
-- Before: finalize_tournament deleted a guest tournament immediately, so TV Mode / spectators / other devices
-- could not show the final result. Now finalize_tournament keeps the row (state = the finalised snapshot,
-- read-only through guard_tournament_finalization_update) with retention_expires_at = finish + 24 hours;
-- cleanup_expired_tournaments() (nightly, see 20260919090500) deletes it once that time has passed.
-- Statistics for account-linked players are still written in the same transaction, and the finalization
-- receipt is still written before anything can be deleted (guard_tournament_history_deletion).
--
-- Same as the live definition except for the marked changes.

create or replace function public.finalize_tournament(
  p_tournament_id uuid,
  p_admin_token text,
  p_expected_revision integer,
  p_outcome text default 'completed'
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  t public.tournaments; receipt public.tournament_finalization_receipts;
  binding record; m jsonb; s jsonb; terminal jsonb; round_value jsonb;
  updated_rounds jsonb := '[]'; updated_matches jsonb;
  side integer; n_matches integer; n_wins integer; n_sets integer; n_games integer;
  token_hash text; terminal_time timestamptz := now();
begin
  if p_tournament_id is null or length(coalesce(p_admin_token, '')) < 16
    or p_expected_revision is null or p_expected_revision < 0
    or p_outcome is null or p_outcome not in ('completed', 'cancelled') then
    raise exception 'Invalid finalization payload';
  end if;
  token_hash := encode(extensions.digest(p_admin_token, 'sha256'), 'hex');
  -- Serializes retries including those arriving after the tournament is deleted.
  perform pg_advisory_xact_lock(hashtextextended(p_tournament_id::text, 0));
  select * into receipt from public.tournament_finalization_receipts where tournament_id = p_tournament_id;
  if found then
    if receipt.admin_token_hash <> token_hash then raise exception 'Admin token mismatch'; end if;
    select state into terminal from public.tournaments where id = p_tournament_id;
    return jsonb_build_object('id', p_tournament_id, 'outcome', receipt.outcome,
      'deleted', receipt.deleted, 'statisticsSaved', true, 'revision', receipt.revision, 'state', terminal);
  end if;
  select * into t from public.tournaments where id = p_tournament_id for update;
  if not found or t.admin_token <> p_admin_token then raise exception 'Admin token mismatch or tournament not found'; end if;
  if t.revision <> p_expected_revision then raise exception 'Tournament state changed'; end if;

  -- Derive all account statistics from the same locked final snapshot. Any
  -- invalid data or write failure aborts this transaction.
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
    insert into public.account_tournament_statistics values
      (binding.user_id, t.id, terminal_time, p_outcome, n_matches, n_wins, n_sets, n_games);
  end loop;

  for round_value in select value from jsonb_array_elements(coalesce(t.state->'rounds', '[]')) loop
    select coalesce(jsonb_agg(case when value->>'state' = 'finished' then value else
      value || '{"state":"cancelled","status":"cancelled"}'::jsonb end), '[]') into updated_matches
      from jsonb_array_elements(coalesce(round_value->'matches', '[]'));
    updated_rounds := updated_rounds || jsonb_build_array(round_value || jsonb_build_object('status', 'completed', 'matches', updated_matches));
  end loop;
  terminal := (t.state - 'adminToken' - 'playerToken' - 'selectedPlayerId') || jsonb_build_object(
    'status', 'Avsluttet', 'lifecycleStatus', p_outcome, 'endedAt', terminal_time,
    'ownerUserId', t.owner_user_id, 'revision', t.revision + 1, 'rounds', updated_rounds);
  -- CHANGED: the receipt no longer says "deleted" for guests, the row stays for 24 hours.
  insert into public.tournament_finalization_receipts values
    (t.id, token_hash, p_outcome, t.revision + 1, false, terminal_time);
  -- CHANGED: guests are kept read-only for 24 hours instead of being deleted at once;
  -- account-owned tournaments keep their existing behaviour (kept, no expiry).
  update public.tournaments set state = terminal, revision = t.revision + 1,
    ended_at = terminal_time,
    retention_expires_at = case when t.owner_user_id is null then terminal_time + interval '24 hours' else null end
  where id = t.id;
  return jsonb_build_object('id', t.id, 'outcome', p_outcome, 'deleted', false,
    'statisticsSaved', true, 'revision', t.revision + 1, 'state', terminal);
end $function$;

-- Keep the grants of the live function (callable by the API roles, token-checked inside).
revoke execute on function public.finalize_tournament(uuid, text, integer, text) from public;
grant execute on function public.finalize_tournament(uuid, text, integer, text) to anon, authenticated;
