create extension if not exists pgcrypto;

create table if not exists public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null,
  token_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.player_sessions enable row level security;

revoke all privileges on table public.player_sessions from anon, authenticated;

create index if not exists player_sessions_tournament_player_idx
on public.player_sessions (tournament_id, player_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.join_tournament(
  p_invite_code text,
  p_player jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  tournament_id uuid;
  current_state jsonb;
  next_players jsonb;
  existing_player jsonb;
  player_name text := trim(coalesce(p_player->>'name', ''));
  player_avatar text := case
    when p_player->>'avatarId' in ('smash', 'serve', 'wall', 'lob') then p_player->>'avatarId'
    else 'smash'
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

  select id, state into tournament_id, current_state
  from public.tournaments
  where invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

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
        'active', true,
        'participantType', 'player',
        'joinStatus', 'joined',
        'joinedFrom', 'self',
        'createdAt', now()
      )
    );
    current_state := jsonb_set(current_state, '{players}', next_players, true);

    update public.tournaments
    set state = current_state
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
$$;

drop function if exists public.save_player_point(uuid, text, uuid, uuid, integer);

create or replace function public.save_player_point(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_match_id uuid,
  p_team_index integer,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_state jsonb;
  rounds jsonb;
  round_item jsonb;
  matches jsonb;
  match_item jsonb;
  current_game jsonb;
  current_set jsonb;
  completed_sets jsonb;
  team_key text;
  scoring_key text;
  other_key text;
  round_index integer;
  match_index integer;
  scoring_points integer;
  other_points integer;
  scoring_games integer;
  other_games integer;
  games_to_win_set integer;
  sets_to_win_match integer;
  set_one_wins integer;
  set_two_wins integer;
  next_waiting_index integer;
  waiting_match_index integer;
begin
  if p_tournament_id is null
    or p_invite_code is null
    or p_player_id is null
    or p_match_id is null
    or p_team_index not in (0, 1)
    or p_player_token is null
    or length(trim(p_player_token)) < 32 then
    raise exception 'Invalid player score payload';
  end if;

  if not exists (
    select 1
    from public.player_sessions
    where tournament_id = p_tournament_id
      and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player token mismatch';
  end if;

  select state into current_state
  from public.tournaments
  where id = p_tournament_id
    and invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  games_to_win_set := greatest(1, least(12, coalesce((current_state->'settings'->>'gamesToWinSet')::integer, 6)));
  sets_to_win_match := greatest(1, least(5, coalesce((current_state->'settings'->>'setsToWinMatch')::integer, 1)));
  rounds := coalesce(current_state->'rounds', '[]'::jsonb);

  if jsonb_array_length(rounds) > 0 then
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

        if match_item->>'state' <> 'playing' then
          raise exception 'Match is not currently playing';
        end if;

        team_key := case when p_team_index = 0 then 'teamOne' else 'teamTwo' end;
        if not exists (
          select 1
          from jsonb_array_elements(coalesce(match_item->team_key->'players', '[]'::jsonb)) player
          where player->>'id' = p_player_id::text
        ) then
          raise exception 'Player is not part of this match';
        end if;

        scoring_key := case when p_team_index = 0 then 'teamOne' else 'teamTwo' end;
        other_key := case when p_team_index = 0 then 'teamTwo' else 'teamOne' end;
        current_game := coalesce(match_item->'currentGame', '{"teamOne": 0, "teamTwo": 0}'::jsonb);
        scoring_points := coalesce((current_game->>scoring_key)::integer, 0);
        other_points := coalesce((current_game->>other_key)::integer, 0);

        if scoring_points = 4 or (scoring_points = 3 and other_points < 3) then
          current_set := coalesce(match_item->'currentSet', '{"teamOne": 0, "teamTwo": 0}'::jsonb);
          scoring_games := coalesce((current_set->>scoring_key)::integer, 0) + 1;
          current_set := jsonb_set(current_set, ARRAY[scoring_key], to_jsonb(scoring_games), true);
          current_game := '{"teamOne": 0, "teamTwo": 0}'::jsonb;

          other_games := coalesce((current_set->>other_key)::integer, 0);
          if (scoring_games = games_to_win_set and scoring_games - other_games >= 2)
            or (scoring_games = games_to_win_set + 1 and other_games in (games_to_win_set - 1, games_to_win_set)) then
            completed_sets := coalesce(match_item->'completedSets', '[]'::jsonb) || jsonb_build_array(current_set);
            set_one_wins := (
              select count(*) from jsonb_array_elements(completed_sets) set_item
              where (set_item->>'teamOne')::integer > (set_item->>'teamTwo')::integer
            );
            set_two_wins := (
              select count(*) from jsonb_array_elements(completed_sets) set_item
              where (set_item->>'teamTwo')::integer > (set_item->>'teamOne')::integer
            );
            match_item := jsonb_set(match_item, '{completedSets}', completed_sets, true);
            if greatest(set_one_wins, set_two_wins) >= sets_to_win_match then
              match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
              match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(case when set_one_wins > set_two_wins then 0 else 1 end), true);
              match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);
              next_waiting_index := null;
              for waiting_match_index in 0..(jsonb_array_length(matches) - 1) loop
                if matches->waiting_match_index->>'state' = 'waiting' then
                  next_waiting_index := waiting_match_index;
                  exit;
                end if;
              end loop;
              if next_waiting_index is not null then
                matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'state'], '"playing"'::jsonb, true);
                matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtId'], match_item->'courtId', true);
                matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtName'], match_item->'courtName', true);
              end if;
            else
              current_set := '{"teamOne": 0, "teamTwo": 0}'::jsonb;
            end if;
          end if;
        elsif scoring_points = 3 and other_points = 3 then
          current_game := jsonb_set(current_game, ARRAY[scoring_key], '4'::jsonb, true);
        elsif other_points = 4 then
          current_game := jsonb_set(current_game, ARRAY[other_key], '3'::jsonb, true);
        else
          current_game := jsonb_set(current_game, ARRAY[scoring_key], to_jsonb(scoring_points + 1), true);
        end if;

        match_item := jsonb_set(match_item, '{currentSet}', coalesce(current_set, match_item->'currentSet'), true);
        match_item := jsonb_set(match_item, '{currentGame}', current_game, true);
        matches := jsonb_set(matches, ARRAY[match_index::text], match_item, false);
        round_item := jsonb_set(round_item, '{matches}', matches, true);
        rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
        current_state := jsonb_set(current_state, '{rounds}', rounds, true);
        update public.tournaments
        set state = current_state
        where id = p_tournament_id;
        return current_state;
      end loop;
    end loop;
  end if;

  raise exception 'Match not found';
end;
$$;

revoke all on function public.save_player_point(uuid, text, uuid, uuid, integer, text) from public, anon, authenticated;
grant execute on function public.save_player_point(uuid, text, uuid, uuid, integer, text) to anon;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;
