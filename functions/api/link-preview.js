const decodeHtml = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const matchMetaContent = (html, patterns) => {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return decodeHtml(match[1].trim());
    }
  }

  return "";
};

const buildFallbackPreview = (targetUrl) => {
  const hostname = targetUrl.hostname.replace(/^www\./i, "");
  const compactPath = `${targetUrl.pathname}${targetUrl.search}`.replace(/\/+$/, "") || "/";
  const titleBase = compactPath === "/" ? hostname : compactPath.split("/").filter(Boolean).pop() || hostname;
  const title = decodeURIComponent(titleBase)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .slice(0, 80) || hostname;

  return {
    url: targetUrl.toString(),
    finalUrl: targetUrl.toString(),
    hostname,
    title,
    description: `${hostname}${compactPath}`.slice(0, 140),
    image: "",
    siteName: hostname,
    favicon: `${targetUrl.origin}/favicon.ico`
  };
};

export const onRequestGet = async ({ request }) => {
  try {
    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get("url")?.trim() || "";
    if (!rawUrl) {
      return Response.json({ ok: false, error: "url is required" }, { status: 400 });
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return Response.json({ ok: false, error: "invalid url" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return Response.json({ ok: false, error: "only http and https urls are supported" }, { status: 400 });
    }

    // Real browser User-Agent — Instagram, X, and others now serve empty OG
    // metadata to anything that looks like a bot. The proxy still fetches HTML
    // only (no JS execution); we just need to pass the bot filter.
    const response = await fetch(targetUrl.toString(), {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15",
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "ko-KR,ko;q=0.9,en;q=0.8",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      }
    });

    const debug = requestUrl.searchParams.get("debug") === "1";

    if (!response.ok) {
      if (debug) {
        return Response.json({
          ok: true,
          preview: buildFallbackPreview(targetUrl),
          debug: { status: response.status, finalUrl: response.url }
        });
      }
      return Response.json({ ok: true, preview: buildFallbackPreview(targetUrl) });
    }

    const html = await response.text();
    const finalUrl = new URL(response.url);
    const title =
      matchMetaContent(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["'][^>]*>/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["'][^>]*>/i,
        /<title[^>]*>([^<]+)<\/title>/i
      ]) || finalUrl.hostname;
    const description = matchMetaContent(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["'][^>]*>/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i
    ]);
    const image = matchMetaContent(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i
    ]);
    const favicon = matchMetaContent(html, [
      /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/i,
      /<link[^>]+rel=["']apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/i,
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon[^"']*["'][^>]*>/i
    ]);
    const siteName = matchMetaContent(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["'][^>]*>/i
    ]);

    return Response.json({
      ok: true,
      preview: {
        url: targetUrl.toString(),
        finalUrl: finalUrl.toString(),
        hostname: finalUrl.hostname.replace(/^www\./i, ""),
        title,
        description,
        image: image ? new URL(image, finalUrl).toString() : "",
        siteName,
        favicon: favicon ? new URL(favicon, finalUrl).toString() : `${finalUrl.origin}/favicon.ico`
      },
      ...(debug
        ? {
            debug: {
              status: response.status,
              finalUrl: finalUrl.toString(),
              htmlLength: html.length,
              htmlHead: html.slice(0, 800)
            }
          }
        : {})
    });
  } catch (error) {
    try {
      const requestUrl = new URL(request.url);
      const rawUrl = requestUrl.searchParams.get("url")?.trim() || "";
      const targetUrl = new URL(rawUrl);
      return Response.json({ ok: true, preview: buildFallbackPreview(targetUrl) });
    } catch {
      const message = error instanceof Error ? error.message : "unknown error";
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  }
};
