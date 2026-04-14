import { useEffect, useMemo, useState } from "react";
import type { SiteLanguage } from "../../lib/site-language";
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
  language: SiteLanguage;
};

const formatDate = (value: string | undefined, language: SiteLanguage) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(language === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(parsed);
};

const formatScore = (value?: number) => (typeof value === "number" ? value.toFixed(1) : "-");

const renderFeedItem = (item: HomePayloadFeedItem, language: SiteLanguage) => {
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
        <p className="insight-feed-item-time">{formatDate(item.publishedAt, language) ?? (language === "ko" ? "최근 항목" : "Recent item")}</p>
        <div className="insight-score-pills">
          <span>{language === "ko" ? "중요도" : "Imp"} {formatScore(item.importance)}</span>
          <span>{language === "ko" ? "관련도" : "Rev"} {formatScore(item.relevance)}</span>
        </div>
      </div>
      <strong>{item.title}</strong>
      {item.summary ? <p>{item.summary}</p> : null}
    </Wrapper>
  );
};

const renderTrend = (trend: HomePayloadTrend, language: SiteLanguage) => (
  <article key={trend.id} className="insight-trend-card">
    <div className="insight-trend-head">
      <strong>{trend.name}</strong>
      <span>{formatScore(trend.trendScore)}</span>
    </div>
    {trend.description ? <p>{trend.description}</p> : null}
    <small>{trend.itemCount ? `${trend.itemCount}${language === "ko" ? "개 항목" : " items"}` : language === "ko" ? "클러스터 신호" : "Cluster signal"}</small>
  </article>
);

