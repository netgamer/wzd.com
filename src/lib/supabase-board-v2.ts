import { supabase } from "./supabase";

export type BoardBackgroundStyle = "cork" | "whiteboard" | "paper";
export type NoteColor = "yellow" | "pink" | "blue" | "green" | "orange" | "purple" | "mint" | "white";

export interface BoardV2 {
  id: string;
  userId: string;
  title: string;
  description: string;
  backgroundStyle: BoardBackgroundStyle;
  settings: Record<string, unknown>;
  updatedAt: string;
}

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

interface BoardRow {
  id: string;
  user_id: string;
  title: string;
  description: string;
  background_style: BoardBackgroundStyle;
  settings: Record<string, unknown> | null;
  updated_at: string;
}

interface NoteRow {
  id: string;
  board_id: string;
  user_id: string;
  content: string;
  color: NoteColor;
  x: number;
  y: number;
  w: number;
  h: number;
  z_index: number;
  rotation: number;
  pinned: boolean;
  archived: boolean;
  metadata: Record<string, unknown> | null;
  updated_at: string;
}

interface UserProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
}

interface BoardMemberRow {
  board_id: string;
  user_id: string;
  role: "editor";
}

const mapBoardRow = (row: BoardRow): BoardV2 => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  description: row.description,
  backgroundStyle: row.background_style,
  settings: row.settings ?? {},
  updatedAt: row.updated_at
});

const mapNoteRow = (row: NoteRow): NoteV2 => ({
  id: row.id,
  boardId: row.board_id,
  userId: row.user_id,
  content: row.content,
  color: row.color,
  x: row.x,
  y: row.y,
  w: row.w,
  h: row.h,
  zIndex: row.z_index,
  rotation: row.rotation,
  pinned: row.pinned,
  archived: row.archived,
  metadata: row.metadata ?? {},
  updatedAt: row.updated_at
});

const mapUserProfileRow = (row: UserProfileRow): BoardUserProfile => ({
  userId: row.user_id,
  email: row.email,
  displayName: row.display_name ?? ""
});

const ensureSupabase = () => {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const createBoardV2 = async (userId: string, title = "My Board"): Promise<BoardV2> => {
  ensureSupabase();

  const { data, error } = await supabase!
    .from("boards")
    .insert({
      user_id: userId,
      title,
      description: "",
      background_style: "paper",
      settings: {}
    })
    .select("id,user_id,title,description,background_style,settings,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapBoardRow(data as BoardRow);
};

export const syncUserProfile = async (userId: string, email: string, displayName = ""): Promise<void> => {
  ensureSupabase();

  const { error } = await supabase!.from("user_profiles").upsert({
    user_id: userId,
    email,
    display_name: displayName
  });

  if (error) {
    throw error;
  }
};

export const searchUserProfiles = async (
  query: string,
  excludeUserIds: string[] = []
): Promise<BoardUserProfile[]> => {
  ensureSupabase();

  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const { data, error } = await supabase!
    .from("user_profiles")
    .select("user_id,email,display_name")
    .ilike("email", `%${trimmedQuery}%`)
    .order("email", { ascending: true })
    .limit(10);

  if (error) {
    throw error;
  }

  const excludeSet = new Set(excludeUserIds);
  return ((data ?? []) as UserProfileRow[]).map(mapUserProfileRow).filter((profile) => !excludeSet.has(profile.userId));
};

export const listBoardMembers = async (boardId: string): Promise<BoardMemberProfile[]> => {
  ensureSupabase();

  const membershipQuery = await supabase!
    .from("board_members")
    .select("board_id,user_id,role")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });

  if (membershipQuery.error) {
    throw membershipQuery.error;
  }

  const memberships = (membershipQuery.data ?? []) as BoardMemberRow[];
  if (memberships.length === 0) {
    return [];
  }

  const memberIds = memberships.map((row) => row.user_id);
  const profileQuery = await supabase!
    .from("user_profiles")
    .select("user_id,email,display_name")
    .in("user_id", memberIds);

  if (profileQuery.error) {
    throw profileQuery.error;
  }

  const profilesById = new Map(
    ((profileQuery.data ?? []) as UserProfileRow[]).map((row) => [row.user_id, mapUserProfileRow(row)])
  );

  return memberships.map((membership) => {
    const profile = profilesById.get(membership.user_id);
    return {
      userId: membership.user_id,
      email: profile?.email ?? "",
      displayName: profile?.displayName ?? "",
      role: membership.role
    };
  });
};

export const inviteBoardMember = async (boardId: string, userId: string): Promise<void> => {
  ensureSupabase();

  const { error } = await supabase!.from("board_members").upsert(
    {
      board_id: boardId,
      user_id: userId,
      role: "editor"
    },
    { onConflict: "board_id,user_id" }
  );

  if (error) {
    throw error;
  }
};

