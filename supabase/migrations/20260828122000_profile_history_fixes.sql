-- Correct profile history upserts and expose long-term history to the profile owner.
create or replace function public.upsert_player_profile_impl(p_profile_id uuid, p_profile_token text, p_display_name text, p_avatar_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare existing_token_hash text; saved_profile public.player_profiles; next_name text := trim(coalesce(p_display_name, '')); next_avatar text := case when p_avatar_id in ('smash', 'serve', 'wall', 'lob') then p_avatar_id else 'smash' end;
begin
  if p_profile_id is null or p_profile_token is null or length(trim(p_profile_token)) < 32 or length(next_name) not between 1 and 64 then raise exception 'Invalid profile payload'; end if;
  select token_hash into existing_token_hash from public.player_profiles where id = p_profile_id for update;
  if existing_token_hash is not null and existing_token_hash <> encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex') then raise exception 'Profile token mismatch'; end if;
  insert into public.player_profiles (id, token_hash, display_name, avatar_id) values (p_profile_id, encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex'), next_name, next_avatar)
  on conflict (id) do update set display_name = excluded.display_name, avatar_id = excluded.avatar_id, deletion_requested_at = null, deletion_scheduled_for = null, updated_at = now()
  returning * into saved_profile;
  return jsonb_build_object('profile', jsonb_build_object('id', saved_profile.id, 'displayName', saved_profile.display_name, 'avatarId', saved_profile.avatar_id, 'createdAt', saved_profile.created_at, 'updatedAt', saved_profile.updated_at, 'deletionRequestedAt', saved_profile.deletion_requested_at, 'deletionScheduledFor', saved_profile.deletion_scheduled_for));
end; $$;

create or replace function public.save_player_profile_history_impl(p_profile_id uuid, p_profile_token text, p_history jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if p_profile_id is null or p_profile_token is null or length(trim(p_profile_token)) < 32 or p_history is null or jsonb_typeof(p_history) <> 'object' then raise exception 'Invalid profile history payload'; end if;
  if not exists (select 1 from public.player_profiles where id = p_profile_id and token_hash = encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex')) then raise exception 'Profile token mismatch'; end if;
  if (p_history->>'id')::uuid is null or length(trim(coalesce(p_history->>'tournamentName', ''))) < 1 or (p_history->>'endedAt') is null then raise exception 'Invalid profile history payload'; end if;
  insert into public.player_profile_history (id, profile_id, tournament_id, tournament_name, ended_at, placement, points, matches, wins, sets, games)
  values ((p_history->>'id')::uuid, p_profile_id, nullif(p_history->>'tournamentId', '')::uuid, left(trim(p_history->>'tournamentName'), 120), (p_history->>'endedAt')::timestamptz, nullif(p_history->>'placement', '')::integer, greatest(0, coalesce((p_history->>'points')::integer, 0)), greatest(0, coalesce((p_history->>'matches')::integer, 0)), greatest(0, coalesce((p_history->>'wins')::integer, 0)), greatest(0, coalesce((p_history->>'sets')::integer, 0)), greatest(0, coalesce((p_history->>'games')::integer, 0)))
  on conflict (profile_id, id) do update set tournament_id = excluded.tournament_id, tournament_name = excluded.tournament_name, ended_at = excluded.ended_at, placement = excluded.placement, points = excluded.points, matches = excluded.matches, wins = excluded.wins, sets = excluded.sets, games = excluded.games;
  return true;
end; $$;

create or replace function public.get_player_profile_history_impl(p_profile_id uuid, p_profile_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if p_profile_id is null or p_profile_token is null or length(trim(p_profile_token)) < 32 or not exists (select 1 from public.player_profiles where id = p_profile_id and token_hash = encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex')) then raise exception 'Profile token mismatch'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'profileId', h.profile_id, 'tournamentId', h.tournament_id, 'tournamentName', h.tournament_name, 'endedAt', h.ended_at, 'placement', h.placement, 'points', h.points, 'matches', h.matches, 'wins', h.wins, 'sets', h.sets, 'games', h.games) order by h.ended_at desc) from public.player_profile_history h where h.profile_id = p_profile_id), '[]'::jsonb);
end; $$;

create or replace function public.get_player_profile_history(p_profile_id uuid, p_profile_token text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$ begin if not public.consume_api_rate_limit('profile-history-read:' || coalesce(p_profile_token, 'missing'), 60, 3600) then raise exception 'Rate limit exceeded'; end if; return public.get_player_profile_history_impl(p_profile_id, p_profile_token); end; $$;

revoke all on function public.upsert_player_profile_impl(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.save_player_profile_history_impl(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_player_profile_history_impl(uuid, text) from public, anon, authenticated;
revoke all on function public.get_player_profile_history(uuid, text) from public, authenticated;
grant execute on function public.get_player_profile_history(uuid, text) to anon;
