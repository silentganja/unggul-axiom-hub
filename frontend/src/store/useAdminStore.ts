import { create } from "zustand";
import { adminApi, setAdminToken, clearAdminToken } from "@/lib/api";

interface AdminAuthState {
  username: string | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => void;
}

export const useAdminStore = create<AdminAuthState>((set) => ({
  username: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  login: async (username: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await adminApi.login({ username, password });
      setAdminToken(res.token);
      localStorage.setItem("admin-user", JSON.stringify({ username: res.username }));
      set({
        token: res.token,
        username: res.username,
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
    clearAdminToken();
    set({
      token: null,
      username: null,
      isAuthenticated: false,
      error: null,
    });
  },

  hydrate: () => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("admin-token") : null;
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    const cached =
      typeof window !== "undefined" ? localStorage.getItem("admin-user") : null;
    if (cached) {
      try {
        const { username } = JSON.parse(cached);
        set({ token, username, isAuthenticated: true });
      } catch {
        // Corrupt cache - clear and continue with token-only auth
        localStorage.removeItem("admin-user");
        set({ token, isAuthenticated: true, username: "admin" });
      }
    } else {
      // No cache but token exists - still authenticate
      set({ token, isAuthenticated: true, username: "admin" });
    }
  },
}));
