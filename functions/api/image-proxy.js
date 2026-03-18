export const onRequestGet = async ({ request }) => {
  try {
    const requestUrl = new URL(request.url);
    const rawUrl = requestUrl.searchParams.get("url")?.trim() || "";
    if (!rawUrl) {
      return new Response("url is required", { status: 400 });
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      return new Response("invalid url", { status: 400 });
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response("unsupported protocol", { status: 400 });
    }

    const response = await fetch(targetUrl.toString(), {
      redirect: "follow",
      headers: {
        "user-agent": "WZD Image Proxy/1.0",
        referer: targetUrl.origin
      }
    });

    if (!response.ok || !response.body) {
      return new Response("failed to load image", { status: response.status || 502 });
    }

    const headers = new Headers(response.headers);
    headers.set("cache-control", "public, max-age=3600");
    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return new Response(message, { status: 500 });
  }
};
