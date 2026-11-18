alter table public.course_purchase_orders add column if not exists buyer_phone text;
create table if not exists public.avit_receipt_delivery_settings (
 institute_name text primary key,
 notification_email text,
 notification_whatsapp text,
 updated_at timestamptz not null default now()
);
insert into public.avit_receipt_delivery_settings(institute_name,notification_email)
values('Ibemhal IAS','ibemhaliashelpdesk@gmail.com') on conflict do nothing;
alter table public.avit_receipt_delivery_settings enable row level security;
revoke all on public.avit_receipt_delivery_settings from anon,authenticated;
