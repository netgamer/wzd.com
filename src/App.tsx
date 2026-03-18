import {
  type DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
import {
  type BoardV2,
  loadOrCreateBoardV2,
  type NoteColor,
  type NoteV2,
  saveBoardV2
} from "./lib/supabase-board-v2";

interface UserProfile {
  id: string;
  email: string;
}

interface LocalSnapshot {
  board: BoardV2;
  notes: NoteV2[];
}

type NoteFontSize = 14 | 16 | 18 | 20;
type FeedMode = "active" | "archived";

const LOCAL_STORAGE_KEY = "wzd-board-v2-local";
const INITIAL_VISIBLE_NOTE_COUNT = 24;
const VISIBLE_NOTE_BATCH_SIZE = 16;
const DEFAULT_FONT_SIZE: NoteFontSize = 16;

const NOTE_COLORS: NoteColor[] = ["yellow", "pink", "blue", "green", "orange", "purple", "mint", "white"];

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10);

const nowIso = () => new Date().toISOString();

const createDefaultBoard = (userId: string): BoardV2 => ({
  id: makeId(),
  userId,
  title: "My Board",
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
  h: 0,
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
    color: "yellow",
    content:
      "개인 메모장\n\n간단한 메모, 북마크, 이미지 URL을 한곳에 모아두는 용도입니다.\nhttps://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80"
  });
  const secondNote = createNote({
    boardId: board.id,
    userId: "local",
    zIndex: 2,
    color: "mint",
    content:
      "그룹 메모장\n\n주제별 그룹 보드에서 각자 찾은 링크를 함께 공유할 수 있습니다.\n예: AI Studio 레퍼런스 모음"
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
  const ordered = [...notes.filter((note) => !note.archived)].sort((a, b) => a.zIndex - b.zIndex);
  const archived = notes.filter((note) => note.archived);
  const sourceIndex = ordered.findIndex((note) => note.id === draggedNoteId);

  if (sourceIndex < 0) {
    return notes;
  }

  const [moved] = ordered.splice(sourceIndex, 1);

  if (targetNoteId) {
    const targetIndex = ordered.findIndex((note) => note.id === targetNoteId);
    if (targetIndex >= 0) {
      ordered.splice(targetIndex, 0, moved);
    } else {
      ordered.push(moved);
    }
  } else {
    ordered.push(moved);
  }

  const activeMap = new Map(
    ordered.map((note, index) => [
      note.id,
      {
        ...note,
        zIndex: index + 1,
        updatedAt: nowIso()
      }
    ])
  );

  return [...ordered.map((note) => activeMap.get(note.id) ?? note), ...archived];
};

const extractFirstUrl = (content: string) => {
  const match = content.match(/https?:\/\/\S+/i);
  return match?.[0] ?? "";
};

const isImageUrl = (url: string) =>
  /(\.png|\.jpe?g|\.gif|\.webp|\.avif|\.svg)(\?.*)?$/i.test(url) || url.includes("images.unsplash.com");

const stripUrls = (content: string) => content.replace(/https?:\/\/\S+/gi, "").trim();

const getNoteTitle = (content: string) => {
  const cleaned = stripUrls(content);
  const firstLine = cleaned.split("\n").find((line) => line.trim().length > 0) ?? "새 메모";
  return firstLine.slice(0, 48);
};

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [board, setBoard] = useState<BoardV2>(() => createDefaultSnapshot().board);
  const [notes, setNotes] = useState<NoteV2[]>(() => createDefaultSnapshot().notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningDragNoteId, setRunningDragNoteId] = useState<string | null>(null);
  const [visibleNoteCount, setVisibleNoteCount] = useState(INITIAL_VISIBLE_NOTE_COUNT);
  const [feedMode, setFeedMode] = useState<FeedMode>("active");

  const skipNextCloudSaveRef = useRef(false);

  const activeNotes = useMemo(() => notes.filter((note) => !note.archived), [notes]);
  const archivedNotes = useMemo(() => notes.filter((note) => note.archived), [notes]);
  const currentNotes = feedMode === "active" ? activeNotes : archivedNotes;

  const filteredNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const base = [...currentNotes].sort((a, b) => a.zIndex - b.zIndex);
    if (!keyword) {
      return base;
    }
    return base.filter((note) => note.content.toLowerCase().includes(keyword));
  }, [currentNotes, feedMode, search]);

  const visibleNotes = useMemo(
    () => filteredNotes.slice(0, visibleNoteCount),
    [filteredNotes, visibleNoteCount]
  );

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
        setLoading(false);
      })
      .catch(() => {
        if (!active) {
          return;
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !supabase) {
      saveLocalSnapshot({ board, notes });
      return;
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void saveBoardV2({ board, notes }).catch(() => {});
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [board, notes, user?.id]);

  useEffect(() => {
    setVisibleNoteCount((prev) => {
      if (filteredNotes.length <= INITIAL_VISIBLE_NOTE_COUNT) {
        return filteredNotes.length;
      }
      return Math.max(INITIAL_VISIBLE_NOTE_COUNT, Math.min(prev, filteredNotes.length));
    });
  }, [filteredNotes.length, feedMode]);

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

  const addNote = () => {
    const maxZ = notes.reduce((max, note) => Math.max(max, note.zIndex), 0);
    const note = createNote({
      boardId: board.id,
      userId: board.userId,
      zIndex: maxZ + 1,
      content: "새 메모\n\nhttps://"
    });

    setNotes((prev) => [note, ...prev]);
    setFeedMode("active");
    setSelectedNoteId(note.id);
    setVisibleNoteCount((prev) => Math.max(prev, 1));
  };

  const updateNote = (noteId: string, patch: Partial<NoteV2>) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              ...patch,
              updatedAt: nowIso()
            }
          : note
      )
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

  const archiveNote = (noteId: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              archived: true,
              updatedAt: nowIso()
            }
          : note
      )
    );
    setSelectedNoteId(null);
  };

  const restoreNote = (noteId: string) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId
          ? {
              ...note,
              archived: false,
              updatedAt: nowIso()
            }
          : note
      )
    );
    setFeedMode("active");
    setSelectedNoteId(noteId);
  };

  const deleteArchivedNote = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId));
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

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", noteId);
    setRunningDragNoteId(noteId);
    setSelectedNoteId(noteId);
  };

  const onPinDrop = (event: ReactDragEvent<HTMLElement>, targetNoteId?: string) => {
    if (feedMode !== "active") {
      return;
    }

    event.preventDefault();
    const draggedNoteId = event.dataTransfer.getData("text/plain") || runningDragNoteId;
    if (!draggedNoteId || draggedNoteId === targetNoteId) {
      setRunningDragNoteId(null);
      return;
    }

    setNotes((prev) => reorderNotes(prev, draggedNoteId, targetNoteId));
    setRunningDragNoteId(null);
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

  return (
    <div className="pin-page">
      <aside className="pin-sidebar">
        <button className="pin-brand" aria-label="WZD 홈">
          <span>W</span>
        </button>
        <button
          className={`side-icon ${feedMode === "active" ? "active" : ""}`}
          onClick={() => setFeedMode("active")}
          aria-label="메모 피드"
        >
          ■
        </button>
        <button className="side-icon" onClick={addNote} aria-label="새 메모">
          +
        </button>
        <button
          className={`side-icon ${feedMode === "archived" ? "active" : ""}`}
          onClick={() => setFeedMode("archived")}
          aria-label="보관된 메모"
        >
          □
        </button>
        <div className="sidebar-spacer" />
        <button className="side-icon subtle" aria-label="설정">
          ···
        </button>
      </aside>

      <div className="pin-app">
        <header className="pin-topbar">
          <div className="search-shell">
            <span className="search-icon" aria-hidden="true">
              ⌕
            </span>
            <input
              className="search-input pinterest-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={feedMode === "active" ? "내 메모와 링크 검색" : "보관된 메모 검색"}
            />
          </div>

          <div className="topbar-actions">
            <button className="new-note-pill" onClick={addNote}>
              새 메모
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

        <main className="pin-main">
          <section className="feed-head">
            <div>
              <p className="feed-kicker">{feedMode === "active" ? "Personal + Group Memo" : "Archive"}</p>
              <h1>{feedMode === "active" ? board.title || "My Board" : "보관된 메모"}</h1>
            </div>
            <div className="feed-meta">
              <span>{feedMode === "active" ? `${activeNotes.length}개의 핀` : `${archivedNotes.length}개의 보관 메모`}</span>
            </div>
          </section>

          <section
            className="pin-board"
            onMouseDown={onBoardBackgroundMouseDown}
            onDragOver={(event) => {
              if (feedMode === "active") {
                event.preventDefault();
              }
            }}
            onDrop={(event) => onPinDrop(event)}
          >
            {loading ? (
              <div className="feed-empty">메모를 불러오는 중입니다.</div>
            ) : visibleNotes.length === 0 ? (
              <div className="feed-empty">
                {feedMode === "active" ? "첫 메모를 추가해보세요." : "보관된 메모가 없습니다."}
              </div>
            ) : (
              visibleNotes.map((note) => {
                const selected = selectedNoteId === note.id;
                const fontSize = getNoteFontSize(note);
                const previewUrl = extractFirstUrl(note.content);
                const previewText = stripUrls(note.content);

                return (
                  <article
                    key={note.id}
                    className={`pin-card note-${note.color} ${selected ? "selected" : ""} ${
                      runningDragNoteId === note.id ? "dragging" : ""
                    }`}
                    draggable={feedMode === "active"}
                    onDragStart={(event) => onPinDragStart(event, note.id)}
                    onDragEnd={() => setRunningDragNoteId(null)}
                    onDragOver={(event) => {
                      if (feedMode === "active") {
                        event.preventDefault();
                      }
                    }}
                    onDrop={(event) => onPinDrop(event, note.id)}
                    onMouseDown={() => setSelectedNoteId(note.id)}
                  >
                    {previewUrl && isImageUrl(previewUrl) && (
                      <div className="pin-image-wrap">
                        <img className="pin-image" src={previewUrl} alt={getNoteTitle(note.content)} />
                      </div>
                    )}

                    <div className="pin-card-head">
                      <span className="pin-dot chip-badge">{note.color}</span>
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
                          {feedMode === "active" ? (note.pinned ? "P" : "p") : "R"}
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
                          aria-label={feedMode === "active" ? "메모 보관" : "메모 삭제"}
                          title={feedMode === "active" ? "메모 보관" : "메모 삭제"}
                        >
                          {feedMode === "active" ? "X" : "D"}
                        </button>
                      </div>
                    </div>

                    <div className="pin-card-body">
                      <p className="pin-title">{getNoteTitle(note.content)}</p>

                      {selected ? (
                        <>
                          <div className="font-scale">
                            {[14, 16, 18, 20].map((size) => (
                              <button
                                key={size}
                                className={`font-chip ${fontSize === size ? "active" : ""}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  updateNoteFontSize(note.id, size as NoteFontSize);
                                }}
                              >
                                {size}
                              </button>
                            ))}
                          </div>
                          <textarea
                            className="pin-editor"
                            value={note.content}
                            style={{ fontSize: `${fontSize}px` }}
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
                          {previewUrl && !isImageUrl(previewUrl) && (
                            <a
                              className="link-chip"
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(event) => event.stopPropagation()}
                            >
                              {previewUrl}
                            </a>
                          )}
                          <p className="pin-body-preview" style={{ fontSize: `${fontSize}px` }}>
                            {previewText || "메모를 클릭해서 편집하세요."}
                          </p>
                        </>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </section>

          <div className="infinite-scroll-status" aria-live="polite">
            {visibleNoteCount < filteredNotes.length
              ? "아래로 스크롤하면 메모가 계속 로드됩니다."
              : `${filteredNotes.length}개의 메모가 표시되었습니다.`}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
