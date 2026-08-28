create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscription_endpoint_length check (length(endpoint) between 20 and 2048),
  constraint push_subscription_size check (pg_column_size(subscription) <= 8192)
);

alter table public.push_subscriptions enable row level security;
revoke all privileges on table public.push_subscriptions from public, anon, authenticated;

create or replace function public.upsert_push_subscription(
  p_tournament_id uuid,
  p_invite_code text,
  p_player_id uuid,
  p_player_token text,
  p_subscription jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  next_endpoint text := trim(coalesce(p_subscription->>'endpoint', ''));
begin
  if p_tournament_id is null or p_player_id is null or p_player_token is null
    or length(trim(p_player_token)) < 32 or p_subscription is null
    or jsonb_typeof(p_subscription) <> 'object' or next_endpoint = ''
    or length(next_endpoint) > 2048 or p_subscription->'keys' is null then
    raise exception 'Invalid push subscription payload';
  end if;
  if not exists (
    select 1 from public.player_sessions
    where tournament_id = p_tournament_id and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) or not exists (
    select 1 from public.tournaments where id = p_tournament_id and invite_code = upper(trim(p_invite_code))
  ) then
    raise exception 'Player session mismatch';
  end if;
  insert into public.push_subscriptions (tournament_id, player_id, endpoint, subscription)
  values (p_tournament_id, p_player_id, next_endpoint, p_subscription)
  on conflict (endpoint) do update
  set tournament_id = excluded.tournament_id, player_id = excluded.player_id,
      subscription = excluded.subscription, updated_at = now();
  return true;
end;
$$;

create or replace function public.delete_push_subscription(
  p_tournament_id uuid,
  p_player_id uuid,
  p_player_token text,
  p_endpoint text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not exists (
    select 1 from public.player_sessions
    where tournament_id = p_tournament_id and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(coalesce(p_player_token, '')), 'sha256'), 'hex')
  ) then raise exception 'Player session mismatch'; end if;
  delete from public.push_subscriptions where tournament_id = p_tournament_id and player_id = p_player_id and endpoint = trim(p_endpoint);
  return true;
end;
$$;

revoke all on function public.upsert_push_subscription(uuid, text, uuid, text, jsonb) from public, authenticated;
revoke all on function public.delete_push_subscription(uuid, uuid, text, text) from public, authenticated;
grant execute on function public.upsert_push_subscription(uuid, text, uuid, text, jsonb) to anon;
grant execute on function public.delete_push_subscription(uuid, uuid, text, text) to anon;
