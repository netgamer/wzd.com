export {};

const MOBILE_BREAKPOINT = 980;
const MOBILE_BOARD_TAB_SELECTOR = ".mobile-board-sheet-tab";
const BOARD_SOURCE_SELECTOR = ".workspace-board-tabs .workspace-board-tab:not(.workspace-board-tab-settings)";
const RELOAD_DELAY_MS = 120;

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

const getBoardId = (element: HTMLElement) => {
  const candidates = [
    element.dataset.boardId,
    element.getAttribute("data-board-id"),
    element.getAttribute("data-id"),
    element.getAttribute("aria-controls")
  ];
  for (const candidate of candidates) {
    if (candidate && candidate.trim()) return candidate.trim();
  }

  const href = element.getAttribute("href");
  if (href) {
    const match = href.match(/#b\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }

  return null;
};

const findSourceButton = (target: HTMLElement) => {
  const sources = Array.from(document.querySelectorAll<HTMLElement>(BOARD_SOURCE_SELECTOR));
  if (!sources.length) return null;

  const directId = getBoardId(target);
  if (directId) {
    const byId = sources.find((source) => getBoardId(source) === directId);
    if (byId) return byId;
  }

  const targetLabel = normalize(target.textContent ?? "");
  if (!targetLabel) return null;
  return sources.find((source) => normalize(source.textContent ?? "") === targetLabel) ?? null;
};

const initMobileBoardSwitchFix = () => {
  let pendingNavigation: number | null = null;

  const handleClick = (event: MouseEvent) => {
    if (window.innerWidth > MOBILE_BREAKPOINT) return;

    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>(MOBILE_BOARD_TAB_SELECTOR)
      : null;
    if (!target) return;

    const source = findSourceButton(target);
    if (!source) return;

    // Use the application's real board button instead of trying to reconstruct
    // React state from DOM internals. This keeps selectedBoardId, board data,
    // and the route in the same state transition.
    if (source !== target) {
      event.preventDefault();
      event.stopImmediatePropagation();
      source.click();
    }

    if (pendingNavigation !== null) window.clearTimeout(pendingNavigation);
    pendingNavigation = window.setTimeout(() => {
      pendingNavigation = null;
      const id = getBoardId(source);
      if (!id) return;
      const nextHash = `#b/${encodeURIComponent(id)}`;
      if (window.location.hash !== nextHash) window.location.hash = nextHash;
    }, RELOAD_DELAY_MS);
  };

  document.addEventListener("click", handleClick, true);
  window.addEventListener("beforeunload", () => {
    document.removeEventListener("click", handleClick, true);
    if (pendingNavigation !== null) window.clearTimeout(pendingNavigation);
  }, { once: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileBoardSwitchFix, { once: true });
} else {
  initMobileBoardSwitchFix();
}
