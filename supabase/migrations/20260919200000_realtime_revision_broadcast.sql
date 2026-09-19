-- Live updates between devices.
--
-- Found in the first live run (2026-09-19): the app subscribes to postgres_changes on public.tournaments, but
-- migration 20260904210000_security_hardening.sql (rightly) removed the anonymous read policy and revoked SELECT,
-- and Realtime only delivers a row change to a subscriber that may SELECT the row. A subscription therefore
-- succeeds and never receives anything: a device only saw new data after its own RPC, a reload or the manual
-- "Last inn siste" button. The read policy must NOT come back (it would expose every tournament's state and
-- invite code).
--
-- Instead this trigger sends a tiny Realtime Broadcast message on the tournament's own channel
-- ("tournament:<id>", the name the client already uses) whenever the revision changes. The payload is only the
-- new revision number: no state, no invite code, no tokens. A device that sees a revision newer than its own
-- fetches the state through the existing token-checked RPC (get_tournament_by_code). The channel name contains
-- the tournament's random UUID, which only participants receive.
--
-- A failing broadcast must never fail the update, so errors are swallowed.

create or replace function public.notify_tournament_revision()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if new.revision is distinct from old.revision then
    begin
      perform realtime.send(jsonb_build_object('revision', new.revision), 'revision', 'tournament:' || new.id::text, false);
    exception when others then
      null;
    end;
  end if;
  return null;
end
$function$;

revoke execute on function public.notify_tournament_revision() from public, anon, authenticated;

drop trigger if exists tournaments_notify_revision on public.tournaments;
create trigger tournaments_notify_revision
  after update on public.tournaments
  for each row execute function public.notify_tournament_revision();
