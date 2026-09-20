-- Two-factor authentication for system administration (developer's decision 2026-09-20).
--
-- Supabase Auth issues sessions at an "assurance level": aal1 = signed in with the password (or a sign-in link), aal2 = the
-- session has also passed a second factor (a TOTP code from an authenticator app). The level is in the access token
-- (`auth.jwt()->>'aal'`), which the client cannot forge.
--
-- is_system_owner() is the check every owner function already starts with (overview, lists, log, block, delete, ...). It now
-- also requires aal2, so a password alone - or a stolen session - no longer reaches any owner function, whatever the page
-- does. Nothing else had to change: those functions call is_system_owner().
--
-- system_owner_status() answers only about the caller and works at aal1 too. The page needs it to know that the caller is
-- the owner and must enter (or first set up) the second factor, and the menu link uses it to decide whether to show.
-- The first enrolment is the one moment a password alone is enough: the owner enrols right after this is released.

create or replace function public.is_system_owner()
returns boolean
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select auth.uid() is not null
    and exists (select 1 from public.system_owner where user_id = auth.uid())
    and coalesce(auth.jwt()->>'aal', '') = 'aal2';
$function$;

create or replace function public.system_owner_status()
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select jsonb_build_object(
    'owner', auth.uid() is not null and exists (select 1 from public.system_owner where user_id = auth.uid()),
    'secondFactor', coalesce(auth.jwt()->>'aal', '') = 'aal2'
  );
$function$;

revoke execute on function public.is_system_owner() from public, anon;
grant execute on function public.is_system_owner() to authenticated;
revoke execute on function public.system_owner_status() from public, anon;
grant execute on function public.system_owner_status() to authenticated;
