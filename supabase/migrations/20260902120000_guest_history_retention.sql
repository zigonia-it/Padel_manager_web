-- Guest participants are valid during a live tournament, but their identity,
-- statistics and history must not remain in the database after completion.
create or replace function public.tournament_match_uses_only_retained_players(
  p_match jsonb,
  p_retained_ids text[]
)
returns boolean language plpgsql immutable set search_path = public, pg_catalog as $$
declare item jsonb; player_id text; found_player boolean := false;
begin
  for item in select value from jsonb_array_elements(coalesce(p_match->'teamOne'->'players', '[]'::jsonb) || coalesce(p_match->'teamTwo'->'players', '[]'::jsonb)) loop
    player_id := item->>'id';
    if player_id is null or not (player_id = any(p_retained_ids)) then return false; end if;
    found_player := true;
  end loop;
  for player_id in select value from jsonb_array_elements_text(coalesce(p_match->'team1', '[]'::jsonb) || coalesce(p_match->'team2', '[]'::jsonb)) loop
    if not (player_id = any(p_retained_ids)) then return false; end if;
    found_player := true;
  end loop;
  return found_player;
end; $$;

create or replace function public.sanitize_ended_tournament_state(p_state jsonb)
returns jsonb language plpgsql immutable set search_path = public, pg_catalog as $$
declare retained_ids text[]; result jsonb := p_state;
begin
  if p_state is null or p_state->>'status' <> 'Avsluttet' then return p_state; end if;
  select coalesce(array_agg(value->>'id'), array[]::text[]) into retained_ids from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb))
  where value->>'guest' is distinct from 'true' and coalesce(value->>'participantType', '') <> 'guest' and (value->>'profileId' is not null or value->>'userId' is not null or value->>'participantType' in ('admin', 'admin-player') or value->>'joinedFrom' in ('admin', 'admin-self'));
  result := jsonb_set(result, '{players}', coalesce((select jsonb_agg(value) from jsonb_array_elements(coalesce(p_state->'players', '[]'::jsonb)) where value->>'id' = any(retained_ids)), '[]'::jsonb), true);
  result := jsonb_set(result, '{rounds}', coalesce((select jsonb_agg(jsonb_set(round_value, '{matches}', coalesce((select jsonb_agg(match_value) from jsonb_array_elements(coalesce(round_value->'matches', '[]'::jsonb)) where public.tournament_match_uses_only_retained_players(match_value, retained_ids)), '[]'::jsonb), true)) from jsonb_array_elements(coalesce(p_state->'rounds', '[]'::jsonb)) round_value), '[]'::jsonb), true);
  result := jsonb_set(result, '{schedule}', coalesce((select jsonb_agg(value) from jsonb_array_elements(coalesce(p_state->'schedule', '[]'::jsonb)) where public.tournament_match_uses_only_retained_players(value, retained_ids)), '[]'::jsonb), true);
  return result - 'schedulerHistory' - 'scoreSubmissions' - 'events' - 'playerToken' - 'selectedPlayerId';
end; $$;

-- Re-define the privileged writer so the policy cannot be bypassed by an old client.
create or replace function public.save_tournament_state_impl(p_tournament_id uuid, p_admin_token text, p_state jsonb, p_expected_revision integer)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare saved_state jsonb;
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16 or p_state is null or p_expected_revision is null or p_expected_revision < 0 then raise exception 'Invalid tournament state payload'; end if;
  saved_state := public.sanitize_ended_tournament_state(p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision');
  update public.tournaments as t set state = jsonb_set(saved_state, '{revision}', to_jsonb(t.revision + 1), true), revision = t.revision + 1, invite_code = upper(saved_state->>'inviteCode') where t.id = p_tournament_id and t.admin_token = p_admin_token and t.revision = p_expected_revision returning t.state into saved_state;
  if saved_state is null then raise exception 'Tournament state changed or not found'; end if;
  return saved_state;
end; $$;
