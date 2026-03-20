export interface LinkPreview {
  url: string;
  finalUrl: string;
  hostname: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  favicon: string;
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

const decodeHtmlEntities = (value: string) => {
  if (!value || !value.includes("&")) {
    return value;
  }

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
};

const normalizePreviewText = (value: string) =>
  decodeHtmlEntities(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeInstagramTitle = (title: string, hostname: string, siteName: string) => {
  if (!/instagram\.com$/i.test(hostname)) {
    return title;
  }

  const accountMatch = title.match(/^(.+?)\s+on Instagram:?/i);
  if (accountMatch?.[1]) {
    return accountMatch[1].trim();
  }

  return siteName || title;
};

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

  const preview = data.preview;
  const normalizedSiteName = normalizePreviewText(preview.siteName);
  const normalizedTitle = normalizeInstagramTitle(
    normalizePreviewText(preview.title),
    preview.hostname,
    normalizedSiteName
  );

  return {
    ...preview,
    title: normalizedTitle,
    description: normalizePreviewText(preview.description),
    siteName: normalizedSiteName
  };
};
