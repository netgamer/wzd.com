import { config } from "./config.js";

const requestN8n = async (path, method, body) => {
  if (!config.n8nBaseUrl || !config.n8nApiKey) {
    throw new Error("n8n config is missing");
  }

  const url = `${config.n8nBaseUrl.replace(/\/$/, "")}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-N8N-API-KEY": config.n8nApiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n API failed: ${response.status} ${text}`);
  }

  return response.json();
};

const buildSimpleWorkflow = ({ workflowName, cron, goal, agentType }) => ({
  name: workflowName,
  active: true,
  nodes: [
    {
      id: "cron-trigger",
      name: "Cron Trigger",
      type: "n8n-nodes-base.scheduleTrigger",
      typeVersion: 1,
      position: [260, 300],
      parameters: {
        rule: {
          interval: [
            {
              field: "cronExpression",
              expression: cron
            }
          ]
        }
      }
    },
    {
      id: "set-context",
      name: "Set Context",
      type: "n8n-nodes-base.set",
      typeVersion: 3,
      position: [520, 300],
      parameters: {
        values: {
          string: [
            { name: "goal", value: goal },
            { name: "agentType", value: agentType },
            { name: "executedAt", value: "={{$now}}" }
          ]
        }
      }
    }
  ],
  connections: {
    "Cron Trigger": {
      main: [[{ node: "Set Context", type: "main", index: 0 }]]
    }
  }
});

export const createScheduledWorkflow = async ({ workflowName, cron, goal, agentType }) => {
  const body = buildSimpleWorkflow({ workflowName, cron, goal, agentType });
  return requestN8n("/api/v1/workflows", "POST", body);
};
