const decodeHtml = (value = "") =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const matchTag = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeHtml(match?.[1]?.trim() || "");
};

const parseItems = (xml, limit = 5) => {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, limit);
  const entryMatches = itemMatches.length > 0 ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].slice(0, limit);
  const nodes = itemMatches.length > 0 ? itemMatches.map((match) => match[0]) : entryMatches.map((match) => match[0]);

  return nodes.map((item) => {
    const atomLink = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1] || "";
    return {
      title: matchTag(item, "title") || "제목 없는 항목",
      link: matchTag(item, "link") || atomLink,
      pubDate: matchTag(item, "pubDate") || matchTag(item, "published") || matchTag(item, "updated")
    };
  });
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

    const response = await fetch(targetUrl.toString(), {
      headers: {
        "user-agent": "WZD RSS Reader/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!response.ok) {
      return Response.json({ ok: false, error: `rss feed request failed: ${response.status}` }, { status: 502 });
    }

    const xml = await response.text();
    const title = matchTag(xml, "title") || targetUrl.hostname.replace(/^www\./i, "");
    const description = matchTag(xml, "description") || matchTag(xml, "subtitle");
    const channelLink = matchTag(xml, "link") || targetUrl.toString();
    const items = parseItems(xml);

    return Response.json({
      ok: true,
      feed: {
        title,
        description,
        link: channelLink,
        items
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
};
