CREATE TABLE IF NOT EXISTS entitlements (user_id TEXT PRIMARY KEY, plan TEXT NOT NULL DEFAULT 'free', verified_until TEXT, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS quota_usage (user_id TEXT NOT NULL, feature TEXT NOT NULL, period TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0, PRIMARY KEY(user_id, feature, period));
CREATE TABLE IF NOT EXISTS shadow_responses (question_id TEXT NOT NULL, anonymous_user_id TEXT NOT NULL, correct INTEGER NOT NULL, answered_at TEXT NOT NULL, PRIMARY KEY(question_id, anonymous_user_id));
