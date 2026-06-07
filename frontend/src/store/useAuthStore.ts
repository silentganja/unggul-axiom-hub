import { create } from "zustand";
import {
  authApi,
  UserProfile,
  setToken,
  setRefreshToken,
  clearToken,
  registerForceLogoutHandler,
} from "@/lib/api";
import { resetFavoriteIds } from "@/store/useFileStore";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  /** Tracks whether the role-based landing view has been applied this session */
  roleLandingDone: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>; // Restore session from localStorage on app boot
}

// ═══════════════════════════════════════════════════════════════════════════════
// When an unrecoverable 401 is caught in api.ts, this handler resets in-memory
// Zustand state BEFORE the hard redirect. Previously the hard redirect masked
// a window where `isAuthenticated` was still true and `user` held stale data.
// ═══════════════════════════════════════════════════════════════════════════════
registerForceLogoutHandler(() => {
  useAuthStore.setState({
    token: null,
    refreshToken: null,
    user: null,
    isAuthenticated: false,
    error: null,
  });
  resetFavoriteIds();
});

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  roleLandingDone: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login({ email, password });
      setToken(res.token);
      setRefreshToken(res.refreshToken);
      // Persist user profile for quick hydration
      localStorage.setItem("auth-user", JSON.stringify(res.user));
      set({
        token: res.token,
        refreshToken: res.refreshToken,
        user: res.user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Authentication failed",
      });
      throw err;
    }
  },

  logout: async () => {
    // Try to notify the backend to revoke the refresh token
    try {
      const rt =
        typeof window !== "undefined"
          ? localStorage.getItem("auth-refresh-token")
          : null;
      if (rt) {
        await authApi.logout(rt);
      }
    } catch {
      // Ignore errors - logout locally regardless
    }

    clearToken();
    resetFavoriteIds();
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      error: null,
      roleLandingDone: false,
    });
    // The caller (dashboard layout) watches isAuthenticated and will
    // redirect via Next.js router. This avoids a hard page reload that
    // discards all client-side state (scroll positions, cache, etc.).
  },

  hydrate: async () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-token")
        : null;

    if (!token) {
      set({ isLoading: false, isAuthenticated: false });
      return;
    }

    // Load refresh token from localStorage
    const refreshToken =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-refresh-token")
        : null;

    // Try to load cached user profile first for instant display (does NOT set isAuthenticated)
    let hasCache = false;
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-user")
        : null;
    if (cached) {
      try {
        const user = JSON.parse(cached) as UserProfile;
        // Load user + token into state for display while validating, but do NOT
        // set isAuthenticated until the backend confirms the token is still valid.
        set({ token, user, refreshToken });
        hasCache = true;
      } catch { /* ignore corrupt cache */ }
    }

    // Validate token against backend and get fresh user data
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      localStorage.setItem("auth-user", JSON.stringify(user));
      set({ token, user, refreshToken, isAuthenticated: true, isLoading: false });
    } catch {
      if (hasCache) {
        // Token might be expired - keep cached data for display but mark unauthenticated.
        // The first API call that gets a 401 will trigger a redirect to login.
        set({ isLoading: false, isAuthenticated: false });
      } else {
        // No cache - must log out
        clearToken();
        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
  },
}));
