-- Fix: admin_undo_match_impl's per-entry "source_revision + 1" check (carried
-- over verbatim from the old single-snapshot admin_undo_match_impl in
-- 20260918083449_match_undo_stack.sql) assumed every undo-stack push maps to
-- exactly one server revision increment. That held for the old model (at most
-- one pending undo, always freshly captured), but not for the new multi-entry
-- stack: app/core/remote-sync-controller.js's queueRemoteSave() debounces
-- admin point-award saves by 350ms, so several rapid client-side
-- captureMatchUndoState() pushes can share the SAME locally-known revision
-- (state.revision only advances after a save round-trip completes), while
-- still representing distinct, individually poppable game states. Popping an
-- older entry after even one successful undo then fails this check with
-- "Tournament state changed or not found", even though nothing actually
-- conflicted. Reproduced live: award 3 points in quick succession (one
-- coalesced save), undo once (succeeds), undo again (fails this check).
--
-- Fix: drop the per-entry revision-continuity check entirely. The function's
-- primary p_expected_revision = current_revision check (unchanged, still
-- first thing checked) already provides the real optimistic-concurrency
-- guard against a conflicting write from another admin/session, using the
-- client's own live-tracked revision rather than a stale per-push snapshot.
-- The unrelated "next waiting match hasn't since been played on" check a few
-- lines below is untouched -- it protects a different invariant and remains
-- correct for the stack model.
create or replace function public.admin_undo_match_impl(p_tournament_id uuid, p_admin_token text, p_match_id uuid, p_expected_revision integer)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  current_state jsonb;
  current_revision integer;
  rounds jsonb;
  round_item jsonb;
  matches jsonb;
  match_item jsonb;
  undo_stack jsonb;
  popped_stack jsonb;
  undo_state jsonb;
  restored_match jsonb;
  next_waiting_match jsonb;
  existing_next_match jsonb;
  round_index integer;
  match_index integer;
  next_waiting_index integer;
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

      undo_stack := match_item->'undoStack';
      if jsonb_typeof(undo_stack) <> 'array' or jsonb_array_length(undo_stack) = 0 then
        raise exception 'No undo available for this match';
      end if;
      undo_state := undo_stack->(jsonb_array_length(undo_stack) - 1);
      if undo_state is null
        or jsonb_typeof(undo_state) <> 'object'
        or jsonb_typeof(undo_state->'match') <> 'object' then
        raise exception 'No undo available for this match';
      end if;
      popped_stack := undo_stack - (jsonb_array_length(undo_stack) - 1);

      restored_match := (undo_state->'match')::jsonb - 'undoStack'::text;
      if restored_match->>'id' <> p_match_id::text then
        raise exception 'Invalid undo state';
      end if;
      restored_match := jsonb_set(restored_match, '{undoStack}', popped_stack, true);
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
          or jsonb_array_length(coalesce(existing_next_match->'undoStack', '[]'::jsonb)) > 0 then
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
$function$;
