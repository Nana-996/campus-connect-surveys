create policy "Search console settings are server only"
  on public.search_console_settings for all
  using (false) with check (false);

create policy "Search console snapshots are server only"
  on public.search_console_snapshots for all
  using (false) with check (false);