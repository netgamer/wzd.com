import { apiFetch } from "./client";

type UnknownRecord = Record<string, unknown>;

export type HomePayloadHero = {
  id: string | undefined;
  title: string;
  summary: string;
  url: string | undefined;
  publishedAt: string | undefined;
  scores: {
    importance: number | undefined;
    monetization: number | undefined;
    relevance: number | undefined;
    total: number | undefined;
  };
};

export type HomePayloadTrend = {
  id: string;
  name: string;
  description: string | undefined;
  trendScore: number | undefined;
  itemCount: number | undefined;
};

export type HomePayloadFeedItem = {
  id: string;
  title: string;
  summary: string | undefined;
  url: string | undefined;
  publishedAt: string | undefined;
  importance: number | undefined;
  monetization: number | undefined;
  relevance: number | undefined;
};

export type HomePayloadRediscoveryItem = {
  bookmarkId: string;
  itemId: string | undefined;
  title: string;
  summary: string | undefined;
  url: string | undefined;
  note: string | undefined;
  savedAt: string | undefined;
  importance: number | undefined;
  monetization: number | undefined;
};

export type HomePayloadAction = {
  id: string;
  title: string;
  description: string | undefined;
  actionType: string | undefined;
  difficulty: string | undefined;
  expectedValue: string | undefined;
  createdAt: string | undefined;
  itemId: string | undefined;
  clusterId: string | undefined;
};

export type HomePayload = {
  hero: HomePayloadHero | null;
  trends: HomePayloadTrend[];
  feed: HomePayloadFeedItem[];
  rediscovery: HomePayloadRediscoveryItem[];
  actions: HomePayloadAction[];
  raw: unknown;
};

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown) => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const asNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const normalizeHero = (value: unknown): HomePayloadHero | null => {
  if (!isRecord(value)) return null;
  return {
    id: asString(value.id),
    title: asString(value.title) ?? "Insight hero",
    summary: asString(value.summary_short) ?? "Top-ranked item from the current home payload.",
    url: asString(value.url),
    publishedAt: asString(value.published_at),
    scores: {
      importance: asNumber(value.score_importance),
      monetization: asNumber(value.score_monetization),
      relevance: asNumber(value.score_relevance),
      total: asNumber(value.total_score)
    }
  };
};

const normalizeTrends = (value: unknown): HomePayloadTrend[] =>
  asArray(value)
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      return {
        id: asString(entry.id) ?? `trend-${index}`,
        name: asString(entry.name) ?? `Trend ${index + 1}`,
        description: asString(entry.description),
        trendScore: asNumber(entry.score_trend),
        itemCount: asNumber(entry.item_count)
      };
    })
    .filter((entry): entry is HomePayloadTrend => Boolean(entry));

const normalizeFeed = (value: unknown): HomePayloadFeedItem[] =>
  asArray(value)
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      return {
        id: asString(entry.id) ?? `feed-${index}`,
        title: asString(entry.title) ?? `Feed item ${index + 1}`,
        summary: asString(entry.summary_short),
        url: asString(entry.url),
        publishedAt: asString(entry.published_at),
        importance: asNumber(entry.score_importance),
        monetization: asNumber(entry.score_monetization),
        relevance: asNumber(entry.score_relevance)
      };
    })
    .filter((entry): entry is HomePayloadFeedItem => Boolean(entry));

const normalizeRediscovery = (value: unknown): HomePayloadRediscoveryItem[] =>
  asArray(value)
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      return {
        bookmarkId: asString(entry.bookmark_id) ?? `bookmark-${index}`,
        itemId: asString(entry.item_id),
        title: asString(entry.title) ?? `Saved item ${index + 1}`,
        summary: asString(entry.summary_short),
        url: asString(entry.url),
        note: asString(entry.note),
        savedAt: asString(entry.saved_at),
        importance: asNumber(entry.score_importance),
        monetization: asNumber(entry.score_monetization)
      };
    })
    .filter((entry): entry is HomePayloadRediscoveryItem => Boolean(entry));

const normalizeActions = (value: unknown): HomePayloadAction[] =>
  asArray(value)
    .map((entry, index) => {
      if (!isRecord(entry)) return null;
      return {
        id: asString(entry.id) ?? `action-${index}`,
        title: asString(entry.title) ?? `Suggested action ${index + 1}`,
        description: asString(entry.description),
        actionType: asString(entry.action_type),
        difficulty: asString(entry.difficulty),
        expectedValue: asString(entry.expected_value),
        createdAt: asString(entry.created_at),
        itemId: asString(entry.item_id),
        clusterId: asString(entry.cluster_id)
      };
    })
    .filter((entry): entry is HomePayloadAction => Boolean(entry));

const normalizeHomePayload = (payload: unknown): HomePayload => {
  const record = isRecord(payload) ? payload : {};
  return {
    hero: normalizeHero(record.hero),
    trends: normalizeTrends(record.trends),
    feed: normalizeFeed(record.feed),
    rediscovery: normalizeRediscovery(record.rediscovery),
    actions: normalizeActions(record.actions),
    raw: payload
  };
};

export const fetchHomePayload = async (userId?: string): Promise<HomePayload> => {
  const data = await apiFetch<unknown>("/api/home-payload", {
    query: userId ? { userId } : undefined,
    allowUnauthorized: true
  });
  return normalizeHomePayload(data);
};
