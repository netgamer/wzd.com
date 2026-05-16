-- 보드 공개/비공개 + 추천(클론·좋아요) 카운트.
-- 새 보드는 기본 'private'. 사용자가 보드 설정에서 'public'으로 토글하면
-- /api/discover에 노출되고 다른 사용자가 자기 보드로 복사할 수 있음.

ALTER TABLE boards ADD COLUMN visibility TEXT NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('private','public'));

ALTER TABLE boards ADD COLUMN clone_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE boards ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- discover 쿼리 가속: 공개 + 미아카이브만, clone_count 정렬용
CREATE INDEX IF NOT EXISTS idx_boards_public_top
  ON boards (clone_count DESC, updated_at DESC)
  WHERE visibility = 'public' AND is_archived = 0;

CREATE INDEX IF NOT EXISTS idx_boards_public_recent
  ON boards (updated_at DESC)
  WHERE visibility = 'public' AND is_archived = 0;

-- 좋아요 기록 (1 user × 1 board). 추후 like 토글 기능에서 사용.
CREATE TABLE IF NOT EXISTS board_likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, board_id)
);
