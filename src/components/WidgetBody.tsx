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
    default:
      return null;
  }
};
