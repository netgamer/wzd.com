import { supabase } from "../lib/supabase";
import { loadBoardShellsV2 } from "../lib/supabase-board-v2";

export {};

const MOBILE_BREAKPOINT = 980;
const MOBILE_BOARD_TAB_SELECTOR = ".mobile-board-sheet-tab";
const NAVIGATION_DELAY_MS = 80;

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

const initMobileBoardSwitchFix = () => {
  let navigating = false;

  const handleClick = (event: MouseEvent) => {
    if (navigating || window.innerWidth > MOBILE_BREAKPOINT) return;

    const target = event.target instanceof Element
      ? event.target.closest<HTMLElement>(MOBILE_BOARD_TAB_SELECTOR)
      : null;
    if (!target) return;

    const title = normalize(target.querySelector<HTMLElement>(".mobile-board-sheet-tab-title")?.textContent ?? target.textContent ?? "");
    if (!title || !supabase) return;

    navigating = true;
    event.preventDefault();
    event.stopImmediatePropagation();

    void supabase.auth.getUser()
      .then(async ({ data }) => {
        const userId = data.user?.id;
        if (!userId) throw new Error("not authenticated");

        const boards = await loadBoardShellsV2(userId);
        const targetBoard = boards.find((board) => normalize(board.title) === title);
        if (!targetBoard) throw new Error("board not found");

        window.history.replaceState({}, "", `/#b/${encodeURIComponent(targetBoard.id)}`);
        window.setTimeout(() => window.location.reload(), NAVIGATION_DELAY_MS);
      })
      .catch((error) => {
        console.error("Failed to switch mobile board", error);
        navigating = false;
      });
  };

  document.addEventListener("click", handleClick, true);
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initMobileBoardSwitchFix, { once: true });
} else {
  initMobileBoardSwitchFix();
}
