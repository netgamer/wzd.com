import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type TouchEvent as ReactTouchEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { fetchLinkPreview, getImageProxyUrl, type LinkPreview } from "./lib/link-preview";
import { fetchRssFeed, type RssFeedPreview } from "./lib/rss";
import {
  type BoardBackgroundStyle,
  type BoardMemberProfile,
  type BoardUserProfile,
  createBoardV2,
  type BoardV2,
  inviteBoardMember,
  isBoardShareSlugTaken,
  listBoardMembers,
  loadBoardsV2,
  loadEditableSharedBoardV2,
  loadSharedBoardV2,
  type NoteColor,
  type NoteV2,
  saveBoardsV2,
  searchUserProfiles,
  syncUserProfile
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

type NoteFontSize = 14 | 16 | 18 | 20;
type FeedMode = "active" | "archived";
type CloudSaveState = "idle" | "saving" | "saved" | "error";
type LinkPreviewState = LinkPreview | null;
type RssFeedState = RssFeedPreview | null;
type WidgetType = "note" | "rss" | "bookmark";
type BoardTemplateKey =
  | "blank"
  | "video"
  | "work"
  | "study"
  | "tips"
  | "homepage"
  | "bookmark"
  | "rss"
  | "frame"
  | "ai-share"
  | "aistudio"
  | "group-chat"
  | "family"
  | "couple";
type BoardTemplateSectionKey = "notes" | "widgets" | "groups";
type BoardLayoutStyle = "balanced" | "compact" | "visual";
type SettingsSection = "menu" | "trash" | "history";

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

type BoardTemplateSection = {
  key: BoardTemplateSectionKey;
  title: string;
  subtitle: string;
  templateKeys: BoardTemplateKey[];
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

const LOCAL_STORAGE_KEY = "wzd-board-v2-local";
const INITIAL_VISIBLE_NOTE_COUNT = 24;
const VISIBLE_NOTE_BATCH_SIZE = 16;
const DEFAULT_FONT_SIZE: NoteFontSize = 16;
const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue", "green", "orange", "purple", "mint", "white"];
const CLOUD_SAVE_DEBOUNCE_MS = 120;
const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const BOARD_HISTORY_LIMIT = 20;
const MOBILE_LAYOUT_BREAKPOINT = 980;
const MOBILE_SINGLE_COLUMN_BREAKPOINT = 680;
const DEFAULT_RSS_FEED_URL = "https://news.google.com/rss/search?q=AI&hl=ko&gl=KR&ceid=KR:ko";
const DEFAULT_BOOKMARK_URL = "https://";
const DEFAULT_NEW_NOTE_CONTENT = "새 메모\n\nhttps://";
const DEFAULT_PERSONAL_NOTE_CONTENT =
  "개인 메모장\n\n간단한 메모, 북마크, 이미지 URL을 모아두는 공간입니다.\nhttps://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80";
const DEFAULT_GROUP_NOTE_CONTENT =
  "그룹 메모장\n\n주제별 보드에서 각자 찾은 링크와 자료를 함께 공유해보세요.\n예: AI Studio 레퍼런스 모음";

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
    highlights: ["작업 메모", "회의 기록", "체크리스트"],
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
    highlights: ["복습 포인트", "자료 링크", "체크리스트"],
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
  }
];

