alter table public.player_profile_history
  drop constraint if exists player_profile_history_pkey;

alter table public.player_profile_history
  add primary key (profile_id, id);

