create table public.search_console_settings (
  id boolean primary key default true check (id),
  site_url text,
  updated_at timestamptz not null default now()
);

create table public.search_console_snapshots (
  id boolean primary key default true check (id),
  snapshot jsonb not null,
  refreshed_at timestamptz not null default now()
);

grant all on public.search_console_settings to service_role;
grant all on public.search_console_snapshots to service_role;

alter table public.search_console_settings enable row level security;
alter table public.search_console_snapshots enable row level security;

-- No client-facing policies: all reads/writes go through owner-gated server
-- functions using the service role. anon and authenticated get no access.

insert into public.search_console_settings (id) values (true) on conflict do nothing;