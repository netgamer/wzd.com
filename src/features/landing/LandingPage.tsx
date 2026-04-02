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
  useCase: string;
};

type MemoSample = {
  badge: string;
  title: string;
  accentClass: string;
  content: string[];
  link?: { href: string; label: string };
  image?: string;
};

type HeroPreviewWidget = {
  kind: "note" | "bookmark" | "todo" | "countdown" | "timetable" | "weather";
  badge: string;
  title: string;
  accentClass: string;
  subtitle?: string;
  lines?: string[];
  value?: string;
  chips?: string[];
};

type ShowcaseWidget =
  | {
      kind: "rss";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      items: Array<{ source: string; headline: string; time: string }>;
    }
  | {
      kind: "weather";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      location: string;
      temperature: string;
      summary: string;
      chips: string[];
    }
  | {
      kind: "todo";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      items: Array<{ label: string; done: boolean }>;
    }
  | {
      kind: "countdown";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      days: string;
      date: string;
      summary: string;
    }
  | {
      kind: "timetable";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      rows: Array<{ day: string; time: string; task: string }>;
    }
  | {
      kind: "delivery";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      carrier: string;
      status: string;
      steps: string[];
    }
  | {
      kind: "focus";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      timer: string;
      current: string;
      next: string;
    }
  | {
      kind: "mood";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      emoji: string;
      state: string;
      energy: number;
      note: string;
    }
  | {
      kind: "prompt";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      sections: string[];
    }
  | {
      kind: "bookmark";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      links: Array<{ label: string; host: string }>;
    }
  | {
      kind: "trend";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      items: string[];
    }
  | {
      kind: "food";
      badge: string;
      title: string;
      accentClass: string;
      size: "short" | "medium" | "tall";
      region: string;
      picks: Array<{ name: string; meta: string }>;
    };

const FEATURES: LandingFeature[] = [
  {
    icon: "01",
    title: "메모와 위젯을 같은 보드에서",
    description: "단순 메모장에서 끝나지 않고 뉴스, 날씨, 할 일, 북마크까지 한 화면에서 같이 씁니다."
  },
  {
    icon: "02",
    title: "개인 보드와 공유 보드를 분리해서",
    description: "혼자 쓰는 정리판과 팀이 함께 보는 작업공간을 같은 방식으로 운영할 수 있습니다."
  },
  {
    icon: "03",
    title: "보자마자 감이 오는 화면",
    description: "설명보다 샘플을 먼저 보여줘서 로그인 전에도 어떤 보드를 만들 수 있는지 바로 이해됩니다."
  }
];

