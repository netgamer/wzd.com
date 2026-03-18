import cors from "cors";
import express from "express";
import { assertConfig, config } from "./config.js";
import { runGroqAgentChat } from "./groq-client.js";
import { createScheduledWorkflow } from "./n8n-client.js";

const app = express();

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

const decodeXml = (value = "") =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const matchXmlTag = (source, tag) => {
  const match = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1]?.trim() || "");
};

const parseRssItems = (xml, limit = 5) => {
  const itemMatches = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, limit);
  const entryMatches = itemMatches.length > 0 ? [] : [...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].slice(0, limit);
  const nodes = itemMatches.length > 0 ? itemMatches.map((match) => match[0]) : entryMatches.map((match) => match[0]);

  return nodes.map((item) => {
    const atomLink = item.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i)?.[1] || "";
    return {
      title: matchXmlTag(item, "title") || "제목 없는 항목",
      link: matchXmlTag(item, "link") || atomLink,
      pubDate: matchXmlTag(item, "pubDate") || matchXmlTag(item, "published") || matchXmlTag(item, "updated")
    };
  });
};

app.use(
  cors({
    origin: [config.allowedOrigin, "http://localhost:5173"],
    credentials: true
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "wzd-agent-server" });
});

app.get("/api/link-preview", async (req, res) => {
  try {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) {
      res.status(400).json({ ok: false, error: "url is required" });
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      res.status(400).json({ ok: false, error: "invalid url" });
      return;
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      res.status(400).json({ ok: false, error: "only http and https urls are supported" });
      return;
    }

    const response = await fetch(targetUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        "user-agent": "WZD Link Preview Bot/1.0"
      }
    });

    if (!response.ok) {
      res.json({ ok: true, preview: buildFallbackPreview(targetUrl) });
      return;
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

    res.json({
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
      const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
      const targetUrl = new URL(rawUrl);
      res.json({ ok: true, preview: buildFallbackPreview(targetUrl) });
    } catch {
      const message = error instanceof Error ? error.message : "unknown error";
      res.status(500).json({ ok: false, error: message });
    }
  }
});

app.get("/api/image-proxy", async (req, res) => {
  try {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) {
      res.status(400).send("url is required");
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      res.status(400).send("invalid url");
      return;
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      res.status(400).send("unsupported protocol");
      return;
    }

    const response = await fetch(targetUrl, {
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
      headers: {
        "user-agent": "WZD Image Proxy/1.0",
        referer: targetUrl.origin
      }
    });

    if (!response.ok || !response.body) {
      res.status(response.status || 502).send("failed to load image");
      return;
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "public, max-age=3600");
    response.body.pipeTo(
      new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
        abort(error) {
          res.destroy(error);
        }
      })
    ).catch((error) => {
      res.destroy(error);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(500).send(message);
  }
});

app.get("/api/rss-feed", async (req, res) => {
  try {
    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl) {
      res.status(400).json({ ok: false, error: "url is required" });
      return;
    }

    let targetUrl;
    try {
      targetUrl = new URL(rawUrl);
    } catch {
      res.status(400).json({ ok: false, error: "invalid url" });
      return;
    }

    const response = await fetch(targetUrl, {
      headers: {
        "user-agent": "WZD RSS Reader/1.0",
        accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    if (!response.ok) {
      res.status(502).json({ ok: false, error: `rss feed request failed: ${response.status}` });
      return;
    }

    const xml = await response.text();
    const title = matchXmlTag(xml, "title") || targetUrl.hostname.replace(/^www\./i, "");
    const description = matchXmlTag(xml, "description") || matchXmlTag(xml, "subtitle");
    const link = matchXmlTag(xml, "link") || targetUrl.toString();
    const items = parseRssItems(xml);

    res.json({
      ok: true,
      feed: {
        title,
        description,
        link,
        items
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(500).json({ ok: false, error: message });
  }
});

app.post("/api/agent/chat", async (req, res) => {
  try {
    const { agentType, prompt, context, scheduleCron, workflowName } = req.body ?? {};

    if (!agentType || !prompt) {
      res.status(400).json({ ok: false, error: "agentType and prompt are required" });
      return;
    }

    const answer = await runGroqAgentChat({ agentType, prompt, context });

    let workflow = null;
    if (scheduleCron && workflowName) {
      workflow = await createScheduledWorkflow({
        workflowName,
        cron: scheduleCron,
        goal: prompt,
        agentType
      });
    }

    res.json({ ok: true, answer, workflow });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    res.status(500).json({ ok: false, error: message });
  }
});

const bootstrap = () => {
  try {
    assertConfig();
  } catch (error) {
    const message = error instanceof Error ? error.message : "config error";
    console.error(`[config] ${message}`);
  }

  app.listen(config.port, () => {
    console.log(`[agent-server] listening on :${config.port}`);
  });
};

bootstrap();
