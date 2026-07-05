create table if not exists public.paystack_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null unique,
  bundle_id text not null,
  credits integer not null,
  amount_usd numeric(10,2) not null,
  amount_ghs_kobo bigint not null,
  status text not null default 'pending',
  raw jsonb,
  created_at timestamptz not null default now(),
  credited_at timestamptz
);

grant select on public.paystack_purchases to authenticated;
grant all on public.paystack_purchases to service_role;

alter table public.paystack_purchases enable row level security;

create policy "Users view own purchases"
  on public.paystack_purchases for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Service role manages purchases"
  on public.paystack_purchases for all
  to service_role
  using (true) with check (true);

create or replace function public.credit_paystack_purchase(
  _reference text,
  _raw jsonb
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _row public.paystack_purchases;
begin
  select * into _row from public.paystack_purchases where reference = _reference for update;
  if not found then
    raise exception 'Unknown paystack reference: %', _reference;
  end if;
  if _row.status = 'success' then
    return;
  end if;

  update public.paystack_purchases
    set status = 'success', raw = _raw, credited_at = now()
    where reference = _reference;

  update public.profiles
    set paid_credits = paid_credits + _row.credits
    where id = _row.user_id;

  insert into public.credit_ledger(user_id, wallet, delta, reason)
    values (_row.user_id, 'paid', _row.credits, 'paystack_' || _row.bundle_id);
end;
$$;

revoke all on function public.credit_paystack_purchase(text, jsonb) from public, anon, authenticated;