import { wrap, jsonResponse } from "../../_lib/auth.js";
import { fetchHomeBoard, fetchNotesByBoardIds } from "../../_lib/boards.js";

export const onRequestGet = wrap(async ({ env, data, request }) => {
  const url = new URL(request.url);
  const editable = url.searchParams.get("editable") === "1";

  const board = await fetchHomeBoard(env.DB);
  if (!board) {
    return jsonResponse({ board: null, notes: [] });
  }

  if (editable) {
    const user = data?.user;
    if (!user || user.id !== board.userId) {
      return jsonResponse({ board: null, notes: [] }, { status: 200 });
    }
  }

  const notes = await fetchNotesByBoardIds(env.DB, [board.id], { onlyActive: !editable });
  return jsonResponse({ board, notes });
});
