type AgentRole = "developer" | "planner" | "pm";

interface RunAgentChatInput {
  agentType: AgentRole;
  prompt: string;
  context?: string;
}

const configuredApiBase = (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "";

const getAgentApiBase = () => {
  if (configuredApiBase) {
    return configuredApiBase;
  }

  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return "http://localhost:8787";
    }
  }

  return "";
};

export const runAgentChat = async ({ agentType, prompt, context }: RunAgentChatInput): Promise<string> => {
  const apiBase = getAgentApiBase();
  if (!apiBase) {
    throw new Error("AI 서버 주소가 설정되지 않았습니다. VITE_AGENT_API_BASE_URL을 배포 환경에 추가하세요.");
  }

  const response = await fetch(`${apiBase}/api/agent/chat`, {
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
