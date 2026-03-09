import type { WidgetData } from "../types";

interface WidgetBodyProps {
  data: WidgetData;
  onMemoChange: (text: string) => void;
}

export const WidgetBody = ({ data, onMemoChange }: WidgetBodyProps) => {
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
          {data.items.map((agent) => (
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
                  <span className={`agent-status ${agent.status === "ready" ? "ready" : "busy"}`}>
                    {agent.status === "ready" ? "대기" : "진행중"}
                  </span>
                </div>
                <span className="agent-role">{agent.roleLabel}</span>
                <p>{agent.description}</p>
              </div>
            </article>
          ))}
        </div>
      );
    default:
      return null;
  }
};
