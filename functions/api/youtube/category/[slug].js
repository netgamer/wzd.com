import { wrap, jsonResponse, errorResponse } from "../../../_lib/auth.js";
import { findYoutubeCategory } from "../../../_lib/youtube-categories.js";

// 무료 카테고리 큐레이션: YouTube 검색 결과 페이지(HTML)를 직접 가져와
// ytInitialData JSON에서 videoRenderer를 추출. API 키 불필요.
//
// 안정성 노트:
// - YouTube 검색 페이지는 공개 서비스라 비로그인·서버 IP에서도 잘 응답함
// - ytInitialData 스키마는 수년간 안정적으로 유지됨
// - 결과는 YouTube가 관련성·인기도 종합 정렬 → 자연스러운 "엄선" 효과
// - 24h D1 캐시로 같은 카테고리 재요청은 즉시 응답

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_RESULTS = 10;
const MIN_DURATION_SEC = 60; // 1분 미만(Shorts) 제외

const decodeHtmlEntities = (value = "") =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");

const parseDurationToSeconds = (text) => {
  if (!text || typeof text !== "string") return null;
  const parts = text.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => Number.isNaN(p))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1) return parts[0];
  return null;
};

const pickThumbnail = (thumbnails) => {
  if (!Array.isArray(thumbnails) || thumbnails.length === 0) return "";
  // last is usually highest resolution
  return thumbnails[thumbnails.length - 1]?.url || "";
};

const collectVideoRenderers = (node, out = []) => {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collectVideoRenderers(item, out);
    return out;
  }
  for (const key of Object.keys(node)) {
    if (key === "videoRenderer" && node[key] && typeof node[key] === "object" && node[key].videoId) {
      out.push(node[key]);
    } else {
      collectVideoRenderers(node[key], out);
    }
  }
  return out;
};

const extractInitialData = (html) => {
  // YouTube가 페이지 안에 `var ytInitialData = {...};` 형태로 JSON을 박아둠.
  // 따옴표 안에 중괄호가 들어갈 수 있으므로 끝 마커는 `;</script>`로 닫는다.
  const marker = "var ytInitialData = ";
  const idx = html.indexOf(marker);
  if (idx < 0) return null;
  const tail = html.slice(idx + marker.length);
  // depth 추적해서 첫 번째 외곽 객체 끝을 찾는다.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = 0; i < tail.length; i += 1) {
    const ch = tail[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        const raw = tail.slice(0, i + 1);
        try {
          return JSON.parse(raw);
        } catch (error) {
          console.error("ytInitialData parse failed", error);
          return null;
        }
      }
    }
  }
  return null;
};

const normalizeVideo = (renderer) => {
  if (!renderer || typeof renderer !== "object") return null;
  const id = renderer.videoId;
  if (!id || typeof id !== "string") return null;

  const title = decodeHtmlEntities(
    renderer.title?.runs?.[0]?.text ||
      renderer.title?.simpleText ||
      ""
  ).trim();
  if (!title) return null;

  const channel = decodeHtmlEntities(
    renderer.ownerText?.runs?.[0]?.text ||
      renderer.longBylineText?.runs?.[0]?.text ||
      renderer.shortBylineText?.runs?.[0]?.text ||
      ""
  ).trim();

  // YouTube CDN의 hqdefault는 모든 영상에 항상 존재(480x360). 검색 결과
  // 페이지에서 받은 sqp 서명 URL보다 안정적이고 캐시도 잘 됨.
  const thumbnail = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  const lengthText = renderer.lengthText?.simpleText || "";
  const durationSec = parseDurationToSeconds(lengthText);
  const viewCount =
    renderer.shortViewCountText?.simpleText ||
    renderer.shortViewCountText?.accessibility?.accessibilityData?.label ||
    renderer.viewCountText?.simpleText ||
    "";
  const publishedTime = renderer.publishedTimeText?.simpleText || "";

  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title,
    channel,
    thumbnail,
    duration: lengthText,
    durationSec,
    viewCount,
    publishedTime
  };
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

const fetchSearchPage = async (query) => {
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set("search_query", query);
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "KR");
  // sp = sort by viewCount + filter type=video. 안전한 protobuf 코드.
  url.searchParams.set("sp", "CAMSAhAB");

  const response = await fetch(url.toString(), {
    redirect: "follow",
    headers: {
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "none",
      "upgrade-insecure-requests": "1"
    }
  });
  if (!response.ok) {
    throw new Error(`youtube search status ${response.status}`);
  }
  return response.text();
};

const dedupe = (videos) => {
  const seen = new Set();
  const out = [];
  for (const v of videos) {
    if (!v?.id || seen.has(v.id)) continue;
    seen.add(v.id);
    out.push(v);
  }
  return out;
};

export const onRequestGet = wrap(async ({ env, params, request }) => {
  const slug = String(params.slug || "").trim().toLowerCase();
  const category = findYoutubeCategory(slug);
  if (!category) {
    return errorResponse(404, "unknown_category", `Unknown category: ${slug}`);
  }

  const url = new URL(request.url);
  const skipCache = url.searchParams.get("refresh") === "1";
  const debug = url.searchParams.get("debug") === "1";

  if (!skipCache) {
    const cached = await readCache(env.DB, slug);
    if (cached && cached.length > 0) {
      return jsonResponse({ category: slug, videos: cached, cached: true });
    }
  }

  try {
    const html = await fetchSearchPage(category.query);
    const data = extractInitialData(html);
    if (!data) {
      return errorResponse(502, "youtube_parse_failed", "YouTube 응답에서 데이터를 추출하지 못했습니다.");
    }
    const renderers = collectVideoRenderers(data);
    const normalized = renderers
      .map(normalizeVideo)
      .filter(Boolean)
      .filter((v) => v.durationSec === null || v.durationSec >= MIN_DURATION_SEC);
    const unique = dedupe(normalized).slice(0, MAX_RESULTS);

    if (unique.length === 0) {
      return errorResponse(
        502,
        "youtube_empty_results",
        "검색 결과가 비었습니다. 잠시 후 다시 시도해주세요."
      );
    }

    await writeCache(env.DB, slug, unique);
    return jsonResponse({
      category: slug,
      videos: unique,
      cached: false,
      ...(debug ? { debug: { totalRenderers: renderers.length, query: category.query } } : {})
    });
  } catch (error) {
    console.error("youtube curation fetch failed", error);
    return errorResponse(
      502,
      "youtube_fetch_failed",
      error instanceof Error ? error.message : "YouTube 검색에 실패했습니다."
    );
  }
});
