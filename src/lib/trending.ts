export interface TrendingNewsItem {
  title: string;
  source: string;
  link: string;
}

export interface TrendingItem {
  title: string;
  traffic: string;
  link: string;
  picture: string;
  newsItems: TrendingNewsItem[];
}

export interface TrendingPreview {
  region: string;
  title: string;
  items: TrendingItem[];
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const fetchTrendingKeywords = async (region = "KR"): Promise<TrendingPreview> => {
  const endpoint = `${API_BASE}/api/trending?region=${encodeURIComponent(region)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`trending request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; trending?: TrendingPreview; error?: string };
  if (!data.ok || !data.trending) {
    throw new Error(data.error || "trending response missing data");
  }

  return data.trending;
};
