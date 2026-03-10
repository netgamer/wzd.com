import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
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

const LOCAL_STORAGE_KEY = "wzd-board-v2-local";
const DEFAULT_NOTE_WIDTH = 240;
const DEFAULT_NOTE_HEIGHT = 220;

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
  metadata: {},
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
    content: "더블클릭으로 새 포스트잇을 만들 수 있습니다.",
    color: "yellow"
  });
  const secondNote = createNote({
    boardId: board.id,
    userId: "local",
    zIndex: 2,
    x: 410,
    y: 180,
    content: "로그인하면 어디서든 같은 보드를 볼 수 있어요.",
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
  const [trashOpen, setTrashOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const skipNextCloudSaveRef = useRef(false);
  const cloudEnabled = Boolean(user?.id && supabase);

  const activeNotes = useMemo(() => notes.filter((note) => !note.archived), [notes]);
  const trashNotes = useMemo(
    () => [...notes.filter((note) => note.archived)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [notes]
  );
  const selectedNote = useMemo(
    () => activeNotes.find((note) => note.id === selectedNoteId) ?? null,
    [activeNotes, selectedNoteId]
  );

  const renderedNotes = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const filtered = keyword
      ? activeNotes.filter((note) => note.content.toLowerCase().includes(keyword))
      : activeNotes;
    return [...filtered].sort((a, b) => a.zIndex - b.zIndex);
  }, [activeNotes, search]);

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
  }, []);

  useEffect(() => {
    const clampAllActiveNotes = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
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
  }, [loading]);

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
    const clamped = canvas
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
  };

  const updateNote = (noteId: string, patch: Partial<NoteV2>) => {
    const canvas = canvasRef.current;
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id !== noteId) {
          return note;
        }
        const merged = { ...note, ...patch };
        if (canvas) {
          const clamped = clampNotePosition(merged.x, merged.y, merged.w, merged.h, canvas);
          return { ...merged, x: clamped.x, y: clamped.y, updatedAt: nowIso() };
        }
        return { ...merged, updatedAt: nowIso() };
      })
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
              ...(canvas ? clampNotePosition(note.x, note.y, note.w, note.h, canvas) : {}),
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
    if (note.pinned) {
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
    <div className="board-app">
      <header className="board-topbar">
        <div className="brand">
          <span className="logo">WZD</span>
          <span className="brand-subtitle">Cork Board</span>
        </div>

        <div className="toolbar">
          <button className="primary-btn" onClick={() => addNote()}>
            + 포스트잇 추가
          </button>
          <button className="ghost-btn" onClick={() => setTrashOpen((prev) => !prev)}>
            휴지통 {trashNotes.length > 0 ? `(${trashNotes.length})` : ""}
          </button>
          <input
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="포스트잇 검색"
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

      <main className="workspace">
        <section className="canvas-wrap">
          <div
            ref={canvasRef}
            className={`board-canvas canvas-${board.backgroundStyle}`}
            onDoubleClick={onCanvasDoubleClick}
            aria-label="코르크 보드 캔버스"
          >
            {loading ? (
              <div className="canvas-empty">보드를 불러오는 중...</div>
            ) : renderedNotes.length === 0 ? (
              <div className="canvas-empty">더블클릭해서 첫 포스트잇을 추가해보세요.</div>
            ) : (
              renderedNotes.map((note) => {
                const selected = selectedNoteId === note.id;
                return (
                  <article
                    key={note.id}
                    className={`sticky-note note-${note.color} ${selected ? "selected" : ""} ${
                      draggingNoteId === note.id ? "dragging" : ""
                    }`}
                    style={{
                      left: `${note.x}px`,
                      top: `${note.y}px`,
                      width: `${note.w}px`,
                      height: `${note.h}px`,
                      zIndex: note.zIndex,
                      transform: `rotate(${note.rotation}deg)`
                    }}
                    onMouseDown={() => {
                      setSelectedNoteId(note.id);
                      bringToFront(note.id);
                    }}
                  >
                    <div className="sticky-handle" onPointerDown={(event) => onNoteHandlePointerDown(event, note)}>
                      <span>{note.pinned ? "고정됨" : "드래그해서 이동"}</span>
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
                      className="sticky-editor"
                      value={note.content}
                      onChange={(event) => updateNote(note.id, { content: event.target.value })}
                      placeholder="메모를 입력하세요..."
                    />
                  </article>
                );
              })
            )}
          </div>
        </section>

        <aside className="inspector">
          <h2>포스트잇 설정</h2>
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
                <button className="ghost-btn" onClick={() => updateNote(selectedNote.id, { w: 200, h: 180 })}>
                  S
                </button>
                <button className="ghost-btn" onClick={() => updateNote(selectedNote.id, { w: 240, h: 220 })}>
                  M
                </button>
                <button className="ghost-btn" onClick={() => updateNote(selectedNote.id, { w: 300, h: 260 })}>
                  L
                </button>
              </div>
            </>
          ) : (
            <p className="inspector-line">포스트잇을 선택하면 색상과 크기를 바꿀 수 있습니다.</p>
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
      </main>
    </div>
  );
};

export default App;
