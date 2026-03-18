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
