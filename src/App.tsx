import {
  type DragEvent as ReactDragEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { hasSupabaseConfig, supabase } from "./lib/supabase";
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
  const notes = [
    createNote({
      boardId: board.id,
      userId: "local",
      zIndex: 1,
      color: "yellow",
      content:
        "개인 메모장\n\n간단한 메모, 북마크, 이미지 URL을 모아두는 공간입니다.\nhttps://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=80"
    }),
    createNote({
      boardId: board.id,
      userId: "local",
      zIndex: 2,
      color: "mint",
      content:
        "그룹 메모장\n\n주제별 보드에서 각자 찾은 링크와 자료를 함께 공유해보세요.\n예: AI Studio 레퍼런스 모음"
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
    return migrateLocalSnapshot(raw);
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

  const sourceIndex = boardActiveNotes.findIndex((note) => note.id === draggedNoteId);
  if (sourceIndex < 0) {
    return notes;
  }

  const [moved] = boardActiveNotes.splice(sourceIndex, 1);

  if (targetNoteId) {
    const targetIndex = boardActiveNotes.findIndex((note) => note.id === targetNoteId);
    if (targetIndex >= 0) {
      boardActiveNotes.splice(targetIndex, 0, moved);
    } else {
      boardActiveNotes.push(moved);
    }
  } else {
    boardActiveNotes.push(moved);
  }

  const reordered = boardActiveNotes.map((note, index) => ({
    ...note,
    zIndex: index + 1,
    updatedAt: nowIso()
  }));

  return [...otherNotes, ...reordered, ...boardArchivedNotes];
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

const getBoardBadge = (title: string) => title.trim().slice(0, 1).toUpperCase() || "B";

const makeBoardTitle = (boards: BoardV2[]) => {
  let index = boards.length + 1;
  let title = `Board ${index}`;

  while (boards.some((board) => board.title === title)) {
    index += 1;
    title = `Board ${index}`;
  }

  return title;
};

const App = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [boards, setBoards] = useState<BoardV2[]>(() => createDefaultSnapshot().boards);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(() => createDefaultSnapshot().selectedBoardId);
  const [notes, setNotes] = useState<NoteV2[]>(() => createDefaultSnapshot().notes);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [runningDragNoteId, setRunningDragNoteId] = useState<string | null>(null);
  const [visibleNoteCount, setVisibleNoteCount] = useState(INITIAL_VISIBLE_NOTE_COUNT);
  const [feedMode, setFeedMode] = useState<FeedMode>("active");

  const skipNextCloudSaveRef = useRef(false);

  const selectedBoard = useMemo(
    () => boards.find((board) => board.id === selectedBoardId) ?? boards[0] ?? null,
    [boards, selectedBoardId]
  );

  const boardNotes = useMemo(
    () => notes.filter((note) => note.boardId === selectedBoard?.id),
    [notes, selectedBoard?.id]
  );
  const activeNotes = useMemo(() => boardNotes.filter((note) => !note.archived), [boardNotes]);
  const archivedNotes = useMemo(() => boardNotes.filter((note) => note.archived), [boardNotes]);
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
      .then((payload) => {
        if (!active) {
          return;
        }

        skipNextCloudSaveRef.current = true;
        setBoards(payload.boards);
        setNotes(payload.notes);
        setSelectedBoardId(payload.boards[0]?.id ?? null);
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
      return;
    }

    if (skipNextCloudSaveRef.current) {
      skipNextCloudSaveRef.current = false;
      return;
    }

    const timer = window.setTimeout(() => {
      void saveBoardsV2({ boards, notes }).catch(() => {});
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [boards, notes, selectedBoard?.id, user?.id]);

  useEffect(() => {
    if (!selectedBoard && boards.length > 0) {
      setSelectedBoardId(boards[0].id);
    }
  }, [boards, selectedBoard]);

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

  const addBoard = async () => {
    const title = makeBoardTitle(boards);

    if (supabase && user?.id) {
      try {
        const board = await createBoardV2(user.id, title);
        setBoards((prev) => [board, ...prev]);
        setSelectedBoardId(board.id);
        setSelectedNoteId(null);
        setFeedMode("active");
        return;
      } catch {
        return;
      }
    }

    const board = createDefaultBoard(user?.id ?? "local", title);
    setBoards((prev) => [board, ...prev]);
    setSelectedBoardId(board.id);
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
    updateNote(noteId, { archived: true });
    setSelectedNoteId(null);
  };

  const restoreNote = (noteId: string) => {
    updateNote(noteId, { archived: false });
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

        <div className="board-switcher">
          {boards.map((boardItem) => (
            <button
              key={boardItem.id}
              className={`board-chip ${selectedBoard?.id === boardItem.id ? "active" : ""}`}
              onClick={() => {
                setSelectedBoardId(boardItem.id);
                setSelectedNoteId(null);
                setFeedMode("active");
              }}
              aria-label={boardItem.title}
              title={boardItem.title}
            >
              {getBoardBadge(boardItem.title)}
            </button>
          ))}
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

        <button className="side-icon subtle" onClick={addNote} aria-label="새 메모">
          …
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
              <h1>{feedMode === "active" ? selectedBoard?.title ?? "My Board" : "보관 메모"}</h1>
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
            ) : !selectedBoard ? (
              <div className="feed-empty">왼쪽의 + 버튼으로 첫 보드를 만들어보세요.</div>
            ) : visibleNotes.length === 0 ? (
              <div className="feed-empty">
                {feedMode === "active" ? "이 보드의 첫 메모를 추가해보세요." : "보관된 메모가 없습니다."}
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
                          {feedMode === "active" ? "⌖" : "↺"}
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
                          {feedMode === "active" ? "✕" : "⌫"}
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
              : `${filteredNotes.length}개의 메모가 모두 표시되었습니다.`}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
