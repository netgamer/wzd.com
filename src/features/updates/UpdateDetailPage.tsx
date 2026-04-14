import { useEffect } from "react";
import { getUpdatePostBySlug } from "./updatesContent";

type UpdateDetailPageProps = {
  slug: string;
  onNavigateBack?: () => void;
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

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));

const UpdateDetailPage = ({ slug, onNavigateBack }: UpdateDetailPageProps) => {
  const post = getUpdatePostBySlug(slug);

  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = ensureDescriptionMeta();
    const previousDescription = descriptionMeta?.getAttribute("content") ?? "";

    document.title = post ? `${post.title} | WZD Updates` : "Update not found | WZD Updates";
    descriptionMeta?.setAttribute(
      "content",
      post?.seoDescription ?? "The requested WZD update could not be found."
    );

    return () => {
      document.title = previousTitle;
      descriptionMeta?.setAttribute("content", previousDescription);
    };
  }, [post]);

  if (!post) {
    return (
      <div className="updates-page">
        <div className="updates-shell">
          <header className="updates-topbar">
            <div>
              <p className="updates-kicker">WZD Updates</p>
              <strong>Update not found</strong>
            </div>
            <div className="updates-topbar-actions">
              <a className="updates-topbar-link" href="/updates">
                All updates
              </a>
              {onNavigateBack ? (
                <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                  Back
                </button>
              ) : null}
            </div>
          </header>

          <main className="updates-layout">
            <section className="updates-empty-card">
              <p className="updates-kicker">Missing post</p>
              <h1>We could not find that update.</h1>
              <p>The slug does not match any static WZD update in this repo yet.</p>
              <a className="updates-inline-link" href="/updates">
                Return to the updates index
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
          <div>
            <p className="updates-kicker">WZD Updates</p>
            <strong>{post.title}</strong>
          </div>
          <div className="updates-topbar-actions">
            <a className="updates-topbar-link" href="/updates">
              All updates
            </a>
            {onNavigateBack ? (
              <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                Back
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
                <span>{formatDate(post.publishedAt)}</span>
                <span>{post.readingTime}</span>
              </div>
            </div>

            <div className="updates-section-list">
              {post.sections.map((section) => (
                <section key={section.title} className="updates-article-section">
                  <h2>{section.title}</h2>
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
