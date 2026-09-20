-- Push categories (Phase 18, developer's decision 2026-09-20).
--
-- Each push subscription (one per device and tournament) carries the player's choices in `prefs`:
--   match       - my match is ready / a round starts        (default on)
--   result      - a result was corrected                    (default on)
--   withdrawal  - a teammate withdrew, I must decide        (default on)
--   onlyMine    - match and result pushes only for matches I play in (default off; a round-ready push still goes to everyone)
-- A key that is missing means the default. The push-send edge function reads `prefs` with the service role and filters before
-- it sends, so the choice is enforced on the server (the client only stores it). Guests can set them too: the player's
-- session token is the credential, as for the subscription itself.

alter table public.push_subscriptions add column if not exists prefs jsonb not null default '{}'::jsonb;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'push_subscription_prefs_size') then
    alter table public.push_subscriptions add constraint push_subscription_prefs_size check (pg_column_size(prefs) <= 512);
  end if;
end
$$;

create or replace function public.set_push_preferences(
  p_tournament_id uuid,
  p_player_id uuid,
  p_player_token text,
  p_endpoint text,
  p_prefs jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  clean jsonb := '{}'::jsonb;
  pref_key text;
  updated integer;
begin
  if p_tournament_id is null or p_player_id is null or p_player_token is null or length(trim(p_player_token)) < 32
    or p_endpoint is null or length(trim(p_endpoint)) = 0 or jsonb_typeof(p_prefs) is distinct from 'object' then
    raise exception 'Invalid push preferences';
  end if;
  if not exists (
    select 1 from public.player_sessions
    where tournament_id = p_tournament_id and player_id = p_player_id
      and token_hash = encode(extensions.digest(trim(p_player_token), 'sha256'), 'hex')
  ) then
    raise exception 'Player session mismatch';
  end if;
  -- only the known switches, only booleans: nothing else can be stored
  foreach pref_key in array array['match', 'result', 'withdrawal', 'onlyMine'] loop
    if jsonb_typeof(p_prefs->pref_key) = 'boolean' then
      clean := clean || jsonb_build_object(pref_key, p_prefs->pref_key);
    end if;
  end loop;
  update public.push_subscriptions
  set prefs = clean, updated_at = now()
  where tournament_id = p_tournament_id and player_id = p_player_id and endpoint = trim(p_endpoint);
  get diagnostics updated = row_count;
  return updated > 0;
end;
$$;

-- A signed-in player calls the API as `authenticated`, a guest as `anon`; the player's token is the credential in both cases.
revoke all on function public.set_push_preferences(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.set_push_preferences(uuid, uuid, text, text, jsonb) to anon, authenticated;

-- Fix: delete_push_subscription was granted to guests only (upsert_push_subscription was later opened to signed-in players),
-- so a signed-in player could not switch push off. It checks the same player token.
grant execute on function public.delete_push_subscription(uuid, uuid, text, text) to authenticated;
