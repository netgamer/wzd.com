import { useEffect } from "react";
import type { SiteLanguage } from "../../lib/site-language";
import { UPDATE_POSTS } from "./updatesContent";

type UpdatesIndexPageProps = {
  onNavigateBack?: () => void;
  language: SiteLanguage;
};

const ensureDescriptionMeta = () => {
  if (typeof document === "undefined") {
    return null;
  }

  let element = document.querySelector('meta[name="description"]');
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", "description");
    document.head.appendChild(element);
  }
  return element;
};

const formatDate = (value: string, language: SiteLanguage) =>
  new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));

const UpdatesIndexPage = ({ onNavigateBack, language }: UpdatesIndexPageProps) => {
  const copy =
    language === "ko"
      ? {
          pageTitle: "WZD 업데이트",
          description: "포지셔닝, 랜딩 변경, 제품 보조 MVP 진행 상황을 다루는 WZD 제품 업데이트 모음.",
          topbarTitle: "팀의 작은 제품 노트",
          productPage: "제품 페이지로",
          back: "뒤로",
          heroKicker: "출시 노트",
          heroTitle: "제품 이야기를 대체하지 않고, 더 또렷하게 만드는 업데이트",
          heroCopy:
            "이 페이지는 제품 맥락과 출시 기록을 남기는 작은 업데이트 허브입니다. WZD의 중심은 여전히 북마크와 RSS를 위한 개인화 첫 화면이고, 이 글들은 그 방향을 설명하기 위해 존재합니다.",
          publishedNotes: "발행 노트",
          currentTheme: "현재 테마",
          focus: "집중 포인트",
          productFirst: "제품 중심",
          bookmarksAndRss: "북마크 + RSS",
          readUpdate: "업데이트 보기"
        }
      : {
          pageTitle: "WZD Updates",
          description: "Small product updates from WZD covering positioning, landing changes, and product-supporting MVP progress.",
          topbarTitle: "Small product notes from the team",
          productPage: "Go to product page",
          back: "Back",
          heroKicker: "Shipping notes",
          heroTitle: "Updates that support the product story, not replace it",
          heroCopy:
            "This is a small in-repo updates hub for product context and shipping notes. WZD is still a personalized first page for bookmarks and RSS. These posts exist to explain the direction, not to turn WZD into a publishing product.",
          publishedNotes: "Published notes",
          currentTheme: "Current theme",
          focus: "Focus",
          productFirst: "Product-first",
          bookmarksAndRss: "Bookmarks + RSS",
          readUpdate: "Read update"
        };

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = ensureDescriptionMeta();
    const previousDescription = descriptionMeta?.getAttribute("content") ?? "";

    document.title = copy.pageTitle;
    descriptionMeta?.setAttribute("content", copy.description);

    return () => {
      document.title = previousTitle;
      descriptionMeta?.setAttribute("content", previousDescription);
    };
  }, [copy.description, copy.pageTitle]);

  return (
    <div className="updates-page">
      <div className="updates-shell">
        <header className="updates-topbar">
          <div className="updates-topbar-copy">
            <p className="updates-kicker">{copy.pageTitle}</p>
            <strong>{copy.topbarTitle}</strong>
          </div>
          <div className="updates-topbar-actions">
            <a className="updates-topbar-link" href="/landing">
              {copy.productPage}
            </a>
            {onNavigateBack ? (
              <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                {copy.back}
              </button>
            ) : null}
          </div>
        </header>

        <main className="updates-layout">
          <section className="updates-hero-card">
            <div className="updates-hero-grid">
              <div className="updates-hero-content">
                <p className="updates-kicker">{copy.heroKicker}</p>
                <h1>{copy.heroTitle}</h1>
                <p className="updates-hero-copy">{copy.heroCopy}</p>
              </div>
              <div className="updates-hero-stats" aria-label="Updates summary">
                <div className="updates-stat-card">
                  <span>{copy.publishedNotes}</span>
                  <strong>{UPDATE_POSTS.length}</strong>
                </div>
                <div className="updates-stat-card">
                  <span>{copy.currentTheme}</span>
                  <strong>{copy.productFirst}</strong>
                </div>
                <div className="updates-stat-card">
                  <span>{copy.focus}</span>
                  <strong>{copy.bookmarksAndRss}</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="updates-index-grid" aria-label="WZD update posts">
            {UPDATE_POSTS.map((post) => (
              <article key={post.slug} className="updates-post-card">
                <div className="updates-post-meta">
                  <span>{post.category}</span>
                  <span>{formatDate(post.publishedAt, language)}</span>
                </div>
                <h2>
                  <a href={`/updates/${post.slug}`}>{post.title}</a>
                </h2>
                <p>{post.summary}</p>
                <div className="updates-post-footer">
                  <span>{post.readingTime}</span>
                  <a href={`/updates/${post.slug}`}>{copy.readUpdate}</a>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </div>
  );
};

export default UpdatesIndexPage;
