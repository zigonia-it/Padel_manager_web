-- Phase 16: the admin can see that a guest tournament has expired and has 7 days left (developer's decision 2026-09-20).
--
-- A guest tournament with no real activity for 30 days is marked expired (expired_at) and deleted 7 days later; any real
-- state write reactivates it (20260919090500_cleanup_stale_guest_tournaments.sql). Nothing told the admin. This function
-- answers the tournament's admin (by admin token, like every admin function) whether it is expired and when it will be
-- deleted, so the app can show a notice with a "continue" button. Reading it changes nothing.

create or replace function public.admin_tournament_expiry_impl(p_tournament_id uuid, p_admin_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  expired timestamptz;
  found_row boolean;
begin
  select true, t.expired_at into found_row, expired
  from public.tournaments t
  where t.id = p_tournament_id and t.admin_token = p_admin_token;
  if not coalesce(found_row, false) then
    raise exception 'Admin token mismatch or tournament not found';
  end if;
  return jsonb_build_object(
    'expired', expired is not null,
    'expiredAt', expired,
    'deletesAt', case when expired is null then null else expired + interval '7 days' end
  );
end
$function$;
revoke all on function public.admin_tournament_expiry_impl(uuid, text) from public, anon, authenticated;

create or replace function public.admin_tournament_expiry(p_tournament_id uuid, p_admin_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if p_tournament_id is null or p_admin_token is null
    or p_admin_token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid expiry request';
  end if;
  if not public.consume_api_rate_limit('admin:' || p_admin_token, 120, 60) then
    raise exception 'Rate limit exceeded';
  end if;
  return public.admin_tournament_expiry_impl(p_tournament_id, p_admin_token);
end;
$$;
revoke all on function public.admin_tournament_expiry(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_tournament_expiry(uuid, text) to anon, authenticated;
