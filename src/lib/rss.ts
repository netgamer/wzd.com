export interface RssItem {
  title: string;
  link: string;
  pubDate: string;
}

export interface RssFeedPreview {
  title: string;
  description: string;
  link: string;
  items: RssItem[];
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const fetchRssFeed = async (url: string): Promise<RssFeedPreview> => {
  const endpoint = `${API_BASE}/api/rss-feed?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`rss feed request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; feed?: RssFeedPreview; error?: string };
  if (!data.ok || !data.feed) {
    throw new Error(data.error || "rss feed response missing feed");
  }

  return data.feed;
};
