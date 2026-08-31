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
alter table public.tournaments
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists claimed_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists retention_expires_at timestamptz;
create index if not exists tournaments_owner_user_id_idx on public.tournaments (owner_user_id) where owner_user_id is not null;

create or replace function public.set_tournament_lifecycle_dates()
returns trigger language plpgsql security invoker set search_path = public, pg_catalog as $$
begin
  if coalesce(old.state->>'status', '') <> 'Avsluttet' and coalesce(new.state->>'status', '') = 'Avsluttet' then
    new.ended_at = coalesce(new.ended_at, now());
    new.retention_expires_at = coalesce(new.retention_expires_at, new.ended_at + interval '30 days');
  end if;
  return new;
end; $$;
drop trigger if exists tournaments_lifecycle_dates on public.tournaments;
create trigger tournaments_lifecycle_dates before update on public.tournaments for each row execute function public.set_tournament_lifecycle_dates();

create table if not exists public.player_sessions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null,
  token_hash text not null,
  created_at timestamptz not null default now()
);

alter table public.player_sessions enable row level security;

revoke all privileges on table public.player_sessions from public, anon, authenticated;

create index if not exists player_sessions_tournament_player_idx
on public.player_sessions (tournament_id, player_id);

create table if not exists public.api_rate_limits (
  bucket_hash text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint api_rate_limits_bucket_hash_length check (length(bucket_hash) = 64),
  constraint api_rate_limits_request_count_nonnegative check (request_count >= 0)
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(), tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null, endpoint text not null unique, subscription jsonb not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint push_subscription_endpoint_length check (length(endpoint) between 20 and 2048),
  constraint push_subscription_size check (pg_column_size(subscription) <= 8192)
);
alter table public.push_subscriptions enable row level security;
revoke all privileges on table public.push_subscriptions from public, anon, authenticated;

alter table public.api_rate_limits enable row level security;
revoke all privileges on table public.api_rate_limits from public, anon, authenticated;

create or replace function public.consume_api_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  bucket_hash_value text;
  allowed boolean;
begin
  if p_bucket is null
    or length(p_bucket) = 0
    or length(p_bucket) > 256
    or p_limit is null
    or p_limit < 1
    or p_window_seconds is null
    or p_window_seconds < 1 then
    raise exception 'Invalid rate limit payload';
  end if;

  bucket_hash_value := encode(extensions.digest(p_bucket, 'sha256'), 'hex');
  insert into public.api_rate_limits (bucket_hash, window_started_at, request_count, updated_at)
  values (bucket_hash_value, now(), 1, now())
  on conflict (bucket_hash) do update
  set window_started_at = case
        when public.api_rate_limits.window_started_at <= now() - (p_window_seconds * interval '1 second')
          then now()
        else public.api_rate_limits.window_started_at
      end,
      request_count = case
        when public.api_rate_limits.window_started_at <= now() - (p_window_seconds * interval '1 second')
          then 1
        else public.api_rate_limits.request_count + 1
      end,
      updated_at = now()
  returning request_count <= p_limit into allowed;

  return allowed;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, integer, integer) from public, anon, authenticated;

alter table public.tournaments enable row level security;

drop policy if exists "Public can read tournament states for realtime" on public.tournaments;
create policy "Public can read tournament states for realtime"
on public.tournaments
for select
to anon
using (true);

revoke all privileges on table public.tournaments from anon, authenticated;
revoke select on public.tournaments from public, anon, authenticated;
grant select (id, invite_code, state, revision, created_at, updated_at) on public.tournaments to anon;

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

