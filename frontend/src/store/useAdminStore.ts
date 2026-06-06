import { create } from "zustand";
import { adminApi, setAdminToken, clearAdminToken } from "@/lib/api";

// The admin JWT is issued with an 8-hour expiry by the backend.
// We store the issue timestamp locally so we can pre-emptively detect
// expiry without making an extra network round-trip on every check.
const ADMIN_TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours in milliseconds

interface AdminAuthState {
  username: string | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hydrate: () => Promise<void>;
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
      // Persist username and the exact time the token was issued so hydrate()
      // can detect expiry without decoding the JWT client-side.
      localStorage.setItem(
        "admin-user",
        JSON.stringify({ username: res.username, issuedAt: Date.now() })
      );
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
    localStorage.removeItem("admin-user");
    set({
      token: null,
      username: null,
      isAuthenticated: false,
      error: null,
    });
  },

  hydrate: async () => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("admin-token");
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }

    // Check the local timestamp before hitting the network.
    // If the token is older than 8 hours it is certainly expired.
    const cached = localStorage.getItem("admin-user");
    let username: string | null = null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as {
          username?: string;
          issuedAt?: number;
        };
        username = parsed.username ?? null;
        const issuedAt = parsed.issuedAt ?? 0;
        if (Date.now() - issuedAt > ADMIN_TOKEN_EXPIRY_MS) {
          // Token is locally known to be expired — clear without a network call.
          clearAdminToken();
          localStorage.removeItem("admin-user");
          set({ isAuthenticated: false });
          return;
        }
      } catch {
        // Corrupt cache entry; proceed to server validation below.
        localStorage.removeItem("admin-user");
      }
    }

    // Validate the token against the backend. This is the authoritative check:
    // even if the local timestamp says the token is fresh, the backend may have
    // invalidated it (e.g. secret rotation). getDashboard() requires a valid
    // AdminUser extractor so a 401 response means the session is dead.
    set({ isLoading: true });
    try {
      await adminApi.getDashboard();
      set({ token, username, isAuthenticated: true, isLoading: false });
    } catch {
      // Backend rejected the token (expired, invalid, revoked).
      clearAdminToken();
      localStorage.removeItem("admin-user");
      set({
        token: null,
        username: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
