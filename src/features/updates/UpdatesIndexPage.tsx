import { useEffect, useState } from "react";
import type { SiteLanguage } from "../../lib/site-language";

type UpdatesIndexPageProps = {
  onNavigateBack?: () => void;
  language: SiteLanguage;
};

interface NotificationItem {
  id: string;
  title: string;
  link: string;
  date: string;
  source: string;
  category: string;
}

const BLOG_RSS_URL = "https://netgamer.github.io/wzd-blog-platform/index.xml";

const API_BASE =
  (import.meta.env.VITE_AGENT_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  window.location.origin;

const parsePubDate = (raw: string) => {
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "방금 전";
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}일 전`;
    return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  } catch {
    return raw;
  }
};

const guessCategory = (title: string) => {
  if (/정책|법안|규제|정부|국회/.test(title)) return "정책·뉴스";
  if (/지원금|혜택|보조금|신청|복지/.test(title)) return "지원금·혜택";
  return "생활·트렌드";
};

const UpdatesIndexPage = ({ onNavigateBack }: UpdatesIndexPageProps) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "알림 — WZD";

    const fetchNotifications = async () => {
      try {
        const endpoint = `${API_BASE}/api/rss-feed?url=${encodeURIComponent(BLOG_RSS_URL)}`;
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error("피드 로딩 실패");
        const data = await response.json() as { ok?: boolean; feed?: { title: string; items: Array<{ title: string; link: string; pubDate?: string }> }; error?: string };
        if (!data.ok || !data.feed) throw new Error(data.error || "피드 데이터 없음");

        const items: NotificationItem[] = data.feed.items.slice(0, 20).map((item, i) => ({
          id: `blog-${i}`,
          title: item.title,
          link: item.link,
          date: item.pubDate || "",
          source: "오늘의 트렌드",
          category: guessCategory(item.title)
        }));

        setNotifications(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "알림을 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="updates-page">
      <div className="updates-shell">
        <header className="updates-topbar">
          <div className="updates-topbar-copy">
            <p className="updates-kicker">알림</p>
            <strong>최근 소식</strong>
          </div>
          <div className="updates-topbar-actions">
            {onNavigateBack ? (
              <button type="button" className="updates-back-button" onClick={onNavigateBack}>
                뒤로
              </button>
            ) : null}
          </div>
        </header>

        <main className="updates-layout">
          <section className="notifications-header">
            <h1>알림</h1>
            <p>오늘의 트렌드 블로그에서 새로 발행된 포스트입니다.</p>
          </section>

          {loading ? (
            <div className="notifications-loading">
              <span className="notifications-spinner" />
              <span>알림을 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="notifications-empty">{error}</div>
          ) : notifications.length === 0 ? (
            <div className="notifications-empty">새로운 알림이 없습니다.</div>
          ) : (
            <section className="notifications-list" aria-label="알림 목록">
              {notifications.map((item) => (
                <a
                  key={item.id}
                  className="notification-card"
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div className="notification-dot-wrap">
                    <span className="notification-dot" />
                  </div>
                  <div className="notification-body">
                    <div className="notification-meta">
                      <span className="notification-source">{item.source}</span>
                      <span className="notification-category">{item.category}</span>
                      <span className="notification-time">{parsePubDate(item.date)}</span>
                    </div>
                    <p className="notification-title">{item.title}</p>
                  </div>
                  <span className="notification-arrow" aria-hidden="true">›</span>
                </a>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default UpdatesIndexPage;
