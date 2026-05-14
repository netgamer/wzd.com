import { requireAuth, wrap, jsonResponse, HttpError } from "../_lib/auth.js";
import { newId, nowIso } from "../_lib/db.js";

const VALID_TYPES = new Set(["developer", "planner", "pm"]);

export const onRequestPost = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  const body = await request.json().catch(() => ({}));
  const workflowId = String(body?.workflowId ?? "").trim();
  const workflowName = String(body?.workflowName ?? "").trim();
  const agentType = String(body?.agentType ?? "");
  if (!workflowId || !workflowName || !VALID_TYPES.has(agentType)) {
    throw new HttpError(400, "invalid_input", "workflowId, workflowName, agentType required.");
  }

  const now = nowIso();
  await env.DB
    .prepare(
      `INSERT INTO user_workflows
         (id, user_id, workflow_id, workflow_name, agent_type, schedule_cron, created_from_run_id, last_synced_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, workflow_id) DO UPDATE SET
         workflow_name = excluded.workflow_name,
         agent_type = excluded.agent_type,
         schedule_cron = excluded.schedule_cron,
         created_from_run_id = excluded.created_from_run_id,
         last_synced_at = excluded.last_synced_at,
         updated_at = excluded.updated_at`
    )
    .bind(
      newId(),
      user.id,
      workflowId,
      workflowName,
      agentType,
      typeof body?.scheduleCron === "string" ? body.scheduleCron : null,
      typeof body?.runId === "string" ? body.runId : null,
      now,
      now,
      now
    )
    .run();
  return jsonResponse({ ok: true });
});
