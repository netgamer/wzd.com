export interface SocialPostPreview {
  id: string;
  author: string;
  handle: string;
  avatar?: string;
  text: string;
  createdAt: string;
  url: string;
}

export interface SocialFeedPreview {
  title: string;
  handle: string;
  sourceUrl: string;
  sourceType: "bluesky" | "mastodon" | "rss";
  avatar?: string;
  posts: SocialPostPreview[];
  error?: string;
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const fetchSocialFeed = async (source: string): Promise<SocialFeedPreview> => {
  const endpoint = `${API_BASE}/api/social-feed?source=${encodeURIComponent(source)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`social request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; feed?: SocialFeedPreview; error?: string };
  if (!data.ok || !data.feed) {
    throw new Error(data.error || "social response missing data");
  }

  return data.feed;
};
