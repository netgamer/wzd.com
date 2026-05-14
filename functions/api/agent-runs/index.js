import { requireAuth, wrap, jsonResponse, HttpError } from "../../_lib/auth.js";
import { newId, nowIso } from "../../_lib/db.js";

const VALID_TYPES = new Set(["developer", "planner", "pm"]);

export const onRequestPost = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  const body = await request.json().catch(() => ({}));
  const widgetId = String(body?.widgetId ?? "").trim();
  const agentId = String(body?.agentId ?? "").trim();
  const agentType = String(body?.agentType ?? "");
  const prompt = String(body?.prompt ?? "");
  if (!widgetId || !agentId || !VALID_TYPES.has(agentType) || !prompt) {
    throw new HttpError(400, "invalid_input", "widgetId, agentId, agentType, prompt required.");
  }

  const id = newId();
  const now = nowIso();
  await env.DB
    .prepare(
      `INSERT INTO agent_runs (id, user_id, widget_id, agent_id, agent_type, prompt, schedule_cron, status, attempts, workflow_name, started_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'running', 1, ?, ?, ?, ?)`
    )
    .bind(
      id,
      user.id,
      widgetId,
      agentId,
      agentType,
      prompt,
      typeof body?.scheduleCron === "string" ? body.scheduleCron : null,
      typeof body?.workflowName === "string" ? body.workflowName : null,
      now,
      now,
      now
    )
    .run();
  return jsonResponse({ id });
});
