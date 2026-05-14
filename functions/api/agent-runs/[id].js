import { requireAuth, wrap, jsonResponse, HttpError } from "../../_lib/auth.js";
import { nowIso } from "../../_lib/db.js";

const VALID_STATUSES = new Set(["succeeded", "failed"]);

export const onRequestPatch = wrap(async ({ env, data, params, request }) => {
  const user = requireAuth({ data });
  const body = await request.json().catch(() => ({}));
  const status = String(body?.status ?? "");
  if (!VALID_STATUSES.has(status)) {
    throw new HttpError(400, "invalid_status", "status must be succeeded or failed.");
  }
  const attempts = Number.isFinite(body?.attempts) ? body.attempts : 1;
  const now = nowIso();

  const res = await env.DB
    .prepare(
      `UPDATE agent_runs SET
         status = ?,
         attempts = ?,
         result_summary = ?,
         error_message = ?,
         workflow_id = ?,
         finished_at = ?,
         updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      status,
      attempts,
      typeof body?.resultSummary === "string" ? body.resultSummary : null,
      typeof body?.errorMessage === "string" ? body.errorMessage : null,
      typeof body?.workflowId === "string" ? body.workflowId : null,
      now,
      now,
      params.id,
      user.id
    )
    .run();

  if (!res?.success && !res?.meta?.changes) {
    // D1 doesn't always populate success on UPDATE; accept either way.
  }
  return jsonResponse({ ok: true });
});
