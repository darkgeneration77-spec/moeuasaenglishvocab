CREATE TABLE IF NOT EXISTS game_wallet (
  student_id TEXT PRIMARY KEY,
  coins INTEGER NOT NULL DEFAULT 0,
  lifetime_coins INTEGER NOT NULL DEFAULT 0,
  equipped_avatar TEXT NOT NULL DEFAULT 'rookie-blue',
  equipped_title TEXT NOT NULL DEFAULT 'Vocabulary Rookie',
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS game_inventory (
  student_id TEXT NOT NULL,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  purchased_at TEXT DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(student_id, item_key),
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE TABLE IF NOT EXISTS coin_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  reference_key TEXT NOT NULL DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(student_id) REFERENCES students(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_coin_ledger_reference
ON coin_ledger(student_id, reference_key)
WHERE reference_key <> '';

CREATE INDEX IF NOT EXISTS idx_game_inventory_student
ON game_inventory(student_id);

CREATE INDEX IF NOT EXISTS idx_coin_ledger_student
ON coin_ledger(student_id, created_at);

INSERT INTO game_wallet(student_id, coins, lifetime_coins, updated_at)
SELECT id, 0, 0, CURRENT_TIMESTAMP
FROM students
ON CONFLICT(student_id) DO NOTHING;