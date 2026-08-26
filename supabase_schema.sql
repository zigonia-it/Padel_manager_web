create extension if not exists pgcrypto;

create table if not exists public.tournaments (
  id uuid primary key,
  invite_code text not null unique,
  admin_token text not null,
  state jsonb not null,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournaments
  add column if not exists revision integer not null default 0;

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

alter table public.tournaments enable row level security;

drop policy if exists "Public can read tournament states for realtime" on public.tournaments;
create policy "Public can read tournament states for realtime"
on public.tournaments
for select
to anon
using (true);

revoke all privileges on table public.tournaments from anon, authenticated;
grant select on public.tournaments to anon;

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

drop trigger if exists tournaments_touch_updated_at on public.tournaments;
create trigger tournaments_touch_updated_at
before update on public.tournaments
for each row
execute function public.touch_updated_at();

create or replace function public.create_tournament(
  p_state jsonb,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid := (p_state->>'id')::uuid;
  next_invite_code text := upper(p_state->>'inviteCode');
  saved_state jsonb;
begin
  if next_id is null or next_invite_code is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid tournament payload';
  end if;

  saved_state := p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision';
  saved_state := jsonb_set(saved_state, '{revision}', '0'::jsonb, true);

  insert into public.tournaments (id, invite_code, admin_token, state, revision)
  values (next_id, next_invite_code, p_admin_token, saved_state, 0)
  on conflict (id) do update
  set invite_code = excluded.invite_code,
      admin_token = excluded.admin_token,
      state = excluded.state,
      revision = 0;

  return saved_state;
end;
$$;

create or replace function public.get_tournament_by_code(
  p_invite_code text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_set(t.state, '{revision}', to_jsonb(t.revision), true)
  from public.tournaments as t
  where t.invite_code = upper(trim(p_invite_code))
  limit 1;
$$;

drop function if exists public.save_tournament_state(uuid, text, jsonb);

create or replace function public.save_tournament_state(
  p_tournament_id uuid,
  p_admin_token text,
  p_state jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_state jsonb;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_state is null
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid tournament state payload';
  end if;

  saved_state := p_state - 'adminToken' - 'playerToken' - 'selectedPlayerId' - 'revision';

  update public.tournaments as t
  set state = jsonb_set(saved_state, '{revision}', to_jsonb(t.revision + 1), true),
      revision = t.revision + 1,
      invite_code = upper(saved_state->>'inviteCode')
  where t.id = p_tournament_id
    and t.admin_token = p_admin_token
    and t.revision = p_expected_revision
  returning t.state into saved_state;

  if saved_state is null then
    raise exception 'Tournament state changed or not found';
  end if;

  return saved_state;
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
  current_revision integer;
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
  current_revision integer;
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

  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id
    and invite_code = upper(trim(p_invite_code))
  for update;

  if current_state is null then
    raise exception 'Tournament not found';
  end if;

  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);

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
        current_revision := current_revision + 1;
        current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
        update public.tournaments
        set state = current_state,
            revision = current_revision
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

create or replace function public.admin_match_action(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_action text,
  p_team_index integer,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_state jsonb;
  current_revision integer;
  rounds jsonb;
  round_item jsonb;
  matches jsonb;
  match_item jsonb;
  undo_state jsonb;
  next_waiting_match jsonb;
  round_index integer;
  match_index integer;
  round_match_index integer;
  next_waiting_index integer;
  final_round_number integer;
  final_match jsonb;
  target_found boolean := false;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_match_id is null
    or p_action is null
    or p_action not in ('start', 'cancel', 'walkover')
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid admin match action payload';
  end if;

  if p_action = 'walkover' and (p_team_index is null or p_team_index not in (0, 1)) then
    raise exception 'Invalid walkover team';
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

  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
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

        target_found := true;
        if round_item->>'status' <> 'active' then
          raise exception 'Match is not in the active round';
        end if;

        if p_action = 'start' then
          if match_item->>'state' <> 'waiting' then
            raise exception 'Match is not waiting';
          end if;
          match_item := jsonb_set(match_item, '{state}', '"playing"'::jsonb, true);
        elsif p_action = 'cancel' then
          if match_item->>'state' in ('finished', 'cancelled') then
            raise exception 'Match is already completed';
          end if;
          match_item := jsonb_set(match_item, '{state}', '"cancelled"'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedSets}', '[]'::jsonb, true);
          match_item := jsonb_set(match_item, '{winnerTeamIndex}', 'null'::jsonb, true);
          match_item := jsonb_set(match_item, '{isWalkover}', 'false'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);
        else
          if match_item->>'state' in ('finished', 'cancelled') then
            raise exception 'Match is already completed';
          end if;

          next_waiting_index := null;
          next_waiting_match := null;
          for round_match_index in 0..(jsonb_array_length(matches) - 1) loop
            if round_match_index <> match_index and matches->round_match_index->>'state' = 'waiting' then
              next_waiting_index := round_match_index;
              next_waiting_match := matches->round_match_index;
              exit;
            end if;
          end loop;

          undo_state := jsonb_build_object(
            'match', match_item - 'lastScoredMatchState',
            'nextWaitingMatch', next_waiting_match,
            'roundId', round_item->'id',
            'roundStatus', round_item->'status',
            'tournamentStatus', current_state->'status',
            'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
          );
          match_item := jsonb_set(match_item, '{lastScoredMatchState}', undo_state, true);
          match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedSets}', '[]'::jsonb, true);
          match_item := jsonb_set(match_item, '{currentSet}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
          match_item := jsonb_set(match_item, '{currentGame}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
          match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(p_team_index), true);
          match_item := jsonb_set(match_item, '{isWalkover}', 'true'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);
        end if;

        matches := jsonb_set(matches, ARRAY[match_index::text], match_item, false);

        if p_action in ('cancel', 'walkover') then
          if next_waiting_index is null then
            next_waiting_index := null;
            for round_match_index in 0..(jsonb_array_length(matches) - 1) loop
              if matches->round_match_index->>'state' = 'waiting' then
                next_waiting_index := round_match_index;
                exit;
              end if;
            end loop;
          end if;
          if next_waiting_index is not null then
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'state'], '"playing"'::jsonb, true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtId'], match_item->'courtId', true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtName'], match_item->'courtName', true);
          end if;
        end if;

        round_item := jsonb_set(round_item, '{matches}', matches, true);
        rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
        current_state := jsonb_set(current_state, '{rounds}', rounds, true);

        if p_action = 'walkover'
          and current_state->'settings'->>'format' = 'cup'
          and not exists (
            select 1
            from jsonb_array_elements(matches) round_match
            where round_match->>'state' not in ('finished', 'cancelled')
          ) then
          final_round_number := null;
          if jsonb_array_length(coalesce(current_state->'cup'->'bracket'->'rounds', '[]'::jsonb)) > 0 then
            final_round_number := (
              current_state->'cup'->'bracket'->'rounds'->(jsonb_array_length(current_state->'cup'->'bracket'->'rounds') - 1)->>'roundNumber'
            )::integer;
          end if;
          if final_round_number is not null and (round_item->>'roundNumber')::integer = final_round_number then
            select value into final_match
            from jsonb_array_elements(matches) value
            where value->>'isThirdPlaceMatch' <> 'true'
            limit 1;
            round_item := jsonb_set(round_item, '{status}', '"finished"'::jsonb, true);
            current_state := jsonb_set(current_state, ARRAY['rounds', round_index::text], round_item, true);
            current_state := jsonb_set(current_state, '{status}', '"Cup ferdig"'::jsonb, true);
            if final_match is not null then
              current_state := jsonb_set(
                current_state,
                '{cup,winnerTeam}',
                case when final_match->>'winnerTeamIndex' = '0' then final_match->'teamOne' else final_match->'teamTwo' end,
                true
              );
            end if;
          end if;
        end if;

        current_revision := current_revision + 1;
        current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
        update public.tournaments
        set state = current_state,
            revision = current_revision
        where id = p_tournament_id;
        return current_state;
      end loop;
    end loop;
  end if;

  if not target_found then
    raise exception 'Match not found';
  end if;

  raise exception 'Match action failed';
end;
$$;

revoke all on function public.admin_match_action(uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_match_action(uuid, text, uuid, text, integer, integer) to anon;

create or replace function public.delete_tournament(
  p_tournament_id uuid,
  p_admin_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid delete payload';
  end if;

  delete from public.tournaments
  where id = p_tournament_id
    and admin_token = p_admin_token;

  get diagnostics deleted_count = row_count;

  if deleted_count = 0 then
    raise exception 'Admin token mismatch or tournament not found';
  end if;

  return true;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.create_tournament(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_tournament_by_code(text) from public, anon, authenticated;
revoke all on function public.save_tournament_state(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.join_tournament(text, jsonb) from public, anon, authenticated;
revoke all on function public.delete_tournament(uuid, text) from public, anon, authenticated;

grant execute on function public.create_tournament(jsonb, text) to anon;
grant execute on function public.get_tournament_by_code(text) to anon;
grant execute on function public.save_tournament_state(uuid, text, jsonb, integer) to anon;
grant execute on function public.join_tournament(text, jsonb) to anon;
grant execute on function public.delete_tournament(uuid, text) to anon;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tournaments'
  ) then
    alter publication supabase_realtime add table public.tournaments;
  end if;
end;
$$;
