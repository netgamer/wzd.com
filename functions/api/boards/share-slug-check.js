import { wrap, jsonResponse } from "../../_lib/auth.js";

export const onRequestGet = wrap(async ({ env, request }) => {
  const url = new URL(request.url);
  const slug = String(url.searchParams.get("slug") ?? "").trim();
  const excludeBoardId = url.searchParams.get("excludeBoardId");
  if (!slug) {
    return jsonResponse({ taken: false });
  }

  const row = await env.DB
    .prepare(
      `SELECT id FROM boards
       WHERE is_archived = 0 AND json_extract(settings, '$.sharedSlug') = ?
       LIMIT 1`
    )
    .bind(slug)
    .first();

  if (!row) {
    return jsonResponse({ taken: false });
  }
  if (excludeBoardId && row.id === excludeBoardId) {
    return jsonResponse({ taken: false });
  }
  return jsonResponse({ taken: true });
});