const BOARD_TEMPLATE_SECTIONS: BoardTemplateSection[] = [
  {
    key: "notes",
    title: "메모 보드",
    subtitle: "텍스트와 링크를 빠르게 정리하는 기본형 보드",
    templateKeys: ["video", "work", "study", "tips"]
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

const getBoardBadge = (title: string) => title.trim().slice(0, 1).toUpperCase() || "B";
const getSharedBoardSlugFromLocation = () => {
  if (typeof window === "undefined") {
    return null;
  }

  const match = window.location.pathname.match(/^\/board\/([a-z0-9_-]+)$/i);
  return match?.[1] ?? null;
};
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
  note.metadata?.widgetType === "rss" || note.metadata?.widgetType === "bookmark" ? note.metadata.widgetType : "note";
const getRssFeedUrl = (note: NoteV2) =>
  typeof note.metadata?.feedUrl === "string" && note.metadata.feedUrl.trim()
    ? note.metadata.feedUrl.trim()
    : DEFAULT_RSS_FEED_URL;
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
  if (widgetType === "rss") return 0;
  if (widgetType === "bookmark") return 1;
  if (getAttachedImageUrl(note)) return 2;

  const noteUrl = extractFirstUrl(note.content);
  if (noteUrl && isImageUrl(noteUrl)) return 2;
  if (noteUrl) return 3;

  return 4;
};

type AutoLayoutCategory = "rss" | "bookmark" | "image" | "link" | "text";

const BOARD_LAYOUT_STYLES: Array<{
  key: BoardLayoutStyle;
  label: string;
  description: string;
}> = [
  { key: "balanced", label: "균형형", description: "카드 종류를 적당히 섞어 균형 있게 배치합니다." },
  { key: "compact", label: "콤팩트형", description: "여백을 줄이고 촘촘하게 정리합니다." },
  { key: "visual", label: "시각형", description: "이미지와 링크 카드가 더 잘 보이도록 정리합니다." }
];

const isBoardLayoutStyle = (value: unknown): value is BoardLayoutStyle =>
  value === "balanced" || value === "compact" || value === "visual";

const getBoardLayoutStyle = (board: BoardV2 | null | undefined): BoardLayoutStyle => {
  const value = board?.settings?.layoutStyle;
  return isBoardLayoutStyle(value) ? value : "balanced";
};

const getAutoLayoutCategory = (note: NoteV2): AutoLayoutCategory => {
  const widgetType = getWidgetType(note);
  if (widgetType === "rss") return "rss";
  if (widgetType === "bookmark") return "bookmark";

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

const getPreferredColumns = (
  note: NoteV2,
  totalColumns: number,
  columnHeights: number[],
  layoutStyle: BoardLayoutStyle
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

  switch (category) {
    case "image":
      return layoutStyle === "visual"
        ? [0, 1, ...allColumns.filter((index) => index > 1)]
        : [0, ...allColumns.filter((index) => index !== 0)];
    case "link": {
      const middle = Math.min(1, totalColumns - 1);
      return layoutStyle === "visual"
        ? [middle, 0, ...allColumns.filter((index) => index !== middle && index !== 0)]
        : [middle, ...allColumns.filter((index) => index !== middle)];
    }
    case "text": {
      const middle = Math.floor((totalColumns - 1) / 2);
      return [middle, ...allColumns.filter((index) => index !== middle)];
    }
    case "bookmark":
    case "rss":
      return [...allColumns].reverse();
    default:
      return allColumns;
  }
};

const estimateNoteVisualHeight = (note: NoteV2, layoutStyle: BoardLayoutStyle) => {
  const widgetType = getWidgetType(note);
  if (widgetType === "rss") return layoutStyle === "compact" ? 270 : 300;
  if (widgetType === "bookmark") return layoutStyle === "compact" ? 230 : 260;

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
    const preferredColumns = getPreferredColumns(note, columns.length, columnHeights, layoutStyle);
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
  const [user, setUser] = useState<AuthUserProfile | null>(null);
  const [boards, setBoards] = useState<BoardV2[]>(() => createDefaultSnapshot().boards);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => createDefaultSnapshot().selectedBoardId);
  const [boardTitleDraft, setBoardTitleDraft] = useState("");
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [notes, setNotes] = useState<NoteV2[]>(() => createDefaultSnapshot().notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningDragNoteId, setRunningDragNoteId] = useState<string | null>(null);
  const [dragPreviewNoteId, setDragPreviewNoteId] = useState<string | null>(null);
  const [dragPreviewColumn, setDragPreviewColumn] = useState<number | null>(null);
  const [visibleNoteCount, setVisibleNoteCount] = useState(INITIAL_VISIBLE_NOTE_COUNT);
  const [feedMode, setFeedMode] = useState<FeedMode>("active");
  const [cloudSaveState, setCloudSaveState] = useState<CloudSaveState>("idle");
  const [columnCount, setColumnCount] = useState(() => getColumnCount());
  const [linkPreviews, setLinkPreviews] = useState<Record<string, LinkPreviewState>>({});
  const [rssFeeds, setRssFeeds] = useState<Record<string, RssFeedState>>({});
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 1180 : false
  );
  const [mobileViewport, setMobileViewport] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_LAYOUT_BREAKPOINT : false
  );
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileBoardMenuOpen, setMobileBoardMenuOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [widgetMenuOpen, setWidgetMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [draggingBoardId, setDraggingBoardId] = useState<string | null>(null);
  const [dragPreviewBoardId, setDragPreviewBoardId] = useState<string | null>(null);
  const [dragArmedBoardId, setDragArmedBoardId] = useState<string | null>(null);
  const [editorDropNoteId, setEditorDropNoteId] = useState<string | null>(null);
  const [noteMoreState, setNoteMoreState] = useState<Record<string, number>>({});
  const [sharedBoardSlug, setSharedBoardSlug] = useState<string | null>(() => getSharedBoardSlugFromLocation());
  const [sharedBoardReadOnly, setSharedBoardReadOnly] = useState<boolean>(() => Boolean(getSharedBoardSlugFromLocation()));

  const skipNextCloudSaveRef = useRef(false);
  const suppressNextCardClickRef = useRef(false);
  const latestBoardsRef = useRef<BoardV2[]>(boards);
  const latestNotesRef = useRef<NoteV2[]>(notes);
  const latestUserIdRef = useRef<string | null>(user?.id ?? null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const saveStateResetTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const boardLongPressTimerRef = useRef<number | null>(null);
  const boardSwipeStartRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false
  });
  const boardSwipeAnimatingRef = useRef(false);

  const orderedBoards = useMemo(() => sortBoards(boards), [boards]);
  const activeBoards = useMemo(() => orderedBoards.filter((board) => !isBoardTrashed(board)), [orderedBoards]);
  const trashedBoards = useMemo(() => orderedBoards.filter((board) => isBoardTrashed(board)), [orderedBoards]);
  const isSharedView = Boolean(sharedBoardSlug && sharedBoardReadOnly);
  const selectedBoard = useMemo(
    () => activeBoards.find((board) => board.id === selectedBoardId) ?? activeBoards[0] ?? null,
    [activeBoards, selectedBoardId]
  );
  const isBoardOwner = Boolean(user?.id && selectedBoard && selectedBoard.userId === user.id);
  const canShareBoard = feedMode === "active" && Boolean(selectedBoard) && !isSharedView && isBoardOwner;
  const canInviteBoard = canShareBoard;
  const canBoardSettings = canShareBoard;
  const canRenameBoard = feedMode === "active" && Boolean(selectedBoard) && !isSharedView && isBoardOwner;
  const boardHistorySnapshots = useMemo(() => getBoardHistorySnapshots(selectedBoard), [selectedBoard]);

  useEffect(() => {
    latestBoardsRef.current = boards;
  }, [boards]);

  useEffect(() => {
    latestNotesRef.current = notes;
  }, [notes]);

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
    const onResize = () => {
      setColumnCount(getColumnCount());
      setCompactSidebar(window.innerWidth < 1180);
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
      const nextSlug = getSharedBoardSlugFromLocation();
      setSharedBoardSlug(nextSlug);
      setSharedBoardReadOnly(Boolean(nextSlug));
    };
    window.addEventListener("popstate", syncSharedSlug);
    return () => {
      window.removeEventListener("popstate", syncSharedSlug);
    };
  }, []);

  useEffect(() => {
    if (compactSidebar && sidebarExpanded) {
      setSidebarExpanded(false);
    }
  }, [compactSidebar, sidebarExpanded]);

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
    setCloudSaveState("saved");

    if (saveStateResetTimerRef.current) {
      window.clearTimeout(saveStateResetTimerRef.current);
    }

    saveStateResetTimerRef.current = window.setTimeout(() => {
      setCloudSaveState("idle");
      saveStateResetTimerRef.current = null;
    }, 2200);
  };

  const updateDragPreview = (noteId: string | null, column: number | null) => {
    setDragPreviewNoteId((prev) => (prev === noteId ? prev : noteId));
    setDragPreviewColumn((prev) => (prev === column ? prev : column));
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
  const visibleColumns = useMemo(
    () => groupNotesByColumn(visibleNotes, columnCount),
    [visibleNotes, columnCount]
  );

  useEffect(() => {
    if (!supabase) {
      const local = loadLocalSnapshot();
      setBoards(local.boards);
      setNotes(local.notes);
      setSelectedBoardId(local.selectedBoardId ?? local.boards[0]?.id ?? null);
      setLoading(false);
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

    if (sharedBoardSlug) {
      if (!supabase) {
        setBoards([]);
        setNotes([]);
        setSelectedBoardId(null);
        setLoading(false);
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
            setSelectedBoardId(null);
            setSelectedNoteId(null);
            setLoading(false);
            return;
          }

          setSharedBoardReadOnly(readOnly);
          setBoards([payload.board]);
          setNotes(sanitizeNotes(payload.notes));
          setSelectedBoardId(payload.board.id);
          setSelectedNoteId(null);
          setFeedMode("active");
          setLoading(false);
        })
        .catch(() => {
          if (active) {
            setSharedBoardReadOnly(true);
            setBoards([]);
            setNotes([]);
            setSelectedBoardId(null);
            setSelectedNoteId(null);
            setLoading(false);
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
      setSelectedBoardId(local.selectedBoardId ?? local.boards[0]?.id ?? null);
      setLoading(false);
      return;
    }

    setLoading(true);

    loadBoardsV2(user.id)
      .then(async (payload) => {
        if (!active) {
          return;
        }

        const merged = await mergeLocalSnapshotToCloud(user.id, payload.boards, payload.notes);
        if (!active) {
          return;
        }

        skipNextCloudSaveRef.current = true;
        setBoards(merged.boards);
        setNotes(sanitizeNotes(merged.notes));
        setSelectedBoardId(merged.selectedBoardId);
        setSelectedNoteId(null);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [user?.id, sharedBoardSlug]);

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
    if (!inviteOpen) {
      return;
    }

    void searchInviteCandidates(inviteQuery);
  }, [inviteOpen, inviteQuery, boardMembers, selectedBoard?.id]);

  useEffect(() => {
    const currentBoardId = selectedBoard?.id ?? boards[0]?.id ?? null;

    if (isSharedView) {
      setCloudSaveState("idle");
      return;
    }

    if (!user?.id || !supabase) {
      saveLocalSnapshot({ boards, notes, selectedBoardId: currentBoardId });
      setCloudSaveState("idle");
      return;
    }

    if (loading) {
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
  }, [boards, notes, selectedBoard?.id, user?.id, loading, isSharedView]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const boardTitle = selectedBoard?.title?.trim();
    const title = boardTitle ? `${boardTitle} | WZD` : "WZD 개인 시작페이지";
    const description =
      selectedBoard?.description?.trim() || "WZD에서 메모, 링크, 위젯이 담긴 보드를 만들고 공유해보세요.";

    document.title = title;

    let descriptionMeta = document.querySelector('meta[name="description"]');
    if (!descriptionMeta) {
      descriptionMeta = document.createElement("meta");
      descriptionMeta.setAttribute("name", "description");
      document.head.appendChild(descriptionMeta);
    }

    descriptionMeta.setAttribute("content", description);
  }, [selectedBoard]);

  useEffect(() => {
    return () => {
      if (saveStateResetTimerRef.current) {
        window.clearTimeout(saveStateResetTimerRef.current);
      }
      if (boardLongPressTimerRef.current) {
        window.clearTimeout(boardLongPressTimerRef.current);
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
      setSelectedBoardId(activeBoards[0].id);
    }
  }, [activeBoards, selectedBoard]);

  useEffect(() => {
    setBoardTitleDraft(selectedBoard?.title ?? "");
    setEditingBoardTitle(false);
  }, [selectedBoard?.id]);

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

  useEffect(() => {
    const urls = Array.from(
      new Set(
        visibleNotes.flatMap((note) => {
          const urls = [] as string[];
          const noteUrl = extractFirstUrl(note.content);
          if (noteUrl && !isImageUrl(noteUrl)) {
            urls.push(noteUrl);
          }
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
    const urls = Array.from(
      new Set(
        visibleNotes
          .filter((note) => getWidgetType(note) === "rss")
          .map((note) => getRssFeedUrl(note))
          .filter(Boolean)
      )
    ).filter((url) => !(url in rssFeeds));

    if (urls.length === 0) {
      return;
    }

    let cancelled = false;

    void Promise.all(
      urls.map(async (url) => {
        try {
          const feed = await fetchRssFeed(url);
          if (!cancelled) {
            setRssFeeds((prev) => ({ ...prev, [url]: feed }));
          }
        } catch {
          if (!cancelled) {
            setRssFeeds((prev) => ({ ...prev, [url]: null }));
          }
        }
      })
    );

    return () => {
      cancelled = true;
    };
  }, [visibleNotes, rssFeeds]);

  const openTemplatePicker = () => {
    setTemplatePickerOpen(true);
  };

  const addBoard = async (templateKey: BoardTemplateKey = "blank") => {
    const title =
      templateKey === "blank"
        ? makeBoardTitle(boards)
        : BOARD_TEMPLATES.find((item) => item.key === templateKey)?.title ?? makeBoardTitle(boards);
    const nextOrder = orderedBoards.length;

    if (templateKey === "blank" && supabase && user?.id) {
      try {
        const board = await createBoardV2(user.id, title);
        setBoards((prev) => [{ ...board, settings: { ...board.settings, sidebarOrder: nextOrder } }, ...prev]);
        setSelectedBoardId(board.id);
        setSelectedNoteId(null);
        setFeedMode("active");
        setTemplatePickerOpen(false);
        return;
      } catch {
        return;
      }
    }

    const snapshot =
      templateKey === "blank"
        ? (() => {
            const board = createDefaultBoard(user?.id ?? "local", title);
            board.settings = { ...board.settings, sidebarOrder: nextOrder };
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

  const shareBoard = async () => {
    if (!selectedBoard || isSharedView || !isBoardOwner) {
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
        const updateResult = await supabase
          .from("boards")
          .update({
            settings: {
              ...selectedBoard.settings,
              sharedSlug: shareSlug
            },
            updated_at: timestamp
          })
          .eq("id", selectedBoard.id)
          .eq("user_id", user.id);

        if (updateResult.error) {
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

  const organizeCurrentBoard = () => {
    if (!selectedBoard) {
      return;
    }

    const nextColumnCount = getColumnCount();
    setNotes((prev) => autoOrganizeBoardNotes(prev, selectedBoard.id, nextColumnCount, getBoardLayoutStyle(selectedBoard)));
    touchBoard(selectedBoard.id);
  };

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
    const nextTitle = title.trim() || "Untitled Board";
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

  const uploadPastedImage = async (note: NoteV2, file: File) => {
    if (!supabase || !user?.id) {
      return null;
    }

    const extension = (file.type.split("/")[1] || "png").replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
    const path = `${user.id}/${note.boardId}/${note.id}-${Date.now()}.${extension}`;
    const bucket = "note-images";
    const uploadResult = await supabase.storage.from(bucket).upload(path, file, {
      upsert: false,
      contentType: file.type
    });

    if (uploadResult.error) {
      throw uploadResult.error;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl || null;
  };

  const applyImageFileToNote = async (note: NoteV2, file: File) => {
    try {
      const uploadedUrl = await uploadPastedImage(note, file);
      if (uploadedUrl) {
        updateNote(note.id, {
          metadata: {
            ...note.metadata,
            pastedImageUrl: uploadedUrl
          }
        });
        return;
      }
    } catch (error) {
      console.error("Failed to upload pasted image", error);
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        return;
      }

      updateNote(note.id, {
        metadata: {
          ...note.metadata,
          pastedImageUrl: result
        }
      });
    };
    reader.readAsDataURL(file);
  };

  const onEditorPaste = async (note: NoteV2, event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
    if (!imageItem) {
      return;
    }

    const file = imageItem.getAsFile();
    if (!file) {
      return;
    }

    event.preventDefault();
    await applyImageFileToNote(note, file);
  };

  const onEditorDragOver = (note: NoteV2, event: ReactDragEvent<HTMLTextAreaElement>) => {
    const hasImageFile = Array.from(event.dataTransfer?.files ?? []).some((file) => file.type.startsWith("image/"));
    if (!hasImageFile) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (editorDropNoteId !== note.id) {
      setEditorDropNoteId(note.id);
    }
  };

  const onEditorDragLeave = (note: NoteV2, event: ReactDragEvent<HTMLTextAreaElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    if (editorDropNoteId === note.id) {
      setEditorDropNoteId(null);
    }
  };

  const onEditorDrop = async (note: NoteV2, event: ReactDragEvent<HTMLTextAreaElement>) => {
    const imageFile = Array.from(event.dataTransfer?.files ?? []).find((file) => file.type.startsWith("image/"));
    if (!imageFile) {
      return;
    }

    event.preventDefault();
    setEditorDropNoteId(null);
    await applyImageFileToNote(note, imageFile);
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

  const clearBoardLongPress = () => {
    if (boardLongPressTimerRef.current) {
      window.clearTimeout(boardLongPressTimerRef.current);
      boardLongPressTimerRef.current = null;
    }
  };

  const armBoardDrag = (boardId: string) => {
    clearBoardLongPress();
    boardLongPressTimerRef.current = window.setTimeout(() => {
      setDragArmedBoardId(boardId);
      boardLongPressTimerRef.current = null;
    }, 220);
  };

  const reorderBoards = (draggedBoardId: string, targetBoardId?: string) => {
    const sorted = sortBoards(boards);
    const draggedBoard = sorted.find((board) => board.id === draggedBoardId);
    if (!draggedBoard) {
      return;
    }

    const remaining = sorted.filter((board) => board.id !== draggedBoardId);
    const targetIndex = targetBoardId ? remaining.findIndex((board) => board.id === targetBoardId) : remaining.length;
    const insertIndex = targetIndex >= 0 ? targetIndex : remaining.length;
    remaining.splice(insertIndex, 0, draggedBoard);

    const updatedAt = nowIso();
    setBoards(
      remaining.map((board, index) => ({
        ...board,
        settings: {
          ...board.settings,
          sidebarOrder: index
        },
        updatedAt: board.id === draggedBoardId ? updatedAt : board.updatedAt
      }))
    );
  };

  const onBoardChipDragStart = (event: ReactDragEvent<HTMLButtonElement>, boardId: string) => {
    if (dragArmedBoardId !== boardId) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/board-id", boardId);
    setDraggingBoardId(boardId);
    setDragPreviewBoardId(boardId);
  };

  const onBoardChipDrop = (event: ReactDragEvent<HTMLElement>, targetBoardId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    const draggedBoardId = event.dataTransfer.getData("text/board-id") || draggingBoardId;
    if (!draggedBoardId || draggedBoardId === targetBoardId) {
      setDraggingBoardId(null);
      setDragPreviewBoardId(null);
      setDragArmedBoardId(null);
      return;
    }

    reorderBoards(draggedBoardId, targetBoardId);
    setDraggingBoardId(null);
    setDragPreviewBoardId(null);
    setDragArmedBoardId(null);
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
                  const isBookmarkWidget = widgetType === "bookmark";
                  const rssFeedUrl = isRssWidget ? getRssFeedUrl(note) : "";
                  const rssFeed = rssFeedUrl ? rssFeeds[rssFeedUrl] : undefined;
                  const bookmarkUrls = isBookmarkWidget ? getBookmarkUrls(note) : [];
                  const attachedImageUrl = getAttachedImageUrl(note);
                  const noteUrl = extractFirstUrl(note.content);
                  const cardImageUrl = attachedImageUrl || (noteUrl && isImageUrl(noteUrl) ? noteUrl : "");
                  const previewText = stripUrls(note.content);
                  const hasExternalLink = Boolean(noteUrl && !isImageUrl(noteUrl));
                  const linkPreview = hasExternalLink ? linkPreviews[noteUrl] : undefined;
                  const displayTitle = hasExternalLink
                    ? getLinkDisplayTitle(note.content, noteUrl, linkPreview)
                    : getNoteTitle(note.content);
                  const displayDescription = hasExternalLink
                    ? getLinkDisplayDescription(note.content, noteUrl, linkPreview)
                    : previewText || (noteUrl ? getUrlSnippet(noteUrl) : "메모를 클릭해서 편집하세요.");
                  const displaySite = hasExternalLink ? getLinkDisplaySite(linkPreview) : "";
                  const displayHost = hasExternalLink ? getLinkDisplayHost(linkPreview) : "";

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
                          <img className="pin-image" src={getImageProxyUrl(cardImageUrl)} alt={getNoteTitle(note.content)} />
                        </div>
                      )}
                      <div className="pin-card-body">
                        {isRssWidget ? (
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
                        ) : (
                          <div className="pin-note-stack">
                            <p className="pin-title">{displayTitle}</p>
                            {hasExternalLink &&
                              (linkPreview ? (
                                <a className="link-preview-card" href={linkPreview.finalUrl} target="_blank" rel="noreferrer">
                                  {linkPreview.image && (
                                    <img
                                      className="link-preview-image"
                                      src={getImageProxyUrl(linkPreview.image)}
                                      alt={linkPreview.title}
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
                              {displayDescription}
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
  const compactHeader = mobileViewport || compactSidebar;
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

  const showExpandedSidebar = sidebarExpanded && !compactSidebar;

  return (
    <div className={`pin-page ${showExpandedSidebar ? "sidebar-expanded" : ""}`}>
      <aside className={`pin-sidebar ${showExpandedSidebar ? "expanded" : ""}`}>
        <button className="pin-brand" aria-label="WZD 홈">
          <span>{showExpandedSidebar ? "WZD" : "W"}</span>
        </button>

        <div className="board-menu">
          <div
            className="board-switcher"
            onDragOver={(event) => {
              if (draggingBoardId) {
                event.preventDefault();
                if (event.target === event.currentTarget) {
                  setDragPreviewBoardId(null);
                }
              }
            }}
            onDrop={(event) => onBoardChipDrop(event)}
          >
            {activeBoards.map((boardItem) => (
              <div key={boardItem.id} className="board-chip-slot">
                {draggingBoardId && dragPreviewBoardId === boardItem.id && draggingBoardId !== boardItem.id && (
                  <div className="board-chip-drop-preview" aria-hidden="true">
                    <span className="board-chip-drop-label">여기에 이동</span>
                  </div>
                )}
                <button
                  className={`board-chip ${selectedBoard?.id === boardItem.id ? "active" : ""} ${
                    draggingBoardId === boardItem.id ? "dragging" : ""
                  }`}
                  draggable={showExpandedSidebar && dragArmedBoardId === boardItem.id}
                  onMouseDown={() => armBoardDrag(boardItem.id)}
                  onMouseUp={clearBoardLongPress}
                  onMouseLeave={clearBoardLongPress}
                  onDragStart={(event) => onBoardChipDragStart(event, boardItem.id)}
                  onDragEnd={() => {
                    clearBoardLongPress();
                    setDraggingBoardId(null);
                    setDragPreviewBoardId(null);
                    setDragArmedBoardId(null);
                  }}
                  onDragEnter={() => {
                    if (draggingBoardId && draggingBoardId !== boardItem.id) {
                      setDragPreviewBoardId(boardItem.id);
                    }
                  }}
                  onDragOver={(event) => {
                    if (draggingBoardId) {
                      event.preventDefault();
                    }
                  }}
                  onDrop={(event) => onBoardChipDrop(event, boardItem.id)}
                  onClick={() => {
                    if (dragArmedBoardId === boardItem.id || draggingBoardId === boardItem.id) {
                      return;
                    }

                    if (boardItem.id === selectedBoard?.id) {
                      setSidebarExpanded((prev) => !prev);
                    }

                    setSelectedBoardId(boardItem.id);
                    setSelectedNoteId(null);
                    setFeedMode("active");
                  }}
                  aria-label={boardItem.title}
                  title={boardItem.title}
                >
                  <span className="board-chip-badge">{getBoardBadge(boardItem.title)}</span>
                  <span className="board-chip-label">{boardItem.title}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        <button className="side-icon" onClick={openTemplatePicker} aria-label="새 보드">
          <span className="side-icon-glyph" aria-hidden="true">
            +
          </span>
          <span className="side-icon-label">보드 추가</span>
        </button>

        <div className="sidebar-spacer" />

        <button
          className={`side-icon subtle settings-icon ${settingsOpen ? "active" : ""}`}
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
      </aside>

      <div className="pin-app">
        <header className={`pin-topbar ${compactHeader ? "compact-header" : ""}`}>
          <div className="topbar-primary">
            <div className="topbar-board-title">
              <button
                className="mobile-icon-action mobile-board-toggle"
                onClick={() => setMobileBoardMenuOpen((prev) => !prev)}
                aria-label="보드 메뉴"
              >
                ≡
              </button>
              <p className="feed-kicker">
                {isSharedView ? "공유 보드" : feedMode === "active" ? "개인 보드" : "보관 메모"}
              </p>
              {canRenameBoard && editingBoardTitle ? (
                <input
                  className="board-title-input"
                  value={boardTitleDraft}
                  onChange={(event) => setBoardTitleDraft(event.target.value)}
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

            <div className="topbar-actions">
            {compactHeader && !isSharedView && (
              <button className="mobile-icon-action mobile-new-note-action" onClick={addNote} aria-label="새 메모 만들기">
                +
              </button>
            )}
            {!compactHeader && !isSharedView && (
              <button className="new-note-pill" onClick={addNote}>
                새 메모
              </button>
            )}
            {!compactHeader && !isSharedView && (
              <div className="widget-menu-wrap">
                <button className="widget-pill" onClick={() => setWidgetMenuOpen((prev) => !prev)}>
                  위젯 추가
                </button>
                {widgetMenuOpen && (
                  <div className="widget-menu">
                    <button className="widget-menu-item" onClick={addRssWidget}>
                      RSS 리더
                    </button>
                    <button className="widget-menu-item" onClick={addBookmarkWidget}>
                      북마크
                    </button>
                  </div>
                )}
              </div>
            )}
            {!compactHeader && !isSharedView && feedMode === "active" && selectedBoard && (
              <button className="ghost-action" onClick={organizeCurrentBoard}>
                자동 정리
              </button>
            )}
            {!compactHeader && canShareBoard && (
              <button className="ghost-action" onClick={() => void shareBoard()}>
                보드 공유
              </button>
            )}
            {!compactHeader && canInviteBoard && (
              <button className="ghost-action" onClick={() => void openInvitePanel()}>
                보드 초대
              </button>
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
                    className={compactHeader ? "mobile-profile-button" : "profile-pill"}
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
                <button className={compactHeader ? "mobile-icon-action mobile-auth-action" : "ghost-action mobile-auth-action"} onClick={onGoogleLogin}>
                  구글 로그인
                </button>
              )
            ) : (
              <div className="profile-pill muted">로컬 모드</div>
            )}
          </div>
        </header>

        {mobileBoardMenuOpen && (
            <div className="mobile-board-sheet">
            <div className="mobile-board-list">
              {activeBoards.map((boardItem) => (
                <button
                  key={`mobile-${boardItem.id}`}
                  className={`mobile-board-item ${selectedBoard?.id === boardItem.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedBoardId(boardItem.id);
                    setSelectedNoteId(null);
                    setFeedMode("active");
                    setMobileBoardMenuOpen(false);
                  }}
                >
                  <span className="mobile-board-badge">{getBoardBadge(boardItem.title)}</span>
                  <span className="mobile-board-name">{boardItem.title}</span>
                </button>
              ))}
              <div className="mobile-board-actions">
                {!isSharedView && feedMode === "active" && selectedBoard && (
                  <button
                    className="mobile-board-action"
                    onClick={() => {
                      organizeCurrentBoard();
                      setMobileBoardMenuOpen(false);
                    }}
                  >
                    <span className="mobile-board-action-icon" aria-hidden="true">
                      ✦
                    </span>
                    <span>자동 정리</span>
                  </button>
                )}
                {canShareBoard && (
                  <button
                    className="mobile-board-action"
                    onClick={() => {
                      void shareBoard();
                      setMobileBoardMenuOpen(false);
                    }}
                  >
                    <span className="mobile-board-action-icon" aria-hidden="true">
                      ↗
                    </span>
                    <span>보드 공유</span>
                  </button>
                )}
                {canInviteBoard && (
                  <button
                    className="mobile-board-action"
                    onClick={() => {
                      void openInvitePanel();
                      setMobileBoardMenuOpen(false);
                    }}
                  >
                    <span className="mobile-board-action-icon" aria-hidden="true">
                      @
                    </span>
                    <span>보드 초대</span>
                  </button>
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
                  <p className="settings-kicker">스타터 보드</p>
                  <h2>어떤 보드로 시작할까요?</h2>
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
                    <strong>빠른 시작</strong>
                    <span>아무 제약 없이 바로 메모를 시작하고 싶다면 빈 보드가 가장 가볍습니다.</span>
                  </div>
                  <div className="template-picker-grid">
                    {BOARD_TEMPLATES.filter((template) => template.key === "blank").map((template) => (
                      <button
                        key={template.key}
                        className="template-card"
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

                {starterTemplateSections.map((section) => (
                  <section className="template-section" key={`picker-${section.key}`}>
                    <div className="template-section-head">
                      <strong>{section.title}</strong>
                      <span>{section.subtitle}</span>
                    </div>
                    <div className="template-picker-grid">
                      {section.templates.map((template) => (
                        <button
                          key={`picker-${template.key}`}
                          className="template-card"
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
                ))}
              </div>
            </section>
          </div>
        )}

        {settingsOpen && (
          <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
            <section className="settings-panel" onClick={(event) => event.stopPropagation()}>
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
                        </div>
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

          {compactHeader && feedMode === "active" && activeBoards.length > 1 && (
            <div className="mobile-board-tabs" role="tablist" aria-label="보드 목록">
              {activeBoards.map((boardItem) => (
                <button
                  key={`mobile-tab-${boardItem.id}`}
                  role="tab"
                  aria-selected={selectedBoard?.id === boardItem.id}
                  className={`mobile-board-tab ${selectedBoard?.id === boardItem.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedBoardId(boardItem.id);
                    setSelectedNoteId(null);
                    setFeedMode("active");
                  }}
                >
                  <span className="mobile-board-tab-badge">{getBoardBadge(boardItem.title)}</span>
                  <span className="mobile-board-tab-label">{boardItem.title}</span>
                </button>
              ))}
            </div>
          )}

          <main className="pin-main">
          <div
            className={`pin-board-stage ${mobileSwipeEnabled ? "mobile-swipe-enabled" : ""} ${boardSwipeTransition ? "swipe-transition" : ""}`}
            style={{ "--board-swipe-offset": `${boardSwipeOffset}px` } as CSSProperties}
            onTouchStart={onBoardTouchStart}
            onTouchMove={onBoardTouchMove}
            onTouchEnd={onBoardTouchEnd}
          >
          <div className="pin-board-track">
          <div className="pin-board-panel swipe-preview-panel">{mobileSwipeEnabled ? renderSwipePreviewPanel(previousBoard, "prev") : null}</div>
          <div className="pin-board-panel current-board-panel">
          <section className="feed-head">
            <div className="feed-meta">
              <span>
                {hasSupabaseConfig && user
                  ? cloudSaveState === "saving"
                    ? "클라우드에 저장 중입니다"
                    : cloudSaveState === "saved"
                      ? "클라우드에 저장되었습니다"
                      : cloudSaveState === "error"
                        ? "클라우드 저장에 실패했습니다"
                        : feedMode === "active"
                          ? `${activeNotes.length}개의 핀`
                          : `${archivedNotes.length}개의 보관 메모`
                  : feedMode === "active"
                    ? `${activeNotes.length}개의 핀`
                    : `${archivedNotes.length}개의 보관 메모`}
              </span>
            </div>
          </section>

          <section
            className="pin-board"
            style={{ "--pin-columns": String(columnCount) } as CSSProperties}
            onMouseDown={onBoardBackgroundMouseDown}
            onDragOver={(event) => {
              if (feedMode === "active") {
                event.preventDefault();
              }
            }}
            onDrop={(event) => onPinDrop(event, undefined, dragPreviewColumn ?? 0)}
          >
            {loading ? (
              <div className="feed-empty">보드를 불러오는 중입니다.</div>
            ) : !selectedBoard ? (
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
            ) : visibleNotes.length === 0 ? (
              feedMode === "active" ? (
                <div className="feed-empty empty-templates full-span">
                  <div className="feed-empty-copy">
                    <strong>이 보드를 채워볼까요?</strong>
                    <span>
                      새 메모를 바로 추가하거나, 템플릿 보드를 하나 더 만들어서 흐름을 참고할 수 있어요.
                    </span>
                  </div>
                  <div className="feed-empty-actions">
                    <button className="new-note-pill" onClick={addNote}>
                      새 메모 만들기
                    </button>
                    <button className="ghost-action" onClick={openTemplatePicker}>
                      템플릿 보드 보기
                    </button>
                  </div>
                  {renderTemplateSections("selected-empty")}
                </div>
              ) : (
                <div className="feed-empty">보관된 메모가 없습니다.</div>
              )
            ) : (
              visibleColumns.map((columnNotes, columnIndex) => (
                <div
                  key={`column-${columnIndex}`}
                  className="pin-column"
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
                    const isBookmarkWidget = widgetType === "bookmark";
                    const rssFeedUrl = isRssWidget ? getRssFeedUrl(note) : "";
                    const rssFeed = rssFeedUrl ? rssFeeds[rssFeedUrl] : undefined;
                    const bookmarkUrls = isBookmarkWidget ? getBookmarkUrls(note) : [];
                    const attachedImageUrl = getAttachedImageUrl(note);
                    const noteUrl = extractFirstUrl(note.content);
                    const cardImageUrl = attachedImageUrl || (noteUrl && isImageUrl(noteUrl) ? noteUrl : "");
                    const previewText = stripUrls(note.content);
                    const hasExternalLink = Boolean(noteUrl && !isImageUrl(noteUrl));
                    const linkPreview = hasExternalLink ? linkPreviews[noteUrl] : undefined;
                    const hasImagePreview = Boolean(cardImageUrl);
                    const hasTextPreview = previewText.trim().length > 0;
                    const hasLinkPreview = hasExternalLink;
                    const isPureLinkNote =
                      hasExternalLink &&
                      !hasImagePreview &&
                      (!hasTextPreview || isLinkPreviewDuplicateText(note.content, noteUrl, linkPreview));
                    const displayTitle = hasExternalLink
                      ? getLinkDisplayTitle(note.content, noteUrl, linkPreview)
                      : getNoteTitle(note.content);
                    const displayDescription = hasExternalLink
                      ? getLinkDisplayDescription(note.content, noteUrl, linkPreview)
                      : previewText || (noteUrl ? getUrlSnippet(noteUrl) : "메모를 클릭해서 편집하세요.");
                    const displaySite = hasExternalLink ? getLinkDisplaySite(linkPreview) : "";
                    const displayHost = hasExternalLink ? getLinkDisplayHost(linkPreview) : "";
                    const hideHoverMetadata = Boolean(attachedImageUrl && hasExternalLink && !selected);
                    const useImageHeroCard = hasImagePreview && !selected;
                    const isFramedLinkNote = feedMode === "active" && hasExternalLink;
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
                      <div key={note.id}>
                        {showDropPreview && <article className="pin-card pin-drop-preview" aria-hidden="true" />}
                        <article
                          className={`pin-card note-${note.color} ${useImageHeroCard ? "image-note" : ""} ${
                            isPureLinkNote && !selected ? "link-only-note" : ""
                          } ${
                            !hideHoverMetadata && (hasTextPreview || hasLinkPreview) ? "has-hover-copy" : "image-only"
                          } ${isRssWidget ? "widget-note rss-widget" : ""} ${selected ? "selected" : ""} ${
                            runningDragNoteId === note.id ? "dragging" : ""
                          }`}
                          draggable={feedMode === "active" && !selected && !isSharedView}
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

                            if (isSharedView) {
                              if (isFramedLinkNote && noteUrl) {
                                window.open(noteUrl, "_blank", "noopener,noreferrer");
                              }
                              return;
                            }

                            if (!selected && isFramedLinkNote && noteUrl) {
                              window.open(noteUrl, "_blank", "noopener,noreferrer");
                              return;
                            }

                            setSelectedNoteId(note.id);
                          }}
                        >
                          {hasImagePreview && (
                            <div className="pin-image-wrap">
                              <img
                                className="pin-image"
                                src={getImageProxyUrl(cardImageUrl)}
                                alt={getNoteTitle(note.content)}
                              />
                            </div>
                          )}

                          <div className="pin-card-head">
                            <span className={`pin-dot chip-${note.color}`} aria-hidden="true" />
                            {!isSharedView && (
                              <div className="pin-actions">
                                {!useImageHeroCard && !isPureLinkNote && (
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
                                <button
                                  className="pin-icon-button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    if (feedMode === "active") {
                                      setSelectedNoteId(note.id);
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
                              </div>
                            )}
                          </div>

                          <div className="pin-card-body">
                            {isRssWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge">RSS</span>
                                  <p className="pin-title">{asText(note.content).trim() || "RSS 리더"}</p>
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
                                        {rssFeed.items.slice(0, rssVisibleCount).map((item) => (
                                          <a
                                            key={`${note.id}-${item.link}-${item.title}`}
                                            className="rss-item"
                                            href={item.link}
                                            target="_blank"
                                            rel="noreferrer"
                                            onClick={(event) => event.stopPropagation()}
                                          >
                                            <span className="rss-item-title">{item.title}</span>
                                            {item.pubDate && <span className="rss-item-date">{item.pubDate}</span>}
                                          </a>
                                        ))}
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
                            ) : (
                              <div className="pin-note-stack">
                                {!isPureLinkNote &&
                                  (!useImageHeroCard || (!hideHoverMetadata && (hasTextPreview || hasLinkPreview))) && (
                                  <p className="pin-title">{displayTitle}</p>
                                  )}

                                {selected ? (
                                  <>
                                    {attachedImageUrl && (
                                      <div className="pin-image-wrap editor-image-preview">
                                        <img
                                          className="pin-image editor-image-preview-media"
                                          src={getImageProxyUrl(attachedImageUrl)}
                                          alt={getNoteTitle(note.content)}
                                        />
                                      </div>
                                    )}
                                    <textarea
                                      className={`pin-editor ${editorDropNoteId === note.id ? "drop-active" : ""}`}
                                      value={note.content}
                                      style={{ fontSize: `${fontSize}px` }}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onPaste={(event) => {
                                        void onEditorPaste(note, event);
                                      }}
                                      onDragOver={(event) => onEditorDragOver(note, event)}
                                      onDragLeave={(event) => onEditorDragLeave(note, event)}
                                      onDrop={(event) => {
                                        void onEditorDrop(note, event);
                                      }}
                                      onFocus={() => setSelectedNoteId(note.id)}
                                      onChange={(event) => {
                                        updateNote(note.id, { content: event.target.value });
                                        event.currentTarget.style.height = "0px";
                                        event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                                      }}
                                      placeholder="메모, 링크, 이미지 URL을 입력하세요"
                                      rows={1}
                                    />
                                  </>
                                ) : (
                                  <>
                                    {hasExternalLink && !hideHoverMetadata &&
                                      (linkPreview ? (
                                        <a
                                          className="link-preview-card"
                                          href={linkPreview.finalUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {linkPreview.image && (
                                            <img
                                              className="link-preview-image"
                                              src={getImageProxyUrl(linkPreview.image)}
                                              alt={linkPreview.title}
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
                                                />
                                              )}
                                              <span className="link-preview-site">
                                                {displaySite || linkPreview.hostname}
                                              </span>
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
                                    {!isPureLinkNote &&
                                      (!useImageHeroCard || (!hideHoverMetadata && (hasTextPreview || hasLinkPreview))) && (
                                      <>
                                        <p
                                          className={`pin-body-preview ${textNeedsMore && !textExpanded ? "clamped" : ""}`}
                                          style={{ fontSize: `${fontSize}px` }}
                                        >
                                          {displayDescription}
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
              {visibleNoteCount < filteredNotes.length
              ? "아래로 스크롤하면 메모가 계속 로드됩니다."
              : `${filteredNotes.length}개의 메모가 모두 표시되었습니다.`}
          </div>
          </div>
          <div className="pin-board-panel swipe-preview-panel">{mobileSwipeEnabled ? renderSwipePreviewPanel(nextSwipeBoard, "next") : null}</div>
          </div>
          </div>
        </main>

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
    </div>
  );
};

export default App;
