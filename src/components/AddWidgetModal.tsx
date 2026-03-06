import type { WidgetType } from "../types";

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
}

const options: Array<{ type: WidgetType; label: string; description: string }> = [
  { type: "bookmark", label: "Bookmark", description: "Quick links and folders" },
  { type: "memo", label: "Memo", description: "Fast text notes" },
  { type: "rss", label: "RSS", description: "Feed headlines" },
  { type: "trend", label: "Realtime Search", description: "Trending keywords" }
];

export const AddWidgetModal = ({ open, onClose, onAdd }: AddWidgetModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Content Widget</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close modal">
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
