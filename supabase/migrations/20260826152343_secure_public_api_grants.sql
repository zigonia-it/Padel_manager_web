revoke all privileges on table public.tournaments from anon, authenticated;
grant select on public.tournaments to anon;

revoke all on function public.touch_updated_at() from public, anon, authenticated;
revoke all on function public.create_tournament(jsonb, text) from public, anon, authenticated;
revoke all on function public.get_tournament_by_code(text) from public, anon, authenticated;
revoke all on function public.save_tournament_state(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.join_tournament(text, jsonb) from public, anon, authenticated;

grant execute on function public.create_tournament(jsonb, text) to anon;
grant execute on function public.get_tournament_by_code(text) to anon;
grant execute on function public.save_tournament_state(uuid, text, jsonb) to anon;
grant execute on function public.join_tournament(text, jsonb) to anon;

alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;
