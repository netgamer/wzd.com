import {
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { fetchLinkPreview, getImageProxyUrl, type LinkPreview } from "./lib/link-preview";
import { fetchRssFeed, type RssFeedPreview } from "./lib/rss";
import {
  createBoardV2,
  type BoardV2,
  loadBoardsV2,
  type NoteColor,
  type NoteV2,
  saveBoardsV2
} from "./lib/supabase-board-v2";

interface UserProfile {
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

const LOCAL_STORAGE_KEY = "wzd-board-v2-local";
const INITIAL_VISIBLE_NOTE_COUNT = 24;
const VISIBLE_NOTE_BATCH_SIZE = 16;
const DEFAULT_FONT_SIZE: NoteFontSize = 16;
const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue", "green", "orange", "purple", "mint", "white"];
const CLOUD_SAVE_DEBOUNCE_MS = 120;
const TRASH_RETENTION_DAYS = 30;
const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;
const DEFAULT_RSS_FEED_URL = "https://news.google.com/rss/search?q=AI&hl=ko&gl=KR&ceid=KR:ko";
const DEFAULT_BOOKMARK_URL = "https://";
const DEFAULT_NEW_NOTE_CONTENT = "새 메모\n\nhttps://";
const DEFAULT_PERSONAL_NOTE_CONTENT =
  "개인 메모장\n\n간단한 메모, 북마크, 이미지 URL을 모아두는 공간입니다.\nhttps://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80";
const DEFAULT_GROUP_NOTE_CONTENT =
  "그룹 메모장\n\n주제별 보드에서 각자 찾은 링크와 자료를 함께 공유해보세요.\n예: AI Studio 레퍼런스 모음";

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

const extractFirstUrl = (content: string) => {
  const match = content.match(/(?:https?:\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/i);
  return match?.[0] ?? "";
};

const isImageUrl = (url: string) =>
  url.startsWith("data:image/") ||
  /(\.png|\.jpe?g|\.gif|\.webp|\.avif|\.svg)(\?.*)?$/i.test(url) ||
  url.includes("images.unsplash.com");

const stripUrls = (content: string) =>
  content.replace(/(?:https?:\/\/\S+|data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+)/gi, "").trim();

const getUrlSnippet = (url: string) => {
  if (!url) {
    return "";
  }

  try {
    const parsed = new URL(url);
    const compact = `${parsed.hostname.replace(/^www\./i, "")}${parsed.pathname}${parsed.search}`;
    return compact.length > 48 ? `${compact.slice(0, 48)}...` : compact;
  } catch {
    return url.length > 48 ? `${url.slice(0, 48)}...` : url;
  }
};

const getNoteTitle = (content: string) => {
  const cleaned = stripUrls(content);
  const firstLine = cleaned.split("\n").find((line) => line.trim().length > 0) ?? "새 메모";
  return firstLine.slice(0, 48);
};

const getBoardBadge = (title: string) => title.trim().slice(0, 1).toUpperCase() || "B";
const normalizeLegacyText = (value: string) =>
  LEGACY_TEXT_REPLACEMENTS.reduce((current, [from, to]) => current.split(from).join(to), value);
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
    ? note.metadata.bookmarkUrl.trim()
    : DEFAULT_BOOKMARK_URL;
const getBookmarkUrls = (note: NoteV2) => {
  const rawList = note.metadata?.bookmarkUrls;
  if (Array.isArray(rawList)) {
    return rawList.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  }

  if (typeof rawList === "string" && rawList.trim()) {
    return rawList
      .split(/\r?\n/)
      .map((value) => value.trim())
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

  const trimmed = note.content.trim();
  if (!trimmed) {
    return true;
  }

  return trimmed === "새 메모" || trimmed === "https://" || trimmed === DEFAULT_NEW_NOTE_CONTENT.trim();
};

const sanitizeNotes = (notes: NoteV2[]) =>
  notes
    .map((note) => ({
      ...note,
      content: normalizeLegacyText(note.content)
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

  if (window.innerWidth < 720) {
    return 1;
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

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
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
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileBoardMenuOpen, setMobileBoardMenuOpen] = useState(false);
  const [widgetMenuOpen, setWidgetMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [trashDropActive, setTrashDropActive] = useState(false);
  const [draggingBoardId, setDraggingBoardId] = useState<string | null>(null);
  const [dragPreviewBoardId, setDragPreviewBoardId] = useState<string | null>(null);
  const [dragArmedBoardId, setDragArmedBoardId] = useState<string | null>(null);

  const skipNextCloudSaveRef = useRef(false);
  const suppressNextCardClickRef = useRef(false);
  const latestBoardsRef = useRef<BoardV2[]>(boards);
  const latestNotesRef = useRef<NoteV2[]>(notes);
  const latestUserIdRef = useRef<string | null>(user?.id ?? null);
  const saveStateResetTimerRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const boardLongPressTimerRef = useRef<number | null>(null);

  const orderedBoards = useMemo(() => sortBoards(boards), [boards]);
  const activeBoards = useMemo(() => orderedBoards.filter((board) => !isBoardTrashed(board)), [orderedBoards]);
  const trashedBoards = useMemo(() => orderedBoards.filter((board) => isBoardTrashed(board)), [orderedBoards]);
  const selectedBoard = useMemo(
    () => activeBoards.find((board) => board.id === selectedBoardId) ?? activeBoards[0] ?? null,
    [activeBoards, selectedBoardId]
  );

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
    const onResize = () => {
      setColumnCount(getColumnCount());
      setCompactSidebar(window.innerWidth < 1180);
      if (window.innerWidth > 720) {
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
      notes: pruned.notes
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

    await saveBoardsV2({ boards: merged.boards, notes: merged.notes });
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

    return base.filter((note) => note.content.toLowerCase().includes(keyword));
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
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

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
  }, [user?.id]);

  useEffect(() => {
    const currentBoardId = selectedBoard?.id ?? boards[0]?.id ?? null;

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
  }, [boards, notes, selectedBoard?.id, user?.id, loading]);

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

  const addBoard = async () => {
    const title = makeBoardTitle(boards);
    const nextOrder = orderedBoards.length;

    if (supabase && user?.id) {
      try {
        const board = await createBoardV2(user.id, title);
        setBoards((prev) => [{ ...board, settings: { ...board.settings, sidebarOrder: nextOrder } }, ...prev]);
        setSelectedBoardId(board.id);
        setSelectedNoteId(null);
        setFeedMode("active");
        return;
      } catch {
        return;
      }
    }

    const board = createDefaultBoard(user?.id ?? "local", title);
    board.settings = { ...board.settings, sidebarOrder: nextOrder };
    setBoards((prev) => [board, ...prev]);
    setSelectedBoardId(board.id);
    setSelectedNoteId(null);
    setFeedMode("active");
  };

  const boardHasRecoverableContent = (boardId: string) =>
    notes.some((note) => note.boardId === boardId && !isNoteTrashed(note) && !isDisposableEmptyNote(note));

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

  const deleteBoard = async () => {
    if (!selectedBoard) {
      return;
    }

    const hasRecoverableContent = boardHasRecoverableContent(selectedBoard.id);
    const shouldDelete = window.confirm(
      hasRecoverableContent
        ? `'${selectedBoard.title}' 보드를 삭제할까요? 30일 동안 설정의 휴지통에서 복구할 수 있습니다.`
        : `'${selectedBoard.title}' 보드를 삭제할까요?`
    );
    if (!shouldDelete) {
      return;
    }

    if (hasRecoverableContent) {
      const trashedAt = nowIso();
      const remainingActiveBoards = activeBoards.filter((board) => board.id !== selectedBoard.id);

      setBoards((prev) =>
        prev.map((board) =>
          board.id === selectedBoard.id
            ? {
                ...board,
                settings: {
                  ...board.settings,
                  trashedAt
                },
                updatedAt: trashedAt
              }
            : board
        )
      );
      setSelectedNoteId(null);
      setFeedMode("active");

      if (remainingActiveBoards.length > 0) {
        setSelectedBoardId(remainingActiveBoards[0].id);
        return;
      }

      const replacementBoard = createDefaultBoard(user?.id ?? "local");
      replacementBoard.settings = { ...replacementBoard.settings, sidebarOrder: orderedBoards.length };
      setBoards((prev) => [replacementBoard, ...prev]);
      setSelectedBoardId(replacementBoard.id);
      return;
    }

    const remainingBoards = boards.filter((board) => board.id !== selectedBoard.id);
    const remainingNotes = notes.filter((note) => note.boardId !== selectedBoard.id);

    if (supabase && user?.id) {
      const deleteNotesResult = await supabase
        .from("notes")
        .delete()
        .eq("user_id", user.id)
        .eq("board_id", selectedBoard.id);

      if (deleteNotesResult.error) {
        setCloudSaveState("error");
        return;
      }

      const deleteBoardResult = await supabase.from("boards").delete().eq("user_id", user.id).eq("id", selectedBoard.id);
      if (deleteBoardResult.error) {
        setCloudSaveState("error");
        return;
      }
    }

    const remainingActiveBoards = remainingBoards.filter((board) => !isBoardTrashed(board));

    if (remainingActiveBoards.length === 0) {
      const replacementBoard = createDefaultBoard(user?.id ?? "local");
      replacementBoard.settings = { ...replacementBoard.settings, sidebarOrder: 0 };
      setBoards([...remainingBoards, replacementBoard]);
      setNotes(remainingNotes);
      setSelectedBoardId(replacementBoard.id);
      setSelectedNoteId(null);
      setFeedMode("active");
      return;
    }

    setBoards(remainingBoards);
    setNotes(remainingNotes);
    setSelectedBoardId(remainingActiveBoards[0]?.id ?? null);
    setSelectedNoteId(null);
    setFeedMode("active");
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
      userId: selectedBoard.userId,
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
      userId: selectedBoard.userId,
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
      userId: selectedBoard.userId,
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
        return {
          ...note,
          ...patch,
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

  const onBoardBackgroundMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
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

    await supabase.auth.signOut();
  };

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
              <div key={boardItem.id}>
                {draggingBoardId && dragPreviewBoardId === boardItem.id && draggingBoardId !== boardItem.id && (
                  <div className="board-chip-drop-preview" aria-hidden="true" />
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

        <button className="side-icon" onClick={() => void addBoard()} aria-label="새 보드">
          +
        </button>

        <button
          className={`side-icon ${feedMode === "archived" ? "active" : ""}`}
          onClick={() => setFeedMode((prev) => (prev === "archived" ? "active" : "archived"))}
          aria-label="보관 메모"
        >
          □
        </button>

        <div className="sidebar-spacer" />

        <button
          className={`side-icon subtle ${settingsOpen ? "active" : ""}`}
          onClick={() => setSettingsOpen((prev) => !prev)}
          aria-label="설정"
        >
          설
        </button>
      </aside>

      <div className="pin-app">
        <header className="pin-topbar">
          <div className="topbar-primary">
            <div className="topbar-board-title">
              <button
                className="mobile-icon-action mobile-board-toggle"
                onClick={() => setMobileBoardMenuOpen((prev) => !prev)}
                aria-label="보드 메뉴"
              >
                ≡
              </button>
              <p className="feed-kicker">{feedMode === "active" ? "개인 보드" : "보관 메모"}</p>
              {feedMode === "active" && editingBoardTitle ? (
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
                  className={feedMode === "active" ? "editable-board-title" : undefined}
                  onClick={() => {
                    if (feedMode !== "active") {
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
            <button
              className="mobile-icon-action"
              onClick={() => {
                setMobileSearchOpen((prev) => {
                  const next = !prev;
                  if (!prev) {
                    window.setTimeout(() => searchInputRef.current?.focus(), 40);
                  }
                  return next;
                });
              }}
              aria-label="검색"
            >
              검색
            </button>
            <button className="new-note-pill" onClick={addNote}>
              새 메모
            </button>
            {feedMode === "active" && selectedBoard && (
              <button className="ghost-action ghost-danger" onClick={() => void deleteBoard()}>
                보드 삭제
              </button>
            )}
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
            <button className="mobile-icon-action mobile-add-note" onClick={addNote} aria-label="새 메모">
              +
            </button>
            <button className="mobile-icon-action" onClick={() => setWidgetMenuOpen((prev) => !prev)} aria-label="위젯 추가">
              W
            </button>
            {hasSupabaseConfig ? (
              user ? (
                <>
                  <div className="profile-pill">
                    <span className="profile-avatar">{user.email.slice(0, 1).toUpperCase()}</span>
                    <span className="profile-email">{user.email}</span>
                  </div>
                  <button className="ghost-action" onClick={onLogout}>
                    로그아웃
                  </button>
                </>
              ) : (
                <button className="ghost-action" onClick={onGoogleLogin}>
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
            </div>
          </div>
        )}

        {settingsOpen && (
          <div className="settings-overlay" onClick={() => setSettingsOpen(false)}>
            <section className="settings-panel" onClick={(event) => event.stopPropagation()}>
              <div className="settings-panel-head">
                <div>
                  <p className="settings-kicker">설정</p>
                  <h2>휴지통</h2>
                </div>
                <button className="settings-close" onClick={() => setSettingsOpen(false)} aria-label="설정 닫기">
                  ×
                </button>
              </div>

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
            </section>
          </div>
        )}

        <main className="pin-main">
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
              <div className="feed-empty">보드를 선택하거나 새 보드를 만들어주세요.</div>
            ) : visibleNotes.length === 0 ? (
              <div className="feed-empty">
                {feedMode === "active" ? "아직 메모가 없습니다." : "보관된 메모가 없습니다."}
              </div>
            ) : (
              visibleColumns.map((columnNotes, columnIndex) => (
                <div
                  key={`column-${columnIndex}`}
                  className="pin-column"
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
                    const previewUrl = attachedImageUrl || extractFirstUrl(note.content);
                    const previewText = stripUrls(note.content);
                    const linkPreview = previewUrl && !isImageUrl(previewUrl) ? linkPreviews[previewUrl] : undefined;
                    const hasImagePreview = Boolean(previewUrl && isImageUrl(previewUrl));
                    const hasTextPreview = previewText.trim().length > 0;
                    const useImageHeroCard = hasImagePreview && !selected;
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
                            hasTextPreview ? "has-hover-copy" : "image-only"
                          } ${isRssWidget ? "widget-note rss-widget" : ""} ${selected ? "selected" : ""} ${
                            runningDragNoteId === note.id ? "dragging" : ""
                          }`}
                          draggable={feedMode === "active" && !selected}
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

                            setSelectedNoteId(note.id);
                          }}
                        >
                          {hasImagePreview && (
                            <div className="pin-image-wrap">
                              <img
                                className="pin-image"
                                src={getImageProxyUrl(previewUrl)}
                                alt={getNoteTitle(note.content)}
                              />
                            </div>
                          )}

                          <div className="pin-card-head">
                            <span className={`pin-dot chip-${note.color}`} aria-hidden="true" />
                            <div className="pin-actions">
                              <button
                                className={`note-color-toggle chip-${note.color}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  cycleNoteColor(note.id, note.color);
                                }}
                                aria-label="메모 색상 변경"
                                title="메모 색상 변경"
                              />
                              <button
                                className="pin-icon-button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (feedMode === "active") {
                                    updateNote(note.id, { pinned: !note.pinned });
                                  } else {
                                    restoreNote(note.id);
                                  }
                                }}
                                aria-label={feedMode === "active" ? "핀 고정" : "메모 복구"}
                                title={feedMode === "active" ? "핀 고정" : "메모 복구"}
                              >
                                {feedMode === "active" ? "핀" : "복구"}
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
                                {feedMode === "active" ? "삭제" : "영구"}
                              </button>
                            </div>
                          </div>

                          <div className="pin-card-body">
                            {isRssWidget ? (
                              <>
                                <div className="widget-header">
                                  <span className="widget-badge">RSS</span>
                                  <p className="pin-title">{note.content.trim() || "RSS 리더"}</p>
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
                                      rssFeed.items.slice(0, 5).map((item) => (
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
                                      ))
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
                                  <p className="pin-title">{note.content.trim() || "북마크"}</p>
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
                                      bookmarkUrls.map((url) => {
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
                                      })
                                    ) : (
                                      <p className="rss-empty">링크를 추가하면 북마크 카드가 표시됩니다.</p>
                                    )}
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="pin-note-stack">
                                {(!useImageHeroCard || hasTextPreview) && <p className="pin-title">{getNoteTitle(note.content)}</p>}

                                {selected ? (
                                  <>
                                    {attachedImageUrl && (
                                      <div className="editor-image-preview">
                                        <img
                                          className="editor-image-preview-media"
                                          src={getImageProxyUrl(attachedImageUrl)}
                                          alt={getNoteTitle(note.content)}
                                        />
                                      </div>
                                    )}
                                    <textarea
                                      className="pin-editor"
                                      value={note.content}
                                      style={{ fontSize: `${fontSize}px` }}
                                      onMouseDown={(event) => event.stopPropagation()}
                                      onPaste={(event) => {
                                        void onEditorPaste(note, event);
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
                                    {previewUrl && !hasImagePreview &&
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
                                            <span className="link-preview-site">
                                              {linkPreview.siteName || linkPreview.hostname}
                                            </span>
                                            <span className="link-preview-title">{linkPreview.title}</span>
                                            {linkPreview.description && (
                                              <span className="link-preview-description">{linkPreview.description}</span>
                                            )}
                                          </span>
                                        </a>
                                      ) : (
                                        <a
                                          className="link-chip"
                                          href={previewUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(event) => event.stopPropagation()}
                                        >
                                          {previewUrl}
                                        </a>
                                      ))}
                                    {(!useImageHeroCard || hasTextPreview) && (
                                      <p className="pin-body-preview" style={{ fontSize: `${fontSize}px` }}>
                                        {previewText || (previewUrl ? getUrlSnippet(previewUrl) : "메모를 클릭해서 편집하세요.")}
                                      </p>
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
