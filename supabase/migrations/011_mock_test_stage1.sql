-- Ibemhal IAS Mock Test Stage 1
-- Additive / idempotent migration. Does not drop existing LMS tables.

create extension if not exists pgcrypto;

create table if not exists public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  description text,
  exam_category text not null default 'UPSC',
  subject text,
  test_type text not null default 'full_length',
  duration_minutes integer not null default 60 check (duration_minutes > 0),
  total_marks numeric(10,2) not null default 0,
  negative_marking numeric(10,2) not null default 0,
  passing_marks numeric(10,2) not null default 0,
  language text not null default 'English',
  show_answers_after_submit boolean not null default true,
  show_solutions boolean not null default true,
  access_type text not null default 'logged_in',
  status text not null default 'draft' check (status in ('draft','published','archived')),
  randomize_questions boolean not null default false,
  randomize_options boolean not null default false,
  attempt_limit integer,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_test_sections (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  title text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.mock_questions (
  id uuid primary key default gen_random_uuid(),
  question_type text not null default 'mcq_single',
  question_text text not null,
  explanation text,
  exam text,
  subject text,
  topic text,
  subtopic text,
  difficulty text not null default 'medium',
  marks numeric(10,2) not null default 1,
  negative_marks numeric(10,2) not null default 0,
  source text,
  source_pdf text,
  source_page integer,
  verification_status text not null default 'verified'
    check (verification_status in ('verified','needs_verification')),
  status text not null default 'active'
    check (status in ('active','archived')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mock_question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.mock_questions(id) on delete cascade,
  option_key text not null,
  option_text text not null,
  is_correct boolean not null default false,
  sort_order integer not null default 0,
  unique(question_id, option_key)
);

create table if not exists public.mock_test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  section_id uuid references public.mock_test_sections(id) on delete set null,
  question_id uuid not null references public.mock_questions(id) on delete restrict,
  sort_order integer not null default 0,
  marks_override numeric(10,2),
  negative_marks_override numeric(10,2),
  unique(test_id, question_id)
);

create table if not exists public.mock_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  student_id uuid not null,
  status text not null default 'in_progress'
    check (status in ('in_progress','submitted','expired')),
  started_at timestamptz not null default now(),
  last_saved_at timestamptz not null default now(),
  submitted_at timestamptz,
  elapsed_seconds integer not null default 0,
  score numeric(10,2),
  total_marks numeric(10,2),
  percentage numeric(10,2),
  accuracy numeric(10,2),
  correct_count integer,
  incorrect_count integer,
  unattempted_count integer,
  question_order jsonb,
  option_order jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.mock_attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.mock_attempts(id) on delete cascade,
  question_id uuid not null references public.mock_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  numeric_answer numeric,
  text_answer text,
  marked_for_review boolean not null default false,
  time_spent_seconds integer not null default 0,
  awarded_marks numeric(10,2),
  updated_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

create table if not exists public.mock_test_assignments (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.mock_tests(id) on delete cascade,
  assignment_type text not null default 'student',
  assignment_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.mock_question_import_jobs (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  status text not null default 'draft',
  created_by uuid,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_mock_test_questions_test on public.mock_test_questions(test_id, sort_order);
create index if not exists idx_mock_attempts_student on public.mock_attempts(student_id, created_at desc);
create index if not exists idx_mock_attempts_test on public.mock_attempts(test_id, status);
create index if not exists idx_mock_answers_attempt on public.mock_attempt_answers(attempt_id);
create index if not exists idx_mock_questions_taxonomy on public.mock_questions(exam, subject, topic);

-- Updated-at helper (safe to reuse if it already exists)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_mock_tests_updated_at on public.mock_tests;
create trigger trg_mock_tests_updated_at
before update on public.mock_tests
for each row execute function public.set_updated_at();

drop trigger if exists trg_mock_questions_updated_at on public.mock_questions;
create trigger trg_mock_questions_updated_at
before update on public.mock_questions
for each row execute function public.set_updated_at();

-- Demo question bank and one published demo test.
do $$
declare
  q1 uuid;
  q2 uuid;
  q3 uuid;
  t1 uuid;
  s1 uuid;
begin
  if not exists (select 1 from public.mock_tests where slug = 'upsc-prelims-demo-1') then
    insert into public.mock_questions
      (question_type, question_text, explanation, exam, subject, topic, difficulty, marks, negative_marks, source, verification_status)
    values
      ('mcq_single',
       'Which Article of the Constitution of India abolishes untouchability?',
       'Article 17 abolishes untouchability and forbids its practice in any form.',
       'UPSC', 'Polity', 'Fundamental Rights', 'easy', 2, 0.66, 'Demo seed', 'verified')
    returning id into q1;

    insert into public.mock_question_options(question_id, option_key, option_text, is_correct, sort_order) values
      (q1,'A','Article 14',false,1),
      (q1,'B','Article 15',false,2),
      (q1,'C','Article 17',true,3),
      (q1,'D','Article 19',false,4);

    insert into public.mock_questions
      (question_type, question_text, explanation, exam, subject, topic, difficulty, marks, negative_marks, source, verification_status)
    values
      ('mcq_single',
       'The Reserve Bank of India was established in which year?',
       'The Reserve Bank of India commenced operations on 1 April 1935.',
       'Banking', 'Economy', 'RBI', 'easy', 2, 0.66, 'Demo seed', 'verified')
    returning id into q2;

    insert into public.mock_question_options(question_id, option_key, option_text, is_correct, sort_order) values
      (q2,'A','1930',false,1),
      (q2,'B','1935',true,2),
      (q2,'C','1947',false,3),
      (q2,'D','1949',false,4);

    insert into public.mock_questions
      (question_type, question_text, explanation, exam, subject, topic, difficulty, marks, negative_marks, source, verification_status)
    values
      ('mcq_single',
       'Which gas is most abundant in the Earth''s atmosphere?',
       'Nitrogen makes up about 78% of the Earth''s atmosphere.',
       'SSC', 'General Science', 'Atmosphere', 'easy', 2, 0.66, 'Demo seed', 'verified')
    returning id into q3;

    insert into public.mock_question_options(question_id, option_key, option_text, is_correct, sort_order) values
      (q3,'A','Oxygen',false,1),
      (q3,'B','Nitrogen',true,2),
      (q3,'C','Carbon dioxide',false,3),
      (q3,'D','Argon',false,4);

    insert into public.mock_tests
      (title, slug, description, exam_category, subject, test_type, duration_minutes,
       total_marks, negative_marking, passing_marks, language, show_answers_after_submit,
       show_solutions, access_type, status)
    values
      ('UPSC Prelims Demo Test 1', 'upsc-prelims-demo-1',
       'Stage 1 demo test for validating the real CBT workflow.',
       'UPSC', 'General Studies', 'full_length', 10, 6, 0.66, 2, 'English', true, true, 'logged_in', 'published')
    returning id into t1;

    insert into public.mock_test_sections(test_id, title, sort_order)
    values (t1, 'General Studies', 1)
    returning id into s1;

    insert into public.mock_test_questions(test_id, section_id, question_id, sort_order)
    values
      (t1,s1,q1,1),
      (t1,s1,q2,2),
      (t1,s1,q3,3);
  end if;
end $$;
