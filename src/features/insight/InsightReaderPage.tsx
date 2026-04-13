import { useEffect, useMemo, useState } from "react";
import {
  fetchHomePayload,
  type HomePayload,
  type HomePayloadAction,
  type HomePayloadFeedItem,
  type HomePayloadRediscoveryItem,
  type HomePayloadTrend
} from "../../lib/supabase-home-payload";
import { hasSupabaseConfig } from "../../lib/supabase";

type InsightReaderPageProps = {
  onNavigateBack?: () => void;
  userId?: string | null;
};

const formatDate = (value?: string) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
};

const formatScore = (value?: number) => (typeof value === "number" ? value.toFixed(1) : "-");

const renderFeedItem = (item: HomePayloadFeedItem) => {
  const Wrapper = item.url ? "a" : "article";

  return (
    <Wrapper
      key={item.id}
      className={`insight-feed-item ${item.url ? "is-link" : ""}`.trim()}
      href={item.url}
      target={item.url ? "_blank" : undefined}
      rel={item.url ? "noreferrer" : undefined}
    >
      <div className="insight-feed-item-head">
        <p className="insight-feed-item-time">{formatDate(item.publishedAt) ?? "Recent item"}</p>
        <div className="insight-score-pills">
          <span>Imp {formatScore(item.importance)}</span>
          <span>Rev {formatScore(item.relevance)}</span>
        </div>
      </div>
      <strong>{item.title}</strong>
      {item.summary ? <p>{item.summary}</p> : null}
    </Wrapper>
  );
};

const renderTrend = (trend: HomePayloadTrend) => (
  <article key={trend.id} className="insight-trend-card">
    <div className="insight-trend-head">
      <strong>{trend.name}</strong>
      <span>{formatScore(trend.trendScore)}</span>
    </div>
    {trend.description ? <p>{trend.description}</p> : null}
    <small>{trend.itemCount ? `${trend.itemCount} items` : "Cluster signal"}</small>
  </article>
);

const renderRediscoveryItem = (item: HomePayloadRediscoveryItem) => {
  const Wrapper = item.url ? "a" : "article";

  return (
    <Wrapper
      key={item.bookmarkId}
      className={`insight-utility-item ${item.url ? "is-link" : ""}`.trim()}
      href={item.url}
      target={item.url ? "_blank" : undefined}
      rel={item.url ? "noreferrer" : undefined}
    >
      <div className="insight-utility-copy">
        <strong>{item.title}</strong>
        {item.summary ? <p>{item.summary}</p> : null}
        {item.note ? <blockquote>{item.note}</blockquote> : null}
      </div>
      <div className="insight-utility-meta">
        <span>{formatDate(item.savedAt) ?? "Saved earlier"}</span>
        <span>Value {formatScore(item.monetization)}</span>
      </div>
    </Wrapper>
  );
};

const renderAction = (action: HomePayloadAction) => (
  <article key={action.id} className="insight-utility-item">
    <div className="insight-utility-copy">
      <strong>{action.title}</strong>
      {action.description ? <p>{action.description}</p> : null}
    </div>
    <div className="insight-action-meta">
      {action.actionType ? <span>{action.actionType}</span> : null}
      {action.difficulty ? <span>{action.difficulty}</span> : null}
      {action.expectedValue ? <span>{action.expectedValue}</span> : null}
    </div>
  </article>
);

