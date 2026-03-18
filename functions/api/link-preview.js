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
  const title = decodeURIComponent(titleBase).replace(/[-_]+/g, " ").slice(0, 80) || hostname;

  return {
    url: targetUrl.toString(),
    finalUrl: targetUrl.toString(),
    hostname,
    title,
    description: `${hostname}${compactPath}`.slice(0, 140),
    image: "",
    siteName: hostname
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

    const response = await fetch(targetUrl.toString(), {
      redirect: "follow",
      headers: {
        "user-agent": "WZD Link Preview Bot/1.0"
      }
    });

    if (!response.ok) {
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
        siteName
      }
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
