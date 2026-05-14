import { requireAuth, wrap, jsonResponse, HttpError } from "../../_lib/auth.js";
import { newId, nowIso } from "../../_lib/db.js";
import {
  fetchBoardsByOwnerOrMember,
  fetchNotesByBoardIds,
  mapBoardRow,
  BOARD_SELECT_COLS
} from "../../_lib/boards.js";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const onRequestGet = wrap(async ({ env, data }) => {
  const user = requireAuth({ data });
  const boards = await fetchBoardsByOwnerOrMember(env.DB, user.id);

  if (boards.length === 0) {
    const created = await createBoard(env.DB, user.id, "My Board");
    return jsonResponse({ boards: [created], notes: [] });
  }

  const notes = await fetchNotesByBoardIds(env.DB, boards.map((b) => b.id));
  return jsonResponse({ boards, notes });
});

const createBoard = async (db, userId, title = "My Board") => {
  const id = newId();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO boards (id, user_id, title, description, background_style, settings, is_archived, created_at, updated_at)
       VALUES (?, ?, ?, '', 'paper', '{}', 0, ?, ?)`
    )
    .bind(id, userId, title, now, now)
    .run();

  const row = await db
    .prepare(`SELECT ${BOARD_SELECT_COLS} FROM boards WHERE id = ?`)
    .bind(id)
    .first();
  return mapBoardRow(row);
};

export const onRequestPost = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  const body = await request.json().catch(() => ({}));
  const title = typeof body?.title === "string" && body.title.trim() ? body.title.trim() : "My Board";
  const created = await createBoard(env.DB, user.id, title);
  return jsonResponse({ board: created });
});

// Bulk save (saveBoardsV2): upsert provided boards + notes, delete stale notes per board.
export const onRequestPut = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  const body = await request.json().catch(() => ({}));
  const boards = Array.isArray(body?.boards) ? body.boards : [];
  const notes = Array.isArray(body?.notes) ? body.notes : [];
  const db = env.DB;
  const now = nowIso();

  const ownedBoards = boards.filter((b) => b.userId === user.id);

  const statements = [];

  for (const board of ownedBoards) {
    statements.push(
      db
        .prepare(
          `INSERT INTO boards (id, user_id, title, description, background_style, settings, is_archived, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = excluded.title,
             description = excluded.description,
             background_style = excluded.background_style,
             settings = excluded.settings,
             updated_at = excluded.updated_at
           WHERE boards.user_id = ?`
        )
        .bind(
          String(board.id ?? newId()),
          user.id,
          String(board.title ?? "My Board"),
          String(board.description ?? ""),
          String(board.backgroundStyle ?? "paper"),
          JSON.stringify(board.settings ?? {}),
          board.updatedAt ?? now,
          now,
          user.id
        )
    );
  }

  // Determine which boards the user is allowed to write notes to (owner or member).
  const targetBoardIds = Array.from(
    new Set(notes.map((n) => String(n.boardId)).filter(Boolean))
  );
  const writableSet = new Set();
  if (targetBoardIds.length > 0) {
    const placeholders = targetBoardIds.map(() => "?").join(",");
    const rows = await db
      .prepare(
        `SELECT id FROM boards
         WHERE id IN (${placeholders})
           AND (user_id = ? OR EXISTS (
             SELECT 1 FROM board_members WHERE board_id = boards.id AND user_id = ?
           ))`
      )
      .bind(...targetBoardIds, user.id, user.id)
      .all();
    for (const r of rows?.results ?? []) {
      writableSet.add(r.id);
    }
  }

  for (const note of notes) {
    if (!writableSet.has(note.boardId)) continue;
    statements.push(
      db
        .prepare(
          `INSERT INTO notes (id, board_id, user_id, content, color, x, y, w, h, z_index, rotation, pinned, archived, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             content = excluded.content,
             color = excluded.color,
             x = excluded.x,
             y = excluded.y,
             w = excluded.w,
             h = excluded.h,
             z_index = excluded.z_index,
             rotation = excluded.rotation,
             pinned = excluded.pinned,
             archived = excluded.archived,
             metadata = excluded.metadata,
             updated_at = excluded.updated_at`
        )
        .bind(
          String(note.id ?? newId()),
          String(note.boardId),
          String(note.userId ?? user.id),
          String(note.content ?? ""),
          String(note.color ?? "yellow"),
          Number.isFinite(note.x) ? note.x : 120,
          Number.isFinite(note.y) ? note.y : 120,
          clamp(Number(note.w) || 240, 140, 520),
          clamp(Number(note.h) || 220, 120, 640),
          Number.isFinite(note.zIndex) ? note.zIndex : 1,
          Number.isFinite(note.rotation) ? note.rotation : 0,
          note.pinned ? 1 : 0,
          note.archived ? 1 : 0,
          JSON.stringify(note.metadata ?? {}),
          now,
          note.updatedAt ?? now
        )
    );
  }

  // Delete stale notes for boards the user can write to.
  const allBoardIds = ownedBoards.map((b) => b.id).filter(Boolean);
  const localNoteIds = new Set(notes.map((n) => String(n.id)));
  if (allBoardIds.length > 0) {
    const placeholders = allBoardIds.map(() => "?").join(",");
    const remote = await db
      .prepare(`SELECT id, board_id FROM notes WHERE board_id IN (${placeholders})`)
      .bind(...allBoardIds)
      .all();
    const stale = (remote?.results ?? [])
      .filter((r) => !localNoteIds.has(r.id))
      .map((r) => r.id);
    if (stale.length > 0) {
      const delPlaceholders = stale.map(() => "?").join(",");
      statements.push(
        db.prepare(`DELETE FROM notes WHERE id IN (${delPlaceholders})`).bind(...stale)
      );
    }
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }

  return jsonResponse({ ok: true, updatedAt: now });
});
