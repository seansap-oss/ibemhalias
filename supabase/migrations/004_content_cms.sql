-- ============================================================
-- IBEMHAL IAS LMS
-- MIGRATION 004: SITE-WIDE CONTENT CMS + PRIVATE STORAGE
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.cms_content (
  id uuid primary key default gen_random_uuid(),
  section_path text not null,
  title text not null,
  description text,
  media_type text not null check (
    media_type in ('image','pdf','video','youtube','audio','word','excel','file')
  ),
  mime_type text,
  file_name text,
  file_size bigint,
  storage_path text,
  external_url text,
  thumbnail_path text,
  date_label text,
  month_label text,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cms_content_section
  on public.cms_content(section_path, is_published, sort_order, created_at desc);

alter table public.cms_content enable row level security;

drop policy if exists "Public can read published CMS content" on public.cms_content;
create policy "Public can read published CMS content"
  on public.cms_content
  for select
  using (is_published = true);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'cms-content',
  'cms-content',
  false,
  209715200,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'audio/mpeg',
    'audio/wav',
    'audio/x-m4a',
    'audio/mp4',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
