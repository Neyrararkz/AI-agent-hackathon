DROP TABLE IF EXISTS attempt_question_feedback CASCADE;
DROP TABLE IF EXISTS attempts CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS topics CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS group_members CASCADE;
DROP TABLE IF EXISTS groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('student','teacher')),
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  skill_map     JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_users_role ON users(role);

CREATE TABLE groups (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  teacher_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE group_members (
  group_id   BIGINT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, student_id)
);

CREATE INDEX idx_group_members_student ON group_members(student_id);

CREATE TABLE subjects (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id          BIGSERIAL PRIMARY KEY,
  subject_id  BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  code        TEXT NOT NULL, 
  title       TEXT NOT NULL, 
  UNIQUE(subject_id, code)
);

CREATE INDEX idx_topics_subject ON topics(subject_id);

CREATE TABLE tests (
  id          BIGSERIAL PRIMARY KEY,
  student_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id  BIGINT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  level       TEXT NOT NULL CHECK (level IN ('easy','middle','hard')),
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  meta        JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_tests_student ON tests(student_id);
CREATE INDEX idx_tests_subject ON tests(subject_id);
CREATE INDEX idx_tests_created_at ON tests(created_at);

CREATE TABLE questions (
  id          BIGSERIAL PRIMARY KEY,
  test_id     BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  q_index     INT NOT NULL CHECK (q_index > 0),
  q_type      TEXT NOT NULL CHECK (q_type IN ('mcq','short','multi')),
  prompt      TEXT NOT NULL,
  options     JSONB NOT NULL DEFAULT '[]'::jsonb, 
  correct     JSONB NOT NULL DEFAULT '{}'::jsonb, 
  topic_id    BIGINT REFERENCES topics(id) ON DELETE SET NULL,

  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,

  UNIQUE(test_id, q_index)
);

CREATE INDEX idx_questions_test ON questions(test_id);
CREATE INDEX idx_questions_topic ON questions(topic_id);

CREATE TABLE attempts (
  id          BIGSERIAL PRIMARY KEY,
  test_id     BIGINT NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
  student_id  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,

  score       INT NOT NULL DEFAULT 0,
  max_score   INT NOT NULL DEFAULT 0,
  percent     NUMERIC(5,2) NOT NULL DEFAULT 0,

  answers     JSONB NOT NULL DEFAULT '{}'::jsonb,

  ai_summary  JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_attempts_student ON attempts(student_id);
CREATE INDEX idx_attempts_test ON attempts(test_id);
CREATE INDEX idx_attempts_submitted ON attempts(submitted_at);

CREATE TABLE attempt_question_feedback (
  attempt_id  BIGINT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

  is_correct  BOOLEAN NOT NULL,
  earned      INT NOT NULL DEFAULT 0,
  max_points  INT NOT NULL DEFAULT 1,

  explanation TEXT,
  recommendation TEXT,

  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,

  PRIMARY KEY (attempt_id, question_id)
);

CREATE INDEX idx_aqf_attempt ON attempt_question_feedback(attempt_id);