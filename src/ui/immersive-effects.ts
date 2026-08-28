export {};

const CARD_SELECTOR = [
  ".pin-card",
  ".starter-template-card",
  ".template-card-wrap .template-card",
  ".youtube-curation-card",
  ".document-widget.feature",
  ".document-widget.section"
].join(", ");

const HEADING_SELECTOR = [
  ".feed-empty-copy strong",
  ".template-section-head strong",
  ".template-subsection-head strong"
].join(", ");

const enableSpotlight = () => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  let activeCard: HTMLElement | null = null;

  document.addEventListener(
    "pointermove",
    (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(CARD_SELECTOR) : null;
      if (!target) {
        activeCard = null;
        return;
      }

      const rect = target.getBoundingClientRect();
      target.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      target.style.setProperty("--my", `${event.clientY - rect.top}px`);
      activeCard = target;
    },
    { passive: true }
  );

  document.addEventListener("pointerleave", () => {
    if (activeCard) {
      activeCard.style.removeProperty("--mx");
      activeCard.style.removeProperty("--my");
      activeCard = null;
    }
  });
};

const enableKineticHeadings = () => {
  const headings = new WeakSet<Element>();
  const decorate = () => {
    document.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((heading) => {
      if (headings.has(heading)) return;
      headings.add(heading);
      heading.classList.add("kinetic-heading");
    });
  };

  decorate();

  const observer = new MutationObserver(decorate);
  observer.observe(document.body, { childList: true, subtree: true });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((heading) => revealObserver.observe(heading));

  const observeNew = () => {
    document.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach((heading) => {
      if (!heading.classList.contains("is-visible")) revealObserver.observe(heading);
    });
  };

  const observationTimer = window.setInterval(observeNew, 1000);
  window.addEventListener("beforeunload", () => {
    observer.disconnect();
    revealObserver.disconnect();
    window.clearInterval(observationTimer);
  }, { once: true });
};

const init = () => {
  enableSpotlight();
  enableKineticHeadings();
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
