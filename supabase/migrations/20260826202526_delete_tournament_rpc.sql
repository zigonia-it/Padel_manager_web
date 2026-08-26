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

revoke all on function public.delete_tournament(uuid, text) from public, anon, authenticated;
grant execute on function public.delete_tournament(uuid, text) to anon;
