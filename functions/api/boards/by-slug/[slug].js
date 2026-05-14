import { wrap, jsonResponse } from "../../../_lib/auth.js";
import { fetchBoardBySlug, fetchNotesByBoardIds } from "../../../_lib/boards.js";

export const onRequestGet = wrap(async ({ env, params, data, request }) => {
  const url = new URL(request.url);
  const editable = url.searchParams.get("editable") === "1";
  const slug = String(params.slug ?? "").trim();
  if (!slug) {
    return jsonResponse({ board: null, notes: [] });
  }

  const board = await fetchBoardBySlug(env.DB, slug);
  if (!board) {
    return jsonResponse({ board: null, notes: [] });
  }

  if (editable) {
    const user = data?.user;
    if (!user || user.id !== board.userId) {
      return jsonResponse({ board: null, notes: [] });
    }
  }

  const notes = await fetchNotesByBoardIds(env.DB, [board.id], { onlyActive: !editable });
  return jsonResponse({ board, notes });
});
