import type { WidgetType } from "../types";

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
}

const options: Array<{ type: WidgetType; label: string; description: string }> = [
  { type: "bookmark", label: "북마크", description: "자주 가는 링크와 폴더" },
  { type: "memo", label: "메모", description: "빠른 텍스트 메모" },
  { type: "rss", label: "RSS", description: "피드 헤드라인" },
  { type: "trend", label: "실시간 검색어", description: "인기 검색 키워드" }
];

export const AddWidgetModal = ({ open, onClose, onAdd }: AddWidgetModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>위젯 추가</h2>
          <button className="icon-button" onClick={onClose} aria-label="모달 닫기">
            x
          </button>
        </div>
        <div className="modal-grid">
          {options.map((option) => (
            <button
              key={option.type}
              className="widget-option"
              onClick={() => {
                onAdd(option.type);
                onClose();
              }}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
