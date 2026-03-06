export type WidgetType = "bookmark" | "memo" | "rss" | "trend";

export interface ColumnState {
  id: string;
  width: number;
  widgetIds: string[];
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
}

export interface FeedItem {
  id: string;
  title: string;
  link: string;
}

export interface TrendItem {
  id: string;
  keyword: string;
  rank: number;
}

export type WidgetData =
  | { type: "bookmark"; items: BookmarkItem[] }
  | { type: "memo"; text: string }
  | { type: "rss"; feedUrl: string; items: FeedItem[] }
  | { type: "trend"; items: TrendItem[] };

export interface WidgetInstance {
  id: string;
  type: WidgetType;
  title: string;
  collapsed: boolean;
  data: WidgetData;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardState {
  columns: ColumnState[];
  widgets: Record<string, WidgetInstance>;
}

export interface UserProfile {
  id: string;
  email: string;
}
