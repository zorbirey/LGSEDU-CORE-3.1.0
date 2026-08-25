PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payment_receipts (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('google_play')),
  token_hash TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_transaction_id TEXT,
  product_id TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('premium','pro','pro_plus')),
  status TEXT NOT NULL CHECK (status IN ('active','pending','expired','revoked')),
  starts_at INTEGER,
  ends_at INTEGER,
  last_verified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (provider, token_hash)
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_user ON payment_receipts(user_id, status, ends_at);

CREATE TABLE IF NOT EXISTS ad_reward_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_binding TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected','expired')),
  transaction_id TEXT UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_ad_reward_sessions_user ON ad_reward_sessions(user_id, status, expires_at);

CREATE TABLE IF NOT EXISTS ad_reward_transactions (
  transaction_id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL UNIQUE REFERENCES ad_reward_sessions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('admob')),
  ad_unit TEXT NOT NULL,
  reward_item TEXT NOT NULL,
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  window_key TEXT NOT NULL,
  limit_value INTEGER NOT NULL CHECK (limit_value > 0),
  reset_at INTEGER NOT NULL,
  provider_timestamp INTEGER NOT NULL,
  verified_at INTEGER NOT NULL
) WITHOUT ROWID;

CREATE TRIGGER IF NOT EXISTS trg_ad_reward_grant
AFTER INSERT ON ad_reward_transactions
BEGIN
  UPDATE ad_reward_sessions
     SET status='verified', transaction_id=NEW.transaction_id, updated_at=NEW.verified_at
   WHERE id=NEW.session_id
     AND user_id=NEW.user_id
     AND status='pending'
     AND expires_at>=NEW.provider_timestamp;

  SELECT CASE WHEN changes()=0 THEN RAISE(ABORT,'invalid-reward-session') END;

  INSERT INTO daily_quotas (user_id,feature,window_key,used,limit_value,reset_at,updated_at)
  VALUES (NEW.user_id,'rewarded_ads',NEW.window_key,1,NEW.limit_value,NEW.reset_at,NEW.verified_at)
  ON CONFLICT(user_id,feature,window_key) DO UPDATE SET
    used=daily_quotas.used+1,
    limit_value=excluded.limit_value,
    reset_at=excluded.reset_at,
    updated_at=excluded.updated_at
  WHERE daily_quotas.used<excluded.limit_value;

  SELECT CASE WHEN changes()=0 THEN RAISE(ABORT,'daily-reward-limit') END;
END;
