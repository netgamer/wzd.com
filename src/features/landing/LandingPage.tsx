import { useState } from "react";
import { supabase } from "../../lib/supabase";

type AuthUserProfile = {
  id: string;
  email: string;
};

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
  rssSource?: string;
  rssPreview?: Array<{ headline: string; time: string }>;
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

type FirstPagePreset = {
  key: "creator" | "research" | "operator";
  label: string;
  title: string;
  description: string;
  firstOpen: string;
  bookmarkStack: string;
  rssStack: string;
  proofPoints: string[];
  heroWidgets: HeroPreviewWidget[];
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
    title: "브라우저 새 탭 대신 내 첫 페이지로",
    description: "검색창만 있는 기본 시작페이지 대신, 내가 늘 먼저 여는 링크와 읽을거리가 바로 뜨는 개인화 첫 페이지를 만듭니다."
  },
  {
    icon: "02",
    title: "북마크와 RSS만 먼저 보이게",
    description: "자주 가는 사이트와 매일 확인하는 피드를 한 화면에 모아, 브라우저를 열자마자 필요한 것부터 바로 보이게 합니다."
  },
  {
    icon: "03",
    title: "기본은 개인 페이지, 공유는 그다음",
    description: "핵심은 내가 매일 쓰는 첫 페이지이고, 필요할 때만 링크와 읽을거리를 정리한 페이지처럼 바깥에 보여줄 수 있습니다."
  }
];

const WIDGET_SAMPLES: WidgetSample[] = [
  {
    type: "메모",
    title: "빠른 메모",
    description: "북마크와 RSS 사이에 오늘 기억할 한 줄을 붙여두는 개인 메모 카드입니다.",
    badge: "NOTE",
    accentClass: "accent-paper",
    lines: ["오늘 먼저 볼 링크 2개", "읽고 싶은 글 1개 체크", "https://example.com"],
    useCase: "브라우저를 열자마자 기억해야 할 한 줄을 붙여두는 첫 페이지 메모"
  },
  {
    type: "북마크",
    title: "자주 여는 링크",
    description: "브라우저를 열자마자 가장 먼저 눌러야 하는 링크를 앞줄에 고정합니다.",
    badge: "BOOKMARK",
    accentClass: "accent-sand",
    lines: ["Gmail", "Calendar", "자주 가는 커뮤니티"],
    useCase: "새 탭을 열 때마다 가장 먼저 누르는 링크 묶음"
  },
  {
    type: "체크리스트",
    title: "오늘 할 일",
    description: "첫 화면에서 바로 확인할 가벼운 할 일만 붙여두는 보조 카드입니다.",
    badge: "TODO",
    accentClass: "accent-mint",
    lines: ["[x] 메일 확인", "[ ] 저장 글 2개 읽기", "[ ] 오늘 링크 정리"],
    useCase: "브라우저 첫 화면에서 바로 확인하는 하루 시작 체크"
  },
  {
    type: "날씨",
    title: "오늘 날씨",
    description: "외출 전에 한 번 더 확인하고 싶은 정보를 첫 페이지에 같이 둡니다.",
    badge: "WEATHER",
    accentClass: "accent-sky",
    lines: ["서울 17도", "오후 비 가능성 40%", "퇴근 전에는 맑음"],
    useCase: "메일과 저장 링크를 열기 전에 같이 보는 생활 정보"
  },
  {
    type: "RSS",
    title: "읽을 거리 모음",
    description: "매일 확인하는 RSS 피드를 첫 페이지 앞줄에 꽂아 두고 한곳에서 훑습니다.",
    badge: "RSS",
    accentClass: "accent-lavender",
    lines: ["GeekNews", "디자인 시스템 글", "즐겨보는 블로그"],
    useCase: "북마크를 열기 전에 새 글부터 훑는 아침 루틴",
    rssSource: "GeekNews - 개발/기술/스타트업 뉴스 서비스",
    rssPreview: [
      { headline: "나는 그만둔다. 클랭커들이 이겼다", time: "2026-04-02T15:33:12+09:00" },
      { headline: "DRAM 가격 상승이 취미용 SBC 시장을 위축시키는 중", time: "2026-04-02T14:33:00+09:00" },
      { headline: "Claude Code 소스 유출로 탄생한 OpenClaude", time: "2026-04-02T14:04:20+09:00" }
    ]
  }
];

