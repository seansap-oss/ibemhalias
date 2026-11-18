-- AViT-Solutions platform billing. Service-role access only.
create table if not exists public.avit_platform_settings (
  id boolean primary key default true check (id),
  fee_bps integer not null default 200 check (fee_bps between 0 and 1000),
  fee_includes_gst boolean not null default true,
  owner_upi_id text,
  updated_at timestamptz not null default now()
);
insert into public.avit_platform_settings (id) values (true) on conflict do nothing;
create table if not exists public.avit_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  student_limit integer not null check (student_limit > 0),
  monthly_paise integer not null check (monthly_paise >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
insert into public.avit_plans(name,student_limit,monthly_paise) values
 ('Basic',50,49900),('Pro',150,99900),('Business',500,199900)
on conflict(name) do nothing;
create table if not exists public.avit_clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text not null,
  plan_id uuid references public.avit_plans(id),
  status text not null default 'trial' check (status in ('trial','active','past_due','paused')),
  created_at timestamptz not null default now()
);
create table if not exists public.avit_subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.avit_clients(id),
  period_start date not null,
  period_end date not null,
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'unpaid' check (status in ('unpaid','paid','void')),
  provider_payment_id text unique,
  created_at timestamptz not null default now(),
  unique(client_id,period_start)
);
create table if not exists public.avit_payment_ledger (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.avit_clients(id),
  invoice_id uuid references public.avit_subscription_invoices(id),
  student_id uuid,
  category text not null check (category in ('student_fee','platform_subscription','platform_transaction_fee','refund')),
  gross_paise bigint not null check (gross_paise >= 0),
  platform_fee_paise bigint not null default 0 check (platform_fee_paise >= 0),
  provider_fee_paise bigint not null default 0 check (provider_fee_paise >= 0),
  status text not null default 'pending' check (status in ('pending','verified','failed','refunded')),
  provider_reference text unique,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
alter table public.avit_platform_settings enable row level security;
alter table public.avit_plans enable row level security;
alter table public.avit_clients enable row level security;
alter table public.avit_subscription_invoices enable row level security;
alter table public.avit_payment_ledger enable row level security;
revoke all on public.avit_platform_settings, public.avit_plans, public.avit_clients, public.avit_subscription_invoices, public.avit_payment_ledger from anon, authenticated;
