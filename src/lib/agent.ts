type AgentRole = "developer" | "planner" | "pm";

interface RunAgentChatInput {
  agentType: AgentRole;
  prompt: string;
  context?: string;
}

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

export const runAgentChat = async ({ agentType, prompt, context }: RunAgentChatInput): Promise<string> => {
  const response = await fetch(`${API_BASE}/api/agent/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      agentType,
      prompt,
      context
    })
  });

  const payload = (await response.json().catch(() => null)) as { ok?: boolean; answer?: string; error?: string } | null;

  if (!response.ok || !payload?.ok || !payload.answer) {
    throw new Error(payload?.error || `agent request failed: ${response.status}`);
  }

  return payload.answer;
};
