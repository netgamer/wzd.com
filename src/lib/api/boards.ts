import { apiFetch } from "./client";

export type BoardBackgroundStyle = "cork" | "whiteboard" | "paper";
export type NoteColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple" | "mint" | "white";

export interface BoardV2 {
  id: string;
  userId: string;
  title: string;
  description: string;
  backgroundStyle: BoardBackgroundStyle;
  settings: Record<string, unknown>;
  visibility?: "private" | "public";
  cloneCount?: number;
  likeCount?: number;
  updatedAt: string;
}

export interface DiscoverBoard extends BoardV2 {
  ownerEmail: string;
  ownerName: string;
  noteCount: number;
  isOwn: boolean;
}

export interface DiscoverResponse {
  boards: DiscoverBoard[];
  total: number;
  hasMore: boolean;
  sort: "top" | "recent";
  q: string;
  limit: number;
  offset: number;
}

export const discoverBoards = async (params: {
  sort?: "top" | "recent";
  q?: string;
  limit?: number;
  offset?: number;
}): Promise<DiscoverResponse> => {
  const response = await apiFetch<DiscoverResponse>("/api/discover", {
    query: {
      sort: params.sort,
      q: params.q,
      limit: params.limit,
      offset: params.offset
    },
    allowUnauthorized: true
  });
  return response;
};

export const cloneBoard = async (boardId: string): Promise<{ board: BoardV2; sourceBoardId: string }> => {
  return apiFetch(`/api/boards/${encodeURIComponent(boardId)}/clone`, {
    method: "POST"
  });
};

export interface NoteV2 {
  id: string;
  boardId: string;
  userId: string;
  content: string;
  color: NoteColor;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  rotation: number;
  pinned: boolean;
  archived: boolean;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export interface BoardUserProfile {
  userId: string;
  email: string;
  displayName: string;
}

export interface BoardMemberProfile extends BoardUserProfile {
  role: "editor";
}

interface BoardResponse {
  board: BoardV2 | null;
}

interface BoardsResponse {
  boards: BoardV2[];
  notes: NoteV2[];
}

interface SharedBoardResponse {
  board: BoardV2 | null;
  notes: NoteV2[];
}

const unwrap401 = <T,>(fallback: T) => (error: unknown): T => {
  if ((error as { status?: number })?.status === 401) {
    return fallback;
  }
  throw error;
};

export const createBoardV2 = async (_userId: string, title = "My Board"): Promise<BoardV2> => {
  const response = await apiFetch<BoardResponse>("/api/boards", {
    method: "POST",
    body: { title }
  });
  if (!response.board) {
    throw new Error("Failed to create board.");
  }
  return response.board;
};

export const syncUserProfile = async (
  _userId: string,
  email: string,
  displayName = ""
): Promise<void> => {
  await apiFetch("/api/user-profiles/sync", {
    method: "POST",
    body: { email, displayName }
  });
};

export const searchUserProfiles = async (
  query: string,
  excludeUserIds: string[] = []
): Promise<BoardUserProfile[]> => {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const response = await apiFetch<{ profiles: BoardUserProfile[] }>("/api/user-profiles/search", {
    query: { q: trimmed, exclude: excludeUserIds.join(",") }
  });
  return response.profiles ?? [];
};

export const listBoardMembers = async (boardId: string): Promise<BoardMemberProfile[]> => {
  const response = await apiFetch<{ members: BoardMemberProfile[] }>(
    `/api/boards/${encodeURIComponent(boardId)}/members`
  );
  return response.members ?? [];
};

export const inviteBoardMember = async (boardId: string, userId: string): Promise<void> => {
  await apiFetch(`/api/boards/${encodeURIComponent(boardId)}/members`, {
    method: "POST",
    body: { userId }
  });
};

export const loadBoardShellsV2 = async (_userId: string): Promise<BoardV2[]> => {
  const response = await apiFetch<BoardsResponse>("/api/boards").catch(unwrap401({ boards: [], notes: [] } as BoardsResponse));
  return response.boards ?? [];
};

export const loadBoardsV2 = async (
  _userId: string
): Promise<{ boards: BoardV2[]; notes: NoteV2[] }> => {
  const response = await apiFetch<BoardsResponse>("/api/boards").catch(unwrap401({ boards: [], notes: [] } as BoardsResponse));
  return {
    boards: response.boards ?? [],
    notes: response.notes ?? []
  };
};

export const loadBoardNotesV2 = async (boardIds: string[]): Promise<NoteV2[]> => {
  const ids = Array.from(new Set(boardIds.filter((id) => typeof id === "string" && id.length > 0)));
  if (ids.length === 0) return [];
  // Notes are bundled with /api/boards; for individual fetches we hit each board.
  const response = await apiFetch<BoardsResponse>("/api/boards").catch(unwrap401({ boards: [], notes: [] } as BoardsResponse));
  const target = new Set(ids);
  return (response.notes ?? []).filter((note) => target.has(note.boardId));
};

export const loadSharedBoardV2 = async (
  slug: string
): Promise<{ board: BoardV2; notes: NoteV2[] } | null> => {
  const response = await apiFetch<SharedBoardResponse>(
    `/api/boards/by-slug/${encodeURIComponent(slug)}`,
    { allowUnauthorized: true }
  );
  if (!response.board) return null;
  return { board: response.board, notes: response.notes ?? [] };
};

export const loadEditableSharedBoardV2 = async (
  slug: string
): Promise<{ board: BoardV2; notes: NoteV2[] } | null> => {
  const response = await apiFetch<SharedBoardResponse>(
    `/api/boards/by-slug/${encodeURIComponent(slug)}`,
    { query: { editable: 1 }, allowUnauthorized: true }
  );
  if (!response.board) return null;
  return { board: response.board, notes: response.notes ?? [] };
};

export const loadHomeBoardV2 = async (): Promise<{ board: BoardV2; notes: NoteV2[] } | null> => {
  const response = await apiFetch<SharedBoardResponse>("/api/boards/home", {
    allowUnauthorized: true
  });
  if (!response.board) return null;
  return { board: response.board, notes: response.notes ?? [] };
};

export const loadEditableHomeBoardV2 = async (): Promise<{ board: BoardV2; notes: NoteV2[] } | null> => {
  const response = await apiFetch<SharedBoardResponse>("/api/boards/home", {
    query: { editable: 1 },
    allowUnauthorized: true
  });
  if (!response.board) return null;
  return { board: response.board, notes: response.notes ?? [] };
};

export const isBoardShareSlugTaken = async (
  slug: string,
  excludeBoardId?: string
): Promise<boolean> => {
  const response = await apiFetch<{ taken: boolean }>("/api/boards/share-slug-check", {
    query: { slug, excludeBoardId: excludeBoardId ?? "" }
  });
  return Boolean(response.taken);
};

export const saveBoardsV2 = async (params: {
  boards: BoardV2[];
  notes: NoteV2[];
  currentUserId?: string | null;
}): Promise<void> => {
  await apiFetch("/api/boards", {
    method: "PUT",
    body: {
      boards: params.boards,
      notes: params.notes
    }
  });
};

export const updateBoard = async (
  boardId: string,
  patch: Partial<{
    title: string;
    description: string;
    backgroundStyle: BoardBackgroundStyle;
    settings: Record<string, unknown>;
    isArchived: boolean;
    visibility: "private" | "public";
  }>
): Promise<BoardV2 | null> => {
  const response = await apiFetch<BoardResponse>(`/api/boards/${encodeURIComponent(boardId)}`, {
    method: "PATCH",
    body: patch
  });
  return response.board ?? null;
};
