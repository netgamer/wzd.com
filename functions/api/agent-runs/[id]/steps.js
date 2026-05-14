import { requireAuth, wrap, jsonResponse, HttpError } from "../../../_lib/auth.js";
import { newId, nowIso } from "../../../_lib/db.js";

const VALID_STATUSES = new Set(["running", "ok", "error"]);

export const onRequestPost = wrap(async ({ env, data, params, request }) => {
  const user = requireAuth({ data });
  const runId = params.id;
  const body = await request.json().catch(() => ({}));

  const stepIndex = Number(body?.stepIndex);
  const stepType = String(body?.stepType ?? "");
  const status = String(body?.status ?? "");
  const message = String(body?.message ?? "");
  if (!Number.isFinite(stepIndex) || stepIndex < 1 || !stepType || !VALID_STATUSES.has(status)) {
    throw new HttpError(400, "invalid_input", "stepIndex, stepType, status required.");
  }

  const owns = await env.DB
    .prepare("SELECT 1 FROM agent_runs WHERE id = ? AND user_id = ? LIMIT 1")
    .bind(runId, user.id)
    .first();
  if (!owns) {
    throw new HttpError(403, "forbidden", "Cannot append step to this run.");
  }

  const now = nowIso();
  await env.DB
    .prepare(
      `INSERT INTO agent_steps (id, run_id, user_id, step_index, step_type, status, message, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      newId(),
      runId,
      user.id,
      stepIndex,
      stepType,
      status,
      message,
      JSON.stringify(body?.payload ?? {}),
      now
    )
    .run();
  return jsonResponse({ ok: true });
});
