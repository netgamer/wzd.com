import { requireAuth, wrap, jsonResponse } from "../../_lib/auth.js";

export const onRequestGet = wrap(async ({ env, data, request }) => {
  requireAuth({ data });
  const url = new URL(request.url);
  const query = String(url.searchParams.get("q") ?? "").trim();
  if (!query) {
    return jsonResponse({ profiles: [] });
  }
  const exclude = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const pattern = `%${query}%`;
  const rows = await env.DB
    .prepare(
      `SELECT user_id, email, display_name FROM user_profiles
       WHERE email LIKE ? ESCAPE '\\'
       ORDER BY email ASC
       LIMIT 10`
    )
    .bind(pattern)
    .all();

  const excludeSet = new Set(exclude);
  const profiles = (rows?.results ?? [])
    .map((r) => ({
      userId: r.user_id,
      email: r.email,
      displayName: r.display_name ?? ""
    }))
    .filter((p) => !excludeSet.has(p.userId));
  return jsonResponse({ profiles });
});
