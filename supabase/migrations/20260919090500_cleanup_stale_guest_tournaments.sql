-- Phase 16 retention: implement the approved guest-tournament inactivity lifecycle.
--
--   30 days without real activity  ->  expired (state preserved)
--   expired lasts 7 days           ->  any real state change reactivates it and restarts the 30-day clock
--   still expired after 7 days     ->  deleted permanently
--
-- Before this migration cleanup_expired_tournaments() only removed finished guest tournaments, so
-- abandoned ones ("Klar" / "Runde pågår") lived forever (29 of 40 guest rows were >7 days stale on
-- 2026-09-19). "Real activity" is a state write (match start/finish, setup change, scoring); reads,
-- refreshes and TV Mode never write, so they do not reset the clock.
--
-- Deletion is guarded by tournament_history_before_delete, which requires a
-- tournament_finalization_receipts row. Expiry therefore writes a 'cancelled' receipt first (exactly
-- what finalize_tournament stores for a guest tournament) and then deletes. Tournaments that still have
-- account-linked players (tournament_account_players) are skipped: their statistics must be transferred
-- by finalize_tournament, so cleanup is deferred rather than losing data.
--
-- Account-owned tournaments (owner_user_id is not null) are never touched. Permanent statistics live in
-- account_tournament_statistics, which has no foreign key to tournaments.

alter table public.tournaments add column if not exists expired_at timestamptz;

create or replace function public.clear_tournament_expiry()
returns trigger
language plpgsql
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if new.expired_at is not null and new.state is distinct from old.state then
    new.expired_at := null;
  end if;
  return new;
end
$function$;

drop trigger if exists tournaments_clear_expiry on public.tournaments;
create trigger tournaments_clear_expiry
  before update on public.tournaments
  for each row execute function public.clear_tournament_expiry();

drop function if exists public.cleanup_expired_tournaments(integer);

create or replace function public.cleanup_expired_tournaments(
  p_inactive_days integer default 30,
  p_grace_days integer default 7
)
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  n integer;
  total integer := 0;
  stale record;
begin
  if p_inactive_days is null or p_inactive_days < 1 or p_inactive_days > 3650
    or p_grace_days is null or p_grace_days < 1 or p_grace_days > 3650 then
    raise exception 'Invalid retention window';
  end if;

  -- 1. Finished guest tournaments whose statistics were already saved.
  delete from public.tournaments t
  where t.owner_user_id is null
    and t.state->>'status' = 'Avsluttet'
    and exists (select 1 from public.tournament_finalization_receipts r where r.tournament_id = t.id);
  get diagnostics n = row_count;
  total := total + n;

  -- 2. Mark guest tournaments with no real activity as expired.
  update public.tournaments
  set expired_at = now()
  where owner_user_id is null
    and expired_at is null
    and state->>'status' is distinct from 'Avsluttet'
    and updated_at < now() - make_interval(days => p_inactive_days);

  -- 3. Delete tournaments that stayed expired for the whole grace period.
  for stale in
    select t.id, t.admin_token, t.revision
    from public.tournaments t
    where t.owner_user_id is null
      and t.expired_at is not null
      and t.expired_at < now() - make_interval(days => p_grace_days)
      and not exists (select 1 from public.tournament_account_players b where b.tournament_id = t.id)
    for update
  loop
    insert into public.tournament_finalization_receipts
      (tournament_id, admin_token_hash, outcome, revision, deleted, finalized_at)
    values
      (stale.id, encode(extensions.digest(stale.admin_token, 'sha256'), 'hex'), 'cancelled', stale.revision, true, now())
    on conflict do nothing;
    delete from public.tournaments where id = stale.id;
    total := total + 1;
  end loop;

  return total;
end
$function$;

-- Reachable only by the scheduler (postgres), like before.
revoke execute on function public.cleanup_expired_tournaments(integer, integer) from public, anon, authenticated;
