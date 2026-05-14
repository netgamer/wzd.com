// Compatibility shim — original supabase client removed. Re-exports the new
// fetch-based auth client under names that the rest of the codebase already
// imports, so existing call sites continue to compile while gradually migrating
// to `./api/auth-client` directly.

import {
  getMe,
  signInWithGoogle,
  signOut,
  onAuthChange,
  hasAuth,
  type AuthUser
} from "./api/auth-client";

export const hasSupabaseConfig = hasAuth;

interface AuthSubscription {
  unsubscribe(): void;
}

const session = (user: AuthUser | null) =>
  user ? { user: { id: user.id, email: user.email } } : null;

const authShim = {
  async getSession(): Promise<{ data: { session: ReturnType<typeof session> } }> {
    const user = await getMe();
    return { data: { session: session(user) } };
  },
  onAuthStateChange(
    listener: (event: string, payload: { user: AuthUser | null } | null) => void
  ): { data: { subscription: AuthSubscription } } {
    const unsubscribe = onAuthChange((user) => {
      listener(user ? "SIGNED_IN" : "SIGNED_OUT", user ? { user } : null);
    });
    return { data: { subscription: { unsubscribe } } };
  },
  async signInWithOAuth(_opts: {
    provider: string;
    options?: { redirectTo?: string };
  }): Promise<void> {
    signInWithGoogle(window.location.pathname || "/");
  },
  async signOut(): Promise<void> {
    await signOut();
  }
};

export const supabase = {
  auth: authShim
} as const;
