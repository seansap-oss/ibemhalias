create table if not exists public.course_option_choices (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('family','subcategory','exam','language')),
  label text not null check (char_length(trim(label)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique(kind,label)
);
alter table public.course_option_choices enable row level security;
revoke all on public.course_option_choices from anon, authenticated;
insert into public.course_option_choices(kind,label) values
('family','national'),('family','state'),('family','banking'),('family','other'),
('subcategory','foundation'),('subcategory','prelims'),('subcategory','mains'),('subcategory','optional'),('subcategory','test-series'),('subcategory','interview'),('subcategory','complete'),('subcategory','practice'),
('exam','UPSC Civil Services'),('language','English'),('language','Hindi')
on conflict (kind,label) do nothing;
alter table public.courses drop constraint if exists courses_category_check;
alter table public.courses add constraint courses_category_check check (length(trim(category)) > 0);
