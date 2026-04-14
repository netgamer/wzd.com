import { useEffect } from "react";
import { UPDATE_POSTS } from "./updatesContent";

type UpdatesIndexPageProps = {
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

const UpdatesIndexPage = ({ onNavigateBack }: UpdatesIndexPageProps) => {
  useEffect(() => {
    const previousTitle = document.title;
    const descriptionMeta = ensureDescriptionMeta();
    const previousDescription = descriptionMeta?.getAttribute("content") ?? "";

    document.title = "WZD Updates";
    descriptionMeta?.setAttribute(
      "content",
      "Small product updates from WZD covering positioning, landing changes, and product-supporting MVP progress."
    );

    return () => {
      document.title = previousTitle;
      descriptionMeta?.setAttribute("content", previousDescription);
    };
  }, []);

  return (
    <div className="updates-page">
      <div className="updates-shell">
        <header className="updates-topbar">
          <div>
            <p className="updates-kicker">WZD Updates</p>
            <strong>Small product notes from the team</strong>
          </div>
          <div className="updates-topbar-actions">
            <a className="updates-topbar-link" href="/landing">
              Go to product page
            </a>
            {onNavigateBack ? (
              <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                Back
              </button>
            ) : null}
          </div>
        </header>

        <main className="updates-layout">
          <section className="updates-hero-card">
            <p className="updates-kicker">Shipping notes</p>
            <h1>Updates that support the product story, not replace it</h1>
            <p className="updates-hero-copy">
              This is a small in-repo updates hub for product context and shipping notes. WZD is still a personalized first
              page for bookmarks and RSS. These posts exist to explain the direction, not to turn WZD into a publishing
              product.
            </p>
          </section>

          <section className="updates-index-grid" aria-label="WZD update posts">
            {UPDATE_POSTS.map((post) => (
              <article key={post.slug} className="updates-post-card">
                <div className="updates-post-meta">
                  <span>{post.category}</span>
                  <span>{formatDate(post.publishedAt)}</span>
                </div>
                <h2>
                  <a href={`/updates/${post.slug}`}>{post.title}</a>
                </h2>
                <p>{post.summary}</p>
                <div className="updates-post-footer">
                  <span>{post.readingTime}</span>
                  <a href={`/updates/${post.slug}`}>Read update</a>
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
