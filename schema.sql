CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  class_name TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  last_seen TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  book_no INTEGER NOT NULL,
  book_title TEXT DEFAULT '',
  event_type TEXT NOT NULL,
  question_key TEXT DEFAULT '',
  question_text TEXT DEFAULT '',
  answer_text TEXT DEFAULT '',
  correct_answer TEXT DEFAULT '',
  is_correct INTEGER,
  recovered INTEGER DEFAULT 0,
  quiz_mode TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS student_progress (
  student_id TEXT PRIMARY KEY,
  total_xp INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  books_started INTEGER NOT NULL DEFAULT 0,
  books_mastered INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS level_mastery (
  student_id TEXT NOT NULL,
  book_no INTEGER NOT NULL,
  level_no INTEGER NOT NULL,
  mastery INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  unlocked INTEGER NOT NULL DEFAULT 0,
  mastered INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, book_no, level_no),
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS boss_results (
  student_id TEXT NOT NULL,
  boss_group TEXT NOT NULL,
  books_from INTEGER NOT NULL,
  books_to INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  percentage INTEGER NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  attempts INTEGER NOT NULL DEFAULT 0,
  best_percentage INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, boss_group),
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS achievements (
  student_id TEXT NOT NULL,
  achievement_key TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  unlocked INTEGER NOT NULL DEFAULT 1,
  unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, achievement_key),
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_events_student ON learning_events(student_id);
CREATE INDEX IF NOT EXISTS idx_events_book ON learning_events(book_no);
CREATE INDEX IF NOT EXISTS idx_events_time ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_student_book ON learning_events(student_id, book_no);
CREATE INDEX IF NOT EXISTS idx_level_mastery_student ON level_mastery(student_id);
CREATE INDEX IF NOT EXISTS idx_level_mastery_book ON level_mastery(student_id, book_no);
CREATE INDEX IF NOT EXISTS idx_boss_results_student ON boss_results(student_id);
CREATE INDEX IF NOT EXISTS idx_achievements_student ON achievements(student_id);