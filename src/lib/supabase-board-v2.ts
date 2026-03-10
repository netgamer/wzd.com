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

const createBoard = async (userId: string): Promise<BoardV2> => {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from("boards")
    .insert({
      user_id: userId,
      title: "My Board",
      description: "",
      background_style: "cork",
      settings: {}
    })
    .select("id,user_id,title,description,background_style,settings,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapBoardRow(data as BoardRow);
};

export const loadOrCreateBoardV2 = async (userId: string): Promise<{ board: BoardV2; notes: NoteV2[] }> => {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const boardQuery = await supabase
    .from("boards")
    .select("id,user_id,title,description,background_style,settings,updated_at")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (boardQuery.error) {
    throw boardQuery.error;
  }

  const boardRow = (boardQuery.data?.[0] as BoardRow | undefined) ?? null;
  const board = boardRow ? mapBoardRow(boardRow) : await createBoard(userId);

  const notesQuery = await supabase
    .from("notes")
    .select("id,board_id,user_id,content,color,x,y,w,h,z_index,rotation,pinned,archived,metadata,updated_at")
    .eq("board_id", board.id)
    .eq("user_id", userId)
    .eq("archived", false)
    .order("z_index", { ascending: true })
    .order("updated_at", { ascending: true });

  if (notesQuery.error) {
    throw notesQuery.error;
  }

  const notes = ((notesQuery.data ?? []) as NoteRow[]).map(mapNoteRow);
  return { board, notes };
};

export const saveBoardV2 = async (params: { board: BoardV2; notes: NoteV2[] }): Promise<void> => {
  if (!supabase) {
    return;
  }

  const { board, notes } = params;

  const boardWrite = await supabase
    .from("boards")
    .update({
      title: board.title,
      description: board.description,
      background_style: board.backgroundStyle,
      settings: board.settings
    })
    .eq("id", board.id)
    .eq("user_id", board.userId);

  if (boardWrite.error) {
    throw boardWrite.error;
  }

  if (notes.length > 0) {
    const upsertRows = notes.map((note) => ({
      id: note.id,
      board_id: note.boardId,
      user_id: note.userId,
      content: note.content,
      color: note.color,
      x: note.x,
      y: note.y,
      w: note.w,
      h: note.h,
      z_index: note.zIndex,
      rotation: note.rotation,
      pinned: note.pinned,
      archived: note.archived,
      metadata: note.metadata
    }));

    const upsertResult = await supabase.from("notes").upsert(upsertRows);
    if (upsertResult.error) {
      throw upsertResult.error;
    }
  }

  const remoteIds = await supabase.from("notes").select("id").eq("board_id", board.id).eq("user_id", board.userId);
  if (remoteIds.error) {
    throw remoteIds.error;
  }

  const localIdSet = new Set(notes.map((note) => note.id));
  const staleIds = (remoteIds.data ?? [])
    .map((row: { id: string }) => row.id)
    .filter((id) => !localIdSet.has(id));

  if (staleIds.length > 0) {
    const deleteResult = await supabase.from("notes").delete().eq("board_id", board.id).eq("user_id", board.userId).in("id", staleIds);
    if (deleteResult.error) {
      throw deleteResult.error;
    }
  }
};
