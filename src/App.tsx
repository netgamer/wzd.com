import { type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import { type BoardBackgroundStyle, type BoardV2, loadOrCreateBoardV2, type NoteColor, type NoteV2, saveBoardV2 } from "./lib/supabase-board-v2";

interface UserProfile {
  id: string;
  email: string;
}

interface LocalSnapshot {
  board: BoardV2;
  notes: NoteV2[];
}

interface DragState {
  noteId: string;
  offsetX: number;
  offsetY: number;
}

type LayoutMode = "free" | "organize";
type NoteFontSize = 14 | 16 | 18 | 20;

const LOCAL_STORAGE_KEY = "wzd-board-v2-local";
const DEFAULT_NOTE_WIDTH = 240;
const DEFAULT_NOTE_HEIGHT = 220;
const MOBILE_BREAKPOINT = 760;
const DEFAULT_FREE_CANVAS_HEIGHT = 980;
const MOBILE_FREE_CANVAS_HEIGHT = 1700;
const FREE_CANVAS_BOTTOM_PADDING = 280;
const INITIAL_VISIBLE_NOTE_COUNT = 24;
const VISIBLE_NOTE_BATCH_SIZE = 16;
const DEFAULT_FONT_SIZE: NoteFontSize = 16;

const NOTE_COLORS: { id: NoteColor; label: string }[] = [
  { id: "yellow", label: "노랑" },
  { id: "pink", label: "핑크" },
  { id: "blue", label: "블루" },
  { id: "green", label: "그린" },
  { id: "orange", label: "오렌지" },
  { id: "purple", label: "보라" },
  { id: "mint", label: "민트" },
  { id: "white", label: "화이트" }
];

const NOTE_FONT_SIZES: { value: NoteFontSize; label: string }[] = [
  { value: 14, label: "S" },
  { value: 16, label: "M" },
  { value: 18, label: "L" },
  { value: 20, label: "XL" }
];

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowIso = () => new Date().toISOString();

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const clampNotePosition = (
  x: number,
  y: number,
  w: number,
  h: number,
  canvas: HTMLDivElement
): { x: number; y: number } => {
  const maxX = Math.max(0, canvas.clientWidth - w);
  const maxY = Math.max(0, canvas.clientHeight - h);
  return {
    x: clamp(Math.round(x), 0, maxX),
    y: clamp(Math.round(y), 0, maxY)
  };
};

const createDefaultBoard = (userId: string): BoardV2 => ({
  id: makeId(),
  userId,
  title: "My Board",
  description: "",
  backgroundStyle: "cork",
  settings: {},
  updatedAt: nowIso()
});

const createNote = (params: {
  boardId: string;
  userId: string;
  zIndex: number;
  x: number;
  y: number;
  content?: string;
  color?: NoteColor;
}): NoteV2 => ({
  id: makeId(),
  boardId: params.boardId,
  userId: params.userId,
  content: params.content ?? "",
  color: params.color ?? "yellow",
  x: Math.round(params.x),
  y: Math.round(params.y),
  w: DEFAULT_NOTE_WIDTH,
  h: DEFAULT_NOTE_HEIGHT,
  zIndex: params.zIndex,
  rotation: 0,
  pinned: false,
  archived: false,
  metadata: { fontSize: DEFAULT_FONT_SIZE },
  updatedAt: nowIso()
});

const createDefaultSnapshot = (): LocalSnapshot => {
  const board = createDefaultBoard("local");
  const firstNote = createNote({
    boardId: board.id,
    userId: "local",
    zIndex: 1,
    x: 120,
    y: 120,
    content: "메모 길이에 따라 카드 높이가 자연스럽게 늘어나는 핀터레스트형 보드입니다.",
    color: "yellow"
  });
  const secondNote = createNote({
    boardId: board.id,
    userId: "local",
    zIndex: 2,
    x: 410,
    y: 180,
    content: "정리 모드에서는 카드 너비가 고정되고, 드래그해서 순서를 바꿀 수 있습니다.",
    color: "mint"
  });
  return { board, notes: [firstNote, secondNote] };
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
    const parsed = JSON.parse(raw) as LocalSnapshot;
    if (!parsed?.board?.id || !Array.isArray(parsed.notes)) {
      return createDefaultSnapshot();
    }
    return parsed;
  } catch {
    return createDefaultSnapshot();
  }
};

const saveLocalSnapshot = (snapshot: LocalSnapshot) => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(snapshot));
};

