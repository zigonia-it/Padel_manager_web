-- Schedule retention from trusted database infrastructure, never from the client.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema extensions;
    if not exists (select 1 from cron.job where jobname = 'padelstar-retention-cleanup') then
      perform cron.schedule(
        'padelstar-retention-cleanup',
        '15 3 * * *',
        $job$select public.cleanup_expired_tournaments(); select public.cleanup_expired_player_profiles();$job$
      );
    end if;
  end if;
end;
$$;
