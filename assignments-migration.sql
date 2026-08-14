CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  assigned_by TEXT NOT NULL DEFAULT 'teacher',
  task_type TEXT NOT NULL,
  book_no INTEGER DEFAULT 0,
  level_no INTEGER DEFAULT 0,
  title TEXT NOT NULL,
  instruction TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT DEFAULT '',
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE INDEX IF NOT EXISTS idx_assignments_student
ON assignments(student_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_assignments_status
ON assignments(status, created_at);