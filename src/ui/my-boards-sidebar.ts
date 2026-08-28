const BOARD_TAB_SELECTOR = ".workspace-board-tabs .workspace-board-tab:not(.workspace-board-tab-settings)";
const SIDEBAR_SELECTOR = ".board-page .pin-sidebar";
const TABS_SELECTOR = ".workspace-board-tabs";
const CONTAINER_ID = "wzd-my-boards-sidebar";

const normalizeLabel = (text: string) => text.replace(/\s+/g, " ").trim();

const syncSidebar = () => {
  const sidebar = document.querySelector<HTMLElement>(SIDEBAR_SELECTOR);
  const tabs = document.querySelector<HTMLElement>(TABS_SELECTOR);

  if (!sidebar || !tabs) {
    document.getElementById(CONTAINER_ID)?.remove();
    return;
  }

  const sourceButtons = Array.from(tabs.querySelectorAll<HTMLElement>(BOARD_TAB_SELECTOR));
  if (sourceButtons.length === 0) {
    document.getElementById(CONTAINER_ID)?.remove();
    return;
  }

  let container = document.getElementById(CONTAINER_ID);
  if (!container) {
    container = document.createElement("section");
    container.id = CONTAINER_ID;
    container.setAttribute("aria-label", "내 보드");
    container.className = "my-boards-sidebar";

    const primaryStack = sidebar.querySelector<HTMLElement>(".sidebar-primary-stack");
    if (primaryStack?.nextSibling) {
      sidebar.insertBefore(container, primaryStack.nextSibling);
    } else {
      sidebar.appendChild(container);
    }
  }

  const list = document.createElement("div");
  list.className = "my-boards-sidebar-list";
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "내 보드 목록");

  sourceButtons.forEach((sourceButton, index) => {
    const label = normalizeLabel(sourceButton.textContent ?? "") || `보드 ${index + 1}`;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "my-board-sidebar-item";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.classList.toggle("is-active", sourceButton.classList.contains("active"));
    button.innerHTML = '<span class="my-board-sidebar-dot" aria-hidden="true"></span><span class="my-board-sidebar-label"></span>';
    const labelNode = button.querySelector<HTMLElement>(".my-board-sidebar-label");
    if (labelNode) labelNode.textContent = label;
    button.addEventListener("click", () => sourceButton.click());
    list.appendChild(button);
  });

  const head = document.createElement("div");
  head.className = "my-boards-sidebar-head";
  head.innerHTML = '<span>내 보드</span><span class="my-boards-sidebar-count"></span>';

  container.replaceChildren(head, list);

  const count = container.querySelector<HTMLElement>(".my-boards-sidebar-count");
  if (count) count.textContent = `${sourceButtons.length}`;
};

const init = () => {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      syncSidebar();
    });
  };

  syncSidebar();

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });

  window.addEventListener("beforeunload", () => observer.disconnect(), { once: true });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
