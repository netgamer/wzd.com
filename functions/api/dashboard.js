import { requireAuth, wrap, jsonResponse } from "../_lib/auth.js";
import { newId, nowIso, parseJsonColumns, normalizeRows } from "../_lib/db.js";

const WIDGET_JSON_COLS = ["data"];
const WIDGET_BOOL_COLS = ["collapsed"];

const loadDashboard = async (db, userId) => {
  const [layoutResult, widgetsResult] = await Promise.all([
    db
      .prepare("SELECT user_id, columns_json, updated_at FROM dashboard_layouts WHERE user_id = ?")
      .bind(userId)
      .first(),
    db
      .prepare(
        "SELECT id, user_id, type, title, collapsed, data, created_at, updated_at FROM widgets WHERE user_id = ?"
      )
      .bind(userId)
      .all()
  ]);

  const layout = layoutResult
    ? parseJsonColumns(layoutResult, ["columns_json"])
    : null;
  const widgets = normalizeRows(widgetsResult?.results ?? [], WIDGET_JSON_COLS, WIDGET_BOOL_COLS);

  return {
    layout: layout
      ? {
          userId: layout.user_id,
          columns: layout.columns_json ?? [],
          updatedAt: layout.updated_at
        }
      : null,
    widgets: widgets.map((row) => ({
      id: row.id,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      collapsed: row.collapsed,
      data: row.data,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  };
};

export const onRequestGet = wrap(async ({ env, data }) => {
  const user = requireAuth({ data });
  const payload = await loadDashboard(env.DB, user.id);
  return jsonResponse(payload);
});

export const onRequestPut = wrap(async ({ env, data, request }) => {
  const user = requireAuth({ data });
  const body = await request.json();
  const columns = Array.isArray(body?.columns) ? body.columns : [];
  const widgets = Array.isArray(body?.widgets) ? body.widgets : [];
  const now = nowIso();
  const db = env.DB;

  const statements = [];

  if (widgets.length === 0) {
    statements.push(db.prepare("DELETE FROM widgets WHERE user_id = ?").bind(user.id));
  } else {
    const incomingIds = widgets.map((w) => w.id).filter(Boolean);
    if (incomingIds.length === 0) {
      statements.push(db.prepare("DELETE FROM widgets WHERE user_id = ?").bind(user.id));
    } else {
      const placeholders = incomingIds.map(() => "?").join(",");
      statements.push(
        db
          .prepare(
            `DELETE FROM widgets WHERE user_id = ? AND id NOT IN (${placeholders})`
          )
          .bind(user.id, ...incomingIds)
      );
    }

    for (const widget of widgets) {
      const id = String(widget.id ?? newId());
      const createdAt = widget.createdAt ?? now;
      statements.push(
        db
          .prepare(
            `INSERT INTO widgets (id, user_id, type, title, collapsed, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
               type = excluded.type,
               title = excluded.title,
               collapsed = excluded.collapsed,
               data = excluded.data,
               updated_at = excluded.updated_at`
          )
          .bind(
            id,
            user.id,
            String(widget.type ?? "memo"),
            String(widget.title ?? ""),
            widget.collapsed ? 1 : 0,
            JSON.stringify(widget.data ?? {}),
            createdAt,
            now
          )
      );
    }
  }

  statements.push(
    db
      .prepare(
        `INSERT INTO dashboard_layouts (user_id, columns_json, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
           columns_json = excluded.columns_json,
           updated_at = excluded.updated_at`
      )
      .bind(user.id, JSON.stringify(columns), now)
  );

  await db.batch(statements);
  return jsonResponse({ ok: true, updatedAt: now });
});
