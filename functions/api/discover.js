import { wrap, jsonResponse } from "../_lib/auth.js";
import { mapBoardRow, BOARD_SELECT_COLS } from "../_lib/boards.js";

// 공개 보드 둘러보기. 비인증으로도 접근 가능.
//   sort=top   → clone_count DESC, updated_at DESC
//   sort=recent→ updated_at DESC (기본)
//   q=<query>  → title/description LIKE 검색
//   limit, offset → 페이지네이션
//
// 응답: { boards: [{ ...board, noteCount, ownerEmail }], total, hasMore }

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;

export const onRequestGet = wrap(async ({ env, request, data }) => {
  const url = new URL(request.url);
  const sort = url.searchParams.get("sort") === "top" ? "top" : "recent";
  const q = url.searchParams.get("q")?.trim() || "";
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(url.searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT)
  );
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10) || 0);
  const currentUserId = data?.user?.id || "";

  const params = [];
  let whereExtra = "";
  if (q) {
    const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;
    whereExtra = " AND (b.title LIKE ? ESCAPE '\\' OR b.description LIKE ? ESCAPE '\\')";
    params.push(like, like);
  }

  const orderBy =
    sort === "top"
      ? "b.clone_count DESC, b.like_count DESC, b.updated_at DESC"
      : "b.updated_at DESC";

  const sqlList = `
    SELECT
      b.${BOARD_SELECT_COLS.replace(/, /g, ", b.")},
      COALESCE(u.email, '') AS owner_email,
      COALESCE(u.display_name, '') AS owner_name,
      (SELECT COUNT(*) FROM notes n WHERE n.board_id = b.id AND n.archived = 0) AS note_count
    FROM boards b
    LEFT JOIN users u ON u.id = b.user_id
    WHERE b.visibility = 'public' AND b.is_archived = 0${whereExtra}
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  const result = await env.DB.prepare(sqlList).bind(...params, limit, offset).all();
  const rows = result?.results ?? [];

  const boards = rows.map((row) => {
    const board = mapBoardRow(row);
    return {
      ...board,
      ownerEmail: row.owner_email || "",
      ownerName: row.owner_name || "",
      noteCount: typeof row.note_count === "number" ? row.note_count : 0,
      isOwn: currentUserId && row.user_id === currentUserId
    };
  });

  // total count (cap to MAX_LIMIT * 10 for cheapness)
  const countResult = await env.DB
    .prepare(
      `SELECT COUNT(*) AS total FROM boards b
       WHERE b.visibility = 'public' AND b.is_archived = 0${whereExtra}`
    )
    .bind(...params)
    .first();
  const total = countResult?.total ?? 0;

  return jsonResponse({
    boards,
    total,
    hasMore: offset + boards.length < total,
    sort,
    q,
    limit,
    offset
  });
});