const WIDGET_SAMPLES: WidgetSample[] = [
  {
    type: "메모",
    title: "빠른 메모",
    description: "아이디어, 회의 메모, 해야 할 일을 가장 빨리 붙이는 기본 카드입니다.",
    badge: "NOTE",
    accentClass: "accent-paper",
    lines: ["회의 전 질문 3개", "담당 문장 한 줄 정리", "https://example.com"],
    useCase: "링크 하나와 짧은 메모를 같이 적어 두는 개인 작업 카드"
  },
  {
    type: "북마크",
    title: "자주 여는 링크",
    description: "브라우저 탭 대신 자주 보는 링크를 보드 안에서 분류 없이 바로 꺼냅니다.",
    badge: "BOOKMARK",
    accentClass: "accent-sand",
    lines: ["OpenAI Docs", "클라이언트 대시보드", "최신 광고 레퍼런스"],
    useCase: "업무 시작할 때 반드시 여는 링크 묶음"
  },
  {
    type: "체크리스트",
    title: "오늘 할 일",
    description: "보드 안에서 상태를 바로 바꾸며 진행 상황을 눈으로 확인합니다.",
    badge: "TODO",
    accentClass: "accent-mint",
    lines: ["[x] 회의 자료 정리", "[ ] 피드백 반영", "[ ] 4시 보고 준비"],
    useCase: "메모와 실행 항목이 섞여 있는 하루 단위 진행 관리"
  },
  {
    type: "디데이",
    title: "런칭 카운트다운",
    description: "중요 일정까지 남은 시간을 큰 숫자로 보여줘 팀 집중도를 맞춥니다.",
    badge: "COUNTDOWN",
    accentClass: "accent-rose",
    lines: ["프로젝트 오픈", "D-12", "2026.04.14"],
    useCase: "런칭, 발표, 제출 마감 같은 이벤트 추적"
  },
  {
    type: "시간표",
    title: "주간 스케줄",
    description: "회의와 촬영, 마감, 발표를 주간 흐름으로 한 카드 안에 붙여 둡니다.",
    badge: "TIMETABLE",
    accentClass: "accent-blue",
    lines: ["월 09:00 기획 회의", "수 13:00 촬영", "금 16:30 회고"],
    useCase: "개인 일정과 팀 루틴을 함께 보는 운영 보드"
  },
  {
    type: "날씨",
    title: "오늘 날씨",
    description: "현장 촬영, 외근, 산책 일정처럼 날씨 영향이 큰 루틴에 붙여 쓰기 좋습니다.",
    badge: "WEATHER",
    accentClass: "accent-sky",
    lines: ["서울 17도", "오후 비 가능성 40%", "내일 오전 맑음"],
    useCase: "하루 동선과 복장, 촬영 준비 판단용"
  },
  {
    type: "트렌드",
    title: "지금 뜨는 키워드",
    description: "실시간 검색과 트렌드 키워드를 보드 안에 붙여 시장 감각을 유지합니다.",
    badge: "TREND",
    accentClass: "accent-amber",
    lines: ["1. AI 에이전트", "2. 반도체", "3. 로봇택시"],
    useCase: "마케팅, 콘텐츠, 리서치 팀의 실시간 참고 카드"
  },
  {
    type: "RSS",
    title: "읽을 거리 모음",
    description: "구독 중인 피드를 보드에 꽂아 두고 메모와 함께 읽습니다.",
    badge: "RSS",
    accentClass: "accent-lavender",
    lines: ["AI 뉴스레터", "디자인 시스템 글", "스타트업 업데이트"],
    useCase: "아침 리서치 루틴과 자료 큐레이션"
  },
  {
    type: "배송 추적",
    title: "발송 진행 상태",
    description: "주문 메모와 송장 상태를 같은 카드 안에서 확인할 수 있습니다.",
    badge: "DELIVERY",
    accentClass: "accent-ash",
    lines: ["집화 완료", "간선 상차", "내일 오후 도착 예정"],
    useCase: "제품 샘플, 촬영 장비, 사무실 물품 추적"
  },
  {
    type: "펫",
    title: "반려동물 기록",
    description: "기분, 방문 횟수, 식사 상태를 감정적인 톤으로 남기는 생활 카드입니다.",
    badge: "PET",
    accentClass: "accent-peach",
    lines: ["모찌", "오늘 산책 2회", "간식 조금 먹음"],
    useCase: "생활 메모 보드나 가족 공유 보드"
  },
  {
    type: "커버",
    title: "보드 소개 카드",
    description: "보드의 목적과 이번 주 초점을 첫 카드에서 바로 설명합니다.",
    badge: "COVER",
    accentClass: "accent-ink",
    lines: ["브랜드 리뉴얼 보드", "핵심 화면 방향 정리", "이번 주 집중 작업"],
    useCase: "새 보드가 어떤 맥락인지 설명하는 표지"
  },
  {
    type: "문서",
    title: "기획 문서 카드",
    description: "긴 문서를 전부 펼치기 전에 핵심 문단만 압축해서 읽게 해 줍니다.",
    badge: "DOC",
    accentClass: "accent-cream",
    lines: ["신규 기능 제안", "문제, 해결 방식, 기대 효과", "회의 전에 읽는 요약"],
    useCase: "제안서, 회의 문서, PRD 요약"
  },
  {
    type: "집중 타이머",
    title: "딥워크 세션",
    description: "집중 시간과 휴식 시간을 시각적으로 박아 두는 생산성 카드입니다.",
    badge: "FOCUS",
    accentClass: "accent-burgundy",
    lines: ["25:00 집중", "현재 세션 진행 중", "다음 휴식 5분"],
    useCase: "공부 보드, 작업 스프린트, 개인 루틴"
  },
  {
    type: "무드",
    title: "오늘의 컨디션",
    description: "기분과 에너지 레벨을 짧게 남겨 하루 기록과 연결합니다.",
    badge: "MOOD",
    accentClass: "accent-blush",
    lines: ["차분함", "에너지 3/5", "회의 전 준비 완료"],
    useCase: "개인 회고, 감정 기록, 생활 보드"
  },
  {
    type: "루틴",
    title: "반복 루틴",
    description: "매일 반복하는 행동을 체크리스트처럼 쌓아 습관으로 만듭니다.",
    badge: "ROUTINE",
    accentClass: "accent-olive",
    lines: ["아침 정리", "중요 작업 1개", "하루 마감 회고"],
    useCase: "아침 시작 루틴, 팀 오프닝 체크, 학습 습관"
  },
  {
    type: "프롬프트",
    title: "AI 작업 프롬프트",
    description: "자주 쓰는 프롬프트를 카드로 모아 두고 바로 복사해 씁니다.",
    badge: "PROMPT",
    accentClass: "accent-violet",
    lines: ["역할", "목표", "말투", "출력 형식"],
    useCase: "AI 스튜디오, 리서치, 문서 초안 작업"
  },
  {
    type: "맛집 추천",
    title: "지역별 식사 카드",
    description: "동네 기준 추천 리스트를 만들어 팀 외근이나 회의 동선을 줄입니다.",
    badge: "FOOD",
    accentClass: "accent-coral",
    lines: ["서울 금천구", "오늘 점심 후보 3곳", "회의 후 도보 7분"],
    useCase: "팀 외근, 가족 공유, 주말 계획 보드"
  }
];

