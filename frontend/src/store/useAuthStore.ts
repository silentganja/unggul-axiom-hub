import { create } from "zustand";
import { authApi, UserProfile, setToken, clearToken } from "@/lib/api";

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>; // Restore session from localStorage on app boot
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authApi.login({ email, password });
      setToken(res.token);
      // Persist user profile for quick hydraton
      localStorage.setItem("auth-user", JSON.stringify(res.user));
      set({
        token: res.token,
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

  logout: () => {
    clearToken();
    set({
      token: null,
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

    // Try to load cached user profile first (instant UI)
    const cached =
      typeof window !== "undefined"
        ? localStorage.getItem("auth-user")
        : null;
    if (cached) {
      try {
        const user = JSON.parse(cached) as UserProfile;
        set({ token, user, isAuthenticated: true });
      } catch { /* ignore corrupt cache */ }
    }

    // Validate token against backend and get fresh user data
    set({ isLoading: true });
    try {
      const user = await authApi.me();
      localStorage.setItem("auth-user", JSON.stringify(user));
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch {
      // Token expired or invalid — clear session
      clearToken();
      set({
        token: null,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
