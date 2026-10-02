create or replace function public.registered_user_id_by_email(_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id
  from auth.users u
  where lower(u.email) = lower(trim(_email))
    and u.email_confirmed_at is not null
  limit 1
$$;

revoke all on function public.registered_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.registered_user_id_by_email(text) to service_role;