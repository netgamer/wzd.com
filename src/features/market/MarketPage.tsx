import { useEffect, useMemo, useState } from "react";

type AuthUserProfile = {
  id: string;
  email: string;
};

type MarketCategory = "theme" | "widget" | "pet";

type MarketListing = {
  id: string;
  category: MarketCategory;
  title: string;
  price: number;
  seller: string;
  description: string;
  preview: string;
  accentClass: string;
  tags: string[];
};

type Props = {
  user: AuthUserProfile | null;
  onNavigateBack: () => void;
};

const MARKET_BALANCE_KEY = "wzd-market-balance";
const MARKET_OWNED_KEY = "wzd-market-owned";
const MARKET_CUSTOM_LISTINGS_KEY = "wzd-market-custom-listings";

const seedListings: MarketListing[] = [
  {
    id: "theme-sunset-paper",
    category: "theme",
    title: "Sunset Paper",
    price: 240,
    seller: "WZD Studio",
    description: "종이 질감 위에 따뜻한 노을 톤을 얹은 집중형 배경 테마",
    preview: "Cream / Coral / Violet",
    accentClass: "theme",
    tags: ["배경", "노을", "집중"]
  },
  {
    id: "theme-midnight-grid",
    category: "theme",
    title: "Midnight Grid",
    price: 360,
    seller: "Layout Lab",
    description: "어두운 그리드와 네온 포인트로 위젯 대비를 살린 배경 테마",
    preview: "Ink / Grid / Neon",
    accentClass: "theme-alt",
    tags: ["배경", "그리드", "대비"]
  },
  {
    id: "widget-analytics-strip",
    category: "widget",
    title: "Analytics Strip",
    price: 410,
    seller: "Metric Forge",
    description: "지표 카드, 비교 차트, 전환 요약을 한 카드 안에 담는 위젯 팩",
    preview: "CTR 8.4% / ROAS 3.9x",
    accentClass: "widget",
    tags: ["위젯", "대시보드", "분석"]
  },
  {
    id: "widget-launch-hub",
    category: "widget",
    title: "Launch Hub",
    price: 290,
    seller: "Ops Board",
    description: "런칭 체크리스트, 타임라인, 채널별 TODO를 함께 보여주는 위젯 세트",
    preview: "Launch / Checklist / Timeline",
    accentClass: "widget-alt",
    tags: ["위젯", "런칭", "운영"]
  },
  {
    id: "pet-blue-cat",
    category: "pet",
    title: "Blue Rooftop Cat",
    price: 520,
    seller: "Companion House",
    description: "보드 위를 천천히 걷다가 카드 끝에서 점프하는 파란 고양이 스킨",
    preview: "Jump / Blink / Walk",
    accentClass: "pet",
    tags: ["펫", "고양이", "애니메이션"]
  },
  {
    id: "pet-cloud-rabbit",
    category: "pet",
    title: "Cloud Rabbit",
    price: 470,
    seller: "Companion House",
    description: "빈 공간을 탐색하다 멈춰 서서 귀를 움직이는 토끼 펫",
    preview: "Hop / Pause / Look",
    accentClass: "pet-alt",
    tags: ["펫", "토끼", "가벼움"]
  }
];

const categoryMeta: Record<MarketCategory, { label: string; desc: string }> = {
  theme: { label: "보드 배경 테마", desc: "보드 전체 분위기를 바꾸는 시각 테마" },
  widget: { label: "위젯", desc: "보드에 끼워 넣는 기능성 카드와 팩" },
  pet: { label: "펫", desc: "보드 위를 돌아다니는 캐릭터와 동작 스킨" }
};

const getUserKey = (user: AuthUserProfile | null) => user?.email?.trim().toLowerCase() || "guest";

const readJson = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
};

const formatPrice = (value: number) => `${value.toLocaleString("ko-KR")}P`;

