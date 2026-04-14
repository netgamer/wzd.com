import { useEffect } from "react";
import type { SiteLanguage } from "../../lib/site-language";
import { getUpdatePostBySlug } from "./updatesContent";

type UpdateDetailPageProps = {
  slug: string;
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

const UpdateDetailPage = ({ slug, onNavigateBack, language }: UpdateDetailPageProps) => {
  const post = getUpdatePostBySlug(slug);
  const copy =
    language === "ko"
      ? {
          updatesTitle: "WZD 업데이트",
          missingTopbar: "업데이트를 찾을 수 없습니다",
          allUpdates: "전체 업데이트",
          back: "뒤로",
          missingKicker: "없는 글",
          missingHeading: "이 업데이트를 찾지 못했습니다.",
          missingBody: "현재 저장소에 이 슬러그와 일치하는 정적 업데이트가 없습니다.",
          returnToIndex: "업데이트 목록으로 돌아가기",
          fallbackDescription: "요청한 WZD 업데이트를 찾을 수 없습니다."
        }
      : {
          updatesTitle: "WZD Updates",
          missingTopbar: "Update not found",
          allUpdates: "All updates",
          back: "Back",
          missingKicker: "Missing post",
          missingHeading: "We could not find that update.",
          missingBody: "The slug does not match any static WZD update in this repo yet.",
          returnToIndex: "Return to the updates index",
          fallbackDescription: "The requested WZD update could not be found."
        };

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = ensureDescriptionMeta();
    const previousDescription = descriptionMeta?.getAttribute("content") ?? "";

    document.title = post ? `${post.title} | ${copy.updatesTitle}` : `${copy.missingTopbar} | ${copy.updatesTitle}`;
    descriptionMeta?.setAttribute("content", post?.seoDescription ?? copy.fallbackDescription);

    return () => {
      document.title = previousTitle;
      descriptionMeta?.setAttribute("content", previousDescription);
    };
  }, [copy.fallbackDescription, copy.missingTopbar, copy.updatesTitle, post]);

  if (!post) {
    return (
      <div className="updates-page">
        <div className="updates-shell">
          <header className="updates-topbar">
            <div className="updates-topbar-copy">
              <p className="updates-kicker">{copy.updatesTitle}</p>
              <strong>{copy.missingTopbar}</strong>
            </div>
            <div className="updates-topbar-actions">
              <a className="updates-topbar-link" href="/updates">
                {copy.allUpdates}
              </a>
              {onNavigateBack ? (
                <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                  {copy.back}
                </button>
              ) : null}
            </div>
          </header>

          <main className="updates-layout">
            <section className="updates-empty-card">
              <p className="updates-kicker">{copy.missingKicker}</p>
              <h1>{copy.missingHeading}</h1>
              <p>{copy.missingBody}</p>
              <a className="updates-inline-link" href="/updates">
                {copy.returnToIndex}
              </a>
            </section>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="updates-page">
      <div className="updates-shell">
        <header className="updates-topbar">
          <div className="updates-topbar-copy">
            <p className="updates-kicker">{copy.updatesTitle}</p>
            <strong>{post.title}</strong>
          </div>
          <div className="updates-topbar-actions">
            <a className="updates-topbar-link" href="/updates">
              {copy.allUpdates}
            </a>
            {onNavigateBack ? (
              <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                {copy.back}
              </button>
            ) : null}
          </div>
        </header>

        <main className="updates-layout">
          <article className="updates-article">
            <div className="updates-article-hero">
              <p className="updates-kicker">{post.heroLabel}</p>
              <h1>{post.title}</h1>
              <p className="updates-article-summary">{post.summary}</p>
              <div className="updates-article-meta">
                <span>{post.category}</span>
                <span>{formatDate(post.publishedAt, language)}</span>
                <span>{post.readingTime}</span>
              </div>
            </div>

            <div className="updates-section-list">
              {post.sections.map((section) => (
                <section key={section.title} className="updates-article-section">
                  <div className="updates-section-heading">
                    <span className="updates-section-marker" aria-hidden="true" />
                    <h2>{section.title}</h2>
                  </div>
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul>
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                  ) : null}
                </section>
              ))}
            </div>
          </article>
        </main>
      </div>
    </div>
  );
};

export default UpdateDetailPage;
