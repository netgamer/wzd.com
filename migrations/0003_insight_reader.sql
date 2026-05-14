-- WZD Insight Reader MVP schema for Cloudflare D1
-- Replaces supabase/insight-reader-mvp.sql. The get_home_payload RPC is
-- reimplemented in Pages Functions (see functions/api/home-payload.js).

CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('rss','bookmark','manual')),
  name TEXT NOT NULL,
  url TEXT,
  site_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  fetch_interval_min INTEGER NOT NULL DEFAULT 60,
  last_fetched_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_sources_type ON sources (type);
CREATE INDEX IF NOT EXISTS idx_sources_active ON sources (is_active);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES sources(id) ON DELETE SET NULL,
  external_id TEXT,
  url TEXT NOT NULL UNIQUE,
  canonical_url TEXT,
  title TEXT NOT NULL,
  author TEXT,
  published_at TEXT,
  raw_content TEXT,
  summary_short TEXT,
  summary_long TEXT,
  content_type TEXT NOT NULL DEFAULT 'article',
  language TEXT NOT NULL DEFAULT 'en',
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processed','failed')),
  score_importance REAL NOT NULL DEFAULT 0,
  score_monetization REAL NOT NULL DEFAULT 0,
  score_relevance REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_items_source_id ON items (source_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON items (status);
CREATE INDEX IF NOT EXISTS idx_items_published_at ON items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_scores
  ON items (score_importance DESC, score_monetization DESC, score_relevance DESC);

CREATE TABLE IF NOT EXISTS tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_item_tags_tag_id ON item_tags (tag_id);
CREATE INDEX IF NOT EXISTS idx_item_tags_item_id ON item_tags (item_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  raw_url TEXT,
  note TEXT,
  saved_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (item_id IS NOT NULL OR raw_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_saved_at
  ON bookmarks (user_id, saved_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_item_id ON bookmarks (item_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bookmarks_user_item
  ON bookmarks (user_id, item_id)
  WHERE item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS clusters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  score_trend REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_clusters_name ON clusters (lower(name));
CREATE INDEX IF NOT EXISTS idx_clusters_score_trend ON clusters (score_trend DESC);

CREATE TABLE IF NOT EXISTS cluster_items (
  cluster_id TEXT NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  PRIMARY KEY (cluster_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_cluster_items_cluster_id ON cluster_items (cluster_id);
CREATE INDEX IF NOT EXISTS idx_cluster_items_item_id ON cluster_items (item_id);

CREATE TABLE IF NOT EXISTS action_suggestions (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
  cluster_id TEXT REFERENCES clusters(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  action_type TEXT,
  difficulty TEXT,
  expected_value TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (item_id IS NOT NULL OR cluster_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_action_suggestions_item_id
  ON action_suggestions (item_id);
CREATE INDEX IF NOT EXISTS idx_action_suggestions_cluster_id
  ON action_suggestions (cluster_id);
CREATE INDEX IF NOT EXISTS idx_action_suggestions_created_at
  ON action_suggestions (created_at DESC);
