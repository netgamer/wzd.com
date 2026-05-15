-- 24h cache for YouTube curation per category — saves Data API quota when
-- multiple users (or repeated board creations) hit the same category.

CREATE TABLE IF NOT EXISTS youtube_curation_cache (
  category TEXT PRIMARY KEY,
  videos_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
