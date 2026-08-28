export {};

const MOBILE_BREAKPOINT = 980;
const MOBILE_BOARD_TAB_SELECTOR = ".mobile-board-sheet-tab";
const RELOAD_DELAY_MS = 180;

const initMobileBoardSwitchFix = () => {
  let pendingReload: number | null = null;

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

    const previousHash = window.location.hash;
    if (pendingReload !== null) {
      window.clearTimeout(pendingReload);
    }

    // React updates selectedBoardId first; its existing effect then persists
    // the selected board and writes #b/<boardId>. Reload only after that effect
    // has had a chance to run. This also makes mobile selection work when the
    // local snapshot has stale "loaded" markers for board notes.
    pendingReload = window.setTimeout(() => {
      pendingReload = null;
      const nextHash = window.location.hash;
      if (nextHash !== previousHash && /^#b\/[A-Za-z0-9-]+$/.test(nextHash)) {
        window.location.reload();
      }
    }, RELOAD_DELAY_MS);
  };

  document.addEventListener("click", handleClick, true);
  window.addEventListener("beforeunload", () => {
    document.removeEventListener("click", handleClick, true);
    if (pendingReload !== null) {
      window.clearTimeout(pendingReload);
      pendingReload = null;
    }
  }, { once: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileBoardSwitchFix, { once: true });
} else {
  initMobileBoardSwitchFix();
}
