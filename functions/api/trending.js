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

const parseItems = (xml, limit = 10) => {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, limit);
  return itemMatches.map((match) => {
    const item = match[0];
    return {
      title: matchTag(item, "title"),
      traffic: matchTag(item, "ht:approx_traffic"),
      link: matchTag(item, "link"),
      picture: matchTag(item, "ht:picture"),
      newsItems: [...item.matchAll(/<ht:news_item\b[\s\S]*?<\/ht:news_item>/gi)].slice(0, 3).map((newsMatch) => {
        const news = newsMatch[0];
        return {
          title: matchTag(news, "ht:news_item_title"),
          source: matchTag(news, "ht:news_item_source"),
          link: matchTag(news, "ht:news_item_url")
        };
      })
    };
  });
};

export const onRequestGet = async ({ request }) => {
  try {
    const requestUrl = new URL(request.url);
    const region = (requestUrl.searchParams.get("region")?.trim() || "KR").toUpperCase();
    const targetUrl = `https://trends.google.com/trending/rss?geo=${encodeURIComponent(region)}`;

    const response = await fetch(targetUrl, {
      headers: {
        "user-agent": "WZD Trending Widget/1.0",
        accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!response.ok) {
      return Response.json({ ok: false, error: `trending request failed: ${response.status}` }, { status: 502 });
    }

    const xml = await response.text();
    const title = matchTag(xml, "title") || `${region} 실시간 검색어`;
    const items = parseItems(xml);

    return Response.json({
      ok: true,
      trending: {
        region,
        title,
        items
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
};
