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
  icon: string;
  accent: string;
}

const options: WidgetOption[] = [
  { 
    type: "bookmark", 
    label: "북마크", 
    description: "자주 가는 링크를 보드에 꽂아두기",
    icon: "🔗",
    accent: "#4d7cff"
  },
  { 
    type: "memo", 
    label: "빠른 메모", 
    description: "회의 메모, 아이디어, 체크리스트",
    icon: "📝",
    accent: "#ffd700"
  },
  { 
    type: "rss", 
    label: "AI 뉴스", 
    description: "GeekNews, TechCrunch 헤드라인",
    icon: "📰",
    accent: "#ff6b6b"
  },
  { 
    type: "trend", 
    label: "실시간 검색어", 
    description: "지금 뜨는 키워드 한눈에",
    icon: "🔥",
    accent: "#00d4ff"
  },
  { 
    type: "agent", 
    label: "AI 에이전트", 
    description: "개발/기획/PM 도우미",
    icon: "🤖",
    accent: "#a474ff"
  }
];

export const AddWidgetModal = ({ open, onClose, onAdd }: AddWidgetModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="widget-modal-large" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>위젯 추가</h2>
          <button className="icon-button" onClick={onClose} aria-label="모달 닫기">
            ✕
          </button>
        </div>
        <p className="modal-subtitle">보드에 추가할 위젯을 선택하세요</p>
        <div className="widget-showcase">
          {options.map((option) => (
            <button
              key={option.type}
              className="widget-showcase-card"
              onClick={() => {
                onAdd(option.type);
                onClose();
              }}
              style={{ 
                "--accent": option.accent
              } as React.CSSProperties}
            >
              <div className="widget-icon-large">{option.icon}</div>
              <div className="widget-info">
                <strong>{option.label}</strong>
                <span>{option.description}</span>
              </div>
              <div className="widget-arrow">→</div>
            </button>
          ))}
        </div>
        
        <div className="widget-grid-compact">
          {options.map((option) => (
            <button
              key={option.type}
              className="widget-card-compact"
              onClick={() => {
                onAdd(option.type);
                onClose();
              }}
              style={{ 
                "--accent": option.accent
              } as React.CSSProperties}
            >
              <span className="widget-icon">{option.icon}</span>
              <span className="widget-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
