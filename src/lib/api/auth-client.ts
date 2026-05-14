import { apiFetch } from "./client";

export interface AuthUser {
  id: string;
  email: string;
}

export type AuthListener = (user: AuthUser | null) => void;

const listeners = new Set<AuthListener>();
let cachedUser: AuthUser | null | undefined; // undefined = not loaded yet
let inflight: Promise<AuthUser | null> | null = null;

const emit = (next: AuthUser | null) => {
  cachedUser = next;
  for (const listener of listeners) {
    try {
      listener(next);
    } catch (error) {
      console.error("auth listener threw", error);
    }
  }
};

export const getMe = async (force = false): Promise<AuthUser | null> => {
  if (!force && inflight) {
    return inflight;
  }
  if (!force && cachedUser !== undefined) {
    return cachedUser;
  }
  inflight = (async () => {
    try {
      const payload = await apiFetch<{ user: AuthUser } | null>("/api/auth/me", {
        allowUnauthorized: true
      });
      const next = payload?.user ?? null;
      emit(next);
      return next;
    } catch (error: any) {
      if (error?.status === 401) {
        emit(null);
        return null;
      }
      throw error;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
};

export const signInWithGoogle = (nextPath?: string): void => {
  const target =
    nextPath && nextPath.startsWith("/")
      ? `/api/auth/google?next=${encodeURIComponent(nextPath)}`
      : "/api/auth/google";
  window.location.href = target;
};

export const signOut = async (): Promise<void> => {
  await apiFetch("/api/auth/logout", { method: "POST", allowUnauthorized: true }).catch(() => undefined);
  emit(null);
};

export const onAuthChange = (listener: AuthListener): (() => void) => {
  listeners.add(listener);
  if (cachedUser !== undefined) {
    try {
      listener(cachedUser);
    } catch (error) {
      console.error("auth listener threw", error);
    }
  }
  return () => {
    listeners.delete(listener);
  };
};

// Auth is always available with the new stack — there is no env flag gating it.
export const hasAuth = true;