const MEMO_SAMPLES: MemoSample[] = [
  {
    badge: "NOTE",
    title: "일반 메모 샘플",
    accentClass: "accent-paper",
    content: ["회의 전에 꼭 물어볼 질문 3개", "- 현재 병목은 어디인지", "- 이번 주 목표", "- 필요한 레퍼런스 링크"]
  },
  {
    badge: "LINK",
    title: "하이퍼링크 메모 샘플",
    accentClass: "accent-mint",
    content: ["OpenAI API 최신 가이드 확인", "클라이언트 발표 전에 참고할 문서 링크"],
    link: { href: "https://platform.openai.com/docs", label: "platform.openai.com/docs" }
  },
  {
    badge: "IMAGE",
    title: "이미지 메모 샘플",
    accentClass: "accent-rose",
    content: ["무드보드 참고 이미지", "광고 비주얼 톤과 조명 방향을 카드 하나에 같이 기록"],
    image:
      "https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80"
  }
];

const HERO_PREVIEW_WIDGETS: HeroPreviewWidget[] = [
  {
    kind: "note",
    badge: "NOTE",
    title: "빠른 메모",
    accentClass: "accent-paper",
    subtitle: "회의 전 질문 3개"
  },
  {
    kind: "bookmark",
    badge: "BOOKMARK",
    title: "자주 여는 링크",
    accentClass: "accent-sand",
    lines: ["OpenAI Docs", "platform.openai.com"]
  },
  {
    kind: "todo",
    badge: "TODO",
    title: "오늘 할 일",
    accentClass: "accent-mint",
    lines: ["회의 자료 정리", "피드백 반영"]
  },
  {
    kind: "countdown",
    badge: "COUNTDOWN",
    title: "런칭 카운트다운",
    accentClass: "accent-rose",
    value: "D-12",
    subtitle: "프로젝트 오픈"
  },
  {
    kind: "timetable",
    badge: "TIMETABLE",
    title: "주간 스케줄",
    accentClass: "accent-blue",
    lines: ["월 09:00 기획 회의", "수 13:00 촬영"]
  },
  {
    kind: "weather",
    badge: "WEATHER",
    title: "오늘 날씨",
    accentClass: "accent-sky",
    value: "17°",
    chips: ["서울", "오후 흐림"]
  }
];