const MEMO_SAMPLES: MemoSample[] = [
  {
    badge: "NOTE",
    title: "첫 화면 메모 샘플",
    accentClass: "accent-paper",
    content: ["오늘 먼저 확인할 링크 3개", "- 메일", "- 저장 글", "- 저녁 전에 열 문서"]
  },
  {
    badge: "LINK",
    title: "하이퍼링크 메모 샘플",
    accentClass: "accent-mint",
    content: ["오늘 다시 볼 문서 링크", "브라우저 첫 화면에서 바로 열 수 있게 고정"],
    link: { href: "https://platform.openai.com/docs", label: "platform.openai.com/docs" }
  }
];

const FIRST_PAGE_PRESETS: FirstPagePreset[] = [
  {
    key: "creator",
    label: "크리에이터",
    title: "레퍼런스와 저장 링크부터 바로 여는 첫 페이지",
    description: "촬영이나 시안 작업 전에 늘 먼저 여는 북마크와 업계 피드를 같은 첫 화면에 둬서, 새 탭을 열자마자 오늘의 감각을 바로 잡는 조합입니다.",
    firstOpen: "저장한 레퍼런스 링크, 시안 파일, 피드백 문서",
    bookmarkStack: "Figma, Canva, 즐겨찾기 레퍼런스 링크",
    rssStack: "크리에이티브 뉴스, 디자인 글, AI 제작 피드",
    proofPoints: ["늘 여는 링크를 앞줄에 고정", "레퍼런스 RSS를 같은 화면에서 확인", "작업 전 한 줄 메모까지 같이 보기"],
    heroWidgets: [
      {
        kind: "note",
        badge: "NOTE",
        title: "빠른 메모",
        accentClass: "accent-paper",
        subtitle: "오늘 먼저 볼 레퍼런스 3개"
      },
      {
        kind: "bookmark",
        badge: "BOOKMARK",
        title: "자주 여는 링크",
        accentClass: "accent-sand",
        lines: ["Figma Moodboard", "figma.com"]
      },
      {
        kind: "weather",
        badge: "RSS",
        title: "읽을 거리",
        accentClass: "accent-lavender",
        value: "3개",
        chips: ["광고 레퍼런스", "브랜드 뉴스", "AI 제작"]
      },
      {
        kind: "todo",
        badge: "TODO",
        title: "오늘 체크",
        accentClass: "accent-mint",
        lines: ["저장 글 2개 읽기", "피드백 링크 열기"]
      },
      {
        kind: "countdown",
        badge: "COUNTDOWN",
        title: "업로드 일정",
        accentClass: "accent-rose",
        value: "D-03",
        subtitle: "포트폴리오 공개"
      },
      {
        kind: "bookmark",
        badge: "BOOKMARK",
        title: "보조 링크",
        accentClass: "accent-blue",
        lines: ["Behance Saved", "behance.net"]
      }
    ]
  },
  {
    key: "research",
    label: "리서처",
    title: "읽을거리와 저장 링크를 같이 여는 리서치 첫 페이지",
    description: "논문, 아티클, 저장해 둔 문서를 브라우저 첫 화면에서 바로 이어 읽게 해서 북마크와 RSS가 따로 놀지 않도록 만든 조합입니다.",
    firstOpen: "저장한 아티클, 논문 링크, 정리할 메모",
    bookmarkStack: "ArXiv, 수업 문서, 저장한 자료 링크",
    rssStack: "기술 뉴스, 공부용 블로그, 관심 주제 업데이트",
    proofPoints: ["읽을 자료를 먼저 고정", "새 글을 RSS에서 바로 확인", "읽으면서 메모를 한곳에 붙여두기"],
    heroWidgets: [
      {
        kind: "note",
        badge: "NOTE",
        title: "오늘 읽을 것",
        accentClass: "accent-paper",
        subtitle: "오늘 먼저 읽을 논문 2개"
      },
      {
        kind: "bookmark",
        badge: "BOOKMARK",
        title: "저장한 자료",
        accentClass: "accent-sand",
        lines: ["ArXiv Reading List", "arxiv.org"]
      },
      {
        kind: "weather",
        badge: "RSS",
        title: "업데이트 피드",
        accentClass: "accent-lavender",
        value: "4개",
        chips: ["ML 뉴스", "HCI 블로그", "GeekNews"]
      },
      {
        kind: "todo",
        badge: "TODO",
        title: "읽기 루틴",
        accentClass: "accent-mint",
        lines: ["핵심 문장 저장", "메모 3줄 정리"]
      },
      {
        kind: "countdown",
        badge: "COUNTDOWN",
        title: "세미나 일정",
        accentClass: "accent-rose",
        value: "D-09",
        subtitle: "발표 초안 마감"
      },
      {
        kind: "bookmark",
        badge: "BOOKMARK",
        title: "보조 링크",
        accentClass: "accent-blue",
        lines: ["Course Notes", "docs.google.com"]
      }
    ]
  },
  {
    key: "operator",
    label: "데일리",
    title: "매일 여는 생활 링크와 읽을거리를 묶은 첫 페이지",
    description: "메일, 캘린더, 커뮤니티, 관심 피드를 첫 화면에 모아 두고 새 탭을 열 때마다 같은 순서로 하루를 시작하는 조합입니다.",
    firstOpen: "메일, 캘린더, 저장한 링크, 오늘 읽을 피드",
    bookmarkStack: "Gmail, Calendar, 자주 가는 커뮤니티",
    rssStack: "관심 뉴스, 즐겨보는 블로그, 지역 정보 피드",
    proofPoints: ["생활 링크를 한 화면에 고정", "RSS를 새 탭에서 바로 확인", "하루 시작용 체크 카드 함께 두기"],
    heroWidgets: [
      {
        kind: "note",
        badge: "NOTE",
        title: "오늘 메모",
        accentClass: "accent-paper",
        subtitle: "출근 전에 확인할 것 3개"
      },
      {
        kind: "bookmark",
        badge: "BOOKMARK",
        title: "바로 열기",
        accentClass: "accent-sand",
        lines: ["Gmail Inbox", "mail.google.com"]
      },
      {
        kind: "weather",
        badge: "RSS",
        title: "오늘 읽을 피드",
        accentClass: "accent-lavender",
        value: "3개",
        chips: ["로컬 뉴스", "즐겨찾는 블로그", "GeekNews"]
      },
      {
        kind: "todo",
        badge: "TODO",
        title: "하루 시작",
        accentClass: "accent-mint",
        lines: ["메일 정리", "저장 글 1개 읽기"]
      },
      {
        kind: "countdown",
        badge: "COUNTDOWN",
        title: "이번 주 일정",
        accentClass: "accent-rose",
        value: "D-02",
        subtitle: "주말 약속 준비"
      },
      {
        kind: "bookmark",
        badge: "BOOKMARK",
        title: "자주 가는 곳",
        accentClass: "accent-blue",
        lines: ["Community Board", "dcinside.com"]
      }
    ]
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
    title: "오늘 읽을 RSS",
    accentClass: "accent-lavender",
    size: "tall",
    items: [
      { source: "GeekNews", headline: "개발자가 아침에 훑기 좋은 기술 뉴스 묶음", time: "6분 전" },
      { source: "Google News", headline: "오늘 바로 읽고 싶은 AI 관련 기사 정리", time: "18분 전" },
      { source: "The Verge", headline: "브라우저 첫 화면에 두면 좋은 읽을거리 흐름", time: "39분 전" }
    ]
  },
  {
    kind: "bookmark",
    badge: "BOOKMARK",
    title: "자주 여는 북마크",
    accentClass: "accent-sand",
    size: "medium",
    links: [
      { label: "Gmail", host: "mail.google.com" },
      { label: "Calendar", host: "calendar.google.com" },
      { label: "Saved Links", host: "notion.so" }
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
    title: "하루 시작 체크",
    accentClass: "accent-mint",
    size: "medium",
    items: [
      { label: "메일 확인", done: true },
      { label: "RSS 새 글 확인", done: true },
      { label: "저장 링크 2개 열기", done: false },
      { label: "오늘 메모 정리", done: false }
    ]
  },
  {
    kind: "countdown",
    badge: "COUNTDOWN",
    title: "이번 주 일정",
    accentClass: "accent-rose",
    size: "short",
    days: "D-02",
    date: "2026.04.16",
    summary: "이번 주 약속이나 마감까지 남은 시간"
  }
];

const SHARED_BOARD_WIDGETS: ShowcaseWidget[] = [
  {
    kind: "bookmark",
    badge: "BOOKMARK",
    title: "공유 링크 모음",
    accentClass: "accent-sand",
    size: "medium",
    links: [
      { label: "포트폴리오", host: "behance.net" },
      { label: "읽을거리 모음", host: "notion.so" },
      { label: "추천 링크", host: "github.com" }
    ]
  },
  {
    kind: "rss",
    badge: "RSS",
    title: "읽을거리 공유",
    accentClass: "accent-lavender",
    size: "tall",
    items: [
      { source: "GeekNews", headline: "같이 보면 좋은 기술 글을 RSS로 묶어 공유", time: "12분 전" },
      { source: "Google News", headline: "관심 주제 뉴스를 링크페이지처럼 함께 보여주기", time: "28분 전" },
      { source: "The Verge", headline: "즐겨 읽는 소스를 한 페이지에서 소개하는 방식", time: "51분 전" }
    ]
  },
  {
    kind: "todo",
    badge: "TODO",
    title: "먼저 보면 좋은 것",
    accentClass: "accent-mint",
    size: "medium",
    items: [
      { label: "대표 링크 3개 고정", done: true },
      { label: "읽을거리 피드 연결", done: true },
      { label: "짧은 소개 메모 추가", done: false }
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

const renderWidgetSample = (widget: WidgetSample) => {
  const cardClassName = `landing-widget-sample ${widget.accentClass} ${widget.badge === "RSS" ? "landing-widget-sample-rss" : ""}`.trim();

  return (
    <article key={widget.badge} className={cardClassName}>
      <div className="landing-widget-sample-head">
        <span className="landing-widget-sample-type">{widget.type}</span>
        <span className="landing-widget-sample-badge">{widget.badge}</span>
      </div>
      <div className="landing-widget-sample-body">
        <h3>{widget.title}</h3>
        <p>{widget.description}</p>
        {widget.badge === "RSS" && widget.rssPreview && widget.rssSource ? (
          <div className="landing-widget-rss-block">
            <strong className="landing-widget-rss-title">긱뉴스</strong>
            <span className="landing-widget-rss-source">{widget.rssSource}</span>
            <div className="landing-widget-rss-feed">
              {widget.rssPreview.map((item) => (
                <article key={`${item.time}-${item.headline}`} className="landing-widget-rss-item">
                  <strong className="landing-widget-rss-item-title">{item.headline}</strong>
                  <span className="landing-widget-rss-item-date">{item.time}</span>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <ul className="landing-widget-sample-list">
            {widget.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div className="landing-widget-usecase">
          <span>이럴 때 씁니다</span>
          <strong>{widget.useCase}</strong>
        </div>
      </div>
    </article>
  );
};

type LandingPageProps = {
  user?: AuthUserProfile | null;
  onOpenWorkspace?: () => void;
};

const LandingPage = ({ user = null, onOpenWorkspace }: LandingPageProps) => {
  const [activePresetKey, setActivePresetKey] = useState<FirstPagePreset["key"]>("creator");

  const handleGoogleLogin = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  const activePreset = FIRST_PAGE_PRESETS.find((preset) => preset.key === activePresetKey) ?? FIRST_PAGE_PRESETS[0];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-logo-lockup">
            <div className="landing-logo">WZD</div>
            <span>브라우저를 열면 가장 먼저 보고 싶은 개인화 첫 페이지</span>
          </div>
          {user ? (
            <button className="landing-profile-btn" onClick={onOpenWorkspace}>
              <span className="landing-profile-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
            </button>
          ) : (
            <button className="landing-login-btn" onClick={handleGoogleLogin}>
              Google로 시작하기
            </button>
          )}
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-copy">
              <p className="landing-kicker">PERSONALIZED FIRST PAGE</p>
              <h1 className="landing-title">
                북마크와 RSS가 먼저 뜨는
                <br />
                내 브라우저 첫 페이지
              </h1>
              <p className="landing-subtitle">
                새 탭을 열자마자 늘 먼저 보는 링크와 매일 확인하는 읽을거리를 한 화면에 모아두고, 내 루틴대로 배치해서 쓰는 개인화 첫 페이지입니다.
              </p>
              <div className="landing-preset-picker" aria-label="첫 페이지 프리셋 선택">
                {FIRST_PAGE_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className={`landing-preset-chip ${preset.key === activePreset.key ? "active" : ""}`.trim()}
                    onClick={() => setActivePresetKey(preset.key)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="landing-preset-summary">
                <p className="landing-preset-eyebrow">PERSONALIZED PRESET</p>
                <strong>{activePreset.title}</strong>
                <p>{activePreset.description}</p>
                <div className="landing-preset-meta">
                  <article>
                    <span>처음 여는 것</span>
                    <strong>{activePreset.firstOpen}</strong>
                  </article>
                  <article>
                    <span>북마크 묶음</span>
                    <strong>{activePreset.bookmarkStack}</strong>
                  </article>
                  <article>
                    <span>RSS 묶음</span>
                    <strong>{activePreset.rssStack}</strong>
                  </article>
                </div>
              </div>
              <div className="landing-cta">
                <button className="landing-cta-primary" onClick={handleGoogleLogin}>
                  무료로 바로 시작
                </button>
                <a className="landing-cta-secondary" href="#widget-gallery">
                  첫 페이지 샘플 보기
                </a>
              </div>
              <div className="landing-support-links">
                <a href="/updates">최근 제품 업데이트 보기</a>
              </div>
              <div className="landing-proof-strip" aria-label="주요 특성">
                {activePreset.proofPoints.map((point) => (
                  <span key={point}>{point}</span>
                ))}
              </div>
            </div>
            <div className="landing-hero-panel">
              <div className="landing-hero-panel-head">
                <span>{activePreset.label} 프리셋</span>
                <strong>{activePreset.title}</strong>
              </div>
              <div className="landing-hero-mini-grid">
                {activePreset.heroWidgets.map((widget) => (
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
              <p className="landing-section-kicker">FIRST PAGE PREVIEW</p>
              <h2>북마크와 RSS가 앞에 오는 첫 페이지 구성을 바로 보세요</h2>
              <p className="landing-section-desc">
                가장 자주 여는 링크, 매일 훑는 피드, 짧은 메모 몇 개만 앞에 둔 구성을 먼저 보여줘서 WZD가 어떤 브라우저 첫 페이지인지 바로 이해할 수 있습니다.
              </p>
            </div>

            <div className="landing-unified-board">
              {MEMO_SAMPLES.map((memo) => (
                <article key={memo.title} className={`landing-note-card landing-unified-card ${memo.accentClass}`}>
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
              {SHOWCASE_WIDGETS.map((widget) => renderShowcaseWidget(widget))}
              {WIDGET_SAMPLES.map((widget) => renderWidgetSample(widget))}
            </div>
          </div>
        </section>

        <section className="landing-shared-board">
          <div className="landing-shared-board-inner">
            <div className="landing-section-header left">
              <p className="landing-section-kicker">SHAREABLE PAGE</p>
              <h2>원하면 이렇게 북마크와 읽을거리를 보여주는 페이지로도 이어집니다</h2>
              <p className="landing-section-desc">
                기본은 내가 매일 보는 첫 페이지지만, 필요할 때는 저장한 링크와 읽을거리를 정리한 페이지처럼 다른 사람에게 보여주는 용도로도 이어집니다.
              </p>
            </div>

            <div className="landing-shared-board-grid">
              {SHARED_BOARD_WIDGETS.map((widget) => renderShowcaseWidget(widget))}
            </div>
          </div>
        </section>

        <section className="landing-showcase">
          <div className="landing-showcase-inner">
            <p className="landing-section-kicker">WHY IT FEELS DIFFERENT</p>
            <h2>기본 새 탭보다 더 유용하고, 링크 모음보다 더 자주 쓰게 되는 화면입니다</h2>
            <p>
              검색창만 있는 기본 화면이나 링크 몇 개만 나열된 페이지가 아니라, 내가 실제로 자주 여는 링크와 읽을거리를
              내 순서대로 정리해두는 브라우저 첫 화면이라는 점이 WZD의 차별점입니다.
            </p>
          </div>
        </section>

        <section className="landing-final-cta">
          <div className="landing-final-cta-inner">
            <h2>이제 브라우저 첫 화면을 네 북마크와 피드 기준으로 바꾸면 됩니다</h2>
            <p>로그인하면 자주 여는 북마크와 RSS를 모아 둔 나만의 첫 페이지를 바로 시작할 수 있습니다.</p>
            <button className="landing-cta-primary" onClick={handleGoogleLogin}>
              Google로 시작하기
            </button>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <span className="landing-footer-logo">WZD</span>
          <a className="landing-footer-link" href="/updates">
            Updates
          </a>
          <span className="landing-footer-copy">2026 WZD. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
