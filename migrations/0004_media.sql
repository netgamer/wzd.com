-- Tracks R2 object ownership and metadata so the proxy can authorize reads
-- and so we can sweep orphaned uploads later. Public-readable flag covers
-- assets that should be served without auth (e.g. shared board note images).

CREATE TABLE IF NOT EXISTS media (
  key TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  public_read INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_media_user_created
  ON media (user_id, created_at DESC);
