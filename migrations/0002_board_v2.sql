-- WZD Board V2 schema (cork board + sticky notes) for Cloudflare D1
-- Replaces supabase/schema.board-v2.sql. RLS / SECURITY DEFINER helpers
-- removed — ownership / membership checks live in Pages Functions.

CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Board',
  description TEXT NOT NULL DEFAULT '',
  background_style TEXT NOT NULL DEFAULT 'cork'
    CHECK (background_style IN ('cork','whiteboard','paper')),
  settings TEXT NOT NULL DEFAULT '{}',
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_boards_user_updated_at
  ON boards (user_id, updated_at DESC);

-- Shared slug lookup uses json_extract(settings, '$.sharedSlug'). SQLite
-- supports expression indexes on json_extract since 3.38.
CREATE INDEX IF NOT EXISTS idx_boards_shared_slug
  ON boards (json_extract(settings, '$.sharedSlug'))
  WHERE json_extract(settings, '$.sharedSlug') IS NOT NULL;

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'yellow'
    CHECK (color IN ('yellow','pink','blue','green','orange','purple','mint','white')),
  x INTEGER NOT NULL DEFAULT 120,
  y INTEGER NOT NULL DEFAULT 120,
  w INTEGER NOT NULL DEFAULT 240 CHECK (w BETWEEN 140 AND 520),
  h INTEGER NOT NULL DEFAULT 220 CHECK (h BETWEEN 120 AND 640),
  z_index INTEGER NOT NULL DEFAULT 1,
  rotation REAL NOT NULL DEFAULT 0 CHECK (rotation BETWEEN -20 AND 20),
  pinned INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_notes_board_z
  ON notes (board_id, z_index DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_user_updated
  ON notes (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS note_tags (
  id TEXT PRIMARY KEY,
  note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL CHECK (length(tag) BETWEEN 1 AND 40),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (note_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_note_tags_user_tag ON note_tags (user_id, tag);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS board_members (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('editor')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (board_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_board_members_user_board
  ON board_members (user_id, board_id);
