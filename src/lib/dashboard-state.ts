import type { DashboardState, WidgetData, WidgetInstance, WidgetType } from "../types";

export const STORAGE_KEY = "wzd-dashboard-v1";

const nowIso = () => new Date().toISOString();

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const defaultWidgetData = (type: WidgetType): WidgetData => {
  switch (type) {
    case "bookmark":
      return {
        type: "bookmark",
        items: [
          { id: makeId(), title: "Cloudflare", url: "https://www.cloudflare.com" },
          { id: makeId(), title: "Supabase", url: "https://supabase.com" }
        ]
      };
    case "memo":
      return { type: "memo", text: "Type your note here..." };
    case "rss":
      return {
        type: "rss",
        feedUrl: "https://example.com/rss",
        items: [
          { id: makeId(), title: "Sample feed item 1", link: "#" },
          { id: makeId(), title: "Sample feed item 2", link: "#" }
        ]
      };
    case "trend":
      return {
        type: "trend",
        items: [
          { id: makeId(), keyword: "ai", rank: 1 },
          { id: makeId(), keyword: "cloudflare", rank: 2 },
          { id: makeId(), keyword: "supabase", rank: 3 }
        ]
      };
    default:
      return { type: "memo", text: "" };
  }
};

export const newWidget = (type: WidgetType, title?: string): WidgetInstance => {
  const baseTitle: Record<WidgetType, string> = {
    bookmark: "Bookmarks",
    memo: "Memo",
    rss: "RSS Feed",
    trend: "Trending"
  };

  return {
    id: makeId(),
    type,
    title: title ?? baseTitle[type],
    collapsed: false,
    data: defaultWidgetData(type),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
};

export const createInitialState = (): DashboardState => {
  const w1 = newWidget("bookmark");
  const w2 = newWidget("memo");
  const w3 = newWidget("trend", "Realtime Keywords");

  return {
    columns: [
      { id: "col-1", width: 34, widgetIds: [w1.id] },
      { id: "col-2", width: 33, widgetIds: [w2.id] },
      { id: "col-3", width: 33, widgetIds: [w3.id] }
    ],
    widgets: {
      [w1.id]: w1,
      [w2.id]: w2,
      [w3.id]: w3
    }
  };
};

export const loadState = (): DashboardState => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(raw) as DashboardState;
    if (!parsed.columns || !parsed.widgets) {
      return createInitialState();
    }
    return parsed;
  } catch {
    return createInitialState();
  }
};

export const saveState = (state: DashboardState): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};
