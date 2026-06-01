import { create } from "zustand";
import {
  authApi,
  UserProfile,
  setToken,
  setRefreshToken,
  clearToken,
} from "@/lib/api";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>; // Restore session from localStorage on app boot
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

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
      // Ignore errors — logout locally regardless
    }

    clearToken();
    set({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      error: null,
    });
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
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

    // Try to load cached user profile first (instant UI)
    let hasCache = false;
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-user")
        : null;
    if (cached) {
      try {
        const user = JSON.parse(cached) as UserProfile;
        set({ token, user, refreshToken, isAuthenticated: true });
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
        // Token might be expired — keep cached session, auto-refresh will handle it
        set({ isLoading: false });
      } else {
        // No cache — must log out
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
