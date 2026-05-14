import { requireAuth, wrap, jsonResponse } from "../../_lib/auth.js";
import { nowIso } from "../../_lib/db.js";

export const onRequestPost = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  const body = await request.json().catch(() => ({}));
  const displayName = typeof body?.displayName === "string" ? body.displayName : "";
  const email = typeof body?.email === "string" && body.email ? body.email : user.email;
  const now = nowIso();

  await env.DB
    .prepare(
      `INSERT INTO user_profiles (user_id, email, display_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         email = excluded.email,
         display_name = excluded.display_name,
         updated_at = excluded.updated_at`
    )
    .bind(user.id, email, displayName, now, now)
    .run();
  return jsonResponse({ ok: true });
});
