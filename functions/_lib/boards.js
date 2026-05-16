// Shared D1 helpers for boards / notes — used by /api/boards/* and /board/[slug].

import { parseJsonColumns, normalizeRows } from "./db.js";

const BOARD_JSON_COLS = ["settings"];
const BOARD_BOOL_COLS = ["is_archived"];
const NOTE_JSON_COLS = ["metadata"];
const NOTE_BOOL_COLS = ["pinned", "archived"];

const BOARD_SELECT =
  "id, user_id, title, description, background_style, settings, is_archived, visibility, clone_count, like_count, updated_at";
const NOTE_SELECT =
  "id, board_id, user_id, content, color, x, y, w, h, z_index, rotation, pinned, archived, metadata, updated_at";

export const mapBoardRow = (row) => {
  if (!row) return null;
  const normalized = {
    ...parseJsonColumns(row, BOARD_JSON_COLS),
    is_archived: row.is_archived === 1 || row.is_archived === true
  };
  return {
    id: normalized.id,
    userId: normalized.user_id,
    title: normalized.title,
    description: normalized.description,
    backgroundStyle: normalized.background_style,
    settings: normalized.settings ?? {},
    isArchived: normalized.is_archived,
    visibility: normalized.visibility || "private",
    cloneCount: typeof normalized.clone_count === "number" ? normalized.clone_count : 0,
    likeCount: typeof normalized.like_count === "number" ? normalized.like_count : 0,
    updatedAt: normalized.updated_at
  };
};

export const mapNoteRow = (row) => {
  const normalized = normalizeRows([row], NOTE_JSON_COLS, NOTE_BOOL_COLS)[0];
  return {
    id: normalized.id,
    boardId: normalized.board_id,
    userId: normalized.user_id,
    content: normalized.content,
    color: normalized.color,
    x: normalized.x,
    y: normalized.y,
    w: normalized.w,
    h: normalized.h,
    zIndex: normalized.z_index,
    rotation: normalized.rotation,
    pinned: normalized.pinned,
    archived: normalized.archived,
    metadata: normalized.metadata ?? {},
    updatedAt: normalized.updated_at
  };
};

export const fetchBoardById = async (db, boardId) => {
  const row = await db
    .prepare(`SELECT ${BOARD_SELECT} FROM boards WHERE id = ?`)
    .bind(boardId)
    .first();
  return row ? mapBoardRow(row) : null;
};

export const fetchBoardsByOwnerOrMember = async (db, userId) => {
  const memberRows = await db
    .prepare("SELECT board_id FROM board_members WHERE user_id = ?")
    .bind(userId)
    .all();
  const memberIds = (memberRows?.results ?? [])
    .map((r) => r.board_id)
    .filter((id) => typeof id === "string" && id.length > 0);

  if (memberIds.length === 0) {
    const own = await db
      .prepare(
        `SELECT ${BOARD_SELECT} FROM boards
         WHERE is_archived = 0 AND user_id = ?
         ORDER BY updated_at DESC`
      )
      .bind(userId)
      .all();
    return (own?.results ?? []).map(mapBoardRow);
  }

  const placeholders = memberIds.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT ${BOARD_SELECT} FROM boards
       WHERE is_archived = 0 AND (user_id = ? OR id IN (${placeholders}))
       ORDER BY updated_at DESC`
    )
    .bind(userId, ...memberIds)
    .all();
  return (rows?.results ?? []).map(mapBoardRow);
};

export const fetchNotesByBoardIds = async (db, boardIds, { onlyActive = false } = {}) => {
  if (!Array.isArray(boardIds) || boardIds.length === 0) {
    return [];
  }
  const ids = Array.from(new Set(boardIds.filter((id) => typeof id === "string" && id.length > 0)));
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const archivedClause = onlyActive ? " AND archived = 0" : "";
  const rows = await db
    .prepare(
      `SELECT ${NOTE_SELECT} FROM notes
       WHERE board_id IN (${placeholders})${archivedClause}
       ORDER BY z_index ASC, updated_at ASC`
    )
    .bind(...ids)
    .all();
  return (rows?.results ?? []).map(mapNoteRow);
};

export const fetchBoardBySlug = async (db, slug) => {
  const row = await db
    .prepare(
      `SELECT ${BOARD_SELECT} FROM boards
       WHERE is_archived = 0
         AND json_extract(settings, '$.sharedSlug') = ?
       LIMIT 1`
    )
    .bind(slug)
    .first();
  return row ? mapBoardRow(row) : null;
};

export const fetchHomeBoard = async (db) => {
  const row = await db
    .prepare(
      `SELECT ${BOARD_SELECT} FROM boards
       WHERE is_archived = 0
         AND json_extract(settings, '$.homeBoard') = 1
       LIMIT 1`
    )
    .bind()
    .first();
  return row ? mapBoardRow(row) : null;
};

export const isMemberOrOwner = async (db, boardId, userId) => {
  const row = await db
    .prepare(
      `SELECT 1 AS has_access FROM boards
       WHERE id = ? AND (user_id = ? OR EXISTS (
         SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?
       ))
       LIMIT 1`
    )
    .bind(boardId, userId, boardId, userId)
    .first();
  return Boolean(row);
};

export const isBoardOwner = async (db, boardId, userId) => {
  const row = await db
    .prepare("SELECT 1 AS owner FROM boards WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(boardId, userId)
    .first();
  return Boolean(row);
};

export const BOARD_SELECT_COLS = BOARD_SELECT;
export const NOTE_SELECT_COLS = NOTE_SELECT;
