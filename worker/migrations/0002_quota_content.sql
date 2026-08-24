PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS daily_quotas (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  window_key TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  limit_value INTEGER NOT NULL CHECK (limit_value >= 0),
  reset_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, feature, window_key)
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS ad_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_claim_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('untrusted_client_claim','verified','rejected')),
  created_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TABLE IF NOT EXISTS question_catalog (
  id TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_index INTEGER NOT NULL,
  solution TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'legacy_unverified' CHECK (status IN ('legacy_unverified','shadow','production','quarantine')),
  minimum_plan TEXT NOT NULL DEFAULT 'free' CHECK (minimum_plan IN ('free','premium','pro','pro_plus')),
  updated_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_daily_quotas_reset ON daily_quotas(reset_at);
CREATE INDEX IF NOT EXISTS idx_ad_verifications_user_created ON ad_verifications(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_question_catalog_status_subject ON question_catalog(status, subject);