const renderRediscoveryItem = (item: HomePayloadRediscoveryItem, language: SiteLanguage) => {
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
        <span>{formatDate(item.savedAt, language) ?? (language === "ko" ? "이전에 저장됨" : "Saved earlier")}</span>
        <span>{language === "ko" ? "가치" : "Value"} {formatScore(item.monetization)}</span>
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

const InsightReaderPage = ({ onNavigateBack, userId, language }: InsightReaderPageProps) => {
  const [payload, setPayload] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const copy =
    language === "ko"
      ? {
          topbar: "첫 번째 인사이트 MVP 화면",
          back: "뒤로 가기",
          hero: "히어로",
          heroFallbackTitle: "홈 payload를 첫 화면 인사이트로 렌더링한 결과입니다.",
          heroFallbackSummary: "이 경로는 현재 `get_home_payload` RPC를 읽어 최소한의 공개 인사이트 페이지로 바꿉니다.",
          route: "경로 `/insight`",
          source: "소스 `get_home_payload`",
          noHeroTime: "히어로 시각 없음",
          status: "상태",
          loadingPayload: "Payload 불러오는 중",
          unavailable: "Payload 사용 불가",
          ready: "Payload 준비 완료",
          readingRpc: "Supabase RPC에서 읽는 중입니다.",
          readyDescription: "히어로, 트렌드, 피드, 재발견, 액션으로 매핑했습니다.",
          totalScore: "총점",
          importance: "중요도",
          monetization: "수익성",
          relevance: "관련도",
          trendClusters: "트렌드 클러스터",
          feedItems: "피드 항목",
          nextActions: "다음 액션",
          openSource: "원문 열기",
          error: "오류",
          renderError: "인사이트 페이지를 렌더링할 수 없습니다.",
          trends: "트렌드",
          trendsTitle: "지금 묶이는 흐름",
          trendsEmpty: "반환된 트렌드 클러스터가 없습니다.",
          feed: "피드",
          feedTitle: "지금 훑어볼 항목",
          feedEmpty: "반환된 피드 항목이 없습니다.",
          rediscovery: "재발견",
          rediscoveryTitle: "다시 볼 북마크",
          rediscoveryEmpty: "아직 재발견 항목이 없습니다. 로그인 사용자는 오래된 북마크가 여기에 표시됩니다.",
          actions: "액션",
          actionsTitle: "추천 다음 단계",
          actionsEmpty: "반환된 액션 제안이 없습니다.",
          missingSupabase: "Supabase 환경변수가 없습니다.",
          failedPayload: "get_home_payload를 불러오지 못했습니다."
        }
      : {
          topbar: "First real Insight MVP surface",
          back: "Go back",
          hero: "Hero",
          heroFallbackTitle: "Your home payload, rendered as a first-page insight.",
          heroFallbackSummary: "This route reads the current `get_home_payload` RPC and turns it into a minimal public-facing insight page.",
          route: "Route `/insight`",
          source: "Source `get_home_payload`",
          noHeroTime: "No hero timestamp",
          status: "Status",
          loadingPayload: "Loading payload",
          unavailable: "Payload unavailable",
          ready: "Payload ready",
          readingRpc: "Reading from Supabase RPC.",
          readyDescription: "Mapped hero, trends, feed, rediscovery, and actions.",
          totalScore: "Total score",
          importance: "Importance",
          monetization: "Monetization",
          relevance: "Relevance",
          trendClusters: "Trend clusters",
          feedItems: "Feed items",
          nextActions: "Next actions",
          openSource: "Open hero source",
          error: "Error",
          renderError: "Could not render the insight page.",
          trends: "Trends",
          trendsTitle: "What is clustering now",
          trendsEmpty: "No trend clusters were returned.",
          feed: "Feed",
          feedTitle: "Recent items worth scanning",
          feedEmpty: "No feed items were returned.",
          rediscovery: "Rediscovery",
          rediscoveryTitle: "Bookmarks to revisit",
          rediscoveryEmpty: "No rediscovery items yet. Logged-in users will see older bookmarks here.",
          actions: "Actions",
          actionsTitle: "Suggested next moves",
          actionsEmpty: "No action suggestions were returned.",
          missingSupabase: "Supabase environment variables are missing.",
          failedPayload: "Failed to load get_home_payload."
        };

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!hasSupabaseConfig) {
        setError(copy.missingSupabase);
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
          setError(loadError instanceof Error ? loadError.message : copy.failedPayload);
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
  }, [copy.failedPayload, copy.missingSupabase, userId]);

  const heroMetrics = useMemo(
    () => [
      { label: copy.trendClusters, value: payload?.trends.length ?? 0 },
      { label: copy.feedItems, value: payload?.feed.length ?? 0 },
      { label: copy.nextActions, value: payload?.actions.length ?? 0 }
    ],
    [copy.feedItems, copy.nextActions, copy.trendClusters, payload]
  );

  return (
    <div className="insight-page">
      <div className="insight-page-shell">
        <header className="insight-topbar">
          <div>
            <p className="insight-kicker">WZD Insight</p>
            <strong>{copy.topbar}</strong>
          </div>
          {onNavigateBack ? (
            <button className="insight-back-button" onClick={onNavigateBack}>
              {copy.back}
            </button>
          ) : null}
        </header>

        <main className="insight-layout">
          <section className="insight-hero-panel">
            <div className="insight-hero-copy">
              <p className="insight-kicker">{copy.hero}</p>
              <h1>{payload?.hero?.title ?? copy.heroFallbackTitle}</h1>
              <p className="insight-summary">{payload?.hero?.summary ?? copy.heroFallbackSummary}</p>
              <div className="insight-meta-row">
                <span>{copy.route}</span>
                <span>{copy.source}</span>
                <span>{formatDate(payload?.hero?.publishedAt, language) ?? copy.noHeroTime}</span>
              </div>
            </div>

            <aside className="insight-hero-aside">
              <div className={`insight-status-card ${loading ? "is-loading" : error ? "is-error" : "is-ready"}`}>
                <p className="insight-kicker">{copy.status}</p>
                <strong>{loading ? copy.loadingPayload : error ? copy.unavailable : copy.ready}</strong>
                <p>{loading ? copy.readingRpc : error ?? copy.readyDescription}</p>
              </div>

              <div className="insight-score-grid">
                <div className="insight-score-card">
                  <span>{copy.totalScore}</span>
                  <strong>{formatScore(payload?.hero?.scores.total)}</strong>
                </div>
                <div className="insight-score-card">
                  <span>{copy.importance}</span>
                  <strong>{formatScore(payload?.hero?.scores.importance)}</strong>
                </div>
                <div className="insight-score-card">
                  <span>{copy.monetization}</span>
                  <strong>{formatScore(payload?.hero?.scores.monetization)}</strong>
                </div>
                <div className="insight-score-card">
                  <span>{copy.relevance}</span>
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
                  {copy.openSource}
                </a>
              ) : null}
            </aside>
          </section>

          {error ? (
            <section className="insight-message-card is-error">
              <p className="insight-kicker">{copy.error}</p>
              <h2>{copy.renderError}</h2>
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
                    <p className="insight-kicker">{copy.trends}</p>
                    <h2>{copy.trendsTitle}</h2>
                  </div>
                  <span>{payload?.trends.length ?? 0}</span>
                </div>
                {payload?.trends.length ? (
                  <div className="insight-trend-list">{payload.trends.map((trend) => renderTrend(trend, language))}</div>
                ) : (
                  <p className="insight-empty-state">{copy.trendsEmpty}</p>
                )}
              </section>

              <section className="insight-section-panel insight-feed-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">{copy.feed}</p>
                    <h2>{copy.feedTitle}</h2>
                  </div>
                  <span>{payload?.feed.length ?? 0}</span>
                </div>
                {payload?.feed.length ? (
                  <div className="insight-feed-list">{payload.feed.slice(0, 8).map((item) => renderFeedItem(item, language))}</div>
                ) : (
                  <p className="insight-empty-state">{copy.feedEmpty}</p>
                )}
              </section>

              <section className="insight-section-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">{copy.rediscovery}</p>
                    <h2>{copy.rediscoveryTitle}</h2>
                  </div>
                  <span>{payload?.rediscovery.length ?? 0}</span>
                </div>
                {payload?.rediscovery.length ? (
                  <div className="insight-utility-list">{payload.rediscovery.map((item) => renderRediscoveryItem(item, language))}</div>
                ) : (
                  <p className="insight-empty-state">{copy.rediscoveryEmpty}</p>
                )}
              </section>

              <section className="insight-section-panel">
                <div className="insight-section-head">
                  <div>
                    <p className="insight-kicker">{copy.actions}</p>
                    <h2>{copy.actionsTitle}</h2>
                  </div>
                  <span>{payload?.actions.length ?? 0}</span>
                </div>
                {payload?.actions.length ? (
                  <div className="insight-utility-list">{payload.actions.map(renderAction)}</div>
                ) : (
                  <p className="insight-empty-state">{copy.actionsEmpty}</p>
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
