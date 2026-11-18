alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('student','instructor','admin','director'));
create table if not exists public.director_settings (
 id boolean primary key default true check(id),
 admin_idle_minutes integer not null default 10 check(admin_idle_minutes between 5 and 120),
 teacher_idle_minutes integer not null default 10 check(teacher_idle_minutes between 5 and 120),
 updated_at timestamptz not null default now()
);
insert into public.director_settings(id) values(true) on conflict do nothing;
create table if not exists public.activity_sessions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 identity text not null,
 role text not null check(role in ('student','instructor','admin','director','owner')),
 logged_in_at timestamptz not null default now(),
 last_seen_at timestamptz not null default now(),
 logged_out_at timestamptz,
 active_seconds integer not null default 0,
 country_code text,
 region_code text
);
create index if not exists activity_sessions_recent on public.activity_sessions(logged_in_at desc);
create index if not exists activity_sessions_user on public.activity_sessions(user_id,logged_in_at desc);
create table if not exists public.activity_events (
 id uuid primary key default gen_random_uuid(),
 user_id uuid references auth.users(id) on delete set null,
 role text not null,
 kind text not null,
 target_id text,
 duration_seconds integer not null default 0,
 created_at timestamptz not null default now()
);
create index if not exists activity_events_recent on public.activity_events(created_at desc);
create index if not exists activity_events_target on public.activity_events(kind,target_id,created_at desc);
alter table public.director_settings enable row level security;
alter table public.activity_sessions enable row level security;
alter table public.activity_events enable row level security;
revoke all on public.director_settings,public.activity_sessions,public.activity_events from anon,authenticated;
