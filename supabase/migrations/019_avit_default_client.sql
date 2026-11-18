insert into public.avit_clients(name,contact_email,status)
select 'Ibemhal IAS','ibemhaliashelpdesk@gmail.com','active'
where not exists(select 1 from public.avit_clients where name='Ibemhal IAS');
create unique index if not exists course_purchase_orders_payment_reference_unique
on public.course_purchase_orders(payment_reference) where payment_reference is not null;
