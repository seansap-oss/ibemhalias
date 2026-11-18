-- Orders are created server-side. A student cannot mark one paid.
create table if not exists public.course_purchase_orders (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references public.courses(id),
 buyer_user_id uuid references auth.users(id),
 buyer_name text not null,
 buyer_email text not null,
 institute_name text not null default 'Ibemhal IAS',
 amount_paise integer not null check(amount_paise>=0),
 promo_code text,
 payment_method text not null default 'upi',
 payment_reference text,
 provider_order_id text unique,
 provider_payment_id text unique,
 status text not null default 'pending' check(status in ('pending','paid','rejected','refunded')),
 receipt_number text unique,
 receipt_sent_at timestamptz,
 created_at timestamptz not null default now(),
 paid_at timestamptz
);
create index if not exists course_purchase_orders_email_idx on public.course_purchase_orders(lower(buyer_email));
create index if not exists course_purchase_orders_status_idx on public.course_purchase_orders(status,created_at desc);
alter table public.course_purchase_orders enable row level security;
revoke all on public.course_purchase_orders from anon,authenticated;
