import { createInitialState } from "./dashboard-state";
import { supabase } from "./supabase";
import type { ColumnState, DashboardState, WidgetInstance } from "../types";

interface LayoutRow {
  user_id: string;
  columns_json: ColumnState[];
}

interface WidgetRow {
  id: string;
  user_id: string;
  type: WidgetInstance["type"];
  title: string;
  collapsed: boolean;
  data: WidgetInstance["data"];
  created_at: string;
  updated_at: string;
}

const normalizeColumns = (columns: ColumnState[], widgetIds: string[]): ColumnState[] => {
  const baseColumns = columns.length > 0 ? columns : createInitialState().columns;
  const existing = new Set(widgetIds);

  const normalized = baseColumns.map((column) => ({
    ...column,
    widgetIds: column.widgetIds.filter((id) => existing.has(id))
  }));

  const allPlaced = new Set(normalized.flatMap((column) => column.widgetIds));
  const orphanIds = widgetIds.filter((id) => !allPlaced.has(id));

  if (orphanIds.length > 0 && normalized[0]) {
    normalized[0] = {
      ...normalized[0],
      widgetIds: [...orphanIds, ...normalized[0].widgetIds]
    };
  }

  return normalized;
};

export const loadDashboardFromSupabase = async (userId: string): Promise<DashboardState | null> => {
  if (!supabase) {
    return null;
  }

  const [layoutResult, widgetsResult] = await Promise.all([
    supabase.from("dashboard_layouts").select("user_id,columns_json").eq("user_id", userId).maybeSingle(),
    supabase
      .from("widgets")
      .select("id,user_id,type,title,collapsed,data,created_at,updated_at")
      .eq("user_id", userId)
  ]);

  if (layoutResult.error) {
    throw layoutResult.error;
  }
  if (widgetsResult.error) {
    throw widgetsResult.error;
  }

  const layout = layoutResult.data as LayoutRow | null;
  const widgetRows = (widgetsResult.data ?? []) as WidgetRow[];

  if (!layout && widgetRows.length === 0) {
    return null;
  }

  const widgets: DashboardState["widgets"] = Object.fromEntries(
    widgetRows.map((row) => [
      row.id,
      {
        id: row.id,
        type: row.type,
        title: row.title,
        collapsed: row.collapsed,
        data: row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    ])
  );

  const widgetIds = Object.keys(widgets);
  const columns = normalizeColumns(layout?.columns_json ?? [], widgetIds);

  return { columns, widgets };
};

export const saveDashboardToSupabase = async (userId: string, state: DashboardState): Promise<void> => {
  if (!supabase) {
    return;
  }

  const widgets = Object.values(state.widgets);

  const layoutWrite = await supabase.from("dashboard_layouts").upsert({
    user_id: userId,
    columns_json: state.columns,
    updated_at: new Date().toISOString()
  });
  if (layoutWrite.error) {
    throw layoutWrite.error;
  }

  if (widgets.length === 0) {
    const wipe = await supabase.from("widgets").delete().eq("user_id", userId);
    if (wipe.error) {
      throw wipe.error;
    }
    return;
  }

  const upsertRows: WidgetRow[] = widgets.map((widget) => ({
    id: widget.id,
    user_id: userId,
    type: widget.type,
    title: widget.title,
    collapsed: widget.collapsed,
    data: widget.data,
    created_at: widget.createdAt,
    updated_at: widget.updatedAt
  }));

  const write = await supabase.from("widgets").upsert(upsertRows);
  if (write.error) {
    throw write.error;
  }

  const ids = widgets.map((widget) => `"${widget.id}"`).join(",");
  const cleanup = await supabase.from("widgets").delete().eq("user_id", userId).not("id", "in", `(${ids})`);
  if (cleanup.error) {
    throw cleanup.error;
  }
};