const InsightReaderPage = ({ onNavigateBack, userId }: InsightReaderPageProps) => {
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hasSupabaseConfig) {
        setError("Supabase environment variables are missing.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const nextPayload = await fetchHomePayload(userId ?? undefined);
        if (!cancelled) {
          setPayload(nextPayload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setPayload(null);
          setError(loadError instanceof Error ? loadError.message : "Failed to load get_home_payload.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const heroMetrics = useMemo(
    () => [
      { label: "Trend clusters", value: payload?.trends.length ?? 0 },
      { label: "Feed items", value: payload?.feed.length ?? 0 },
      { label: "Next actions", value: payload?.actions.length ?? 0 }
    ],
    [payload]
  );

  return (
    <div className="insight-page">
      <div className="insight-page-shell">
        <header className="insight-topbar">
          <div>
            <p className="insight-kicker">WZD Insight</p>
            <strong>First real Insight MVP surface</strong>
          </div>
          {onNavigateBack ? (
            <button className="insight-back-button" onClick={onNavigateBack}>
              Go back
            </button>
          ) : null}
        </header>

        <main className="insight-layout">
          <section className="insight-hero-panel">
            <div className="insight-hero-copy">
              <p className="insight-kicker">Hero</p>
              <h1>{payload?.hero?.title ?? "Your home payload, rendered as a first-page insight."}</h1>
              <p className="insight-summary">
                {payload?.hero?.summary ?? "This route reads the current `get_home_payload` RPC and turns it into a minimal public-facing insight page."}
              </p>
              <div className="insight-meta-row">
                <span>Route `/insight`</span>
                <span>Source `get_home_payload`</span>
                <span>{formatDate(payload?.hero?.publishedAt) ?? "No hero timestamp"}</span>
              </div>
            </div>

            <aside className="insight-hero-aside">
              <div className={`insight-status-card ${loading ? "is-loading" : error ? "is-error" : "is-ready"}`}>
                <p className="insight-kicker">Status</p>
                <strong>{loading ? "Loading payload" : error ? "Payload unavailable" : "Payload ready"}</strong>
                <p>{loading ? "Reading from Supabase RPC." : error ?? "Mapped hero, trends, feed, rediscovery, and actions."}</p>
              </div>

              <div className="insight-score-grid">
                <div className="insight-score-card">
                  <span>Total score</span>
                  <strong>{formatScore(payload?.hero?.scores.total)}</strong>
                </div>
                <div className="insight-score-card">
                  <span>Importance</span>
                  <strong>{formatScore(payload?.hero?.scores.importance)}</strong>
                </div>
                <div className="insight-score-card">
                  <span>Monetization</span>
                  <strong>{formatScore(payload?.hero?.scores.monetization)}</strong>
                </div>
                <div className="insight-score-card">
                  <span>Relevance</span>
                  <strong>{formatScore(payload?.hero?.scores.relevance)}</strong>
                </div>
              </div>

              <div className="insight-hero-metrics">
                {heroMetrics.map((metric) => (
                  <div key={metric.label}>
                    <span>{metric.label}</span>
                    <strong>{metric.value}</strong>
                  </div>
                ))}
              </div>

              {payload?.hero?.url ? (
                <a className="insight-primary-link" href={payload.hero.url} target="_blank" rel="noreferrer">
                  Open hero source
                </a>
              ) : null}
            </aside>
          </section>

          {error ? (
            <section className="insight-message-card is-error">
              <p className="insight-kicker">Error</p>
              <h2>Could not render the insight page.</h2>
              <p>{error}</p>
            </section>
          ) : null}

          {loading ? (
            <section className="insight-grid">
              {Array.from({ length: 4 }, (_, index) => (
                <article key={`insight-loading-${index}`} className="insight-section-panel is-skeleton">
                  <span className="insight-skeleton-line short" />
                  <span className="insight-skeleton-line title" />
                  <span className="insight-skeleton-line" />
                  <span className="insight-skeleton-line" />
                </article>
              ))}
            </section>
          ) : null}

          {!loading && !error ? (
            <div className="insight-grid">
              <section className="insight-section-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">Trends</p>
                    <h2>What is clustering now</h2>
                  </div>
                  <span>{payload?.trends.length ?? 0}</span>
                </div>
                {payload?.trends.length ? (
                  <div className="insight-trend-list">{payload.trends.map(renderTrend)}</div>
                ) : (
                  <p className="insight-empty-state">No trend clusters were returned.</p>
                )}
              </section>

              <section className="insight-section-panel insight-feed-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">Feed</p>
                    <h2>Recent items worth scanning</h2>
                  </div>
                  <span>{payload?.feed.length ?? 0}</span>
                </div>
                {payload?.feed.length ? (
                  <div className="insight-feed-list">{payload.feed.slice(0, 8).map(renderFeedItem)}</div>
                ) : (
                  <p className="insight-empty-state">No feed items were returned.</p>
                )}
              </section>

              <section className="insight-section-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">Rediscovery</p>
                    <h2>Bookmarks to revisit</h2>
                  </div>
                  <span>{payload?.rediscovery.length ?? 0}</span>
                </div>
                {payload?.rediscovery.length ? (
                  <div className="insight-utility-list">{payload.rediscovery.map(renderRediscoveryItem)}</div>
                ) : (
                  <p className="insight-empty-state">No rediscovery items yet. Logged-in users will see older bookmarks here.</p>
                )}
              </section>

              <section className="insight-section-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">Actions</p>
                    <h2>Suggested next moves</h2>
                  </div>
                  <span>{payload?.actions.length ?? 0}</span>
                </div>
                {payload?.actions.length ? (
                  <div className="insight-utility-list">{payload.actions.map(renderAction)}</div>
                ) : (
                  <p className="insight-empty-state">No action suggestions were returned.</p>
                )}
              </section>
            </div>
          ) : null}
        </main>
      </div>
    </div>
  );
};

export default InsightReaderPage;
