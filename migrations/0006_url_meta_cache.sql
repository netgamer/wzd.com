-- URL → 미디어 메타데이터 캐시 (YouTube/Instagram/TikTok).
-- TikTok oEmbed 응답이 가장 느리고 thumbnail_url에 만료 서명이 있어
-- 같은 URL은 24h 동안 같은 결과를 재사용.

CREATE TABLE IF NOT EXISTS url_meta_cache (
  url TEXT PRIMARY KEY,
  meta_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL
);
