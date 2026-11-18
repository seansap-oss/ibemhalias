-- Version 5.8: course taxonomy, multi-course checkout, and numbered assets.
create sequence if not exists public.ib_course_code_seq;
create sequence if not exists public.ib_asset_number_seq;

alter table public.courses add column if not exists course_code text;
alter table public.courses add column if not exists exam_family text not null default 'national';
alter table public.courses add column if not exists exam_name text not null default 'UPSC Civil Services';
alter table public.courses add column if not exists exam_stage text not null default 'foundation';
alter table public.courses add column if not exists language text not null default 'English';
update public.courses set course_code='CRS-'||lpad(nextval('public.ib_course_code_seq')::text,6,'0') where course_code is null;
alter table public.courses alter column course_code set default 'CRS-'||lpad(nextval('public.ib_course_code_seq')::text,6,'0');
create unique index if not exists courses_course_code_unique on public.courses(course_code);
alter table public.courses drop constraint if exists courses_category_check;
alter table public.courses add constraint courses_category_check check (category in ('foundation','prelims','mains','optional','test-series','interview','complete','practice'));

alter table public.cms_content add column if not exists asset_number text;
alter table public.cms_content add column if not exists module_id uuid references public.modules(id) on delete set null;
update public.cms_content set asset_number='AST-'||lpad(nextval('public.ib_asset_number_seq')::text,6,'0') where asset_number is null;
alter table public.cms_content alter column asset_number set default 'AST-'||lpad(nextval('public.ib_asset_number_seq')::text,6,'0');
create unique index if not exists cms_asset_number_unique on public.cms_content(asset_number);
create index if not exists cms_content_module_idx on public.cms_content(module_id,sort_order);

alter table public.teacher_workspace_materials add column if not exists asset_number text;
update public.teacher_workspace_materials set asset_number='AST-'||lpad(nextval('public.ib_asset_number_seq')::text,6,'0') where asset_number is null;
alter table public.teacher_workspace_materials alter column asset_number set default 'AST-'||lpad(nextval('public.ib_asset_number_seq')::text,6,'0');
create unique index if not exists teacher_workspace_asset_number_unique on public.teacher_workspace_materials(asset_number);
alter table public.live_class_resources add column if not exists asset_number text;
update public.live_class_resources set asset_number='AST-'||lpad(nextval('public.ib_asset_number_seq')::text,6,'0') where asset_number is null;
alter table public.live_class_resources alter column asset_number set default 'AST-'||lpad(nextval('public.ib_asset_number_seq')::text,6,'0');
create unique index if not exists live_class_asset_number_unique on public.live_class_resources(asset_number);

create table if not exists public.course_purchase_order_items (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.course_purchase_orders(id) on delete cascade,
 course_id uuid not null references public.courses(id),
 title_snapshot text not null,
 amount_paise integer not null check(amount_paise>=0),
 created_at timestamptz not null default now(),
 unique(order_id,course_id)
);
create index if not exists course_order_items_course_idx on public.course_purchase_order_items(course_id);
alter table public.course_purchase_order_items enable row level security;
revoke all on public.course_purchase_order_items from anon,authenticated;
insert into public.course_purchase_order_items(order_id,course_id,title_snapshot,amount_paise)
select o.id,o.course_id,coalesce(c.title,'Course'),o.amount_paise from public.course_purchase_orders o
join public.courses c on c.id=o.course_id
where not exists(select 1 from public.course_purchase_order_items i where i.order_id=o.id)
on conflict(order_id,course_id) do nothing;

