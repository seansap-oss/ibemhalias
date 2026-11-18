-- Keep the already deployed single-course checkout working while Version 5.8 is reviewed locally.
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