const getNoteFontSize = (note: NoteV2): NoteFontSize => {
  const value = note.metadata?.fontSize;
  return value === 14 || value === 16 || value === 18 || value === 20 ? value : DEFAULT_FONT_SIZE;
};

const reorderNotes = (notes: NoteV2[], draggedNoteId: string, targetNoteId?: string): NoteV2[] => {
  const activeNotes = [...notes.filter((note) => !note.archived)].sort((a, b) => a.zIndex - b.zIndex);
  const archivedNotes = notes.filter((note) => note.archived);
  const sourceIndex = activeNotes.findIndex((note) => note.id === draggedNoteId);

  if (sourceIndex < 0) {
    return notes;
  }

  const [moved] = activeNotes.splice(sourceIndex, 1);

  if (targetNoteId) {
    const targetIndex = activeNotes.findIndex((note) => note.id === targetNoteId);
    if (targetIndex >= 0) {
      activeNotes.splice(targetIndex, 0, moved);
    } else {
      activeNotes.push(moved);
    }
  } else {
    activeNotes.push(moved);
  }

  const activeMap = new Map(
    activeNotes.map((note, index) => [
      note.id,
      {
        ...note,
        zIndex: index + 1,
        updatedAt: nowIso()
      }
    ])
  );

  return notes.map((note) => activeMap.get(note.id) ?? archivedNotes.find((item) => item.id === note.id) ?? note);
};

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [board, setBoard] = useState<BoardV2>(() => createDefaultSnapshot().board);
  const [notes, setNotes] = useState<NoteV2[]>(() => createDefaultSnapshot().notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState("로컬 모드");
  const [syncError, setSyncError] = useState("");
  const [draggingNoteId, setDraggingNoteId] = useState<string | null>(null);
  const [organizeDragNoteId, setOrganizeDragNoteId] = useState<string | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("organize");
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth <= MOBILE_BREAKPOINT : false
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [visibleNoteCount, setVisibleNoteCount] = useState(INITIAL_VISIBLE_NOTE_COUNT);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const skipNextCloudSaveRef = useRef(false);
  const cloudEnabled = Boolean(user?.id && supabase);
  const isOrganizeMode = layoutMode === "organize";

  const activeNotes = useMemo(() => notes.filter((note) => !note.archived), [notes]);
  const trashNotes = useMemo(
    () => [...notes.filter((note) => note.archived)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes]
  );
  const selectedNote = useMemo(
    () => activeNotes.find((note) => note.id === selectedNoteId) ?? null,
    [activeNotes, selectedNoteId]
  );
  const isToolbarVisible = !isMobileViewport || mobileMenuOpen;
  const freeCanvasHeight = useMemo(() => {
    const minHeight = isMobileViewport ? MOBILE_FREE_CANVAS_HEIGHT : DEFAULT_FREE_CANVAS_HEIGHT;
    const maxBottom = activeNotes.reduce((max, note) => Math.max(max, note.y + note.h), 0);
    return Math.max(minHeight, maxBottom + FREE_CANVAS_BOTTOM_PADDING);
  }, [activeNotes, isMobileViewport]);

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? activeNotes.filter((note) => note.content.toLowerCase().includes(keyword))
      : activeNotes;
    return [...filtered].sort((a, b) => a.zIndex - b.zIndex);
  }, [activeNotes, search]);

  const visibleNotes = useMemo(
    () => (isOrganizeMode ? filteredNotes.slice(0, visibleNoteCount) : filteredNotes),
    [filteredNotes, isOrganizeMode, visibleNoteCount]
  );
  const hasMoreVisibleNotes = isOrganizeMode && visibleNoteCount < filteredNotes.length;

  useEffect(() => {
    if (!supabase) {
      const local = loadLocalSnapshot();
      setBoard(local.board);
      setNotes(local.notes);
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
      setBoard(local.board);
      setNotes(local.notes);
      setSyncMessage("로컬 모드");
      setSyncError("");
      setLoading(false);
      return;
    }

    setLoading(true);
    loadOrCreateBoardV2(user.id)
      .then((payload) => {
        if (!active) {
          return;
        }
        skipNextCloudSaveRef.current = true;
        setBoard(payload.board);
        setNotes(payload.notes);
        setSelectedNoteId(payload.notes.find((note) => !note.archived)?.id ?? null);
        setSyncMessage("클라우드 동기화 연결됨");
        setSyncError("");
        setLoading(false);
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        const message = error instanceof Error ? error.message : "클라우드 보드 불러오기에 실패했습니다";
        setSyncError(message);
        setSyncMessage("로컬 모드로 동작 중");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (cloudEnabled) {
      return;
    }
    saveLocalSnapshot({ board, notes });
  }, [board, cloudEnabled, notes]);

  useEffect(() => {
    if (!selectedNoteId) {
      return;
    }
    const exists = activeNotes.some((note) => note.id === selectedNoteId);
    if (!exists) {
      setSelectedNoteId(activeNotes[0]?.id ?? null);
    }
  }, [activeNotes, selectedNoteId]);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
      setIsMobileViewport(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!cloudEnabled || !user?.id) {
      return;
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      setSyncMessage("저장 중...");
      void saveBoardV2({ board, notes })
        .then(() => {
          setSyncMessage("클라우드 저장 완료");
          setSyncError("");
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "저장 실패";
          setSyncError(message);
          setSyncMessage("클라우드 저장 실패");
        });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [board, cloudEnabled, notes, user?.id]);

  useEffect(() => {
    if (isOrganizeMode) {
      return;
    }

    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const canvas = canvasRef.current;
      if (!drag || !canvas) {
        return;
      }
      const rect = canvas.getBoundingClientRect();
      const rawX = event.clientX - rect.left - drag.offsetX;
      const rawY = event.clientY - rect.top - drag.offsetY;

      setNotes((prev) =>
        prev.map((note) => {
          if (note.id !== drag.noteId) {
            return note;
          }
          const clamped = clampNotePosition(rawX, rawY, note.w, note.h, canvas);
          return { ...note, x: clamped.x, y: clamped.y, updatedAt: nowIso() };
        })
      );
    };

    const onPointerUp = () => {
      dragRef.current = null;
      setDraggingNoteId(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [isOrganizeMode]);

  useEffect(() => {
    if (!isOrganizeMode) {
      return;
    }
    dragRef.current = null;
    setDraggingNoteId(null);
  }, [isOrganizeMode]);

  useEffect(() => {
    const clampAllActiveNotes = () => {
      const canvas = canvasRef.current;
      if (!canvas || isOrganizeMode) {
        return;
      }
      setNotes((prev) => {
        let changed = false;
        const next = prev.map((note) => {
          if (note.archived) {
            return note;
          }
          const clamped = clampNotePosition(note.x, note.y, note.w, note.h, canvas);
          if (clamped.x === note.x && clamped.y === note.y) {
            return note;
          }
          changed = true;
          return { ...note, x: clamped.x, y: clamped.y, updatedAt: nowIso() };
        });
        return changed ? next : prev;
      });
    };

    const frame = window.requestAnimationFrame(clampAllActiveNotes);
    window.addEventListener("resize", clampAllActiveNotes);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", clampAllActiveNotes);
    };
  }, [isOrganizeMode, loading]);

  useEffect(() => {
    if (!isOrganizeMode) {
      return;
    }

    setVisibleNoteCount((prev) => {
      if (filteredNotes.length <= INITIAL_VISIBLE_NOTE_COUNT) {
        return filteredNotes.length;
      }
      return Math.max(INITIAL_VISIBLE_NOTE_COUNT, Math.min(prev, filteredNotes.length));
    });
  }, [filteredNotes.length, isOrganizeMode]);

  useEffect(() => {
    if (!isOrganizeMode) {
      return;
    }

    const onScroll = () => {
      if (!hasMoreVisibleNotes) {
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
  }, [filteredNotes.length, hasMoreVisibleNotes, isOrganizeMode]);

  useEffect(() => {
    if (!isOrganizeMode) {
      return;
    }

    const editors = document.querySelectorAll<HTMLTextAreaElement>(".organized-editor");
    editors.forEach((editor) => {
      editor.style.height = "0px";
      editor.style.height = `${editor.scrollHeight}px`;
    });
  }, [isOrganizeMode, visibleNotes]);

  const bringToFront = (noteId: string) => {
    setNotes((prev) => {
      const maxZ = prev.reduce((max, note) => Math.max(max, note.zIndex), 0);
      return prev.map((note) =>
        note.id === noteId && note.zIndex !== maxZ
          ? {
              ...note,
              zIndex: maxZ + 1,
              updatedAt: nowIso()
            }
          : note
      );
    });
  };

  const addNote = (x?: number, y?: number) => {
    const maxZ = notes.reduce((max, note) => Math.max(max, note.zIndex), 0);
    const fallbackX = 120 + (notes.length % 4) * 36;
    const fallbackY = 110 + (notes.length % 4) * 30;
    const baseX = x ?? fallbackX;
    const baseY = y ?? fallbackY;
    const canvas = canvasRef.current;
    const clamped = canvas && !isOrganizeMode
      ? clampNotePosition(baseX, baseY, DEFAULT_NOTE_WIDTH, DEFAULT_NOTE_HEIGHT, canvas)
      : { x: baseX, y: baseY };

    const newNote = createNote({
      boardId: board.id,
      userId: board.userId,
      zIndex: maxZ + 1,
      x: clamped.x,
      y: clamped.y
    });
    setNotes((prev) => [...prev, newNote]);
    setSelectedNoteId(newNote.id);
    if (isOrganizeMode) {
      setVisibleNoteCount((prev) => Math.max(prev, Math.min(filteredNotes.length + 1, prev + 1)));
    }
  };

  const updateNote = (noteId: string, patch: Partial<NoteV2>) => {
    const canvas = canvasRef.current;
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) {
          return note;
        }
        const merged = { ...note, ...patch };
        if (canvas && !isOrganizeMode) {
          const clamped = clampNotePosition(merged.x, merged.y, merged.w, merged.h, canvas);
          return { ...merged, x: clamped.x, y: clamped.y, updatedAt: nowIso() };
        }
        return { ...merged, updatedAt: nowIso() };
      })
    );
  };

  const updateNoteFontSize = (noteId: string, fontSize: NoteFontSize) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              metadata: {
                ...note.metadata,
                fontSize
              },
              updatedAt: nowIso()
            }
          : note
      )
    );
  };

  const removeNote = (noteId: string) => {
    setNotes((prev) => prev.map((note) => (note.id === noteId ? { ...note, archived: true, updatedAt: nowIso() } : note)));
    setSelectedNoteId((prev) => (prev === noteId ? null : prev));
  };

  const restoreNote = (noteId: string) => {
    const maxZ = notes.reduce((max, note) => Math.max(max, note.zIndex), 0);
    const canvas = canvasRef.current;
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...(canvas && !isOrganizeMode ? clampNotePosition(note.x, note.y, note.w, note.h, canvas) : {}),
              archived: false,
              zIndex: maxZ + 1,
              updatedAt: nowIso()
            }
          : note
      )
    );
    setSelectedNoteId(noteId);
  };

  const permanentlyDeleteNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
    setSelectedNoteId((prev) => (prev === noteId ? null : prev));
  };

  const emptyTrash = () => {
    setNotes((prev) => prev.filter((note) => !note.archived));
  };

  const onCanvasDoubleClick = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (isOrganizeMode) {
      addNote();
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      addNote();
      return;
    }
    const rect = canvas.getBoundingClientRect();
    addNote(event.clientX - rect.left - DEFAULT_NOTE_WIDTH / 2, event.clientY - rect.top - 42);
  };

  const onNoteHandlePointerDown = (event: ReactPointerEvent<HTMLDivElement>, note: NoteV2) => {
    event.preventDefault();
    if (note.pinned || isOrganizeMode) {
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    dragRef.current = {
      noteId: note.id,
      offsetX: event.clientX - rect.left - note.x,
      offsetY: event.clientY - rect.top - note.y
    };
    setDraggingNoteId(note.id);
    setSelectedNoteId(note.id);
    bringToFront(note.id);
  };

  const onOrganizeDragStart = (event: ReactDragEvent<HTMLElement>, noteId: string) => {
    if (!isOrganizeMode) {
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", noteId);
    setOrganizeDragNoteId(noteId);
    setSelectedNoteId(noteId);
  };

  const onOrganizeDrop = (event: ReactDragEvent<HTMLElement>, targetNoteId?: string) => {
    if (!isOrganizeMode) {
      return;
    }
    event.preventDefault();
    const draggedNoteId = event.dataTransfer.getData("text/plain") || organizeDragNoteId;
    if (!draggedNoteId || draggedNoteId === targetNoteId) {
      setOrganizeDragNoteId(null);
      return;
    }
    setNotes((prev) => reorderNotes(prev, draggedNoteId, targetNoteId));
    setOrganizeDragNoteId(null);
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

  const onToggleInspector = () => {
    setShowInspector((prev) => !prev);
  };

  const onToggleLayoutMode = () => {
    setLayoutMode((prev) => (prev === "organize" ? "free" : "organize"));
  };

  const onToggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const onCanvasBackgroundMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) {
      return;
    }
    setSelectedNoteId(null);
    setShowInspector(false);
  };

  return (
    <div className="board-app">
      <header className="board-topbar">
        <div className="topbar-main">
          <div className="brand">
            <span className="logo">WZD</span>
            <span className="brand-subtitle">Pinterest Notes</span>
          </div>
          <button className="mobile-menu-btn" onClick={onToggleMobileMenu} aria-label="메뉴 열기/닫기">
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>

        <div className={`toolbar ${isToolbarVisible ? "open" : "closed"}`}>
          <button className="primary-btn" onClick={() => addNote()}>
            + 메모 추가
          </button>
          <button className={`ghost-btn ${isOrganizeMode ? "active-mode-btn" : ""}`} onClick={onToggleLayoutMode}>
            {isOrganizeMode ? "자유배치" : "핀터레스트"}
          </button>
          <button
            className={`rainbow-btn ${showInspector ? "active" : ""}`}
            onClick={onToggleInspector}
            aria-label="메모 설정 열기"
            title="메모 설정"
          >
            <span className="rainbow-dot" aria-hidden="true" />
          </button>
          <button className="ghost-btn" onClick={() => setTrashOpen((prev) => !prev)}>
            휴지통 {trashNotes.length > 0 ? `(${trashNotes.length})` : ""}
          </button>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="메모 검색"
          />
          <input
            className="board-title-input"
            value={board.title}
            onChange={(event) => setBoard((prev) => ({ ...prev, title: event.target.value, updatedAt: nowIso() }))}
            placeholder="보드 이름"
            aria-label="보드 이름"
          />
          <select
            className="style-select"
            value={board.backgroundStyle}
            onChange={(event) =>
              setBoard((prev) => ({
                ...prev,
                backgroundStyle: event.target.value as BoardBackgroundStyle,
                updatedAt: nowIso()
              }))
            }
          >
            <option value="cork">코르크</option>
            <option value="whiteboard">화이트보드</option>
            <option value="paper">페이퍼</option>
          </select>
          {hasSupabaseConfig ? (
            user ? (
              <>
                <span className="user-email">{user.email}</span>
                <button className="ghost-btn" onClick={onLogout}>
                  로그아웃
                </button>
              </>
            ) : (
              <button className="ghost-btn" onClick={onGoogleLogin}>
                구글 로그인
              </button>
            )
          ) : (
            <span className="hint-text">Supabase 환경변수를 설정하면 클라우드 동기화를 사용할 수 있습니다.</span>
          )}
        </div>
      </header>

      <main className={`workspace ${showInspector ? "inspector-open" : "inspector-hidden"}`}>
        <section className="canvas-wrap">
          <div
            ref={canvasRef}
            className={`board-canvas canvas-${board.backgroundStyle} ${isOrganizeMode ? "organize-mode" : "free-mode"}`}
            style={!isOrganizeMode ? { height: `${freeCanvasHeight}px` } : undefined}
            onMouseDown={onCanvasBackgroundMouseDown}
            onDoubleClick={onCanvasDoubleClick}
            onDragOver={(event) => {
              if (isOrganizeMode) {
                event.preventDefault();
              }
            }}
            onDrop={(event) => onOrganizeDrop(event)}
            aria-label="메모 보드 캔버스"
          >
            {loading ? (
              <div className="canvas-empty">보드를 불러오는 중...</div>
            ) : visibleNotes.length === 0 ? (
              <div className="canvas-empty">새 메모를 추가해보세요.</div>
            ) : (
              visibleNotes.map((note) => {
                const selected = selectedNoteId === note.id;
                return (
                  <article
                    key={note.id}
                    className={`sticky-note note-${note.color} ${selected ? "selected" : ""} ${
                      draggingNoteId === note.id || organizeDragNoteId === note.id ? "dragging" : ""
                    } ${isOrganizeMode ? "organized-note" : ""}`}
                    style={
                      isOrganizeMode
                        ? {
                            zIndex: note.zIndex
                          }
                        : {
                            left: `${note.x}px`,
                            top: `${note.y}px`,
                            width: `${note.w}px`,
                            height: `${note.h}px`,
                            zIndex: note.zIndex,
                            transform: `rotate(${note.rotation}deg)`
                          }
                    }
                    draggable={isOrganizeMode}
                    onDragStart={(event) => onOrganizeDragStart(event, note.id)}
                    onDragEnd={() => setOrganizeDragNoteId(null)}
                    onDragOver={(event) => {
                      if (isOrganizeMode) {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => onOrganizeDrop(event, note.id)}
                    onMouseDown={() => {
                      setSelectedNoteId(note.id);
                      setShowInspector(true);
                      if (!isOrganizeMode) {
                        bringToFront(note.id);
                      }
                    }}
                  >
                    <div className="sticky-handle" onPointerDown={(event) => onNoteHandlePointerDown(event, note)}>
                      <span>{isOrganizeMode ? "드래그해서 순서 변경" : note.pinned ? "고정됨" : "드래그해서 이동"}</span>
                      <div className="note-actions">
                        <button
                          className="icon-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateNote(note.id, { pinned: !note.pinned });
                          }}
                        >
                          {note.pinned ? "핀 해제" : "핀 고정"}
                        </button>
                        <button
                          className="icon-btn danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            removeNote(note.id);
                          }}
                        >
                          휴지통
                        </button>
                      </div>
                    </div>
                    <textarea
                      className={`sticky-editor ${isOrganizeMode ? "organized-editor" : ""}`}
                      value={note.content}
                      style={{ fontSize: `${getNoteFontSize(note)}px` }}
                      onFocus={() => {
                        setSelectedNoteId(note.id);
                        setShowInspector(true);
                      }}
                      onChange={(event) => {
                        updateNote(note.id, { content: event.target.value });
                        if (isOrganizeMode) {
                          event.currentTarget.style.height = "0px";
                          event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                        }
                      }}
                      placeholder="메모를 입력하세요..."
                      rows={isOrganizeMode ? 1 : undefined}
                    />
                  </article>
                );
              })
            )}
          </div>

          {isOrganizeMode && (
            <div className="infinite-scroll-status" aria-live="polite">
              {hasMoreVisibleNotes ? "아래로 스크롤하면 메모가 계속 로드됩니다." : `${filteredNotes.length}개의 메모가 모두 표시되었습니다.`}
            </div>
          )}
        </section>

        {showInspector && (
          <aside className="inspector">
            <h2>메모 설정</h2>
            {selectedNote ? (
              <>
                <p className="inspector-line">
                  선택된 메모: <strong>{selectedNote.id.slice(0, 8)}</strong>
                </p>

                <div className="palette-grid">
                  {NOTE_COLORS.map((item) => (
                    <button
                      key={item.id}
                      className={`color-chip chip-${item.id} ${selectedNote.color === item.id ? "active" : ""}`}
                      onClick={() => updateNote(selectedNote.id, { color: item.id })}
                      aria-label={`${item.label} 색상`}
                    />
                  ))}
                </div>

                <div className="size-row">
                  {NOTE_FONT_SIZES.map((sizeOption) => (
                    <button
                      key={sizeOption.value}
                      className={`ghost-btn ${getNoteFontSize(selectedNote) === sizeOption.value ? "active-font-btn" : ""}`}
                      onClick={() => updateNoteFontSize(selectedNote.id, sizeOption.value)}
                    >
                      {sizeOption.label}
                    </button>
                  ))}
                </div>
                <p className="inspector-line">폰트 크기: {getNoteFontSize(selectedNote)}px</p>
              </>
            ) : (
              <p className="inspector-line">메모를 선택하면 색상과 크기를 바꿀 수 있습니다.</p>
            )}

            <hr />
            <p className="inspector-line">저장 상태: {syncMessage}</p>
            {syncError && <p className="error-text">오류: {syncError}</p>}
            <p className="inspector-line">활성 노트: {activeNotes.length}</p>
            <p className="inspector-line">휴지통: {trashNotes.length}</p>

            {trashOpen && (
              <>
                <hr />
                <div className="trash-header">
                  <h3>휴지통</h3>
                  <button className="icon-btn danger" onClick={emptyTrash} disabled={trashNotes.length === 0}>
                    비우기
                  </button>
                </div>
                {trashNotes.length === 0 ? (
                  <p className="inspector-line">휴지통이 비어 있습니다.</p>
                ) : (
                  <ul className="trash-list">
                    {trashNotes.map((note) => (
                      <li key={note.id} className="trash-item">
                        <span>{note.content.trim() ? note.content.slice(0, 28) : "(내용 없음)"}</span>
                        <div className="trash-actions">
                          <button className="icon-btn" onClick={() => restoreNote(note.id)}>
                            복구
                          </button>
                          <button className="icon-btn danger" onClick={() => permanentlyDeleteNote(note.id)}>
                            삭제
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </aside>
        )}
      </main>
    </div>
  );
};

export default App;