export const loadBoardsV2 = async (userId: string): Promise<{ boards: BoardV2[]; notes: NoteV2[] }> => {
  ensureSupabase();

  const memberQuery = await supabase!.from("board_members").select("board_id").eq("user_id", userId);

  if (memberQuery.error) {
    throw memberQuery.error;
  }

  const memberBoardIds = (memberQuery.data ?? [])
    .map((row: { board_id: string | null }) => row.board_id)
    .filter((boardId): boardId is string => typeof boardId === "string" && boardId.length > 0);

  const boardQueryBuilder = supabase!
    .from("boards")
    .select("id,user_id,title,description,background_style,settings,updated_at")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  const boardQuery =
    memberBoardIds.length > 0
      ? await boardQueryBuilder.or(`user_id.eq.${userId},id.in.(${memberBoardIds.join(",")})`)
      : await boardQueryBuilder.eq("user_id", userId);

  if (boardQuery.error) {
    throw boardQuery.error;
  }

  let boards = ((boardQuery.data ?? []) as BoardRow[]).map(mapBoardRow);

  if (boards.length === 0) {
    boards = [await createBoardV2(userId)];
  }

  const boardIds = boards.map((board) => board.id);

  const notesQuery = await supabase!
    .from("notes")
    .select("id,board_id,user_id,content,color,x,y,w,h,z_index,rotation,pinned,archived,metadata,updated_at")
    .in("board_id", boardIds)
    .order("z_index", { ascending: true })
    .order("updated_at", { ascending: true });

  if (notesQuery.error) {
    throw notesQuery.error;
  }

  const notes = ((notesQuery.data ?? []) as NoteRow[]).map(mapNoteRow);
  return { boards, notes };
};

export const loadSharedBoardV2 = async (
  slug: string
): Promise<{ board: BoardV2; notes: NoteV2[] } | null> => {
  ensureSupabase();

  const boardQuery = await supabase!
    .from("boards")
    .select("id,user_id,title,description,background_style,settings,updated_at")
    .contains("settings", { sharedSlug: slug })
    .eq("is_archived", false)
    .maybeSingle();

  if (boardQuery.error) {
    throw boardQuery.error;
  }

  if (!boardQuery.data) {
    return null;
  }

  const board = mapBoardRow(boardQuery.data as BoardRow);
  const notesQuery = await supabase!
    .from("notes")
    .select("id,board_id,user_id,content,color,x,y,w,h,z_index,rotation,pinned,archived,metadata,updated_at")
    .eq("board_id", board.id)
    .eq("archived", false)
    .order("z_index", { ascending: true })
    .order("updated_at", { ascending: true });

  if (notesQuery.error) {
    throw notesQuery.error;
  }

  return {
    board,
    notes: ((notesQuery.data ?? []) as NoteRow[]).map(mapNoteRow)
  };
};

export const isBoardShareSlugTaken = async (slug: string, excludeBoardId?: string): Promise<boolean> => {
  ensureSupabase();

  const boardQuery = await supabase!
    .from("boards")
    .select("id")
    .contains("settings", { sharedSlug: slug })
    .eq("is_archived", false)
    .limit(1);

  if (boardQuery.error) {
    throw boardQuery.error;
  }

  const match = (boardQuery.data ?? [])[0] as { id: string } | undefined;
  if (!match) {
    return false;
  }

  return excludeBoardId ? match.id !== excludeBoardId : true;
};

export const saveBoardsV2 = async (params: {
  boards: BoardV2[];
  notes: NoteV2[];
  currentUserId?: string | null;
}): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { boards, notes, currentUserId = null } = params;
  const boardsToPersist = currentUserId ? boards.filter((board) => board.userId === currentUserId) : boards;

  if (boardsToPersist.length > 0) {
    const boardRows = boardsToPersist.map((board) => ({
      id: board.id,
      user_id: board.userId,
      title: board.title,
      description: board.description,
      background_style: board.backgroundStyle,
      settings: board.settings,
      updated_at: board.updatedAt
    }));

    const boardWrite = await supabase.from("boards").upsert(boardRows);
    if (boardWrite.error) {
      throw boardWrite.error;
    }
  }

  if (notes.length > 0) {
    const noteRows = notes.map((note) => ({
      id: note.id,
      board_id: note.boardId,
      user_id: note.userId,
      content: note.content,
      color: note.color,
      x: note.x,
      y: note.y,
      w: clamp(note.w, 140, 520),
      h: clamp(note.h, 120, 640),
      z_index: note.zIndex,
      rotation: note.rotation,
      pinned: note.pinned,
      archived: note.archived,
      metadata: note.metadata,
      updated_at: note.updatedAt
    }));

    const noteWrite = await supabase.from("notes").upsert(noteRows);
    if (noteWrite.error) {
      throw noteWrite.error;
    }
  }

  const boardIds = boards.map((board) => board.id);
  if (boardIds.length === 0) {
    return;
  }

  const remoteIds = await supabase.from("notes").select("id,board_id").in("board_id", boardIds);
  if (remoteIds.error) {
    throw remoteIds.error;
  }

  const localIdSet = new Set(notes.map((note) => note.id));
  const staleIds = (remoteIds.data ?? [])
    .map((row: { id: string }) => row.id)
    .filter((id) => !localIdSet.has(id));

  if (staleIds.length > 0) {
    const deleteResult = await supabase.from("notes").delete().in("id", staleIds);
    if (deleteResult.error) {
      throw deleteResult.error;
    }
  }
};
