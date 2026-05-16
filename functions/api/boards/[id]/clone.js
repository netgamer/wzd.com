import { requireAuth, wrap, jsonResponse, HttpError } from "../../../_lib/auth.js";
import { newId, nowIso } from "../../../_lib/db.js";
import { fetchBoardById, fetchNotesByBoardIds } from "../../../_lib/boards.js";

// POST /api/boards/<id>/clone
// 공개(visibility='public') 보드를 현재 사용자 계정으로 복사.
// 복사본은 항상 private + sharedSlug 제거.
// 원본의 clone_count를 +1.

export const onRequestPost = wrap(async ({ env, data, params }) => {
  const user = requireAuth({ data });
  const sourceBoard = await fetchBoardById(env.DB, params.id);
  if (!sourceBoard) {
    throw new HttpError(404, "not_found", "Board not found.");
  }
  if (sourceBoard.visibility !== "public") {
    throw new HttpError(403, "not_public", "이 보드는 공개되어 있지 않아 복사할 수 없습니다.");
  }
  if (sourceBoard.isArchived) {
    throw new HttpError(403, "archived", "아카이브된 보드는 복사할 수 없습니다.");
  }

  const sourceNotes = await fetchNotesByBoardIds(env.DB, [sourceBoard.id], { onlyActive: true });
  const now = nowIso();
  const newBoardId = newId();

  const clonedSettings = { ...sourceBoard.settings };
  delete clonedSettings.sharedSlug;
  delete clonedSettings.homeBoard;
  clonedSettings.clonedFromBoardId = sourceBoard.id;
  clonedSettings.clonedFromOwnerId = sourceBoard.userId;
  clonedSettings.clonedAt = now;

  const titleSuffix = " (복사본)";
  const title = sourceBoard.title.endsWith(titleSuffix)
    ? sourceBoard.title
    : `${sourceBoard.title}${titleSuffix}`;

  const statements = [
    env.DB
      .prepare(
        `INSERT INTO boards
          (id, user_id, title, description, background_style, settings, is_archived,
           visibility, clone_count, like_count, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'private', 0, 0, ?, ?)`
      )
      .bind(
        newBoardId,
        user.id,
        title,
        sourceBoard.description || "",
        sourceBoard.backgroundStyle || "paper",
        JSON.stringify(clonedSettings),
        now,
        now
      )
  ];

  for (let i = 0; i < sourceNotes.length; i += 1) {
    const n = sourceNotes[i];
    statements.push(
      env.DB
        .prepare(
          `INSERT INTO notes
            (id, board_id, user_id, content, color, x, y, w, h, z_index, rotation,
             pinned, archived, metadata, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
        )
        .bind(
          newId(),
          newBoardId,
          user.id,
          n.content || "",
          n.color || "yellow",
          Number.isFinite(n.x) ? n.x : 120,
          Number.isFinite(n.y) ? n.y : 120,
          Number.isFinite(n.w) ? n.w : 240,
          Number.isFinite(n.h) ? n.h : 220,
          Number.isFinite(n.zIndex) ? n.zIndex : i + 1,
          Number.isFinite(n.rotation) ? n.rotation : 0,
          n.pinned ? 1 : 0,
          JSON.stringify(n.metadata || {}),
          now,
          now
        )
    );
  }

  // 원본의 clone_count 증가
  statements.push(
    env.DB
      .prepare("UPDATE boards SET clone_count = clone_count + 1 WHERE id = ?")
      .bind(sourceBoard.id)
  );

  await env.DB.batch(statements);

  const cloned = await fetchBoardById(env.DB, newBoardId);
  return jsonResponse({ board: cloned, sourceBoardId: sourceBoard.id });
});
