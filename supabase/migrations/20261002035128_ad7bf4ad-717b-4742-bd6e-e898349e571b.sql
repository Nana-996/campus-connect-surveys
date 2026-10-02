create extension if not exists pg_net;

create table public.cron_config (
  key text primary key,
  value text not null
);

grant all on public.cron_config to service_role;

alter table public.cron_config enable row level security;

create policy "Cron config is server only"
  on public.cron_config for all
  using (false) with check (false);

select cron.schedule(
  'search-console-refresh',
  '15 5 * * *',
  $$
    select net.http_post(
      url := 'https://campus-verify.live/api/public/cron/search-console-refresh',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select value from public.cron_config where key = 'search_console_refresh')
      )
    );
  $$
);