-- Ibemhal IAS Mock Test Completion Migration
-- Additive / idempotent. Run after 011_mock_test_stage1.sql.

alter table if exists public.mock_questions
  add column if not exists paragraph_text text,
  add column if not exists answer_text text,
  add column if not exists answer_numeric numeric,
  add column if not exists answer_tolerance numeric not null default 0,
  add column if not exists answer_payload jsonb not null default '{}'::jsonb;

alter table if exists public.mock_question_import_jobs
  add column if not exists test_id uuid references public.mock_tests(id) on delete set null,
  add column if not exists import_type text,
  add column if not exists source_page_count integer,
  add column if not exists extracted_text text,
  add column if not exists imported_count integer not null default 0,
  add column if not exists needs_verification_count integer not null default 0,
  add column if not exists error_message text,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_mock_import_jobs_test
  on public.mock_question_import_jobs(test_id, created_at desc);

create index if not exists idx_mock_questions_verification
  on public.mock_questions(verification_status, status);

-- Ensure existing numeric/text answer rows remain valid.
update public.mock_questions
set answer_tolerance = 0
where answer_tolerance is null;
