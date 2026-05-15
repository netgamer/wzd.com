import { wrap, jsonResponse, errorResponse } from "../../../_lib/auth.js";
import { findYoutubeCategory } from "../../../_lib/youtube-categories.js";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 10;

const decodeHtmlEntities = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

const isoMinus = (days) => new Date(Date.now() - days * 86_400_000).toISOString();

const pickThumbnail = (snippet) => {
  const t = snippet?.thumbnails ?? {};
  return (
    t.maxres?.url ||
    t.standard?.url ||
    t.high?.url ||
    t.medium?.url ||
    t.default?.url ||
    ""
  );
};

const formatDuration = (iso) => {
  if (!iso || typeof iso !== "string") return "";
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return "";
  const [, h, m, s] = match;
  const hh = h ? parseInt(h, 10) : 0;
  const mm = m ? parseInt(m, 10) : 0;
  const ss = s ? parseInt(s, 10) : 0;
  if (hh > 0) {
    return `${hh}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  return `${mm}:${String(ss).padStart(2, "0")}`;
};

const formatViewCount = (raw) => {
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
};

const readCache = async (db, category) => {
  try {
    const row = await db
      .prepare("SELECT videos_json, fetched_at FROM youtube_curation_cache WHERE category = ?")
      .bind(category)
      .first();
    if (!row) return null;
    const age = Date.now() - new Date(row.fetched_at).getTime();
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) return null;
    return JSON.parse(row.videos_json);
  } catch {
    return null;
  }
};

const writeCache = async (db, category, videos) => {
  try {
    await db
      .prepare(
        `INSERT INTO youtube_curation_cache (category, videos_json, fetched_at)
         VALUES (?, ?, ?)
         ON CONFLICT(category) DO UPDATE SET
           videos_json = excluded.videos_json,
           fetched_at = excluded.fetched_at`
      )
      .bind(category, JSON.stringify(videos), new Date().toISOString())
      .run();
  } catch (error) {
    console.error("youtube cache write failed", error);
  }
};

const fetchFromYouTube = async (apiKey, query) => {
  const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
  searchUrl.searchParams.set("part", "snippet");
  searchUrl.searchParams.set("q", query);
  searchUrl.searchParams.set("type", "video");
  searchUrl.searchParams.set("videoEmbeddable", "true");
  searchUrl.searchParams.set("order", "viewCount");
  searchUrl.searchParams.set("publishedAfter", isoMinus(30));
  searchUrl.searchParams.set("regionCode", "KR");
  searchUrl.searchParams.set("relevanceLanguage", "ko");
  searchUrl.searchParams.set("safeSearch", "moderate");
  searchUrl.searchParams.set("maxResults", String(MAX_RESULTS));
  searchUrl.searchParams.set("key", apiKey);

  const searchResp = await fetch(searchUrl.toString());
  if (!searchResp.ok) {
    const text = await searchResp.text().catch(() => "");
    throw new Error(`youtube search ${searchResp.status}: ${text.slice(0, 200)}`);
  }
  const searchJson = await searchResp.json();
  const items = Array.isArray(searchJson?.items) ? searchJson.items : [];
  const ids = items
    .map((item) => item?.id?.videoId)
    .filter((id) => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return [];

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "snippet,contentDetails,statistics");
  detailsUrl.searchParams.set("id", ids.join(","));
  detailsUrl.searchParams.set("key", apiKey);

  const detailsResp = await fetch(detailsUrl.toString());
  if (!detailsResp.ok) {
    const text = await detailsResp.text().catch(() => "");
    throw new Error(`youtube videos.list ${detailsResp.status}: ${text.slice(0, 200)}`);
  }
  const detailsJson = await detailsResp.json();
  const detailsById = new Map(
    (Array.isArray(detailsJson?.items) ? detailsJson.items : []).map((v) => [v.id, v])
  );

  return ids
    .map((id) => {
      const detail = detailsById.get(id);
      const snippet = detail?.snippet ?? items.find((item) => item?.id?.videoId === id)?.snippet ?? {};
      const stats = detail?.statistics ?? {};
      const content = detail?.contentDetails ?? {};
      const title = decodeHtmlEntities(snippet.title || "");
      const channel = decodeHtmlEntities(snippet.channelTitle || "");
      return {
        id,
        url: `https://www.youtube.com/watch?v=${id}`,
        title,
        channel,
        thumbnail: pickThumbnail(snippet),
        publishedAt: snippet.publishedAt || "",
        duration: formatDuration(content.duration),
        viewCount: formatViewCount(stats.viewCount)
      };
    })
    .filter((v) => v.title);
};

export const onRequestGet = wrap(async ({ env, params, request }) => {
  const slug = String(params.slug || "").trim().toLowerCase();
  const category = findYoutubeCategory(slug);
  if (!category) {
    return errorResponse(404, "unknown_category", `Unknown category: ${slug}`);
  }

  const url = new URL(request.url);
  const skipCache = url.searchParams.get("refresh") === "1";

  if (!skipCache) {
    const cached = await readCache(env.DB, slug);
    if (cached && cached.length > 0) {
      return jsonResponse({ category: slug, videos: cached, cached: true });
    }
  }

  const apiKey = env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return errorResponse(
      503,
      "youtube_api_key_missing",
      "YOUTUBE_API_KEY 환경변수가 설정되지 않았습니다. wrangler pages secret put YOUTUBE_API_KEY 로 등록해주세요."
    );
  }

  try {
    const videos = await fetchFromYouTube(apiKey, category.query);
    if (videos.length > 0) {
      await writeCache(env.DB, slug, videos);
    }
    return jsonResponse({ category: slug, videos, cached: false });
  } catch (error) {
    console.error("youtube curation fetch failed", error);
    return errorResponse(
      502,
      "youtube_fetch_failed",
      error instanceof Error ? error.message : "YouTube API 호출에 실패했습니다."
    );
  }
});
