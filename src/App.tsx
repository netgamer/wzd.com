import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import BoardCatCompanion, { type CatRemoteAction, type CatRemoteCommand } from "./components/BoardCatCompanion";
import BoardPage from "./features/board/BoardPage";
import HomePage from "./features/home/HomePage";
import InsightReaderPage from "./features/insight/InsightReaderPage";
import LandingPage from "./features/landing/LandingPage";
import MarketPage from "./features/market/MarketPage";
import SharePage from "./features/share/SharePage";
import UpdateDetailPage from "./features/updates/UpdateDetailPage";
import UpdatesIndexPage from "./features/updates/UpdatesIndexPage";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { runAgentChat } from "./lib/agent";
import { fetchDeliveryCarriers, fetchDeliveryTracking, type DeliveryCarrier, type DeliveryTrackingPreview } from "./lib/delivery";
import { fetchLinkPreview, getImageProxyUrl, type LinkPreview } from "./lib/link-preview";
import { fetchRssFeed, type RssFeedPreview, type RssItem } from "./lib/rss";
import { fetchSocialFeed, type SocialFeedPreview } from "./lib/social";
import { measureInternetSpeed, type InternetSpeedPreview } from "./lib/speed";
import { fetchTrendingKeywords, type TrendingPreview } from "./lib/trending";
import { fetchWeatherPreview, type WeatherPreview } from "./lib/weather";
import {
  getInitialSiteLanguage,
  getSiteLanguageOption,
  persistSiteLanguage,
  SITE_LANGUAGE_OPTIONS,
  type SiteLanguage
} from "./lib/site-language";
import {
  type BoardBackgroundStyle,
  type BoardMemberProfile,
  type BoardUserProfile,
  createBoardV2,
  type BoardV2,
  inviteBoardMember,
  isBoardShareSlugTaken,
  listBoardMembers,
  loadBoardNotesV2,
  loadBoardShellsV2,
  loadBoardsV2,
  loadEditableHomeBoardV2,
  loadEditableSharedBoardV2,
  loadHomeBoardV2,
  loadSharedBoardV2,
  type NoteColor,
  type NoteV2,
  saveBoardsV2,
  searchUserProfiles,
  syncUserProfile,
  updateBoard
} from "./lib/supabase-board-v2";

interface AuthUserProfile {
  id: string;
  email: string;
}

interface LocalSnapshot {
  boards: BoardV2[];
  notes: NoteV2[];
  selectedBoardId: string | null;
}

const replaceBoardNotes = (currentNotes: NoteV2[], boardId: string, nextBoardNotes: NoteV2[]) => [
  ...currentNotes.filter((note) => note.boardId !== boardId),
  ...nextBoardNotes
];

type YouTubePlayerInstance = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
};

type YouTubePlayerStatic = new (
  element: HTMLElement,
  options: {
    videoId: string;
    width?: string;
    height?: string;
    playerVars?: Record<string, string | number>;
    events?: {
      onReady?: (event: { target: YouTubePlayerInstance }) => void;
      onStateChange?: (event: { data: number; target: YouTubePlayerInstance }) => void;
      onError?: () => void;
    };
  }
) => YouTubePlayerInstance;

declare global {
  interface Window {
    YT?: {
      Player: YouTubePlayerStatic;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type NoteFontSize = 14 | 16 | 18 | 20;
type FeedMode = "active" | "archived";
type CloudSaveState = "idle" | "saving" | "saved" | "error";
type LinkPreviewState = LinkPreview | null;
type RssFeedState = RssFeedPreview | null;
type SocialFeedState = SocialFeedPreview | null;
type WeatherState = WeatherPreview | null;
type SpeedState = InternetSpeedPreview | null;
type TrendingState = TrendingPreview | null;
type DeliveryState = DeliveryTrackingPreview | null;
type WidgetType =
  | "note"
  | "brain"
  | "rss"
  | "social"
  | "bookmark"
  | "checklist"
  | "countdown"
  | "timetable"
  | "player"
  | "calculator"
  | "clock"
  | "speed"
  | "profile"
  | "weather"
  | "trending"
  | "delivery"
  | "pet"
  | "cover"
  | "document"
  | "focus"
  | "mood"
  | "routine"
  | "prompt"
  | "food"
  | "blog";
type DocumentWidgetVariant = "hero" | "section" | "feature" | "cta";
type ClockWidgetMode = "digital" | "analog";
type CalculatorOperator = "+" | "-" | "×" | "÷";
type ChecklistItem = { text: string; checked: boolean };
type TimetableEntry = { day: string; start: string; end: string; title: string; location: string };
type FoodCategoryKey = "chef" | "instagram" | "trending";
type AgentRole = "developer" | "planner" | "pm";
type FoodRecommendation = {
  name: string;
  menu: string;
  summary: string;
};
type BoardTemplateKey =
  | "blank"
  | "video"
  | "work"
  | "study"
  | "tips"
  | "linktree"
  | "homepage"
  | "bookmark"
  | "rss"
  | "frame"
  | "ai-share"
  | "aistudio"
  | "group-chat"
  | "family"
  | "couple"
  | "insta-ai"
  | "youtube-curation"
  | "prompt-vault";
type BoardTemplateSectionKey = "notes" | "widgets" | "groups" | "curation";
type WidgetGalleryCategory = "collect" | "organize" | "utility" | "identity";
type BoardLayoutStyle = "balanced" | "compact" | "visual";
type SettingsSection = "menu" | "trash" | "history";
type BoardThemeId = "focus-desk" | "glass-studio" | "midnight-ops" | "creator-mood" | "neon-lab" | "cozy-room";
type SubscriptionTier = "free" | "starter-5" | "pro-10";

type BoardHistorySnapshot = {
  id: string;
  createdAt: string;
  label: string;
  boardTitle: string;
  boardDescription: string;
  backgroundStyle: BoardBackgroundStyle;
  layoutStyle: BoardLayoutStyle;
  notes: NoteV2[];
};

type TemplateNoteSeed = {
  color: NoteColor;
  content: string;
  metadata?: Record<string, unknown>;
};

type BoardTemplateDefinition = {
  key: BoardTemplateKey;
  title: string;
  subtitle: string;
  tag: string;
  audience: string;
  highlights: string[];
  backgroundStyle: BoardBackgroundStyle;
  layoutStyle?: BoardLayoutStyle;
  notes: TemplateNoteSeed[];
};

const HOME_ADMIN_EMAIL = (import.meta.env.VITE_HOME_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() || "leejunho2638@gmail.com";
const HOME_FALLBACK_OWNER_ID = "wzd-home-owner";

type BoardTemplateSection = {
  key: BoardTemplateSectionKey;
  title: string;
  subtitle: string;
  templateKeys: BoardTemplateKey[];
};

type WidgetGalleryItemDefinition = {
  type: WidgetType;
  title: string;
  subtitle: string;
  kicker: string;
  previewTitle: string;
  previewLines: string[];
  previewMeta?: string;
  accent: string;
};

type WidgetGallerySectionDefinition = {
  key: WidgetGalleryCategory;
  title: string;
  subtitle: string;
  items: WidgetGalleryItemDefinition[];
};

const EditIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4 20h4l10.5-10.5a1.41 1.41 0 0 0 0-2L16.5 5a1.41 1.41 0 0 0-2 0L4 15.5V20Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.5 6.5l4 4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TrashIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4 7h16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 3h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6 7l1 13h10l1-13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M10 11v5M14 11v5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M10.52 4.08c.69-1.44 2.27-1.44 2.96 0l.28.59c.2.41.67.61 1.11.48l.64-.19c1.56-.46 2.68.66 2.22 2.22l-.19.64c-.13.44.07.91.48 1.11l.59.28c1.44.69 1.44 2.27 0 2.96l-.59.28c-.41.2-.61.67-.48 1.11l.19.64c.46 1.56-.66 2.68-2.22 2.22l-.64-.19c-.44-.13-.91.07-1.11.48l-.28.59c-.69 1.44-2.27 1.44-2.96 0l-.28-.59c-.2-.41-.67-.61-1.11-.48l-.64.19c-1.56.46-2.68-.66-2.22-2.22l.19-.64c.13-.44-.07-.91-.48-1.11l-.59-.28c-1.44-.69-1.44-2.27 0-2.96l.59-.28c.41-.2.61-.67.48-1.11l-.19-.64c-.46-1.56.66-2.68 2.22-2.22l.64.19c.44.13.91-.07 1.11-.48l.28-.59Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="12"
      r="3"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M4.5 10.5 12 4l7.5 6.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.5 9.5V20h11V9.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path
      d="M8 17h8l-1.1-1.5V11a4.9 4.9 0 1 0-9.8 0v4.5L8 17Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M10.5 19a1.7 1.7 0 0 0 3 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LOCAL_STORAGE_KEY = "wzd-board-v2-local";
const LAST_VIEWED_BOARD_KEY = "wzd-board-v2-last-viewed";
const SUBSCRIPTION_TIER_KEY = "wzd-board-v2-subscription-tier";
const INITIAL_VISIBLE_NOTE_COUNT = 8;
const VISIBLE_NOTE_BATCH_SIZE = 12;
const DEFAULT_FONT_SIZE: NoteFontSize = 16;
const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue", "green", "orange", "purple", "mint", "white"];
const CLOUD_SAVE_DEBOUNCE_MS = 120;
const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const BOARD_HISTORY_LIMIT = 20;
const SETTINGS_PANEL_ANIMATION_MS = 220;
const MOBILE_LAYOUT_BREAKPOINT = 980;
const MOBILE_SINGLE_COLUMN_BREAKPOINT = 680;
const COMPACT_SIDEBAR_BREAKPOINT = 1120;
const DEFAULT_RSS_FEED_URL = "https://news.google.com/rss/search?q=AI&hl=ko&gl=KR&ceid=KR:ko";
const BLOG_FEED_URL = "https://netgamer.github.io/wzd-blog-platform/index.xml";
const DEFAULT_SOCIAL_SOURCE = "https://bsky.app/profile/openai.com";
const DEFAULT_BOOKMARK_URL = "https://";
const DEFAULT_CHECKLIST_ITEMS: ChecklistItem[] = [
  { text: "핵심 작업 정리", checked: false },
  { text: "참고 링크 확인", checked: false },
  { text: "완료 후 공유", checked: false }
];
const DEFAULT_NEW_NOTE_CONTENT = "새 메모";
const MAX_BOARD_TITLE_LENGTH = 32;
const DEFAULT_PERSONAL_NOTE_CONTENT =
  "개인 메모장\n\n간단한 메모, 북마크, 이미지 URL을 모아두는 공간입니다.\nhttps://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80";
const DEFAULT_GROUP_NOTE_CONTENT =
  "그룹 메모장\n\n주제별 보드에서 각자 찾은 링크와 자료를 함께 공유해보세요.\n예: AI Studio 레퍼런스 모음";
const DEFAULT_TIMETABLE_TEXT = [
  "월|09:00|10:00|기획 회의|회의실 A",
  "화|10:30|11:30|자료 조사|온라인",
  "수|13:00|14:30|콘텐츠 제작|스튜디오",
  "목|15:00|16:00|피드백 정리|노트북",
  "금|16:30|17:30|다음 주 준비|라운지"
].join("\n");
const DEFAULT_PLAYER_ARTIST = "Unknown Artist";
const DEFAULT_PLAYER_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const DEFAULT_CALCULATOR_DISPLAY = "0";
const DEFAULT_CLOCK_MODE: ClockWidgetMode = "digital";
const DEFAULT_SPEED_LABEL = "내 네트워크";
const DEFAULT_PROFILE_NAME = "홍길동";
const DEFAULT_PROFILE_BIRTHDATE = "1995-05-12";
const DEFAULT_PROFILE_OCCUPATION = "기획자";
const DEFAULT_PROFILE_IMAGE_URL =
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=640&q=80";
const DEFAULT_WEATHER_QUERY = "서울";
const DEFAULT_TRENDING_REGION = "KR";
const DEFAULT_DELIVERY_CARRIER = "kr.cjlogistics";
const DEFAULT_PET_NAME = "모찌";
const DEFAULT_COVER_SUBTITLE = "링크와 메모를 한 장의 보드로 정리해보세요.";
const DEFAULT_DOCUMENT_KICKER = "";
const DEFAULT_DOCUMENT_BODY =
  "말뿐인 구상을 빠르게 검증 가능한 프로토타입으로 바꾸는 아이디어 프로토타이퍼입니다.";
const DEFAULT_DOCUMENT_VARIANT: DocumentWidgetVariant = "section";
const DEFAULT_FOCUS_DURATION_MINUTES = 25;
const DEFAULT_MOOD_EMOJI = "🙂";
const DEFAULT_MOOD_NOTE = "오늘의 기분을 짧게 남겨보세요.";
const DEFAULT_MOOD_ENERGY = 3;
const DEFAULT_ROUTINE_ITEMS: ChecklistItem[] = [
  { text: "아침 정리", checked: true },
  { text: "핵심 작업 시작", checked: false },
  { text: "운동 또는 산책", checked: false },
  { text: "하루 회고", checked: false }
];
const DEFAULT_PROMPT_TEXT = `당신은 아이디어를 구조화하는 조력자입니다.

주제:
목표:
톤앤매너:
핵심 포인트 3개:

위 내용을 바탕으로 짧고 명확한 초안을 만들어주세요.`;
const DEFAULT_FOOD_REGION = "서울 금천구";
const DEFAULT_BRAIN_AGENT_TYPE: AgentRole = "planner";
const DEFAULT_BRAIN_PROMPT = "흩어진 메모와 링크를 오늘 할 일 기준으로 정리해줘.";
const DEFAULT_BRAIN_CONTEXT = "이 보드는 개인 작업 보드입니다. 우선순위, 바로 실행할 일, 빠진 정보까지 함께 정리해줘.";
const FOCUS_TICK_INTERVAL_MS = 1000;
const FREE_BOARD_LIMIT = 3;
const PAID_BOARD_LIMIT = 10;
const SUBSCRIPTION_PLANS: Array<{
  key: SubscriptionTier;
  label: string;
  price: string;
  boardLimit: number;
  description: string;
}> = [
  {
    key: "free",
    label: "Free",
    price: "$0",
    boardLimit: FREE_BOARD_LIMIT,
    description: "개인 보드 3개까지 가볍게 시작하는 기본 플랜"
  },
  {
    key: "starter-5",
    label: "Starter",
    price: "$5 / month",
    boardLimit: PAID_BOARD_LIMIT,
    description: "보드 10개까지 확장하고 테마 워크스페이스를 넉넉하게 운영"
  },
  {
    key: "pro-10",
    label: "Pro",
    price: "$10 / month",
    boardLimit: PAID_BOARD_LIMIT,
    description: "보드 10개와 함께 더 강한 작업 흐름을 쓰는 파워 유저용"
  }
];

const FOOD_CATEGORY_LABELS: Record<FoodCategoryKey, string> = {
  chef: "흑백요리사 픽",
  instagram: "인스타 화제",
  trending: "실시간 인기"
};
const HOME_LANDING_NOTE_SEEDS: TemplateNoteSeed[] = [
  {
    color: "white",
    content: "모든 위젯을 한눈에 보는 WZD 샘플 보드",
    metadata: {
      widgetType: "cover",
      coverSubtitle:
        "메모, 북마크, RSS, 할 일, 날씨, 트렌드, 타이머까지. WZD가 어떤 보드인지 첫 화면에서 바로 볼 수 있게 구성했습니다."
    }
  },
  {
    color: "white",
    content: "메모와 위젯을 같은 보드에서",
    metadata: {
      widgetType: "document",
      documentVariant: "hero",
      documentKicker: "ALL WIDGETS AT A GLANCE",
      documentBody:
        "WZD는 메모 앱이 아니라 위젯이 붙는 보드입니다.\n로그인하기 전에 어떤 카드들을 만들 수 있는지 전부 샘플로 보여줍니다.\n\n아래 카드들을 눌러보면 메모, 체크리스트, RSS, 날씨, 배송 추적, 프롬프트 보드까지 한 화면에서 어떻게 섞이는지 바로 감이 옵니다.",
      documentPrimaryCta: "Google로 시작하기",
      documentSecondaryCta: "샘플 보드 둘러보기"
    }
  },
  {
    color: "yellow",
    content: "빠른 메모\n\n회의 전에 꼭 물어볼 질문 3개\n- 현재 병목은 어디인지\n- 이번 주 목표\n- 필요한 레퍼런스 링크"
  },
  {
    color: "mint",
    content: "일반 메모 샘플\n\n짧은 메모는 제목과 본문만 적어도 바로 카드가 됩니다.\n아이디어, 회의 요약, 해야 할 일 메모처럼 가장 자주 쓰는 기본 형태입니다."
  },
  {
    color: "white",
    content: "링크 메모 샘플\n\nOpenAI API 최신 가이드 확인\nhttps://platform.openai.com/docs/guides/text"
  },
  {
    color: "white",
    content: "이미지 메모 샘플\n\n무드보드, 레퍼런스, 촬영컷처럼 이미지 한 장만 붙여도 카드가 됩니다.",
    metadata: {
      pastedImageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80"
    }
  },
  {
    color: "white",
    content: "자주 여는 링크",
    metadata: {
      widgetType: "bookmark",
      bookmarkUrls: ["https://openai.com", "https://calendar.google.com", "https://www.figma.com"]
    }
  },
  {
    color: "white",
    content: "AI 뉴스",
    metadata: {
      widgetType: "rss",
      feedUrl: DEFAULT_RSS_FEED_URL
    }
  },
  {
    color: "mint",
    content: "오늘 할 일",
    metadata: {
      widgetType: "checklist",
      checklistItems: [
        { text: "피드백 확인", checked: true },
        { text: "와이어프레임 수정", checked: false },
        { text: "공유 링크 정리", checked: false }
      ],
      checklistText: "[x] 피드백 확인\n[ ] 와이어프레임 수정\n[ ] 공유 링크 정리"
    }
  },
  {
    color: "pink",
    content: "서비스 오픈",
    metadata: {
      widgetType: "countdown",
      targetDate: "2026-04-14",
      countdownDescription: "런칭 전 최종 점검과 공유 문서 마감일"
    }
  },
  {
    color: "blue",
    content: "주간 시간표",
    metadata: {
      widgetType: "timetable",
      timetableText: DEFAULT_TIMETABLE_TEXT
    }
  },
  {
    color: "blue",
    content: "서울 날씨",
    metadata: {
      widgetType: "weather",
      weatherQuery: "서울"
    }
  },
  {
    color: "orange",
    content: "지금 뜨는 키워드",
    metadata: {
      widgetType: "trending",
      trendingRegion: "KR"
    }
  },
  {
    color: "white",
    content: "배송 추적 샘플",
    metadata: {
      widgetType: "delivery",
      deliveryCarrierId: DEFAULT_DELIVERY_CARRIER,
      deliveryTrackingNumber: "",
      deliveryLabel: "도착 예정 택배"
    }
  },
  {
    color: "mint",
    content: "모찌 상태",
    metadata: {
      widgetType: "pet",
      petName: "모찌"
    }
  },
  {
    color: "white",
    content: "짧은 기획 문서",
    metadata: {
      widgetType: "document",
      documentVariant: "section",
      documentKicker: "DOC WIDGET",
      documentBody:
        "긴 문장을 보드 안에 바로 올려둘 수 있습니다.\n회의 전 공유할 요약, 기능 설명, 간단한 제안문을 카드처럼 붙여두는 용도입니다.",
      documentPrimaryCta: "",
      documentSecondaryCta: ""
    }
  },
  {
    color: "purple",
    content: "집중 타이머",
    metadata: {
      widgetType: "focus",
      focusDurationMinutes: 25,
      focusStartedAt: "",
      focusElapsedSeconds: 0
    }
  },
  {
    color: "pink",
    content: "오늘의 기분",
    metadata: {
      widgetType: "mood",
      moodEmoji: "😎",
      moodNote: "집중 잘 되는 날. 오후에 중요한 회의 하나 남음.",
      moodEnergy: 4
    }
  },
  {
    color: "green",
    content: "매일 루틴",
    metadata: {
      widgetType: "routine",
      routineItems: [
        { text: "아침 정리", checked: true },
        { text: "핵심 작업 1개", checked: false },
        { text: "하루 회고", checked: false }
      ],
      routineText: "[x] 아침 정리\n[ ] 핵심 작업 1개\n[ ] 하루 회고"
    }
  },
  {
    color: "white",
    content: "AI 초안 프롬프트",
    metadata: {
      widgetType: "prompt",
      promptText:
        "당신은 서비스 기획 초안을 구조화하는 조력자입니다.\n\n주제:\n목표:\n핵심 사용자:\n필수 기능 3개:\n\n위 내용을 기준으로 짧은 제품 초안을 작성하세요."
    }
  },
  {
    color: "yellow",
    content: "오늘 점심 추천",
    metadata: {
      widgetType: "food",
      foodRegion: "서울 금천구",
      foodSeed: 1
    }
  }
];

const FOOD_RECOMMENDATIONS_BY_REGION: Record<string, Record<FoodCategoryKey, FoodRecommendation[]>> = {
  "서울 금천구": {
    chef: [
      { name: "호우양꼬치 가산점", menu: "양갈비 · 마라전골", summary: "퇴근 후 모임용으로 만족도가 높은 묵직한 맛집" },
      { name: "도원", menu: "중식 코스 · 유린기", summary: "중식 베이스로 안정적으로 실패 없는 식사" },
      { name: "진영면옥", menu: "평양냉면 · 수육", summary: "깔끔한 한 끼가 필요할 때 어울리는 선택" }
    ],
    instagram: [
      { name: "금천면옥", menu: "들기름막국수 · 수육", summary: "사진도 예쁘고 담백해서 반응 좋은 곳" },
      { name: "카멜커피 가산", menu: "브런치 · 샌드위치", summary: "가볍게 먹으면서 분위기 챙기기 좋은 카페형 식사" },
      { name: "포포인츠 버거", menu: "수제버거", summary: "비주얼이 좋아서 SNS에 자주 보이는 메뉴" }
    ],
    trending: [
      { name: "오복수산", menu: "카이센동", summary: "점심시간 체감 만족도가 높은 덮밥" },
      { name: "등촌샤브칼국수 가산", menu: "버섯 샤브샤브", summary: "여럿이 가기 편하고 실패 확률이 낮은 선택" },
      { name: "정육식당 미도", menu: "한우 불고기", summary: "든든하게 먹고 싶을 때 무난하게 좋은 곳" }
    ]
  },
  "서울 마포구": {
    chef: [
      { name: "정육면체 합정", menu: "한우 우육면", summary: "진한 육향과 깔끔한 면 조합이 좋은 곳" },
      { name: "교다이야", menu: "우동 · 돈카츠", summary: "마포권에서 안정적으로 만족도 높은 면 요리" },
      { name: "옥동식", menu: "돼지곰탕", summary: "단순하지만 완성도 높은 한 그릇" }
    ],
    instagram: [
      { name: "연남동 소금집", menu: "샌드위치 · 파스타", summary: "가볍게 들르기 좋고 비주얼도 좋은 곳" },
      { name: "경의선숲길 브런치랩", menu: "프렌치토스트", summary: "연남 감성 사진이 잘 나오는 브런치" },
      { name: "상수 청수당", menu: "디저트 · 음료", summary: "식사 후 가볍게 코스처럼 붙이기 좋음" }
    ],
    trending: [
      { name: "하노이의 아침 홍대", menu: "쌀국수", summary: "늘 대기 있지만 회전 빠르고 만족도 높은 편" },
      { name: "미도인 연남", menu: "스테이크 덮밥", summary: "든든한 한 끼로 대중적인 인기" },
      { name: "개미식당 홍대", menu: "덮밥 · 규카츠", summary: "무난하게 호불호 적은 선택" }
    ]
  },
  "서울 성동구": {
    chef: [
      { name: "대도식당 왕십리", menu: "한우 등심", summary: "고기 자체에 집중한 정석적인 선택" },
      { name: "금남시장 한식당", menu: "제육 · 된장찌개", summary: "시장형 집밥 분위기로 안정적인 식사" },
      { name: "성수 면옥", menu: "냉면 · 갈비", summary: "깔끔한 맛과 식사 조합이 좋음" }
    ],
    instagram: [
      { name: "성수 다운타우너", menu: "아보카도 버거", summary: "성수에서 사진과 맛 둘 다 잡기 좋은 카드" },
      { name: "누데이크 성수", menu: "디저트 · 커피", summary: "식후 코스로 붙이기 좋은 감각적인 공간" },
      { name: "서울숲 피자네버슬립스", menu: "피자", summary: "힙한 분위기와 함께 가볍게 먹기 좋음" }
    ],
    trending: [
      { name: "소문난성수감자탕", menu: "감자탕", summary: "웨이팅은 있지만 만족도가 높은 시그니처" },
      { name: "성수동 카츠", menu: "돈카츠", summary: "빠르고 깔끔하게 먹기 좋은 인기 메뉴" },
      { name: "어메이징브루잉 성수", menu: "피자 · 맥주", summary: "저녁 모임용으로 반응 좋은 편" }
    ]
  },
  "서울 강남구": {
    chef: [
      { name: "권숙수", menu: "한식 코스", summary: "특별한 날 선택지로 임팩트 있는 곳" },
      { name: "삼원가든", menu: "갈비", summary: "접대나 식사 모임에 무난하게 강한 카드" },
      { name: "논현손칼국수", menu: "칼국수 · 만두", summary: "깔끔한 면 요리를 원할 때 안정적" }
    ],
    instagram: [
      { name: "도산분식", menu: "분식 플레이트", summary: "비주얼이 좋아 가볍게 즐기기 좋음" },
      { name: "런던베이글뮤지엄", menu: "베이글", summary: "브런치나 티타임으로 반응이 확실한 곳" },
      { name: "새들러하우스", menu: "토스트", summary: "사진과 간단한 식사를 동시에 챙길 수 있음" }
    ],
    trending: [
      { name: "온기정 강남", menu: "텐동", summary: "혼밥/직장인 점심으로 인기 있는 편" },
      { name: "강남교자", menu: "칼국수", summary: "늘 꾸준히 찾는 사람 많은 클래식 선택" },
      { name: "우동명가기리야마", menu: "우동", summary: "면 좋아하는 사람들 사이에서 만족도 높음" }
    ]
  },
  "경기 성남시": {
    chef: [
      { name: "분당 서현 한정식", menu: "한정식 코스", summary: "가족 식사나 여유 있는 한 끼에 적합" },
      { name: "판교 능라도", menu: "냉면 · 어복쟁반", summary: "정갈한 메뉴 구성이 강점" },
      { name: "백현동 미식당", menu: "파스타 · 스테이크", summary: "무난하면서도 완성도 있는 선택" }
    ],
    instagram: [
      { name: "카페 랑데자뷰 판교", menu: "브런치", summary: "채광과 분위기가 좋아 사진 찍기 좋음" },
      { name: "현백 판교 다운타우너", menu: "버거", summary: "쇼핑 동선과 함께 즐기기 좋음" },
      { name: "정자동 폴바셋 키친", menu: "샐러드 · 파니니", summary: "가볍고 깔끔한 식사로 호불호 적음" }
    ],
    trending: [
      { name: "판교 삿뽀로", menu: "일식 정식", summary: "모임성 식사로 자주 언급되는 카드" },
      { name: "정자동 잇쇼우", menu: "돈카츠", summary: "든든하게 먹기 좋은 인기 메뉴" },
      { name: "서현 청춘닭갈비", menu: "닭갈비", summary: "여럿이 가기 좋은 대중적 선택" }
    ]
  }
};
const PET_VISIT_STORAGE_KEY = "wzd-pet-visits";
const PET_VISIT_SESSION_PREFIX = "wzd-pet-visit-session:";
const TIMETABLE_DAY_ORDER = ["월", "화", "수", "목", "금", "토", "일"];

const BOARD_TEMPLATES: BoardTemplateDefinition[] = [
  {
    key: "blank",
    title: "빈 보드",
    subtitle: "가장 빠르게 시작하는 깨끗한 보드",
    tag: "빠른 시작",
    audience: "메모를 직접 구성하고 싶은 분",
    highlights: ["가볍게 시작", "자유로운 구성", "기본 레이아웃"],
    backgroundStyle: "paper",
    layoutStyle: "balanced",
    notes: [
      {
        color: "yellow",
        content: "새 메모\n\n가볍게 시작해보세요."
      }
    ]
  },
  {
    key: "video",
    title: "영상 기획 보드",
    subtitle: "주제, 훅, 레퍼런스, 대본 초안을 한 곳에",
    tag: "메모 보드",
    audience: "유튜브·블로그·콘텐츠 제작자",
    highlights: ["아이디어 정리", "훅 메모", "레퍼런스 수집"],
    backgroundStyle: "whiteboard",
    layoutStyle: "visual",
    notes: [
      {
        color: "pink",
        content:
          "영상 아이디어\n\n제목 후보\n- 3분 안에 끝내는 정리법\n- 노션 대신 쓰는 개인화 보드"
      },
      {
        color: "yellow",
        content:
          "오프닝 훅\n\n\"정리는 해야 하는데, 노션은 너무 무겁다고 느낀 적 있나요?\""
      },
      {
        color: "mint",
        content:
          "레퍼런스 링크\n\nhttps://www.youtube.com/\nhttps://www.notion.so/"
      }
    ]
  },
  {
    key: "work",
    title: "업무 메모 보드",
    subtitle: "회의, 작업 메모, 할 일까지 한 보드에서 정리",
    tag: "메모 보드",
    audience: "작업 메모를 빠르게 쌓아두는 팀과 개인",
    highlights: ["작업 메모", "회의 기록", "TODO"],
    backgroundStyle: "paper",
    layoutStyle: "balanced",
    notes: [
      {
        color: "yellow",
        content:
          "이번 주 우선순위\n\n- 랜딩 카피 정리\n- 공유 보드 QA\n- 모바일 제스처 개선"
      },
      {
        color: "blue",
        content:
          "회의 메모\n\n고객 요청\n- 링크 카드 고도화\n- 공유 링크 편집 UX 개선\n- 템플릿 보드 예시 확대"
      },
      {
        color: "mint",
        content:
          "다음 액션\n\n담당자별로 해야 할 일을 짧게 적고, 관련 링크를 같이 붙여두세요."
      }
    ]
  },
  {
    key: "study",
    title: "공부자료 보드",
    subtitle: "과목별 핵심 메모와 링크를 보기 좋게 정리",
    tag: "메모 보드",
    audience: "강의·자료·복습 메모를 모으는 분",
    highlights: ["복습 포인트", "자료 링크", "TODO"],
    backgroundStyle: "cork",
    layoutStyle: "balanced",
    notes: [
      {
        color: "yellow",
        content:
          "오늘 공부할 것\n\n- 핵심 개념 3개 정리\n- 예제 2개 풀기\n- 복습 포인트 체크"
      },
      {
        color: "blue",
        content:
          "참고 링크\n\nhttps://developer.mozilla.org/\nhttps://react.dev/"
      },
      {
        color: "mint",
        content:
          "복습 메모\n\n헷갈린 개념은 짧게 다시 적고, 다음에 볼 링크와 같이 저장해두세요."
      }
    ]
  },
  {
    key: "tips",
    title: "꿀팁 링크 보드",
    subtitle: "짧은 팁과 유용한 링크를 모아두는 개인 허브",
    tag: "추천",
    audience: "자료를 모아두는 개인 허브",
    highlights: ["링크 수집", "레퍼런스 정리", "공유용 보드"],
    backgroundStyle: "paper",
    layoutStyle: "compact",
    notes: [
      {
        color: "yellow",
        content:
          "AI 레퍼런스 모음\n\n핵심 링크를 모아두는 보드입니다.\nhttps://openai.com"
      },
      {
        color: "mint",
        content:
          "디자인 참고\n\n랜딩 페이지와 UI 레퍼런스를 저장하세요.\nhttps://www.awwwards.com"
      },
      {
        color: "blue",
        content:
          "읽을거리\n\n다음에 읽을 아티클과 블로그 링크를 모아두세요.\nhttps://stripe.com/blog"
      }
    ]
  },
  {
    key: "linktree",
    title: "개인 링크 페이지 보드",
    subtitle: "프로필, 대표 링크, 공지를 한 장의 개인 페이지처럼 정리",
    tag: "메모 보드",
    audience: "자기 소개와 링크를 한 번에 보여주고 싶은 분",
    highlights: ["프로필 카드", "대표 링크", "문의 유도"],
    backgroundStyle: "paper",
    layoutStyle: "balanced",
    notes: [
      {
        color: "white",
        content: "이준호",
        metadata: {
          widgetType: "profile",
          profileName: "이준호",
          profileBirthdate: "1997-08-17",
          profileOccupation: "크리에이터 · AI 빌더",
          profileImageUrl:
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=640&q=80"
        }
      },
      {
        color: "mint",
        content: "대표 링크",
        metadata: {
          widgetType: "bookmark",
          bookmarkUrls: [
            "https://instagram.com",
            "https://youtube.com",
            "https://openai.com",
            "https://notion.so"
          ]
        }
      },
      {
        color: "pink",
        content:
          "소개 문구\n\nAI, 콘텐츠, 프로토타입 작업을 기록합니다.\n협업 문의와 포트폴리오 링크는 아래 카드에서 확인해주세요."
      },
      {
        color: "yellow",
        content:
          "문의하기\n\n이메일: hello@wzd.kr\n인스타 DM 또는 메일로 문의 주세요."
      }
    ]
  },
  {
    key: "homepage",
    title: "시작페이지 보드",
    subtitle: "자주 여는 서비스와 메모를 한 화면에 모아두는 시작 페이지",
    tag: "위젯 보드",
    audience: "하루를 빠르게 시작하고 싶은 분",
    highlights: ["자주 쓰는 링크", "빠른 시작", "개인 시작페이지"],
    backgroundStyle: "paper",
    layoutStyle: "compact",
    notes: [
      {
        color: "white",
        content: "오늘 확인할 것\n\n- 메일 확인\n- 캘린더 체크\n- 오늘 할 일 정리"
      },
      {
        color: "white",
        content: "자주 가는 링크",
        metadata: {
          widgetType: "bookmark",
          bookmarkUrls: [
            "https://mail.google.com",
            "https://calendar.google.com",
            "https://www.notion.so"
          ]
        }
      }
    ]
  },
  {
    key: "bookmark",
    title: "북마크 보드",
    subtitle: "카테고리별 즐겨찾기를 보드처럼 정리",
    tag: "위젯 보드",
    audience: "매일 보는 사이트를 빠르게 여는 분",
    highlights: ["북마크 위젯", "카테고리 정리", "공유 가능"],
    backgroundStyle: "whiteboard",
    layoutStyle: "compact",
    notes: [
      {
        color: "white",
        content: "업무 링크",
        metadata: {
          widgetType: "bookmark",
          bookmarkUrls: ["https://github.com", "https://linear.app", "https://slack.com"]
        }
      },
      {
        color: "white",
        content: "도구 링크",
        metadata: {
          widgetType: "bookmark",
          bookmarkUrls: ["https://www.figma.com", "https://openai.com", "https://www.youtube.com"]
        }
      }
    ]
  },
  {
    key: "rss",
    title: "RSS 보드",
    subtitle: "한눈에 보는 뉴스와 업데이트 피드 보드",
    tag: "위젯 보드",
    audience: "AI 뉴스나 업계 소식을 빠르게 확인하는 분",
    highlights: ["RSS 위젯", "업데이트 수집", "뉴스 허브"],
    backgroundStyle: "paper",
    layoutStyle: "compact",
    notes: [
      {
        color: "white",
        content: "AI 뉴스",
        metadata: {
          widgetType: "rss",
          feedUrl: DEFAULT_RSS_FEED_URL
        }
      },
      {
        color: "yellow",
        content: "체크 포인트\n\n중요한 뉴스는 메모 카드로 따로 옮겨 요약해두세요."
      }
    ]
  },
  {
    key: "frame",
    title: "액자보드",
    subtitle: "캡처와 이미지 중심으로 분위기 있게 모아두는 보드",
    tag: "위젯 보드",
    audience: "이미지 레퍼런스나 분위기 모음을 정리하는 분",
    highlights: ["액자 카드", "이미지 중심", "무드보드"],
    backgroundStyle: "cork",
    layoutStyle: "visual",
    notes: [
      {
        color: "white",
        content: "작업 무드보드\n\n참고가 되는 장면과 색감을 모아두세요.",
        metadata: {
          pastedImageUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80"
        }
      },
      {
        color: "white",
        content: "캠페인 레퍼런스\n\n브랜드 톤과 이미지 방향 정리",
        metadata: {
          pastedImageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=900&q=80"
        }
      }
    ]
  },
  {
    key: "ai-share",
    title: "AI 정보공유보드",
    subtitle: "도구, 소식, 프롬프트를 함께 모으는 공유 보드",
    tag: "그룹 보드",
    audience: "AI 자료를 팀원들과 모으고 싶은 분",
    highlights: ["공동 수집", "링크 공유", "팀 허브"],
    backgroundStyle: "whiteboard",
    layoutStyle: "balanced",
    notes: [
      {
        color: "yellow",
        content: "이번 주 공유할 것\n\n- 새로 나온 모델 정리\n- 유용한 프롬프트 모음\n- 생산성 도구 후기"
      },
      {
        color: "mint",
        content: "공유 링크\n\nhttps://openai.com\nhttps://aistudio.google.com"
      }
    ]
  },
  {
    key: "aistudio",
    title: "Aistudio 모음 보드",
    subtitle: "AI Studio 관련 링크, 프롬프트, 결과물을 모으는 보드",
    tag: "그룹 보드",
    audience: "AI Studio 실험 기록을 모아두는 팀",
    highlights: ["프롬프트 기록", "레퍼런스 링크", "실험 정리"],
    backgroundStyle: "paper",
    layoutStyle: "balanced",
    notes: [
      {
        color: "blue",
        content: "프롬프트 실험\n\n- 캐릭터 설명 방식\n- 영상 대본 생성 방식\n- 요약 결과 비교"
      },
      {
        color: "yellow",
        content: "참고 링크\n\nhttps://aistudio.google.com"
      }
    ]
  },
  {
    key: "group-chat",
    title: "단톡메모 보드",
    subtitle: "여럿이 링크와 할 일을 짧게 남기는 대화형 보드",
    tag: "그룹 보드",
    audience: "단톡방처럼 짧게 메모를 주고받는 팀",
    highlights: ["짧은 메모", "실시간 공유", "빠른 정리"],
    backgroundStyle: "whiteboard",
    layoutStyle: "compact",
    notes: [
      {
        color: "pink",
        content: "오늘 공유할 링크 있으면 여기에 바로 붙여주세요."
      },
      {
        color: "yellow",
        content: "작업 체크\n\n- 썸네일 수정\n- 스크립트 리뷰\n- 다음 업로드 일정"
      }
    ]
  },
  {
    key: "family",
    title: "가족 보드",
    subtitle: "가족 일정, 장보기, 저장 링크를 함께 쓰는 생활 보드",
    tag: "그룹 보드",
    audience: "가족과 생활 메모를 공유하는 분",
    highlights: ["장보기", "일정 공유", "생활 링크"],
    backgroundStyle: "paper",
    layoutStyle: "balanced",
    notes: [
      {
        color: "yellow",
        content: "이번 주 장보기\n\n- 우유\n- 휴지\n- 과일\n- 반찬 재료"
      },
      {
        color: "mint",
        content: "공유 일정\n\n토요일 병원 예약\n일요일 외식 약속"
      }
    ]
  },
  {
    key: "couple",
    title: "연인 보드",
    subtitle: "데이트 계획, 맛집, 같이 볼 것들을 모아두는 보드",
    tag: "그룹 보드",
    audience: "둘이 함께 쓰는 취향 보드",
    highlights: ["데이트 계획", "맛집 링크", "공유 메모"],
    backgroundStyle: "cork",
    layoutStyle: "visual",
    notes: [
      {
        color: "pink",
        content: "다음 데이트 후보\n\n- 전시회 보기\n- 브런치 카페\n- 야간 드라이브"
      },
      {
        color: "yellow",
        content: "같이 볼 것\n\nhttps://www.netflix.com/\nhttps://www.youtube.com/"
      }
    ]
  },
  {
    key: "insta-ai",
    title: "인스타 AI 큐레이션",
    subtitle: "인스타에서 저장한 AI 정보·릴스·계정을 한 보드에 정리",
    tag: "수집 보드",
    audience: "AI 트렌드를 SNS에서 따라가는 사람",
    highlights: ["팔로우 계정", "저장한 릴스", "도구·뉴스 메모"],
    backgroundStyle: "whiteboard",
    layoutStyle: "visual",
    notes: [
      {
        color: "purple",
        content:
          "📌 팔로우 중인 AI 계정\n\n@aitoolreport — 매일 새 AI 도구 1개\n@levelsio — Indie hacker, AI 사이드프로젝트\n@openai — 공식 업데이트\n@thealexbanks — AI 비즈니스 인사이트\n@bilawalsidhu — Sora·Midjourney 작업물"
      },
      {
        color: "pink",
        content:
          "💾 이번주 저장한 릴스\n\n• \"GPT-5 모드 5가지 단축키\" — 실무 자동화에 바로 쓸만함\n• \"클로드로 노션 대시보드 자동 생성\" — 프롬프트 따로 적어두기\n• \"Midjourney v7 시네마틱 프롬프트 공식\" — 영상 작업 참고"
      },
      {
        color: "yellow",
        content:
          "🔥 이번주 본 도구\n\n• Granola — 회의 자동 정리\n• v0.dev — 디자인→React 코드\n• Suno v4 — 음악 생성, 보컬 자연스러움 ↑\n• Cursor + Claude Opus — 페어 코딩"
      },
      {
        color: "mint",
        content:
          "📝 트렌드 키워드\n\n#AI에이전트 — 멀티스텝 자동화 폭발\n#버티컬AI — 분야 특화 GPT가 SaaS 대체 중\n#개인용RAG — 본인 자료로 챗봇 만드는 사람 늘어남\n#보이스AI — 한국어 TTS 품질 작년 대비 체감 차이 큼"
      },
      {
        color: "blue",
        content:
          "💡 시도해볼 것\n\n- 인스타 저장 릴스를 매주 일요일에 이 보드로 옮기기\n- 매달 마지막 주에 안 쓰는 도구 정리\n- 좋았던 프롬프트는 [프롬프트 보관소] 보드로 이동"
      },
      {
        color: "orange",
        content:
          "🔗 자주 보는 링크\n\nhttps://www.instagram.com/explore/tags/ai/\nhttps://www.theresanaiforthat.com/\nhttps://news.smol.ai/"
      }
    ]
  },
  {
    key: "youtube-curation",
    title: "유튜브 큐레이션 보드",
    subtitle: "분야별 추천 채널·영상·인사이트를 보기 좋게 정리",
    tag: "수집 보드",
    audience: "유튜브를 학습·리서치 도구로 쓰는 사람",
    highlights: ["채널 분류", "시청 큐", "정리한 인사이트"],
    backgroundStyle: "whiteboard",
    layoutStyle: "visual",
    notes: [
      {
        color: "blue",
        content:
          "📺 개발·AI 채널\n\n• Fireship — 100초 기술 요약, 트렌드 따라가기 좋음\n• Theo - t3.gg — 풀스택 라이브 코딩\n• Two Minute Papers — 논문 시각적 정리\n• 노마드 코더 — 한국어 부트캠프형\n• 조코딩 — 챗GPT·AI 도구 한국어 실전"
      },
      {
        color: "purple",
        content:
          "🎨 디자인·크리에이티브\n\n• The Futur — 디자인 비즈니스/가격 협상\n• Flux Academy — 웹디자인 트렌드\n• 디자인베이스 — 한국 디자이너 인터뷰\n• 빠른생각 — UX 케이스 스터디"
      },
      {
        color: "yellow",
        content:
          "🧠 자기계발·생산성\n\n• Ali Abdaal — 학습법, 노션, 사이드프로젝트\n• Tim Ferriss — 롱폼 인터뷰, 분야별 톱플레이어\n• 김작가TV — 한국 자기계발/투자\n• 신사임당 — 사업 케이스"
      },
      {
        color: "mint",
        content:
          "📋 시청 큐 (오늘·이번주)\n\n[ ] Fireship — \"AI agents explained in 10 minutes\"\n[ ] Theo — Vercel AI SDK v5 walkthrough\n[ ] Ali Abdaal — How I plan my year (재시청)\n[ ] 조코딩 — Claude로 풀스택 만들기 시리즈"
      },
      {
        color: "orange",
        content:
          "✍️ 정리한 인사이트\n\nFireship의 \"왜 SQLite가 다시 뜨는가\"\n→ 서버리스 + 로컬 DB 조합이 늘면서 D1·Turso·LiteFS 같은 분산 SQLite가 부상.\n→ 우리 wzd 프로젝트도 D1 쓰니까 맞는 방향.\n\nAli Abdaal의 \"1년 회고법\"\n→ 잘된 것 / 안된 것 / 다음에 시도할 것 3분할.\n→ 분기마다 적용해보자."
      },
      {
        color: "pink",
        content:
          "🎯 보는 규칙\n\n- 1.5배속 기본, 흥미 떨어지면 2배속\n- 30분 이상 영상은 챕터만 훑기\n- 좋았던 영상은 핵심 한 줄을 이 보드에 남기기\n- 채널 구독은 분기마다 정리 (안 본 채널 = 해지)"
      },
      {
        color: "white",
        content:
          "🔗 플레이리스트\n\nhttps://www.youtube.com/feed/subscriptions\nhttps://www.youtube.com/playlist?list=WL"
      }
    ]
  },
  {
    key: "prompt-vault",
    title: "프롬프트 보관소",
    subtitle: "자주 쓰는 ChatGPT·Claude 프롬프트를 카테고리별로 보관",
    tag: "수집 보드",
    audience: "AI를 매일 쓰는 사람의 프롬프트 라이브러리",
    highlights: ["글쓰기", "코딩", "기획·리서치"],
    backgroundStyle: "paper",
    layoutStyle: "balanced",
    notes: [
      {
        color: "yellow",
        content:
          "✍️ 글쓰기 — 블로그 초안\n\n\"다음 주제로 1,200자 블로그 초안을 써줘.\n톤: 친근하지만 깊이 있게. 1인칭.\n구조: 후킹 한 문장 → 문제 → 내 경험 → 결론.\n[주제] ___\"\n\n→ 결론 부분이 평범하면 \"독자가 댓글 달고 싶게 만드는 마지막 문장 3개 후보 줘\"로 후속."
      },
      {
        color: "blue",
        content:
          "💻 코딩 — 디버깅 페어\n\n\"아래 코드에서 [에러 메시지]가 발생해. 다음 순서로 도와줘:\n1. 가능한 원인 3가지 (가능성 순)\n2. 각각을 확인하는 최소 명령\n3. 가장 빠른 수정 1줄\n수정 전엔 코드 작성하지 마.\n\n[코드 또는 stack trace]\"\n\n→ \"수정 전엔 코드 작성하지 마\" 한 줄이 핵심. 안 적으면 추측으로 고침."
      },
      {
        color: "mint",
        content:
          "🧠 기획 — 아이디어 평가\n\n\"내가 생각한 아이디어를 5가지 관점에서 평가해줘:\n1. 누가 진짜로 돈을 낼까 (3명 페르소나)\n2. 비슷한 기존 제품 (3개 + 차별점)\n3. 가장 작은 MVP는?\n4. 6개월 안에 망할 가능성 큰 이유 3개\n5. 그래도 시도할 가치가 있는가\n\n[아이디어] ___\"\n"
      },
      {
        color: "purple",
        content:
          "🔍 리서치 — 빠른 비교표\n\n\"다음 [N]개 옵션을 표로 비교해줘.\n열: 가격 / 무료 한도 / 핵심 장점 / 결정적 단점 / 추천 대상\n그리고 표 아래에 '내가 [상황]이라면' 1줄 추천 결론.\n\n[옵션 나열]\"\n\n→ Claude/GPT 둘 다 표 잘 만듦. 결론 한 줄을 강제하는 게 핵심."
      },
      {
        color: "pink",
        content:
          "🎨 이미지 — 미드저니 프롬프트\n\n공식:\n[주제], [스타일/아티스트], [구도], [라이팅], [디테일 키워드], --ar 16:9 --style raw\n\n예:\n\"a cozy korean cafe interior, by Studio Ghibli x Wes Anderson, eye-level shot, soft morning light through window, warm wood texture, steam from coffee, --ar 16:9 --style raw\"\n"
      },
      {
        color: "orange",
        content:
          "⚡ 메타 — 프롬프트 개선기\n\n\"내 프롬프트를 평가해줘.\n- 모호한 부분 3곳\n- 더 구체적으로 바꿀 단어 3개\n- 결과 형식을 강제할 한 줄 추가 제안\n그 다음 개선된 버전을 출력.\n\n[원본 프롬프트]\"\n\n→ 새 프롬프트 만들 때 항상 마지막에 이거 한 번 통과."
      },
      {
        color: "green",
        content:
          "📝 메타 규칙\n\n- 새 프롬프트는 일단 여기 저장 → 1주일 써본 뒤 살아남은 것만 유지\n- 안 쓰는 프롬프트 분기마다 정리\n- 같은 프롬프트의 v2, v3은 들여쓰기로 한 노트에"
      }
    ]
  }
];

const BOARD_TEMPLATE_SECTIONS: BoardTemplateSection[] = [
    {
      key: "notes",
      title: "메모 보드",
      subtitle: "텍스트와 링크를 빠르게 정리하는 기본형 보드",
      templateKeys: ["video", "work", "study", "tips", "linktree"]
    },
  {
    key: "curation",
    title: "수집·큐레이션 보드",
    subtitle: "인스타·유튜브·AI 도구처럼 매일 모이는 정보를 분류해두는 보드",
    templateKeys: ["insta-ai", "youtube-curation", "prompt-vault"]
  },
  {
    key: "widgets",
    title: "위젯 보드",
    subtitle: "시작페이지, 북마크, RSS, 액자형 카드 중심 보드",
    templateKeys: ["homepage", "bookmark", "rss", "frame"]
  },
  {
    key: "groups",
    title: "그룹 보드",
    subtitle: "여럿이 함께 보는 공유형 보드 예시",
    templateKeys: ["ai-share", "aistudio", "group-chat", "family", "couple"]
  }
];

const WIDGET_GALLERY_SECTIONS: WidgetGallerySectionDefinition[] = [
  {
    key: "collect",
    title: "수집 & 큐레이션",
    subtitle: "링크와 외부 정보를 빠르게 모아 바로 쓸 수 있는 위젯입니다.",
    items: [
      {
        type: "brain",
        title: "AI 브레인",
        subtitle: "보드 내용을 실행 계획으로 정리",
        kicker: "AI",
        previewTitle: "오늘 작업 정리",
        previewLines: ["실행 계획", "즉시 할 일", "검증 포인트"],
        previewMeta: "Groq 에이전트 연결",
        accent: "#6e9bff"
      },
      {
        type: "rss",
        title: "RSS 리더",
        subtitle: "뉴스와 피드 모아보기",
        kicker: "FEED",
        previewTitle: "GeekNews",
        previewLines: ["핵심 뉴스 헤드라인 3개", "새 글이 올라오면 바로 확인"],
        previewMeta: "업데이트 자동 반영",
        accent: "#8f7cff"
      },
      {
        type: "blog",
        title: "오늘의 트렌드",
        subtitle: "매시간 업데이트되는 한국 트렌드 블로그",
        kicker: "트렌드",
        previewTitle: "오늘의 트렌드",
        previewLines: ["정책·뉴스", "지원금·혜택", "생활·명소"],
        previewMeta: "매시간 자동 업데이트",
        accent: "#e74c8b"
      },
      {
        type: "social",
        title: "SNS 피드",
        subtitle: "블루스카이·X·마스토돈 최신 글",
        kicker: "SOCIAL",
        previewTitle: "OpenAI Feed",
        previewLines: ["최신 게시물 3개", "트윗 카드처럼 가볍게 확인"],
        previewMeta: "공개 피드 자동 반영",
        accent: "#5db8ff"
      },
      {
        type: "bookmark",
        title: "북마크",
        subtitle: "자주 가는 링크 정리",
        kicker: "LINK",
        previewTitle: "AI 참고 링크",
        previewLines: ["OpenAI Docs", "GenSpark", "Claude MCP 가이드"],
        previewMeta: "링크 붙여넣기로 바로 생성",
        accent: "#f5b941"
      },
      {
        type: "trending",
        title: "실시간 검색어",
        subtitle: "지금 많이 보는 주제",
        kicker: "TREND",
        previewTitle: "실시간 인기 키워드",
        previewLines: ["1. 전기차", "2. 로봇", "3. 반도체"],
        previewMeta: "빠른 훑어보기",
        accent: "#fb7f57"
      },
      {
        type: "delivery",
        title: "택배 추적",
        subtitle: "송장 상태 확인",
        kicker: "TRACK",
        previewTitle: "CJ대한통운 6894…",
        previewLines: ["배송 중", "오늘 오후 도착 예정"],
        previewMeta: "택배사 자동 조회",
        accent: "#48c4ff"
      },
      {
        type: "food",
        title: "오늘은 뭐 먹지",
        subtitle: "지역 기반 맛집 추천",
        kicker: "TASTE",
        previewTitle: "서울 금천구 추천",
        previewLines: ["흑백요리사 픽", "인스타 화제", "실시간 인기"],
        previewMeta: "다시 추천 가능",
        accent: "#ff8b7d"
      }
    ]
  },
  {
    key: "organize",
    title: "정리 & 집중",
    subtitle: "일정, 루틴, 작업 흐름을 눈에 보이게 정리하는 위젯입니다.",
    items: [
      {
        type: "checklist",
        title: "TODO",
        subtitle: "체크리스트 정리",
        kicker: "TASK",
        previewTitle: "오늘 할 일",
        previewLines: ["핵심 작업 정리", "공유 전 확인", "완료 후 체크"],
        previewMeta: "완료 개수 자동 계산",
        accent: "#52cf9a"
      },
      {
        type: "countdown",
        title: "디데이",
        subtitle: "중요 일정 카운트다운",
        kicker: "D-DAY",
        previewTitle: "프로젝트 공개",
        previewLines: ["D-7", "중요 일정까지 남은 시간"],
        previewMeta: "날짜 기반 자동 계산",
        accent: "#b0c7ff"
      },
      {
        type: "timetable",
        title: "시간표",
        subtitle: "요일별 일정 배치",
        kicker: "PLAN",
        previewTitle: "이번 주 일정",
        previewLines: ["월 10:00 팀 미팅", "수 14:00 강의", "금 16:00 작업 리뷰"],
        previewMeta: "한눈에 보는 주간 계획",
        accent: "#76d2ff"
      },
      {
        type: "focus",
        title: "포커스 타이머",
        subtitle: "집중 세션 관리",
        kicker: "FOCUS",
        previewTitle: "25:00 집중 모드",
        previewLines: ["오늘 누적 1시간 40분", "지금 해야 할 일과 연결"],
        previewMeta: "작업 몰입용",
        accent: "#5ea6ff"
      },
      {
        type: "routine",
        title: "루틴",
        subtitle: "반복 습관 체크",
        kicker: "HABIT",
        previewTitle: "아침 루틴",
        previewLines: ["물 마시기", "스트레칭", "메일 정리"],
        previewMeta: "연속 달성용 보드",
        accent: "#67d5ba"
      }
    ]
  },
  {
    key: "utility",
    title: "정보 & 유틸리티",
    subtitle: "바로 확인하고 계속 열어보게 되는 대시보드성 위젯입니다.",
    items: [
      {
        type: "weather",
        title: "날씨",
        subtitle: "지역별 오늘/내일 날씨",
        kicker: "WEATHER",
        previewTitle: "서울",
        previewLines: ["29° · 부분적으로 흐림", "내일 비 예보 60%"],
        previewMeta: "기온과 상태 요약",
        accent: "#9e8dff"
      },
      {
        type: "clock",
        title: "시계",
        subtitle: "디지털/아날로그 시계",
        kicker: "CLOCK",
        previewTitle: "10:45 PM",
        previewLines: ["Seoul · UTC+09:00", "작업 흐름에 맞춘 시간 확인"],
        previewMeta: "심플 데스크 위젯",
        accent: "#7dd5ff"
      },
      {
        type: "speed",
        title: "인터넷 속도",
        subtitle: "다운로드 속도와 지연 시간 확인",
        kicker: "SPEED",
        previewTitle: "72.4 Mbps",
        previewLines: ["지연 시간 24ms", "Wi-Fi · 4g"],
        previewMeta: "브라우저 즉시 측정",
        accent: "#6eb7ff"
      },
      {
        type: "calculator",
        title: "계산기",
        subtitle: "빠른 사칙연산 계산",
        kicker: "CALC",
        previewTitle: "12 × 8",
        previewLines: ["= 96", "기본 사칙연산", "작업 중 바로 계산"],
        previewMeta: "즉시 계산용",
        accent: "#6fd7c8"
      },
      {
        type: "player",
        title: "음악 플레이어",
        subtitle: "MP3 / YouTube 오디오",
        kicker: "AUDIO",
        previewTitle: "Retro Session",
        previewLines: ["재생 / 일시정지 / 앞으로", "옛 MP3처럼 보기"],
        previewMeta: "배경 음악용",
        accent: "#ff84b7"
      },
      {
        type: "prompt",
        title: "AI 프롬프트",
        subtitle: "자주 쓰는 프롬프트 저장",
        kicker: "PROMPT",
        previewTitle: "광고 카피 생성",
        previewLines: ["역할/목표/톤 변수 관리", "한 번에 복사해 쓰기"],
        previewMeta: "AI 작업 전용",
        accent: "#7ce3dd"
      },
      {
        type: "document",
        title: "문서 섹션",
        subtitle: "랜딩/소개 문단 구성",
        kicker: "DOC",
        previewTitle: "새 섹션",
        previewLines: ["한 문단을 크게 읽히게 배치", "CTA나 소개 섹션 작성"],
        previewMeta: "홈 보드용 추천",
        accent: "#95a9ff"
      }
    ]
  },
  {
    key: "identity",
    title: "개성 & 분위기",
    subtitle: "보드의 감성과 정체성을 강하게 보여주는 위젯입니다.",
    items: [
      {
        type: "cover",
        title: "보드 커버",
        subtitle: "대표 소개 카드",
        kicker: "COVER",
        previewTitle: "WZD Board",
        previewLines: ["한 장의 대표 비주얼", "소개 문구와 분위기 전달"],
        previewMeta: "공유 보드 추천",
        accent: "#f6a3ba"
      },
      {
        type: "profile",
        title: "내 정보",
        subtitle: "프로필/소개 카드",
        kicker: "PROFILE",
        previewTitle: "이준호",
        previewLines: ["아이디어 프로토타이퍼", "한국 나이 · 생년월일"],
        previewMeta: "개인 페이지용",
        accent: "#f3c2ff"
      },
      {
        type: "mood",
        title: "오늘의 무드",
        subtitle: "기분과 에너지 기록",
        kicker: "MOOD",
        previewTitle: "오늘은 차분함",
        previewLines: ["집중도 높음", "에너지 보통"],
        previewMeta: "감성 기록용",
        accent: "#ff9bd2"
      },
      {
        type: "pet",
        title: "방문자 캐릭터",
        subtitle: "방문/활동량 성장 펫",
        kicker: "PET",
        previewTitle: "오늘도 찾아온 고양이",
        previewLines: ["방문자가 늘수록 성장", "보드에 생기를 주는 요소"],
        previewMeta: "공유 보드 인기",
        accent: "#7aa7ff"
      }
    ]
  }
];

const LEGACY_TEXT_REPLACEMENTS: Array<[string, string]> = [
  [
    "媛쒖씤 硫붾え??n\n媛꾨떒??硫붾え, 遺곷쭏?? ?대?吏 URL??紐⑥븘?먮뒗 怨듦컙?낅땲??\nhttps://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80",
    DEFAULT_PERSONAL_NOTE_CONTENT
  ],
  [
    "洹몃９ 硫붾え??n\n二쇱젣蹂?蹂대뱶?먯꽌 媛곸옄 李얠? 留곹겕? ?먮즺瑜??④퍡 怨듭쑀?대낫?몄슂.\n?? AI Studio ?덊띁?곗뒪 紐⑥쓬",
    DEFAULT_GROUP_NOTE_CONTENT
  ],
  ["媛쒖씤 硫붾어", "개인 메모장"],
  ["洹몃９ 硫붾어", "그룹 메모장"],
  ["媛꾨떒??硫붾어, 遺곷쭏?? ?대?吏 URL??紐⑥븘?먮뒗 怨듦컙?낅땲??", "간단한 메모, 북마크, 이미지 URL을 모아두는 공간입니다."],
  ["二쇱젣蹂?蹂대뱶?먯꽌 媛곸옄 李얠? 留곹겕? ?먮즺瑜??④퍡 怨듭쑀?대낫?몄슂.", "주제별 보드에서 각자 찾은 링크와 자료를 함께 공유해보세요."],
  ["?? AI Studio ?덊띁?곗뒪 紐⑥쓬", "예: AI Studio 레퍼런스 모음"],
  ["AI ?댁뒪", "AI 뉴스"]
];

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowIso = () => new Date().toISOString();
const formatSavedAtLabel = (value: string | null) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const createDefaultBoard = (userId: string, title = "My Board"): BoardV2 => ({
  id: makeId(),
  userId,
  title,
  description: "",
  backgroundStyle: "paper",
  settings: {},
  updatedAt: nowIso()
});

const createNote = (params: {
  boardId: string;
  userId: string;
  zIndex: number;
  content?: string;
  color?: NoteColor;
}): NoteV2 => ({
  id: makeId(),
  boardId: params.boardId,
  userId: params.userId,
  content: params.content ?? "",
  color: params.color ?? "yellow",
  x: 0,
  y: 0,
  w: 244,
  h: 220,
  zIndex: params.zIndex,
  rotation: 0,
  pinned: false,
  archived: false,
  metadata: { fontSize: DEFAULT_FONT_SIZE },
  updatedAt: nowIso()
});

const createDefaultSnapshot = (): LocalSnapshot => {
  const board = createDefaultBoard("local");
  const notes = [
    createNote({
      boardId: board.id,
      userId: "local",
      zIndex: 1,
      color: "yellow",
      content: DEFAULT_PERSONAL_NOTE_CONTENT
    }),
    createNote({
      boardId: board.id,
      userId: "local",
      zIndex: 2,
      color: "mint",
      content: DEFAULT_GROUP_NOTE_CONTENT
    })
  ];

  return { boards: [board], notes, selectedBoardId: board.id };
};

const createTemplateBoardSnapshot = (
  userId: string,
  templateKey: BoardTemplateKey,
  sidebarOrder: number,
  columnCount: number
) => {
  const template = BOARD_TEMPLATES.find((item) => item.key === templateKey) ?? BOARD_TEMPLATES[0]!;
  const board = createDefaultBoard(userId, template.title);
  board.description = template.subtitle;
  board.backgroundStyle = template.backgroundStyle;
  board.settings = {
    ...board.settings,
    sidebarOrder,
    layoutStyle: template.layoutStyle ?? "balanced"
  };

  const notes = template.notes.map((note, index) => {
    const created = createNote({
      boardId: board.id,
      userId,
      zIndex: index + 1,
      color: note.color,
      content: note.content
    });
    created.metadata = {
      ...created.metadata,
      ...(note.metadata ?? {})
    };
    return created;
  });

  const organizedNotes = autoOrganizeBoardNotes(
    notes,
    board.id,
    columnCount,
    (template.layoutStyle ?? "balanced") as BoardLayoutStyle
  ).filter((note) => note.boardId === board.id);
  return { board, notes: organizedNotes };
};

const createHomeLandingSnapshot = (userId: string, columnCount: number) => {
  const timestamp = nowIso();
  const board = createDefaultBoard(userId, "WZD Master");
  board.description = "메모와 위젯을 한눈에 보여주는 WZD 샘플 랜딩 보드";
  board.backgroundStyle = "paper";
  board.settings = {
    ...board.settings,
    homeBoard: true,
    layoutStyle: "compact"
  };
  board.updatedAt = timestamp;

  const notes = HOME_LANDING_NOTE_SEEDS.map((seed, index) => {
    const note = createNote({
      boardId: board.id,
      userId,
      zIndex: index + 1,
      color: seed.color,
      content: seed.content
    });
    note.metadata = {
      ...note.metadata,
      ...(seed.metadata ?? {})
    };
    note.updatedAt = timestamp;
    return note;
  });

  return {
    board,
    notes: autoOrganizeBoardNotes(notes, board.id, columnCount, "compact").filter((note) => note.boardId === board.id)
  };
};

const migrateLocalSnapshot = (raw: string): LocalSnapshot => {
  const parsed = JSON.parse(raw) as Partial<LocalSnapshot> & { board?: BoardV2 };

  if (Array.isArray(parsed.boards) && Array.isArray(parsed.notes)) {
    return {
      boards: parsed.boards,
      notes: parsed.notes,
      selectedBoardId: parsed.selectedBoardId ?? parsed.boards[0]?.id ?? null
    };
  }

  if (parsed.board && Array.isArray(parsed.notes)) {
    return {
      boards: [parsed.board],
      notes: parsed.notes,
      selectedBoardId: parsed.board.id
    };
  }

  return createDefaultSnapshot();
};

const loadLocalSnapshot = (): LocalSnapshot => {
  if (typeof window === "undefined") {
    return createDefaultSnapshot();
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return createDefaultSnapshot();
  }

  try {
    return pruneEmptyBoards(migrateLocalSnapshot(raw));
  } catch {
    return createDefaultSnapshot();
  }
};

const readStoredLocalSnapshot = (): LocalSnapshot | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return pruneEmptyBoards(migrateLocalSnapshot(raw));
  } catch {
    return null;
  }
};

const saveLocalSnapshot = (snapshot: LocalSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(pruneEmptyBoards(snapshot)));
};

const clearLocalSnapshot = () => {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

const loadLastViewedBoardId = (userId?: string | null) => {
  if (typeof window === "undefined") {
    return null;
  }

  const key = userId ? `${LAST_VIEWED_BOARD_KEY}:${userId}` : LAST_VIEWED_BOARD_KEY;
  return localStorage.getItem(key);
};

const saveLastViewedBoardId = (boardId: string | null, userId?: string | null) => {
  if (typeof window === "undefined") {
    return;
  }

  const key = userId ? `${LAST_VIEWED_BOARD_KEY}:${userId}` : LAST_VIEWED_BOARD_KEY;
  if (!boardId) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, boardId);
};

const normalizeSnapshotForCompare = (snapshot: LocalSnapshot) => ({
  boards: snapshot.boards.map((board) => ({
    title: board.title,
    description: board.description,
    backgroundStyle: board.backgroundStyle
  })),
  notes: snapshot.notes.map((note) => ({
    content: note.content,
    color: note.color,
    pinned: note.pinned,
    archived: note.archived,
    fontSize: note.metadata?.fontSize ?? DEFAULT_FONT_SIZE
  }))
});

const hasCustomLocalSnapshot = (snapshot: LocalSnapshot | null) => {
  if (!snapshot) {
    return false;
  }

  const defaultSnapshot = createDefaultSnapshot();
  return JSON.stringify(normalizeSnapshotForCompare(snapshot)) !== JSON.stringify(normalizeSnapshotForCompare(defaultSnapshot));
};

const getNoteFontSize = (note: NoteV2): NoteFontSize => {
  const value = note.metadata?.fontSize;
  return value === 14 || value === 16 || value === 18 || value === 20 ? value : DEFAULT_FONT_SIZE;
};

const asText = (value: unknown) => (typeof value === "string" ? value : "");
const clampBoardTitle = (value: string) => value.trim().slice(0, MAX_BOARD_TITLE_LENGTH);

const normalizeExternalUrl = (value: unknown) => {
  let normalized = asText(value).trim();
  if (!normalized || normalized.startsWith("data:image/")) {
    return normalized;
  }

  let previous = "";
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized
      .replace(/^(https?):\/\/(https?):\/\/?/i, "$2://")
      .replace(/^(https?):\/\/(https?)\/\/?/i, "$2://")
      .replace(/^(https?)\/\/+/i, "$1://");
  }

  return normalized;
};

const normalizeUrlsInText = (value: unknown) =>
  asText(value).replace(
    /(?:https?:\/\/https?:\/\/\S+|https?:\/\/https?\/\/\S+|https?:\/\/\S+|https?\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi,
    (match) => normalizeExternalUrl(match)
  );

const normalizeBookmarkMetadata = (metadata: NoteV2["metadata"]) => {
  if (!metadata) {
    return metadata;
  }

  const nextMetadata = { ...metadata };

  if (typeof nextMetadata.bookmarkUrl === "string") {
    nextMetadata.bookmarkUrl = normalizeExternalUrl(nextMetadata.bookmarkUrl);
  }

  if (Array.isArray(nextMetadata.bookmarkUrls)) {
    nextMetadata.bookmarkUrls = nextMetadata.bookmarkUrls
      .filter((value): value is string => typeof value === "string")
      .map((value) => normalizeExternalUrl(value))
      .filter(Boolean);
  } else if (typeof nextMetadata.bookmarkUrls === "string") {
    nextMetadata.bookmarkUrls = nextMetadata.bookmarkUrls
      .split(/\r?\n/)
      .map((value) => normalizeExternalUrl(value))
      .filter(Boolean);
  }

  return nextMetadata;
};

const extractFirstUrl = (content: unknown) => {
  const match = asText(content).match(
    /(?:https?:\/\/https?:\/\/\S+|https?:\/\/https?\/\/\S+|https?:\/\/\S+|https?\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/i
  );
  return match ? normalizeExternalUrl(match[0]) : "";
};

const isImageUrl = (url: string) =>
  url.startsWith("data:image/") ||
  /(\.png|\.jpe?g|\.gif|\.webp|\.avif|\.svg)(\?.*)?$/i.test(url) ||
  url.includes("images.unsplash.com");

const stripUrls = (content: unknown) =>
  asText(content)
    .replace(
      /(?:https?:\/\/https?:\/\/\S+|https?:\/\/https?\/\/\S+|https?:\/\/\S+|https?\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi,
      ""
    )
    .trim();

const getUrlSnippet = (url: string) => {
  const normalizedUrl = normalizeExternalUrl(url);
  if (!normalizedUrl) {
    return "";
  }

  try {
    const parsed = new URL(normalizedUrl);
    const compact = `${parsed.hostname.replace(/^www\./i, "")}${parsed.pathname}${parsed.search}`;
    return compact.length > 48 ? `${compact.slice(0, 48)}...` : compact;
  } catch {
    return normalizedUrl.length > 48 ? `${normalizedUrl.slice(0, 48)}...` : normalizedUrl;
  }
};

const getNoteTitle = (content: unknown) => {
  const cleaned = stripUrls(content);
  const firstLine = cleaned.split("\n").find((line) => line.trim().length > 0) ?? "새 메모";
  return firstLine.slice(0, 48);
};

const serializeNoteEditorState = (note: NoteV2) =>
  JSON.stringify({
    content: note.content,
    color: note.color,
    metadata: note.metadata ?? null
  });

const getFoodDetailsUrl = (region: string, recommendation: FoodRecommendation) => {
  const query = [region, recommendation.name, recommendation.menu].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

const getWeatherDetailsUrl = (location: string, label?: string) => {
  const query = [location, label, "날씨"].filter(Boolean).join(" ");
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

const delay = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const isSameRssItem = (left: RssItem | undefined, right: RssItem | undefined) =>
  (left?.title ?? "") === (right?.title ?? "") &&
  (left?.link ?? "") === (right?.link ?? "") &&
  (left?.pubDate ?? "") === (right?.pubDate ?? "");

const renderMemoTextWithLinks = (content: unknown) => {
  const text = normalizeUrlsInText(content);
  if (!text.trim()) {
    return null;
  }

  const parts = text.split(
    /((?:https?:\/\/https?:\/\/\S+|https?:\/\/https?\/\/\S+|https?:\/\/\S+|https?\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+))/gi
  );

  return parts
    .filter(Boolean)
    .map((part, index) => {
      const normalized = normalizeExternalUrl(part);
      const isUrlPart = /^(?:https?:\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)$/i.test(normalized);

      if (!isUrlPart) {
        return <span key={`memo-text-${index}`}>{part}</span>;
      }

      if (normalized.startsWith("data:image/")) {
        return null;
      }

      return (
        <a
          key={`memo-link-${index}`}
          className="memo-inline-link"
          href={normalized}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => event.stopPropagation()}
        >
          {part}
        </a>
      );
    });
};

const isPlaceholderNoteTitle = (value: string) => {
  const trimmed = value.trim();
  return !trimmed || trimmed === "새 메모";
};

const getLinkDisplaySite = (preview: LinkPreview | null | undefined) => {
  if (!preview) {
    return "";
  }

  return (preview.siteName || preview.hostname).replace(/^www\./i, "");
};

const getLinkDisplayHost = (preview: LinkPreview | null | undefined) => {
  if (!preview) {
    return "";
  }

  return preview.hostname.replace(/^www\./i, "");
};

const isInstagramLinkPreview = (noteUrl: string, preview: LinkPreview | null | undefined) => {
  const candidates = [noteUrl, preview?.finalUrl, preview?.hostname].filter((value): value is string => Boolean(value));

  return candidates.some((value) => /(^|\/\/|\.)(instagram\.com)\b/i.test(value));
};

const getLinkDisplayTitle = (content: unknown, noteUrl: string, preview: LinkPreview | null | undefined) => {
  const noteTitle = getNoteTitle(content);

  if (!preview) {
    return noteTitle;
  }

  if (!isPlaceholderNoteTitle(noteTitle)) {
    return noteTitle;
  }

  return preview.title || getLinkDisplaySite(preview) || getUrlSnippet(noteUrl) || noteTitle;
};

const getLinkDisplayDescription = (content: unknown, noteUrl: string, preview: LinkPreview | null | undefined) => {
  const cleaned = stripUrls(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const noteTitle = getNoteTitle(content);
  const bodyText = cleaned.filter((line, index) => !(index === 0 && line === noteTitle)).join(" ").trim();

  if (bodyText) {
    return bodyText;
  }

  if (preview?.description?.trim()) {
    return preview.description.trim();
  }

  return getUrlSnippet(noteUrl);
};

const normalizePreviewCompareText = (value: unknown) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[|·•"'`“”‘’()[\]{}<>]/g, " ")
    .replace(/[^\p{L}\p{N}\s/@._:-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const isLinkPreviewDuplicateText = (content: unknown, noteUrl: string, preview: LinkPreview | null | undefined) => {
  if (!preview) {
    return false;
  }

  const cleanedLines = stripUrls(content)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (cleanedLines.length === 0) {
    return true;
  }

  const noteTitle = getNoteTitle(content);
  const noteBody = cleanedLines.filter((line, index) => !(index === 0 && line === noteTitle)).join(" ").trim();
  const noteFull = cleanedLines.join(" ").trim();

  const bodyCandidates = [noteBody, noteFull].map(normalizePreviewCompareText).filter(Boolean);

  if (bodyCandidates.length === 0) {
    return true;
  }

  const previewTitle = getLinkDisplayTitle(content, noteUrl, preview);
  const previewDescription = getLinkDisplayDescription(content, noteUrl, preview);
  const previewCandidates = [
    preview?.title,
    preview?.description,
    previewTitle,
    previewDescription,
    `${preview?.title ?? ""} ${preview?.description ?? ""}`,
    `${previewTitle} ${previewDescription}`,
    getLinkDisplaySite(preview),
    getUrlSnippet(noteUrl),
  ]
    .map(normalizePreviewCompareText)
    .filter(Boolean);

  return bodyCandidates.every((bodyCandidate) =>
    previewCandidates.some(
      (previewCandidate) =>
        bodyCandidate === previewCandidate ||
        bodyCandidate.includes(previewCandidate) ||
        previewCandidate.includes(bodyCandidate)
    )
  );
};

const isHomeBoardLocation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/" && !window.location.hash;
};

const isPublicLandingLocation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/landing";
};

const isMarketLocation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/market";
};

const isInsightLocation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/insight";
};

const isUpdatesIndexLocation = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.location.pathname === "/updates";
};

const getUpdateSlugFromLocation = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/updates\/([a-z0-9-]+)$/i);
  return match?.[1] ?? null;
};

const hasPendingAuthHash = () => {
  if (typeof window === "undefined") {
    return false;
  }

  const rawHash = window.location.hash.replace(/^#/, "").trim();
  if (!rawHash) {
    return false;
  }

  const params = new URLSearchParams(rawHash);
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("provider_token") ||
    params.has("error") ||
    params.has("error_code")
  );
};

const hasStoredSupabaseSession = () => {
  // Cookie-based auth — HttpOnly cookies are invisible to JS. The brief
  // window between mount and getMe() resolving is bounded; rely on
  // authChecked to flip false→true instead of pre-checking storage.
  return false;
};

const getSharedBoardSlugFromLocation = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/board\/([a-z0-9_-]+)$/i);
  return match?.[1] ?? null;
};
const isHomeBoard = (board: BoardV2 | null) => Boolean(board?.settings?.homeBoard);
const getPreferredHomeBoardId = (boards: BoardV2[]) => boards.find((board) => !isBoardTrashed(board) && isHomeBoard(board))?.id ?? null;
const isHomeAdminEmail = (email?: string | null) => Boolean(email && email.trim().toLowerCase() === HOME_ADMIN_EMAIL);
const getBoardShareSlug = (board: BoardV2 | null) =>
  typeof board?.settings?.sharedSlug === "string" && board.settings.sharedSlug.trim() ? board.settings.sharedSlug.trim() : "";
const makeBoardShareUrl = (slug: string) => {
  if (!slug) {
    return "";
  }

  if (typeof window === "undefined") {
    return `https://www.wzd.kr/board/${slug}`;
  }

  return `${window.location.origin}/board/${slug}`;
};
const makeShareSlug = (length = 8) => {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
};
const normalizeLegacyText = (value: unknown) =>
  LEGACY_TEXT_REPLACEMENTS.reduce((current, [from, to]) => current.split(from).join(to), asText(value));
const getTrashDateValue = (value: unknown) => {
  if (typeof value !== "string" || !value) {
    return null;
  }

  return Number.isNaN(Date.parse(value)) ? null : value;
};
const isTrashExpired = (value: string | null) => {
  if (!value) {
    return false;
  }

  return Date.now() - Date.parse(value) > TRASH_RETENTION_MS;
};
const getBoardTrashedAt = (board: BoardV2) => getTrashDateValue(board.settings?.trashedAt);
const getNoteTrashedAt = (note: NoteV2) =>
  getTrashDateValue(note.metadata?.trashedAt ?? (note.archived ? note.updatedAt : null));
const isBoardTrashed = (board: BoardV2) => {
  const trashedAt = getBoardTrashedAt(board);
  return Boolean(trashedAt) && !isTrashExpired(trashedAt);
};
const isNoteTrashed = (note: NoteV2) => {
  const trashedAt = getNoteTrashedAt(note);
  return Boolean(trashedAt) && !isTrashExpired(trashedAt);
};
const clearTrashedAt = (value: Record<string, unknown>) => {
  const next = { ...value };
  delete next.trashedAt;
  return next;
};
const sanitizeDuplicatedBoardSettings = (settings: Record<string, unknown>, sidebarOrder: number) => {
  const next: Record<string, unknown> = { ...settings, sidebarOrder };
  delete next.trashedAt;
  delete next.sharedSlug;
  delete next.historySnapshots;
  return next;
};
const cloneNoteForHistory = (note: NoteV2): NoteV2 => ({
  ...note,
  metadata: { ...note.metadata }
});
const formatHistorySnapshotLabel = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "저장본";
  }

  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};
const getBoardHistorySnapshots = (board: BoardV2 | null | undefined): BoardHistorySnapshot[] => {
  const rawSnapshots = board?.settings?.historySnapshots;
  if (!Array.isArray(rawSnapshots)) {
    return [];
  }

  return rawSnapshots
    .map((raw) => {
      if (!raw || typeof raw !== "object") {
        return null;
      }

      const snapshot = raw as Record<string, unknown>;
      const rawNotes = Array.isArray(snapshot.notes) ? snapshot.notes : [];
      const notes = rawNotes
        .filter((note): note is Record<string, unknown> => Boolean(note) && typeof note === "object")
        .map((note) => ({
          id: typeof note.id === "string" ? note.id : makeId(),
          boardId: typeof note.boardId === "string" ? note.boardId : board?.id ?? "",
          userId: typeof note.userId === "string" ? note.userId : board?.userId ?? "",
          content: normalizeUrlsInText(normalizeLegacyText(note.content)),
          color: NOTE_COLORS.includes(note.color as NoteColor) ? (note.color as NoteColor) : "yellow",
          x: typeof note.x === "number" ? note.x : 0,
          y: typeof note.y === "number" ? note.y : 0,
          w: typeof note.w === "number" ? note.w : 1,
          h: typeof note.h === "number" ? note.h : 1,
          zIndex: typeof note.zIndex === "number" ? note.zIndex : 1,
          rotation: typeof note.rotation === "number" ? note.rotation : 0,
          pinned: Boolean(note.pinned),
          archived: Boolean(note.archived),
          metadata: normalizeBookmarkMetadata(
            note.metadata && typeof note.metadata === "object" ? (note.metadata as Record<string, unknown>) : {}
          ),
          updatedAt: typeof note.updatedAt === "string" ? note.updatedAt : nowIso()
        }));

      const createdAt = typeof snapshot.createdAt === "string" ? snapshot.createdAt : nowIso();

      return {
        id: typeof snapshot.id === "string" ? snapshot.id : makeId(),
        createdAt,
        label:
          typeof snapshot.label === "string" && snapshot.label.trim()
            ? snapshot.label
            : `${formatHistorySnapshotLabel(createdAt)} 저장본`,
        boardTitle: typeof snapshot.boardTitle === "string" ? snapshot.boardTitle : board?.title ?? "My Board",
        boardDescription: typeof snapshot.boardDescription === "string" ? snapshot.boardDescription : "",
        backgroundStyle:
          snapshot.backgroundStyle === "cork" ||
          snapshot.backgroundStyle === "whiteboard" ||
          snapshot.backgroundStyle === "paper"
            ? snapshot.backgroundStyle
            : board?.backgroundStyle ?? "paper",
        layoutStyle: isBoardLayoutStyle(snapshot.layoutStyle) ? snapshot.layoutStyle : getBoardLayoutStyle(board),
        notes
      } satisfies BoardHistorySnapshot;
    })
    .filter((snapshot): snapshot is BoardHistorySnapshot => Boolean(snapshot))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
};
const getBoardOrder = (board: BoardV2) =>
  typeof board.settings?.sidebarOrder === "number" ? board.settings.sidebarOrder : Number.MAX_SAFE_INTEGER;
const sortBoards = (boards: BoardV2[]) =>
  [...boards].sort((a, b) => {
    const orderDiff = getBoardOrder(a) - getBoardOrder(b);
    if (orderDiff !== 0) {
      return orderDiff;
    }
    return a.updatedAt.localeCompare(b.updatedAt);
  });
const getWidgetType = (note: NoteV2): WidgetType =>
  note.metadata?.widgetType === "brain" ||
  note.metadata?.widgetType === "rss" ||
  note.metadata?.widgetType === "social" ||
  note.metadata?.widgetType === "bookmark" ||
  note.metadata?.widgetType === "checklist" ||
  note.metadata?.widgetType === "countdown" ||
  note.metadata?.widgetType === "timetable" ||
  note.metadata?.widgetType === "player" ||
  note.metadata?.widgetType === "calculator" ||
  note.metadata?.widgetType === "clock" ||
  note.metadata?.widgetType === "speed" ||
  note.metadata?.widgetType === "profile" ||
  note.metadata?.widgetType === "weather" ||
  note.metadata?.widgetType === "trending" ||
  note.metadata?.widgetType === "delivery" ||
  note.metadata?.widgetType === "pet" ||
  note.metadata?.widgetType === "cover" ||
  note.metadata?.widgetType === "document" ||
  note.metadata?.widgetType === "focus" ||
  note.metadata?.widgetType === "mood" ||
  note.metadata?.widgetType === "routine" ||
  note.metadata?.widgetType === "prompt" ||
  note.metadata?.widgetType === "food" ||
  note.metadata?.widgetType === "blog"
    ? note.metadata.widgetType
    : "note";
const getRssFeedUrl = (note: NoteV2) =>
  typeof note.metadata?.feedUrl === "string" && note.metadata.feedUrl.trim()
    ? note.metadata.feedUrl.trim()
    : DEFAULT_RSS_FEED_URL;
const getBlogFeedUrl = () => BLOG_FEED_URL;
const getSocialSource = (note: NoteV2) =>
  typeof note.metadata?.socialSource === "string" && note.metadata.socialSource.trim()
    ? note.metadata.socialSource.trim()
    : DEFAULT_SOCIAL_SOURCE;
const isBrainAgentRole = (value: unknown): value is AgentRole =>
  value === "developer" || value === "planner" || value === "pm";
const getBrainAgentType = (note: NoteV2): AgentRole =>
  isBrainAgentRole(note.metadata?.brainAgentType) ? note.metadata.brainAgentType : DEFAULT_BRAIN_AGENT_TYPE;
const getBrainPrompt = (note: NoteV2) =>
  typeof note.metadata?.brainPrompt === "string" && note.metadata.brainPrompt.trim()
    ? note.metadata.brainPrompt
    : DEFAULT_BRAIN_PROMPT;
const getBrainContext = (note: NoteV2) =>
  typeof note.metadata?.brainContext === "string" && note.metadata.brainContext.trim()
    ? note.metadata.brainContext
    : DEFAULT_BRAIN_CONTEXT;
const getBrainAnswer = (note: NoteV2) =>
  typeof note.metadata?.brainAnswer === "string" && note.metadata.brainAnswer.trim() ? note.metadata.brainAnswer : "";
const getBrainError = (note: NoteV2) =>
  typeof note.metadata?.brainError === "string" && note.metadata.brainError.trim() ? note.metadata.brainError : "";
const getBookmarkUrl = (note: NoteV2) =>
  typeof note.metadata?.bookmarkUrl === "string" && note.metadata.bookmarkUrl.trim()
    ? normalizeExternalUrl(note.metadata.bookmarkUrl)
    : DEFAULT_BOOKMARK_URL;
const getBookmarkUrls = (note: NoteV2) => {
  const rawList = note.metadata?.bookmarkUrls;
  if (Array.isArray(rawList)) {
    return rawList
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => normalizeExternalUrl(value))
      .filter(Boolean);
  }

  if (typeof rawList === "string" && rawList.trim()) {
    return rawList
      .split(/\r?\n/)
      .map((value) => normalizeExternalUrl(value))
      .filter(Boolean);
  }

  const single = getBookmarkUrl(note);
  return single && single !== DEFAULT_BOOKMARK_URL ? [single] : [];
};

const normalizeChecklistText = (value: string) => value.replace(/^\s*[-*]?\s*(\[(x|X| )\])?\s*/, "").trim();

const parseChecklistItems = (value: string): ChecklistItem[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const checked = /^\s*[-*]?\s*\[(x|X)\]/.test(line);
      return {
        text: normalizeChecklistText(line),
        checked
      };
    })
    .filter((item) => item.text.length > 0);

const getChecklistItems = (note: NoteV2): ChecklistItem[] => {
  const rawList = note.metadata?.checklistItems;
  if (Array.isArray(rawList)) {
    const items = rawList
      .map((item) =>
        typeof item === "object" && item && "text" in item
          ? {
              text: String((item as { text?: unknown }).text ?? "").trim(),
              checked: Boolean((item as { checked?: unknown }).checked)
            }
          : null
      )
      .filter((item): item is ChecklistItem => Boolean(item && item.text));
    if (items.length > 0) {
      return items;
    }
  }

  if (typeof note.metadata?.checklistText === "string" && note.metadata.checklistText.trim()) {
    return parseChecklistItems(note.metadata.checklistText);
  }

  return DEFAULT_CHECKLIST_ITEMS;
};

const serializeChecklistItems = (items: ChecklistItem[]) =>
  items.map((item) => `${item.checked ? "[x]" : "[ ]"} ${item.text}`.trim()).join("\n");

const getCoverSubtitle = (note: NoteV2) =>
  typeof note.metadata?.coverSubtitle === "string" && note.metadata.coverSubtitle.trim()
    ? note.metadata.coverSubtitle.trim()
    : DEFAULT_COVER_SUBTITLE;

const isDocumentVariant = (value: unknown): value is DocumentWidgetVariant =>
  value === "hero" || value === "section" || value === "feature" || value === "cta";

const getDocumentVariant = (note: NoteV2): DocumentWidgetVariant =>
  isDocumentVariant(note.metadata?.documentVariant) ? note.metadata.documentVariant : DEFAULT_DOCUMENT_VARIANT;

const getDocumentKicker = (note: NoteV2) => {
  const rawKicker =
    typeof note.metadata?.documentKicker === "string" && note.metadata.documentKicker.trim()
      ? note.metadata.documentKicker.trim()
      : DEFAULT_DOCUMENT_KICKER;

  return rawKicker === "WZD MASTER" ? "" : rawKicker;
};

const getDocumentBody = (note: NoteV2) =>
  typeof note.metadata?.documentBody === "string" && note.metadata.documentBody.trim()
    ? note.metadata.documentBody
    : DEFAULT_DOCUMENT_BODY;

const getDocumentPrimaryCta = (note: NoteV2) =>
  typeof note.metadata?.documentPrimaryCta === "string" ? note.metadata.documentPrimaryCta.trim() : "";

const getDocumentSecondaryCta = (note: NoteV2) =>
  typeof note.metadata?.documentSecondaryCta === "string" ? note.metadata.documentSecondaryCta.trim() : "";

const getDocumentPrimaryCtaUrl = (note: NoteV2) =>
  typeof note.metadata?.documentPrimaryCtaUrl === "string" && note.metadata.documentPrimaryCtaUrl.trim()
    ? normalizeExternalUrl(note.metadata.documentPrimaryCtaUrl)
    : "";

const getDocumentSecondaryCtaUrl = (note: NoteV2) =>
  typeof note.metadata?.documentSecondaryCtaUrl === "string" && note.metadata.documentSecondaryCtaUrl.trim()
    ? normalizeExternalUrl(note.metadata.documentSecondaryCtaUrl)
    : "";

const getFocusDurationMinutes = (note: NoteV2) =>
  typeof note.metadata?.focusDurationMinutes === "number" && note.metadata.focusDurationMinutes > 0
    ? Math.max(1, Math.min(180, Math.round(note.metadata.focusDurationMinutes)))
    : DEFAULT_FOCUS_DURATION_MINUTES;

const getFocusStartedAt = (note: NoteV2) =>
  typeof note.metadata?.focusStartedAt === "string" && note.metadata.focusStartedAt.trim() ? note.metadata.focusStartedAt : "";

const getFocusElapsedSeconds = (note: NoteV2) =>
  typeof note.metadata?.focusElapsedSeconds === "number" && note.metadata.focusElapsedSeconds > 0
    ? Math.max(0, Math.round(note.metadata.focusElapsedSeconds))
    : 0;

const getFocusSnapshot = (note: NoteV2, nowMs: number) => {
  const durationMinutes = getFocusDurationMinutes(note);
  const startedAt = getFocusStartedAt(note);
  const baseElapsedSeconds = getFocusElapsedSeconds(note);
  const isRunning = Boolean(startedAt);
  const runningSeconds = startedAt ? Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000)) : 0;
  const elapsedSeconds = baseElapsedSeconds + runningSeconds;
  const totalSeconds = durationMinutes * 60;
  const progress = totalSeconds > 0 ? Math.min(1, elapsedSeconds / totalSeconds) : 0;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  return { durationMinutes, elapsedSeconds, progress, remainingSeconds, isRunning };
};

const getMoodEmoji = (note: NoteV2) =>
  typeof note.metadata?.moodEmoji === "string" && note.metadata.moodEmoji.trim() ? note.metadata.moodEmoji.trim() : DEFAULT_MOOD_EMOJI;

const getMoodNote = (note: NoteV2) =>
  typeof note.metadata?.moodNote === "string" && note.metadata.moodNote.trim() ? note.metadata.moodNote.trim() : DEFAULT_MOOD_NOTE;

const getMoodEnergy = (note: NoteV2) =>
  typeof note.metadata?.moodEnergy === "number" && note.metadata.moodEnergy >= 1 && note.metadata.moodEnergy <= 5
    ? Math.round(note.metadata.moodEnergy)
    : DEFAULT_MOOD_ENERGY;

const getRoutineItems = (note: NoteV2) => {
  const rawList = note.metadata?.routineItems;
  if (Array.isArray(rawList)) {
    const items = rawList
      .map((item) =>
        typeof item === "object" && item && "text" in item
          ? {
              text: String((item as { text?: unknown }).text ?? "").trim(),
              checked: Boolean((item as { checked?: unknown }).checked)
            }
          : null
      )
      .filter((item): item is ChecklistItem => Boolean(item && item.text));
    if (items.length > 0) {
      return items;
    }
  }

  if (typeof note.metadata?.routineText === "string" && note.metadata.routineText.trim()) {
    return parseChecklistItems(note.metadata.routineText);
  }

  return DEFAULT_ROUTINE_ITEMS;
};

const getPromptText = (note: NoteV2) =>
  typeof note.metadata?.promptText === "string" && note.metadata.promptText.trim()
    ? note.metadata.promptText
    : DEFAULT_PROMPT_TEXT;

const normalizeFoodRegion = (value: string | undefined | null) => {
  const query = typeof value === "string" ? value.trim() : "";
  if (!query) {
    return DEFAULT_FOOD_REGION;
  }

  const exact = Object.keys(FOOD_RECOMMENDATIONS_BY_REGION).find((region) => region === query);
  if (exact) {
    return exact;
  }

  const included = Object.keys(FOOD_RECOMMENDATIONS_BY_REGION).find(
    (region) => query.includes(region) || region.includes(query)
  );
  return included ?? DEFAULT_FOOD_REGION;
};

const getFoodRegion = (note: NoteV2) =>
  typeof note.metadata?.foodRegion === "string" && note.metadata.foodRegion.trim()
    ? note.metadata.foodRegion.trim()
    : DEFAULT_FOOD_REGION;

const getFoodSeed = (note: NoteV2) =>
  typeof note.metadata?.foodSeed === "number" && Number.isFinite(note.metadata.foodSeed)
    ? note.metadata.foodSeed
    : 0;

const buildFoodRecommendationSet = (regionQuery: string, seed: number) => {
  const region = normalizeFoodRegion(regionQuery);
  const source = FOOD_RECOMMENDATIONS_BY_REGION[region] ?? FOOD_RECOMMENDATIONS_BY_REGION[DEFAULT_FOOD_REGION];
  return {
    region,
    entries: (Object.keys(FOOD_CATEGORY_LABELS) as FoodCategoryKey[]).map((category, index) => {
      const items = source[category];
      const item = items[(Math.abs(seed) + index) % items.length];
      return {
        category,
        label: FOOD_CATEGORY_LABELS[category],
        item
      };
    })
  };
};

const getCountdownTargetDate = (note: NoteV2) =>
  typeof note.metadata?.targetDate === "string" && note.metadata.targetDate.trim() ? note.metadata.targetDate : "";

const getCountdownDescription = (note: NoteV2) =>
  typeof note.metadata?.countdownDescription === "string" ? note.metadata.countdownDescription.trim() : "";

const normalizeTimetableText = (value: string) =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

const getPlayerArtist = (note: NoteV2) =>
  typeof note.metadata?.playerArtist === "string" && note.metadata.playerArtist.trim()
    ? note.metadata.playerArtist.trim()
    : DEFAULT_PLAYER_ARTIST;

const getPlayerUrl = (note: NoteV2) =>
  typeof note.metadata?.playerUrl === "string" && note.metadata.playerUrl.trim()
    ? note.metadata.playerUrl.trim()
    : DEFAULT_PLAYER_URL;

const getCalculatorDisplay = (note: NoteV2) =>
  typeof note.metadata?.calculatorDisplay === "string" && note.metadata.calculatorDisplay.trim()
    ? note.metadata.calculatorDisplay.trim()
    : DEFAULT_CALCULATOR_DISPLAY;

const getCalculatorStoredValue = (note: NoteV2) =>
  typeof note.metadata?.calculatorStoredValue === "number" && Number.isFinite(note.metadata.calculatorStoredValue)
    ? note.metadata.calculatorStoredValue
    : null;

const isCalculatorOperator = (value: unknown): value is CalculatorOperator =>
  value === "+" || value === "-" || value === "×" || value === "÷";

const getCalculatorOperator = (note: NoteV2) =>
  isCalculatorOperator(note.metadata?.calculatorOperator) ? note.metadata.calculatorOperator : null;

const getCalculatorReplaceOnInput = (note: NoteV2) => Boolean(note.metadata?.calculatorReplaceOnInput);

const formatCalculatorNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return "오류";
  }

  const rounded = Math.round((value + Number.EPSILON) * 100000000) / 100000000;
  const raw = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
  return raw === "-0" ? "0" : raw;
};

const computeCalculatorResult = (left: number, right: number, operator: CalculatorOperator) => {
  switch (operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "×":
      return left * right;
    case "÷":
      return right === 0 ? NaN : left / right;
    default:
      return right;
  }
};

const extractYouTubeVideoId = (rawUrl: string) => {
  try {
    const url = new URL(normalizeExternalUrl(rawUrl));
    const host = url.hostname.replace(/^www\./i, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (url.pathname === "/watch") {
        return url.searchParams.get("v");
      }

      const segments = url.pathname.split("/").filter(Boolean);
      if (segments[0] === "shorts" || segments[0] === "embed" || segments[0] === "live") {
        return segments[1] ?? null;
      }
    }
  } catch {
    return null;
  }

  return null;
};

const formatSocialDate = (value: string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const isYouTubePlayerUrl = (rawUrl: string) => Boolean(extractYouTubeVideoId(rawUrl));

let youtubeIframeApiPromise: Promise<void> | null = null;

const loadYouTubeIframeApi = () => {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (!youtubeIframeApiPromise) {
    youtubeIframeApiPromise = new Promise((resolve) => {
      const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
      const previousReady = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
        previousReady?.();
        resolve();
      };

      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }

  return youtubeIframeApiPromise;
};

const formatAudioTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "00:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(remainSeconds).padStart(2, "0")}`;
};

const parseTimetableEntries = (value: string): TimetableEntry[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [day = "", start = "", end = "", title = "", location = ""] = line.split("|").map((part) => part.trim());
      return {
        day,
        start,
        end,
        title,
        location
      };
    })
    .filter((entry) => entry.day && entry.start && entry.end && entry.title);

const getTimetableText = (note: NoteV2) =>
  typeof note.metadata?.timetableText === "string" && note.metadata.timetableText.trim()
    ? note.metadata.timetableText
    : DEFAULT_TIMETABLE_TEXT;

const getTimetableEntries = (note: NoteV2) => parseTimetableEntries(getTimetableText(note));

const isClockWidgetMode = (value: unknown): value is ClockWidgetMode => value === "digital" || value === "analog";

const getClockMode = (note: NoteV2): ClockWidgetMode =>
  isClockWidgetMode(note.metadata?.clockMode) ? note.metadata.clockMode : DEFAULT_CLOCK_MODE;

const getSpeedLabel = (note: NoteV2) =>
  typeof note.metadata?.speedLabel === "string" && note.metadata.speedLabel.trim()
    ? note.metadata.speedLabel.trim()
    : DEFAULT_SPEED_LABEL;

const getProfileName = (note: NoteV2) =>
  typeof note.metadata?.profileName === "string" && note.metadata.profileName.trim()
    ? note.metadata.profileName.trim()
    : DEFAULT_PROFILE_NAME;

const getProfileBirthdate = (note: NoteV2) =>
  typeof note.metadata?.profileBirthdate === "string" && note.metadata.profileBirthdate.trim()
    ? note.metadata.profileBirthdate.trim()
    : DEFAULT_PROFILE_BIRTHDATE;

const getProfileOccupation = (note: NoteV2) =>
  typeof note.metadata?.profileOccupation === "string" && note.metadata.profileOccupation.trim()
    ? note.metadata.profileOccupation.trim()
    : DEFAULT_PROFILE_OCCUPATION;

const getProfileImageUrl = (note: NoteV2) =>
  typeof note.metadata?.profileImageUrl === "string" && note.metadata.profileImageUrl.trim()
    ? normalizeExternalUrl(note.metadata.profileImageUrl)
    : DEFAULT_PROFILE_IMAGE_URL;

const getWeatherQuery = (note: NoteV2) =>
  typeof note.metadata?.weatherQuery === "string" && note.metadata.weatherQuery.trim()
    ? note.metadata.weatherQuery.trim()
    : DEFAULT_WEATHER_QUERY;

const getWeatherLatitude = (note: NoteV2) =>
  typeof note.metadata?.weatherLatitude === "number" ? note.metadata.weatherLatitude : null;

const getWeatherLongitude = (note: NoteV2) =>
  typeof note.metadata?.weatherLongitude === "number" ? note.metadata.weatherLongitude : null;

const getTrendingRegion = (note: NoteV2) =>
  typeof note.metadata?.trendingRegion === "string" && note.metadata.trendingRegion.trim()
    ? note.metadata.trendingRegion.trim().toUpperCase()
    : DEFAULT_TRENDING_REGION;

const getDeliveryCarrierId = (note: NoteV2) =>
  typeof note.metadata?.deliveryCarrierId === "string" && note.metadata.deliveryCarrierId.trim()
    ? note.metadata.deliveryCarrierId.trim()
    : DEFAULT_DELIVERY_CARRIER;

const getDeliveryTrackingNumber = (note: NoteV2) =>
  typeof note.metadata?.deliveryTrackingNumber === "string" ? note.metadata.deliveryTrackingNumber.trim() : "";

const getDeliveryLabel = (note: NoteV2) =>
  typeof note.metadata?.deliveryLabel === "string" ? note.metadata.deliveryLabel.trim() : "";

const getSpeedGrade = (downloadMbps: number | null) => {
  if (downloadMbps === null) return "측정 필요";
  if (downloadMbps >= 100) return "매우 빠름";
  if (downloadMbps >= 40) return "쾌적";
  if (downloadMbps >= 15) return "보통";
  return "느림";
};

const formatSpeedMeasuredAt = (iso: string) => {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });
};

const getPetName = (note: NoteV2) =>
  typeof note.metadata?.petName === "string" && note.metadata.petName.trim() ? note.metadata.petName.trim() : DEFAULT_PET_NAME;

const loadPetVisitCounts = () => {
  if (typeof window === "undefined") {
    return {} as Record<string, number>;
  }

  try {
    const raw = window.localStorage.getItem(PET_VISIT_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === "number")
    );
  } catch {
    return {};
  }
};

const savePetVisitCounts = (counts: Record<string, number>) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(PET_VISIT_STORAGE_KEY, JSON.stringify(counts));
};

const registerBoardVisit = (boardId: string) => {
  if (typeof window === "undefined") {
    return {} as Record<string, number>;
  }

  const sessionKey = `${PET_VISIT_SESSION_PREFIX}${boardId}`;
  const counts = loadPetVisitCounts();
  if (!window.sessionStorage.getItem(sessionKey)) {
    counts[boardId] = (counts[boardId] ?? 0) + 1;
    savePetVisitCounts(counts);
    window.sessionStorage.setItem(sessionKey, "1");
  }

  return counts;
};

const getPetStage = (visitCount: number) => {
  if (visitCount >= 50) return { emoji: "🐻", label: "마스터", message: "이 보드를 완전히 자기 집처럼 느끼고 있어요." };
  if (visitCount >= 25) return { emoji: "🦊", label: "탐험가", message: "방문자가 늘수록 점점 더 활발해지고 있어요." };
  if (visitCount >= 10) return { emoji: "🐣", label: "성장중", message: "조금만 더 돌봐주면 다음 단계로 진화해요." };
  if (visitCount >= 3) return { emoji: "🌱", label: "새싹", message: "방문이 쌓이면서 슬슬 움직이기 시작했어요." };
  return { emoji: "🥚", label: "알", message: "첫 방문자를 기다리며 조용히 잠들어 있어요." };
};

const formatTimeRange = (start: string, end: string) => `${start}~${end}`;
const formatClockTime = (value: Date) =>
  value.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

const formatClockDate = (value: Date) =>
  value.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  });

const formatProfileBirthdate = (value: string) => {
  if (!value) {
    return "";
  }

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const getKoreanAgeLabel = (birthdate: string, referenceDate = new Date()) => {
  if (!birthdate) {
    return "";
  }

  const parsed = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const koreanAge = referenceDate.getFullYear() - parsed.getFullYear() + 1;
  return `${koreanAge}세`;
};

const formatCountdownLabel = (targetDate: string) => {
  if (!targetDate) {
    return "날짜 선택";
  }

  const target = new Date(targetDate);
  if (Number.isNaN(target.getTime())) {
    return "날짜 오류";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "D-Day";
  if (diffDays > 0) return `D-${diffDays}`;
  return `D+${Math.abs(diffDays)}`;
};

const getAttachedImageUrl = (note: NoteV2) =>
  typeof note.metadata?.pastedImageUrl === "string" && note.metadata.pastedImageUrl.trim()
    ? note.metadata.pastedImageUrl.trim()
    : "";
const isDisposableEmptyNote = (note: NoteV2) => {
  if (getWidgetType(note) !== "note") {
    return false;
  }

  const trimmed = asText(note.content).trim();
  if (!trimmed) {
    return true;
  }

  return trimmed === "새 메모" || trimmed === "https://" || trimmed === DEFAULT_NEW_NOTE_CONTENT.trim();
};

const sanitizeNotes = (notes: NoteV2[]) =>
  notes
    .map((note) => ({
      ...note,
      content: normalizeUrlsInText(normalizeLegacyText(note.content)),
      metadata: normalizeBookmarkMetadata(note.metadata)
    }))
    .filter((note) => !isDisposableEmptyNote(note) && !isTrashExpired(getNoteTrashedAt(note)));
const pruneEmptyBoards = (snapshot: LocalSnapshot): LocalSnapshot => {
  const boards = snapshot.boards.filter((board) => !isTrashExpired(getBoardTrashedAt(board)));
  const boardIds = new Set(boards.map((board) => board.id));
  const notes = sanitizeNotes(snapshot.notes).filter((note) => boardIds.has(note.boardId));
  const activeBoards = boards.filter((board) => !isBoardTrashed(board));
  const selectedBoardId =
    activeBoards.some((board) => board.id === snapshot.selectedBoardId)
      ? snapshot.selectedBoardId
      : activeBoards[0]?.id ?? boards[0]?.id ?? snapshot.selectedBoardId ?? null;

  return {
    boards,
    notes,
    selectedBoardId
  };
};

const makeBoardTitle = (boards: BoardV2[]) => {
  let index = boards.length + 1;
  let title = `Board ${index}`;

  while (boards.some((board) => board.title === title)) {
    index += 1;
    title = `Board ${index}`;
  }

  return title;
};

const isInteractiveElement = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest("textarea, input, button, a"));

const getColumnCount = () => {
  if (typeof window === "undefined") {
    return 4;
  }

  if (window.innerWidth < MOBILE_SINGLE_COLUMN_BREAKPOINT) {
    return 1;
  }

  if (window.innerWidth < MOBILE_LAYOUT_BREAKPOINT) {
    return 2;
  }

  const estimatedColumns = Math.floor((window.innerWidth - 120) / 280);
  return Math.max(2, Math.min(7, estimatedColumns));
};

const getNoteColumn = (note: NoteV2, columnCount: number) => {
  const value = note.metadata?.column;
  if (typeof value === "number" && value >= 0 && value < columnCount) {
    return value;
  }

  return Math.abs((note.zIndex - 1) % columnCount);
};

const groupNotesByColumn = (notes: NoteV2[], columnCount: number) => {
  const columns = Array.from({ length: columnCount }, () => [] as NoteV2[]);

  [...notes]
    .sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }

      return a.zIndex - b.zIndex;
    })
    .forEach((note) => {
      columns[getNoteColumn(note, columnCount)]?.push(note);
    });

  return columns;
};

const reorderNotes = (
  notes: NoteV2[],
  draggedNoteId: string,
  targetNoteId: string | undefined,
  targetColumn: number,
  columnCount: number
): NoteV2[] => {
  const dragged = notes.find((note) => note.id === draggedNoteId);
  if (!dragged) {
    return notes;
  }

  const boardId = dragged.boardId;
  const boardActiveNotes = notes
    .filter((note) => note.boardId === boardId && !note.archived)
    .sort((a, b) => a.zIndex - b.zIndex);
  const boardArchivedNotes = notes.filter((note) => note.boardId === boardId && note.archived);
  const otherNotes = notes.filter((note) => note.boardId !== boardId);
  const columns = groupNotesByColumn(boardActiveNotes, columnCount);
  const sourceColumn = getNoteColumn(dragged, columnCount);

  columns[sourceColumn] = columns[sourceColumn].filter((note) => note.id !== draggedNoteId);

  const destinationColumn = targetNoteId
    ? getNoteColumn(boardActiveNotes.find((note) => note.id === targetNoteId) ?? dragged, columnCount)
    : targetColumn;

  const movedNote = {
    ...dragged,
    metadata: {
      ...dragged.metadata,
      column: destinationColumn
    }
  };

  if (targetNoteId) {
    const targetIndex = columns[destinationColumn].findIndex((note) => note.id === targetNoteId);
    if (targetIndex >= 0) {
      columns[destinationColumn].splice(targetIndex, 0, movedNote);
    } else {
      columns[destinationColumn].push(movedNote);
    }
  } else {
    columns[destinationColumn].push(movedNote);
  }

  let nextZIndex = 1;
  const updatedAt = nowIso();
  const reordered = columns.flatMap((column, columnIndex) =>
    column.map((note) => ({
      ...note,
      zIndex: nextZIndex++,
      metadata: {
        ...note.metadata,
        column: columnIndex
      },
      updatedAt
    }))
  );

  return [...otherNotes, ...reordered, ...boardArchivedNotes];
};

const getAutoLayoutPriority = (note: NoteV2) => {
  const widgetType = getWidgetType(note);
  if (widgetType === "cover") return -1;
  if (widgetType === "document") return 0;
  if (widgetType === "focus") return 1;
  if (widgetType === "player") return 1;
  if (widgetType === "calculator") return 1;
  if (widgetType === "clock") return 1;
  if (widgetType === "profile") return 1;
  if (widgetType === "mood") return 2;
  if (widgetType === "routine") return 2;
  if (widgetType === "prompt") return 1;
  if (widgetType === "food") return 1;
  if (widgetType === "rss") return 0;
  if (widgetType === "blog") return 0;
  if (widgetType === "bookmark") return 1;
  if (widgetType === "checklist") return 2;
  if (widgetType === "countdown") return 2;
  if (widgetType === "weather") return 1;
  if (widgetType === "trending") return 1;
  if (widgetType === "delivery") return 2;
  if (widgetType === "timetable") return 2;
  if (widgetType === "pet") return 3;
  if (getAttachedImageUrl(note)) return 2;

  const noteUrl = extractFirstUrl(note.content);
  if (noteUrl && isImageUrl(noteUrl)) return 2;
  if (noteUrl) return 3;

  return 4;
};

type AutoLayoutCategory =
  | "cover"
  | "focus"
  | "mood"
  | "routine"
  | "prompt"
  | "rss"
  | "bookmark"
  | "checklist"
  | "countdown"
  | "timetable"
  | "clock"
  | "profile"
  | "weather"
  | "trending"
  | "delivery"
  | "pet"
  | "image"
  | "link"
  | "text";

const BOARD_LAYOUT_STYLES: Array<{
  key: BoardLayoutStyle;
  label: string;
  description: string;
}> = [
  { key: "balanced", label: "균형형", description: "카드 종류를 적당히 섞어 균형 있게 배치합니다." },
  { key: "compact", label: "콤팩트형", description: "낮은 컬럼을 먼저 채워 스크롤을 줄이는 방향으로 정리합니다." },
  { key: "visual", label: "종류별 정리", description: "메모와 위젯 비중을 보고 한쪽 컬럼군씩 묶어서 정리합니다." }
];

const isBoardLayoutStyle = (value: unknown): value is BoardLayoutStyle =>
  value === "balanced" || value === "compact" || value === "visual";

const getBoardLayoutStyle = (board: BoardV2 | null | undefined): BoardLayoutStyle => {
  const value = board?.settings?.layoutStyle;
  return isBoardLayoutStyle(value) ? value : "balanced";
};

const getBackgroundStyleForTheme = (themeId: BoardThemeId): BoardBackgroundStyle => {
  if (themeId === "glass-studio") {
    return "whiteboard";
  }

  if (themeId === "creator-mood" || themeId === "cozy-room") {
    return "cork";
  }

  return "paper";
};

const getInitialSubscriptionTier = (): SubscriptionTier => {
  if (typeof window === "undefined") {
    return "free";
  }

  const raw = window.localStorage.getItem(SUBSCRIPTION_TIER_KEY);
  return raw === "starter-5" || raw === "pro-10" ? raw : "free";
};

const persistSubscriptionTier = (tier: SubscriptionTier) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SUBSCRIPTION_TIER_KEY, tier);
};

const getAutoLayoutCategory = (note: NoteV2): AutoLayoutCategory => {
  const widgetType = getWidgetType(note);
  if (widgetType === "cover") return "cover";
  if (widgetType === "document") return "cover";
  if (widgetType === "brain") return "prompt";
  if (widgetType === "focus") return "focus";
  if (widgetType === "player") return "focus";
  if (widgetType === "calculator") return "clock";
  if (widgetType === "mood") return "mood";
  if (widgetType === "routine") return "routine";
  if (widgetType === "prompt") return "prompt";
  if (widgetType === "food") return "prompt";
  if (widgetType === "rss") return "rss";
  if (widgetType === "blog") return "rss";
  if (widgetType === "bookmark") return "bookmark";
  if (widgetType === "checklist") return "checklist";
  if (widgetType === "countdown") return "countdown";
  if (widgetType === "timetable") return "timetable";
  if (widgetType === "clock") return "clock";
  if (widgetType === "speed") return "clock";
  if (widgetType === "profile") return "focus";
  if (widgetType === "weather") return "weather";
  if (widgetType === "trending") return "trending";
  if (widgetType === "delivery") return "delivery";
  if (widgetType === "pet") return "pet";

  const imageUrl = getAttachedImageUrl(note);
  const noteUrl = extractFirstUrl(note.content);
  if (imageUrl || (noteUrl && isImageUrl(noteUrl))) {
    return "image";
  }

  if (noteUrl) {
    return "link";
  }

  return "text";
};

const isWidgetLikeNote = (note: NoteV2) => getWidgetType(note) !== "note";

const getGroupedColumnPreference = (
  note: NoteV2,
  totalColumns: number,
  dominantGroup: "note" | "widget"
) => {
  const allColumns = Array.from({ length: totalColumns }, (_, index) => index);
  if (totalColumns <= 1) {
    return allColumns;
  }

  const dominantCount = Math.max(1, Math.ceil(totalColumns / 2));
  const dominantColumns = allColumns.slice(0, dominantCount);
  const secondaryColumns = allColumns.slice(dominantCount);
  const preferredPrimary = dominantGroup === "widget" ? isWidgetLikeNote(note) : !isWidgetLikeNote(note);

  if (preferredPrimary) {
    return [...dominantColumns, ...secondaryColumns];
  }

  return secondaryColumns.length > 0 ? [...secondaryColumns, ...dominantColumns] : [...dominantColumns];
};

const getPreferredColumns = (
  note: NoteV2,
  totalColumns: number,
  columnHeights: number[],
  layoutStyle: BoardLayoutStyle,
  dominantGroup: "note" | "widget" | null
) => {
  const allColumns = Array.from({ length: totalColumns }, (_, index) => index);
  const category = getAutoLayoutCategory(note);

  if (totalColumns <= 1) {
    return allColumns;
  }

  if (note.pinned) {
    return [...allColumns].sort((left, right) => columnHeights[left] - columnHeights[right]);
  }

  if (layoutStyle === "compact") {
    return [...allColumns].sort((left, right) => columnHeights[left] - columnHeights[right]);
  }

  if (layoutStyle === "visual" && dominantGroup) {
    return getGroupedColumnPreference(note, totalColumns, dominantGroup);
  }

  switch (category) {
    case "image":
      return [0, ...allColumns.filter((index) => index !== 0)];
    case "link": {
      const middle = Math.min(1, totalColumns - 1);
      return [middle, ...allColumns.filter((index) => index !== middle)];
    }
    case "text": {
      const middle = Math.floor((totalColumns - 1) / 2);
      return [middle, ...allColumns.filter((index) => index !== middle)];
    }
    case "bookmark":
    case "rss":
    case "checklist":
    case "countdown":
    case "timetable":
    case "clock":
    case "profile":
    case "weather":
    case "trending":
    case "delivery":
    case "pet":
      return [...allColumns].reverse();
    default:
      return allColumns;
  }
};

const estimateNoteVisualHeight = (note: NoteV2, layoutStyle: BoardLayoutStyle) => {
  const widgetType = getWidgetType(note);
  if (widgetType === "cover") return layoutStyle === "compact" ? 220 : 260;
  if (widgetType === "document") {
    const variant = getDocumentVariant(note);
    if (variant === "hero") return layoutStyle === "compact" ? 300 : 360;
    if (variant === "cta") return layoutStyle === "compact" ? 260 : 310;
    if (variant === "feature") return layoutStyle === "compact" ? 220 : 250;
    return layoutStyle === "compact" ? 250 : 300;
  }
  if (widgetType === "brain") return layoutStyle === "compact" ? 260 : 320;
  if (widgetType === "focus") return layoutStyle === "compact" ? 220 : 250;
  if (widgetType === "player") return layoutStyle === "compact" ? 220 : 260;
  if (widgetType === "calculator") return layoutStyle === "compact" ? 230 : 270;
  if (widgetType === "mood") return layoutStyle === "compact" ? 200 : 230;
  if (widgetType === "routine") return layoutStyle === "compact" ? 240 : 280;
  if (widgetType === "prompt") return layoutStyle === "compact" ? 230 : 270;
  if (widgetType === "food") return layoutStyle === "compact" ? 250 : 290;
  if (widgetType === "rss") return layoutStyle === "compact" ? 270 : 300;
  if (widgetType === "blog") return layoutStyle === "compact" ? 270 : 300;
  if (widgetType === "bookmark") return layoutStyle === "compact" ? 230 : 260;
  if (widgetType === "checklist") return layoutStyle === "compact" ? 250 : 290;
  if (widgetType === "countdown") return layoutStyle === "compact" ? 210 : 240;
  if (widgetType === "timetable") return layoutStyle === "compact" ? 260 : 320;
  if (widgetType === "clock") return layoutStyle === "compact" ? 220 : 260;
  if (widgetType === "speed") return layoutStyle === "compact" ? 210 : 240;
  if (widgetType === "profile") return layoutStyle === "compact" ? 260 : 310;
  if (widgetType === "weather") return layoutStyle === "compact" ? 220 : 260;
  if (widgetType === "trending") return layoutStyle === "compact" ? 250 : 300;
  if (widgetType === "delivery") return layoutStyle === "compact" ? 230 : 280;
  if (widgetType === "pet") return layoutStyle === "compact" ? 220 : 260;

  const imageUrl = getAttachedImageUrl(note);
  const noteUrl = extractFirstUrl(note.content);
  if (imageUrl || (noteUrl && isImageUrl(noteUrl))) {
    return layoutStyle === "visual" ? 340 : layoutStyle === "compact" ? 260 : 300;
  }

  const text = asText(note.content).trim();
  const lineCount = text ? text.split(/\r?\n/).filter((line) => line.trim().length > 0).length : 0;
  const lengthWeight = Math.ceil(Math.min(text.length, 420) / 55);
  const baseHeight = 170 + lineCount * 22 + lengthWeight * 16;
  if (layoutStyle === "compact") {
    return Math.max(156, Math.min(360, baseHeight - 18));
  }
  if (layoutStyle === "visual") {
    return Math.max(190, Math.min(440, baseHeight + 12));
  }
  return Math.max(180, Math.min(420, baseHeight));
};

const autoOrganizeBoardNotes = (
  notes: NoteV2[],
  boardId: string,
  columnCount: number,
  layoutStyle: BoardLayoutStyle = "balanced"
) => {
  const boardActiveNotes = notes.filter((note) => note.boardId === boardId && !note.archived);
  const boardArchivedNotes = notes.filter((note) => note.boardId === boardId && note.archived);
  const otherNotes = notes.filter((note) => note.boardId !== boardId);

  if (!boardActiveNotes.length) {
    return notes;
  }

  const columns = Array.from({ length: Math.max(1, columnCount) }, () => [] as NoteV2[]);
  const columnHeights = Array.from({ length: Math.max(1, columnCount) }, () => 0);
  const updatedAt = nowIso();
  const widgetCount = boardActiveNotes.filter((note) => isWidgetLikeNote(note)).length;
  const noteCount = boardActiveNotes.length - widgetCount;
  const dominantGroup =
    widgetCount === noteCount ? null : widgetCount > noteCount ? ("widget" as const) : ("note" as const);

  const sortedNotes = [...boardActiveNotes].sort((a, b) => {
    if (a.pinned !== b.pinned) {
      return a.pinned ? -1 : 1;
    }

    const priorityDiff = getAutoLayoutPriority(a) - getAutoLayoutPriority(b);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    const titleDiff = getNoteTitle(a.content).localeCompare(getNoteTitle(b.content), "ko");
    if (titleDiff !== 0) {
      return titleDiff;
    }

    return a.zIndex - b.zIndex;
  });

  sortedNotes.forEach((note) => {
    const preferredColumns = getPreferredColumns(note, columns.length, columnHeights, layoutStyle, dominantGroup);
    const targetColumn =
      preferredColumns.reduce((bestColumn, column) => {
        if (columnHeights[column] < columnHeights[bestColumn]) {
          return column;
        }
        return bestColumn;
      }, preferredColumns[0] ?? 0) ?? 0;

    columns[targetColumn].push({
      ...note,
      x: 0,
      y: 0,
      updatedAt,
      metadata: {
        ...note.metadata,
        column: targetColumn
      }
    });
    const cardGap = layoutStyle === "compact" ? 18 : layoutStyle === "visual" ? 34 : 28;
    columnHeights[targetColumn] += estimateNoteVisualHeight(note, layoutStyle) + cardGap;
  });

  let nextZIndex = 1;
  const reordered = columns.flatMap((column) =>
    column.map((note) => ({
      ...note,
      zIndex: nextZIndex++
    }))
  );

  return [...otherNotes, ...reordered, ...boardArchivedNotes];
};

const App = () => {
  const [siteLanguage, setSiteLanguage] = useState<SiteLanguage>(() => getInitialSiteLanguage());
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [boards, setBoards] = useState<BoardV2[]>(() => createDefaultSnapshot().boards);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => createDefaultSnapshot().selectedBoardId);
  const [boardTitleDraft, setBoardTitleDraft] = useState("");
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [notes, setNotes] = useState<NoteV2[]>(() => createDefaultSnapshot().notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [selectedNoteSnapshot, setSelectedNoteSnapshot] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [backgroundBoardHydrating, setBackgroundBoardHydrating] = useState(false);
  const [boardContentLoading, setBoardContentLoading] = useState(false);
  const [runningDragNoteId, setRunningDragNoteId] = useState<string | null>(null);
  const [dragPreviewNoteId, setDragPreviewNoteId] = useState<string | null>(null);
  const [dragPreviewColumn, setDragPreviewColumn] = useState<number | null>(null);
  const [visibleNoteCount, setVisibleNoteCount] = useState(INITIAL_VISIBLE_NOTE_COUNT);
  const [feedMode, setFeedMode] = useState<FeedMode>("active");
  const [cloudSaveState, setCloudSaveState] = useState<CloudSaveState>("idle");
  const [lastPersistedAt, setLastPersistedAt] = useState<string | null>(null);
  const [columnCount, setColumnCount] = useState(() => getColumnCount());
  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreviewState>>({});
  const [rssFeeds, setRssFeeds] = useState<Record<string, RssFeedState>>({});
  const [rssDisplayFeeds, setRssDisplayFeeds] = useState<Record<string, RssFeedState>>({});
  const [rssFlipStates, setRssFlipStates] = useState<Record<string, { index: number; nextItem: RssItem } | null>>({});
  const [rssRefreshingIds, setRssRefreshingIds] = useState<Record<string, boolean>>({});
  const [expandedTrendingItems, setExpandedTrendingItems] = useState<Record<string, number | null>>({});
  const [socialWidgets, setSocialWidgets] = useState<Record<string, SocialFeedState>>({});
  const [weatherWidgets, setWeatherWidgets] = useState<Record<string, WeatherState>>({});
  const [speedWidgets, setSpeedWidgets] = useState<Record<string, SpeedState>>({});
  const [trendingWidgets, setTrendingWidgets] = useState<Record<string, TrendingState>>({});
  const [deliveryWidgets, setDeliveryWidgets] = useState<Record<string, DeliveryState>>({});
  const [deliveryCarriers, setDeliveryCarriers] = useState<DeliveryCarrier[]>([]);
  const [runningBrainIds, setRunningBrainIds] = useState<Record<string, boolean>>({});
  const [playerWidgets, setPlayerWidgets] = useState<Record<string, { playing: boolean; currentTime: number; duration: number }>>({});
  const [petVisitCounts, setPetVisitCounts] = useState<Record<string, number>>(() => loadPetVisitCounts());
  const [focusNow, setFocusNow] = useState(() => Date.now());
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < COMPACT_SIDEBAR_BREAKPOINT : false
  );
  const [mobileViewport, setMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT : false
  );
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileBoardMenuOpen, setMobileBoardMenuOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>(() => getInitialSubscriptionTier());
  const [boardCreationError, setBoardCreationError] = useState<string | null>(null);
  const [widgetMenuOpen, setWidgetMenuOpen] = useState(false);
  const [widgetGalleryCategory, setWidgetGalleryCategory] = useState<WidgetGalleryCategory>("collect");
  const [catRemoteCommand, setCatRemoteCommand] = useState<CatRemoteCommand | null>(null);
  const [catRemoteOpen, setCatRemoteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsRendered, setSettingsRendered] = useState(false);
  const [settingsClosing, setSettingsClosing] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("menu");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [boardSwipeOffset, setBoardSwipeOffset] = useState(0);
  const [boardSwipeTransition, setBoardSwipeTransition] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteQuery, setInviteQuery] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteResults, setInviteResults] = useState<BoardUserProfile[]>([]);
  const [boardMembers, setBoardMembers] = useState<BoardMemberProfile[]>([]);
  const [trashDropActive, setTrashDropActive] = useState(false);
  const [noteMoreState, setNoteMoreState] = useState<Record<string, number>>({});
  const [homeBoardRoute, setHomeBoardRoute] = useState<boolean>(() => isHomeBoardLocation());
  const [publicLandingRoute, setPublicLandingRoute] = useState<boolean>(() => isPublicLandingLocation());
  const [marketRoute, setMarketRoute] = useState<boolean>(() => isMarketLocation());
  const [insightRoute, setInsightRoute] = useState<boolean>(() => isInsightLocation());
  const [updatesIndexRoute, setUpdatesIndexRoute] = useState<boolean>(() => isUpdatesIndexLocation());
  const [updateSlugRoute, setUpdateSlugRoute] = useState<string | null>(() => getUpdateSlugFromLocation());
  const [sharedBoardSlug, setSharedBoardSlug] = useState<string | null>(() => getSharedBoardSlugFromLocation());
  const [sharedBoardReadOnly, setSharedBoardReadOnly] = useState<boolean>(
    () => Boolean(getSharedBoardSlugFromLocation()) || isHomeBoardLocation()
  );
  const [workspaceTabsHidden, setWorkspaceTabsHidden] = useState(false);

  useEffect(() => {
    persistSiteLanguage(siteLanguage);
    if (typeof document !== "undefined") {
      document.documentElement.lang = siteLanguage;
    }
  }, [siteLanguage]);

  useEffect(() => {
    persistSubscriptionTier(subscriptionTier);
  }, [subscriptionTier]);

  useEffect(() => {
    if (typeof document === "undefined" || !languageMenuOpen) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (languageMenuRef.current?.contains(event.target as Node)) {
        return;
      }

      setLanguageMenuOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [languageMenuOpen]);

  const skipNextCloudSaveRef = useRef(false);
  const suppressNextCardClickRef = useRef(false);
  const latestBoardsRef = useRef<BoardV2[]>(boards);
  const latestNotesRef = useRef<NoteV2[]>(notes);
  const rssDisplayFeedsRef = useRef<Record<string, RssFeedState>>({});
  const latestUserIdRef = useRef<string | null>(user?.id ?? null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);
  const saveStateResetTimerRef = useRef<number | null>(null);
  const loadedBoardNotesRef = useRef<Set<string>>(new Set(createDefaultSnapshot().boards.map((board) => board.id)));
  const pendingBoardNotesRef = useRef<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const boardGridRef = useRef<HTMLElement | null>(null);
  const mobileBoardTabsRef = useRef<HTMLDivElement | null>(null);
  const mobileBoardTabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const catRemoteCommandIdRef = useRef(0);
  const rssAnimationTokenRef = useRef<Record<string, number>>({});
  const noteCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const noteEditorRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const playerAudioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const youtubePlayerHosts = useRef<Record<string, HTMLDivElement | null>>({});
  const youtubePlayerRefs = useRef<Record<string, YouTubePlayerInstance | null>>({});
  const pendingMobileNewNoteScrollRef = useRef<string | null>(null);
  const boardSwipeStartRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  });
  const boardSwipeAnimatingRef = useRef(false);
  const promptCopyTimerRef = useRef<number | null>(null);

  const orderedBoards = useMemo(() => sortBoards(boards), [boards]);
  const activeBoards = useMemo(() => orderedBoards.filter((board) => !isBoardTrashed(board)), [orderedBoards]);
  const trashedBoards = useMemo(() => orderedBoards.filter((board) => isBoardTrashed(board)), [orderedBoards]);
  const isSharedView = Boolean(sharedBoardSlug && sharedBoardReadOnly);

  useEffect(() => {
    const timer = window.setInterval(() => {
      Object.entries(youtubePlayerRefs.current).forEach(([noteId, player]) => {
        if (!player) {
          return;
        }

        const currentTime = player.getCurrentTime?.() ?? 0;
        const duration = player.getDuration?.() ?? 0;
        const state = player.getPlayerState?.();

        setPlayerWidgets((prev) => {
          const previous = prev[noteId];
          const playing = state === 1;
          if (
            previous &&
            Math.abs(previous.currentTime - currentTime) < 0.4 &&
            Math.abs(previous.duration - duration) < 0.4 &&
            previous.playing === playing
          ) {
            return prev;
          }

          return {
            ...prev,
            [noteId]: {
              playing,
              currentTime,
              duration
            }
          };
        });
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, []);
  const isReadOnlyBoardView = Boolean((sharedBoardSlug || homeBoardRoute) && sharedBoardReadOnly);
  const pendingAuthHash = hasPendingAuthHash();
  const storedSupabaseSession = hasStoredSupabaseSession();
  const waitingForAuthResolution = !user && !authChecked && !isSharedView && (pendingAuthHash || storedSupabaseSession);
  const selectedBoard = useMemo(
    () => activeBoards.find((board) => board.id === selectedBoardId) ?? activeBoards[0] ?? null,
    [activeBoards, selectedBoardId]
  );
  const isHomeView = homeBoardRoute && Boolean(selectedBoard && isHomeBoard(selectedBoard));
  const showWorkspaceBoardTabs = !isHomeView && !isReadOnlyBoardView && activeBoards.length > 0;
  const boardLimit = subscriptionTier === "free" ? FREE_BOARD_LIMIT : PAID_BOARD_LIMIT;
  const activeBoardLimitReached = activeBoards.length >= boardLimit;
  const currentSubscriptionPlan = SUBSCRIPTION_PLANS.find((plan) => plan.key === subscriptionTier) ?? SUBSCRIPTION_PLANS[0]!;
  const isBoardOwner = Boolean(user?.id && selectedBoard && selectedBoard.userId === user.id);
  const canShareBoard = feedMode === "active" && Boolean(selectedBoard) && !isReadOnlyBoardView && isBoardOwner;
  const canInviteBoard = canShareBoard;
  const canBoardSettings = canShareBoard;
  const canRenameBoard = feedMode === "active" && Boolean(selectedBoard) && !isReadOnlyBoardView && isBoardOwner;
  const boardHistorySnapshots = useMemo(() => getBoardHistorySnapshots(selectedBoard), [selectedBoard]);
  const activePlayerNotes = useMemo(
    () =>
      notes.filter(
        (note) =>
          note.boardId === selectedBoard?.id &&
          !isNoteTrashed(note) &&
          getWidgetType(note) === "player" &&
          isYouTubePlayerUrl(getPlayerUrl(note))
      ),
    [notes, selectedBoard?.id]
  );

  useEffect(() => {
    let cancelled = false;

    const attachPlayers = async () => {
      const activeIds = new Set(activePlayerNotes.map((note) => note.id));
      Object.entries(youtubePlayerRefs.current).forEach(([noteId, player]) => {
        if (!activeIds.has(noteId) && player) {
          player.destroy();
          youtubePlayerRefs.current[noteId] = null;
        }
      });

      if (activePlayerNotes.length === 0) {
        return;
      }

      await loadYouTubeIframeApi();
      const YT = window.YT;
      if (cancelled || !YT?.Player) {
        return;
      }

      activePlayerNotes.forEach((note) => {
        const host = youtubePlayerHosts.current[note.id];
        const existing = youtubePlayerRefs.current[note.id];
        const videoId = extractYouTubeVideoId(getPlayerUrl(note));
        if (!host || existing || !videoId) {
          return;
        }

        youtubePlayerRefs.current[note.id] = new YT.Player(host, {
          width: "1",
          height: "1",
          videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1
          },
          events: {
            onReady: (event) => {
              setPlayerWidgets((prev) => ({
                ...prev,
                [note.id]: {
                  playing: false,
                  currentTime: event.target.getCurrentTime() || 0,
                  duration: event.target.getDuration() || 0
                }
              }));
            },
            onStateChange: (event) => {
              const state = event.data;
              setPlayerWidgets((prev) => ({
                ...prev,
                [note.id]: {
                  playing: state === 1,
                  currentTime: event.target.getCurrentTime() || prev[note.id]?.currentTime || 0,
                  duration: event.target.getDuration() || prev[note.id]?.duration || 0
                }
              }));
            },
            onError: () => {
              youtubePlayerRefs.current[note.id]?.destroy();
              youtubePlayerRefs.current[note.id] = null;
            }
          }
        });
      });
    };

    void attachPlayers();

    return () => {
      cancelled = true;
    };
  }, [activePlayerNotes]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!showWorkspaceBoardTabs || mobileViewport) {
      setWorkspaceTabsHidden(false);
      return;
    }

    let lastY = window.scrollY;

    const onScroll = () => {
      const nextY = window.scrollY;

      if (nextY < 24 || nextY < lastY - 6) {
        setWorkspaceTabsHidden(false);
      } else if (nextY > 88 && nextY > lastY + 6) {
        setWorkspaceTabsHidden(true);
      }

      lastY = nextY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [mobileViewport, showWorkspaceBoardTabs]);

  useEffect(() => {
    latestBoardsRef.current = boards;
  }, [boards]);

  useEffect(() => {
    rssDisplayFeedsRef.current = rssDisplayFeeds;
  }, [rssDisplayFeeds]);

  useEffect(() => {
    latestNotesRef.current = notes;
  }, [notes]);

  const refreshSpeedWidget = async (noteId: string) => {
    setSpeedWidgets((prev) => ({
      ...prev,
      [noteId]:
        prev[noteId] === null
          ? null
          : {
              ...prev[noteId],
              error: undefined
            }
    }));

    const measured = await measureInternetSpeed();
    setSpeedWidgets((prev) => ({
      ...prev,
      [noteId]: measured
    }));
  };

  useEffect(() => {
    latestUserIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    if (!profileMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (!profileMenuRef.current?.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [profileMenuOpen]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFocusNow(Date.now());
    }, FOCUS_TICK_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const onResize = () => {
      setColumnCount(getColumnCount());
      setCompactSidebar(window.innerWidth < COMPACT_SIDEBAR_BREAKPOINT);
      setMobileViewport(window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT);
      if (window.innerWidth > MOBILE_LAYOUT_BREAKPOINT) {
        setMobileSearchOpen(false);
        setMobileBoardMenuOpen(false);
      }
      setWidgetMenuOpen(false);
    };

    window.addEventListener("resize", onResize);
    onResize();

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    const syncSharedSlug = () => {
      const nextHomeRoute = isHomeBoardLocation();
      const nextPublicLandingRoute = isPublicLandingLocation();
      const nextMarketRoute = isMarketLocation();
      const nextInsightRoute = isInsightLocation();
      const nextUpdatesIndexRoute = isUpdatesIndexLocation();
      const nextUpdateSlugRoute = getUpdateSlugFromLocation();
      const nextSlug = getSharedBoardSlugFromLocation();
      setHomeBoardRoute(nextHomeRoute);
      setPublicLandingRoute(nextPublicLandingRoute);
      setMarketRoute(nextMarketRoute);
      setInsightRoute(nextInsightRoute);
      setUpdatesIndexRoute(nextUpdatesIndexRoute);
      setUpdateSlugRoute(nextUpdateSlugRoute);
      setSharedBoardSlug(nextSlug);
      setSharedBoardReadOnly(Boolean(nextSlug) || nextHomeRoute);
    };
    window.addEventListener("popstate", syncSharedSlug);
    window.addEventListener("hashchange", syncSharedSlug);
    return () => {
      window.removeEventListener("popstate", syncSharedSlug);
      window.removeEventListener("hashchange", syncSharedSlug);
    };
  }, []);

  useEffect(() => {
    if (compactSidebar && sidebarPinned) {
      setSidebarPinned(false);
    }
  }, [compactSidebar, sidebarPinned]);

  const persistCloudSnapshot = async () => {
    if (!supabase || !latestUserIdRef.current) {
      return;
    }

    const pruned = pruneEmptyBoards({
      boards: latestBoardsRef.current,
      notes: latestNotesRef.current,
      selectedBoardId
    });
    await saveBoardsV2({
      boards: pruned.boards,
      notes: pruned.notes,
      currentUserId: latestUserIdRef.current
    });
  };

  const markCloudSaved = () => {
    const timestamp = nowIso();
    setCloudSaveState("saved");
    setLastPersistedAt(timestamp);

    if (saveStateResetTimerRef.current) {
      window.clearTimeout(saveStateResetTimerRef.current);
    }

    saveStateResetTimerRef.current = window.setTimeout(() => {
      setCloudSaveState("idle");
      saveStateResetTimerRef.current = null;
    }, 2200);
  };

  const fetchBoardNotesIntoState = async (boardId: string) => {
    if (!boardId || pendingBoardNotesRef.current.has(boardId) || loadedBoardNotesRef.current.has(boardId)) {
      return;
    }

    pendingBoardNotesRef.current.add(boardId);

    try {
      const boardNotes = sanitizeNotes(await loadBoardNotesV2([boardId]));
      setNotes((prev) => replaceBoardNotes(prev, boardId, boardNotes));
      loadedBoardNotesRef.current.add(boardId);
    } finally {
      pendingBoardNotesRef.current.delete(boardId);
    }
  };

  const updateDragPreview = (noteId: string | null, column: number | null) => {
    setDragPreviewNoteId((prev) => (prev === noteId ? prev : noteId));
    setDragPreviewColumn((prev) => (prev === column ? prev : column));
  };

  const renderExtraWidgetBody = (note: NoteV2, selected: boolean, compact = false) => {
    const widgetType = getWidgetType(note);

    if (widgetType === "brain") {
      const agentType = getBrainAgentType(note);
      const promptText = getBrainPrompt(note);
      const contextText = getBrainContext(note);
      const answerText = getBrainAnswer(note);
      const errorText = getBrainError(note);
      const running = Boolean(runningBrainIds[note.id]);
      const roleLabel = agentType === "developer" ? "개발자" : agentType === "planner" ? "기획자" : "PM";

      const handleRunBrain = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (running || !promptText.trim()) {
          return;
        }

        setRunningBrainIds((prev) => ({ ...prev, [note.id]: true }));

        try {
          const answer = await runAgentChat({
            agentType,
            prompt: promptText.trim(),
            context: contextText.trim()
          });

          updateNote(note.id, {
            metadata: {
              ...note.metadata,
              widgetType: "brain",
              brainAgentType: agentType,
              brainPrompt: promptText,
              brainContext: contextText,
              brainAnswer: answer,
              brainError: ""
            }
          });
        } catch (error) {
          updateNote(note.id, {
            metadata: {
              ...note.metadata,
              widgetType: "brain",
              brainAgentType: agentType,
              brainPrompt: promptText,
              brainContext: contextText,
              brainError: error instanceof Error ? error.message : "AI 요청에 실패했습니다."
            }
          });
        } finally {
          setRunningBrainIds((prev) => ({ ...prev, [note.id]: false }));
        }
      };

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">AI</span>
            <p className="pin-title">{asText(note.content).trim() || "AI 브레인"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <select
                className="widget-input"
                value={agentType}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "brain",
                      brainAgentType: isBrainAgentRole(event.target.value) ? event.target.value : DEFAULT_BRAIN_AGENT_TYPE
                    }
                  })
                }
              >
                <option value="planner">기획자 에이전트</option>
                <option value="developer">개발자 에이전트</option>
                <option value="pm">PM 에이전트</option>
              </select>
              <textarea
                className="widget-textarea"
                value={promptText}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "brain",
                      brainPrompt: event.target.value
                    }
                  })
                }
                placeholder="AI에게 맡길 목표를 입력하세요"
                rows={4}
              />
              <textarea
                className="widget-textarea"
                value={contextText}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "brain",
                      brainContext: event.target.value
                    }
                  })
                }
                placeholder="보드 상황이나 배경 정보를 입력하세요"
                rows={5}
              />
              <div className="brain-widget-actions">
                <button className="widget-secondary" onClick={handleRunBrain} disabled={running || !promptText.trim()}>
                  {running ? "실행중..." : "AI 실행"}
                </button>
                <button
                  className="widget-confirm"
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedNoteId(null);
                  }}
                >
                  확인
                </button>
              </div>
            </div>
          ) : (
            <div className={`brain-widget ${compact ? "compact" : ""}`}>
              <div className="brain-widget-topline">
                <span className="brain-widget-role">{roleLabel}</span>
                <span className="brain-widget-status">{running ? "응답 생성 중" : answerText ? "최근 응답 저장됨" : "실행 대기"}</span>
              </div>
              <div className="brain-widget-block">
                <strong>목표</strong>
                <p>{promptText}</p>
              </div>
              {answerText ? (
                <div className="brain-widget-block answer">
                  <strong>응답</strong>
                  <pre>{answerText}</pre>
                </div>
              ) : errorText ? (
                <div className="brain-widget-block error">
                  <strong>오류</strong>
                  <p>{errorText}</p>
                </div>
              ) : (
                <div className="brain-widget-block muted">
                  <strong>응답</strong>
                  <p>AI 실행 버튼을 눌러 실행 계획을 받아보세요.</p>
                </div>
              )}
              {!compact && (
                <button className="widget-secondary" onClick={handleRunBrain} disabled={running || !promptText.trim()}>
                  {running ? "실행중..." : answerText ? "다시 실행" : "AI 실행"}
                </button>
              )}
            </div>
          )}
        </>
      );
    }

    if (widgetType === "timetable") {
      const timetableText = getTimetableText(note);
      const entries = getTimetableEntries(note);
      const days = TIMETABLE_DAY_ORDER.filter((day) => entries.some((entry) => entry.day === day));
      const visibleEntries = compact ? entries.slice(0, 4) : entries;

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">시간표</span>
            <p className="pin-title">{asText(note.content).trim() || "시간표"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="시간표 제목"
              />
              <textarea
                className="widget-textarea"
                value={timetableText}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "timetable",
                      timetableText: normalizeTimetableText(event.target.value)
                    }
                  })
                }
                placeholder={"요일|시작|종료|과목|장소\n월|09:00|10:00|기획 회의|회의실 A"}
                rows={6}
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : compact ? (
            <div className="timetable-preview-list">
              {visibleEntries.map((entry, index) => (
                <div key={`${note.id}-tt-preview-${index}`} className="timetable-preview-item">
                  <span className="timetable-preview-day">{entry.day}</span>
                  <span className="timetable-preview-main">
                    {entry.title} · {formatTimeRange(entry.start, entry.end)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="timetable-widget">
              <div className="timetable-widget-days">
                {days.map((day) => (
                  <span key={`${note.id}-tt-day-${day}`} className="timetable-day-chip">
                    {day}
                  </span>
                ))}
              </div>
              <div className="timetable-grid">
                {entries.map((entry, index) => (
                  <div key={`${note.id}-tt-${index}`} className="timetable-entry-card">
                    <div className="timetable-entry-head">
                      <strong>{entry.title}</strong>
                      <span>{entry.day}</span>
                    </div>
                    <span>{formatTimeRange(entry.start, entry.end)}</span>
                    {entry.location && <span>{entry.location}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "player") {
      const artist = getPlayerArtist(note);
      const playerUrl = getPlayerUrl(note);
      const youtubeVideoId = extractYouTubeVideoId(playerUrl);
      const isYouTubePlayer = Boolean(youtubeVideoId);
      const playback = playerWidgets[note.id] ?? { playing: false, currentTime: 0, duration: 0 };
      const progress = playback.duration > 0 ? Math.min(1, playback.currentTime / playback.duration) : 0;

      const syncPlayerState = (patch: Partial<{ playing: boolean; currentTime: number; duration: number }>) => {
        setPlayerWidgets((prev) => ({
          ...prev,
          [note.id]: {
            playing: patch.playing ?? prev[note.id]?.playing ?? false,
            currentTime: patch.currentTime ?? prev[note.id]?.currentTime ?? 0,
            duration: patch.duration ?? prev[note.id]?.duration ?? 0
          }
        }));
      };

      const stopOtherPlayers = (exceptId: string) => {
        Object.entries(playerAudioRefs.current).forEach(([audioId, audio]) => {
          if (audioId !== exceptId && audio && !audio.paused) {
            audio.pause();
          }
        });
        Object.entries(youtubePlayerRefs.current).forEach(([playerId, player]) => {
          if (playerId !== exceptId && player && player.getPlayerState() === window.YT?.PlayerState.PLAYING) {
            player.pauseVideo();
          }
        });
      };

      const togglePlayback = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (!playerUrl) {
          return;
        }

        try {
          if (isYouTubePlayer) {
            const player = youtubePlayerRefs.current[note.id];
            if (!player) {
              return;
            }
            stopOtherPlayers(note.id);
            if (player.getPlayerState() === window.YT?.PlayerState.PLAYING) {
              player.pauseVideo();
            } else {
              player.playVideo();
            }
          } else {
            const audio = playerAudioRefs.current[note.id];
            if (!audio) {
              return;
            }
            if (audio.paused) {
              stopOtherPlayers(note.id);
              await audio.play();
            } else {
              audio.pause();
            }
          }
        } catch (error) {
          console.error("Failed to toggle player widget", error);
        }
      };

      const restartPlayback = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (isYouTubePlayer) {
          const player = youtubePlayerRefs.current[note.id];
          if (!player) {
            return;
          }
          stopOtherPlayers(note.id);
          player.seekTo(0, true);
          player.playVideo();
          return;
        }

        const audio = playerAudioRefs.current[note.id];
        if (!audio) {
          return;
        }
        audio.currentTime = 0;
        void audio.play().catch((error) => console.error("Failed to restart player widget", error));
      };

      const seekPlayback = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (!playback.duration) {
          return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const targetTime = ratio * playback.duration;

        if (isYouTubePlayer) {
          const player = youtubePlayerRefs.current[note.id];
          if (!player) {
            return;
          }
          player.seekTo(targetTime, true);
          syncPlayerState({ currentTime: targetTime });
          return;
        }

        const audio = playerAudioRefs.current[note.id];
        if (!audio) {
          return;
        }
        audio.currentTime = targetTime;
        syncPlayerState({ currentTime: audio.currentTime });
      };

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">MUSIC</span>
            <p className="pin-title">{asText(note.content).trim() || "MP3 플레이어"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={artist}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "player",
                      playerArtist: event.target.value,
                      playerUrl
                    }
                  })
                }
                placeholder="아티스트"
              />
              <input
                className="widget-input"
                value={playerUrl}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "player",
                      playerArtist: artist,
                      playerUrl: event.target.value
                    }
                  })
                }
                placeholder="mp3 또는 YouTube 링크"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`mp3-widget ${compact ? "compact" : ""}`}>
              {isYouTubePlayer ? (
                <div
                  className="mp3-widget-hidden-player"
                  ref={(element) => {
                    youtubePlayerHosts.current[note.id] = element;
                  }}
                />
              ) : (
                <audio
                  ref={(element) => {
                    playerAudioRefs.current[note.id] = element;
                  }}
                  src={playerUrl}
                  preload="metadata"
                  onLoadedMetadata={(event) =>
                    syncPlayerState({ duration: event.currentTarget.duration || 0, currentTime: event.currentTarget.currentTime || 0 })
                  }
                  onTimeUpdate={(event) =>
                    syncPlayerState({ currentTime: event.currentTarget.currentTime || 0, duration: event.currentTarget.duration || 0 })
                  }
                  onPlay={() => syncPlayerState({ playing: true })}
                  onPause={() => syncPlayerState({ playing: false })}
                  onEnded={() => syncPlayerState({ playing: false, currentTime: 0 })}
                />
              )}
              <div className="mp3-widget-screen">
                <span className="mp3-widget-mode">{isYouTubePlayer ? "YOUTUBE AUDIO" : "PLAY MODE"}</span>
                <strong>{asText(note.content).trim() || "MP3 플레이어"}</strong>
                <span>{artist}</span>
                <div className="mp3-widget-time">
                  <span>{formatAudioTime(playback.currentTime)}</span>
                  <span>{formatAudioTime(playback.duration)}</span>
                </div>
              </div>
              <div className="mp3-widget-progress" onClick={seekPlayback} role="button" tabIndex={0}>
                <div className="mp3-widget-progress-fill" style={{ width: `${progress * 100}%` }} />
              </div>
              <div className="mp3-widget-controls">
                <button className="mp3-widget-control" onClick={restartPlayback} aria-label="처음부터 재생">
                  ⏮
                </button>
                <button className="mp3-widget-control primary" onClick={togglePlayback} aria-label={playback.playing ? "일시정지" : "재생"}>
                  {playback.playing ? "❚❚" : "▶"}
                </button>
                <button
                  className="mp3-widget-control"
                  onClick={(event) => {
                    event.stopPropagation();
                    const audio = playerAudioRefs.current[note.id];
                    if (!audio) {
                      return;
                    }
                    audio.currentTime = Math.min((audio.duration || 0), (audio.currentTime || 0) + 10);
                  }}
                  aria-label="10초 앞으로"
                >
                  ⏭
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "weather") {
      const query = getWeatherQuery(note);
      const weather = weatherWidgets[note.id];

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">날씨</span>
            <p className="pin-title">{asText(note.content).trim() || "날씨"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="날씨 위젯 제목"
              />
              <input
                className="widget-input"
                value={query}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "weather",
                      weatherQuery: event.target.value
                    }
                  })
                }
                placeholder="도시명 입력"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setWeatherWidgets((prev) => {
                    const next = { ...prev };
                    delete next[note.id];
                    return next;
                  });
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : weather ? (
            <div className={`weather-widget ${compact ? "compact" : ""}`}>
              <a
                className="weather-current weather-link-card"
                href={getWeatherDetailsUrl(weather.location)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="weather-current-emoji">{weather.current.emoji}</span>
                <div>
                  <strong>{weather.location}</strong>
                  <span>
                    {weather.current.temperature}° · {weather.current.weatherLabel}
                  </span>
                </div>
              </a>
              <div className="weather-forecast-list">
                {weather.days.slice(0, compact ? 3 : 4).map((day) => (
                  <a
                    key={`${note.id}-${day.date}`}
                    className="weather-forecast-item weather-link-card"
                    href={getWeatherDetailsUrl(weather.location, day.label)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <span>{day.label}</span>
                    <span>{day.emoji}</span>
                    <span>
                      {day.tempMax}° / {day.tempMin}°
                    </span>
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="rss-empty">날씨 정보를 불러오는 중입니다.</p>
          )}
        </>
      );
    }

    if (widgetType === "calculator") {
      const display = getCalculatorDisplay(note);
      const storedValue = getCalculatorStoredValue(note);
      const operator = getCalculatorOperator(note);
      const replaceOnInput = getCalculatorReplaceOnInput(note);

      const patchCalculator = (nextPatch: Record<string, unknown>) => {
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            widgetType: "calculator",
            ...nextPatch
          }
        });
      };

      const inputDigit = (digit: string) => {
        const baseDisplay = display === "오류" ? DEFAULT_CALCULATOR_DISPLAY : display;
        const nextDisplay =
          replaceOnInput || baseDisplay === DEFAULT_CALCULATOR_DISPLAY
            ? digit
            : `${baseDisplay}${digit}`;

        patchCalculator({
          calculatorDisplay: nextDisplay,
          calculatorReplaceOnInput: false
        });
      };

      const inputDot = () => {
        if (display === "오류") {
          patchCalculator({
            calculatorDisplay: "0.",
            calculatorReplaceOnInput: false
          });
          return;
        }

        if (replaceOnInput) {
          patchCalculator({
            calculatorDisplay: "0.",
            calculatorReplaceOnInput: false
          });
          return;
        }

        if (display.includes(".")) {
          return;
        }

        patchCalculator({
          calculatorDisplay: `${display}.`,
          calculatorReplaceOnInput: false
        });
      };

      const clearCalculator = () => {
        patchCalculator({
          calculatorDisplay: DEFAULT_CALCULATOR_DISPLAY,
          calculatorStoredValue: null,
          calculatorOperator: null,
          calculatorReplaceOnInput: false
        });
      };

      const toggleSign = () => {
        const numeric = Number(display);
        if (!Number.isFinite(numeric) || display === "오류") {
          return;
        }
        patchCalculator({
          calculatorDisplay: numeric === 0 ? "0" : formatCalculatorNumber(numeric * -1),
          calculatorReplaceOnInput: false
        });
      };

      const applyPercent = () => {
        const numeric = Number(display);
        if (!Number.isFinite(numeric) || display === "오류") {
          return;
        }
        patchCalculator({
          calculatorDisplay: formatCalculatorNumber(numeric / 100),
          calculatorReplaceOnInput: true
        });
      };

      const chooseOperator = (nextOperator: CalculatorOperator) => {
        const current = Number(display);
        if (!Number.isFinite(current) || display === "오류") {
          return;
        }

        if (storedValue !== null && operator && !replaceOnInput) {
          const computed = computeCalculatorResult(storedValue, current, operator);
          patchCalculator({
            calculatorDisplay: formatCalculatorNumber(computed),
            calculatorStoredValue: Number.isFinite(computed) ? computed : null,
            calculatorOperator: Number.isFinite(computed) ? nextOperator : null,
            calculatorReplaceOnInput: true
          });
          return;
        }

        patchCalculator({
          calculatorStoredValue: current,
          calculatorOperator: nextOperator,
          calculatorReplaceOnInput: true
        });
      };

      const resolveCalculation = () => {
        const current = Number(display);
        if (!operator || storedValue === null || !Number.isFinite(current) || display === "오류") {
          return;
        }

        const computed = computeCalculatorResult(storedValue, current, operator);
        patchCalculator({
          calculatorDisplay: formatCalculatorNumber(computed),
          calculatorStoredValue: null,
          calculatorOperator: null,
          calculatorReplaceOnInput: true
        });
      };

      const handleCalculatorAction = (event: React.MouseEvent<HTMLButtonElement>, action: string) => {
        event.stopPropagation();

        if (/^\d$/.test(action)) {
          inputDigit(action);
          return;
        }

        switch (action) {
          case ".":
            inputDot();
            break;
          case "clear":
            clearCalculator();
            break;
          case "sign":
            toggleSign();
            break;
          case "percent":
            applyPercent();
            break;
          case "equals":
            resolveCalculation();
            break;
          case "+":
          case "-":
          case "×":
          case "÷":
            chooseOperator(action);
            break;
          default:
            break;
        }
      };

      const calculatorButtons: Array<{ key: string; label: string; className?: string }> = [
        { key: "clear", label: "C", className: "function" },
        { key: "sign", label: "±", className: "function" },
        { key: "percent", label: "%", className: "function" },
        { key: "÷", label: "÷", className: "operator" },
        { key: "7", label: "7" },
        { key: "8", label: "8" },
        { key: "9", label: "9" },
        { key: "×", label: "×", className: "operator" },
        { key: "4", label: "4" },
        { key: "5", label: "5" },
        { key: "6", label: "6" },
        { key: "-", label: "−", className: "operator" },
        { key: "1", label: "1" },
        { key: "2", label: "2" },
        { key: "3", label: "3" },
        { key: "+", label: "+", className: "operator" },
        { key: "0", label: "0", className: "zero" },
        { key: ".", label: "." },
        { key: "equals", label: "=", className: "equals" }
      ];

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">CALC</span>
            <p className="pin-title">{asText(note.content).trim() || "계산기"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="계산기 위젯 제목"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : null}
          <div className={`calculator-widget ${compact ? "compact" : ""} ${selected ? "editing" : ""}`}>
            <div className="calculator-screen">
              <div className="calculator-screen-meta">
                <span>{storedValue !== null ? formatCalculatorNumber(storedValue) : ""}</span>
                <strong>{operator ?? ""}</strong>
              </div>
              <div className="calculator-display">{display}</div>
            </div>
            <div className="calculator-grid">
              {calculatorButtons.map((button) => (
                <button
                  key={`${note.id}-${button.key}`}
                  className={`calculator-key ${button.className ?? ""}`}
                  onClick={(event) => handleCalculatorAction(event, button.key)}
                >
                  {button.label}
                </button>
              ))}
            </div>
          </div>
        </>
      );
    }

    if (widgetType === "clock") {
      const clockMode = getClockMode(note);
      const currentTime = new Date(focusNow);
      const hour = currentTime.getHours() % 12;
      const minute = currentTime.getMinutes();
      const second = currentTime.getSeconds();
      const hourRotation = hour * 30 + minute * 0.5;
      const minuteRotation = minute * 6 + second * 0.1;
      const secondRotation = second * 6;

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">CLOCK</span>
            <p className="pin-title">{asText(note.content).trim() || "시계"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="시계 위젯 제목"
              />
              <label className="widget-field">
                <span>시계 형식</span>
                <select
                  className="widget-input"
                  value={clockMode}
                  onMouseDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    updateNote(note.id, {
                      metadata: {
                        ...note.metadata,
                        widgetType: "clock",
                        clockMode: isClockWidgetMode(event.target.value) ? event.target.value : DEFAULT_CLOCK_MODE
                      }
                    })
                  }
                >
                  <option value="digital">디지털 시계</option>
                  <option value="analog">아날로그 시계</option>
                </select>
              </label>
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`clock-widget ${clockMode} ${compact ? "compact" : ""}`}>
              {clockMode === "digital" ? (
                <>
                  <div className="clock-digital-time">{formatClockTime(currentTime)}</div>
                  <div className="clock-digital-date">{formatClockDate(currentTime)}</div>
                </>
              ) : (
                <>
                  <div className="clock-analog-face" aria-hidden="true">
                    <span className="clock-analog-mark top" />
                    <span className="clock-analog-mark right" />
                    <span className="clock-analog-mark bottom" />
                    <span className="clock-analog-mark left" />
                    <span className="clock-analog-hand hour" style={{ transform: `translateX(-50%) rotate(${hourRotation}deg)` }} />
                    <span
                      className="clock-analog-hand minute"
                      style={{ transform: `translateX(-50%) rotate(${minuteRotation}deg)` }}
                    />
                    <span
                      className="clock-analog-hand second"
                      style={{ transform: `translateX(-50%) rotate(${secondRotation}deg)` }}
                    />
                    <span className="clock-analog-center" />
                  </div>
                  <div className="clock-analog-caption">
                    <strong>{formatClockTime(currentTime).slice(0, 5)}</strong>
                    <span>{formatClockDate(currentTime)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </>
      );
    }

    if (widgetType === "speed") {
      const speed = speedWidgets[note.id];
      const label = getSpeedLabel(note);
      const grade = getSpeedGrade(speed?.downloadMbps ?? null);
      const measuredAt = speed ? formatSpeedMeasuredAt(speed.measuredAt) : "";

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">SPEED</span>
            <p className="pin-title">{asText(note.content).trim() || "인터넷 속도"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={label}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "speed",
                      speedLabel: event.target.value
                    }
                  })
                }
                placeholder="연결 이름"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`speed-widget ${compact ? "compact" : ""}`}>
              <div className="speed-widget-head">
                <strong>{label}</strong>
                <span>{grade}</span>
              </div>
              <div className="speed-widget-grid">
                <div className="speed-widget-metric">
                  <span>다운로드</span>
                  <strong>{speed?.downloadMbps !== null && speed?.downloadMbps !== undefined ? `${speed.downloadMbps} Mbps` : "..."}</strong>
                </div>
                <div className="speed-widget-metric">
                  <span>지연 시간</span>
                  <strong>{speed?.latencyMs !== null && speed?.latencyMs !== undefined ? `${speed.latencyMs} ms` : "..."}</strong>
                </div>
              </div>
              <div className="speed-widget-meta">
                <span>{speed?.effectiveType ? speed.effectiveType.toUpperCase() : "network info"}</span>
                <span>{speed?.downlinkMbps ? `추정 ${speed.downlinkMbps} Mbps` : measuredAt ? `${measuredAt} 측정` : "측정 대기"}</span>
              </div>
              {speed?.error ? <p className="rss-empty speed-widget-error">측정 실패: {speed.error}</p> : null}
              <button
                className="speed-widget-refresh"
                onClick={(event) => {
                  event.stopPropagation();
                  void refreshSpeedWidget(note.id);
                }}
              >
                다시 측정
              </button>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "profile") {
      const profileName = getProfileName(note);
      const birthdate = getProfileBirthdate(note);
      const occupation = getProfileOccupation(note);
      const profileImageUrl = getProfileImageUrl(note);
      const koreanAge = getKoreanAgeLabel(birthdate);
      const fallbackInitial = profileName.trim().charAt(0) || "P";

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">PROFILE</span>
            <p className="pin-title">{asText(note.content).trim() || "내 정보"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={profileName}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "profile",
                      profileName: event.target.value,
                      profileBirthdate: birthdate,
                      profileOccupation: occupation,
                      profileImageUrl
                    }
                  })
                }
                placeholder="이름"
              />
              <label className="widget-field">
                <span>생년월일</span>
                <input
                  className="widget-input"
                  type="date"
                  value={birthdate}
                  onMouseDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    updateNote(note.id, {
                      metadata: {
                        ...note.metadata,
                        widgetType: "profile",
                        profileName,
                        profileBirthdate: event.target.value,
                        profileOccupation: occupation,
                        profileImageUrl
                      }
                    })
                  }
                />
              </label>
              <input
                className="widget-input"
                value={occupation}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "profile",
                      profileName,
                      profileBirthdate: birthdate,
                      profileOccupation: event.target.value,
                      profileImageUrl
                    }
                  })
                }
                placeholder="직업"
              />
              <input
                className="widget-input"
                value={profileImageUrl}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "profile",
                      profileName,
                      profileBirthdate: birthdate,
                      profileOccupation: occupation,
                      profileImageUrl: event.target.value
                    }
                  })
                }
                placeholder="프로필 사진 URL"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`profile-widget ${compact ? "compact" : ""}`}>
              <div className="profile-widget-head">
                {profileImageUrl ? (
                  <img className="profile-widget-avatar" src={profileImageUrl} alt={`${profileName} 프로필`} loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="profile-widget-avatar fallback" aria-hidden="true">
                    {fallbackInitial}
                  </div>
                )}
                <div className="profile-widget-identity">
                  <strong>{profileName}</strong>
                  <span>{occupation}</span>
                </div>
              </div>
              <div className="profile-widget-meta">
                <div className="profile-widget-meta-item">
                  <span>생년월일</span>
                  <strong>{formatProfileBirthdate(birthdate)}</strong>
                </div>
                <div className="profile-widget-meta-item">
                  <span>한국나이</span>
                  <strong>{koreanAge}</strong>
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "trending") {
      const region = getTrendingRegion(note);
      const trending = trendingWidgets[note.id];
      const expandedIndex = expandedTrendingItems[note.id] ?? null;

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">TREND</span>
            <p className="pin-title">{asText(note.content).trim() || "실시간 검색어"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={region}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "trending",
                      trendingRegion: event.target.value.toUpperCase()
                    }
                  })
                }
                placeholder="국가 코드 (예: KR)"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setTrendingWidgets((prev) => {
                    const next = { ...prev };
                    delete next[note.id];
                    return next;
                  });
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : trending ? (
            <div className="trending-widget">
              <div className="trending-region">{trending.region} · 인기 키워드</div>
              <div className="trending-list">
                {trending.items.slice(0, compact ? 5 : 8).map((item, index) => (
                  <div
                    key={`${note.id}-trend-${item.link}-${index}`}
                    className={`trending-entry ${expandedIndex === index ? "expanded" : ""}`}
                  >
                    <button
                      type="button"
                      className="trending-item"
                      onClick={(event) => {
                        event.stopPropagation();
                        setExpandedTrendingItems((prev) => ({
                          ...prev,
                          [note.id]: prev[note.id] === index ? null : index
                        }));
                      }}
                      aria-expanded={expandedIndex === index}
                    >
                      <span className="trending-rank">{index + 1}</span>
                      <span className="trending-title">{item.title}</span>
                      {item.traffic && <span className="trending-traffic">{item.traffic}</span>}
                    </button>
                    {expandedIndex === index && item.newsItems.length > 0 && (
                      <div className="trending-news-list">
                        {item.newsItems.map((newsItem) => (
                          <a
                            key={`${item.title}-${newsItem.link}`}
                            className="trending-news-item"
                            href={newsItem.link}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <span className="trending-news-title">{newsItem.title}</span>
                            <span className="trending-news-source">{newsItem.source}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rss-empty">실시간 검색어를 불러오는 중입니다.</p>
          )}
        </>
      );
    }

    if (widgetType === "delivery") {
      const trackingNumber = getDeliveryTrackingNumber(note);
      const carrierId = getDeliveryCarrierId(note);
      const label = getDeliveryLabel(note);
      const delivery = deliveryWidgets[note.id];

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">배송</span>
            <p className="pin-title">{asText(note.content).trim() || "택배 추적"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={label}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "delivery",
                      deliveryLabel: event.target.value
                    }
                  })
                }
                placeholder="택배 이름"
              />
              <select
                className="widget-input"
                value={carrierId}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "delivery",
                      deliveryCarrierId: event.target.value
                    }
                  })
                }
              >
                {deliveryCarriers.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
              <input
                className="widget-input"
                value={trackingNumber}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "delivery",
                      deliveryTrackingNumber: event.target.value
                    }
                  })
                }
                placeholder="운송장 번호"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setDeliveryWidgets((prev) => {
                    const next = { ...prev };
                    delete next[note.id];
                    return next;
                  });
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : trackingNumber ? (
            <div className="delivery-widget">
              <div className="delivery-summary">
                <strong>{label || "택배"}</strong>
                <span>{delivery?.carrier?.name || carrierId}</span>
                <em>{delivery?.state?.text || "조회 중"}</em>
              </div>
              {delivery?.progress?.length ? (
                <div className="delivery-progress-list">
                  {delivery.progress.slice(0, compact ? 2 : 4).map((progress, index) => (
                    <div key={`${note.id}-delivery-${index}`} className="delivery-progress-item">
                      <strong>{progress.status.text}</strong>
                      <span>{progress.location?.name || "-"}</span>
                      <span>{progress.time || ""}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rss-empty">배송 흐름을 불러오는 중입니다.</p>
              )}
            </div>
          ) : (
            <p className="rss-empty">운송장 번호를 입력하면 배송 상태를 볼 수 있습니다.</p>
          )}
        </>
      );
    }

    if (widgetType === "social") {
      const source = getSocialSource(note);
      const socialFeed = socialWidgets[note.id];
      const visiblePosts = socialFeed?.posts.slice(0, compact ? 2 : 4) ?? [];

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">SNS</span>
            <p className="pin-title">{asText(note.content).trim() || "SNS 피드"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={source}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => {
                  setSocialWidgets((prev) => {
                    const next = { ...prev };
                    delete next[note.id];
                    return next;
                  });
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "social",
                      socialSource: event.target.value
                    }
                  });
                }}
                placeholder="Bluesky, X/Twitter, Mastodon, RSS 주소"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : socialFeed ? (
            <div className={`social-widget ${compact ? "compact" : ""}`}>
              <div className="social-widget-head">
                {socialFeed.avatar ? (
                  <img className="social-widget-avatar" src={socialFeed.avatar} alt={socialFeed.title} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="social-widget-avatar fallback" aria-hidden="true">
                    {(socialFeed.title || "S").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="social-widget-meta">
                  <strong>{socialFeed.title}</strong>
                  <span>{socialFeed.handle}</span>
                </div>
              </div>
              {visiblePosts.length > 0 ? (
                <div className="social-feed-list">
                  {visiblePosts.map((post) => (
                    <a
                      key={`${note.id}-social-${post.id}`}
                      className="social-feed-card"
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div className="social-feed-card-head">
                        <div className="social-feed-card-user">
                          {post.avatar ? (
                            <img className="social-widget-avatar small" src={post.avatar} alt={post.author} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <div className="social-widget-avatar fallback small" aria-hidden="true">
                              {(post.author || "S").slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="social-feed-card-author">
                            <strong>{post.author}</strong>
                            <span>{post.handle}</span>
                          </div>
                        </div>
                        <span className="social-feed-card-date">{formatSocialDate(post.createdAt)}</span>
                      </div>
                      <p className="social-feed-card-text">{post.text}</p>
                      <span className="social-feed-card-link">
                        {socialFeed.sourceType === "twitter" ? "X" : socialFeed.sourceType.toUpperCase()}
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="rss-empty">공개 최신 글을 불러오고 있습니다.</p>
              )}
            </div>
          ) : (
            <p className="rss-empty">공개 최신 글을 불러오고 있습니다.</p>
          )}
        </>
      );
    }

    if (widgetType === "pet") {
      const petName = getPetName(note);
      const visitCount = petVisitCounts[note.boardId] ?? 0;
      const stage = getPetStage(visitCount);

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">PET</span>
            <p className="pin-title">{asText(note.content).trim() || "방문자 캐릭터"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <input
                className="widget-input"
                value={petName}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "pet",
                      petName: event.target.value
                    }
                  })
                }
                placeholder="캐릭터 이름"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`pet-widget ${compact ? "compact" : ""}`}>
              <div className="pet-character">{stage.emoji}</div>
              <strong>
                {petName} · {stage.label}
              </strong>
              <span>{stage.message}</span>
              <div className="pet-stats">
                <span>오늘 방문 {visitCount}</span>
                <span>다음 성장까지 {Math.max(0, (visitCount < 3 ? 3 : visitCount < 10 ? 10 : visitCount < 25 ? 25 : 50) - visitCount)}</span>
              </div>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "document") {
      const variant = getDocumentVariant(note);
      const kicker = getDocumentKicker(note);
      const body = getDocumentBody(note);
      const primaryCta = getDocumentPrimaryCta(note);
      const secondaryCta = getDocumentSecondaryCta(note);
      const primaryCtaUrl = getDocumentPrimaryCtaUrl(note);
      const secondaryCtaUrl = getDocumentSecondaryCtaUrl(note);
      const renderDocumentAction = (
        label: string,
        href: string,
        kind: "primary" | "secondary",
        key: string
      ) => {
        if (!label) {
          return null;
        }

        const className = `document-widget-action ${kind === "primary" ? "primary" : ""}`.trim();
        if (href) {
          return (
            <a
              key={key}
              className={className}
              href={href}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              {label}
            </a>
          );
        }

        return (
          <span key={key} className={className}>
            {label}
          </span>
        );
      };

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">DOC</span>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="섹션 제목"
              />
              <input
                className="widget-input"
                value={kicker}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: variant,
                      documentKicker: event.target.value,
                      documentBody: body,
                      documentPrimaryCta: primaryCta,
                      documentSecondaryCta: secondaryCta,
                      documentPrimaryCtaUrl: primaryCtaUrl,
                      documentSecondaryCtaUrl: secondaryCtaUrl
                    }
                  })
                }
                placeholder="작은 카테고리 문구"
              />
              <select
                className="widget-input"
                value={variant}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: isDocumentVariant(event.target.value)
                        ? event.target.value
                        : DEFAULT_DOCUMENT_VARIANT,
                      documentKicker: kicker,
                      documentBody: body,
                      documentPrimaryCta: primaryCta,
                      documentSecondaryCta: secondaryCta,
                      documentPrimaryCtaUrl: primaryCtaUrl,
                      documentSecondaryCtaUrl: secondaryCtaUrl
                    }
                  })
                }
              >
                <option value="hero">히어로</option>
                <option value="section">섹션</option>
                <option value="feature">기능 카드</option>
                <option value="cta">CTA</option>
              </select>
              <textarea
                className="widget-textarea"
                value={body}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: variant,
                      documentKicker: kicker,
                      documentBody: event.target.value,
                      documentPrimaryCta: primaryCta,
                      documentSecondaryCta: secondaryCta,
                      documentPrimaryCtaUrl: primaryCtaUrl,
                      documentSecondaryCtaUrl: secondaryCtaUrl
                    }
                  })
                }
                placeholder="섹션 설명"
                rows={8}
              />
              <input
                className="widget-input"
                value={primaryCta}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: variant,
                      documentKicker: kicker,
                      documentBody: body,
                      documentPrimaryCta: event.target.value,
                      documentSecondaryCta: secondaryCta,
                      documentPrimaryCtaUrl: primaryCtaUrl,
                      documentSecondaryCtaUrl: secondaryCtaUrl
                    }
                  })
                }
                placeholder="주요 버튼 문구"
              />
              <input
                className="widget-input"
                value={primaryCtaUrl}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: variant,
                      documentKicker: kicker,
                      documentBody: body,
                      documentPrimaryCta: primaryCta,
                      documentSecondaryCta: secondaryCta,
                      documentPrimaryCtaUrl: event.target.value,
                      documentSecondaryCtaUrl: secondaryCtaUrl
                    }
                  })
                }
                placeholder="주요 버튼 이동 URL"
              />
              <input
                className="widget-input"
                value={secondaryCta}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: variant,
                      documentKicker: kicker,
                      documentBody: body,
                      documentPrimaryCta: primaryCta,
                      documentSecondaryCta: event.target.value,
                      documentPrimaryCtaUrl: primaryCtaUrl,
                      documentSecondaryCtaUrl: secondaryCtaUrl
                    }
                  })
                }
                placeholder="보조 버튼 문구"
              />
              <input
                className="widget-input"
                value={secondaryCtaUrl}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "document",
                      documentVariant: variant,
                      documentKicker: kicker,
                      documentBody: body,
                      documentPrimaryCta: primaryCta,
                      documentSecondaryCta: secondaryCta,
                      documentPrimaryCtaUrl: primaryCtaUrl,
                      documentSecondaryCtaUrl: event.target.value
                    }
                  })
                }
                placeholder="보조 버튼 이동 URL"
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`document-widget ${variant} ${compact ? "compact" : ""}`}>
              {kicker && <span className="document-widget-kicker">{kicker}</span>}
              <strong>{asText(note.content).trim() || "문서 섹션"}</strong>
              <p>{body}</p>
              {(primaryCta || secondaryCta) && (
                <div className="document-widget-actions">
                  {renderDocumentAction(primaryCta, primaryCtaUrl, "primary", `${note.id}-doc-primary-cta`)}
                  {renderDocumentAction(secondaryCta, secondaryCtaUrl, "secondary", `${note.id}-doc-secondary-cta`)}
                </div>
              )}
            </div>
          )}
        </>
      );
    }

    if (widgetType === "cover") {
      const subtitle = getCoverSubtitle(note);
      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">COVER</span>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="보드 커버 제목"
              />
              <textarea
                className="widget-textarea"
                value={subtitle}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "cover",
                      coverSubtitle: event.target.value
                    }
                  })
                }
                placeholder="보드 소개 한 줄"
                rows={3}
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`cover-widget ${compact ? "compact" : ""}`}>
              <span className="cover-widget-kicker">Board Cover</span>
              <strong>{asText(note.content).trim() || "보드 커버"}</strong>
              <p>{subtitle}</p>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "focus") {
      const focus = getFocusSnapshot(note, focusNow);
      const minutes = Math.floor(focus.remainingSeconds / 60)
        .toString()
        .padStart(2, "0");
      const seconds = (focus.remainingSeconds % 60).toString().padStart(2, "0");
      const progressPercent = Math.round(focus.progress * 100);

      const startFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            widgetType: "focus",
            focusDurationMinutes: focus.durationMinutes,
            focusStartedAt: nowIso(),
            focusElapsedSeconds: getFocusElapsedSeconds(note)
          }
        });
      };

      const pauseFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            widgetType: "focus",
            focusDurationMinutes: focus.durationMinutes,
            focusStartedAt: "",
            focusElapsedSeconds: focus.elapsedSeconds
          }
        });
      };

      const resetFocus = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            widgetType: "focus",
            focusDurationMinutes: focus.durationMinutes,
            focusStartedAt: "",
            focusElapsedSeconds: 0
          }
        });
      };

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">FOCUS</span>
            <p className="pin-title">{asText(note.content).trim() || "포커스 타이머"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <label className="widget-field">
                <span>집중 시간 (분)</span>
                <input
                  className="widget-input"
                  type="number"
                  min={1}
                  max={180}
                  value={focus.durationMinutes}
                  onMouseDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    updateNote(note.id, {
                      metadata: {
                        ...note.metadata,
                        widgetType: "focus",
                        focusDurationMinutes: Number(event.target.value) || DEFAULT_FOCUS_DURATION_MINUTES
                      }
                    })
                  }
                />
              </label>
              <div className="focus-widget-actions">
                <button className="widget-confirm" onClick={focus.isRunning ? pauseFocus : startFocus}>
                  {focus.isRunning ? "일시정지" : "시작"}
                </button>
                <button className="widget-secondary" onClick={resetFocus}>
                  리셋
                </button>
              </div>
            </div>
          ) : (
            <div className={`focus-widget ${compact ? "compact" : ""}`}>
              <div className="focus-widget-timer">
                {minutes}:{seconds}
              </div>
              <div className="focus-widget-track" aria-hidden="true">
                <div className="focus-widget-fill" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="focus-widget-meta">
                <span>{focus.isRunning ? "집중 중" : "대기 중"}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="focus-widget-actions">
                <button className="widget-confirm" onClick={focus.isRunning ? pauseFocus : startFocus}>
                  {focus.isRunning ? "멈춤" : "시작"}
                </button>
                <button className="widget-secondary" onClick={resetFocus}>
                  초기화
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "mood") {
      const moodEmoji = getMoodEmoji(note);
      const moodNote = getMoodNote(note);
      const moodEnergy = getMoodEnergy(note);
      const moodOptions = ["😴", "🙂", "😎", "🔥", "🥳"];

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">MOOD</span>
            <p className="pin-title">{asText(note.content).trim() || "오늘의 무드"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <div className="mood-picker">
                {moodOptions.map((option) => (
                  <button
                    key={`${note.id}-${option}`}
                    className={`mood-option ${moodEmoji === option ? "active" : ""}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      updateNote(note.id, {
                        metadata: {
                          ...note.metadata,
                          widgetType: "mood",
                          moodEmoji: option
                        }
                      });
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <label className="widget-field">
                <span>에너지</span>
                <input
                  className="widget-input"
                  type="range"
                  min={1}
                  max={5}
                  value={moodEnergy}
                  onMouseDown={(event) => event.stopPropagation()}
                  onChange={(event) =>
                    updateNote(note.id, {
                      metadata: {
                        ...note.metadata,
                        widgetType: "mood",
                        moodEnergy: Number(event.target.value)
                      }
                    })
                  }
                />
              </label>
              <textarea
                className="widget-textarea"
                value={moodNote}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "mood",
                      moodNote: event.target.value
                    }
                  })
                }
                placeholder="오늘 기분 메모"
                rows={3}
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`mood-widget ${compact ? "compact" : ""}`}>
              <div className="mood-widget-emoji">{moodEmoji}</div>
              <strong>에너지 {moodEnergy}/5</strong>
              <p>{moodNote}</p>
            </div>
          )}
        </>
      );
    }

    if (widgetType === "routine") {
      const routineItems = getRoutineItems(note);

      const toggleRoutineItem = (event: React.MouseEvent<HTMLButtonElement>, index: number) => {
        event.stopPropagation();
        const nextItems = routineItems.map((item, itemIndex) =>
          itemIndex === index ? { ...item, checked: !item.checked } : item
        );
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            widgetType: "routine",
            routineItems: nextItems,
            routineText: serializeChecklistItems(nextItems)
          }
        });
      };

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">ROUTINE</span>
            <p className="pin-title">{asText(note.content).trim() || "루틴"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <textarea
                className="widget-textarea"
                value={serializeChecklistItems(routineItems)}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const nextItems = parseChecklistItems(event.target.value);
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "routine",
                      routineItems: nextItems,
                      routineText: event.target.value
                    }
                  });
                }}
                placeholder="[ ] 아침 스트레칭"
                rows={6}
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`routine-widget ${compact ? "compact" : ""}`}>
              {routineItems.slice(0, compact ? 3 : routineItems.length).map((item, index) => (
                <button
                  key={`${note.id}-routine-${index}`}
                  className={`routine-item ${item.checked ? "checked" : ""}`}
                  onClick={(event) => toggleRoutineItem(event, index)}
                >
                  <span className="routine-item-mark">{item.checked ? "✓" : ""}</span>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          )}
        </>
      );
    }

    if (widgetType === "food") {
      const regionInput = getFoodRegion(note);
      const recommendationSet = buildFoodRecommendationSet(regionInput, getFoodSeed(note));

      return (
        <div className={`food-widget${compact ? " compact" : ""}`}>
          <div className="food-widget-header">
            <span className="food-widget-kicker">오늘은 뭐 먹지</span>
            <strong>{recommendationSet.region}</strong>
          </div>
          {!compact && selected && (
            <div className="widget-field">
              <span>지역</span>
              <input
                className="pin-input"
                value={regionInput}
                onChange={(event) =>
                  setNotes((prev) =>
                    prev.map((current) =>
                      current.id === note.id
                        ? {
                            ...current,
                            metadata: {
                              ...current.metadata,
                              widgetType: "food",
                              foodRegion: event.target.value
                            }
                          }
                        : current
                    )
                  )
                }
                placeholder="예: 서울 금천구"
              />
            </div>
          )}
          <div className="food-widget-list">
            {recommendationSet.entries.map(({ category, label, item }) => (
              <a
                key={`${category}-${item.name}`}
                className="food-widget-card food-widget-card-link"
                href={getFoodDetailsUrl(recommendationSet.region, item)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                <span className={`food-widget-label ${category}`}>{label}</span>
                <strong>{item.name}</strong>
                <p>{item.menu}</p>
                <small>{item.summary}</small>
              </a>
            ))}
          </div>
          {!compact && (
            <div className="food-widget-actions">
              <button
                className="widget-secondary"
                onClick={(event) => {
                  event.stopPropagation();
                  setNotes((prev) =>
                    prev.map((current) =>
                      current.id === note.id
                        ? {
                            ...current,
                            metadata: {
                              ...current.metadata,
                              widgetType: "food",
                              foodRegion: regionInput,
                              foodSeed: Date.now()
                            }
                          }
                        : current
                    )
                  );
                }}
              >
                다시 추천
              </button>
            </div>
          )}
        </div>
      );
    }

    if (widgetType === "prompt") {
      const promptText = getPromptText(note);

      const copyPrompt = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(promptText);
          setCopiedPromptId(note.id);
          if (promptCopyTimerRef.current) {
            window.clearTimeout(promptCopyTimerRef.current);
          }
          promptCopyTimerRef.current = window.setTimeout(() => {
            setCopiedPromptId((current) => (current === note.id ? null : current));
          }, 1600);
        } catch (error) {
          console.error("Failed to copy prompt", error);
        }
      };

      return (
        <>
          <div className="widget-header">
            <span className="widget-badge">PROMPT</span>
            <p className="pin-title">{asText(note.content).trim() || "AI 프롬프트"}</p>
          </div>
          {selected ? (
            <div className="widget-editor-stack">
              <input
                className="widget-input"
                value={note.content}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => updateNote(note.id, { content: event.target.value })}
                placeholder="위젯 제목"
              />
              <textarea
                className="widget-textarea"
                value={promptText}
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) =>
                  updateNote(note.id, {
                    metadata: {
                      ...note.metadata,
                      widgetType: "prompt",
                      promptText: event.target.value
                    }
                  })
                }
                placeholder="자주 쓰는 프롬프트를 입력하세요"
                rows={8}
              />
              <button
                className="widget-confirm"
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedNoteId(null);
                }}
              >
                확인
              </button>
            </div>
          ) : (
            <div className={`prompt-widget ${compact ? "compact" : ""}`}>
              <pre>{promptText}</pre>
              <button className="widget-secondary prompt-copy-button" onClick={copyPrompt}>
                {copiedPromptId === note.id ? "복사됨" : "프롬프트 복사"}
              </button>
            </div>
          )}
        </>
      );
    }

    return null;
  };

  const revealMoreForNote = (noteId: string) => {
    setNoteMoreState((prev) => ({
      ...prev,
      [noteId]: (prev[noteId] ?? 0) + 1
    }));
  };

  const mergeLocalSnapshotToCloud = async (userId: string, remoteBoards: BoardV2[], remoteNotes: NoteV2[]) => {
    const localSnapshot = readStoredLocalSnapshot();
    if (!hasCustomLocalSnapshot(localSnapshot)) {
      return pruneEmptyBoards({
        boards: remoteBoards,
        notes: remoteNotes,
        selectedBoardId: remoteBoards[0]?.id ?? null
      });
    }

    const timestamp = nowIso();
    const importedBoards = localSnapshot!.boards.map((board, index) => ({
      ...board,
      id: makeId(),
      userId,
      title: board.title || `Imported Board ${index + 1}`,
      updatedAt: timestamp
    }));

    const boardIdMap = new Map(localSnapshot!.boards.map((board, index) => [board.id, importedBoards[index].id]));

    const importedNotes = localSnapshot!.notes.map((note, index) => ({
      ...note,
      id: makeId(),
      boardId: boardIdMap.get(note.boardId) ?? importedBoards[0]?.id ?? makeId(),
      userId,
      zIndex: index + 1,
      updatedAt: timestamp
    }));

    const merged = pruneEmptyBoards({
      boards: [...importedBoards, ...remoteBoards],
      notes: [...importedNotes, ...remoteNotes],
      selectedBoardId: importedBoards[0]?.id ?? remoteBoards[0]?.id ?? null
    });

    await saveBoardsV2({ boards: merged.boards, notes: merged.notes, currentUserId: userId });
    clearLocalSnapshot();

    return merged;
  };

  const boardNotes = useMemo(
    () => notes.filter((note) => note.boardId === selectedBoard?.id),
    [notes, selectedBoard?.id]
  );
  const activeNotes = useMemo(() => boardNotes.filter((note) => !isNoteTrashed(note)), [boardNotes]);
  const archivedNotes = useMemo(() => boardNotes.filter((note) => isNoteTrashed(note)), [boardNotes]);
  const trashedNotes = useMemo(
    () =>
      notes.filter((note) => {
        if (!isNoteTrashed(note)) {
          return false;
        }

        const board = boards.find((item) => item.id === note.boardId);
        return board ? !isBoardTrashed(board) : false;
      }),
    [boards, notes]
  );
  const sortedTrashedBoards = useMemo(
    () =>
      [...trashedBoards].sort((a, b) => (getBoardTrashedAt(b) ?? "").localeCompare(getBoardTrashedAt(a) ?? "")),
    [trashedBoards]
  );
  const sortedTrashedNotes = useMemo(
    () =>
      [...trashedNotes].sort((a, b) => (getNoteTrashedAt(b) ?? "").localeCompare(getNoteTrashedAt(a) ?? "")),
    [trashedNotes]
  );
  const currentNotes = feedMode === "active" ? activeNotes : archivedNotes;
  const lastPersistedLabel = formatSavedAtLabel(lastPersistedAt);
  const saveStatusAnnouncement = hasSupabaseConfig && user
    ? cloudSaveState === "saving"
      ? "저장 중"
      : cloudSaveState === "saved"
        ? lastPersistedLabel
          ? `${lastPersistedLabel} 저장됨`
          : "저장됨"
        : cloudSaveState === "error"
          ? "저장 확인 필요"
          : lastPersistedLabel
            ? `${lastPersistedLabel} 저장됨`
            : ""
    : lastPersistedLabel
      ? `${lastPersistedLabel} 브라우저 저장됨`
      : "";

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const base = [...currentNotes].sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return a.zIndex - b.zIndex;
    });

    if (!keyword) {
      return base;
    }

    return base.filter((note) => asText(note.content).toLowerCase().includes(keyword));
  }, [currentNotes, search]);

  const visibleNotes = useMemo(
    () => filteredNotes.slice(0, visibleNoteCount),
    [filteredNotes, visibleNoteCount]
  );
  const boardCatEligible = !isReadOnlyBoardView && !isHomeView && feedMode === "active" && visibleNotes.length > 0;
  const visibleColumns = useMemo(
    () => groupNotesByColumn(visibleNotes, columnCount),
    [visibleNotes, columnCount]
  );

  useEffect(() => {
    if (!supabase) {
      const local = loadLocalSnapshot();
      setBoards(local.boards);
      setNotes(local.notes);
      loadedBoardNotesRef.current = new Set(local.boards.map((board) => board.id));
      pendingBoardNotesRef.current.clear();
      setSelectedBoardId(local.selectedBoardId ?? local.boards[0]?.id ?? null);
      setLoading(false);
      setBackgroundBoardHydrating(false);
      setBoardContentLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      if (sessionUser?.email) {
        setUser({ id: sessionUser.id, email: sessionUser.email });
        void syncUserProfile(sessionUser.id, sessionUser.email).catch((error) => {
          console.error("Failed to sync user profile", error);
        });
      }
      setAuthChecked(true);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser?.email) {
        setUser(null);
        return;
      }

      setUser({ id: sessionUser.id, email: sessionUser.email });
      void syncUserProfile(sessionUser.id, sessionUser.email).catch((error) => {
        console.error("Failed to sync user profile", error);
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (homeBoardRoute) {
      if (!supabase) {
        const fallbackSnapshot = createHomeLandingSnapshot(HOME_FALLBACK_OWNER_ID, getColumnCount());
        setSharedBoardReadOnly(true);
        setBoards([fallbackSnapshot.board]);
        setNotes(sanitizeNotes(fallbackSnapshot.notes));
        loadedBoardNotesRef.current = new Set([fallbackSnapshot.board.id]);
        pendingBoardNotesRef.current.clear();
        setSelectedBoardId(fallbackSnapshot.board.id);
        setLoading(false);
        setBackgroundBoardHydrating(false);
        setBoardContentLoading(false);
        return;
      }

      setLoading(true);
      const loadHomeBoard = async () => {
        const editablePayload = user?.id ? await loadEditableHomeBoardV2() : null;
        if (editablePayload) {
          return { payload: editablePayload, readOnly: false };
        }

        const readonlyPayload = await loadHomeBoardV2();
        if (readonlyPayload) {
          return { payload: readonlyPayload, readOnly: true };
        }

        if (user?.id && isHomeAdminEmail(user?.email)) {
          const snapshot = createHomeLandingSnapshot(user.id, getColumnCount());
          try {
            await saveBoardsV2({
              boards: [snapshot.board],
              notes: snapshot.notes,
              currentUserId: user.id
            });
          } catch (error) {
            console.error("Failed to seed default home board", error);
          }
          return { payload: snapshot, readOnly: false };
        }

        return {
          payload: createHomeLandingSnapshot(HOME_FALLBACK_OWNER_ID, getColumnCount()),
          readOnly: true
        };
      };

      loadHomeBoard()
        .then(({ payload, readOnly }) => {
          if (!active) {
            return;
          }

          if (!payload) {
            setSharedBoardReadOnly(true);
            setBoards([]);
            setNotes([]);
            loadedBoardNotesRef.current.clear();
            pendingBoardNotesRef.current.clear();
            setSelectedBoardId(null);
            setSelectedNoteId(null);
            setLoading(false);
            setBackgroundBoardHydrating(false);
            setBoardContentLoading(false);
            return;
          }

          setSharedBoardReadOnly(readOnly);
          setBoards([payload.board]);
          setNotes(sanitizeNotes(payload.notes));
          loadedBoardNotesRef.current = new Set([payload.board.id]);
          pendingBoardNotesRef.current.clear();
          setSelectedBoardId(payload.board.id);
          setSelectedNoteId(null);
          setFeedMode("active");
          setLoading(false);
          setBackgroundBoardHydrating(false);
          setBoardContentLoading(false);
        })
        .catch(() => {
          if (active) {
            setSharedBoardReadOnly(true);
            setBoards([]);
            setNotes([]);
            loadedBoardNotesRef.current.clear();
            pendingBoardNotesRef.current.clear();
            setSelectedBoardId(null);
            setSelectedNoteId(null);
            setLoading(false);
            setBackgroundBoardHydrating(false);
            setBoardContentLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }

    if (sharedBoardSlug) {
      if (!supabase) {
        setBoards([]);
        setNotes([]);
        loadedBoardNotesRef.current.clear();
        pendingBoardNotesRef.current.clear();
        setSelectedBoardId(null);
        setLoading(false);
        setBackgroundBoardHydrating(false);
        setBoardContentLoading(false);
        return;
      }

      setLoading(true);
      const loadSharedBoard = async () => {
        const editablePayload = user?.id ? await loadEditableSharedBoardV2(sharedBoardSlug) : null;
        if (editablePayload) {
          return { payload: editablePayload, readOnly: false };
        }

        const readonlyPayload = await loadSharedBoardV2(sharedBoardSlug);
        return { payload: readonlyPayload, readOnly: true };
      };

      loadSharedBoard()
        .then(({ payload, readOnly }) => {
          if (!active) {
            return;
          }

          if (!payload) {
            setSharedBoardReadOnly(true);
            setBoards([]);
            setNotes([]);
            loadedBoardNotesRef.current.clear();
            pendingBoardNotesRef.current.clear();
            setSelectedBoardId(null);
            setSelectedNoteId(null);
            setLoading(false);
            setBackgroundBoardHydrating(false);
            setBoardContentLoading(false);
            return;
          }

          setSharedBoardReadOnly(readOnly);
          setBoards([payload.board]);
          setNotes(sanitizeNotes(payload.notes));
          loadedBoardNotesRef.current = new Set([payload.board.id]);
          pendingBoardNotesRef.current.clear();
          setSelectedBoardId(payload.board.id);
          setSelectedNoteId(null);
          setFeedMode("active");
          setLoading(false);
          setBackgroundBoardHydrating(false);
          setBoardContentLoading(false);
        })
        .catch(() => {
          if (active) {
            setSharedBoardReadOnly(true);
            setBoards([]);
            setNotes([]);
            loadedBoardNotesRef.current.clear();
            pendingBoardNotesRef.current.clear();
            setSelectedBoardId(null);
            setSelectedNoteId(null);
            setLoading(false);
            setBackgroundBoardHydrating(false);
            setBoardContentLoading(false);
          }
        });

      return () => {
        active = false;
      };
    }

    setSharedBoardReadOnly(false);

    if (!user?.id || !supabase) {
      const local = loadLocalSnapshot();
      setBoards(local.boards);
      setNotes(local.notes);
      loadedBoardNotesRef.current = new Set(local.boards.map((board) => board.id));
      pendingBoardNotesRef.current.clear();
      setSelectedBoardId(local.selectedBoardId ?? local.boards[0]?.id ?? null);
      setLoading(false);
      setBackgroundBoardHydrating(false);
      setBoardContentLoading(false);
      return;
    }

    setLoading(true);
    setBackgroundBoardHydrating(false);
    setBoardContentLoading(false);

    const localSnapshot = readStoredLocalSnapshot();
    const hasLocalImport = hasCustomLocalSnapshot(localSnapshot);
    if (localSnapshot?.boards?.length) {
      setBoards(localSnapshot.boards);
      setNotes(sanitizeNotes(localSnapshot.notes));
      loadedBoardNotesRef.current = new Set(localSnapshot.boards.map((board) => board.id));
      pendingBoardNotesRef.current.clear();
      setSelectedBoardId(localSnapshot.selectedBoardId ?? localSnapshot.boards[0]?.id ?? null);
      setLoading(false);
      setBoardContentLoading(true);
    }

    (hasLocalImport ? loadBoardsV2(user.id) : Promise.resolve(null))
      .then(async (payload) => {
        if (!active) {
          return;
        }

        if (payload) {
          const merged = await mergeLocalSnapshotToCloud(user.id, payload.boards, payload.notes);
          if (!active) {
            return;
          }

          skipNextCloudSaveRef.current = true;
          loadedBoardNotesRef.current = new Set(merged.boards.map((board) => board.id));
          pendingBoardNotesRef.current.clear();
          setBoards(merged.boards);
          setNotes(sanitizeNotes(merged.notes));
          const preferredBoardId = loadLastViewedBoardId(user.id);
          const homeBoardId = getPreferredHomeBoardId(merged.boards);
          const restoredBoardId = merged.boards.some((board) => !isBoardTrashed(board) && board.id === preferredBoardId)
            ? preferredBoardId
            : homeBoardId ?? merged.selectedBoardId;
          setSelectedBoardId(restoredBoardId);
          setSelectedNoteId(null);
          setLoading(false);
          setBackgroundBoardHydrating(false);
          setBoardContentLoading(false);
          return;
        }

        const remoteBoards = await loadBoardShellsV2(user.id);
        if (!active) {
          return;
        }

        const preferredBoardId = loadLastViewedBoardId(user.id);
        const homeBoardId = getPreferredHomeBoardId(remoteBoards);
        const initialBoardId = remoteBoards.some((board) => !isBoardTrashed(board) && board.id === preferredBoardId)
          ? preferredBoardId
          : homeBoardId ?? remoteBoards[0]?.id ?? null;
        skipNextCloudSaveRef.current = true;
        loadedBoardNotesRef.current.clear();
        pendingBoardNotesRef.current.clear();
        setBoards(remoteBoards);
        setNotes([]);
        setSelectedBoardId(initialBoardId);
        setSelectedNoteId(null);

        const initialNotes = sanitizeNotes(await loadBoardNotesV2(initialBoardId ? [initialBoardId] : []));
        if (!active) {
          return;
        }

        if (initialBoardId) {
          loadedBoardNotesRef.current = new Set([initialBoardId]);
        } else {
          loadedBoardNotesRef.current.clear();
        }
        setNotes(initialNotes);
        setLoading(false);
        setBoardContentLoading(false);

        const deferredBoardIds = remoteBoards.map((board) => board.id).filter((boardId) => boardId !== initialBoardId);
        if (deferredBoardIds.length === 0) {
          setBackgroundBoardHydrating(false);
          return;
        }

        setBackgroundBoardHydrating(true);
        void (async () => {
          for (const boardId of deferredBoardIds) {
            if (!active) {
              return;
            }

            await fetchBoardNotesIntoState(boardId);
          }

          if (active) {
            setBackgroundBoardHydrating(false);
          }
        })();
      })
      .catch(() => {
        if (active) {
          setLoading(false);
          setBackgroundBoardHydrating(false);
          setBoardContentLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id, sharedBoardSlug, homeBoardRoute]);

  useEffect(() => {
    if (
      loading ||
      !backgroundBoardHydrating ||
      !selectedBoardId ||
      !user?.id ||
      !supabase ||
      sharedBoardSlug ||
      homeBoardRoute ||
      loadedBoardNotesRef.current.has(selectedBoardId)
    ) {
      return;
    }

    setBoardContentLoading(true);
    void fetchBoardNotesIntoState(selectedBoardId).finally(() => {
      setBoardContentLoading(false);
    });
  }, [backgroundBoardHydrating, homeBoardRoute, loading, selectedBoardId, sharedBoardSlug, user?.id]);

  useEffect(() => {
    setProfileMenuOpen(false);
    if (!canInviteBoard) {
      setInviteOpen(false);
      setInviteQuery("");
      setInviteResults([]);
      setBoardMembers([]);
      setInviteError(null);
    }
  }, [canInviteBoard, selectedBoard?.id]);

  useEffect(() => {
    if (!settingsOpen || !selectedBoard || !isBoardOwner) {
      return;
    }

    void refreshBoardMembers(selectedBoard.id);
  }, [settingsOpen, selectedBoard?.id, isBoardOwner]);

  useEffect(() => {
    if (settingsOpen) {
      setSettingsRendered(true);
      const frame = window.requestAnimationFrame(() => {
        setSettingsClosing(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    if (!settingsRendered) {
      return;
    }

    setSettingsClosing(true);
    const timeout = window.setTimeout(() => {
      setSettingsRendered(false);
      setSettingsClosing(false);
    }, SETTINGS_PANEL_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [settingsOpen, settingsRendered]);

  useEffect(() => {
    if (!inviteOpen) {
      return;
    }

    void searchInviteCandidates(inviteQuery);
  }, [inviteOpen, inviteQuery, boardMembers, selectedBoard?.id]);

  useEffect(() => {
    const currentBoardId = selectedBoard?.id ?? boards[0]?.id ?? null;

    if (isReadOnlyBoardView) {
      setCloudSaveState("idle");
      return;
    }

    if (!user?.id || !supabase) {
      saveLocalSnapshot({ boards, notes, selectedBoardId: currentBoardId });
      setCloudSaveState("idle");
      setLastPersistedAt(nowIso());
      return;
    }

    if (loading || backgroundBoardHydrating) {
      return;
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    setCloudSaveState("saving");
    const timer = window.setTimeout(() => {
      void persistCloudSnapshot()
        .then(() => {
          markCloudSaved();
        })
        .catch((error) => {
          setCloudSaveState("error");
          console.error("Failed to save boards", error);
        });
    }, CLOUD_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [backgroundBoardHydrating, boards, notes, selectedBoard?.id, user?.id, loading, isReadOnlyBoardView]);

  useEffect(() => {
    if (isReadOnlyBoardView || homeBoardRoute || feedMode !== "active") {
      return;
    }

    saveLastViewedBoardId(selectedBoard?.id ?? null, user?.id ?? null);
  }, [selectedBoard?.id, user?.id, isReadOnlyBoardView, homeBoardRoute, feedMode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const isAnonymousLanding = !user && !isSharedView;
    const boardTitle = selectedBoard?.title?.trim();
    const title = isAnonymousLanding ? "WZD | 메모와 위젯 보드" : boardTitle ? `${boardTitle} | WZD` : "WZD 개인 시작페이지";
    const description = isAnonymousLanding
      ? "WZD는 메모, 링크, 체크리스트, 날씨, RSS 같은 위젯을 한 보드에 함께 놓는 워크스페이스입니다."
      : selectedBoard?.description?.trim() || "WZD에서 메모, 링크, 위젯이 담긴 보드를 만들고 공유해보세요.";

    document.title = title;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      document.head.appendChild(descriptionMeta);
    }

    descriptionMeta.setAttribute("content", description);
  }, [selectedBoard, user, isSharedView]);

  useEffect(() => {
    return () => {
      if (promptCopyTimerRef.current) {
        window.clearTimeout(promptCopyTimerRef.current);
      }
      if (saveStateResetTimerRef.current) {
        window.clearTimeout(saveStateResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!supabase || !user?.id) {
      return;
    }

    const flushOnLeave = () => {
      void persistCloudSnapshot().catch((error) => {
        console.error("Failed to flush boards before leaving", error);
      });
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushOnLeave();
      }
    };

    window.addEventListener("pagehide", flushOnLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushOnLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!selectedBoard && activeBoards.length > 0) {
      setSelectedBoardId(getPreferredHomeBoardId(activeBoards) ?? activeBoards[0].id);
    }
  }, [activeBoards, selectedBoard]);

  useEffect(() => {
    if (feedMode !== "active" || !selectedBoard?.id) {
      return;
    }

    const tab = mobileBoardTabRefs.current[selectedBoard.id];
    const container = mobileBoardTabsRef.current;
    if (!tab || !container) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const leftGap = tabRect.left - containerRect.left;
    const rightGap = tabRect.right - containerRect.right;

    if (leftGap < 0) {
      container.scrollBy({ left: leftGap - 12, behavior: "smooth" });
      return;
    }

    if (rightGap > 0) {
      container.scrollBy({ left: rightGap + 12, behavior: "smooth" });
    }
  }, [feedMode, selectedBoard?.id]);

  useEffect(() => {
    if (!mobileViewport || !selectedNoteId || pendingMobileNewNoteScrollRef.current !== selectedNoteId) {
      return;
    }

    const target = noteCardRefs.current[selectedNoteId];
    if (!target) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        const editor = noteEditorRefs.current[selectedNoteId];
        if (editor) {
          editor.focus({ preventScroll: true });
          const length = editor.value.length;
          editor.setSelectionRange(length, length);
        }
        pendingMobileNewNoteScrollRef.current = null;
      }, 260);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [mobileViewport, selectedNoteId, visibleNotes]);

  useEffect(() => {
    setBoardTitleDraft(selectedBoard?.title ?? "");
    setEditingBoardTitle(false);
  }, [selectedBoard?.id]);

  useEffect(() => {
    setCatRemoteOpen(false);
  }, [selectedBoard?.id, feedMode]);

  useEffect(() => {
    if (!selectedBoard) {
      setSelectedNoteId(null);
      return;
    }

    const stillVisible = notes.some((note) => note.id === selectedNoteId && note.boardId === selectedBoard.id);
    if (!stillVisible) {
      setSelectedNoteId(null);
    }
  }, [notes, selectedBoard, selectedNoteId]);

  useEffect(() => {
    setVisibleNoteCount((prev) => {
      if (filteredNotes.length <= INITIAL_VISIBLE_NOTE_COUNT) {
        return filteredNotes.length;
      }

      return Math.max(INITIAL_VISIBLE_NOTE_COUNT, Math.min(prev, filteredNotes.length));
    });
  }, [filteredNotes.length, feedMode, selectedBoard?.id]);

  useEffect(() => {
    if (loading || boardContentLoading || filteredNotes.length <= INITIAL_VISIBLE_NOTE_COUNT) {
      return;
    }

    const targetCount = Math.min(filteredNotes.length, INITIAL_VISIBLE_NOTE_COUNT + VISIBLE_NOTE_BATCH_SIZE);
    if (visibleNoteCount >= targetCount) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setVisibleNoteCount((prev) => Math.max(prev, targetCount));
    }, 180);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [boardContentLoading, filteredNotes.length, loading, selectedBoard?.id, visibleNoteCount]);

  useEffect(() => {
    const onScroll = () => {
      if (visibleNoteCount >= filteredNotes.length) {
        return;
      }

      const threshold = document.documentElement.scrollHeight - 720;
      if (window.innerHeight + window.scrollY < threshold) {
        return;
      }

      setVisibleNoteCount((prev) => Math.min(prev + VISIBLE_NOTE_BATCH_SIZE, filteredNotes.length));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [filteredNotes.length, visibleNoteCount]);

  useEffect(() => {
    const editors = document.querySelectorAll<HTMLTextAreaElement>(".pin-editor");
    editors.forEach((editor) => {
      editor.style.height = "0px";
      editor.style.height = `${editor.scrollHeight}px`;
    });
  }, [visibleNotes, selectedNoteId]);

  const animateRssFeedForNote = async (noteId: string, nextFeed: RssFeedState) => {
    const currentFeed = rssDisplayFeedsRef.current[noteId] ?? null;

    if (!nextFeed) {
      setRssDisplayFeeds((prev) => ({ ...prev, [noteId]: null }));
      setRssFlipStates((prev) => ({ ...prev, [noteId]: null }));
      return;
    }

    if (!currentFeed) {
      setRssDisplayFeeds((prev) => ({ ...prev, [noteId]: nextFeed }));
      setRssFlipStates((prev) => ({ ...prev, [noteId]: null }));
      return;
    }

    const hasAnyChange =
      currentFeed.title !== nextFeed.title ||
      currentFeed.description !== nextFeed.description ||
      currentFeed.link !== nextFeed.link ||
      Math.max(currentFeed.items.length, nextFeed.items.length) > 0 &&
        Array.from({ length: Math.max(currentFeed.items.length, nextFeed.items.length) }).some((_, index) =>
          !isSameRssItem(currentFeed.items[index], nextFeed.items[index])
        );

    if (!hasAnyChange) {
      setRssDisplayFeeds((prev) => ({ ...prev, [noteId]: nextFeed }));
      setRssFlipStates((prev) => ({ ...prev, [noteId]: null }));
      return;
    }

    const token = (rssAnimationTokenRef.current[noteId] ?? 0) + 1;
    rssAnimationTokenRef.current[noteId] = token;
    const limit = Math.min(Math.max(currentFeed.items.length, nextFeed.items.length), 10);

    setRssDisplayFeeds((prev) => ({
      ...prev,
      [noteId]: {
        ...currentFeed,
        title: nextFeed.title,
        description: nextFeed.description,
        link: nextFeed.link
      }
    }));

    for (let index = 0; index < limit; index += 1) {
      const currentItem = currentFeed.items[index];
      const nextItem = nextFeed.items[index];

      if (!nextItem || isSameRssItem(currentItem, nextItem)) {
        continue;
      }

      setRssFlipStates((prev) => ({
        ...prev,
        [noteId]: {
          index,
          nextItem
        }
      }));

      await delay(190);
      if (rssAnimationTokenRef.current[noteId] !== token) {
        return;
      }

      setRssDisplayFeeds((prev) => {
        const base = prev[noteId] ?? currentFeed;
        const nextItems = [...base.items];
        nextItems[index] = nextItem;
        return {
          ...prev,
          [noteId]: {
            ...base,
            items: nextItems
          }
        };
      });

      await delay(210);
      if (rssAnimationTokenRef.current[noteId] !== token) {
        return;
      }

      setRssFlipStates((prev) => ({ ...prev, [noteId]: null }));
      await delay(60);
      if (rssAnimationTokenRef.current[noteId] !== token) {
        return;
      }
    }

    setRssDisplayFeeds((prev) => ({ ...prev, [noteId]: nextFeed }));
    setRssFlipStates((prev) => ({ ...prev, [noteId]: null }));
  };

  useEffect(() => {
    const urls = Array.from(
      new Set(
        visibleNotes.flatMap((note) => {
          const urls = [] as string[];
          if (getWidgetType(note) === "bookmark") {
            getBookmarkUrls(note).forEach((bookmarkUrl) => {
              if (bookmarkUrl && !isImageUrl(bookmarkUrl)) {
                urls.push(bookmarkUrl);
              }
            });
          }
          return urls;
        })
      )
    ).filter((url) => !(url in linkPreviews));

    if (urls.length === 0) {
      return;
    }

    let cancelled = false;

    urls.forEach((url) => {
      void fetchLinkPreview(url)
        .then((preview) => {
          if (cancelled) {
            return;
          }

          setLinkPreviews((prev) => ({ ...prev, [url]: preview }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }

          setLinkPreviews((prev) => ({ ...prev, [url]: null }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [visibleNotes, linkPreviews]);

  useEffect(() => {
    const rssNotes = visibleNotes
      .filter((note) => getWidgetType(note) === "rss" || getWidgetType(note) === "blog")
      .map((note) => ({
        id: note.id,
        url: getWidgetType(note) === "blog" ? getBlogFeedUrl() : getRssFeedUrl(note)
      }))
      .filter((note): note is { id: string; url: string } => Boolean(note.url));

    if (rssNotes.length === 0) {
      return;
    }

    let cancelled = false;

    const refreshFeeds = async () => {
      const grouped = new Map<string, string[]>();
      rssNotes.forEach((note) => {
        const noteIds = grouped.get(note.url) ?? [];
        noteIds.push(note.id);
        grouped.set(note.url, noteIds);
      });

      await Promise.all(
        Array.from(grouped.entries()).map(async ([url, noteIds]) => {
          if (cancelled) {
            return;
          }

          setRssRefreshingIds((prev) => {
            const next = { ...prev };
            noteIds.forEach((noteId) => {
              next[noteId] = true;
            });
            return next;
          });

          try {
            const feed = await fetchRssFeed(url);
            if (cancelled) {
              return;
            }

            setRssFeeds((prev) => ({ ...prev, [url]: feed }));
            await Promise.all(noteIds.map((noteId) => animateRssFeedForNote(noteId, feed)));
          } catch {
            if (!cancelled) {
              setRssFeeds((prev) => ({ ...prev, [url]: null }));
              noteIds.forEach((noteId) => {
                void animateRssFeedForNote(noteId, null);
              });
            }
          } finally {
            if (!cancelled) {
              setRssRefreshingIds((prev) => {
                const next = { ...prev };
                noteIds.forEach((noteId) => {
                  next[noteId] = false;
                });
                return next;
              });
            }
          }
        })
      );
    };

    void refreshFeeds();
    const intervalId = window.setInterval(() => {
      void refreshFeeds();
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [visibleNotes]);

  useEffect(() => {
    const noteIds = visibleNotes
      .filter((note) => getWidgetType(note) === "social")
      .map((note) => note.id)
      .filter((id) => !(id in socialWidgets));

    if (noteIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      noteIds.map(async (noteId) => {
        const note = visibleNotes.find((item) => item.id === noteId);
        if (!note) {
          return;
        }

        try {
          const feed = await fetchSocialFeed(getSocialSource(note));
          if (!cancelled) {
            setSocialWidgets((prev) => ({ ...prev, [noteId]: feed }));
          }
        } catch {
          if (!cancelled) {
            setSocialWidgets((prev) => ({ ...prev, [noteId]: null }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [visibleNotes, socialWidgets]);

  useEffect(() => {
    const noteIds = visibleNotes
      .filter((note) => getWidgetType(note) === "weather")
      .map((note) => note.id)
      .filter((id) => !(id in weatherWidgets));

    if (noteIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      noteIds.map(async (noteId) => {
        const note = visibleNotes.find((item) => item.id === noteId);
        if (!note) {
          return;
        }

        try {
          const weather = await fetchWeatherPreview({
            query: getWeatherQuery(note),
            lat: getWeatherLatitude(note) ?? undefined,
            lon: getWeatherLongitude(note) ?? undefined
          });
          if (!cancelled) {
            setWeatherWidgets((prev) => ({ ...prev, [noteId]: weather }));
          }
        } catch {
          if (!cancelled) {
            setWeatherWidgets((prev) => ({ ...prev, [noteId]: null }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [visibleNotes, weatherWidgets]);

  useEffect(() => {
    const noteIds = visibleNotes
      .filter((note) => getWidgetType(note) === "speed")
      .map((note) => note.id)
      .filter((id) => !(id in speedWidgets));

    if (noteIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      noteIds.map(async (noteId) => {
        const measured = await measureInternetSpeed();
        if (!cancelled) {
          setSpeedWidgets((prev) => ({ ...prev, [noteId]: measured }));
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [speedWidgets, visibleNotes]);

  useEffect(() => {
    const noteIds = visibleNotes
      .filter((note) => getWidgetType(note) === "trending")
      .map((note) => note.id)
      .filter((id) => !(id in trendingWidgets));

    if (noteIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      noteIds.map(async (noteId) => {
        const note = visibleNotes.find((item) => item.id === noteId);
        if (!note) {
          return;
        }

        try {
          const trending = await fetchTrendingKeywords(getTrendingRegion(note));
          if (!cancelled) {
            setTrendingWidgets((prev) => ({ ...prev, [noteId]: trending }));
          }
        } catch {
          if (!cancelled) {
            setTrendingWidgets((prev) => ({ ...prev, [noteId]: null }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [visibleNotes, trendingWidgets]);

  useEffect(() => {
    const noteIds = visibleNotes
      .filter((note) => getWidgetType(note) === "delivery")
      .map((note) => note.id)
      .filter((id) => !(id in deliveryWidgets));

    if (noteIds.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      noteIds.map(async (noteId) => {
        const note = visibleNotes.find((item) => item.id === noteId);
        if (!note) {
          return;
        }

        const trackingNumber = getDeliveryTrackingNumber(note);
        if (!trackingNumber) {
          if (!cancelled) {
            setDeliveryWidgets((prev) => ({ ...prev, [noteId]: null }));
          }
          return;
        }

        try {
          const tracking = await fetchDeliveryTracking(getDeliveryCarrierId(note), trackingNumber);
          if (!cancelled) {
            setDeliveryWidgets((prev) => ({ ...prev, [noteId]: tracking }));
          }
        } catch {
          if (!cancelled) {
            setDeliveryWidgets((prev) => ({ ...prev, [noteId]: null }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [visibleNotes, deliveryWidgets]);

  useEffect(() => {
    if (deliveryCarriers.length > 0) {
      return;
    }

    let cancelled = false;

    void fetchDeliveryCarriers()
      .then((carriers) => {
        if (!cancelled) {
          setDeliveryCarriers(carriers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDeliveryCarriers([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deliveryCarriers.length]);

  useEffect(() => {
    if (!widgetMenuOpen) {
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("touch-action");
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [widgetMenuOpen]);

  useEffect(() => {
    if (!selectedBoard || feedMode !== "active") {
      return;
    }

    const nextCounts = registerBoardVisit(selectedBoard.id);
    setPetVisitCounts(nextCounts);
  }, [selectedBoard?.id, feedMode]);

  const openTemplatePicker = () => {
    setBoardCreationError(null);
    setMobileBoardMenuOpen(false);
    setTemplatePickerOpen(true);
  };

  const addBoard = async (templateKey: BoardTemplateKey = "blank", themeId?: BoardThemeId) => {
    if (activeBoardLimitReached) {
      setBoardCreationError(`현재 ${currentSubscriptionPlan.label} 플랜은 보드를 최대 ${boardLimit}개까지 만들 수 있습니다.`);
      return;
    }

    const title =
      templateKey === "blank"
        ? makeBoardTitle(boards)
        : BOARD_TEMPLATES.find((item) => item.key === templateKey)?.title ?? makeBoardTitle(boards);
    const nextOrder = orderedBoards.length;
    const nextBackgroundStyle = themeId ? getBackgroundStyleForTheme(themeId) : undefined;

    if (templateKey === "blank" && supabase && user?.id) {
      try {
        const board = await createBoardV2(user.id, title);
        setBoards((prev) => [
          {
            ...board,
            backgroundStyle: nextBackgroundStyle ?? board.backgroundStyle,
            settings: {
              ...board.settings,
              sidebarOrder: nextOrder,
              ...(themeId ? { themeId } : {})
            }
          },
          ...prev
        ]);
        setSelectedBoardId(board.id);
        setSelectedNoteId(null);
        setFeedMode("active");
        setTemplatePickerOpen(false);
        setBoardCreationError(null);
        return;
      } catch {
        setBoardCreationError("보드를 만드는 중 문제가 생겼습니다. 잠시 뒤 다시 시도해주세요.");
        return;
      }
    }

    const snapshot =
      templateKey === "blank"
        ? (() => {
            const board = createDefaultBoard(user?.id ?? "local", title);
            board.backgroundStyle = nextBackgroundStyle ?? board.backgroundStyle;
            board.settings = { ...board.settings, sidebarOrder: nextOrder, ...(themeId ? { themeId } : {}) };
            return { board, notes: [] as NoteV2[] };
          })()
        : createTemplateBoardSnapshot(user?.id ?? "local", templateKey, nextOrder, getColumnCount());

    setBoards((prev) => [snapshot.board, ...prev]);
    if (snapshot.notes.length > 0) {
      setNotes((prev) => [...snapshot.notes, ...prev]);
    }
    setSelectedBoardId(snapshot.board.id);
    setSelectedNoteId(null);
    setFeedMode("active");
    setTemplatePickerOpen(false);
    setBoardCreationError(null);
  };

  const duplicateSelectedBoard = () => {
    if (!selectedBoard) {
      return;
    }

    if (activeBoardLimitReached) {
      setBoardCreationError(`현재 ${currentSubscriptionPlan.label} 플랜은 보드를 최대 ${boardLimit}개까지 만들 수 있습니다.`);
      setTemplatePickerOpen(true);
      return;
    }

    const nextOrder = orderedBoards.length;
    const timestamp = nowIso();
    const duplicatedBoardId = makeId();
    const duplicateTitle = `${selectedBoard.title} 복사본`;
    const boardNotes = notes
      .filter((note) => note.boardId === selectedBoard.id && !note.archived && !isNoteTrashed(note))
      .sort((left, right) => left.zIndex - right.zIndex);

    const duplicatedBoard: BoardV2 = {
      ...selectedBoard,
      id: duplicatedBoardId,
      userId: user?.id ?? selectedBoard.userId,
      title: duplicateTitle,
      settings: sanitizeDuplicatedBoardSettings(selectedBoard.settings ?? {}, nextOrder),
      updatedAt: timestamp
    };

    const duplicatedNotes = boardNotes.map((note, index) => ({
      ...cloneNoteForHistory(note),
      id: makeId(),
      boardId: duplicatedBoardId,
      userId: user?.id ?? selectedBoard.userId,
      archived: false,
      zIndex: index + 1,
      metadata: clearTrashedAt({ ...(note.metadata ?? {}) }),
      updatedAt: timestamp
    }));

    setBoards((prev) => [duplicatedBoard, ...prev]);
    if (duplicatedNotes.length > 0) {
      setNotes((prev) => [...duplicatedNotes, ...prev]);
    }
    setSelectedBoardId(duplicatedBoardId);
    setSelectedNoteId(null);
    setFeedMode("active");
    setSettingsOpen(false);
  };

  const restoreBoard = (boardId: string) => {
    setBoards((prev) =>
      prev.map((board) =>
        board.id === boardId
          ? {
              ...board,
              settings: clearTrashedAt(board.settings),
              updatedAt: nowIso()
            }
          : board
      )
    );
    setSelectedBoardId(boardId);
    setFeedMode("active");
    setSettingsOpen(false);
  };

  const archiveSelectedBoard = () => {
    if (!selectedBoard || !isBoardOwner) {
      return;
    }

    const confirmed = window.confirm("보드는 30일동안 보관되며 복구가 불가능합니다. 정말 삭제하시겠습니까?");
    if (!confirmed) {
      return;
    }

    const trashAt = nowIso();
    const remainingBoards = activeBoards.filter((board) => board.id !== selectedBoard.id);
    const fallbackBoardId = remainingBoards[0]?.id ?? null;

    setBoards((prev) =>
      prev.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              updatedAt: trashAt,
              settings: {
                ...board.settings,
                trashedAt: trashAt
              }
            }
          : board
      )
    );
    setSelectedBoardId(fallbackBoardId);
    setSelectedNoteId(null);
    setSettingsSection("trash");
  };

  const navigateToPublicLanding = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.pushState({}, "", "/landing");
    setHomeBoardRoute(false);
    setPublicLandingRoute(true);
    setMarketRoute(false);
    setInsightRoute(false);
    setUpdatesIndexRoute(false);
    setUpdateSlugRoute(null);
    setSharedBoardSlug(null);
    setSharedBoardReadOnly(false);
    setSelectedNoteId(null);
    setMobileBoardMenuOpen(false);
  };

  const navigateToWorkspace = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.pushState({}, "", "/#");
    setHomeBoardRoute(false);
    setPublicLandingRoute(false);
    setMarketRoute(false);
    setInsightRoute(false);
    setUpdatesIndexRoute(false);
    setUpdateSlugRoute(null);
    setSharedBoardSlug(null);
    setSharedBoardReadOnly(false);
    setSelectedNoteId(null);
    setMobileBoardMenuOpen(false);
  };

  const navigateToUpdates = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.history.pushState({}, "", "/updates");
    setHomeBoardRoute(false);
    setPublicLandingRoute(false);
    setMarketRoute(false);
    setInsightRoute(false);
    setUpdatesIndexRoute(true);
    setUpdateSlugRoute(null);
    setSharedBoardSlug(null);
    setSharedBoardReadOnly(false);
    setSelectedNoteId(null);
    setMobileBoardMenuOpen(false);
  };

  useEffect(() => {
    if (!authChecked || !user || !homeBoardRoute || sharedBoardSlug || pendingAuthHash) {
      return;
    }

    navigateToWorkspace();
  }, [authChecked, user, homeBoardRoute, sharedBoardSlug, pendingAuthHash]);

  const insertHomeLandingContent = () => {
    if (!selectedBoard || !isBoardOwner) {
      return;
    }

    const timestamp = nowIso();
    const createdNotes = HOME_LANDING_NOTE_SEEDS.map((seed, index) => {
      const note = createNote({
        boardId: selectedBoard.id,
        userId: user?.id ?? selectedBoard.userId,
        zIndex: index + 1,
        color: seed.color,
        content: seed.content
      });
      note.metadata = {
        ...note.metadata,
        ...(seed.metadata ?? {})
      };
      note.updatedAt = timestamp;
      return note;
    });

    setBoards((prev) =>
      prev.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              backgroundStyle: "paper",
              description: "메모와 위젯을 한눈에 보여주는 WZD 샘플 랜딩 보드",
              settings: {
                ...board.settings,
                layoutStyle: "compact"
              },
              updatedAt: timestamp
            }
          : board
      )
    );
    setNotes((prev) =>
      autoOrganizeBoardNotes(
        [
          ...prev.filter((note) => note.boardId !== selectedBoard.id || note.archived || isNoteTrashed(note)),
          ...createdNotes
        ],
        selectedBoard.id,
        getColumnCount(),
        "balanced"
      )
    );
    setSelectedNoteId(null);
    setVisibleNoteCount((prev) => Math.max(prev, createdNotes.length));
    touchBoard(selectedBoard.id);
    setSettingsOpen(false);
  };

  const setSelectedBoardAsHome = () => {
    if (!selectedBoard || !isBoardOwner) {
      return;
    }

    const timestamp = nowIso();
    setBoards((prev) =>
      prev.map((board) => ({
        ...board,
        settings:
          board.id === selectedBoard.id
            ? {
                ...board.settings,
                homeBoard: true
              }
            : {
                ...board.settings,
                homeBoard: false
              },
        updatedAt: board.id === selectedBoard.id || board.settings?.homeBoard ? timestamp : board.updatedAt
      }))
    );
    touchBoard(selectedBoard.id);
    window.alert("현재 보드를 WZD 홈 보드로 지정했습니다.");
    if (activeNotes.length === 0) {
      insertHomeLandingContent();
    }
  };

  const shareBoard = async () => {
    if (!selectedBoard || isReadOnlyBoardView || !isBoardOwner) {
      return;
    }

    let shareSlug = getBoardShareSlug(selectedBoard);
    const timestamp = nowIso();
    if (!shareSlug) {
      shareSlug = makeShareSlug();

      if (supabase) {
        for (let attempts = 0; attempts < 5; attempts += 1) {
          const taken = await isBoardShareSlugTaken(shareSlug, selectedBoard.id);
          if (!taken) {
            break;
          }
          shareSlug = makeShareSlug();
        }
      }

      if (supabase && user?.id) {
        try {
          await updateBoard(selectedBoard.id, {
            settings: {
              ...selectedBoard.settings,
              sharedSlug: shareSlug
            }
          });
        } catch (error) {
          console.error("Failed to save shared slug", error);
          window.alert("공유 링크를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
          return;
        }
      }
    }

    setBoards((prev) =>
      prev.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              settings: {
                ...board.settings,
                sharedSlug: shareSlug
              },
              updatedAt: timestamp
            }
          : board
      )
    );

    const shareUrl = makeBoardShareUrl(shareSlug);
    try {
      await navigator.clipboard.writeText(shareUrl);
      window.alert(`공유 링크를 복사했습니다.\n${shareUrl}`);
    } catch {
      window.prompt("공유 링크를 복사해 주세요.", shareUrl);
    }
  };

  const refreshBoardMembers = async (boardId: string) => {
    if (!supabase) {
      setBoardMembers([]);
      return;
    }

    const members = await listBoardMembers(boardId);
    setBoardMembers(members);
  };

  const searchInviteCandidates = async (query: string) => {
    if (!supabase || !selectedBoard || !query.trim()) {
      setInviteResults([]);
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    try {
      const results = await searchUserProfiles(query, [
        selectedBoard.userId,
        ...boardMembers.map((member) => member.userId)
      ]);
      setInviteResults(results);
    } catch (error) {
      console.error("Failed to search invite users", error);
      setInviteError("사용자를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setInviteLoading(false);
    }
  };

  const openInvitePanel = async () => {
    if (!selectedBoard || !canInviteBoard) {
      return;
    }

    setInviteOpen(true);
    setInviteQuery("");
    setInviteError(null);
    setInviteResults([]);

    try {
      await refreshBoardMembers(selectedBoard.id);
    } catch (error) {
      console.error("Failed to load board members", error);
      setInviteError("현재 초대 목록을 불러오지 못했습니다.");
    }
  };

  const handleInviteUser = async (profile: BoardUserProfile) => {
    if (!selectedBoard) {
      return;
    }

    setInviteLoading(true);
    setInviteError(null);
    try {
      await inviteBoardMember(selectedBoard.id, profile.userId);
      await refreshBoardMembers(selectedBoard.id);
      setInviteResults((prev) => prev.filter((item) => item.userId !== profile.userId));
      setInviteQuery("");
    } catch (error) {
      console.error("Failed to invite board member", error);
      setInviteError("보드 초대에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setInviteLoading(false);
    }
  };

  const addNote = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      content: DEFAULT_NEW_NOTE_CONTENT
    });

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    if (mobileViewport) {
      pendingMobileNewNoteScrollRef.current = note.id;
    }
  };

  const addRssWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "AI 뉴스"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "rss",
      feedUrl: DEFAULT_RSS_FEED_URL
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addBlogWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "오늘의 트렌드"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "blog",
      feedUrl: BLOG_FEED_URL
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addBrainWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "blue",
      content: "AI 브레인"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "brain",
      brainAgentType: DEFAULT_BRAIN_AGENT_TYPE,
      brainPrompt: DEFAULT_BRAIN_PROMPT,
      brainContext: DEFAULT_BRAIN_CONTEXT,
      brainAnswer: "",
      brainError: ""
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addBookmarkWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "북마크"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "bookmark",
      bookmarkUrl: DEFAULT_BOOKMARK_URL,
      bookmarkUrls: []
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addChecklistWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "TODO"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "checklist",
      checklistItems: DEFAULT_CHECKLIST_ITEMS,
      checklistText: serializeChecklistItems(DEFAULT_CHECKLIST_ITEMS)
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addCountdownWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const target = new Date();
    target.setDate(target.getDate() + 7);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "D-day"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "countdown",
      targetDate: target.toISOString().slice(0, 10),
      countdownDescription: "중요한 일정이나 마감일을 기록해두세요."
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addTimetableWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "시간표"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "timetable",
      timetableText: DEFAULT_TIMETABLE_TEXT
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addPlayerWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "MP3 플레이어"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "player",
      playerArtist: DEFAULT_PLAYER_ARTIST,
      playerUrl: DEFAULT_PLAYER_URL
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addWeatherWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "날씨"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "weather",
      weatherQuery: DEFAULT_WEATHER_QUERY
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addClockWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "시계"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "clock",
      clockMode: DEFAULT_CLOCK_MODE
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addSpeedWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "인터넷 속도"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "speed",
      speedLabel: DEFAULT_SPEED_LABEL
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addCalculatorWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "계산기"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "calculator",
      calculatorDisplay: DEFAULT_CALCULATOR_DISPLAY,
      calculatorStoredValue: null,
      calculatorOperator: null,
      calculatorReplaceOnInput: false
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addProfileWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "내 정보"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "profile",
      profileName: DEFAULT_PROFILE_NAME,
      profileBirthdate: DEFAULT_PROFILE_BIRTHDATE,
      profileOccupation: DEFAULT_PROFILE_OCCUPATION,
      profileImageUrl: DEFAULT_PROFILE_IMAGE_URL
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addTrendingWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "실시간 검색어"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "trending",
      trendingRegion: DEFAULT_TRENDING_REGION
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addDeliveryWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "택배 추적"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "delivery",
      deliveryCarrierId: DEFAULT_DELIVERY_CARRIER,
      deliveryTrackingNumber: "",
      deliveryLabel: "도착 예정 택배"
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addPetWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "방문자 캐릭터"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "pet",
      petName: DEFAULT_PET_NAME
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addCoverWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "보드 커버"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "cover",
      coverSubtitle: DEFAULT_COVER_SUBTITLE
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addDocumentWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "새 섹션"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "document",
      documentVariant: DEFAULT_DOCUMENT_VARIANT,
      documentKicker: DEFAULT_DOCUMENT_KICKER,
      documentBody: DEFAULT_DOCUMENT_BODY,
      documentPrimaryCta: "",
      documentSecondaryCta: "",
      documentPrimaryCtaUrl: "",
      documentSecondaryCtaUrl: ""
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addFocusWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "포커스 타이머"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "focus",
      focusDurationMinutes: DEFAULT_FOCUS_DURATION_MINUTES,
      focusStartedAt: "",
      focusElapsedSeconds: 0
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addMoodWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "오늘의 무드"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "mood",
      moodEmoji: DEFAULT_MOOD_EMOJI,
      moodNote: DEFAULT_MOOD_NOTE,
      moodEnergy: DEFAULT_MOOD_ENERGY
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addRoutineWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "루틴"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "routine",
      routineItems: DEFAULT_ROUTINE_ITEMS,
      routineText: serializeChecklistItems(DEFAULT_ROUTINE_ITEMS)
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addPromptWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "AI 프롬프트"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "prompt",
      promptText: DEFAULT_PROMPT_TEXT
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addSocialWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "white",
      content: "SNS 피드"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "social",
      socialSource: DEFAULT_SOCIAL_SOURCE
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addFoodWidget = () => {
    if (!selectedBoard) {
      return;
    }

    const boardMaxZ = notes
      .filter((note) => note.boardId === selectedBoard.id)
      .reduce((max, note) => Math.max(max, note.zIndex), 0);

    const note = createNote({
      boardId: selectedBoard.id,
      userId: user?.id ?? selectedBoard.userId,
      zIndex: boardMaxZ + 1,
      color: "yellow",
      content: "오늘은 뭐 먹지"
    });

    note.metadata = {
      ...note.metadata,
      widgetType: "food",
      foodRegion: DEFAULT_FOOD_REGION,
      foodSeed: Date.now()
    };

    setNotes((prev) => [note, ...prev]);
    touchBoard(selectedBoard.id);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
    setWidgetMenuOpen(false);
  };

  const addWidgetByType = (type: WidgetType) => {
    const actions: Record<Exclude<WidgetType, "note">, () => void> = {
      brain: addBrainWidget,
      rss: addRssWidget,
      bookmark: addBookmarkWidget,
      checklist: addChecklistWidget,
      countdown: addCountdownWidget,
      timetable: addTimetableWidget,
      player: addPlayerWidget,
      calculator: addCalculatorWidget,
      clock: addClockWidget,
      speed: addSpeedWidget,
      profile: addProfileWidget,
      weather: addWeatherWidget,
      trending: addTrendingWidget,
      delivery: addDeliveryWidget,
      pet: addPetWidget,
      cover: addCoverWidget,
      document: addDocumentWidget,
      focus: addFocusWidget,
      mood: addMoodWidget,
      routine: addRoutineWidget,
      prompt: addPromptWidget,
      social: addSocialWidget,
      food: addFoodWidget,
      blog: addBlogWidget
    };

    if (type === "note") {
      return;
    }

    actions[type]();
  };

  const openWidgetGallery = () => {
    setWidgetGalleryCategory("collect");
    setWidgetMenuOpen(true);
    setMobileBoardMenuOpen(false);
  };

  const activeWidgetGallerySection =
    WIDGET_GALLERY_SECTIONS.find((section) => section.key === widgetGalleryCategory) ?? WIDGET_GALLERY_SECTIONS[0]!;

  const renderWidgetGalleryPreview = (item: WidgetGalleryItemDefinition) => (
    <button
      key={item.type}
      className="widget-gallery-card"
      style={{ "--widget-accent": item.accent } as CSSProperties}
      onClick={() => addWidgetByType(item.type)}
    >
      <div className="widget-gallery-preview">
        <span className="widget-gallery-kicker">{item.kicker}</span>
        <strong>{item.previewTitle}</strong>
        <div className="widget-gallery-preview-lines">
          {item.previewLines.map((line) => (
            <span key={`${item.type}-${line}`}>{line}</span>
          ))}
        </div>
        {item.previewMeta ? <span className="widget-gallery-meta">{item.previewMeta}</span> : null}
      </div>
      <div className="widget-gallery-copy">
        <strong>{item.title}</strong>
        <span>{item.subtitle}</span>
      </div>
    </button>
  );

  const updateBoardLayoutStyle = (boardId: string, layoutStyle: BoardLayoutStyle) => {
    setBoards((prev) =>
      prev.map((board) =>
        board.id === boardId
          ? {
              ...board,
              settings: {
                ...board.settings,
                layoutStyle
              },
              updatedAt: nowIso()
            }
          : board
      )
    );
  };

  const applyBoardLayoutStyle = (layoutStyle: BoardLayoutStyle) => {
    if (!selectedBoard) {
      return;
    }

    updateBoardLayoutStyle(selectedBoard.id, layoutStyle);
    const nextColumnCount = getColumnCount();
    setNotes((prev) => autoOrganizeBoardNotes(prev, selectedBoard.id, nextColumnCount, layoutStyle));
    touchBoard(selectedBoard.id);
  };

  const saveCurrentBoardToHistory = () => {
    if (!selectedBoard) {
      return;
    }

    const timestamp = nowIso();
    const snapshot: BoardHistorySnapshot = {
      id: makeId(),
      createdAt: timestamp,
      label: `${formatHistorySnapshotLabel(timestamp)} 저장본`,
      boardTitle: selectedBoard.title,
      boardDescription: selectedBoard.description,
      backgroundStyle: selectedBoard.backgroundStyle,
      layoutStyle: getBoardLayoutStyle(selectedBoard),
      notes: notes
        .filter((note) => note.boardId === selectedBoard.id && !note.archived && !isNoteTrashed(note))
        .sort((left, right) => left.zIndex - right.zIndex)
        .map(cloneNoteForHistory)
    };

    setBoards((prev) =>
      prev.map((board) => {
        if (board.id !== selectedBoard.id) {
          return board;
        }

        const nextHistory = [snapshot, ...getBoardHistorySnapshots(board)].slice(0, BOARD_HISTORY_LIMIT);
        return {
          ...board,
          settings: {
            ...board.settings,
            historySnapshots: nextHistory
          },
          updatedAt: timestamp
        };
      })
    );
    touchBoard(selectedBoard.id);
  };

  const restoreBoardHistory = (snapshotId: string) => {
    if (!selectedBoard) {
      return;
    }

    const snapshot = boardHistorySnapshots.find((entry) => entry.id === snapshotId);
    if (!snapshot) {
      return;
    }

    const timestamp = nowIso();
    setBoards((prev) =>
      prev.map((board) =>
        board.id === selectedBoard.id
          ? {
              ...board,
              title: snapshot.boardTitle,
              description: snapshot.boardDescription,
              backgroundStyle: snapshot.backgroundStyle,
              settings: {
                ...board.settings,
                layoutStyle: snapshot.layoutStyle,
                historySnapshots: getBoardHistorySnapshots(board)
              },
              updatedAt: timestamp
            }
          : board
      )
    );

    setNotes((prev) => {
      const otherNotes = prev.filter((note) => note.boardId !== selectedBoard.id);
      const boardArchivedNotes = prev.filter((note) => note.boardId === selectedBoard.id && note.archived);
      const restoredNotes = snapshot.notes.map((note, index) => ({
        ...cloneNoteForHistory(note),
        boardId: selectedBoard.id,
        updatedAt: timestamp,
        archived: false,
        zIndex: index + 1,
        metadata: {
          ...note.metadata,
          trashedAt: undefined
        }
      }));

      return [...otherNotes, ...restoredNotes, ...boardArchivedNotes].map((note) => {
        if (note.boardId !== selectedBoard.id) {
          return note;
        }
        const cleanedMetadata =
          note.metadata && typeof note.metadata === "object"
            ? Object.fromEntries(Object.entries(note.metadata).filter(([, value]) => value !== undefined))
            : {};
        return {
          ...note,
          metadata: cleanedMetadata
        };
      });
    });

    setSelectedNoteId(null);
    touchBoard(selectedBoard.id);
  };

  const updateBoardTitle = (boardId: string, title: string) => {
    const nextTitle = clampBoardTitle(title) || "Untitled Board";
    setBoards((prev) =>
      prev.map((board) =>
        board.id === boardId
          ? {
              ...board,
              title: nextTitle,
              updatedAt: nowIso()
            }
          : board
      )
    );
  };

  const commitBoardTitle = () => {
    if (!selectedBoard) {
      setEditingBoardTitle(false);
      return;
    }

    updateBoardTitle(selectedBoard.id, boardTitleDraft);
    setEditingBoardTitle(false);
  };

  const touchBoard = (boardId: string) => {
    const timestamp = nowIso();
    setBoards((prev) =>
      prev.map((board) =>
        board.id === boardId
          ? {
              ...board,
              updatedAt: timestamp
            }
          : board
      )
    );
  };

  const updateNote = (noteId: string, patch: Partial<NoteV2>) => {
    let touchedBoardId: string | null = null;

    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) {
          return note;
        }

        touchedBoardId = note.boardId;
        const normalizedPatch: Partial<NoteV2> = { ...patch };
        if (Object.prototype.hasOwnProperty.call(patch, "content")) {
          normalizedPatch.content = typeof patch.content === "string" ? normalizeUrlsInText(patch.content) : note.content;
        }
        if (Object.prototype.hasOwnProperty.call(patch, "metadata")) {
          normalizedPatch.metadata = patch.metadata ? normalizeBookmarkMetadata(patch.metadata) : note.metadata;
        }
        return {
          ...note,
          ...normalizedPatch,
          updatedAt: nowIso()
        };
      })
    );

    if (touchedBoardId) {
      touchBoard(touchedBoardId);
    }
  };

  const updateChecklistItems = (note: NoteV2, items: ChecklistItem[]) => {
    const normalizedItems = items.map((item) => ({
      text: item.text.trim(),
      checked: Boolean(item.checked)
    }));

    updateNote(note.id, {
      metadata: {
        ...note.metadata,
        widgetType: "checklist",
        checklistItems: normalizedItems,
        checklistText: serializeChecklistItems(normalizedItems)
      }
    });
  };

  const archiveNote = (noteId: string) => {
    const targetNote = notes.find((note) => note.id === noteId);
    if (!targetNote) {
      return;
    }

    if (isDisposableEmptyNote(targetNote)) {
      setNotes((prev) => prev.filter((note) => note.id !== noteId));
      touchBoard(targetNote.boardId);
      setSelectedNoteId((prev) => (prev === noteId ? null : prev));
      return;
    }

    updateNote(noteId, {
      archived: true,
      metadata: {
        ...targetNote.metadata,
        trashedAt: nowIso()
      }
    });
    setSelectedNoteId(null);
  };

  const restoreNote = (noteId: string) => {
    const targetNote = notes.find((note) => note.id === noteId);
    if (!targetNote) {
      return;
    }

    updateNote(noteId, {
      archived: false,
      metadata: clearTrashedAt(targetNote.metadata)
    });
    setFeedMode("active");
    setSelectedNoteId(noteId);
    setSettingsOpen(false);
  };

  const deleteArchivedNote = (noteId: string) => {
    const targetNote = notes.find((note) => note.id === noteId);
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    if (targetNote) {
      touchBoard(targetNote.boardId);
    }
    setSelectedNoteId((prev) => (prev === noteId ? null : prev));
  };

  const cycleNoteColor = (noteId: string, currentColor: NoteColor) => {
    const currentIndex = NOTE_COLORS.findIndex((color) => color === currentColor);
    const nextColor = NOTE_COLORS[(currentIndex + 1) % NOTE_COLORS.length] ?? "yellow";
    updateNote(noteId, { color: nextColor });
  };

  const onPinDragStart = (event: ReactDragEvent<HTMLElement>, noteId: string) => {
    if (feedMode !== "active") {
      return;
    }

    if (isInteractiveElement(event.target)) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", noteId);
    const draggedNote = notes.find((note) => note.id === noteId);
    setRunningDragNoteId(noteId);
    updateDragPreview(noteId, draggedNote ? getNoteColumn(draggedNote, columnCount) : 0);
  };

  const onPinDrop = (event: ReactDragEvent<HTMLElement>, targetNoteId?: string, targetColumn?: number) => {
    if (feedMode !== "active") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const draggedNoteId = event.dataTransfer.getData("text/plain") || runningDragNoteId;
    if (!draggedNoteId || draggedNoteId === targetNoteId) {
      setRunningDragNoteId(null);
      updateDragPreview(null, null);
      return;
    }

    const draggedNote = notes.find((note) => note.id === draggedNoteId);
    const fallbackColumn = draggedNote ? getNoteColumn(draggedNote, columnCount) : 0;
    setNotes((prev) => reorderNotes(prev, draggedNoteId, targetNoteId, targetColumn ?? fallbackColumn, columnCount));
    if (draggedNote) {
      touchBoard(draggedNote.boardId);
    }
    suppressNextCardClickRef.current = true;
    setRunningDragNoteId(null);
    updateDragPreview(null, null);
  };

  const onTrashDrop = (event: ReactDragEvent<HTMLElement>) => {
    if (feedMode !== "active") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const draggedNoteId = event.dataTransfer.getData("text/plain") || runningDragNoteId;
    if (!draggedNoteId) {
      setTrashDropActive(false);
      setRunningDragNoteId(null);
      updateDragPreview(null, null);
      return;
    }

    archiveNote(draggedNoteId);
    suppressNextCardClickRef.current = true;
    setTrashDropActive(false);
    setRunningDragNoteId(null);
    updateDragPreview(null, null);
  };

  const onBoardBackgroundMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    setSelectedNoteId(null);
  };

  const onGoogleLogin = async () => {
    if (!supabase) {
      return;
    }

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin }
    });
  };

  const onLogout = async () => {
    if (!supabase) {
      return;
    }

    setProfileMenuOpen(false);
    await supabase.auth.signOut();
  };

  const openBoardSettings = () => {
    setSettingsSection("menu");
    setSettingsOpen(true);
  };

  const getAdjacentBoard = (direction: "prev" | "next") => {
    if (!selectedBoard || activeBoards.length < 2 || feedMode !== "active") {
      return null;
    }

    const currentIndex = activeBoards.findIndex((board) => board.id === selectedBoard.id);
    if (currentIndex < 0) {
      return null;
    }

    const delta = direction === "next" ? 1 : -1;
    return activeBoards[currentIndex + delta] ?? null;
  };

  const buildBoardPanelData = (board: BoardV2 | null, limit = visibleNoteCount) => {
    if (!board) {
      return {
        notes: [] as NoteV2[],
        columns: groupNotesByColumn([], columnCount),
        totalCount: 0
      };
    }

    const boardBaseNotes = notes
      .filter((note) => note.boardId === board.id)
      .filter((note) => (feedMode === "active" ? !isNoteTrashed(note) : isNoteTrashed(note)))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return a.zIndex - b.zIndex;
      });

    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? boardBaseNotes.filter((note) => asText(note.content).toLowerCase().includes(keyword))
      : boardBaseNotes;

    const limited = filtered.slice(0, limit);

    return {
      notes: limited,
      columns: groupNotesByColumn(limited, columnCount),
      totalCount: filtered.length
    };
  };

  const renderSwipePreviewPanel = (board: BoardV2 | null, side: "prev" | "next") => {
    const panelData = buildBoardPanelData(board, Math.max(visibleNoteCount, INITIAL_VISIBLE_NOTE_COUNT));

    if (!board) {
      return <div className="feed-empty mobile-swipe-empty">더 이상 보드가 없습니다.</div>;
    }

    return (
      <>
        <section className="feed-head">
          <div className="feed-meta">
            <span>{panelData.totalCount}개의 핀</span>
          </div>
        </section>
        <section className="pin-board pin-board-preview" style={{ "--pin-columns": String(columnCount) } as CSSProperties}>
          {panelData.notes.length === 0 ? (
            <div className="feed-empty">{search.trim() ? "검색 결과가 없습니다." : "아직 메모가 없습니다."}</div>
          ) : (
            panelData.columns.map((columnNotes, columnIndex) => (
              <div key={`${side}-column-${columnIndex}`} className="pin-column">
                {columnNotes.map((note) => {
                  const fontSize = getNoteFontSize(note);
                  const widgetType = getWidgetType(note);
                  const isRssWidget = widgetType === "rss";
                  const isBlogWidget = widgetType === "blog";
                  const isBookmarkWidget = widgetType === "bookmark";
                  const isChecklistWidget = widgetType === "checklist";
                  const isCountdownWidget = widgetType === "countdown";
                  const isPlainMemo = !widgetType;
                  const extraWidgetBody = renderExtraWidgetBody(note, false, true);
                  const rssFeedUrl = isRssWidget ? getRssFeedUrl(note) : isBlogWidget ? getBlogFeedUrl() : "";
                  const rssFeed = rssFeedUrl ? rssFeeds[rssFeedUrl] : undefined;
                  const bookmarkUrls = isBookmarkWidget ? getBookmarkUrls(note) : [];
                  const checklistItems = isChecklistWidget ? getChecklistItems(note) : [];
                  const countdownTargetDate = isCountdownWidget ? getCountdownTargetDate(note) : "";
                  const countdownDescription = isCountdownWidget ? getCountdownDescription(note) : "";
                  const attachedImageUrl = isPlainMemo ? "" : getAttachedImageUrl(note);
                  const noteUrl = extractFirstUrl(note.content);
                  const cardImageUrl = !isPlainMemo && (attachedImageUrl || (noteUrl && isImageUrl(noteUrl) ? noteUrl : ""));
                  const previewText = stripUrls(note.content);
                  const hasExternalLink = Boolean(noteUrl && !isImageUrl(noteUrl));
                  const linkPreview = !isPlainMemo && hasExternalLink ? linkPreviews[noteUrl] : undefined;
                  const displayTitle = !isPlainMemo && hasExternalLink
                    ? getLinkDisplayTitle(note.content, noteUrl, linkPreview)
                    : getNoteTitle(note.content);
                  const displayDescription = isPlainMemo
                    ? asText(note.content).trim() || "메모를 클릭해서 편집하세요."
                    : hasExternalLink
                    ? getLinkDisplayDescription(note.content, noteUrl, linkPreview)
                    : previewText || (noteUrl ? getUrlSnippet(noteUrl) : "메모를 클릭해서 편집하세요.");
                  const displaySite = hasExternalLink ? getLinkDisplaySite(linkPreview) : "";
                  const displayHost = hasExternalLink ? getLinkDisplayHost(linkPreview) : "";
                  const isInstagramLink = hasExternalLink && isInstagramLinkPreview(noteUrl ?? "", linkPreview);
                  const keepPreviewImage =
                    !isPlainMemo &&
                    Boolean(linkPreview?.image) &&
                    (!isLinkPreviewDuplicateText(note.content, noteUrl ?? "", linkPreview) ||
                      isInstagramLink ||
                      Boolean(extractYouTubeVideoId(noteUrl ?? "")));

                  return (
                    <article
                      key={`${side}-${note.id}`}
                      className={`pin-card note-${note.color} ${cardImageUrl ? "image-note" : ""} swipe-preview-card`}
                    >
                      <div className="pin-card-head">
                        <span className={`pin-dot chip-${note.color}`} aria-hidden="true" />
                        <div className="pin-actions preview-actions-spacer" aria-hidden="true" />
                      </div>
                      {cardImageUrl && (
                        <div className="pin-image-wrap">
                          <img className="pin-image" src={getImageProxyUrl(cardImageUrl)} alt={getNoteTitle(note.content)} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        </div>
                      )}
                      <div className="pin-card-body">
                        {extraWidgetBody ? (
                          extraWidgetBody
                        ) : isRssWidget ? (
                          <>
                            <div className="widget-header">
                              <span className="widget-badge">RSS</span>
                              <p className="pin-title">{asText(note.content).trim() || "RSS 리더"}</p>
                            </div>
                            <div className="rss-widget-feed">
                              <a className="rss-feed-source" href={rssFeed?.link || rssFeedUrl} target="_blank" rel="noreferrer">
                                {rssFeed?.title || "RSS 피드 열기"}
                              </a>
                            </div>
                          </>
                        ) : isBlogWidget ? (
                          <>
                            <div className="widget-header">
                              <span className="widget-badge blog-badge">트렌드</span>
                              <p className="pin-title">{asText(note.content).trim() || "오늘의 트렌드"}</p>
                            </div>
                            <div className="rss-widget-feed">
                              <a className="rss-feed-source blog-feed-source" href={rssFeed?.link || BLOG_FEED_URL} target="_blank" rel="noreferrer">
                                {rssFeed?.title || "오늘의 트렌드 블로그"}
                              </a>
                            </div>
                          </>
                        ) : isBookmarkWidget ? (
                          <>
                            <div className="widget-header">
                              <span className="widget-badge">LINK</span>
                              <p className="pin-title">{asText(note.content).trim() || "북마크"}</p>
                            </div>
                            <div className="bookmark-list">
                              {bookmarkUrls.length > 0 ? (
                                <span className="link-chip">{bookmarkUrls[0]}</span>
                              ) : (
                                <p className="rss-empty">링크를 추가하면 북마크 카드가 표시됩니다.</p>
                              )}
                            </div>
                          </>
                        ) : isChecklistWidget ? (
                          <>
                            <div className="widget-header">
                              <span className="widget-badge">TODO</span>
                              <p className="pin-title">{asText(note.content).trim() || "TODO"}</p>
                            </div>
                            <div className="checklist-widget-list">
                              {checklistItems.slice(0, 4).map((item, index) => (
                                <div key={`${note.id}-preview-check-${index}`} className="checklist-widget-item">
                                  <input className="checklist-widget-checkbox" type="checkbox" checked={item.checked} readOnly />
                                  <span className="checklist-widget-text">{item.text}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : isCountdownWidget ? (
                          <>
                            <div className="widget-header">
                              <span className="widget-badge">D-DAY</span>
                              <p className="pin-title">{asText(note.content).trim() || "디데이"}</p>
                            </div>
                            <div className="countdown-widget-card">
                              <strong className="countdown-widget-value">{formatCountdownLabel(countdownTargetDate)}</strong>
                              {countdownTargetDate && <span className="countdown-widget-date">{countdownTargetDate}</span>}
                              {countdownDescription && <p className="countdown-widget-description">{countdownDescription}</p>}
                            </div>
                          </>
                        ) : (
                          <div className="pin-note-stack">
                            {!isPlainMemo && <p className="pin-title">{displayTitle}</p>}
                            {!isPlainMemo &&
                              hasExternalLink &&
                              (linkPreview ? (
                                <a
                                  className={`link-preview-card ${keepPreviewImage ? "has-preview-image" : "text-only-link-card"} ${
                                    !keepPreviewImage ? "signature-link-card" : ""
                                  }`}
                                  href={linkPreview.finalUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {keepPreviewImage && (
                                    <img
                                      className="link-preview-image"
                                      src={getImageProxyUrl(linkPreview.image)}
                                      alt={linkPreview.title}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  )}
                                  <span className="link-preview-meta">
                                    <span className="link-preview-site-row">
                                      {linkPreview.favicon && (
                                        <img
                                          className="link-preview-favicon"
                                          src={getImageProxyUrl(linkPreview.favicon)}
                                          alt=""
                                          aria-hidden="true"
                                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                        />
                                      )}
                                      <span className="link-preview-site">{displaySite || linkPreview.hostname}</span>
                                      {displayHost && displayHost !== displaySite && (
                                        <span className="link-preview-host">{displayHost}</span>
                                      )}
                                    </span>
                                    <span className="link-preview-title">{displayTitle}</span>
                                    {displayDescription && (
                                      <span className="link-preview-description">{displayDescription}</span>
                                    )}
                                    <span className="link-preview-url">{getUrlSnippet(noteUrl)}</span>
                                  </span>
                                </a>
                              ) : (
                                <span className="link-chip">{noteUrl}</span>
                              ))}
                            <p className="pin-body-preview" style={{ fontSize: `${fontSize}px` }}>
                              {isPlainMemo ? renderMemoTextWithLinks(note.content) : displayDescription}
                            </p>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ))
          )}
        </section>
      </>
    );
  };

  const animateBoardSwipe = (direction: "prev" | "next") => {
    if (boardSwipeAnimatingRef.current || !mobileViewport) {
      return;
    }

    const nextBoard = getAdjacentBoard(direction);
    if (!nextBoard) {
      setBoardSwipeTransition(true);
      setBoardSwipeOffset(0);
      window.setTimeout(() => setBoardSwipeTransition(false), 220);
      return;
    }

    const viewportWidth = Math.max(window.innerWidth, 320);
    const exitOffset = direction === "next" ? -viewportWidth : viewportWidth;

    boardSwipeAnimatingRef.current = true;
    setBoardSwipeTransition(true);
    setBoardSwipeOffset(exitOffset);

    window.setTimeout(() => {
      setSelectedBoardId(nextBoard.id);
      setSelectedNoteId(null);
      setFeedMode("active");
      setBoardSwipeTransition(false);
      setBoardSwipeOffset(0);
      boardSwipeAnimatingRef.current = false;
    }, 240);
  };

  const openNoteEditor = (note: NoteV2) => {
    setSelectedNoteSnapshot(serializeNoteEditorState(note));
    setSelectedNoteId(note.id);
  };

  const onBoardTouchStart = (event: ReactTouchEvent<HTMLElement>) => {
    if (!mobileViewport || feedMode !== "active" || activeBoards.length < 2 || boardSwipeAnimatingRef.current) {
      boardSwipeStartRef.current.active = false;
      return;
    }

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(
        "button, a, input, textarea, select, label, [contenteditable=\"true\"], .note-card-actions, .widget-menu, .profile-menu-popover"
      )
    ) {
      boardSwipeStartRef.current.active = false;
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      boardSwipeStartRef.current.active = false;
      return;
    }

    boardSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      active: true
    };
    setBoardSwipeTransition(false);
  };

  const onBoardTouchMove = (event: ReactTouchEvent<HTMLElement>) => {
    if (!boardSwipeStartRef.current.active || !mobileViewport || boardSwipeAnimatingRef.current) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - boardSwipeStartRef.current.x;
    const deltaY = touch.clientY - boardSwipeStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 10 || absX <= absY * 1.1) {
      return;
    }

    const direction = deltaX < 0 ? "next" : "prev";
    const hasAdjacentBoard = Boolean(getAdjacentBoard(direction));
    const limitedOffset = hasAdjacentBoard ? deltaX : deltaX * 0.35;
    setBoardSwipeOffset(limitedOffset);

    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const onBoardTouchEnd = (event: ReactTouchEvent<HTMLElement>) => {
    if (!boardSwipeStartRef.current.active || !mobileViewport) {
      return;
    }

    boardSwipeStartRef.current.active = false;
    const touch = event.changedTouches[0];
    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - boardSwipeStartRef.current.x;
    const deltaY = touch.clientY - boardSwipeStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < 72 || absX <= absY * 1.3) {
      setBoardSwipeTransition(true);
      setBoardSwipeOffset(0);
      window.setTimeout(() => setBoardSwipeTransition(false), 220);
      return;
    }

    if (deltaX < 0) {
      animateBoardSwipe("next");
    } else {
      animateBoardSwipe("prev");
    }
  };

  const previousBoard = getAdjacentBoard("prev");
  const nextSwipeBoard = getAdjacentBoard("next");
  // Keep the compact header aligned with the CSS mobile breakpoint.
  // The sidebar can collapse earlier, but the topbar should not switch to
  // the mobile tabs/header layout until the actual mobile layout kicks in.
  const compactHeader = mobileViewport;
  const mobileSwipeEnabled = compactHeader && feedMode === "active" && activeBoards.length > 1;
  const starterTemplateSections = BOARD_TEMPLATE_SECTIONS.map((section) => ({
    ...section,
    templates: section.templateKeys
      .map((key) => BOARD_TEMPLATES.find((template) => template.key === key))
      .filter((template): template is BoardTemplateDefinition => Boolean(template))
  }));
  const boardOwnerLabel = selectedBoard
    ? isBoardOwner
      ? user?.email || "현재 사용자"
      : selectedBoard.userId
    : "";

  const renderTemplateCard = (template: BoardTemplateDefinition, keyPrefix: string) => (
    <button
      key={`${keyPrefix}-${template.key}`}
      className="template-card starter-template-card"
      onClick={() => void addBoard(template.key)}
    >
      <div className={`template-card-preview template-${template.backgroundStyle}`}>
        <span className="template-card-badge">{template.tag}</span>
        <strong>{template.title}</strong>
        <span>{template.subtitle}</span>
      </div>
      <span className="template-card-title">{template.title}</span>
      <span className="template-card-copy">{template.subtitle}</span>
      <span className="template-card-audience">{template.audience}</span>
    </button>
  );

  const renderTemplateSections = (keyPrefix: string, compact = false) => (
    <div className="template-section-list">
      {starterTemplateSections.map((section) => (
        <section className="template-section" key={`${keyPrefix}-${section.key}`}>
          <div className="template-section-head">
            <strong>{section.title}</strong>
            <span>{section.subtitle}</span>
          </div>
          <div className={`starter-template-grid ${compact ? "compact" : ""}`}>
            {section.templates.map((template) => renderTemplateCard(template, `${keyPrefix}-${section.key}`))}
          </div>
        </section>
      ))}
    </div>
  );

  const boardHeading = canRenameBoard && editingBoardTitle ? (
    <input
      className="board-title-input"
      value={boardTitleDraft}
      onChange={(event) => setBoardTitleDraft(event.target.value.slice(0, MAX_BOARD_TITLE_LENGTH))}
      onBlur={commitBoardTitle}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          commitBoardTitle();
        }

        if (event.key === "Escape") {
          setBoardTitleDraft(selectedBoard?.title ?? "");
          setEditingBoardTitle(false);
        }
      }}
      maxLength={MAX_BOARD_TITLE_LENGTH}
      autoFocus
    />
  ) : (
    <h1
      className={canRenameBoard ? "editable-board-title" : undefined}
      onClick={() => {
        if (!canRenameBoard) {
          return;
        }
        setBoardTitleDraft(selectedBoard?.title ?? "");
        setEditingBoardTitle(true);
      }}
    >
      {feedMode === "active" ? selectedBoard?.title ?? "My Board" : "보관 메모"}
    </h1>
  );

  const renderFeedLoadingSkeleton = () => {
    const skeletonColumnCount = compactHeader ? 2 : 4;
    const cardHeights = [180, 240, 160, 280, 200, 150, 260, 190, 220, 170, 250, 210];
    const skeletonCards = Array.from({ length: skeletonColumnCount * 3 }, (_, index) => ({
      id: index,
      height: cardHeights[index % cardHeights.length],
      hasImage: index % 3 === 0,
      hasLines: index % 2 === 0 ? 3 : 2,
      delay: index * 60
    }));

    return (
      <div className="feed-loading-overlay-content">
        <div
          className="feed-loading-skeleton-grid"
          style={{ "--loading-columns": String(skeletonColumnCount) } as CSSProperties}
        >
          {skeletonCards.map((card) => (
            <div
              key={card.id}
              className={`feed-loading-skeleton-card ${card.hasImage ? "image" : ""}`}
              style={{
                minHeight: `${card.height}px`,
                animationDelay: `${card.delay}ms`
              } as CSSProperties}
            >
              {card.hasImage && <span className="skeleton feed-loading-image" />}
              <div className="feed-loading-card-body">
                <span className="skeleton feed-loading-badge" />
                <span className="skeleton feed-loading-line title" />
                {Array.from({ length: card.hasLines }, (_, i) => (
                  <span key={i} className={`skeleton feed-loading-line ${i === card.hasLines - 1 ? "short" : ""}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const currentLanguage = getSiteLanguageOption(siteLanguage);
  const otherLanguages = SITE_LANGUAGE_OPTIONS.filter((option) => option.code !== siteLanguage);
  const languageToggle = (
    <div className={`global-language-menu ${languageMenuOpen ? "open" : ""}`} ref={languageMenuRef}>
      <button
        type="button"
        className="global-language-trigger"
        aria-haspopup="dialog"
        aria-expanded={languageMenuOpen}
        aria-label={siteLanguage === "ko" ? "언어 메뉴 열기" : "Open language menu"}
        onClick={() => setLanguageMenuOpen((prev) => !prev)}
      >
        <span className="global-language-trigger-icon" aria-hidden="true">
          {siteLanguage === "ko" ? "🇰🇷" : "🇺🇸"}
        </span>
        <span className="global-language-trigger-code">{currentLanguage.shortLabel}</span>
        <span className={`global-language-trigger-chevron ${languageMenuOpen ? "open" : ""}`} aria-hidden="true">
          <ChevronDownIcon />
        </span>
      </button>

      {languageMenuOpen && (
        <div className="global-language-popover" role="dialog" aria-label={siteLanguage === "ko" ? "언어 선택" : "Language selector"}>
          <div className="global-language-popover-header">
            <span className="global-language-popover-kicker">{siteLanguage === "ko" ? "현재 언어" : "Current language"}</span>
            <strong className="global-language-popover-current">
              {currentLanguage.nativeLabel}
              {currentLanguage.englishLabel !== currentLanguage.nativeLabel ? ` (${currentLanguage.englishLabel})` : ""}
            </strong>
          </div>

          <div className="global-language-popover-list" role="list">
            <button
              type="button"
              className="global-language-popover-item current"
              onClick={() => setLanguageMenuOpen(false)}
            >
              <span className="global-language-popover-item-copy">
                <strong>{currentLanguage.nativeLabel}</strong>
                <span>{siteLanguage === "ko" ? "현재 사용 중" : "Currently selected"}</span>
              </span>
              <span className="global-language-popover-item-code">{currentLanguage.shortLabel}</span>
            </button>
            {otherLanguages.map((option) => (
              <button
                key={option.code}
                type="button"
                className="global-language-popover-item"
                onClick={() => {
                  setSiteLanguage(option.code);
                  setLanguageMenuOpen(false);
                }}
              >
                <span className="global-language-popover-item-copy">
                  <strong>{option.nativeLabel}</strong>
                  <span>{option.englishLabel}</span>
                </span>
                <span className="global-language-popover-item-code">{option.shortLabel}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (publicLandingRoute && !isSharedView) {
    return (
      <>
        <LandingPage user={user} onOpenWorkspace={navigateToWorkspace} />
        {languageToggle}
      </>
    );
  }

  if (marketRoute && !isSharedView) {
    return (
      <>
        <MarketPage user={user} onNavigateBack={user ? navigateToWorkspace : navigateToPublicLanding} />
        {languageToggle}
      </>
    );
  }

  if (insightRoute && !isSharedView) {
    return (
      <>
        <InsightReaderPage onNavigateBack={navigateToPublicLanding} userId={user?.id ?? null} language={siteLanguage} />
        {languageToggle}
      </>
    );
  }

  if (updatesIndexRoute && !isSharedView) {
    return (
      <>
        <UpdatesIndexPage onNavigateBack={navigateToPublicLanding} language={siteLanguage} />
        {languageToggle}
      </>
    );
  }

  if (updateSlugRoute && !isSharedView) {
    return (
      <>
        <UpdateDetailPage slug={updateSlugRoute} onNavigateBack={navigateToPublicLanding} language={siteLanguage} />
        {languageToggle}
      </>
    );
  }

  if (!user && !isSharedView && waitingForAuthResolution) {
    return (
      <>
        <div className="landing-auth-wait">{siteLanguage === "ko" ? "로그인 상태를 확인하는 중입니다." : "Checking sign-in status."}</div>
        {languageToggle}
      </>
    );
  }

  if (!user && !isSharedView) {
    return (
      <>
        <LandingPage />
        {languageToggle}
      </>
    );
  }

  const showExpandedSidebar = false;
  const CurrentPage = isHomeView ? HomePage : isReadOnlyBoardView ? SharePage : BoardPage;
  const pageModeClassName = isHomeView ? "mode-home" : isReadOnlyBoardView ? "mode-share" : "mode-board";
  const topbarClassName = `pin-topbar ${compactHeader ? "compact-header" : ""} ${
    isReadOnlyBoardView ? "public-topbar" : "workspace-topbar"
  } ${pageModeClassName}-topbar`.trim();
  const mainClassName = `pin-main ${isReadOnlyBoardView ? "public-main" : "workspace-main"} ${pageModeClassName}-main`.trim();
  const boardPanelClassName = isHomeView
    ? "pin-board-panel current-board-panel public-board-panel home-board-panel"
    : isReadOnlyBoardView
      ? "pin-board-panel current-board-panel public-board-panel share-board-panel"
      : `pin-board-panel ${mobileViewport ? "current-board-panel workspace-board-panel" : "workspace-feed-panel"}`;
  const boardClassName = `pin-board ${isReadOnlyBoardView ? "public-board-grid" : "workspace-board-grid"} ${
    isHomeView ? "home-board-grid" : isSharedView ? "share-board-grid" : ""
  }`.trim();
  const showBoardCatCompanion = boardCatEligible;
  const boardThemeClassName = "";
  const issueCatRemoteCommand = (action: CatRemoteAction) => {
    catRemoteCommandIdRef.current += 1;
    setCatRemoteCommand({
      id: catRemoteCommandIdRef.current,
      action
    });
  };

  return (
    <>
    <CurrentPage showExpandedSidebar={showExpandedSidebar} extraClassName={boardThemeClassName}>
      <aside className={`pin-sidebar ${showExpandedSidebar ? "expanded" : ""}`} aria-label="작업공간 기본 탐색">
        <div className="sidebar-primary-stack">
          <button
            className="pin-brand"
            aria-label="WZD 홈으로 이동"
            onClick={navigateToPublicLanding}
          >
            <span className="pin-brand-inner">
              <span className="pin-brand-logo" aria-hidden="true">
                W
              </span>
            </span>
          </button>

          <nav className="sidebar-nav sidebar-nav-utility" aria-label="작업공간 탐색">
            <div className="sidebar-section sidebar-section-workspace">
              <button
                className={`side-icon pinterest-rail-icon ${!publicLandingRoute && !insightRoute && !updatesIndexRoute && !updateSlugRoute ? "active" : ""}`}
                onClick={navigateToWorkspace}
                aria-label="워크스페이스"
                title="워크스페이스"
              >
                <span className="side-icon-glyph" aria-hidden="true">
                  <HomeIcon />
                </span>
                <span className="side-icon-label">홈</span>
              </button>
              <button
                className={`side-icon pinterest-rail-icon has-dot ${updatesIndexRoute || Boolean(updateSlugRoute) ? "active" : ""}`}
                onClick={navigateToUpdates}
                aria-label="알림"
                title="알림"
              >
                <span className="side-icon-glyph" aria-hidden="true">
                  <BellIcon />
                </span>
                <span className="side-icon-label">알림</span>
              </button>
            </div>
          </nav>
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <div className="sidebar-section sidebar-section-language">
            {languageToggle}
          </div>
          <div className="sidebar-section sidebar-section-settings">
            <button
              className={`side-icon subtle settings-icon pinterest-rail-icon ${settingsOpen ? "active" : ""}`}
              onClick={() => {
                if (settingsOpen) {
                  setSettingsOpen(false);
                } else {
                  openBoardSettings();
                }
              }}
              aria-label="설정"
            >
              <span className="side-icon-glyph settings-glyph" aria-hidden="true">
                <SettingsIcon />
              </span>
              <span className="side-icon-label">설정</span>
            </button>
          </div>
          {hasSupabaseConfig && (
            <div className="sidebar-section sidebar-section-auth">
              {user ? (
                <button className="side-icon pinterest-rail-icon sidebar-profile-btn" onClick={onLogout} aria-label="로그아웃" title="로그아웃">
                  <span className="sidebar-avatar" aria-hidden="true">
                    {(user.email || "U").charAt(0).toUpperCase()}
                  </span>
                </button>
              ) : (
                <button className="side-icon pinterest-rail-icon sidebar-login-btn" onClick={onGoogleLogin} aria-label="로그인" title="로그인">
                  <span className="side-icon-glyph" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                  <span className="side-icon-label">로그인</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      <div className={`pin-app ${pageModeClassName}-app`}>
        {showWorkspaceBoardTabs ? (
          <header className={`${topbarClassName} board-tabs-only-topbar ${workspaceTabsHidden ? "is-scroll-hidden" : ""}`.trim()}>
            <div className="workspace-topbar-row">
              <div className="workspace-board-tabs" role="tablist" aria-label="보드 목록" ref={mobileBoardTabsRef}>
                {activeBoards.map((boardItem) => (
                  <button
                    key={`workspace-tab-${boardItem.id}`}
                    role="tab"
                    aria-selected={selectedBoard?.id === boardItem.id}
                    className={`workspace-board-tab ${selectedBoard?.id === boardItem.id ? "active" : ""}`}
                    ref={(node) => {
                      mobileBoardTabRefs.current[boardItem.id] = node;
                    }}
                    onClick={() => {
                      setSelectedBoardId(boardItem.id);
                      setSelectedNoteId(null);
                      setFeedMode("active");
                    }}
                  >
                    <span className="workspace-board-tab-label">{boardItem.title}</span>
                  </button>
                ))}
              </div>
              <div className="workspace-topbar-search">
                <span className="workspace-search-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </span>
                <input
                  className="workspace-search-input"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search notes, boards..."
                />
              </div>
              {!isReadOnlyBoardView && feedMode === "active" && (
                <button
                  type="button"
                  className="workspace-widget-add"
                  onClick={openWidgetGallery}
                  aria-label="위젯 추가"
                  title="위젯 추가"
                >
                  <span className="workspace-widget-add-icon" aria-hidden="true">◫</span>
                  <span className="workspace-widget-add-label">위젯 추가</span>
                </button>
              )}
            </div>
          </header>
        ) : (
          <header className={topbarClassName}>
            <div className="topbar-primary">
              <div className={`topbar-board-title ${isReadOnlyBoardView ? "readonly-board-title" : ""}`}>
                {compactHeader ? (
                  isReadOnlyBoardView ? (
                    <>
                      <div className="mobile-topbar-control-row">
                        <button
                          className="mobile-icon-action mobile-board-toggle"
                          onClick={() => setMobileBoardMenuOpen((prev) => !prev)}
                          aria-label="보드 메뉴"
                        >
                          <span className="mobile-board-toggle-glyph" aria-hidden="true">
                            ≡
                          </span>
                          <span className="mobile-board-toggle-label">보드</span>
                        </button>
                        <div className="mobile-topbar-action-cluster">
                          {hasSupabaseConfig ? (
                            user ? (
                              <div className="profile-menu-wrap" ref={profileMenuRef}>
                                <button
                                  className="mobile-profile-button"
                                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                                  aria-expanded={profileMenuOpen}
                                >
                                  <span className="profile-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
                                </button>
                                {profileMenuOpen && (
                                  <div className="profile-menu-popover">
                                    <button className="profile-menu-item" onClick={() => void onLogout()}>
                                      로그아웃
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <button className="mobile-icon-action mobile-auth-action" onClick={onGoogleLogin}>
                                로그인
                              </button>
                            )
                          ) : (
                            <div className="profile-pill muted mobile-local-mode-pill">로컬 모드</div>
                          )}
                        </div>
                      </div>
                      <div className="mobile-topbar-heading">
                        <p className="feed-kicker">
                          {isHomeView ? "WZD 홈" : isSharedView ? "공유 보드" : feedMode === "active" ? "개인 보드" : "보관 메모"}
                        </p>
                        {boardHeading}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mobile-topbar-board-row">
                        <button
                          className="mobile-icon-action mobile-board-toggle"
                          onClick={() => setMobileBoardMenuOpen((prev) => !prev)}
                          aria-label="보드 메뉴"
                        >
                          <span className="mobile-board-toggle-glyph" aria-hidden="true">
                            ≡
                          </span>
                          <span className="mobile-board-toggle-label">보드</span>
                        </button>
                        <div className="mobile-topbar-board-copy">
                          <p className="feed-kicker">{feedMode === "active" ? "보드 선택" : "보관 메모"}</p>
                          {boardHeading}
                        </div>
                        {hasSupabaseConfig ? (
                          user ? (
                            <div className="profile-menu-wrap" ref={profileMenuRef}>
                              <button
                                className="mobile-profile-button"
                                onClick={() => setProfileMenuOpen((prev) => !prev)}
                                aria-expanded={profileMenuOpen}
                              >
                                <span className="profile-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
                              </button>
                              {profileMenuOpen && (
                                <div className="profile-menu-popover">
                                  <button className="profile-menu-item" onClick={() => void onLogout()}>
                                    로그아웃
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button className="mobile-icon-action mobile-auth-action" onClick={onGoogleLogin}>
                              로그인
                            </button>
                          )
                        ) : (
                          <div className="profile-pill muted mobile-local-mode-pill">로컬 모드</div>
                        )}
                      </div>
                    </>
                  )
                ) : (
                  <>
                    <p className="feed-kicker">
                      {isHomeView ? "WZD 홈" : isSharedView ? "공유 보드" : feedMode === "active" ? "개인 보드" : "보관 메모"}
                    </p>
                    {boardHeading}
                  </>
                )}
                {isReadOnlyBoardView && selectedBoard?.description?.trim() && (
                  <div className="readonly-board-copy">
                    <p className="readonly-board-description">{selectedBoard.description.trim()}</p>
                    <div className="readonly-board-meta">
                      <span>{activeNotes.length}개의 핀</span>
                      <span>읽기 전용 페이지</span>
                    </div>
                  </div>
                )}
              </div>

              <div className={`search-shell ${mobileSearchOpen ? "mobile-open" : ""}`}>
                <span className="search-icon" aria-hidden="true">
                  ⌕
                </span>
                <input
                  ref={searchInputRef}
                  className="search-input pinterest-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={feedMode === "active" ? "내 메모와 링크 검색" : "보관 메모 검색"}
                />
              </div>
            </div>

            {!compactHeader && <div className="topbar-actions">
              {homeBoardRoute && user && (
                <button className="ghost-action" onClick={navigateToWorkspace}>
                  작업공간
                </button>
              )}
              {!compactHeader && !isReadOnlyBoardView && (
                <button className="new-note-pill" onClick={addNote}>
                  새 메모
                </button>
              )}
              {!compactHeader && !isReadOnlyBoardView && (
                <div className="widget-menu-wrap">
                  <button
                    className="widget-pill"
                    onClick={() => {
                      setWidgetGalleryCategory("collect");
                      setWidgetMenuOpen(true);
                    }}
                  >
                    위젯 추가
                  </button>
                </div>
              )}
              {!compactHeader && canBoardSettings && (
                <button className="ghost-action" onClick={openBoardSettings}>
                  보드 설정
                </button>
              )}
              {hasSupabaseConfig ? (
                user ? (
                  <div className="profile-menu-wrap" ref={profileMenuRef}>
                    <button
                      className={compactHeader ? "mobile-profile-button" : "profile-pill profile-pill-expandable"}
                      onClick={() => setProfileMenuOpen((prev) => !prev)}
                      aria-expanded={profileMenuOpen}
                    >
                      <span className="profile-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
                      {!compactHeader && <span className="profile-email">{user.email}</span>}
                    </button>
                    {profileMenuOpen && (
                      <div className="profile-menu-popover">
                        <button className="profile-menu-item" onClick={() => void onLogout()}>
                          로그아웃
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="primary-auth-action" onClick={onGoogleLogin}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    로그인
                  </button>
                )
              ) : (
                <div className="profile-pill muted">로컬 모드</div>
              )}
            </div>}
          </header>
        )}

        {mobileBoardMenuOpen && (
          <div className="mobile-board-sheet">
            <div className="mobile-board-list">
              <div className="mobile-board-actions">
                {homeBoardRoute && user && (
                  <button
                    className="mobile-board-action"
                    onClick={() => {
                      navigateToWorkspace();
                    }}
                  >
                    <span className="mobile-board-action-icon" aria-hidden="true">
                      ↩
                    </span>
                    <span>작업공간</span>
                  </button>
                )}
                {!isReadOnlyBoardView && feedMode === "active" && selectedBoard && (
                  <div className="mobile-board-widget-group">
                <button
                  className={`mobile-board-action ${widgetMenuOpen ? "active" : ""}`}
                  onClick={openWidgetGallery}
                >
                      <span className="mobile-board-action-icon" aria-hidden="true">
                        ◫
                      </span>
                      <span>위젯 추가</span>
                    </button>
                  </div>
                )}
                <button
                  className="mobile-board-action"
                  onClick={() => {
                    openTemplatePicker();
                    setMobileBoardMenuOpen(false);
                  }}
                >
                  <span className="mobile-board-action-icon" aria-hidden="true">
                    +
                  </span>
                  <span>보드 추가</span>
                </button>
                <button
                  className={`mobile-board-action ${settingsOpen ? "active" : ""}`}
                  onClick={() => {
                    openBoardSettings();
                    setMobileBoardMenuOpen(false);
                  }}
                >
                  <span className="mobile-board-action-icon settings-glyph" aria-hidden="true">
                    <SettingsIcon />
                  </span>
                  <span>설정</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {templatePickerOpen && (
          <div className="settings-overlay" onClick={() => setTemplatePickerOpen(false)}>
            <section
              className="settings-panel template-picker-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="settings-panel-head">
                <div>
                  <p className="settings-kicker">새 보드</p>
                  <h2>어떤 방식으로 보드를 만들까요?</h2>
                </div>
                <button
                  className="settings-close"
                  onClick={() => setTemplatePickerOpen(false)}
                  aria-label="템플릿 닫기"
                >
                  ×
                </button>
              </div>

              <div className="template-section-list">
                <section className="template-section">
                  <div className="template-section-head">
                    <strong>플랜 선택</strong>
                    <span>
                      현재 {activeBoards.length} / {boardLimit}개 보드 사용 중 · {currentSubscriptionPlan.label} 플랜
                    </span>
                  </div>
                  <div className="template-plan-grid">
                    {SUBSCRIPTION_PLANS.map((plan) => {
                      const active = subscriptionTier === plan.key;
                      return (
                        <button
                          key={plan.key}
                          className={`template-plan-card ${active ? "active" : ""}`}
                          onClick={() => {
                            setSubscriptionTier(plan.key);
                            setBoardCreationError(null);
                          }}
                        >
                          <span className="template-plan-label">{plan.label}</span>
                          <strong className="template-plan-price">{plan.price}</strong>
                          <span className="template-plan-limit">보드 {plan.boardLimit}개</span>
                          <span className="template-plan-copy">{plan.description}</span>
                        </button>
                      );
                    })}
                    <a className="template-plan-card template-plan-card-contact" href="mailto:hello@wzd.kr?subject=WZD%20Business%20Inquiry">
                      <span className="template-plan-label">Business</span>
                      <strong className="template-plan-price">문의</strong>
                      <span className="template-plan-limit">팀 도입 상담</span>
                      <span className="template-plan-copy">워크스페이스 운영 규모와 사용 방식에 맞춰 별도 플랜을 안내합니다.</span>
                    </a>
                  </div>
                  {boardCreationError ? <p className="template-picker-error">{boardCreationError}</p> : null}
                </section>

                <section className="template-section">
                  <div className="template-section-head">
                    <strong>빈 보드로 시작</strong>
                    <span>가장 빠르게 시작하는 기본 보드입니다. 바로 메모를 쌓고 위젯을 얹을 수 있습니다.</span>
                  </div>
                  <div className="template-picker-grid">
                    {BOARD_TEMPLATES.filter((template) => template.key === "blank").map((template) => (
                      <button
                        key={template.key}
                        className="template-card"
                        onClick={() => void addBoard(template.key)}
                        disabled={activeBoardLimitReached}
                      >
                        <div className={`template-card-preview template-${template.backgroundStyle}`}>
                          <span className="template-card-badge">{template.tag}</span>
                          <strong>{template.title}</strong>
                          <span>{template.subtitle}</span>
                        </div>
                        <span className="template-card-title">{template.title}</span>
                        <span className="template-card-copy">{template.subtitle}</span>
                        <span className="template-card-audience">{template.audience}</span>
                        <div className="template-card-highlights">
                          {template.highlights.map((highlight) => (
                            <span key={`${template.key}-${highlight}`} className="template-card-chip">
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Theme board section removed — using unified clean design */}

                <section className="template-section">
                  <div className="template-section-head">
                    <strong>스타터 보드 템플릿</strong>
                    <span>빈 보드보다 구조가 잡힌 출발점이 필요할 때 바로 참고할 수 있는 샘플입니다.</span>
                  </div>
                  {starterTemplateSections.map((section) => (
                    <div className="template-subsection" key={`picker-${section.key}`}>
                      <div className="template-subsection-head">
                        <strong>{section.title}</strong>
                        <span>{section.subtitle}</span>
                      </div>
                      <div className="template-picker-grid">
                        {section.templates.map((template) => (
                          <button
                            key={`picker-${template.key}`}
                            className="template-card"
                            onClick={() => void addBoard(template.key)}
                            disabled={activeBoardLimitReached}
                          >
                            <div className={`template-card-preview template-${template.backgroundStyle}`}>
                              <span className="template-card-badge">{template.tag}</span>
                              <strong>{template.title}</strong>
                              <span>{template.subtitle}</span>
                            </div>
                            <span className="template-card-title">{template.title}</span>
                            <span className="template-card-copy">{template.subtitle}</span>
                            <span className="template-card-audience">{template.audience}</span>
                            <div className="template-card-highlights">
                              {template.highlights.map((highlight) => (
                                <span key={`${template.key}-${highlight}`} className="template-card-chip">
                                  {highlight}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              </div>
            </section>
          </div>
        )}

        {widgetMenuOpen && (
          <div className="modal-backdrop widget-gallery-backdrop" onClick={() => setWidgetMenuOpen(false)}>
            <section className="widget-modal-large widget-gallery-modal" onClick={(event) => event.stopPropagation()}>
              <div className="modal-header widget-gallery-header">
                <div>
                  <p className="settings-kicker">위젯 갤러리</p>
                  <h2>어떤 위젯을 추가할까요?</h2>
                  <p className="modal-subtitle">위젯 샘플을 보고 지금 보드에 어울리는 카드를 바로 고르세요.</p>
                </div>
                <button className="icon-button" onClick={() => setWidgetMenuOpen(false)} aria-label="위젯 갤러리 닫기">
                  ×
                </button>
              </div>

              <div className="widget-gallery-layout">
                <nav className="widget-gallery-nav" aria-label="위젯 카테고리">
                  {WIDGET_GALLERY_SECTIONS.map((section) => (
                    <button
                      key={section.key}
                      className={`widget-gallery-tab ${widgetGalleryCategory === section.key ? "active" : ""}`}
                      onClick={() => setWidgetGalleryCategory(section.key)}
                    >
                      <strong>{section.title}</strong>
                      <span>{section.subtitle}</span>
                    </button>
                  ))}
                </nav>

                <div className="widget-gallery-panel">
                  <div className="widget-gallery-panel-head">
                    <div>
                      <strong>{activeWidgetGallerySection.title}</strong>
                      <span>{activeWidgetGallerySection.subtitle}</span>
                    </div>
                    <em>{activeWidgetGallerySection.items.length}개 위젯</em>
                  </div>

                  <div className={`widget-gallery-grid widget-gallery-grid-${activeWidgetGallerySection.items.length >= 5 ? "wide" : "regular"}`}>
                    {activeWidgetGallerySection.items.map((item) => renderWidgetGalleryPreview(item))}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {settingsRendered && (
          <div className={`settings-overlay ${settingsClosing ? "is-closing" : "is-open"}`} onClick={() => setSettingsOpen(false)}>
            <section className={`settings-panel ${settingsClosing ? "is-closing" : "is-open"}`} onClick={(event) => event.stopPropagation()}>
              <div className="settings-panel-head">
                <div>
                  <p className="settings-kicker">설정</p>
                  <h2>
                    {settingsSection === "trash" ? "휴지통" : settingsSection === "history" ? "보드 히스토리" : "보드 설정"}
                  </h2>
                </div>
                <div className="settings-head-actions">
                  {settingsSection !== "menu" && (
                    <button className="settings-back" onClick={() => setSettingsSection("menu")}>
                      뒤로
                    </button>
                  )}
                  <button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="설정 닫기">
                    ×
                  </button>
                </div>
              </div>

              {settingsSection === "menu" ? (
                <>
                  <div className="settings-menu-grid">
                    {selectedBoard && (
                      <button className="settings-menu-card" onClick={duplicateSelectedBoard}>
                        <span className="settings-menu-title">보드 복제</span>
                        <span className="settings-menu-meta">현재 보드의 메모와 레이아웃을 새 보드로 복사</span>
                      </button>
                    )}
                    <button className="settings-menu-card" onClick={() => setSettingsSection("history")}>
                      <span className="settings-menu-title">보드 히스토리</span>
                      <span className="settings-menu-meta">
                        저장본 {boardHistorySnapshots.length}개 · 이전 상태로 언제든 복구
                      </span>
                    </button>
                      <button className="settings-menu-card" onClick={() => setSettingsSection("trash")}>
                        <span className="settings-menu-title">휴지통</span>
                        <span className="settings-menu-meta">
                          삭제된 보드 {sortedTrashedBoards.length}개 · 삭제된 메모 {sortedTrashedNotes.length}개
                        </span>
                      </button>
                    {canShareBoard && (
                      <button className="settings-menu-card" onClick={() => void shareBoard()}>
                        <span className="settings-menu-title">보드 공유</span>
                        <span className="settings-menu-meta">현재 보드를 링크로 공유하고 읽기 전용 페이지를 만듭니다.</span>
                      </button>
                    )}
                    {canInviteBoard && (
                      <button
                        className="settings-menu-card"
                        onClick={() => {
                          setSettingsOpen(false);
                          void openInvitePanel();
                        }}
                      >
                        <span className="settings-menu-title">보드 초대</span>
                        <span className="settings-menu-meta">이메일로 편집자를 초대하고 공동 작업 멤버를 관리합니다.</span>
                      </button>
                    )}
                  </div>

                  {selectedBoard && (
                    <>
                      <div className="settings-section">
                        <div className="settings-section-head">
                          <strong>보드 관리</strong>
                        </div>
                        <div className="settings-info-list">
                          <div className="settings-info-item">
                            <span className="settings-info-label">보드 소유자</span>
                            <strong>{boardOwnerLabel}</strong>
                          </div>
                          <div className="settings-info-item">
                            <span className="settings-info-label">편집자</span>
                            <strong>{boardMembers.length}명</strong>
                          </div>
                          <div className="settings-info-item">
                            <span className="settings-info-label">홈 보드</span>
                            <strong>{isHomeBoard(selectedBoard) ? "현재 지정됨" : "일반 보드"}</strong>
                          </div>
                        </div>
                        {isBoardOwner && !isHomeBoard(selectedBoard) && (
                          <button className="ghost-action" onClick={setSelectedBoardAsHome}>
                            홈 보드로 지정
                          </button>
                        )}
                        {isBoardOwner && isHomeBoard(selectedBoard) && activeNotes.length === 0 && (
                          <button className="ghost-action" onClick={insertHomeLandingContent}>
                            랜딩 기본 섹션 넣기
                          </button>
                        )}
                        <div className="invite-member-list compact">
                          {boardMembers.length === 0 ? (
                            <p className="settings-empty">아직 초대된 편집자가 없습니다.</p>
                          ) : (
                            boardMembers.map((member) => (
                              <div className="invite-member-item" key={member.userId}>
                                <div className="invite-user-copy">
                                  <strong>{member.displayName || member.email}</strong>
                                  {member.displayName && <span>{member.email}</span>}
                                </div>
                                <span className="chip-badge">편집 가능</span>
                              </div>
                            ))
                          )}
                        </div>
                        {canShareBoard && (
                          <button className="ghost-action" onClick={() => void shareBoard()}>
                            보드 공유 링크 만들기
                          </button>
                        )}
                        {canInviteBoard && (
                          <button
                            className="ghost-action"
                            onClick={() => {
                              setSettingsOpen(false);
                              void openInvitePanel();
                            }}
                          >
                            편집자 초대 관리
                          </button>
                        )}
                      </div>

                      <div className="settings-section">
                        <div className="settings-section-head">
                          <strong>정리 스타일</strong>
                          <span>자동 정리 결과의 분위기를 보드 성격에 맞게 고를 수 있습니다.</span>
                        </div>
                        <div className="settings-layout-list">
                          {BOARD_LAYOUT_STYLES.map((style) => {
                            const active = getBoardLayoutStyle(selectedBoard) === style.key;
                            return (
                              <button
                                key={style.key}
                                className={`settings-layout-card ${active ? "active" : ""}`}
                                onClick={() => applyBoardLayoutStyle(style.key)}
                              >
                                <span className="settings-layout-title">{style.label}</span>
                                <span className="settings-layout-copy">{style.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {isBoardOwner && (
                        <div className="settings-section">
                          <div className="settings-section-head">
                            <strong>보드 삭제</strong>
                          </div>
                          <p className="settings-empty">
                            보드를 삭제하면 휴지통으로 이동하며 {TRASH_RETENTION_DAYS}일 안에 복구할 수 있습니다.
                          </p>
                          <button
                            className="ghost-action ghost-danger"
                            onClick={() => {
                              archiveSelectedBoard();
                            }}
                          >
                            보드 삭제
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : settingsSection === "history" ? (
                <>
                  <div className="settings-section">
                    <div className="settings-section-head">
                      <strong>현재 상태 저장</strong>
                      <span>중요한 수정 전후로 저장해두면 언제든 이전 모습으로 되돌릴 수 있습니다.</span>
                    </div>
                    <div className="history-actions">
                      <button className="ghost-action" onClick={saveCurrentBoardToHistory} disabled={!selectedBoard}>
                        현재 상태 저장
                      </button>
                    </div>
                  </div>

                  <div className="settings-section">
                    <div className="settings-section-head">
                      <strong>저장된 히스토리</strong>
                      <span>{boardHistorySnapshots.length}개</span>
                    </div>
                    {boardHistorySnapshots.length === 0 ? (
                      <p className="settings-empty">아직 저장된 보드 히스토리가 없습니다.</p>
                    ) : (
                      <div className="history-list">
                        {boardHistorySnapshots.map((snapshot) => (
                          <div className="history-item" key={`history-${snapshot.id}`}>
                            <div className="history-copy">
                              <strong>{snapshot.label}</strong>
                              <span>
                                {snapshot.notes.length}개 메모 · {snapshot.boardTitle}
                              </span>
                            </div>
                            <button className="trash-restore" onClick={() => restoreBoardHistory(snapshot.id)}>
                              복구
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="settings-section">
                    <div className="settings-section-head">
                      <strong>삭제된 보드</strong>
                      <span>{sortedTrashedBoards.length}개</span>
                    </div>
                    {sortedTrashedBoards.length === 0 ? (
                      <p className="settings-empty">30일 안에 복구할 보드가 없습니다.</p>
                    ) : (
                      <div className="trash-list">
                        {sortedTrashedBoards.map((board) => (
                          <div key={`trash-board-${board.id}`} className="trash-item">
                            <div className="trash-copy">
                              <strong>{board.title}</strong>
                              <span>{getBoardTrashedAt(board)?.slice(0, 10)}까지 복구 가능</span>
                            </div>
                            <button className="trash-restore" onClick={() => restoreBoard(board.id)}>
                              복구
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="settings-section">
                    <div className="settings-section-head">
                      <strong>삭제된 메모</strong>
                      <span>{sortedTrashedNotes.length}개</span>
                    </div>
                    {sortedTrashedNotes.length === 0 ? (
                      <p className="settings-empty">30일 안에 복구할 메모가 없습니다.</p>
                    ) : (
                      <div className="trash-list">
                        {sortedTrashedNotes.map((note) => {
                          const noteBoard = boards.find((board) => board.id === note.boardId);
                          return (
                            <div key={`trash-note-${note.id}`} className="trash-item">
                              <div className="trash-copy">
                                <strong>{getNoteTitle(note.content)}</strong>
                                <span>
                                  {noteBoard?.title ?? "알 수 없는 보드"} · {getNoteTrashedAt(note)?.slice(0, 10)}까지 복구 가능
                                </span>
                              </div>
                              <button className="trash-restore" onClick={() => restoreNote(note.id)}>
                                복구
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        )}

        {inviteOpen && selectedBoard && (
          <div className="settings-overlay" onClick={() => setInviteOpen(false)}>
            <section className="settings-panel invite-panel" onClick={(event) => event.stopPropagation()}>
              <div className="settings-panel-head">
                <div>
                  <p className="settings-kicker">협업</p>
                  <h2>보드 초대</h2>
                </div>
                <button className="settings-close" onClick={() => setInviteOpen(false)} aria-label="초대 창 닫기">
                  ×
                </button>
              </div>

              <div className="settings-section invite-search-section">
                <div className="settings-section-head">
                  <strong>{selectedBoard.title}</strong>
                  <span>유저 이메일(아이디)로 검색해 초대하세요.</span>
                </div>
                <div className="invite-search-row">
                  <input
                    className="widget-input invite-input"
                    value={inviteQuery}
                    onChange={(event) => setInviteQuery(event.target.value)}
                    placeholder="유저 이메일 검색"
                  />
                </div>
                {inviteError && <p className="invite-feedback error">{inviteError}</p>}
                {inviteLoading && <p className="invite-feedback">검색 중입니다...</p>}
                {!inviteLoading && inviteQuery.trim() && inviteResults.length === 0 && !inviteError && (
                  <p className="invite-feedback">검색 결과가 없습니다.</p>
                )}
                {inviteResults.length > 0 && (
                  <div className="invite-result-list">
                    {inviteResults.map((profile) => (
                      <div className="invite-result-item" key={profile.userId}>
                        <div className="invite-user-copy">
                          <strong>{profile.displayName || profile.email}</strong>
                          {profile.displayName && <span>{profile.email}</span>}
                        </div>
                        <button className="ghost-action" onClick={() => void handleInviteUser(profile)}>
                          초대
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="settings-section">
                <div className="settings-section-head">
                  <strong>현재 초대된 사용자</strong>
                  <span>{boardMembers.length}명</span>
                </div>
                {boardMembers.length === 0 ? (
                  <p className="settings-empty">아직 초대된 사용자가 없습니다.</p>
                ) : (
                  <div className="invite-member-list">
                    {boardMembers.map((member) => (
                      <div className="invite-member-item" key={member.userId}>
                        <div className="invite-user-copy">
                          <strong>{member.displayName || member.email}</strong>
                          {member.displayName && <span>{member.email}</span>}
                        </div>
                        <span className="chip-badge">편집 가능</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            </div>
          )}

          <main className={mainClassName}>
          <div
            className={`pin-board-stage ${mobileSwipeEnabled ? "mobile-swipe-enabled" : ""} ${boardSwipeTransition ? "swipe-transition" : ""}`}
            style={{ "--board-swipe-offset": `${boardSwipeOffset}px` } as CSSProperties}
            onPointerDownCapture={() => {
              if (!compactSidebar && sidebarPinned) {
                setSidebarPinned(false);
              }
            }}
            onTouchStart={onBoardTouchStart}
            onTouchMove={onBoardTouchMove}
            onTouchEnd={onBoardTouchEnd}
          >
          <div className="pin-board-track">
          <div className="pin-board-panel swipe-preview-panel">{mobileSwipeEnabled ? renderSwipePreviewPanel(previousBoard, "prev") : null}</div>
          <div className={boardPanelClassName}>
            <BoardCatCompanion
              key={`${selectedBoard?.id ?? "none"}-${feedMode}`}
              active={showBoardCatCompanion}
              boardRef={boardGridRef}
              compact={compactHeader}
              mobile={mobileViewport}
              command={catRemoteCommand}
              onActivate={() => setCatRemoteOpen(true)}
            />
            {showBoardCatCompanion && catRemoteOpen ? (
              <div className="cat-remote" role="group" aria-label="캣 리모콘">
                <div className="cat-remote-head">
                  <div className="cat-remote-title">캣 리모콘</div>
                  <button className="cat-remote-close" onClick={() => setCatRemoteOpen(false)} aria-label="캣 리모콘 닫기">
                    ×
                  </button>
                </div>
                <div className="cat-remote-actions">
                  <button className="cat-remote-button" onClick={() => issueCatRemoteCommand("jump-left")}>
                    왼쪽 점프
                </button>
                <button className="cat-remote-button" onClick={() => issueCatRemoteCommand("jump-right")}>
                  오른쪽 점프
                </button>
                <button className="cat-remote-button" onClick={() => issueCatRemoteCommand("sit")}>
                  앉아
                </button>
                <button className="cat-remote-button" onClick={() => issueCatRemoteCommand("look-down")}>
                  아래 보기
                </button>
                <button className="cat-remote-button" onClick={() => issueCatRemoteCommand("blink")}>
                  깜빡
                </button>
                <button className="cat-remote-button" onClick={() => issueCatRemoteCommand("drop")}>
                  떨어져
                </button>
              </div>
            </div>
          ) : null}
          <div className={`feed-stage ${loading || boardContentLoading ? "is-loading" : ""}`} aria-busy={loading || boardContentLoading}>
            {(loading || boardContentLoading) && (
              <div className="feed-loading-overlay" role="status" aria-live="polite">
                {renderFeedLoadingSkeleton()}
              </div>
            )}
          <section
            className={boardClassName}
            ref={boardGridRef}
            style={{ "--pin-columns": String(columnCount) } as CSSProperties}
            onMouseDown={onBoardBackgroundMouseDown}
            onDragOver={(event) => {
              if (feedMode === "active") {
                event.preventDefault();
              }
            }}
            onDrop={(event) => onPinDrop(event, undefined, dragPreviewColumn ?? 0)}
          >
            {!loading && !selectedBoard ? (
              <div className="feed-empty empty-templates full-span">
                <div className="feed-empty-copy">
                  <strong>어떤 보드로 시작할까요?</strong>
                  <span>용도에 맞는 스타터 보드를 고르면 예시 메모와 함께 바로 시작할 수 있어요.</span>
                </div>
                {renderTemplateSections("empty")}
                <button className="ghost-action starter-template-more" onClick={openTemplatePicker}>
                  모든 템플릿 보기
                </button>
              </div>
            ) : visibleNotes.length === 0 && !loading && !boardContentLoading ? (
              feedMode === "active" ? (
                <div className="feed-empty empty-templates full-span">
                  <div className="feed-empty-copy">
                    <strong>{isHomeView ? "WZD 홈을 랜딩페이지처럼 채워볼까요?" : "이 보드를 채워볼까요?"}</strong>
                    <span>
                      {isHomeView
                        ? "문서 섹션 위젯으로 소개, 작업 방식, CTA를 한 번에 구성할 수 있어요."
                        : "새 메모를 바로 추가하거나, 템플릿 보드를 하나 더 만들어서 흐름을 참고할 수 있어요."}
                    </span>
                  </div>
                  <div className="feed-empty-actions">
                    {isHomeView && isBoardOwner ? (
                      <>
                        <button className="new-note-pill" onClick={insertHomeLandingContent}>
                          랜딩 기본 섹션 넣기
                        </button>
                        <button className="ghost-action" onClick={addDocumentWidget}>
                          문서 섹션 추가
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="new-note-pill" onClick={addNote}>
                          새 메모 만들기
                        </button>
                        <button className="ghost-action" onClick={openTemplatePicker}>
                          템플릿 보드 보기
                        </button>
                      </>
                    )}
                  </div>
                  {isHomeView ? null : renderTemplateSections("selected-empty")}
                </div>
              ) : (
                <div className="feed-empty">보관된 메모가 없습니다.</div>
              )
            ) : (
              visibleColumns.map((columnNotes, columnIndex) => (
                <div
                  key={`column-${columnIndex}`}
                  className={`pin-column ${isHomeView ? "landing-flow-column" : ""}`.trim()}
                  onMouseDown={onBoardBackgroundMouseDown}
                  onDragOver={(event) => {
                    if (feedMode === "active") {
                      event.preventDefault();
                      if (event.target === event.currentTarget) {
                        updateDragPreview(null, columnIndex);
                      }
                    }
                  }}
                  onDrop={(event) =>
                    onPinDrop(
                      event,
                      dragPreviewColumn === columnIndex ? dragPreviewNoteId ?? undefined : undefined,
                      columnIndex
                    )
                  }
                >
                  {columnNotes.map((note) => {
                    const selected = selectedNoteId === note.id;
                    const fontSize = getNoteFontSize(note);
                    const widgetType = getWidgetType(note);
                    const isRssWidget = widgetType === "rss";
                    const isBlogWidget = widgetType === "blog";
                    const isRssOrBlog = isRssWidget || isBlogWidget;
                    const isBookmarkWidget = widgetType === "bookmark";
                    const isChecklistWidget = widgetType === "checklist";
                    const isCountdownWidget = widgetType === "countdown";
                    const isPlainMemo = !widgetType;
                    const isWidgetNote = !isPlainMemo;
                    const extraWidgetBody = renderExtraWidgetBody(note, selected, false);
                    const rssFeedUrl = isRssWidget ? getRssFeedUrl(note) : isBlogWidget ? getBlogFeedUrl() : "";
                    const rssFeed = isRssOrBlog ? rssDisplayFeeds[note.id] ?? (rssFeedUrl ? rssFeeds[rssFeedUrl] : undefined) : undefined;
                    const rssFlipState = isRssOrBlog ? rssFlipStates[note.id] : null;
                    const rssRefreshing = isRssOrBlog ? Boolean(rssRefreshingIds[note.id]) : false;
                    const bookmarkUrls = isBookmarkWidget ? getBookmarkUrls(note) : [];
                    const checklistItems = isChecklistWidget ? getChecklistItems(note) : [];
                    const countdownTargetDate = isCountdownWidget ? getCountdownTargetDate(note) : "";
                    const countdownDescription = isCountdownWidget ? getCountdownDescription(note) : "";
                    const attachedImageUrl = isPlainMemo ? "" : getAttachedImageUrl(note);
                    const noteUrl = extractFirstUrl(note.content);
                    const cardImageUrl = !isPlainMemo && (attachedImageUrl || (noteUrl && isImageUrl(noteUrl) ? noteUrl : ""));
                    const previewText = stripUrls(note.content);
                    const hasExternalLink = Boolean(noteUrl && !isImageUrl(noteUrl));
                    const linkPreview = !isPlainMemo && hasExternalLink ? linkPreviews[noteUrl] : undefined;
                    const hasImagePreview = Boolean(cardImageUrl);
                    const hasTextPreview = (isPlainMemo ? asText(note.content) : previewText).trim().length > 0;
                    const hasLinkPreview = hasExternalLink;
                    const isPureLinkNote = !isPlainMemo &&
                      hasExternalLink &&
                      !hasImagePreview &&
                      (!hasTextPreview || isLinkPreviewDuplicateText(note.content, noteUrl, linkPreview));
                    const isDocumentWidget = widgetType === "document";
                    const documentVariant = isDocumentWidget ? getDocumentVariant(note) : null;
                    const selectedWidgetDirty = selected && isWidgetNote && selectedNoteSnapshot !== serializeNoteEditorState(note);
                    const displayTitle = !isPlainMemo && hasExternalLink
                      ? getLinkDisplayTitle(note.content, noteUrl, linkPreview)
                      : getNoteTitle(note.content);
                    const displayDescription = isPlainMemo
                      ? asText(note.content).trim() || "메모를 클릭해서 편집하세요."
                      : hasExternalLink
                      ? getLinkDisplayDescription(note.content, noteUrl, linkPreview)
                      : previewText || (noteUrl ? getUrlSnippet(noteUrl) : "메모를 클릭해서 편집하세요.");
                    const displaySite = hasExternalLink ? getLinkDisplaySite(linkPreview) : "";
                    const displayHost = hasExternalLink ? getLinkDisplayHost(linkPreview) : "";
                    const isInstagramLink = hasExternalLink && isInstagramLinkPreview(noteUrl ?? "", linkPreview);
                    const isAttachedLinkCard = Boolean(attachedImageUrl && hasExternalLink && !selected && !isInstagramLink);
                    const hideHoverMetadata = Boolean(attachedImageUrl && hasExternalLink && !selected && !isInstagramLink && !isAttachedLinkCard);
                    const useImageHeroCard = hasImagePreview && !selected && !isInstagramLink && !isAttachedLinkCard;
                    const isFramedLinkNote = !isPlainMemo && feedMode === "active" && hasExternalLink;
                    const useFramedLinkCard = !isPlainMemo && !selected && hasExternalLink && (isPureLinkNote || isInstagramLink);
                    const keepPreviewImage =
                      !isPlainMemo &&
                      Boolean(linkPreview?.image) &&
                      !attachedImageUrl &&
                      (!isPureLinkNote || isInstagramLink || Boolean(extractYouTubeVideoId(noteUrl ?? "")));
                    const moreClicks = noteMoreState[note.id] ?? 0;
                    const rssVisibleCount = 5 + moreClicks * 5;
                    const bookmarkVisibleCount = 2 + moreClicks * 2;
                    const textNeedsMore =
                      displayDescription.length > 220 || displayDescription.split("\n").filter(Boolean).length > 5;
                    const textExpanded = moreClicks > 0;
                    const showDropPreview =
                      runningDragNoteId !== null &&
                      dragPreviewNoteId === note.id &&
                      dragPreviewColumn === columnIndex &&
                      runningDragNoteId !== note.id;

                    return (
                      <div
                        key={note.id}
                        className={`pin-card-slot ${
                          isHomeView && documentVariant ? `landing-slot landing-slot-${documentVariant}` : ""
                        }`.trim()}
                      >
                        {showDropPreview && <article className="pin-card pin-drop-preview" aria-hidden="true" />}
                        <article
                          ref={(node) => {
                            noteCardRefs.current[note.id] = node;
                          }}
                          data-note-id={note.id}
                          className={`pin-card note-${note.color} ${useImageHeroCard ? "image-note" : ""} ${
                            useFramedLinkCard ? "link-only-note" : ""
                          } ${isAttachedLinkCard ? "stacked-image-note" : ""} ${
                            isAttachedLinkCard ? "has-hover-copy" : ""
                          } ${isDocumentWidget ? "document-note" : ""} ${
                            isDocumentWidget && isHomeView ? "landing-home-note" : ""
                          } ${documentVariant ? `document-${documentVariant}-note` : ""} ${
                            isHomeView && documentVariant ? `landing-home-${documentVariant}-note` : ""
                          } ${
                            !hideHoverMetadata && (hasTextPreview || hasLinkPreview) ? "has-hover-copy" : "image-only"
                          } ${isRssWidget ? "widget-note rss-widget" : ""} ${isBlogWidget ? "widget-note rss-widget blog-widget" : ""} ${selected ? "selected" : ""} ${
                            runningDragNoteId === note.id ? "dragging" : ""
                          }`}
                          draggable={feedMode === "active" && !selected && !isReadOnlyBoardView}
                          onDragStart={(event) => onPinDragStart(event, note.id)}
                          onDragEnd={() => {
                            suppressNextCardClickRef.current = true;
                            setTrashDropActive(false);
                            setRunningDragNoteId(null);
                            updateDragPreview(null, null);
                          }}
                          onDragEnter={() => {
                            if (feedMode === "active" && runningDragNoteId !== note.id) {
                              updateDragPreview(note.id, columnIndex);
                            }
                          }}
                          onDragOver={(event) => {
                            if (feedMode === "active") {
                              event.preventDefault();
                            }
                          }}
                          onDrop={(event) => onPinDrop(event, note.id, columnIndex)}
                          onClick={() => {
                            if (suppressNextCardClickRef.current) {
                              suppressNextCardClickRef.current = false;
                              return;
                            }

                            if (isReadOnlyBoardView) {
                              if (isFramedLinkNote && noteUrl) {
                                window.open(noteUrl, "_blank", "noopener,noreferrer");
                              }
                              return;
                            }

                            openNoteEditor(note);
                          }}
                        >
                          {hasImagePreview && (
                            <div className="pin-image-wrap">
                              <img
                                className="pin-image"
                                src={getImageProxyUrl(cardImageUrl)}
                                alt={getNoteTitle(note.content)}
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </div>
                          )}

                          {useImageHeroCard && (
                            <div className="image-note-caption" aria-hidden="true">
                              <p className="image-note-caption-title">{displayTitle}</p>
                            </div>
                          )}

                          <div className="pin-card-head">
                            <span className={`pin-dot chip-${note.color}`} aria-hidden="true" />
                            {!isReadOnlyBoardView && (
                              <div className="pin-actions">
                                {!isWidgetNote && !useImageHeroCard && !useFramedLinkCard && !isDocumentWidget && (
                                  <button
                                    className={`note-color-toggle chip-${note.color}`}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      cycleNoteColor(note.id, note.color);
                                    }}
                                    aria-label="메모 색상 변경"
                                    title="메모 색상 변경"
                                  />
                                )}
                                {feedMode === "active" && isWidgetNote && selected ? (
                                  <button
                                    className="pin-confirm-button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedNoteSnapshot(serializeNoteEditorState(note));
                                      setSelectedNoteId(null);
                                    }}
                                    aria-label={selectedWidgetDirty ? "위젯 저장" : "편집 확인"}
                                    title={selectedWidgetDirty ? "위젯 저장" : "편집 확인"}
                                  >
                                    {selectedWidgetDirty ? "저장" : "확인"}
                                  </button>
                                ) : (
                                  <button
                                    className="pin-icon-button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (feedMode === "active") {
                                        openNoteEditor(note);
                                      } else {
                                        restoreNote(note.id);
                                      }
                                    }}
                                    aria-label={feedMode === "active" ? "메모 수정" : "메모 복구"}
                                    title={feedMode === "active" ? "메모 수정" : "메모 복구"}
                                  >
                                    <span className="pin-icon-glyph">
                                      <EditIcon />
                                    </span>
                                  </button>
                                )}
                                {!isWidgetNote && (
                                  <button
                                    className="pin-icon-button danger"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (feedMode === "active") {
                                        archiveNote(note.id);
                                      } else {
                                        deleteArchivedNote(note.id);
                                      }
                                    }}
                                    aria-label={feedMode === "active" ? "메모 삭제" : "영구 삭제"}
                                    title={feedMode === "active" ? "메모 삭제" : "영구 삭제"}
                                  >
                                    <span className="pin-icon-glyph">
                                      <TrashIcon />
                                    </span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="pin-card-body">
                            {!isReadOnlyBoardView && isWidgetNote && selected && (
                              <div className="widget-edit-toolbar">
                                <button
                                  className={`note-color-toggle chip-${note.color}`}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    cycleNoteColor(note.id, note.color);
                                  }}
                                  aria-label="위젯 색상 변경"
                                  title="위젯 색상 변경"
                                />
                                <button
                                  className="pin-icon-button danger"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (feedMode === "active") {
                                      archiveNote(note.id);
                                    } else {
                                      deleteArchivedNote(note.id);
                                    }
                                  }}
                                  aria-label={feedMode === "active" ? "위젯 삭제" : "영구 삭제"}
                                  title={feedMode === "active" ? "위젯 삭제" : "영구 삭제"}
                                >
                                  <span className="pin-icon-glyph">
                                    <TrashIcon />
                                  </span>
                                </button>
                              </div>
                            )}
                            {extraWidgetBody ? (
                              extraWidgetBody
                            ) : isRssWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge">RSS</span>
                                  <p className="pin-title">{asText(note.content).trim() || "RSS 리더"}</p>
                                  {!selected && (
                                    <span className={`widget-refresh-indicator ${rssRefreshing ? "spinning" : ""}`} aria-hidden="true">
                                      <ChevronDownIcon />
                                    </span>
                                  )}
                                </div>
                                {selected ? (
                                  <div className="widget-editor-stack">
                                    <input
                                      className="widget-input"
                                      value={rssFeedUrl}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) =>
                                        updateNote(note.id, {
                                          metadata: {
                                            ...note.metadata,
                                            widgetType: "rss",
                                            feedUrl: event.target.value
                                          }
                                        })
                                      }
                                      placeholder="RSS 피드 URL"
                                    />
                                    <button
                                      className="widget-confirm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedNoteId(null);
                                      }}
                                    >
                                      확인
                                    </button>
                                  </div>
                                ) : (
                                  <div className="rss-widget-feed">
                                    <a
                                      className="rss-feed-source"
                                      href={rssFeed?.link || rssFeedUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {rssFeed?.title || "RSS 피드 열기"}
                                    </a>
                                    {rssFeed?.items?.length ? (
                                      <>
                                        {rssFeed.items.slice(0, rssVisibleCount).map((item, index) => {
                                          const isFlipping = rssFlipState?.index === index;
                                          const incomingItem = isFlipping ? rssFlipState.nextItem : item;
                                          return (
                                          <a
                                            key={`${note.id}-${item.link}-${item.title}`}
                                            className={`rss-item ${isFlipping ? "is-flipping" : ""}`}
                                            href={item.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            <span className="rss-item-flip-shell">
                                              <span className="rss-item-flip">
                                                <span className="rss-item-face front">
                                                  <span className="rss-item-title">{item.title}</span>
                                                  {item.pubDate && <span className="rss-item-date">{item.pubDate}</span>}
                                                </span>
                                                <span className="rss-item-face back">
                                                  <span className="rss-item-title">{incomingItem.title}</span>
                                                  {incomingItem.pubDate && <span className="rss-item-date">{incomingItem.pubDate}</span>}
                                                </span>
                                              </span>
                                            </span>
                                          </a>
                                          );
                                        })}
                                        {rssFeed.items.length > rssVisibleCount && (
                                          <button
                                            className="note-more-button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              revealMoreForNote(note.id);
                                            }}
                                          >
                                            <span className="note-more-icon" aria-hidden="true">
                                              ↓
                                            </span>
                                            <span>More</span>
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <p className="rss-empty">RSS 항목을 불러오는 중이거나 피드를 찾을 수 없습니다.</p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : isBlogWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge blog-badge">트렌드</span>
                                  <p className="pin-title">{asText(note.content).trim() || "오늘의 트렌드"}</p>
                                  {!selected && (
                                    <span className={`widget-refresh-indicator ${rssRefreshing ? "spinning" : ""}`} aria-hidden="true">
                                      <ChevronDownIcon />
                                    </span>
                                  )}
                                </div>
                                {selected ? (
                                  <div className="widget-editor-stack">
                                    <input
                                      className="widget-input"
                                      value={note.content}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) => updateNote(note.id, { content: event.target.value })}
                                      placeholder="위젯 제목"
                                    />
                                    <button
                                      className="widget-confirm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedNoteId(null);
                                      }}
                                    >
                                      확인
                                    </button>
                                  </div>
                                ) : (
                                  <div className="rss-widget-feed blog-widget-feed">
                                    <a
                                      className="rss-feed-source blog-feed-source"
                                      href={rssFeed?.link || BLOG_FEED_URL}
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) => event.stopPropagation()}
                                    >
                                      {rssFeed?.title || "오늘의 트렌드 블로그"}
                                    </a>
                                    {rssFeed?.items?.length ? (
                                      <>
                                        {rssFeed.items.slice(0, rssVisibleCount).map((item, index) => {
                                          const isFlipping = rssFlipState?.index === index;
                                          const incomingItem = isFlipping ? rssFlipState.nextItem : item;
                                          return (
                                          <a
                                            key={`${note.id}-blog-${item.link}-${item.title}`}
                                            className={`rss-item blog-item ${isFlipping ? "is-flipping" : ""}`}
                                            href={item.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            <span className="rss-item-flip-shell">
                                              <span className="rss-item-flip">
                                                <span className="rss-item-face front">
                                                  <span className="rss-item-title">{item.title}</span>
                                                  {item.pubDate && <span className="rss-item-date">{item.pubDate}</span>}
                                                </span>
                                                <span className="rss-item-face back">
                                                  <span className="rss-item-title">{incomingItem.title}</span>
                                                  {incomingItem.pubDate && <span className="rss-item-date">{incomingItem.pubDate}</span>}
                                                </span>
                                              </span>
                                            </span>
                                          </a>
                                          );
                                        })}
                                        {rssFeed.items.length > rssVisibleCount && (
                                          <button
                                            className="note-more-button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              revealMoreForNote(note.id);
                                            }}
                                          >
                                            <span className="note-more-icon" aria-hidden="true">
                                              ↓
                                            </span>
                                            <span>More</span>
                                          </button>
                                        )}
                                      </>
                                    ) : (
                                      <p className="rss-empty">트렌드 포스트를 불러오는 중입니다...</p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : isBookmarkWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge">LINK</span>
                                  <p className="pin-title">{asText(note.content).trim() || "북마크"}</p>
                                </div>
                                {selected ? (
                                  <div className="widget-editor-stack">
                                    <input
                                      className="widget-input"
                                      value={note.content}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) => updateNote(note.id, { content: event.target.value })}
                                      placeholder="북마크 제목"
                                    />
                                    <textarea
                                      className="widget-textarea"
                                      value={bookmarkUrls.join("\n")}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) =>
                                        updateNote(note.id, {
                                          metadata: {
                                            ...note.metadata,
                                            widgetType: "bookmark",
                                            bookmarkUrls: event.target.value
                                              .split(/\r?\n/)
                                              .map((value) => value.trim())
                                              .filter(Boolean),
                                            bookmarkUrl:
                                              event.target.value
                                                .split(/\r?\n/)
                                                .map((value) => value.trim())
                                                .find(Boolean) ?? DEFAULT_BOOKMARK_URL
                                          }
                                        })
                                      }
                                      placeholder={"링크를 한 줄에 하나씩 추가해 주세요"}
                                      rows={4}
                                    />
                                    <button
                                      className="widget-confirm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedNoteId(null);
                                      }}
                                    >
                                      확인
                                    </button>
                                  </div>
                                ) : (
                                  <div className="bookmark-list">
                                    {bookmarkUrls.length > 0 ? (
                                      <>
                                      {bookmarkUrls.slice(0, bookmarkVisibleCount).map((url) => {
                                        const preview = linkPreviews[url];
                                        return preview ? (
                                          <a
                                            key={`${note.id}-${url}`}
                                            className="link-preview-card bookmark-widget-card"
                                            href={preview.finalUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            {preview.image && (
                                              <img
                                                className="link-preview-image"
                                                src={getImageProxyUrl(preview.image)}
                                                alt={preview.title}
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                              />
                                            )}
                                            <span className="link-preview-meta">
                                              <span className="link-preview-site">
                                                {preview.siteName || preview.hostname}
                                              </span>
                                              <span className="link-preview-title">{preview.title}</span>
                                              {preview.description && (
                                                <span className="link-preview-description">{preview.description}</span>
                                              )}
                                            </span>
                                          </a>
                                        ) : (
                                          <a
                                            key={`${note.id}-${url}`}
                                            className="link-chip"
                                            href={url}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            {url}
                                          </a>
                                        );
                                      })}
                                      {bookmarkUrls.length > bookmarkVisibleCount && (
                                        <button
                                          className="note-more-button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            revealMoreForNote(note.id);
                                          }}
                                        >
                                          <span className="note-more-icon" aria-hidden="true">
                                            ↓
                                          </span>
                                          <span>More</span>
                                        </button>
                                      )}
                                      </>
                                    ) : (
                                      <p className="rss-empty">링크를 추가하면 북마크 카드가 표시됩니다.</p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : isChecklistWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge">TODO</span>
                                  <p className="pin-title">{asText(note.content).trim() || "TODO"}</p>
                                </div>
                                {selected ? (
                                  <div className="widget-editor-stack">
                                    <input
                                      className="widget-input"
                                      value={note.content}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) => updateNote(note.id, { content: event.target.value })}
                                      placeholder="TODO 제목"
                                    />
                                    <div className="todo-editor-list" onMouseDown={(event) => event.stopPropagation()}>
                                      {checklistItems.map((item, index) => (
                                        <div key={`${note.id}-todo-edit-${index}`} className="todo-editor-item">
                                          <input
                                            className="checklist-widget-checkbox"
                                            type="checkbox"
                                            checked={item.checked}
                                            onChange={(event) =>
                                              updateChecklistItems(
                                                note,
                                                checklistItems.map((entry, entryIndex) =>
                                                  entryIndex === index ? { ...entry, checked: event.target.checked } : entry
                                                )
                                              )
                                            }
                                          />
                                          <input
                                            className="todo-item-input"
                                            value={item.text}
                                            onChange={(event) =>
                                              updateChecklistItems(
                                                note,
                                                checklistItems.map((entry, entryIndex) =>
                                                  entryIndex === index ? { ...entry, text: event.target.value } : entry
                                                )
                                              )
                                            }
                                            placeholder="할 일을 입력하세요"
                                          />
                                          <button
                                            className="todo-remove-button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              updateChecklistItems(
                                                note,
                                                checklistItems.filter((_, entryIndex) => entryIndex !== index)
                                              );
                                            }}
                                            aria-label="할 일 삭제"
                                            type="button"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        className="todo-add-button"
                                        onClick={(event) => {
                                          event.stopPropagation();
                                          updateChecklistItems(note, [...checklistItems, { text: "", checked: false }]);
                                        }}
                                        type="button"
                                      >
                                        + 할 일 추가
                                      </button>
                                    </div>
                                    <button
                                      className="widget-confirm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedNoteId(null);
                                      }}
                                    >
                                      확인
                                    </button>
                                  </div>
                                ) : (
                                  <div className="checklist-widget-list">
                                    {checklistItems.length > 0 ? (
                                      <>
                                        {checklistItems.slice(0, 4 + moreClicks * 3).map((item, index) => (
                                          <div key={`${note.id}-check-${index}`} className="checklist-widget-item">
                                            <input
                                              className="checklist-widget-checkbox"
                                              type="checkbox"
                                              checked={item.checked}
                                              onChange={(event) => {
                                                event.stopPropagation();
                                                updateChecklistItems(
                                                  note,
                                                  checklistItems.map((entry, entryIndex) =>
                                                    entryIndex === index ? { ...entry, checked: event.target.checked } : entry
                                                  )
                                                );
                                              }}
                                              onClick={(event) => event.stopPropagation()}
                                            />
                                            <span className="checklist-widget-text">{item.text}</span>
                                          </div>
                                        ))}
                                        {checklistItems.length > 4 + moreClicks * 3 && (
                                          <button
                                            className="note-more-button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              revealMoreForNote(note.id);
                                            }}
                                          >
                                            <span className="note-more-icon" aria-hidden="true">
                                              ↓
                                            </span>
                                            <span>More</span>
                                          </button>
                                        )}
                                        <span className="checklist-widget-summary">
                                          완료 {checklistItems.filter((item) => item.checked).length} / {checklistItems.length}
                                        </span>
                                      </>
                                    ) : (
                                      <p className="rss-empty">TODO 항목을 추가해 주세요.</p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : isCountdownWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge">D-DAY</span>
                                  <p className="pin-title">{asText(note.content).trim() || "디데이"}</p>
                                </div>
                                {selected ? (
                                  <div className="widget-editor-stack">
                                    <input
                                      className="widget-input"
                                      value={note.content}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) => updateNote(note.id, { content: event.target.value })}
                                      placeholder="디데이 제목"
                                    />
                                    <input
                                      className="widget-input"
                                      type="date"
                                      value={countdownTargetDate}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) =>
                                        updateNote(note.id, {
                                          metadata: {
                                            ...note.metadata,
                                            widgetType: "countdown",
                                            targetDate: event.target.value
                                          }
                                        })
                                      }
                                    />
                                    <textarea
                                      className="widget-textarea"
                                      value={countdownDescription}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onChange={(event) =>
                                        updateNote(note.id, {
                                          metadata: {
                                            ...note.metadata,
                                            widgetType: "countdown",
                                            targetDate: countdownTargetDate,
                                            countdownDescription: event.target.value
                                          }
                                        })
                                      }
                                      placeholder="중요한 일정이나 마감일 설명"
                                      rows={4}
                                    />
                                    <button
                                      className="widget-confirm"
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setSelectedNoteId(null);
                                      }}
                                    >
                                      확인
                                    </button>
                                  </div>
                                ) : (
                                  <div className="countdown-widget-card">
                                    <strong className="countdown-widget-value">
                                      {formatCountdownLabel(countdownTargetDate)}
                                    </strong>
                                    {countdownTargetDate && (
                                      <span className="countdown-widget-date">{countdownTargetDate}</span>
                                    )}
                                    {countdownDescription && (
                                      <p className="countdown-widget-description">{countdownDescription}</p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="pin-note-stack">
                                {!isPlainMemo &&
                                  !useFramedLinkCard &&
                                  (!useImageHeroCard || (!hideHoverMetadata && (hasTextPreview || hasLinkPreview))) && (
                                  <p className="pin-title">{displayTitle}</p>
                                  )}

                                {selected ? (
                                  <>
                                    <textarea
                                      ref={(node) => {
                                        noteEditorRefs.current[note.id] = node;
                                      }}
                                      className="pin-editor"
                                      value={note.content}
                                      style={{ fontSize: `${fontSize}px` }}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onFocus={() => openNoteEditor(note)}
                                      onChange={(event) => {
                                        updateNote(note.id, { content: event.target.value });
                                        event.currentTarget.style.height = "0px";
                                        event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                                      }}
                                      placeholder="메모를 입력하세요"
                                      rows={1}
                                    />
                                  </>
                                ) : (
                                  <>
                                    {!isPlainMemo &&
                                      hasExternalLink &&
                                      !hideHoverMetadata &&
                                      (linkPreview ? (
                                        <a
                                          className={`link-preview-card ${isInstagramLink ? "instagram-link-card" : ""} ${
                                            keepPreviewImage ? "has-preview-image" : "text-only-link-card"
                                          } ${isPureLinkNote ? "signature-link-card" : ""}`}
                                          href={linkPreview.finalUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {keepPreviewImage && (
                                            <img
                                              className="link-preview-image"
                                              src={getImageProxyUrl(linkPreview.image)}
                                              alt={linkPreview.title}
                                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                            />
                                          )}
                                          <span className="link-preview-meta">
                                            <span className="link-preview-site-row">
                                              {linkPreview.favicon && (
                                                <img
                                                  className="link-preview-favicon"
                                                  src={getImageProxyUrl(linkPreview.favicon)}
                                                  alt=""
                                                  aria-hidden="true"
                                                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                                />
                                              )}
                                              <span className="link-preview-site">
                                                {displaySite || linkPreview.hostname}
                                              </span>
                                              {displayHost && displayHost !== displaySite && (
                                                <span className="link-preview-host">{displayHost}</span>
                                              )}
                                            </span>
                                            {!isInstagramLink && <span className="link-preview-title">{displayTitle}</span>}
                                            {displayDescription && (
                                              <span className="link-preview-description">{displayDescription}</span>
                                            )}
                                            <span className="link-preview-url">{getUrlSnippet(noteUrl)}</span>
                                          </span>
                                        </a>
                                      ) : (
                                        <a
                                          className="link-chip"
                                          href={noteUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {noteUrl}
                                        </a>
                                      ))}
                                    {(isPlainMemo || !isPureLinkNote) &&
                                      (!useImageHeroCard || (!hideHoverMetadata && (hasTextPreview || hasLinkPreview))) && (
                                      <>
                                        <p
                                          className={`pin-body-preview ${textNeedsMore && !textExpanded ? "clamped" : ""}`}
                                          style={{ fontSize: `${fontSize}px` }}
                                        >
                                          {isPlainMemo ? renderMemoTextWithLinks(note.content) : displayDescription}
                                        </p>
                                        {textNeedsMore && !textExpanded && (
                                          <button
                                            className="note-more-button"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              revealMoreForNote(note.id);
                                            }}
                                          >
                                            <span className="note-more-icon" aria-hidden="true">
                                              ↓
                                            </span>
                                            <span>More</span>
                                          </button>
                                        )}
                                      </>
                                      )}
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </article>
                      </div>
                    );
                  })}
                  {runningDragNoteId !== null && dragPreviewNoteId === null && dragPreviewColumn == columnIndex && (
                    <article className="pin-card pin-drop-preview" aria-hidden="true" />
                  )}
                </div>
              ))
            )}
          </section>
          <div className="infinite-scroll-status" aria-live="polite">
            {!loading &&
              (visibleNoteCount < filteredNotes.length
                ? "아래로 스크롤하면 메모가 계속 로드됩니다."
                : `${filteredNotes.length}개의 메모가 모두 표시되었습니다.`)}
          </div>
          </div>
          </div>
          <div className="pin-board-panel swipe-preview-panel">{mobileSwipeEnabled ? renderSwipePreviewPanel(nextSwipeBoard, "next") : null}</div>
          </div>
          </div>
        </main>

        {compactHeader && !isReadOnlyBoardView && (
          <nav className="mobile-bottom-nav-shell" aria-label="작업공간 빠른 메뉴">
            <button
              className={`mobile-bottom-nav-item ${mobileBoardMenuOpen ? "active" : ""}`}
              onClick={() => setMobileBoardMenuOpen((prev) => !prev)}
            >
              <span className="mobile-bottom-nav-icon" aria-hidden="true">
                ≡
              </span>
              <span>보드</span>
            </button>
            {feedMode === "active" && selectedBoard ? (
              <>
                <button className="mobile-bottom-nav-item mobile-bottom-nav-item-primary" onClick={addNote}>
                  <span className="mobile-bottom-nav-icon" aria-hidden="true">
                    +
                  </span>
                  <span>새 메모</span>
                </button>
                <button
                  className={`mobile-bottom-nav-item ${widgetMenuOpen ? "active" : ""}`}
                  onClick={() => {
                    setWidgetGalleryCategory("collect");
                    setWidgetMenuOpen(true);
                    setMobileBoardMenuOpen(false);
                  }}
                >
                  <span className="mobile-bottom-nav-icon" aria-hidden="true">
                    ◫
                  </span>
                  <span>위젯</span>
                </button>
              </>
            ) : null}
            <button
              className={`mobile-bottom-nav-item ${settingsOpen ? "active" : ""}`}
              onClick={() => {
                openBoardSettings();
                setMobileBoardMenuOpen(false);
              }}
            >
              <span className="mobile-bottom-nav-icon settings-glyph" aria-hidden="true">
                <SettingsIcon />
              </span>
              <span>설정</span>
            </button>
          </nav>
        )}

        {!isReadOnlyBoardView && feedMode === "active" && (
          <button
            className={`floating-add-note ${runningDragNoteId ? "lifted" : ""}`}
            onClick={addNote}
            aria-label="새 메모 추가"
            title="새 메모 추가"
          >
            <span className="floating-add-note-plus" aria-hidden="true">+</span>
          </button>
        )}

        {saveStatusAnnouncement && (
          <div className="sr-only" aria-live="polite">
            {saveStatusAnnouncement}
          </div>
        )}

        {feedMode === "active" && runningDragNoteId && (
          <button
            className={`floating-trash ${trashDropActive ? "active" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (!trashDropActive) {
                setTrashDropActive(true);
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setTrashDropActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setTrashDropActive(false);
              }
            }}
            onDrop={onTrashDrop}
            aria-label="휴지통으로 삭제"
            title="휴지통으로 삭제"
          >
            <span className="floating-trash-icon">🗑</span>
            <span className="floating-trash-label">휴지통</span>
          </button>
        )}
      </div>
    </CurrentPage>
    </>
  );
};

export default App;
