export {};

const MOBILE_BREAKPOINT = 980;
const MOBILE_BOARD_TAB_SELECTOR = ".mobile-board-sheet-tab";
const RELOAD_DELAY_MS = 120;

type ReactFiberNode = {
  key?: string | null;
  return?: ReactFiberNode | null;
};

const getBoardIdFromReactKey = (element: HTMLElement) => {
  const fiberKey = Object.keys(element).find((key) => key.startsWith("__reactFiber$"));
  if (!fiberKey) {
    return null;
  }

  let fiber = (element as unknown as Record<string, unknown>)[fiberKey] as ReactFiberNode | undefined;
  for (let depth = 0; fiber && depth < 6; depth += 1) {
    if (typeof fiber.key === "string" && fiber.key.startsWith("mobile-sheet-tab-")) {
      return fiber.key.slice("mobile-sheet-tab-".length);
    }
    fiber = fiber.return ?? null;
  }

  return null;
};

const initMobileBoardSwitchFix = () => {
  let pendingNavigation: number | null = null;

  const handleClick = (event: MouseEvent) => {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      return;
    }

    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>(MOBILE_BOARD_TAB_SELECTOR)
      : null;

    if (!target) {
      return;
    }

    const boardId = getBoardIdFromReactKey(target);
    if (!boardId) {
      return;
    }

    if (pendingNavigation !== null) {
      window.clearTimeout(pendingNavigation);
    }

    // The React click handler updates selectedBoardId, but the mobile route can
    // remain on the previous board. Make the selected board hash explicit so
    // the existing App route/loading pipeline receives the new board id.
    pendingNavigation = window.setTimeout(() => {
      pendingNavigation = null;
      const nextHash = `#b/${boardId}`;
      if (window.location.hash !== nextHash) {
        window.location.hash = nextHash;
      }
    }, RELOAD_DELAY_MS);
  };

  document.addEventListener("click", handleClick, true);
  window.addEventListener("beforeunload", () => {
    document.removeEventListener("click", handleClick, true);
    if (pendingNavigation !== null) {
      window.clearTimeout(pendingNavigation);
      pendingNavigation = null;
    }
  }, { once: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileBoardSwitchFix, { once: true });
} else {
  initMobileBoardSwitchFix();
}
