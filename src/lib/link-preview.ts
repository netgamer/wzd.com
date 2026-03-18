export interface LinkPreview {
  url: string;
  finalUrl: string;
  hostname: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const getImageProxyUrl = (url: string) =>
  url.startsWith("data:image/") ? url : `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;

export const fetchLinkPreview = async (url: string): Promise<LinkPreview> => {
  const endpoint = `${API_BASE}/api/link-preview?url=${encodeURIComponent(url)}`;
  const response = await fetch(endpoint);

  if (!response.ok) {
    throw new Error(`link preview request failed: ${response.status}`);
  }

  const data = (await response.json()) as { ok?: boolean; preview?: LinkPreview; error?: string };
  if (!data.ok || !data.preview) {
    throw new Error(data.error || "link preview response missing preview");
  }

  return data.preview;
};
