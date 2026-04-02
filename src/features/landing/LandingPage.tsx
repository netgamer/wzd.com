import { supabase } from "../../lib/supabase";

type LandingFeature = {
  icon: string;
  title: string;
  description: string;
};

type WidgetSample = {
  type: string;
  title: string;
  description: string;
  badge: string;
  accentClass: string;
  lines: string[];
};

const FEATURES: LandingFeature[] = [
  {
    icon: "01",
    title: "메모와 위젯을 같은 보드에서",
    description: "단순 메모장처럼 끝나지 않고 뉴스, 날씨, 할 일, 북마크까지 한 화면에서 같이 씁니다."
  },
  {
    icon: "02",
    title: "개인 보드와 공유 보드를 분리해서",
    description: "혼자 쓰는 정리판과 팀이 함께 보는 작업공간을 같은 방식으로 다룰 수 있습니다."
  },
  {
    icon: "03",
    title: "보자마자 감이 오는 화면",
    description: "랜딩에서 바로 샘플을 보여줘서 로그인 전에 무엇을 만들 수 있는지 이해할 수 있습니다."
  }
];

const WIDGET_SAMPLES: WidgetSample[] = [
  {
    type: "메모",
    title: "빠른 메모",
    description: "생각, 링크, 할 일을 그냥 붙여두는 기본 카드",
    badge: "NOTE",
    accentClass: "accent-paper",
    lines: ["회의 전 질문 정리", "핵심 문장 한 줄", "https://example.com"]
  },
  {
    type: "북마크",
    title: "자주 여는 링크",
    description: "서비스와 자료를 카테고리 없이 바로 저장",
    badge: "BOOKMARK",
    accentClass: "accent-sand",
    lines: ["OpenAI Docs", "파트너 대시보드", "클라이언트 시안 링크"]
  },
  {
    type: "체크리스트",
    title: "오늘 할 일",
    description: "보드 안에서 체크 상태를 바로 관리",
    badge: "TODO",
    accentClass: "accent-mint",
    lines: ["[x] 회의 자료 정리", "[ ] 메일 답변", "[ ] 4시 피드백 반영"]
  },
  {
    type: "디데이",
    title: "런칭 카운트다운",
    description: "중요 일정까지 남은 시간을 한 칸으로",
    badge: "COUNTDOWN",
    accentClass: "accent-rose",
    lines: ["프로젝트 오픈", "D-12", "2026.04.14"]
  },
  {
    type: "시간표",
    title: "주간 스케줄",
    description: "수업, 미팅, 루틴을 표처럼 확인",
    badge: "TIMETABLE",
    accentClass: "accent-blue",
    lines: ["월 09:00 기획 회의", "수 13:00 촬영", "금 16:30 회고"]
  },
  {
    type: "날씨",
    title: "오늘 날씨",
    description: "지역별 날씨와 간단 예보를 같이 배치",
    badge: "WEATHER",
    accentClass: "accent-sky",
    lines: ["서울 17°", "오후에 비 가능성 40%", "내일은 더 맑음"]
  },
  {
    type: "실시간 트렌드",
    title: "지금 뜨는 키워드",
    description: "뉴스나 검색 트렌드를 빠르게 보는 카드",
    badge: "TREND",
    accentClass: "accent-amber",
    lines: ["1. AI 에이전트", "2. 반도체", "3. 로보택시"]
  },
  {
    type: "RSS",
    title: "읽을 거리 모음",
    description: "구독 중인 피드를 보드에 붙여서 확인",
    badge: "RSS",
    accentClass: "accent-lavender",
    lines: ["AI 뉴스레터", "디자인 시스템 글", "스타트업 업데이트"]
  },
  {
    type: "배송 추적",
    title: "택배 진행 상태",
    description: "주문한 물건 흐름을 메모와 같이 보기",
    badge: "DELIVERY",
    accentClass: "accent-ash",
    lines: ["집화 완료", "간선 상차", "내일 도착 예정"]
  },
  {
    type: "펫",
    title: "반려동물 카드",
    description: "기분, 상태, 간단 메모를 귀엽게 정리",
    badge: "PET",
    accentClass: "accent-peach",
    lines: ["모찌", "산책 2회", "간식 남음"]
  },
  {
    type: "커버",
    title: "보드 표지",
    description: "한 보드의 제목과 분위기를 먼저 보여주는 카드",
    badge: "COVER",
    accentClass: "accent-ink",
    lines: ["브랜드 리뉴얼 보드", "핵심 레퍼런스와 시안 정리", "이번 주 집중 작업"]
  },
  {
    type: "문서",
    title: "짧은 기획 문서",
    description: "아이디어와 요약 문장을 긴 카드로 배치",
    badge: "DOC",
    accentClass: "accent-cream",
    lines: ["신규 기능 제안", "문제, 해결 방식, 기대 효과", "회의 전에 읽을 요약"]
  },
  {
    type: "집중 타이머",
    title: "포커스 세션",
    description: "집중 시간과 남은 시간을 보드에 고정",
    badge: "FOCUS",
    accentClass: "accent-burgundy",
    lines: ["25:00 집중", "현재 세션 진행 중", "다음 휴식 5분"]
  },
  {
    type: "무드",
    title: "오늘의 컨디션",
    description: "기분과 에너지를 짧게 기록",
    badge: "MOOD",
    accentClass: "accent-blush",
    lines: ["🙂 차분함", "에너지 3/5", "회의 전 준비 완료"]
  },
  {
    type: "루틴",
    title: "반복 루틴",
    description: "매일 반복하는 행동을 체크리스트로",
    badge: "ROUTINE",
    accentClass: "accent-olive",
    lines: ["아침 정리", "핵심 작업 1개", "하루 회고"]
  },
  {
    type: "프롬프트",
    title: "AI 작업 프롬프트",
    description: "자주 쓰는 프롬프트를 템플릿처럼 저장",
    badge: "PROMPT",
    accentClass: "accent-violet",
    lines: ["역할", "목표", "톤앤매너", "출력 형식"]
  },
  {
    type: "맛집 추천",
    title: "지역별 식사 픽",
    description: "동네 기준 추천을 가볍게 모아두는 카드",
    badge: "FOOD",
    accentClass: "accent-coral",
    lines: ["서울 금천구", "오늘의 점심 후보 3곳", "흑백요리사 픽 포함"]
  }
];

