create extension if not exists pgcrypto;

create table if not exists public.live_classes (
  id uuid primary key default gen_random_uuid(),
  course_id text,
  title text not null,
  topic text not null,
  faculty_name text not null,
  provider text not null default '100ms',
  provider_room_id text,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'completed', 'cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  recording_url text,
  hls_url text,
  max_viewers integer not null default 500,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.live_class_resources (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  title text not null,
  resource_type text not null check (resource_type in ('pdf','notes','slides','image','audio','link')),
  storage_path text,
  external_url text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.live_class_attendance (
  id uuid primary key default gen_random_uuid(),
  live_class_id uuid not null references public.live_classes(id) on delete cascade,
  student_id uuid,
  student_name text,
  joined_at timestamptz,
  left_at timestamptz,
  watch_seconds integer not null default 0,
  attendance_percent numeric(5,2),
  status text not null default 'present',
  created_at timestamptz not null default now()
);

create index if not exists live_classes_status_starts_idx on public.live_classes(status, starts_at);
create index if not exists live_class_resources_class_idx on public.live_class_resources(live_class_id, sort_order);
create index if not exists live_class_attendance_class_idx on public.live_class_attendance(live_class_id);

alter table public.live_classes enable row level security;
alter table public.live_class_resources enable row level security;
alter table public.live_class_attendance enable row level security;

drop policy if exists "Public can read live classes" on public.live_classes;
create policy "Public can read live classes" on public.live_classes for select using (true);

drop policy if exists "Public can read live class resources" on public.live_class_resources;
create policy "Public can read live class resources" on public.live_class_resources for select using (true);
