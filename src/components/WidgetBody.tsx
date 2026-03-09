import { useState } from "react";
import type { AgentItem, WidgetData } from "../types";

interface WidgetBodyProps {
  data: WidgetData;
  onMemoChange: (text: string) => void;
  onAgentRun: (params: {
    agentId: string;
    agentType: AgentItem["role"];
    prompt: string;
    scheduleCron?: string;
  }) => Promise<void>;
  runningAgentIds: string[];
}

export const WidgetBody = ({ data, onMemoChange, onAgentRun, runningAgentIds }: WidgetBodyProps) => {
  const [agentInputs, setAgentInputs] = useState<Record<string, string>>({});
  const [agentSchedules, setAgentSchedules] = useState<Record<string, string>>({});

  switch (data.type) {
    case "bookmark":
      return (
        <ul className="list">
          {data.items.map((item) => (
            <li key={item.id}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      );
    case "memo":
      return (
        <textarea
          className="memo-input"
          value={data.text}
          onChange={(event) => onMemoChange(event.target.value)}
          placeholder="메모를 입력하세요"
        />
      );
    case "rss":
      return (
        <ul className="list">
          {data.items.map((item) => (
            <li key={item.id}>
              <a href={item.link} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      );
    case "trend":
      return (
        <ol className="list trend-list">
          {data.items.map((item) => (
            <li key={item.id}>
              <span className="rank">{item.rank}</span>
              <span>{item.keyword}</span>
            </li>
          ))}
        </ol>
      );
    case "agent":
      return (
        <div className="agent-grid">
          {data.items.map((agent) => {
            const running = runningAgentIds.includes(agent.id);
            const inputValue = agentInputs[agent.id] ?? "";
            const scheduleValue = agentSchedules[agent.id] ?? "";

            return (
              <article className="agent-card" key={agent.id}>
                <div className="agent-avatar-wrap">
                  {agent.avatarUrl ? (
                    <img className="agent-avatar" src={agent.avatarUrl} alt={`${agent.name} 아바타`} />
                  ) : (
                    <div className="agent-avatar agent-avatar-fallback" aria-hidden="true">
                      🦁
                    </div>
                  )}
                </div>
                <div className="agent-meta">
                  <div className="agent-headline">
                    <strong>{agent.name}</strong>
                    <span className={`agent-status ${running ? "busy" : "ready"}`}>{running ? "실행중" : "대기"}</span>
                  </div>
                  <span className="agent-role">{agent.roleLabel}</span>
                  <p>{agent.description}</p>

                  <textarea
                    className="agent-prompt"
                    value={inputValue}
                    onChange={(event) =>
                      setAgentInputs((prev) => ({
                        ...prev,
                        [agent.id]: event.target.value
                      }))
                    }
                    placeholder="요청을 입력하세요 (예: 블로그 글 자동 작성 플랜 생성)"
                  />

                  <input
                    className="agent-schedule"
                    value={scheduleValue}
                    onChange={(event) =>
                      setAgentSchedules((prev) => ({
                        ...prev,
                        [agent.id]: event.target.value
                      }))
                    }
                    placeholder="스케줄 크론식(선택, 예: 0 9 * * *)"
                  />

                  <button
                    className="secondary"
                    disabled={running || !inputValue.trim()}
                    onClick={() => {
                      void onAgentRun({
                        agentId: agent.id,
                        agentType: agent.role,
                        prompt: inputValue.trim(),
                        scheduleCron: scheduleValue.trim() || undefined
                      });
                    }}
                  >
                    {running ? "실행중..." : "에이전트 실행"}
                  </button>

                  {agent.messages.length > 0 && (
                    <div className="agent-messages">
                      {agent.messages.slice(-4).map((message) => (
                        <div key={message.id} className={`agent-message ${message.role}`}>
                          <strong>{message.role === "user" ? "사용자" : "에이전트"}</strong>
                          <span>{message.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      );
    default:
      return null;
  }
};