const renderHeroPreviewWidget = (widget: HeroPreviewWidget) => {
  if (widget.kind === "todo") {
    return (
      <>
        <span className="landing-widget-mini-badge">{widget.badge}</span>
        <strong>{widget.title}</strong>
        <div className="landing-mini-todo-list">
          {(widget.lines ?? []).map((line, index) => (
            <div key={line} className="landing-mini-todo-item">
              <span className={`landing-mini-check ${index === 0 ? "checked" : ""}`.trim()}>{index === 0 ? "✓" : ""}</span>
              <p>{line}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (widget.kind === "countdown") {
    return (
      <>
        <span className="landing-widget-mini-badge">{widget.badge}</span>
        <strong>{widget.title}</strong>
        <div className="landing-mini-countdown">
          <span className="landing-mini-countdown-value">{widget.value}</span>
          <p>{widget.subtitle}</p>
        </div>
      </>
    );
  }

  if (widget.kind === "timetable") {
    return (
      <>
        <span className="landing-widget-mini-badge">{widget.badge}</span>
        <strong>{widget.title}</strong>
        <div className="landing-mini-schedule">
          {(widget.lines ?? []).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </>
    );
  }

  if (widget.kind === "weather") {
    return (
      <>
        <span className="landing-widget-mini-badge">{widget.badge}</span>
        <strong>{widget.title}</strong>
        <div className="landing-mini-weather">
          <span className="landing-mini-weather-temp">{widget.value}</span>
          <div className="landing-mini-chip-row">
            {(widget.chips ?? []).map((chip) => (
              <span key={chip} className="landing-mini-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </>
    );
  }

  if (widget.kind === "bookmark") {
    return (
      <>
        <span className="landing-widget-mini-badge">{widget.badge}</span>
        <strong>{widget.title}</strong>
        <div className="landing-mini-link-card">
          {(widget.lines ?? []).map((line, index) => (
            <p key={line} className={index === 0 ? "primary" : "secondary"}>
              {line}
            </p>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <span className="landing-widget-mini-badge">{widget.badge}</span>
      <strong>{widget.title}</strong>
      <p>{widget.subtitle}</p>
    </>
  );
};

const SHOWCASE_WIDGETS: ShowcaseWidget[] = [
  {
    kind: "rss",
    badge: "RSS",
    title: "AI 뉴스 피드",
    accentClass: "accent-lavender",
    size: "tall",
    items: [
      { source: "Google News", headline: "멀티모달 에이전트 실무 적용 사례 정리", time: "6분 전" },
      { source: "The Verge", headline: "AI tooling stack이 바뀌는 방식", time: "18분 전" },
      { source: "TechCrunch", headline: "스타트업 운영에 붙는 자동화 루틴", time: "39분 전" }
    ]
  },
  {
    kind: "weather",
    badge: "WEATHER",
    title: "오늘 날씨",
    accentClass: "accent-sky",
    size: "medium",
    location: "서울 금천구",
    temperature: "17°",
    summary: "오후 흐림, 야외 촬영은 오전 우선",
    chips: ["강수 40%", "바람 약함", "체감 16°"]
  },
  {
    kind: "todo",
    badge: "TODO",
    title: "오전 체크리스트",
    accentClass: "accent-mint",
    size: "medium",
    items: [
      { label: "메일 확인", done: true },
      { label: "우선순위 정리", done: true },
      { label: "시안 수정", done: false },
      { label: "공유본 업로드", done: false }
    ]
  },
  {
    kind: "countdown",
    badge: "COUNTDOWN",
    title: "런칭 카운트다운",
    accentClass: "accent-rose",
    size: "short",
    days: "D-12",
    date: "2026.04.14",
    summary: "공유본 최종 점검까지 남은 시간"
  },
  {
    kind: "timetable",
    badge: "TIMETABLE",
    title: "주간 일정",
    accentClass: "accent-blue",
    size: "tall",
    rows: [
      { day: "월", time: "09:00", task: "기획 회의" },
      { day: "수", time: "13:00", task: "촬영 진행" },
      { day: "목", time: "15:30", task: "클라이언트 피드백" },
      { day: "금", time: "17:00", task: "회고 정리" }
    ]
  },
  {
    kind: "delivery",
    badge: "DELIVERY",
    title: "샘플 배송 추적",
    accentClass: "accent-ash",
    size: "medium",
    carrier: "CJ대한통운",
    status: "간선 상차",
    steps: ["집화 완료", "간선 상차", "내일 오후 도착 예정"]
  },
  {
    kind: "focus",
    badge: "FOCUS",
    title: "딥워크 세션",
    accentClass: "accent-burgundy",
    size: "short",
    timer: "25:00",
    current: "현재 2세트째 집중 중",
    next: "다음 휴식 5분"
  },
  {
    kind: "mood",
    badge: "MOOD",
    title: "오늘의 컨디션",
    accentClass: "accent-blush",
    size: "short",
    emoji: "🙂",
    state: "차분함",
    energy: 3,
    note: "회의 전 준비 완료"
  },
  {
    kind: "prompt",
    badge: "PROMPT",
    title: "문서 초안 프롬프트",
    accentClass: "accent-violet",
    size: "medium",
    sections: ["Role: product marketer", "Goal: launch summary", "Tone: concise", "Format: bullets"]
  },
  {
    kind: "bookmark",
    badge: "BOOKMARK",
    title: "바로 열기 링크",
    accentClass: "accent-sand",
    size: "medium",
    links: [
      { label: "OpenAI Docs", host: "platform.openai.com" },
      { label: "Canva Board", host: "canva.com" },
      { label: "GitHub Actions", host: "github.com" }
    ]
  },
  {
    kind: "trend",
    badge: "TREND",
    title: "오늘의 키워드",
    accentClass: "accent-amber",
    size: "short",
    items: ["AI 에이전트", "로봇택시", "온디바이스 모델"]
  },
  {
    kind: "food",
    badge: "FOOD",
    title: "금천구 점심 후보",
    accentClass: "accent-coral",
    size: "medium",
    region: "서울 금천구",
    picks: [
      { name: "도원", meta: "중식 코스 · 7분" },
      { name: "면식당", meta: "국수 · 5분" },
      { name: "국밥집", meta: "빠른 식사 · 4분" }
    ]
  }
];

const renderShowcaseWidget = (widget: ShowcaseWidget) => {
  const cardClassName = `landing-expanded-widget ${widget.accentClass} ${widget.size}`.trim();

  if (widget.kind === "rss") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-rss-feed">
          {widget.items.map((item) => (
            <article key={`${item.source}-${item.headline}`} className="showcase-rss-item">
              <div className="showcase-rss-meta">
                <span>{item.source}</span>
                <span>{item.time}</span>
              </div>
              <strong>{item.headline}</strong>
            </article>
          ))}
        </div>
      </article>
    );
  }

  if (widget.kind === "weather") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-weather-card">
          <p className="showcase-weather-location">{widget.location}</p>
          <div className="showcase-weather-main">
            <strong>{widget.temperature}</strong>
            <span>{widget.summary}</span>
          </div>
          <div className="showcase-chip-row">
            {widget.chips.map((chip) => (
              <span key={chip} className="showcase-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>
      </article>
    );
  }

  if (widget.kind === "todo") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-todo-list">
          {widget.items.map((item) => (
            <div key={item.label} className={`showcase-todo-item ${item.done ? "done" : ""}`.trim()}>
              <span className="showcase-check">{item.done ? "✓" : ""}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (widget.kind === "countdown") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-countdown-card">
          <strong className="showcase-countdown-days">{widget.days}</strong>
          <p>{widget.summary}</p>
          <span className="showcase-countdown-date">{widget.date}</span>
        </div>
      </article>
    );
  }

  if (widget.kind === "timetable") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-timetable">
          {widget.rows.map((row) => (
            <div key={`${row.day}-${row.time}-${row.task}`} className="showcase-timetable-row">
              <span>{row.day}</span>
              <span>{row.time}</span>
              <strong>{row.task}</strong>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (widget.kind === "delivery") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-delivery-card">
          <div className="showcase-delivery-meta">
            <span>{widget.carrier}</span>
            <strong>{widget.status}</strong>
          </div>
          <div className="showcase-delivery-steps">
            {widget.steps.map((step, index) => (
              <div key={step} className="showcase-delivery-step">
                <span className="showcase-delivery-dot">{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </div>
      </article>
    );
  }

  if (widget.kind === "focus") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-focus-card">
          <div className="showcase-focus-ring">
            <strong>{widget.timer}</strong>
          </div>
          <p>{widget.current}</p>
          <span>{widget.next}</span>
        </div>
      </article>
    );
  }

  if (widget.kind === "mood") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-mood-card">
          <div className="showcase-mood-top">
            <span className="showcase-mood-emoji">{widget.emoji}</span>
            <div>
              <strong>{widget.state}</strong>
              <p>{widget.note}</p>
            </div>
          </div>
          <div className="showcase-energy-bar">
            <span style={{ width: `${widget.energy * 20}%` }} />
          </div>
        </div>
      </article>
    );
  }

  if (widget.kind === "prompt") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <pre className="showcase-prompt-card">{widget.sections.join("\n")}</pre>
      </article>
    );
  }

  if (widget.kind === "bookmark") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-bookmark-list">
          {widget.links.map((link) => (
            <div key={link.label} className="showcase-bookmark-item">
              <strong>{link.label}</strong>
              <span>{link.host}</span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  if (widget.kind === "trend") {
    return (
      <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
        <div className="landing-expanded-widget-head">
          <span>{widget.badge}</span>
          <strong>{widget.title}</strong>
        </div>
        <div className="showcase-trend-list">
          {widget.items.map((item, index) => (
            <div key={item} className="showcase-trend-item">
              <span>{index + 1}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </article>
    );
  }

  return (
    <article key={`${widget.badge}-${widget.title}`} className={cardClassName}>
      <div className="landing-expanded-widget-head">
        <span>{widget.badge}</span>
        <strong>{widget.title}</strong>
      </div>
      <div className="showcase-food-card">
        <p className="showcase-food-region">{widget.region}</p>
        {widget.picks.map((pick) => (
          <div key={pick.name} className="showcase-food-item">
            <strong>{pick.name}</strong>
            <span>{pick.meta}</span>
          </div>
        ))}
      </div>
    </article>
  );
};

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
                링크 몇 개 저장하는 수준이 아니라, 메모와 체크리스트와 날씨와 RSS와 배송 추적까지 한 보드 안에
                같이 놓고 보는 작업공간입니다.
              </p>
              <div className="landing-cta">
                <button className="landing-cta-primary" onClick={handleGoogleLogin}>
                  무료로 바로 시작
                </button>
                <a className="landing-cta-secondary" href="#widget-gallery">
                  위젯 전체 보기
                </a>
              </div>
              <div className="landing-proof-strip" aria-label="주요 특성">
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
                {HERO_PREVIEW_WIDGETS.map((widget) => (
                  <article key={widget.badge} className={`landing-widget-mini-card ${widget.accentClass}`}>
                    {renderHeroPreviewWidget(widget)}
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
                어떤 보드를 만들 수 있는지 설명 대신 샘플 카드와 실제 내용으로 바로 보여줍니다.
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
                    <div className="landing-widget-usecase">
                      <span>이럴 때 씁니다</span>
                      <strong>{widget.useCase}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-memo-showcase">
          <div className="landing-memo-showcase-inner">
            <div className="landing-section-header left">
              <p className="landing-section-kicker">MEMO CONTENT EXAMPLES</p>
              <h2>메모 안에 실제로 무엇이 들어가는지까지 같이 보여줍니다</h2>
              <p className="landing-section-desc">
                텍스트만 적는 메모가 아니라 링크가 붙고 이미지가 붙는 카드까지, 실제 사용 장면을 랜딩에서 바로
                확인할 수 있습니다.
              </p>
            </div>

            <div className="landing-memo-grid">
              {MEMO_SAMPLES.map((memo) => (
                <article key={memo.title} className={`landing-note-card ${memo.accentClass}`}>
                  <div className="landing-note-head">
                    <span>{memo.badge}</span>
                    <strong>{memo.title}</strong>
                  </div>
                  <div className="landing-note-body">
                    {memo.content.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                    {memo.link ? (
                      <a className="landing-note-link" href={memo.link.href} target="_blank" rel="noreferrer">
                        {memo.link.label}
                      </a>
                    ) : null}
                    {memo.image ? <img className="landing-note-image" src={memo.image} alt={memo.title} /> : null}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-expanded-wall">
          <div className="landing-expanded-wall-inner">
            <div className="landing-section-header left">
              <p className="landing-section-kicker">REAL WIDGET PREVIEW</p>
              <h2>아래 카드들은 메모가 아니라 실제 위젯이 어떻게 보이는지에 더 가깝습니다</h2>
              <p className="landing-section-desc">
                RSS, 날씨, 체크리스트, 시간표, 배송 추적, 프롬프트처럼 실제 위젯 레이아웃을 그대로 축약해서
                보여줍니다.
              </p>
            </div>

            <div className="landing-expanded-board">
              {SHOWCASE_WIDGETS.map((widget) => renderShowcaseWidget(widget))}
            </div>
          </div>
        </section>

        <section className="landing-showcase">
          <div className="landing-showcase-inner">
            <p className="landing-section-kicker">WHY IT FEELS DIFFERENT</p>
            <h2>보드는 하나인데 메모장과 대시보드와 위키가 같이 움직입니다</h2>
            <p>
              메모 따로, 링크 따로, 피드 따로 여는 구조가 아니라 자주 확인하는 정보 블록을 한 보드에 같이 쌓는
              방식입니다. 그래서 랜딩도 기능 설명보다 샘플 카드와 실제 내용을 먼저 보여 주는 쪽이 맞습니다.
            </p>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-final-cta-inner">
            <h2>마음에 드는 조합을 바로 자기 보드로 가져가면 됩니다</h2>
            <p>로그인하면 메모, 위젯, 문서 카드를 한 화면에 배치한 자기 작업 보드를 곧바로 시작할 수 있습니다.</p>
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
