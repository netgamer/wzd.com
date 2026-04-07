import type { WidgetType } from "../types";

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
}

interface WidgetOption {
  type: WidgetType;
  label: string;
  description: string;
  preview: string;
  accent: string;
  bgColor: string;
}

const options: WidgetOption[] = [
  { 
    type: "bookmark", 
    label: "북마크", 
    description: "자주 가는 링크를 보드에 꽂아두기",
    preview: "🔗 OpenAI Docs\n🔗 GitHub\n🔗 Notion",
    accent: "#4d7cff",
    bgColor: "linear-gradient(135deg, rgba(77, 124, 255, 0.15), rgba(68, 213, 255, 0.1))"
  },
  { 
    type: "memo", 
    label: "빠른 메모", 
    description: "회의 메모, 아이디어, 체크리스트",
    preview: "📝 회의록\n오늘 체크리스트\n☐ 안건 1\n☑ 안건 2",
    accent: "#ffd700",
    bgColor: "linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 193, 7, 0.1))"
  },
  { 
    type: "rss", 
    label: "AI 뉴스", 
    description: "GeekNews, TechCrunch 헤드라인",
    preview: "📰 GeekNews\nAI 에이전트\n6분 전\n\n📰 TechCrunch\n스타트업 도구\n12분 전",
    accent: "#ff6b6b",
    bgColor: "linear-gradient(135deg, rgba(255, 107, 107, 0.15), rgba(255, 138, 101, 0.1))"
  },
  { 
    type: "trend", 
    label: "실시간 검색어", 
    description: "지금 뜨는 키워드 한눈에",
    preview: "🔥 실시간\n1. AI 에이전트\n2. 로봇택시\n3. 온디바이스",
    accent: "#00d4ff",
    bgColor: "linear-gradient(135deg, rgba(0, 212, 255, 0.15), rgba(0, 191, 255, 0.1))"
  },
  { 
    type: "agent", 
    label: "AI 에이전트", 
    description: "개발/기획/PM 도우미",
    preview: "🤖 AI 도우미\n\nRole: expert\nTask: 분석",
    accent: "#a474ff",
    bgColor: "linear-gradient(135deg, rgba(164, 116, 255, 0.15), rgba(156, 39, 176, 0.1))"
  }
];

export const AddWidgetModal = ({ open, onClose, onAdd }: AddWidgetModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="widget-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>위젯 추가</h2>
          <button className="icon-button" onClick={onClose} aria-label="모달 닫기">
            ✕
          </button>
        </div>
        <div className="widget-grid">
          {options.map((option) => (
            <button
              key={option.type}
              className="widget-card"
              onClick={() => {
                onAdd(option.type);
                onClose();
              }}
              style={{ 
                "--accent": option.accent,
                "--bg-gradient": option.bgColor
              } as React.CSSProperties}
            >
              <div className="widget-preview">
                <pre>{option.preview}</pre>
              </div>
              <div className="widget-info">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