create table if not exists public.asset_activity_events (
 id uuid primary key default gen_random_uuid(),
 source_type text not null check(source_type in ('cms','teacher','live')),
 source_id uuid not null,
 asset_number text not null,
 actor_user_id uuid references auth.users(id) on delete set null,
 actor_identity text,
 actor_role text not null check(actor_role in ('student','instructor','admin','director','owner','guest')),
 action text not null check(action in ('open','play','progress_25','progress_50','progress_75','complete','download_requested','external_open')),
 course_id uuid references public.courses(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists asset_activity_asset_idx on public.asset_activity_events(source_type,source_id,created_at desc);
create index if not exists asset_activity_date_idx on public.asset_activity_events(created_at desc);
create index if not exists asset_activity_actor_idx on public.asset_activity_events(actor_user_id,created_at desc);
alter table public.asset_activity_events enable row level security;
revoke all on public.asset_activity_events from anon,authenticated;

create or replace function public.create_course_cart_order(
 p_course_ids uuid[],p_buyer_name text,p_buyer_email text,p_buyer_phone text,p_payment_reference text,p_buyer_user_id uuid default null
) returns table(order_id uuid,amount_paise integer)
language plpgsql security definer set search_path=public
as $$
declare v_id uuid;v_total bigint;v_count integer;v_course uuid;
begin
 if coalesce(array_length(p_course_ids,1),0) not between 1 and 10 or
    (select count(distinct x) from unnest(p_course_ids) x)<>array_length(p_course_ids,1) then
   raise exception 'Choose 1 to 10 different courses';
 end if;
 if length(trim(p_buyer_name))<2 or length(trim(p_buyer_email))<3 or length(trim(p_payment_reference))<6 then
   raise exception 'Buyer name, email and UPI reference required';
 end if;
 select count(*),sum(round(coalesce(discounted_price_inr,price_inr)*100)) into v_count,v_total
 from public.courses where id=any(p_course_ids) and is_published=true;
 if v_count<>array_length(p_course_ids,1) or v_total is null or v_total>2147483647 then
   raise exception 'A course is unavailable or the cart total is too large';
 end if;
 v_course:=p_course_ids[1];
 insert into public.course_purchase_orders(course_id,buyer_user_id,buyer_name,buyer_email,buyer_phone,amount_paise,payment_reference)
 values(v_course,p_buyer_user_id,trim(p_buyer_name),lower(trim(p_buyer_email)),nullif(trim(p_buyer_phone),''),v_total::integer,trim(p_payment_reference)) returning id into v_id;
 insert into public.course_purchase_order_items(order_id,course_id,title_snapshot,amount_paise)
 select v_id,c.id,c.title,round(coalesce(c.discounted_price_inr,c.price_inr)*100)::integer
 from public.courses c where c.id=any(p_course_ids) and c.is_published=true;
 return query select v_id,v_total::integer;
end $$;
revoke all on function public.create_course_cart_order(uuid[],text,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.create_course_cart_order(uuid[],text,text,text,text,uuid) to service_role;

create or replace function public.verify_course_purchase(p_order_id uuid,p_approve boolean)
returns table(receipt_number text,buyer_email text,buyer_name text,institute_name text,course_id uuid,amount_paise integer)
language plpgsql security definer set search_path=public
as $$
declare o public.course_purchase_orders%rowtype;v_client uuid;v_bps integer;v_receipt text;item record;
begin
 select * into o from public.course_purchase_orders where id=p_order_id for update;
 if not found then raise exception 'Order not found'; end if;
 if o.status<>'pending' then raise exception 'Order already reviewed'; end if;
 if p_approve and coalesce(o.payment_reference,'')='' then raise exception 'Transaction reference required'; end if;
 v_receipt:=case when p_approve then 'IBI-'||extract(year from now())::text||'-'||upper(left(replace(o.id::text,'-',''),8)) else null end;
 update public.course_purchase_orders set status=case when p_approve then 'paid' else 'rejected' end,
  receipt_number=v_receipt,paid_at=case when p_approve then now() else null end where id=p_order_id;
 if p_approve then
  insert into public.course_purchase_order_items(order_id,course_id,title_snapshot,amount_paise)
  select o.id,o.course_id,c.title,o.amount_paise from public.courses c
  where c.id=o.course_id and not exists(select 1 from public.course_purchase_order_items i where i.order_id=o.id)
  on conflict(order_id,course_id) do nothing;
  if o.buyer_user_id is not null then
   for item in select course_id,amount_paise from public.course_purchase_order_items where order_id=o.id loop
    insert into public.enrollments(user_id,course_id,payment_status,amount_paid,enrolled_via,upi_reference)
    values(o.buyer_user_id,item.course_id,'paid',item.amount_paise/100.0,'admin_manual',o.payment_reference)
    on conflict(user_id,course_id) do update set payment_status='paid',amount_paid=excluded.amount_paid,upi_reference=excluded.upi_reference;
   end loop;
  end if;
  select id into v_client from public.avit_clients where name=o.institute_name limit 1;
  if v_client is not null then
   select fee_bps into v_bps from public.avit_platform_settings where id=true;
   insert into public.avit_payment_ledger(client_id,category,gross_paise,status,provider_reference)
   values(v_client,'student_fee',o.amount_paise,'verified','course:'||o.id::text);
   insert into public.avit_payment_ledger(client_id,category,gross_paise,platform_fee_paise,status,provider_reference)
   values(v_client,'platform_transaction_fee',round(o.amount_paise*coalesce(v_bps,200)/10000.0),round(o.amount_paise*coalesce(v_bps,200)/10000.0),'pending','fee:'||o.id::text);
  end if;
 end if;
 return query select v_receipt,o.buyer_email,o.buyer_name,o.institute_name,o.course_id,o.amount_paise;
end $$;
revoke all on function public.verify_course_purchase(uuid,boolean) from public,anon,authenticated;
grant execute on function public.verify_course_purchase(uuid,boolean) to service_role;
