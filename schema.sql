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

CREATE INDEX IF NOT EXISTS idx_events_student ON learning_events(student_id);
CREATE INDEX IF NOT EXISTS idx_events_book ON learning_events(book_no);
CREATE INDEX IF NOT EXISTS idx_events_time ON learning_events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_student_book ON learning_events(student_id, book_no);