const MarketPage = ({ user, onNavigateBack }: Props) => {
  const userKey = getUserKey(user);
  const [category, setCategory] = useState<MarketCategory>("theme");
  const [balance, setBalance] = useState(1800);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [customListings, setCustomListings] = useState<MarketListing[]>([]);
  const [saleCategory, setSaleCategory] = useState<MarketCategory>("theme");
  const [saleTitle, setSaleTitle] = useState("");
  const [salePrice, setSalePrice] = useState("300");
  const [saleDescription, setSaleDescription] = useState("");
  const [salePreview, setSalePreview] = useState("");
  const [saleTags, setSaleTags] = useState("");

  useEffect(() => {
    setBalance(readJson<number>(`${MARKET_BALANCE_KEY}:${userKey}`, 1800));
    setOwnedIds(readJson<string[]>(`${MARKET_OWNED_KEY}:${userKey}`, []));
    setCustomListings(readJson<MarketListing[]>(`${MARKET_CUSTOM_LISTINGS_KEY}:${userKey}`, []));
  }, [userKey]);

  const allListings = useMemo(() => [...customListings, ...seedListings], [customListings]);
  const visibleListings = useMemo(() => allListings.filter((item) => item.category === category), [allListings, category]);
  const ownedListings = useMemo(() => allListings.filter((item) => ownedIds.includes(item.id)), [allListings, ownedIds]);

  const purchaseListing = (listing: MarketListing) => {
    if (ownedIds.includes(listing.id) || balance < listing.price) {
      return;
    }

    const nextBalance = balance - listing.price;
    const nextOwned = [...ownedIds, listing.id];
    setBalance(nextBalance);
    setOwnedIds(nextOwned);
    writeJson(`${MARKET_BALANCE_KEY}:${userKey}`, nextBalance);
    writeJson(`${MARKET_OWNED_KEY}:${userKey}`, nextOwned);
  };

  const submitSale = () => {
    const title = saleTitle.trim();
    const description = saleDescription.trim();
    const preview = salePreview.trim();
    const price = Math.max(50, Math.round(Number(salePrice) || 0));

    if (!title || !description || !preview) {
      return;
    }

    const nextListing: MarketListing = {
      id: `custom-${Date.now()}`,
      category: saleCategory,
      title,
      price,
      seller: user?.email || "게스트 셀러",
      description,
      preview,
      accentClass:
        saleCategory === "theme"
          ? "theme"
          : saleCategory === "widget"
            ? "widget"
            : "pet",
      tags: saleTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 4)
    };

    const nextCustomListings = [nextListing, ...customListings];
    setCustomListings(nextCustomListings);
    writeJson(`${MARKET_CUSTOM_LISTINGS_KEY}:${userKey}`, nextCustomListings);
    setSaleTitle("");
    setSalePrice("300");
    setSaleDescription("");
    setSalePreview("");
    setSaleTags("");
    setCategory(saleCategory);
  };

  return (
    <div className="market-page">
      <header className="market-header">
        <div className="market-header-inner">
          <button className="market-back-button" onClick={onNavigateBack}>
            WZD로 돌아가기
          </button>
          <div className="market-header-copy">
            <p className="market-kicker">WZD MARKET</p>
            <h1>배경 테마, 위젯, 펫을 사고파는 마켓</h1>
            <p>보드에 붙는 것들을 직접 사고, 직접 만들어 팔 수 있는 WZD 전용 마켓 MVP입니다.</p>
          </div>
          <div className="market-balance-card">
            <span>보유 포인트</span>
            <strong>{formatPrice(balance)}</strong>
            <p>{user?.email || "게스트"} 기준 로컬 보유함</p>
          </div>
        </div>
      </header>

      <main className="market-main">
        <section className="market-toolbar">
          <div className="market-tabs" role="tablist" aria-label="마켓 카테고리">
            {(Object.keys(categoryMeta) as MarketCategory[]).map((key) => (
              <button
                key={key}
                className={`market-tab ${category === key ? "active" : ""}`.trim()}
                onClick={() => setCategory(key)}
              >
                <strong>{categoryMeta[key].label}</strong>
                <span>{categoryMeta[key].desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="market-layout">
          <div className="market-listings">
            <div className="market-section-head">
              <div>
                <p className="market-section-kicker">MARKET LISTINGS</p>
                <h2>{categoryMeta[category].label}</h2>
              </div>
              <span>{visibleListings.length}개 상품</span>
            </div>
            <div className="market-grid">
              {visibleListings.map((listing) => {
                const owned = ownedIds.includes(listing.id);
                const soldOut = !owned && balance < listing.price;

                return (
                  <article key={listing.id} className={`market-card ${listing.accentClass}`.trim()}>
                    <div className="market-card-preview">
                      <span>{listing.preview}</span>
                    </div>
                    <div className="market-card-body">
                      <div className="market-card-head">
                        <div>
                          <strong>{listing.title}</strong>
                          <span>{listing.seller}</span>
                        </div>
                        <em>{formatPrice(listing.price)}</em>
                      </div>
                      <p>{listing.description}</p>
                      <div className="market-card-tags">
                        {listing.tags.map((tag) => (
                          <span key={`${listing.id}-${tag}`}>{tag}</span>
                        ))}
                      </div>
                      <button
                        className={`market-buy-button ${owned ? "owned" : ""}`.trim()}
                        onClick={() => purchaseListing(listing)}
                        disabled={owned || soldOut}
                      >
                        {owned ? "보유 중" : soldOut ? "포인트 부족" : "구매하기"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="market-sidepanels">
            <section className="market-panel">
              <div className="market-section-head">
                <div>
                  <p className="market-section-kicker">SELL</p>
                  <h2>판매 등록</h2>
                </div>
              </div>
              <div className="market-form">
                <label>
                  <span>카테고리</span>
                  <select value={saleCategory} onChange={(event) => setSaleCategory(event.target.value as MarketCategory)}>
                    <option value="theme">보드 배경 테마</option>
                    <option value="widget">위젯</option>
                    <option value="pet">펫</option>
                  </select>
                </label>
                <label>
                  <span>상품명</span>
                  <input value={saleTitle} onChange={(event) => setSaleTitle(event.target.value)} placeholder="예: Soft Linen Theme" />
                </label>
                <label>
                  <span>가격</span>
                  <input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} inputMode="numeric" />
                </label>
                <label>
                  <span>미리보기 문구</span>
                  <input value={salePreview} onChange={(event) => setSalePreview(event.target.value)} placeholder="예: Cream / Paper / Calm" />
                </label>
                <label>
                  <span>설명</span>
                  <textarea
                    value={saleDescription}
                    onChange={(event) => setSaleDescription(event.target.value)}
                    rows={4}
                    placeholder="상품 설명을 적어주세요"
                  />
                </label>
                <label>
                  <span>태그</span>
                  <input value={saleTags} onChange={(event) => setSaleTags(event.target.value)} placeholder="차분함, 테마, 미니멀" />
                </label>
                <button className="market-submit-button" onClick={submitSale}>
                  판매 등록
                </button>
              </div>
            </section>

            <section className="market-panel">
              <div className="market-section-head">
                <div>
                  <p className="market-section-kicker">OWNED</p>
                  <h2>내 보유함</h2>
                </div>
              </div>
              <div className="market-owned-list">
                {ownedListings.length > 0 ? (
                  ownedListings.map((item) => (
                    <div key={`owned-${item.id}`} className="market-owned-item">
                      <strong>{item.title}</strong>
                      <span>{categoryMeta[item.category].label}</span>
                    </div>
                  ))
                ) : (
                  <p className="market-empty">아직 구매한 아이템이 없습니다.</p>
                )}
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
};

export default MarketPage;
