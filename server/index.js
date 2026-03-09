import cors from "cors";
import express from "express";
import { assertConfig, config } from "./config.js";
import { runGroqAgentChat } from "./groq-client.js";
import { createScheduledWorkflow } from "./n8n-client.js";

const app = express();

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
