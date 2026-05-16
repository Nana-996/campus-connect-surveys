
-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  university_name text not null default '',
  university_domain text not null default '',
  department text not null default '',
  year text not null default '',
  credits integer not null default 5,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles: read same university" on public.profiles
  for select to authenticated
  using (
    university_domain = (select university_domain from public.profiles where id = auth.uid())
  );

create policy "Profiles: insert own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy "Profiles: update own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Helper: get current user's university domain (security definer to avoid RLS recursion)
create or replace function public.current_university_domain()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select university_domain from public.profiles where id = auth.uid()
$$;

-- SURVEYS
create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  university_domain text not null,
  title text not null,
  description text not null default '',
  questions jsonb not null default '[]'::jsonb,
  target_department text,
  target_year text,
  response_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.surveys enable row level security;
create index surveys_university_idx on public.surveys(university_domain);

create policy "Surveys: read same university" on public.surveys
  for select to authenticated
  using (university_domain = public.current_university_domain());

create policy "Surveys: insert own" on public.surveys
  for insert to authenticated
  with check (creator_id = auth.uid() and university_domain = public.current_university_domain());

create policy "Surveys: update own" on public.surveys
  for update to authenticated using (creator_id = auth.uid());

create policy "Surveys: delete own" on public.surveys
  for delete to authenticated using (creator_id = auth.uid());

-- RESPONSES
create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  respondent_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (survey_id, respondent_id)
);
alter table public.survey_responses enable row level security;
create index responses_survey_idx on public.survey_responses(survey_id);
create index responses_respondent_idx on public.survey_responses(respondent_id);

create policy "Responses: respondent or creator can read" on public.survey_responses
  for select to authenticated
  using (
    respondent_id = auth.uid()
    or exists (select 1 from public.surveys s where s.id = survey_id and s.creator_id = auth.uid())
  );

create policy "Responses: insert own to same-university survey" on public.survey_responses
  for insert to authenticated
  with check (
    respondent_id = auth.uid()
    and exists (
      select 1 from public.surveys s
      where s.id = survey_id
        and s.university_domain = public.current_university_domain()
        and s.is_active = true
        and s.creator_id <> auth.uid()
    )
  );

-- Trigger: auto-create profile on signup with metadata
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  domain text;
  uni text;
begin
  domain := lower(split_part(new.email, '@', 2));
  uni := coalesce(new.raw_user_meta_data->>'university_name', initcap(split_part(domain, '.', 1)) || ' University');
  insert into public.profiles (id, full_name, university_name, university_domain, department, year, credits)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    uni,
    domain,
    coalesce(new.raw_user_meta_data->>'department', ''),
    coalesce(new.raw_user_meta_data->>'year', ''),
    5
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: on new response, increment respondent credits + survey response_count
create or replace function public.handle_new_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.surveys set response_count = response_count + 1 where id = new.survey_id;
  update public.profiles set credits = credits + 1 where id = new.respondent_id;
  return new;
end;
$$;

drop trigger if exists on_response_created on public.survey_responses;
create trigger on_response_created
  after insert on public.survey_responses
  for each row execute function public.handle_new_response();
