PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS authority_requests (
  request_id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK (operation IN ('questions.reserve','rewarded.claim','ai.reserve')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  window_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','applied','rejected')),
  response_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_authority_requests_user_window ON authority_requests(user_id,window_key);
