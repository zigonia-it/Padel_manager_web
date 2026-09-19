-- Phase 17 (Q2): invitations without a friend list.
--
--   * The admin invites a person by email address. Nothing occupies a player slot until the person joins.
--   * The server never checks whether the address has an account, so an admin cannot use this to find out who has
--     one (no lookup, no different answer). The invitee sees the invitation after signing in with that verified email.
--   * Accepting = joining the tournament through the normal join flow (which links the slot to the account). The status
--     "accepted" is derived from the account actually being in the tournament, so it cannot be faked.
--   * Declining creates no participant. The admin can cancel a pending invitation.
--   * Invitations only count until the first round starts: after that they are "expired" for the admin and disappear
--     for the invitee (the replacement flow is used from then on). Pending invitations never count as participants.

create table if not exists public.tournament_invitations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  invitee_email text not null check (invitee_email = lower(invitee_email) and length(invitee_email) between 5 and 200),
  status text not null default 'pending' check (status in ('pending', 'declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  unique (tournament_id, invitee_email)
);
alter table public.tournament_invitations enable row level security;
revoke all on public.tournament_invitations from public, anon, authenticated;

-- Has the tournament left the lobby (a round exists) or ended?
create or replace function public._invitation_window_closed(p_state jsonb)
returns boolean
language sql
immutable
set search_path to 'public', 'pg_catalog'
as $function$
  select coalesce(p_state->>'status', '') = 'Avsluttet'
      or jsonb_array_length(coalesce(p_state->'rounds', '[]'::jsonb)) > 0;
$function$;

-- The invitations of one tournament as the admin sees them.
create or replace function public._invitations_json(p_tournament_id uuid)
returns jsonb
language sql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id, 'email', i.invitee_email, 'createdAt', i.created_at,
      'status', case
        when exists (select 1 from public.tournament_account_players tap join auth.users u on u.id = tap.user_id
                     where tap.tournament_id = i.tournament_id and lower(u.email) = i.invitee_email) then 'accepted'
        when i.status = 'declined' then 'declined'
        when public._invitation_window_closed(t.state) then 'expired'
        else 'pending' end
    ) order by i.created_at), '[]'::jsonb)
  from public.tournament_invitations i
  join public.tournaments t on t.id = i.tournament_id
  where i.tournament_id = p_tournament_id;
$function$;

create or replace function public.admin_invite_player(p_tournament_id uuid, p_admin_token text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  t public.tournaments;
  clean text := lower(trim(coalesce(p_email, '')));
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid invitation';
  end if;
  if clean !~ '^[^\s@<>"'',;:]+@[^\s@<>"'',;:]+\.[^\s@<>"'',;:]{2,}$' or length(clean) > 200 then
    raise exception 'Invalid email address';
  end if;
  if not public.consume_api_rate_limit('invite:' || p_tournament_id::text, 30, 3600) then
    raise exception 'Rate limit exceeded';
  end if;
  select * into t from public.tournaments where id = p_tournament_id and admin_token = p_admin_token;
  if not found then raise exception 'Admin token mismatch or tournament not found'; end if;
  if public._invitation_window_closed(t.state) then
    raise exception 'The tournament has already started';
  end if;
  if (select count(*) from public.tournament_invitations where tournament_id = t.id) >= 50 then
    raise exception 'Too many invitations';
  end if;
  -- a new invitation, or a declined one is sent again; a pending one stays as it is
  insert into public.tournament_invitations (tournament_id, invitee_email) values (t.id, clean)
  on conflict (tournament_id, invitee_email) do update set status = 'pending', responded_at = null, created_at = now()
    where public.tournament_invitations.status = 'declined';
  return jsonb_build_object('invitations', public._invitations_json(t.id));
end
$function$;

create or replace function public.admin_list_invitations(p_tournament_id uuid, p_admin_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16 then
    raise exception 'Invalid invitation';
  end if;
  if not exists (select 1 from public.tournaments where id = p_tournament_id and admin_token = p_admin_token) then
    raise exception 'Admin token mismatch or tournament not found';
  end if;
  return jsonb_build_object('invitations', public._invitations_json(p_tournament_id));
end
$function$;

create or replace function public.admin_cancel_invitation(p_tournament_id uuid, p_admin_token text, p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
begin
  if p_tournament_id is null or p_admin_token is null or length(p_admin_token) < 16 or p_invitation_id is null then
    raise exception 'Invalid invitation';
  end if;
  if not exists (select 1 from public.tournaments where id = p_tournament_id and admin_token = p_admin_token) then
    raise exception 'Admin token mismatch or tournament not found';
  end if;
  delete from public.tournament_invitations where id = p_invitation_id and tournament_id = p_tournament_id;
  return jsonb_build_object('invitations', public._invitations_json(p_tournament_id));
end
$function$;

-- The signed-in person's open invitations: their verified email, the tournament still in the lobby, not joined yet.
create or replace function public.list_my_invitations()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  my_email text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select lower(email) into my_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if my_email is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id, 'tournamentId', t.id, 'tournamentName', t.state->>'name', 'inviteCode', t.invite_code, 'invitedAt', i.created_at
    ) order by i.created_at desc)
    from public.tournament_invitations i
    join public.tournaments t on t.id = i.tournament_id
    where i.invitee_email = my_email
      and i.status = 'pending'
      and not public._invitation_window_closed(t.state)
      and not exists (select 1 from public.tournament_account_players tap where tap.tournament_id = t.id and tap.user_id = auth.uid())
  ), '[]'::jsonb);
end
$function$;

create or replace function public.decline_invitation(p_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_catalog'
as $function$
declare
  my_email text;
  changed integer;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select lower(email) into my_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if my_email is null then return false; end if;
  update public.tournament_invitations set status = 'declined', responded_at = now()
  where id = p_invitation_id and invitee_email = my_email and status = 'pending';
  get diagnostics changed = row_count;
  return changed > 0;
end
$function$;

revoke execute on function public._invitation_window_closed(jsonb) from public, anon, authenticated;
revoke execute on function public._invitations_json(uuid) from public, anon, authenticated;
revoke execute on function public.admin_invite_player(uuid, text, text) from public;
revoke execute on function public.admin_list_invitations(uuid, text) from public;
revoke execute on function public.admin_cancel_invitation(uuid, text, uuid) from public;
revoke execute on function public.list_my_invitations() from public, anon;
revoke execute on function public.decline_invitation(uuid) from public, anon;
grant execute on function public.admin_invite_player(uuid, text, text) to anon, authenticated;
grant execute on function public.admin_list_invitations(uuid, text) to anon, authenticated;
grant execute on function public.admin_cancel_invitation(uuid, text, uuid) to anon, authenticated;
grant execute on function public.list_my_invitations() to authenticated;
grant execute on function public.decline_invitation(uuid) to authenticated;
