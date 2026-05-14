import type { ColumnState, DashboardState, WidgetInstance } from "../../types";
import { createInitialState } from "../dashboard-state";
import { apiFetch } from "./client";

interface DashboardPayload {
  layout: { userId: string; columns: ColumnState[]; updatedAt: string } | null;
  widgets: Array<{
    id: string;
    userId: string;
    type: WidgetInstance["type"];
    title: string;
    collapsed: boolean;
    data: WidgetInstance["data"];
    createdAt: string;
    updatedAt: string;
  }>;
}

const normalizeColumns = (columns: ColumnState[], widgetIds: string[]): ColumnState[] => {
  const baseColumns = Array.isArray(columns) && columns.length > 0 ? columns : createInitialState().columns;

  const normalized = baseColumns.map((column) => ({
    ...column,
    widgetIds: Array.isArray(column.widgetIds) ? [...column.widgetIds] : []
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

export const getDashboardSignature = (state: DashboardState): string => {
  const columns = state.columns.map((column) => ({
    id: column.id,
    width: Number(column.width.toFixed(4)),
    widgetIds: [...column.widgetIds]
  }));

  const widgets = Object.values(state.widgets)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((widget) => ({
      id: widget.id,
      type: widget.type,
      title: widget.title,
      collapsed: widget.collapsed,
      data: widget.data,
      updatedAt: widget.updatedAt
    }));

  return JSON.stringify({ columns, widgets });
};

export const loadDashboardFromSupabase = async (_userId: string): Promise<DashboardState | null> => {
  const payload = await apiFetch<DashboardPayload>("/api/dashboard").catch((error) => {
    if (error?.status === 401) return null;
    throw error;
  });
  if (!payload) return null;
  if (!payload.layout && payload.widgets.length === 0) return null;

  const widgets: DashboardState["widgets"] = Object.fromEntries(
    payload.widgets.map((row) => [
      row.id,
      {
        id: row.id,
        type: row.type,
        title: row.title,
        collapsed: row.collapsed,
        data: row.data,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      }
    ])
  );

  const widgetIds = Object.keys(widgets);
  const columns = normalizeColumns(payload.layout?.columns ?? [], widgetIds);
  return { columns, widgets };
};

export const saveDashboardToSupabase = async (
  _userId: string,
  state: DashboardState
): Promise<void> => {
  const widgets = Object.values(state.widgets).map((widget) => ({
    id: widget.id,
    type: widget.type,
    title: widget.title,
    collapsed: widget.collapsed,
    data: widget.data,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt
  }));
  await apiFetch("/api/dashboard", {
    method: "PUT",
    body: { columns: state.columns, widgets }
  });
};
