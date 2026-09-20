-- Accounts whose email address is not verified within 7 days are deleted (developer's policy, 2026-09-20).
--
-- An account counts from `created_at`; it is deleted once `created_at + 7 days` has passed and its `email_confirmed_at` is
-- still empty. Accounts that already existed when the policy was set (all created before 2026-09-21) are deleted on
-- 2026-09-28 at the earliest (the developer's date), so nobody is deleted before then. The job runs daily.
--
-- Safety: the system owner is never deleted, and neither is an account that owns a tournament (an unverified account
-- cannot sign in, so this should never happen; the check makes sure a mistake cannot remove tournament owners).
-- Deleting the account cascades to its profile row, statistics and tournament links (see admin_delete_user). Each deletion
-- is written to the system log with the reason and the account id only (no email address).

create or replace function public.cleanup_unverified_users(p_now timestamptz default now())
returns integer
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  candidate record;
  removed integer := 0;
begin
  for candidate in
    select u.id
    from auth.users u
    where u.email_confirmed_at is null
      and greatest(u.created_at + interval '7 days', timestamptz '2026-09-28 00:00:00+02') <= p_now
      and not exists (select 1 from public.system_owner s where s.user_id = u.id)
      and not exists (select 1 from public.tournaments t where t.owner_user_id = u.id)
  loop
    delete from auth.users where id = candidate.id;
    perform public._log_system_event('user_deleted', 'user', candidate.id::text, null, jsonb_build_object('reason', 'unverifiedEmail'));
    removed := removed + 1;
  end loop;
  return removed;
end
$function$;
revoke execute on function public.cleanup_unverified_users(timestamptz) from public, anon, authenticated;

do $schedule$
begin
  if to_regnamespace('cron') is not null then
    begin
      perform cron.unschedule('padelstar-unverified-users');
    exception when others then null;
    end;
    perform cron.schedule('padelstar-unverified-users', '20 3 * * *', 'select public.cleanup_unverified_users()');
  end if;
end
$schedule$;