create or replace function public.create_tournament_impl(
  p_state jsonb,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
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

create or replace function public.get_tournament_by_code_impl(
  p_invite_code text
)
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select jsonb_set(t.state, '{revision}', to_jsonb(t.revision), true)
  from public.tournaments as t
  where t.invite_code = upper(trim(p_invite_code))
  limit 1;
$$;

drop function if exists public.save_tournament_state(uuid, text, jsonb);

create or replace function public.save_tournament_state_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_state jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
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

create or replace function public.join_tournament_impl(
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

create or replace function public.save_player_point_impl(
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
  undo_state jsonb;
  next_waiting_match jsonb;
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

        next_waiting_index := null;
        next_waiting_match := null;
        for waiting_match_index in 0..(jsonb_array_length(matches) - 1) loop
          if waiting_match_index <> match_index and matches->waiting_match_index->>'state' = 'waiting' then
            next_waiting_index := waiting_match_index;
            next_waiting_match := matches->waiting_match_index;
            exit;
          end if;
        end loop;

        undo_state := jsonb_build_object(
          'match', match_item - 'lastScoredMatchState',
          'nextWaitingMatch', next_waiting_match,
          'roundId', round_item->'id',
          'roundStatus', round_item->'status',
          'tournamentStatus', current_state->'status',
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
        );
        match_item := jsonb_set(match_item, '{lastScoredMatchState}', undo_state, true);

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
        where id = p_tournament_id
          and revision = current_revision - 1;
        return current_state;
      end loop;
    end loop;
  end if;

  raise exception 'Match not found';
end;
$$;

revoke all on function public.save_player_point_impl(uuid, text, uuid, uuid, integer, text) from public, anon, authenticated;

create or replace function public.admin_advance_cup_impl(
  p_tournament_id uuid,
  p_admin_token text,
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
  previous_round jsonb;
  bracket jsonb;
  bracket_rounds jsonb;
  bracket_round jsonb;
  next_round jsonb;
  matches jsonb := '[]'::jsonb;
  match_item jsonb;
  team_one jsonb;
  team_two jsonb;
  advancing_teams jsonb;
  next_bye_teams jsonb := '[]'::jsonb;
  losing_teams jsonb := '[]'::jsonb;
  sitting_out jsonb := '[]'::jsonb;
  slots jsonb := '[]'::jsonb;
  previous_index integer;
  previous_round_number integer;
  bracket_index integer;
  next_bracket_index integer;
  next_round_number integer;
  last_bracket_round_number integer;
  team_index integer;
  match_index integer;
  regular_match_count integer := 0;
  court_count integer;
  started_count integer := 0;
  final_match jsonb;
  third_place_match jsonb;
  is_final_round boolean := false;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid cup advance payload';
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

  if current_state->'settings'->>'format' <> 'cup' then
    raise exception 'Cup advancement requires cup format';
  end if;
  if current_state->>'status' = 'Cup ferdig' then
    raise exception 'Cupen er ferdig';
  end if;

  rounds := coalesce(current_state->'rounds', '[]'::jsonb);
  if jsonb_array_length(rounds) = 0 then
    raise exception 'No cup round to advance';
  end if;

  previous_index := jsonb_array_length(rounds) - 1;
  previous_round := rounds->previous_index;
  if previous_round->>'status' not in ('active', 'finished') then
    raise exception 'Cup round is not ready to advance';
  end if;

  matches := coalesce(previous_round->'matches', '[]'::jsonb);
  if jsonb_array_length(matches) = 0
    or exists (
      select 1
      from jsonb_array_elements(matches) round_match
      where coalesce(round_match->>'state', '') not in ('finished', 'cancelled')
    ) then
    raise exception 'Alle kamper må være ferdige før neste runde';
  end if;

  previous_round := jsonb_set(previous_round, '{status}', '"finished"'::jsonb, true);
  rounds := jsonb_set(rounds, ARRAY[previous_index::text], previous_round, false);
  previous_round_number := (previous_round->>'roundNumber')::integer;
  bracket := coalesce(current_state->'cup'->'bracket', '{}'::jsonb);
  bracket_rounds := coalesce(bracket->'rounds', '[]'::jsonb);
  next_bracket_index := null;
  next_round_number := null;

  if jsonb_array_length(bracket_rounds) > 0 then
    last_bracket_round_number := (
      bracket_rounds->(jsonb_array_length(bracket_rounds) - 1)->>'roundNumber'
    )::integer;
    for bracket_index in 0..(jsonb_array_length(bracket_rounds) - 1) loop
      if (bracket_rounds->bracket_index->>'roundNumber')::integer > previous_round_number
        and (next_round_number is null or (bracket_rounds->bracket_index->>'roundNumber')::integer < next_round_number) then
        next_bracket_index := bracket_index;
        next_round_number := (bracket_rounds->bracket_index->>'roundNumber')::integer;
      end if;
    end loop;
  end if;

  advancing_teams := coalesce(
    (
      select case
        when jsonb_typeof(value->'byeTeams') = 'array' then value->'byeTeams'
        else '[]'::jsonb
      end
      from jsonb_array_elements(bracket_rounds) value
      where (value->>'roundNumber')::integer = previous_round_number
      limit 1
    ),
    case
      when jsonb_typeof(current_state->'cup'->'byeTeams') = 'array' then current_state->'cup'->'byeTeams'
      else '[]'::jsonb
    end,
    '[]'::jsonb
  );

  if jsonb_array_length(matches) > 0 then
    for match_index in 0..(jsonb_array_length(matches) - 1) loop
      match_item := matches->match_index;
      if match_item->>'state' = 'finished'
        and match_item->>'winnerTeamIndex' is not null
        and coalesce(match_item->>'isThirdPlaceMatch', 'false') <> 'true' then
        if match_item->>'winnerTeamIndex' = '0' then
          advancing_teams := advancing_teams || jsonb_build_array(match_item->'teamOne');
          losing_teams := losing_teams || jsonb_build_array(match_item->'teamTwo');
        else
          advancing_teams := advancing_teams || jsonb_build_array(match_item->'teamTwo');
          losing_teams := losing_teams || jsonb_build_array(match_item->'teamOne');
        end if;
      end if;
    end loop;
  end if;

  matches := '[]'::jsonb;

  if jsonb_array_length(advancing_teams) >= 2
    and jsonb_array_length(advancing_teams) % 2 = 1 then
    next_bye_teams := jsonb_build_array(advancing_teams->(jsonb_array_length(advancing_teams) - 1));
    sitting_out := sitting_out || coalesce(advancing_teams->(jsonb_array_length(advancing_teams) - 1)->'players', '[]'::jsonb);
  end if;

  current_state := jsonb_set(current_state, '{cup,byeTeams}', next_bye_teams, true);
  if jsonb_array_length(advancing_teams) < 2 then
    current_state := jsonb_set(current_state, '{rounds}', rounds, true);
    current_state := jsonb_set(current_state, '{status}', '"Cup ferdig"'::jsonb, true);
    current_state := jsonb_set(current_state, '{cup,winnerTeam}', coalesce(advancing_teams->0, 'null'::jsonb), true);
    current_revision := current_revision + 1;
    current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
    update public.tournaments
    set state = current_state,
        revision = current_revision
    where id = p_tournament_id;
    return current_state;
  end if;

  if next_round_number is null then
    next_round_number := previous_round_number + 1;
  end if;
  is_final_round := last_bracket_round_number is null or next_round_number = last_bracket_round_number;
  court_count := greatest(1, jsonb_array_length(coalesce(current_state->'courts', '[]'::jsonb)));

  for team_index in 0..((jsonb_array_length(advancing_teams) / 2) - 1) loop
    team_one := advancing_teams->(team_index * 2);
    team_two := advancing_teams->(team_index * 2 + 1);
    match_item := jsonb_build_object(
      'id', gen_random_uuid(),
      'tournamentId', p_tournament_id,
      'rotationNumber', next_round_number,
      'teamOne', team_one,
      'teamTwo', team_two,
      'sittingOut', sitting_out,
      'state', 'waiting',
      'completedSets', '[]'::jsonb,
      'currentSet', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'currentGame', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'startingTeamIndex', floor(random() * 2)::integer,
      'winnerTeamIndex', null,
      'isWalkover', false,
      'isThirdPlaceMatch', false,
      'lastScoredMatchState', null,
      'courtId', coalesce(current_state->'courts'->(team_index % court_count)->'id', 'null'::jsonb),
      'courtName', coalesce(current_state->'courts'->(team_index % court_count)->'name', 'null'::jsonb),
      'completedAt', null
    );
    matches := matches || jsonb_build_array(match_item);
    regular_match_count := regular_match_count + 1;
  end loop;

  if is_final_round
    and coalesce(current_state->'cup'->>'includesThirdPlaceMatch', 'false') = 'true'
    and jsonb_array_length(losing_teams) >= 2 then
    third_place_match := jsonb_build_object(
      'id', gen_random_uuid(),
      'tournamentId', p_tournament_id,
      'rotationNumber', next_round_number,
      'teamOne', losing_teams->0,
      'teamTwo', losing_teams->1,
      'sittingOut', sitting_out,
      'state', 'waiting',
      'completedSets', '[]'::jsonb,
      'currentSet', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'currentGame', jsonb_build_object('teamOne', 0, 'teamTwo', 0),
      'startingTeamIndex', floor(random() * 2)::integer,
      'winnerTeamIndex', null,
      'isWalkover', false,
      'isThirdPlaceMatch', true,
      'lastScoredMatchState', null,
      'courtId', coalesce(current_state->'courts'->(regular_match_count % court_count)->'id', 'null'::jsonb),
      'courtName', coalesce(current_state->'courts'->(regular_match_count % court_count)->'name', 'null'::jsonb),
      'completedAt', null
    );
    matches := matches || jsonb_build_array(third_place_match);
  else
    third_place_match := null;
  end if;

  if jsonb_array_length(matches) > 0 then
    for match_index in 0..(jsonb_array_length(matches) - 1) loop
      if matches->match_index->>'state' = 'waiting' and started_count < court_count then
        matches := jsonb_set(matches, ARRAY[match_index::text, 'state'], '"playing"'::jsonb, true);
        started_count := started_count + 1;
      end if;
    end loop;
  end if;

  next_round := jsonb_build_object(
    'id', gen_random_uuid(),
    'roundNumber', next_round_number,
    'status', 'active',
    'createdAt', now(),
    'startedAt', now(),
    'sittingOut', sitting_out,
    'matches', matches
  );
  rounds := rounds || jsonb_build_array(next_round);

  if next_bracket_index is not null then
    bracket_round := bracket_rounds->next_bracket_index;
    if regular_match_count > 0 then
      for match_index in 0..(regular_match_count - 1) loop
        slots := slots || jsonb_build_array(jsonb_build_object(
          'type', 'match',
          'matchId', matches->match_index->'id'
        ));
      end loop;
    end if;
    bracket_round := jsonb_set(bracket_round, '{slots}', slots, true);
    bracket_round := jsonb_set(bracket_round, '{byeTeams}', next_bye_teams, true);
    if third_place_match is not null then
      bracket_round := jsonb_set(bracket_round, '{thirdPlaceSlot}', jsonb_build_object(
        'type', 'match',
        'matchId', third_place_match->'id'
      ), true);
    elsif bracket_round->'thirdPlaceSlot'->>'type' = 'pending' then
      bracket_round := jsonb_set(bracket_round, '{thirdPlaceSlot}', 'null'::jsonb, true);
    end if;
    bracket_rounds := jsonb_set(bracket_rounds, ARRAY[next_bracket_index::text], bracket_round, false);
    bracket := jsonb_set(bracket, '{rounds}', bracket_rounds, true);
    if is_final_round then
      select value into final_match
      from jsonb_array_elements(matches) value
      where coalesce(value->>'isThirdPlaceMatch', 'false') <> 'true'
      limit 1;
      bracket := jsonb_set(bracket, '{finalMatchId}', coalesce(final_match->'id', 'null'::jsonb), true);
      bracket := jsonb_set(bracket, '{thirdPlaceMatchId}', coalesce(third_place_match->'id', 'null'::jsonb), true);
    end if;
    current_state := jsonb_set(current_state, '{cup,bracket}', bracket, true);
  end if;

  current_state := jsonb_set(current_state, '{rounds}', rounds, true);
  current_state := jsonb_set(current_state, '{currentRound}', to_jsonb(next_round_number), true);
  current_state := jsonb_set(current_state, '{status}', '"Runde pågår"'::jsonb, true);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state,
      revision = current_revision
  where id = p_tournament_id;

  return current_state;
end;
$$;

revoke all on function public.admin_advance_cup_impl(uuid, text, integer) from public, anon, authenticated;

create or replace function public.admin_advance_round_impl(
  p_tournament_id uuid,
  p_admin_token text,
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
  active_round jsonb;
  next_round jsonb;
  matches jsonb;
  active_index integer;
  next_index integer;
  round_scan_index integer;
  match_scan_index integer;
  court_count integer;
  started_count integer := 0;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid round advance payload';
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

  if coalesce(current_state->'settings'->>'format', 'roundRobin') <> 'roundRobin' then
    raise exception 'Cup round advancement requires bracket action';
  end if;

  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  rounds := coalesce(current_state->'rounds', '[]'::jsonb);
  active_index := null;
  next_index := null;

  if jsonb_array_length(rounds) > 0 then
    for round_scan_index in 0..(jsonb_array_length(rounds) - 1) loop
      if rounds->round_scan_index->>'status' = 'active' then
        active_index := round_scan_index;
        exit;
      end if;
    end loop;
  end if;

  if active_index is null then
    raise exception 'No active round to advance';
  end if;

  active_round := rounds->active_index;
  matches := coalesce(active_round->'matches', '[]'::jsonb);
  if jsonb_array_length(matches) = 0
    or exists (
      select 1
      from jsonb_array_elements(matches) round_match
      where coalesce(round_match->>'state', '') not in ('finished', 'cancelled')
    ) then
    raise exception 'Alle kamper må være ferdige før neste runde';
  end if;

  active_round := jsonb_set(active_round, '{status}', '"finished"'::jsonb, true);
  rounds := jsonb_set(rounds, ARRAY[active_index::text], active_round, false);

  if active_index + 1 <= jsonb_array_length(rounds) - 1 then
    for round_scan_index in (active_index + 1)..(jsonb_array_length(rounds) - 1) loop
      if rounds->round_scan_index->>'status' = 'scheduled' then
        next_index := round_scan_index;
        exit;
      end if;
    end loop;
  end if;

  if next_index is not null then
    next_round := rounds->next_index;
    if next_round->>'startedAt' is null then
      next_round := jsonb_set(next_round, '{startedAt}', to_jsonb(now()), true);
    end if;
    next_round := jsonb_set(next_round, '{status}', '"active"'::jsonb, true);
    matches := coalesce(next_round->'matches', '[]'::jsonb);
    court_count := greatest(1, jsonb_array_length(coalesce(current_state->'courts', '[]'::jsonb)));
    if jsonb_array_length(matches) > 0 then
      for match_scan_index in 0..(jsonb_array_length(matches) - 1) loop
        if matches->match_scan_index->>'state' = 'waiting' and started_count < court_count then
          matches := jsonb_set(matches, ARRAY[match_scan_index::text, 'state'], '"playing"'::jsonb, true);
          started_count := started_count + 1;
        end if;
      end loop;
    end if;
    next_round := jsonb_set(next_round, '{matches}', matches, true);
    rounds := jsonb_set(rounds, ARRAY[next_index::text], next_round, false);
    current_state := jsonb_set(current_state, '{currentRound}', to_jsonb((next_round->>'roundNumber')::integer), true);
    current_state := jsonb_set(current_state, '{status}', '"Runde pågår"'::jsonb, true);
  else
    current_state := jsonb_set(current_state, '{status}', '"Runde fullført"'::jsonb, true);
  end if;

  current_state := jsonb_set(current_state, '{rounds}', rounds, true);
  current_revision := current_revision + 1;
  current_state := jsonb_set(current_state, '{revision}', to_jsonb(current_revision), true);
  update public.tournaments
  set state = current_state,
      revision = current_revision
  where id = p_tournament_id;

  return current_state;
end;
$$;

revoke all on function public.admin_advance_round_impl(uuid, text, integer) from public, anon, authenticated;

create or replace function public.admin_set_result_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_team_one_score integer,
  p_team_two_score integer,
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
  current_set jsonb;
  completed_sets jsonb;
  undo_state jsonb;
  next_waiting_match jsonb;
  round_index integer;
  match_index integer;
  round_match_index integer;
  next_waiting_index integer;
  games_to_win_set integer;
  sets_to_win_match integer;
  set_one_wins integer;
  set_two_wins integer;
  final_round_number integer;
  final_match jsonb;
begin
  if p_tournament_id is null
    or p_admin_token is null
    or length(p_admin_token) < 16
    or p_match_id is null
    or p_team_one_score is null
    or p_team_two_score is null
    or p_team_one_score < 0
    or p_team_two_score < 0
    or p_team_one_score = p_team_two_score
    or p_expected_revision is null
    or p_expected_revision < 0 then
    raise exception 'Invalid set result payload';
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

  games_to_win_set := greatest(1, least(12, coalesce((current_state->'settings'->>'gamesToWinSet')::integer, 6)));
  sets_to_win_match := greatest(1, least(5, coalesce((current_state->'settings'->>'setsToWinMatch')::integer, 1)));
  if not (
    (greatest(p_team_one_score, p_team_two_score) = games_to_win_set
      and greatest(p_team_one_score, p_team_two_score) - least(p_team_one_score, p_team_two_score) >= 2)
    or (greatest(p_team_one_score, p_team_two_score) = games_to_win_set + 1
      and least(p_team_one_score, p_team_two_score) in (games_to_win_set - 1, games_to_win_set))
  ) then
    raise exception 'Invalid set score';
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

        if round_item->>'status' <> 'active' then
          raise exception 'Match is not in the active round';
        end if;
        if match_item->>'state' not in ('playing', 'waiting') then
          raise exception 'Match is not available for a set result';
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
          'revision', to_jsonb(current_revision),
          'cupWinnerTeam', coalesce(current_state->'cup'->'winnerTeam', 'null'::jsonb)
        );
        current_set := jsonb_build_object(
          'teamOne', p_team_one_score,
          'teamTwo', p_team_two_score
        );
        completed_sets := coalesce(match_item->'completedSets', '[]'::jsonb) || jsonb_build_array(current_set);
        set_one_wins := (
          select count(*) from jsonb_array_elements(completed_sets) set_item
          where (set_item->>'teamOne')::integer > (set_item->>'teamTwo')::integer
        );
        set_two_wins := (
          select count(*) from jsonb_array_elements(completed_sets) set_item
          where (set_item->>'teamTwo')::integer > (set_item->>'teamOne')::integer
        );

        match_item := jsonb_set(match_item, '{lastScoredMatchState}', undo_state, true);
        match_item := jsonb_set(match_item, '{currentSet}', current_set, true);
        match_item := jsonb_set(match_item, '{currentGame}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
        match_item := jsonb_set(match_item, '{completedSets}', completed_sets, true);
        if greatest(set_one_wins, set_two_wins) >= sets_to_win_match then
          match_item := jsonb_set(match_item, '{state}', '"finished"'::jsonb, true);
          match_item := jsonb_set(match_item, '{winnerTeamIndex}', to_jsonb(case when set_one_wins > set_two_wins then 0 else 1 end), true);
          match_item := jsonb_set(match_item, '{isWalkover}', 'false'::jsonb, true);
          match_item := jsonb_set(match_item, '{completedAt}', to_jsonb(now()), true);

          if next_waiting_index is not null then
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'state'], '"playing"'::jsonb, true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtId'], match_item->'courtId', true);
            matches := jsonb_set(matches, ARRAY[next_waiting_index::text, 'courtName'], match_item->'courtName', true);
          end if;
        else
          match_item := jsonb_set(match_item, '{state}', '"playing"'::jsonb, true);
          match_item := jsonb_set(match_item, '{currentSet}', '{"teamOne": 0, "teamTwo": 0}'::jsonb, true);
        end if;

        matches := jsonb_set(matches, ARRAY[match_index::text], match_item, false);
        round_item := jsonb_set(round_item, '{matches}', matches, true);
        rounds := jsonb_set(rounds, ARRAY[round_index::text], round_item, false);
        current_state := jsonb_set(current_state, '{rounds}', rounds, true);

        if current_state->'settings'->>'format' = 'cup'
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

  raise exception 'Match not found';
end;
$$;

revoke all on function public.admin_set_result_impl(uuid, text, uuid, integer, integer, integer) from public, anon, authenticated;

create or replace function public.admin_match_action_impl(
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
            'revision', to_jsonb(current_revision),
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

revoke all on function public.admin_match_action_impl(uuid, text, uuid, text, integer, integer) from public, anon, authenticated;

create or replace function public.admin_undo_match_impl(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
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
  restored_match jsonb;
  next_waiting_match jsonb;
  existing_next_match jsonb;
  round_index integer;
  match_index integer;
  next_waiting_index integer;
  source_revision integer;
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

      undo_state := match_item->'lastScoredMatchState';
      if undo_state is null
        or jsonb_typeof(undo_state) <> 'object'
        or jsonb_typeof(undo_state->'match') <> 'object' then
        raise exception 'No undo available for this match';
      end if;

      if undo_state ? 'revision' then
        if coalesce(undo_state->>'revision', '') !~ '^[0-9]+$' then
          raise exception 'Invalid undo state';
        end if;
        source_revision := (undo_state->>'revision')::integer;
        if current_revision <> source_revision + 1 then
          raise exception 'Tournament state changed or not found';
        end if;
      end if;

      restored_match := (undo_state->'match')::jsonb - 'lastScoredMatchState'::text;
      if restored_match->>'id' <> p_match_id::text then
        raise exception 'Invalid undo state';
      end if;
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
          or jsonb_typeof(existing_next_match->'lastScoredMatchState') = 'object' then
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
$$;

revoke all on function public.admin_undo_match_impl(uuid, text, uuid, integer) from public, anon, authenticated;

create or replace function public.delete_tournament_impl(
  p_tournament_id uuid,
  p_admin_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
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

create or replace function public.create_tournament(
  p_state jsonb,
  p_admin_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_state is null
    or jsonb_typeof(p_state) <> 'object'
    or pg_column_size(p_state) > 262144
    or p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or length(coalesce(p_state->>'name', '')) not between 1 and 80
    or coalesce(p_state->>'inviteCode', '') !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid tournament payload';
  end if;

  if not public.consume_api_rate_limit('create:' || p_admin_token, 10, 3600) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.create_tournament_impl(p_state, p_admin_token);
end;
$$;

create or replace function public.get_tournament_by_code(
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid invite code';
  end if;

  if not public.consume_api_rate_limit('get:' || upper(trim(p_invite_code)), 60, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.get_tournament_by_code_impl(p_invite_code);
end;
$$;

create or replace function public.save_tournament_state(
  p_tournament_id uuid,
  p_admin_token text,
  p_state jsonb,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_state is null
    or jsonb_typeof(p_state) <> 'object'
    or pg_column_size(p_state) > 262144
    or p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_state->>'id' <> p_tournament_id::text
    or coalesce(p_state->>'inviteCode', '') !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid tournament state payload';
  end if;

  if not public.consume_api_rate_limit('admin-state:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.save_tournament_state_impl(p_tournament_id, p_admin_token, p_state, p_expected_revision);
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
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$'
    or p_player is null
    or jsonb_typeof(p_player) <> 'object'
    or length(trim(coalesce(p_player->>'name', ''))) not between 1 and 64 then
    raise exception 'Invalid player payload';
  end if;

  if not public.consume_api_rate_limit('join:' || upper(trim(p_invite_code)), 30, 600) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.join_tournament_impl(p_invite_code, p_player);
end;
$$;

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
begin
  if p_player_token is null or trim(p_player_token) !~ '^[0-9a-f]{48}$' then
    raise exception 'Invalid player score payload';
  end if;

  if not public.consume_api_rate_limit('player-score:' || trim(p_player_token), 240, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.save_player_point_impl(
    p_tournament_id,
    p_invite_code,
    p_player_id,
    p_match_id,
    p_team_index,
    p_player_token
  );
end;
$$;

create or replace function public.admin_advance_cup(
  p_tournament_id uuid,
  p_admin_token text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid cup advance payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_advance_cup_impl(p_tournament_id, p_admin_token, p_expected_revision);
end;
$$;

create or replace function public.admin_advance_round(
  p_tournament_id uuid,
  p_admin_token text,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid round advance payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_advance_round_impl(p_tournament_id, p_admin_token, p_expected_revision);
end;
$$;

create or replace function public.admin_set_result(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_team_one_score integer,
  p_team_two_score integer,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid set result payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_set_result_impl(
    p_tournament_id,
    p_admin_token,
    p_match_id,
    p_team_one_score,
    p_team_two_score,
    p_expected_revision
  );
end;
$$;

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
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid admin match action payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_match_action_impl(
    p_tournament_id,
    p_admin_token,
    p_match_id,
    p_action,
    p_team_index,
    p_expected_revision
  );
end;
$$;

create or replace function public.admin_undo_match(
  p_tournament_id uuid,
  p_admin_token text,
  p_match_id uuid,
  p_expected_revision integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid undo payload';
  end if;

  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.admin_undo_match_impl(
    p_tournament_id,
    p_admin_token,
    p_match_id,
    p_expected_revision
  );
end;
$$;

create or replace function public.delete_tournament(
  p_tournament_id uuid,
  p_admin_token text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid delete payload';
  end if;

  if not public.consume_api_rate_limit('delete:' || p_admin_token, 10, 3600) then
    raise exception 'Rate limit exceeded';
  end if;

  return public.delete_tournament_impl(p_tournament_id, p_admin_token);
end;
$$;

-- Internal retention job. Run this from trusted database maintenance only.
create or replace function public.cleanup_expired_tournaments(
  p_retention_days integer default 30
)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  deleted_tournaments integer;
begin
  if p_retention_days is null or p_retention_days < 1 or p_retention_days > 3650 then
    raise exception 'Invalid retention window';
  end if;

  delete from public.tournaments
  where state->>'status' = 'Avsluttet'
    and coalesce(retention_expires_at, updated_at + make_interval(days => p_retention_days)) <= now();

  get diagnostics deleted_tournaments = row_count;

  delete from public.api_rate_limits
  where updated_at < now() - interval '1 day';

  return deleted_tournaments;
end;
$$;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.create_tournament_impl(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_tournament_by_code_impl(text) from public, anon, authenticated;
revoke all on function public.save_tournament_state_impl(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.join_tournament_impl(text, jsonb) from public, anon, authenticated;
revoke all on function public.delete_tournament_impl(uuid, text) from public, anon, authenticated;

revoke all on function public.create_tournament(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_tournament_by_code(text) from public, anon, authenticated;
revoke all on function public.save_tournament_state(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.join_tournament(text, jsonb) from public, anon, authenticated;
revoke all on function public.save_player_point(uuid, text, uuid, uuid, integer, text) from public, anon, authenticated;
revoke all on function public.admin_advance_cup(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_advance_round(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.admin_set_result(uuid, text, uuid, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_match_action(uuid, text, uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.admin_undo_match(uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.delete_tournament(uuid, text) from public, anon, authenticated;
revoke all on function public.cleanup_expired_tournaments(integer) from public, anon, authenticated;

create or replace function public.claim_tournament(uuid, text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare claimed public.tournaments;
begin
  if auth.uid() is null or $1 is null or $2 is null or $2 !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then raise exception 'Authentication required'; end if;
  update public.tournaments set owner_user_id = auth.uid(), claimed_at = coalesce(claimed_at, now())
  where id = $1 and admin_token = $2 and (owner_user_id is null or owner_user_id = auth.uid())
  returning id, owner_user_id, claimed_at into claimed;
  if claimed.id is null then raise exception 'Tournament claim denied'; end if;
  return jsonb_build_object('id', claimed.id, 'ownerUserId', claimed.owner_user_id, 'claimedAt', claimed.claimed_at);
end; $$;
revoke all on function public.claim_tournament(uuid, text) from public, anon;
grant execute on function public.claim_tournament(uuid, text) to authenticated;

grant execute on function public.create_tournament(jsonb, text) to anon;
grant execute on function public.get_tournament_by_code(text) to anon;
grant execute on function public.save_tournament_state(uuid, text, jsonb, integer) to anon;
grant execute on function public.join_tournament(text, jsonb) to anon;
grant execute on function public.save_player_point(uuid, text, uuid, uuid, integer, text) to anon;
grant execute on function public.admin_advance_cup(uuid, text, integer) to anon;
grant execute on function public.admin_advance_round(uuid, text, integer) to anon;
grant execute on function public.admin_set_result(uuid, text, uuid, integer, integer, integer) to anon;
grant execute on function public.admin_match_action(uuid, text, uuid, text, integer, integer) to anon;
grant execute on function public.admin_undo_match(uuid, text, uuid, integer) to anon;
grant execute on function public.delete_tournament(uuid, text) to anon;

create or replace function public.set_player_availability_impl(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_availability text,
  p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  current_state jsonb;
  current_revision integer;
  next_state jsonb;
  next_players jsonb;
begin
  if p_tournament_id is null or p_invite_code is null or p_player_id is null
    or p_availability not in ('active', 'away') or p_player_token is null
    or length(trim(p_player_token)) < 32 then
    raise exception 'Invalid player availability payload';
  end if;
  if not exists (
    select 1 from public.player_sessions
    where tournament_id = p_tournament_id and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player token mismatch';
  end if;
  select state, revision into current_state, current_revision
  from public.tournaments
  where id = p_tournament_id and invite_code = upper(trim(p_invite_code))
  for update;
  if current_state is null then raise exception 'Tournament not found'; end if;
  select jsonb_agg(case when value->>'id' = p_player_id::text
    then jsonb_set(value, '{availability}', to_jsonb(p_availability), true)
    else value end)
  into next_players from jsonb_array_elements(coalesce(current_state->'players', '[]'::jsonb)) value;
  if next_players is null then raise exception 'Player not found'; end if;
  next_state := jsonb_set(current_state, '{players}', next_players, true);
  next_state := jsonb_set(next_state, '{revision}', to_jsonb(current_revision + 1), true);
  update public.tournaments set state = next_state, revision = current_revision + 1
  where id = p_tournament_id and revision = current_revision;
  return next_state;
end;
$$;

create or replace function public.set_player_availability(
  p_tournament_id uuid, p_invite_code text, p_player_id uuid,
  p_availability text, p_player_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not public.consume_api_rate_limit('availability:' || coalesce(p_player_token, 'missing'), 30, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.set_player_availability_impl(p_tournament_id, p_invite_code, p_player_id, p_availability, p_player_token);
end;
$$;

revoke all on function public.set_player_availability_impl(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.set_player_availability(uuid, text, uuid, text, text) from public, authenticated;
grant execute on function public.set_player_availability(uuid, text, uuid, text, text) to anon;

-- Fase 9: local/server profile ownership, history and delayed deletion.
create table if not exists public.player_profiles (
  id uuid primary key,
  token_hash text not null,
  display_name text not null,
  avatar_id text not null default 'smash',
  deletion_requested_at timestamptz,
  deletion_scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint player_profiles_name_length check (length(display_name) between 1 and 64),
  constraint player_profiles_avatar check (avatar_id in ('smash', 'serve', 'wall', 'lob')),
  constraint player_profiles_token_hash_length check (length(token_hash) = 64)
);

create table if not exists public.player_profile_history (
  id uuid not null,
  profile_id uuid not null references public.player_profiles(id) on delete cascade,
  tournament_id uuid,
  tournament_name text not null,
  ended_at timestamptz not null,
  placement integer,
  points integer not null default 0,
  matches integer not null default 0,
  wins integer not null default 0,
  sets integer not null default 0,
  games integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (profile_id, id),
  constraint player_profile_history_numbers check (points >= 0 and matches >= 0 and wins >= 0 and sets >= 0 and games >= 0)
);

alter table public.player_profiles enable row level security;
alter table public.player_profile_history enable row level security;
revoke all privileges on table public.player_profiles from public, anon, authenticated;
revoke all privileges on table public.player_profile_history from public, anon, authenticated;
create index if not exists player_profile_history_profile_ended_idx on public.player_profile_history (profile_id, ended_at desc);

create or replace function public.upsert_player_profile_impl(uuid, text, text, text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare existing_hash text; saved public.player_profiles; next_name text := trim(coalesce($3, '')); next_avatar text := case when $4 in ('smash', 'serve', 'wall', 'lob') then $4 else 'smash' end;
begin
  if $1 is null or $2 is null or length(trim($2)) < 32 or length(next_name) not between 1 and 64 then raise exception 'Invalid profile payload'; end if;
  select token_hash into existing_hash from public.player_profiles where id = $1 for update;
  if existing_hash is not null and existing_hash <> encode(extensions.digest(trim($2), 'sha256'), 'hex') then raise exception 'Profile token mismatch'; end if;
  insert into public.player_profiles (id, token_hash, display_name, avatar_id) values ($1, encode(extensions.digest(trim($2), 'sha256'), 'hex'), next_name, next_avatar)
  on conflict (id) do update set display_name = excluded.display_name, avatar_id = excluded.avatar_id, deletion_requested_at = null, deletion_scheduled_for = null, updated_at = now()
  returning * into saved;
  return jsonb_build_object('profile', jsonb_build_object('id', saved.id, 'displayName', saved.display_name, 'avatarId', saved.avatar_id, 'createdAt', saved.created_at, 'updatedAt', saved.updated_at, 'deletionRequestedAt', saved.deletion_requested_at, 'deletionScheduledFor', saved.deletion_scheduled_for));
end; $$;

create or replace function public.save_player_profile_history_impl(uuid, text, jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if $1 is null or $2 is null or length(trim($2)) < 32 or $3 is null or jsonb_typeof($3) <> 'object' then raise exception 'Invalid profile history payload'; end if;
  if not exists (select 1 from public.player_profiles where id = $1 and token_hash = encode(extensions.digest(trim($2), 'sha256'), 'hex')) then raise exception 'Profile token mismatch'; end if;
  insert into public.player_profile_history (id, profile_id, tournament_id, tournament_name, ended_at, placement, points, matches, wins, sets, games)
  values (($3->>'id')::uuid, $1, nullif($3->>'tournamentId', '')::uuid, left(trim($3->>'tournamentName'), 120), ($3->>'endedAt')::timestamptz, nullif($3->>'placement', '')::integer, greatest(0, coalesce(($3->>'points')::integer, 0)), greatest(0, coalesce(($3->>'matches')::integer, 0)), greatest(0, coalesce(($3->>'wins')::integer, 0)), greatest(0, coalesce(($3->>'sets')::integer, 0)), greatest(0, coalesce(($3->>'games')::integer, 0)))
  on conflict (profile_id, id) do update set tournament_name = excluded.tournament_name, ended_at = excluded.ended_at, placement = excluded.placement, points = excluded.points, matches = excluded.matches, wins = excluded.wins, sets = excluded.sets, games = excluded.games;
  return true;
end; $$;

create or replace function public.get_player_profile_history_impl(uuid, text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if $1 is null or $2 is null or length(trim($2)) < 32 or not exists (select 1 from public.player_profiles where id = $1 and token_hash = encode(extensions.digest(trim($2), 'sha256'), 'hex')) then raise exception 'Profile token mismatch'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', h.id, 'profileId', h.profile_id, 'tournamentId', h.tournament_id, 'tournamentName', h.tournament_name, 'endedAt', h.ended_at, 'placement', h.placement, 'points', h.points, 'matches', h.matches, 'wins', h.wins, 'sets', h.sets, 'games', h.games) order by h.ended_at desc) from public.player_profile_history h where h.profile_id = $1), '[]'::jsonb);
end; $$;

create or replace function public.request_player_profile_deletion_impl(uuid, text)
returns timestamptz language plpgsql security definer set search_path = public, pg_catalog as $$
declare scheduled timestamptz := now() + interval '30 days';
begin update public.player_profiles set deletion_requested_at = now(), deletion_scheduled_for = scheduled, updated_at = now() where id = $1 and token_hash = encode(extensions.digest(trim(coalesce($2, '')), 'sha256'), 'hex') and length(trim(coalesce($2, ''))) >= 32; if not found then raise exception 'Profile token mismatch'; end if; return scheduled; end; $$;

create or replace function public.cancel_player_profile_deletion_impl(uuid, text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
begin update public.player_profiles set deletion_requested_at = null, deletion_scheduled_for = null, updated_at = now() where id = $1 and token_hash = encode(extensions.digest(trim(coalesce($2, '')), 'sha256'), 'hex') and length(trim(coalesce($2, ''))) >= 32; if not found then raise exception 'Profile token mismatch'; end if; return true; end; $$;

create or replace function public.cleanup_expired_player_profiles(integer default 30)
returns integer language plpgsql security definer set search_path = public, pg_catalog as $$
declare deleted_count integer;
begin if $1 is null or $1 < 1 or $1 > 3650 then raise exception 'Invalid retention window'; end if; delete from public.player_profiles where deletion_scheduled_for is not null and deletion_scheduled_for <= now() and deletion_requested_at <= now() - make_interval(days => $1); get diagnostics deleted_count = row_count; return deleted_count; end; $$;

create or replace function public.upsert_player_profile(uuid, text, text, text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$ begin if not public.consume_api_rate_limit('profile:' || coalesce($2, 'missing'), 30, 3600) then raise exception 'Rate limit exceeded'; end if; return public.upsert_player_profile_impl($1, $2, $3, $4); end; $$;
create or replace function public.save_player_profile_history(uuid, text, jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$ begin if not public.consume_api_rate_limit('profile-history:' || coalesce($2, 'missing'), 60, 3600) then raise exception 'Rate limit exceeded'; end if; return public.save_player_profile_history_impl($1, $2, $3); end; $$;
create or replace function public.get_player_profile_history(uuid, text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$ begin if not public.consume_api_rate_limit('profile-history-read:' || coalesce($2, 'missing'), 60, 3600) then raise exception 'Rate limit exceeded'; end if; return public.get_player_profile_history_impl($1, $2); end; $$;

create or replace function public.request_player_profile_deletion(uuid, text)
returns timestamptz language plpgsql security definer set search_path = public, pg_catalog as $$ begin if not public.consume_api_rate_limit('profile-delete:' || coalesce($2, 'missing'), 10, 3600) then raise exception 'Rate limit exceeded'; end if; return public.request_player_profile_deletion_impl($1, $2); end; $$;
create or replace function public.cancel_player_profile_deletion(uuid, text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$ begin if not public.consume_api_rate_limit('profile-cancel-delete:' || coalesce($2, 'missing'), 10, 3600) then raise exception 'Rate limit exceeded'; end if; return public.cancel_player_profile_deletion_impl($1, $2); end; $$;

revoke all on function public.upsert_player_profile_impl(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.save_player_profile_history_impl(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_player_profile_history_impl(uuid, text) from public, anon, authenticated;
revoke all on function public.request_player_profile_deletion_impl(uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_player_profile_deletion_impl(uuid, text) from public, anon, authenticated;
revoke all on function public.cleanup_expired_player_profiles(integer) from public, anon, authenticated;
revoke all on function public.upsert_player_profile(uuid, text, text, text) from public, authenticated;
revoke all on function public.save_player_profile_history(uuid, text, jsonb) from public, authenticated;
revoke all on function public.get_player_profile_history(uuid, text) from public, authenticated;
revoke all on function public.request_player_profile_deletion(uuid, text) from public, authenticated;
revoke all on function public.cancel_player_profile_deletion(uuid, text) from public, authenticated;
grant execute on function public.upsert_player_profile(uuid, text, text, text) to anon;
grant execute on function public.save_player_profile_history(uuid, text, jsonb) to anon;
grant execute on function public.get_player_profile_history(uuid, text) to anon;
grant execute on function public.request_player_profile_deletion(uuid, text) to anon;
grant execute on function public.cancel_player_profile_deletion(uuid, text) to anon;

create or replace function public.upsert_push_subscription(uuid, text, uuid, text, jsonb)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
declare next_endpoint text := trim(coalesce($5->>'endpoint', ''));
begin
  if $1 is null or $3 is null or $4 is null or length(trim($4)) < 32 or $5 is null or jsonb_typeof($5) <> 'object' or next_endpoint = '' or length(next_endpoint) > 2048 or $5->'keys' is null then raise exception 'Invalid push subscription payload'; end if;
  if not exists (select 1 from public.player_sessions where tournament_id = $1 and player_id = $3 and token_hash = encode(extensions.digest(trim($4), 'sha256'), 'hex')) or not exists (select 1 from public.tournaments where id = $1 and invite_code = upper(trim($2))) then raise exception 'Player session mismatch'; end if;
  insert into public.push_subscriptions (tournament_id, player_id, endpoint, subscription) values ($1, $3, next_endpoint, $5)
  on conflict (endpoint) do update set tournament_id = excluded.tournament_id, player_id = excluded.player_id, subscription = excluded.subscription, updated_at = now();
  return true;
end; $$;
create or replace function public.delete_push_subscription(uuid, uuid, text, text)
returns boolean language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  if not exists (select 1 from public.player_sessions where tournament_id = $1 and player_id = $2 and token_hash = encode(extensions.digest(trim(coalesce($3, '')), 'sha256'), 'hex')) then raise exception 'Player session mismatch'; end if;
  delete from public.push_subscriptions where tournament_id = $1 and player_id = $2 and endpoint = trim($4);
  return true;
end; $$;
revoke all on function public.upsert_push_subscription(uuid, text, uuid, text, jsonb) from public, authenticated;
revoke all on function public.delete_push_subscription(uuid, uuid, text, text) from public, authenticated;
grant execute on function public.upsert_push_subscription(uuid, text, uuid, text, jsonb) to anon;
grant execute on function public.delete_push_subscription(uuid, uuid, text, text) to anon;

-- Dedicated read contract for public spectator clients. Keep this whitelist in
-- sync with supabase/migrations/20260831120000_spectator_state_rpc.sql.
create or replace function public.get_spectator_tournament_by_code(
  p_invite_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  tournament_state jsonb;
begin
  if p_invite_code is null
    or upper(trim(p_invite_code)) !~ '^[A-Z0-9]{4,8}$' then
    raise exception 'Invalid invite code';
  end if;

  if not public.consume_api_rate_limit('spectator:' || upper(trim(p_invite_code)), 60, 60) then
    raise exception 'Rate limit exceeded';
  end if;

  select jsonb_build_object(
    'id', t.id,
    'name', t.state->'name',
    'inviteCode', t.state->'inviteCode',
    'status', t.state->'status',
    'currentRound', t.state->'currentRound',
    'settings', t.state->'settings',
    'courts', t.state->'courts',
    'players', t.state->'players',
    'rounds', t.state->'rounds',
    'cup', t.state->'cup',
    'revision', to_jsonb(t.revision)
  )
  into tournament_state
  from public.tournaments as t
  where t.invite_code = upper(trim(p_invite_code))
  limit 1;

  return tournament_state;
end;
$$;

revoke all on function public.get_spectator_tournament_by_code(text) from public, anon, authenticated;
grant execute on function public.get_spectator_tournament_by_code(text) to anon;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema extensions;
    if not exists (select 1 from cron.job where jobname = 'padelstar-retention-cleanup') then
      perform cron.schedule('padelstar-retention-cleanup', '15 3 * * *', $job$select public.cleanup_expired_tournaments(); select public.cleanup_expired_player_profiles();$job$);
    end if;
  end if;
end;
$$;

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