const LandingPage = () => {
  const handleGoogleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo-lockup">
            <div className="landing-logo">WZD</div>
            <span>보드 위에 메모와 위젯을 같이 쌓는 워크스페이스</span>
          </div>
          <button className="landing-login-btn" onClick={handleGoogleLogin}>
            Google로 시작하기
          </button>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-kicker">WZD WIDGET BOARD</p>
              <h1 className="landing-title">
                메모 앱이 아니라,
                <br />
                위젯이 붙는 보드입니다
              </h1>
              <p className="landing-subtitle">
                링크 몇 개 저장하는 수준이 아니라, 메모와 체크리스트와 날씨와 RSS와 배송 추적까지
                한 보드 안에서 같이 놓고 보는 작업공간입니다.
              </p>
              <div className="landing-cta">
                <button className="landing-cta-primary" onClick={handleGoogleLogin}>
                  무료로 바로 시작
                </button>
                <a className="landing-cta-secondary" href="#widget-gallery">
                  위젯 전체 보기
                </a>
              </div>
              <div className="landing-proof-strip" aria-label="핵심 특성">
                <span>메모 + 위젯 혼합 보드</span>
                <span>개인/팀 보드 지원</span>
                <span>링크, 피드, 루틴 한 화면 정리</span>
              </div>
            </div>
            <div className="landing-hero-panel">
              <div className="landing-hero-panel-head">
                <span>샘플 워크스페이스</span>
                <strong>오늘 자주 쓰는 조합</strong>
              </div>
              <div className="landing-hero-mini-grid">
                {WIDGET_SAMPLES.slice(0, 6).map((widget) => (
                  <article
                    key={widget.badge}
                    className={`landing-widget-mini-card ${widget.accentClass}`}
                  >
                    <span className="landing-widget-mini-badge">{widget.badge}</span>
                    <strong>{widget.title}</strong>
                    <p>{widget.lines[0]}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="landing-features">
          <div className="landing-features-inner">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="landing-feature-card">
                <div className="landing-feature-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-widgets" id="widget-gallery">
          <div className="landing-widgets-inner">
            <div className="landing-section-header">
              <p className="landing-section-kicker">ALL WIDGETS AT A GLANCE</p>
              <h2>홈에서 바로 모든 위젯 샘플을 훑어보세요</h2>
              <p className="landing-section-desc">
                어떤 보드를 만들 수 있는지 설명 대신 샘플 카드로 바로 보여줍니다.
              </p>
            </div>

            <div className="landing-widget-wall">
              {WIDGET_SAMPLES.map((widget) => (
                <article key={widget.badge} className={`landing-widget-sample ${widget.accentClass}`}>
                  <div className="landing-widget-sample-head">
                    <span className="landing-widget-sample-type">{widget.type}</span>
                    <span className="landing-widget-sample-badge">{widget.badge}</span>
                  </div>
                  <div className="landing-widget-sample-body">
                    <h3>{widget.title}</h3>
                    <p>{widget.description}</p>
                    <ul className="landing-widget-sample-list">
                      {widget.lines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-showcase">
          <div className="landing-showcase-inner">
            <p className="landing-section-kicker">WHY IT FEELS DIFFERENT</p>
            <h2>보드 하나가 메모장, 대시보드, 시작페이지 역할을 같이 합니다</h2>
            <p>
              새 메모만 쌓이는 구조가 아니라, 자주 확인하는 정보 블록을 함께 붙일 수 있습니다.
              그래서 랜딩에서 위젯 샘플을 다 보여주는 게 핵심입니다. 들어오자마자 용도가 보여야 하니까요.
            </p>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-final-cta-inner">
            <h2>마음에 드는 조합을 바로 보드로 옮기면 됩니다</h2>
            <p>로그인하면 샘플 템플릿을 고르고 바로 자기 보드로 시작할 수 있습니다.</p>
            <button className="landing-cta-primary" onClick={handleGoogleLogin}>
              Google로 시작하기
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">WZD</span>
          <span className="landing-footer-copy">2026 WZD. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
