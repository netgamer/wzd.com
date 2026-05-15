import { wrap, jsonResponse, errorResponse } from "../_lib/auth.js";

// 통합 URL 메타 엔드포인트: 사용자가 URL 위젯에 어떤 링크든 붙여넣으면
// 이 엔드포인트가 platform을 식별하고 썸네일·임베드 URL·비율 등을 반환.
// 클라이언트는 결과를 노트 metadata에 저장하고 카드 렌더에 사용.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15";

const readCache = async (db, url) => {
  try {
    const row = await db
      .prepare("SELECT meta_json, fetched_at FROM url_meta_cache WHERE url = ?")
      .bind(url)
      .first();
    if (!row) return null;
    const age = Date.now() - new Date(row.fetched_at).getTime();
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) return null;
    return JSON.parse(row.meta_json);
  } catch {
    return null;
  }
};

const writeCache = async (db, url, meta) => {
  try {
    await db
      .prepare(
        `INSERT INTO url_meta_cache (url, meta_json, fetched_at)
         VALUES (?, ?, ?)
         ON CONFLICT(url) DO UPDATE SET
           meta_json = excluded.meta_json,
           fetched_at = excluded.fetched_at`
      )
      .bind(url, JSON.stringify(meta), new Date().toISOString())
      .run();
  } catch (error) {
    console.error("url_meta cache write failed", error);
  }
};

// ---------- YouTube ----------
const parseYoutube = (parsed) => {
  const host = parsed.hostname.replace(/^www\./, "");
  let id = "";
  let isShort = false;

  if (host === "youtu.be") {
    id = parsed.pathname.slice(1).split("/")[0] || "";
  } else if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    if (parsed.pathname.startsWith("/shorts/")) {
      id = parsed.pathname.split("/")[2] || "";
      isShort = true;
    } else if (parsed.pathname.startsWith("/embed/")) {
      id = parsed.pathname.split("/")[2] || "";
    } else {
      id = parsed.searchParams.get("v") || "";
    }
  }
  if (!id) return null;

  return {
    kind: isShort ? "youtube-short" : "youtube-long",
    platform: "youtube",
    mediaId: id,
    embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1${
      isShort ? "&loop=1&playsinline=1" : ""
    }`,
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/${isShort ? "oar2.jpg" : "hqdefault.jpg"}`,
    fallbackThumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    aspectRatio: isShort ? "9 / 16" : "16 / 9",
    openUrl: isShort
      ? `https://www.youtube.com/shorts/${id}`
      : `https://www.youtube.com/watch?v=${id}`,
    title: "",
    author: ""
  };
};

// ---------- Instagram ----------
const parseInstagram = (parsed) => {
  const host = parsed.hostname.replace(/^www\./, "");
  if (host !== "instagram.com" && !host.endsWith(".instagram.com")) return null;

  const match = parsed.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (!match) return null;

  const [, kindPath, code] = match;
  const isReel = kindPath === "reel" || kindPath === "tv";

  return {
    kind: isReel ? "instagram-reel" : "instagram-post",
    platform: "instagram",
    mediaId: code,
    embedUrl: `https://www.instagram.com/${kindPath}/${code}/embed/captioned`,
    // 인스타는 비로그인 환경에서 OG 메타도 거의 안 줘서 썸네일 직접 못 얻음.
    // null로 두고 클라이언트가 항상 embed iframe을 보여주도록 처리.
    thumbnailUrl: null,
    fallbackThumbnailUrl: null,
    aspectRatio: isReel ? "9 / 16" : "1 / 1",
    openUrl: `https://www.instagram.com/${kindPath}/${code}/`,
    title: "",
    author: ""
  };
};

// ---------- TikTok ----------
const parseTikTok = async (parsed, originalUrl) => {
  const host = parsed.hostname.replace(/^www\./, "");
  if (
    host !== "tiktok.com" &&
    !host.endsWith(".tiktok.com") &&
    host !== "vm.tiktok.com"
  ) {
    return null;
  }

  // 우선 vm.tiktok.com 단축 링크면 redirect 해석
  let resolvedUrl = originalUrl;
  let mediaId = "";

  if (host === "vm.tiktok.com") {
    try {
      const head = await fetch(originalUrl, {
        method: "HEAD",
        redirect: "follow",
        headers: { "user-agent": UA }
      });
      resolvedUrl = head.url || originalUrl;
    } catch {
      // ignore
    }
  }

  // 정상 URL: /@user/video/<id>
  const videoMatch = resolvedUrl.match(/\/video\/(\d+)/);
  if (videoMatch) mediaId = videoMatch[1];

  // oEmbed 호출로 썸네일·제목 받기
  let oembed = null;
  try {
    const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(resolvedUrl)}`;
    const resp = await fetch(oembedUrl, {
      headers: { "user-agent": UA, accept: "application/json" }
    });
    if (resp.ok) {
      oembed = await resp.json();
      if (!mediaId && oembed?.embed_product_id) {
        mediaId = String(oembed.embed_product_id);
      }
    }
  } catch (error) {
    console.error("tiktok oembed failed", error);
  }

  if (!mediaId) return null;

  return {
    kind: "tiktok",
    platform: "tiktok",
    mediaId,
    // 자동재생 포함 player. music_info/description=1로 native UI 표시.
    embedUrl: `https://www.tiktok.com/player/v1/${mediaId}?autoplay=1&music_info=1&description=1`,
    thumbnailUrl: oembed?.thumbnail_url || null,
    fallbackThumbnailUrl: null,
    aspectRatio: "9 / 16",
    openUrl: resolvedUrl,
    title: oembed?.title || "",
    author: oembed?.author_name || ""
  };
};

const detectAndBuild = async (rawUrl) => {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!["http:", "https:"].includes(parsed.protocol)) return null;

  return (
    parseYoutube(parsed) ||
    parseInstagram(parsed) ||
    (await parseTikTok(parsed, rawUrl))
  );
};

export const onRequestGet = wrap(async ({ env, request }) => {
  const url = new URL(request.url);
  const targetUrl = url.searchParams.get("url")?.trim() || "";
  if (!targetUrl) {
    return errorResponse(400, "missing_url", "url 쿼리 파라미터가 필요합니다.");
  }

  // 캐시 hit
  if (url.searchParams.get("refresh") !== "1") {
    const cached = await readCache(env.DB, targetUrl);
    if (cached) {
      return jsonResponse({ ...cached, cached: true });
    }
  }

  const meta = await detectAndBuild(targetUrl);
  if (!meta) {
    return jsonResponse({
      kind: "unknown",
      platform: "unknown",
      mediaId: "",
      embedUrl: "",
      thumbnailUrl: null,
      aspectRatio: "16 / 9",
      openUrl: targetUrl,
      title: "",
      author: "",
      cached: false
    });
  }

  await writeCache(env.DB, targetUrl, meta);
  return jsonResponse({ ...meta, cached: false });
});
