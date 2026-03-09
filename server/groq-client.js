import { config } from "./config.js";

const SYSTEM_PROMPTS = {
  developer:
    "당신은 개발자 에이전트다. 목표를 달성하기 위한 구현계획, 코드작업 단계, 검증 체크리스트를 한국어로 간결하게 제시하라.",
  planner:
    "당신은 기획자 에이전트다. 목표를 기능 요구사항, 사용자 시나리오, 산출물 구조로 나눠 한국어로 제시하라.",
  pm: "당신은 PM 에이전트다. 목표 달성을 위한 일정, 리스크, 우선순위, 완료 기준을 한국어로 제시하라."
};

export const runGroqAgentChat = async ({ agentType, prompt, context }) => {
  const system = SYSTEM_PROMPTS[agentType] ?? SYSTEM_PROMPTS.pm;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.groqApiKey}`
    },
    body: JSON.stringify({
      model: config.groqModel,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `목표: ${prompt}\n\n추가 컨텍스트:\n${context ?? "없음"}\n\n출력 형식:\n1) 실행 계획\n2) 즉시 실행 항목\n3) 검증 방법\n4) 주의사항`
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API failed: ${response.status} ${text}`);
  }

  const payload = await response.json();
  const message = payload?.choices?.[0]?.message?.content;
  if (!message) {
    throw new Error("Groq API returned empty content");
  }

  return message;
};
