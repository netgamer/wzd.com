const decodeHtml = (value = "") =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));

const stripHtml = (value = "") =>
  decodeHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchTag = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeHtml(match?.[1]?.trim() || "");
};

const toAbsoluteUrl = (value, base) => {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return value;
  }
};

const parseRssItems = (xml, limit = 5, baseUrl = "") => {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, limit);
  const entryMatches = itemMatches.length > 0 ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].slice(0, limit);
  const nodes = itemMatches.length > 0 ? itemMatches.map((match) => match[0]) : entryMatches.map((match) => match[0]);

  return nodes.map((item, index) => {
    const atomLink = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1] || "";
    const description =
      matchTag(item, "description") ||
      matchTag(item, "summary") ||
      matchTag(item, "content:encoded") ||
      matchTag(item, "content");

    return {
      id: matchTag(item, "guid") || matchTag(item, "id") || `${index}-${atomLink}`,
      author: matchTag(item, "creator") || matchTag(item, "author") || "",
      handle: "",
      avatar: "",
      text: stripHtml(description || matchTag(item, "title")),
      createdAt: matchTag(item, "pubDate") || matchTag(item, "published") || matchTag(item, "updated"),
      url: toAbsoluteUrl(matchTag(item, "link") || atomLink, baseUrl)
    };
  });
};

const normalizeSource = (rawSource) => {
  const source = rawSource.trim();
  if (!source) {
    throw new Error("source is required");
  }

  if (/^(https?:\/\/)?(bsky\.app\/profile\/)?[a-z0-9.-]+\.[a-z]{2,}$/i.test(source.replace(/^@/, "")) && !source.includes("/@")) {
    const actor = source.replace(/^https?:\/\/bsky\.app\/profile\//i, "").replace(/^@/, "").replace(/\/+$/, "");
    return { type: "bluesky", actor };
  }

  let url;
  try {
    url = new URL(source.startsWith("http") ? source : `https://${source}`);
  } catch {
    throw new Error("invalid source");
  }

  if (url.hostname.includes("bsky.app")) {
    const actor = url.pathname.replace(/^\/profile\//, "").replace(/\/+$/, "");
    return { type: "bluesky", actor };
  }

  if (url.pathname.endsWith(".rss") || url.pathname.endsWith(".xml")) {
    return { type: "rss", url: url.toString() };
  }

  if (url.pathname.includes("/@") || url.hostname.includes("mastodon")) {
    return { type: "mastodon", url: `${url.origin}${url.pathname.replace(/\/$/, "")}.rss` };
  }

  return { type: "rss", url: url.toString() };
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "WZD Social Feed/1.0",
      accept: "application/json, text/plain;q=0.9, */*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`request failed: ${response.status}`);
  }

  return response.json();
};

const fetchRssFeed = async (targetUrl, sourceType = "rss") => {
  const response = await fetch(targetUrl, {
    headers: {
      "user-agent": "WZD Social Feed/1.0",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
    }
  });

  if (!response.ok) {
    throw new Error(`rss request failed: ${response.status}`);
  }

  const xml = await response.text();
  const title = stripHtml(matchTag(xml, "title")) || new URL(targetUrl).hostname.replace(/^www\./i, "");
  const description = stripHtml(matchTag(xml, "description") || matchTag(xml, "subtitle"));
  const channelLink = toAbsoluteUrl(matchTag(xml, "link"), targetUrl) || targetUrl;
  const avatar =
    xml.match(/<image\b[\s\S]*?<url>([\s\S]*?)<\/url>[\s\S]*?<\/image>/i)?.[1]?.trim() ||
    xml.match(/<itunes:image[^>]+href=["']([^"']+)["']/i)?.[1] ||
    "";

  return {
    title,
    handle: new URL(channelLink).hostname.replace(/^www\./i, ""),
    sourceUrl: channelLink,
    sourceType,
    avatar,
    posts: parseRssItems(xml, 5, channelLink).filter((post) => post.text)
  };
};

const fetchBlueskyFeed = async (actor) => {
  const profile = await fetchJson(
    `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`
  );
  const authorFeed = await fetchJson(
    `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(actor)}&limit=5`
  );

  const handle = profile.handle || actor;
  return {
    title: profile.displayName || handle,
    handle: `@${handle}`,
    sourceUrl: `https://bsky.app/profile/${handle}`,
    sourceType: "bluesky",
    avatar: profile.avatar || "",
    posts: (authorFeed.feed || [])
      .map((entry, index) => {
        const post = entry.post || {};
        const record = post.record || {};
        const postId = typeof post.uri === "string" ? post.uri.split("/").pop() : "";
        return {
          id: post.uri || `${handle}-${index}`,
          author: profile.displayName || handle,
          handle: `@${handle}`,
          avatar: profile.avatar || "",
          text: stripHtml(record.text || ""),
          createdAt: record.createdAt || post.indexedAt || "",
          url: postId ? `https://bsky.app/profile/${handle}/post/${postId}` : `https://bsky.app/profile/${handle}`
        };
      })
      .filter((post) => post.text)
  };
};

export const onRequestGet = async ({ request }) => {
  try {
    const requestUrl = new URL(request.url);
    const rawSource = requestUrl.searchParams.get("source")?.trim() || "";
    const normalized = normalizeSource(rawSource);

    let feed;
    if (normalized.type === "bluesky") {
      feed = await fetchBlueskyFeed(normalized.actor);
    } else if (normalized.type === "mastodon") {
      feed = await fetchRssFeed(normalized.url, "mastodon");
    } else {
      feed = await fetchRssFeed(normalized.url, "rss");
    }

    return Response.json({ ok: true, feed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
};
