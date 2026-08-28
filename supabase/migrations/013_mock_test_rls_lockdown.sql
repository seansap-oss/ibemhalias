-- Ibemhal IAS Mock Test security hardening.
-- Additive and idempotent. Run after migrations 011 and 012.
--
-- The Mock Test application reads/writes these tables through server-side
-- service-role API routes. Enabling RLS without public policies prevents
-- browser anon/auth clients from reading answer keys directly.

alter table if exists public.mock_tests enable row level security;
alter table if exists public.mock_test_sections enable row level security;
alter table if exists public.mock_questions enable row level security;
alter table if exists public.mock_question_options enable row level security;
alter table if exists public.mock_test_questions enable row level security;
alter table if exists public.mock_attempts enable row level security;
alter table if exists public.mock_attempt_answers enable row level security;
alter table if exists public.mock_test_assignments enable row level security;
alter table if exists public.mock_question_import_jobs enable row level security;

-- No anon/authenticated policies are intentionally created here.
-- Server-side service-role access continues to bypass RLS.
