-- Add: let a player choose their own gem/avatar accent color, instead of it
-- always being assigned automatically (index-cycled at creation, self-healed
-- on load). The client already builds a player object with an `accent` key
-- when joining, but join_tournament_impl's allow-list silently drops it --
-- there is no `accent` key in the player it writes at all. Mirrors the
-- existing avatarId validation pattern exactly.

-- 1. join_tournament_impl: accept + validate a client-chosen accent.
create or replace function public.join_tournament_impl(p_invite_code text, p_player jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  tournament_id uuid;
  current_state jsonb;
  current_revision integer;
  next_players jsonb;
  existing_player jsonb;
  player_name text := trim(coalesce(p_player->>'name', ''));
  player_avatar text := case
    when p_player->>'avatarId' in ('smash', 'serve', 'wall', 'lob') then p_player->>'avatarId'
    else 'smash'
  end;
  player_accent text := case
    when p_player->>'accent' in ('blue', 'orange', 'mint', 'pink', 'indigo', 'teal', 'red', 'yellow', 'gold', 'silver', 'bronze', 'sapphire', 'emerald', 'garnet', 'amethyst', 'onyx')
      then p_player->>'accent'
    else null
  end;
  player_id uuid := gen_random_uuid();
  player_token text := encode(extensions.gen_random_bytes(24), 'hex');
begin
  if p_invite_code is null
    or p_player is null
    or jsonb_typeof(p_player) <> 'object'
    or player_name = '' then
    raise exception 'Invalid player payload';
  end if;

  select id, state, revision into tournament_id, current_state, current_revision
  from public.tournaments
  where invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);

  select value into existing_player
  from jsonb_array_elements(coalesce(current_state->'players', '[]'::jsonb)) value
  where lower(value->>'name') = lower(player_name)
  limit 1;

  if existing_player is not null then
    player_id := (existing_player->>'id')::uuid;
  else
    if jsonb_array_length(coalesce(current_state->'rounds', '[]'::jsonb)) > 0 then
      raise exception 'Tournament has already started';
    end if;

    next_players := coalesce(current_state->'players', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', player_id,
        'name', player_name,
        'avatarId', player_avatar,
        'accent', player_accent,
        'active', true,
        'participantType', 'player',
        'joinStatus', 'joined',
        'joinedFrom', 'self',
        'createdAt', now()
      )
    );
    current_state := jsonb_set(current_state, '{players}', next_players, true);
    current_revision := current_revision + 1;
    current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);

    update public.tournaments
    set state = current_state,
        revision = current_revision
    where id = tournament_id;
  end if;

  insert into public.player_sessions (tournament_id, player_id, token_hash)
  values (tournament_id, player_id, encode(extensions.digest(player_token, 'sha256'), 'hex'));

  return jsonb_build_object(
    'state', current_state,
    'playerId', player_id,
    'playerToken', player_token
  );
end;
$function$;

-- 2. player_profiles: add a nullable default-accent column. Nullable (not a
-- hardcoded default like avatar_id's 'smash') so an existing profile with no
-- chosen accent still falls back client-side to today's index-cycling,
-- rather than every unset profile collapsing onto the same color.
alter table public.player_profiles add column if not exists accent text;

-- 3. upsert_player_profile(_impl): add a 5th p_accent param. Adding a
-- parameter changes the signature, so the old 4-arg overloads are dropped
-- first to avoid leaving orphaned functions behind.
drop function if exists public.upsert_player_profile(uuid, text, text, text);
drop function if exists public.upsert_player_profile_impl(uuid, text, text, text);

create or replace function public.upsert_player_profile_impl(p_profile_id uuid, p_profile_token text, p_display_name text, p_avatar_id text, p_accent text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
declare
  existing_token_hash text;
  saved_profile public.player_profiles;
  next_name text := trim(coalesce(p_display_name, ''));
  next_avatar text := case when p_avatar_id in ('smash', 'serve', 'wall', 'lob') then p_avatar_id else 'smash' end;
  next_accent text := case
    when p_accent in ('blue', 'orange', 'mint', 'pink', 'indigo', 'teal', 'red', 'yellow', 'gold', 'silver', 'bronze', 'sapphire', 'emerald', 'garnet', 'amethyst', 'onyx')
      then p_accent
    else null
  end;
begin
  if p_profile_id is null or p_profile_token is null or length(trim(p_profile_token)) < 32 or length(next_name) not between 1 and 64 then
    raise exception 'Invalid profile payload';
  end if;
  select token_hash into existing_token_hash from public.player_profiles where id = p_profile_id for update;
  if existing_token_hash is not null and existing_token_hash <> encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex') then
    raise exception 'Profile token mismatch';
  end if;
  insert into public.player_profiles (id, token_hash, display_name, avatar_id, accent)
  values (p_profile_id, encode(extensions.digest(trim(p_profile_token), 'sha256'), 'hex'), next_name, next_avatar, next_accent)
  on conflict (id) do update set
    display_name = excluded.display_name,
    avatar_id = excluded.avatar_id,
    accent = excluded.accent,
    deletion_requested_at = null,
    deletion_scheduled_for = null,
    updated_at = now()
  returning * into saved_profile;
  return jsonb_build_object(
    'profile', jsonb_build_object(
      'id', saved_profile.id,
      'displayName', saved_profile.display_name,
      'avatarId', saved_profile.avatar_id,
      'accent', saved_profile.accent,
      'createdAt', saved_profile.created_at,
      'updatedAt', saved_profile.updated_at,
      'deletionRequestedAt', saved_profile.deletion_requested_at,
      'deletionScheduledFor', saved_profile.deletion_scheduled_for
    )
  );
end;
$function$;

create or replace function public.upsert_player_profile(p_profile_id uuid, p_profile_token text, p_display_name text, p_avatar_id text, p_accent text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_catalog'
as $function$
begin
  if not public.consume_api_rate_limit('profile:' || coalesce(p_profile_token, 'missing'), 30, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.upsert_player_profile_impl(p_profile_id, p_profile_token, p_display_name, p_avatar_id, p_accent);
end;
$function$;

grant execute on function public.upsert_player_profile(uuid, text, text, text, text) to anon;
grant execute on function public.upsert_player_profile(uuid, text, text, text, text) to postgres;
grant execute on function public.upsert_player_profile_impl(uuid, text, text, text, text) to postgres;
