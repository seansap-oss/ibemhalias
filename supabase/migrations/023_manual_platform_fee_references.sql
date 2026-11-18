alter table public.avit_payment_ledger add column if not exists manual_reference text;
create unique index if not exists avit_payment_ledger_manual_reference_unique
on public.avit_payment_ledger(manual_reference) where manual_reference is not null;
