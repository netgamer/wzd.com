import { requireAuth, wrap, jsonResponse, HttpError } from "../../_lib/auth.js";
import { nowIso } from "../../_lib/db.js";
import { fetchBoardById, isBoardOwner } from "../../_lib/boards.js";

export const onRequestGet = wrap(async ({ env, data, params }) => {
  const user = requireAuth({ data });
  const board = await fetchBoardById(env.DB, params.id);
  if (!board) {
    throw new HttpError(404, "not_found", "Board not found.");
  }
  if (board.userId !== user.id) {
    // Member?
    const owns = await isBoardOwner(env.DB, params.id, user.id);
    if (!owns) {
      const memberRow = await env.DB
        .prepare("SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ? LIMIT 1")
        .bind(params.id, user.id)
        .first();
      if (!memberRow) {
        throw new HttpError(403, "forbidden", "Not a member of this board.");
      }
    }
  }
  return jsonResponse({ board });
});

export const onRequestPatch = wrap(async ({ env, data, params, request }) => {
  const user = requireAuth({ data });
  const board = await fetchBoardById(env.DB, params.id);
  if (!board) {
    throw new HttpError(404, "not_found", "Board not found.");
  }
  if (board.userId !== user.id) {
    throw new HttpError(403, "forbidden", "Only the owner can update this board.");
  }

  const body = await request.json().catch(() => ({}));
  const now = nowIso();

  const nextTitle = typeof body.title === "string" ? body.title : board.title;
  const nextDescription =
    typeof body.description === "string" ? body.description : board.description;
  const nextBackground =
    typeof body.backgroundStyle === "string" ? body.backgroundStyle : board.backgroundStyle;
  const nextSettings = body.settings && typeof body.settings === "object" ? body.settings : board.settings;
  const nextArchived =
    typeof body.isArchived === "boolean" ? (body.isArchived ? 1 : 0) : board.isArchived ? 1 : 0;

  await env.DB.prepare(
    `UPDATE boards SET
       title = ?,
       description = ?,
       background_style = ?,
       settings = ?,
       is_archived = ?,
       updated_at = ?
     WHERE id = ? AND user_id = ?`
  )
    .bind(
      nextTitle,
      nextDescription,
      nextBackground,
      JSON.stringify(nextSettings),
      nextArchived,
      now,
      params.id,
      user.id
    )
    .run();

  const updated = await fetchBoardById(env.DB, params.id);
  return jsonResponse({ board: updated });
});

export const onRequestDelete = wrap(async ({ env, data, params }) => {
  const user = requireAuth({ data });
  const board = await fetchBoardById(env.DB, params.id);
  if (!board) {
    throw new HttpError(404, "not_found", "Board not found.");
  }
  if (board.userId !== user.id) {
    throw new HttpError(403, "forbidden", "Only the owner can delete this board.");
  }
  await env.DB.prepare("DELETE FROM boards WHERE id = ? AND user_id = ?")
    .bind(params.id, user.id)
    .run();
  return jsonResponse({ ok: true });
});
