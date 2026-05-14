import { requireAuth, wrap, jsonResponse, HttpError } from "../../../_lib/auth.js";
import { newId, nowIso } from "../../../_lib/db.js";
import { isBoardOwner } from "../../../_lib/boards.js";

export const onRequestGet = wrap(async ({ env, data, params }) => {
  const user = requireAuth({ data });
  const boardId = params.id;

  const access = await env.DB
    .prepare(
      `SELECT 1 FROM boards
       WHERE id = ? AND (user_id = ? OR EXISTS (
         SELECT 1 FROM board_members WHERE board_id = ? AND user_id = ?
       ))
       LIMIT 1`
    )
    .bind(boardId, user.id, boardId, user.id)
    .first();
  if (!access) {
    throw new HttpError(403, "forbidden", "Not allowed to view members of this board.");
  }

  const rows = await env.DB
    .prepare(
      `SELECT bm.board_id, bm.user_id, bm.role,
              up.email AS profile_email, up.display_name AS profile_display_name
         FROM board_members bm
         LEFT JOIN user_profiles up ON up.user_id = bm.user_id
        WHERE bm.board_id = ?
        ORDER BY bm.created_at ASC`
    )
    .bind(boardId)
    .all();

  const members = (rows?.results ?? []).map((r) => ({
    userId: r.user_id,
    email: r.profile_email ?? "",
    displayName: r.profile_display_name ?? "",
    role: r.role
  }));
  return jsonResponse({ members });
});

export const onRequestPost = wrap(async ({ env, data, params, request }) => {
  const user = requireAuth({ data });
  const boardId = params.id;
  const owner = await isBoardOwner(env.DB, boardId, user.id);
  if (!owner) {
    throw new HttpError(403, "forbidden", "Only the board owner can invite members.");
  }

  const body = await request.json().catch(() => ({}));
  const inviteUserId = String(body?.userId ?? "").trim();
  if (!inviteUserId) {
    throw new HttpError(400, "missing_user_id", "userId is required.");
  }

  const now = nowIso();
  await env.DB
    .prepare(
      `INSERT INTO board_members (id, board_id, user_id, role, created_at)
       VALUES (?, ?, ?, 'editor', ?)
       ON CONFLICT(board_id, user_id) DO NOTHING`
    )
    .bind(newId(), boardId, inviteUserId, now)
    .run();
  return jsonResponse({ ok: true });
});
