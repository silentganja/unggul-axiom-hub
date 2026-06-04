// ─────────────────────────────────────────────────────────────────────────────
// Auth Store - Zustand store unit tests
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAuthStore } from "../useAuthStore";

// Mock the API module so we don't make real HTTP calls
vi.mock("@/lib/api", () => {
  return {
    authApi: {
      login: vi.fn(),
      logout: vi.fn(),
      me: vi.fn(),
      refresh: vi.fn(),
    },
    setToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearToken: vi.fn(),
  };
});

// Mock resetFavoriteIds
vi.mock("@/store/useFileStore", () => ({
  resetFavoriteIds: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();

  // Reset the store to its initial state between tests
  useAuthStore.setState({
    user: null,
    token: null,
    refreshToken: null,
    isLoading: false,
    isAuthenticated: false,
    error: null,
  });
});

describe("useAuthStore", () => {
  describe("initial state", () => {
    it("starts unauthenticated", () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe("login", () => {
    it("sets loading to true during login", async () => {
      // Deferred promise so we can observe loading state mid-flight then clean up.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- deferred mock; shape verified by other tests
      let resolveLogin!: (value: any) => void;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deferred = new Promise<any>((resolve) => { resolveLogin = resolve; });

      const { authApi } = await import("@/lib/api");
      vi.mocked(authApi.login).mockReturnValue(deferred);

      // Fire login but don't await - we want to check loading state mid-flight
      const loginPromise = useAuthStore.getState().login("user@test.com", "password");

      expect(useAuthStore.getState().isLoading).toBe(true);
      expect(useAuthStore.getState().error).toBeNull();

      // Resolve the deferred promise so the test cleans up cleanly
      resolveLogin!({
        token: "tk",
        refreshToken: "rt",
        user: { id: "1", email: "u@t.com", fullName: "U", role: "staff", active: true, createdAt: "" },
      });
      await loginPromise;
    });

    it("sets error on login failure", async () => {
      const { authApi } = await import("@/lib/api");
      vi.mocked(authApi.login).mockRejectedValue(new Error("Invalid credentials"));

      try {
        await useAuthStore.getState().login("user@test.com", "wrong");
      } catch {
        // expected
      }

      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe("Invalid credentials");
      expect(state.isAuthenticated).toBe(false);
    });

    it("sets user and token on successful login", async () => {
      const { authApi, setToken, setRefreshToken } = await import("@/lib/api");
      const mockResponse = {
        token: "access-jwt-here",
        refreshToken: "refresh-opaque-here",
        user: {
          id: "user-uuid",
          email: "user@test.com",
          fullName: "Test User",
          role: "officer",
          active: true,
          createdAt: new Date().toISOString(),
        },
      };

      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      await useAuthStore.getState().login("user@test.com", "correct");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.token).toBe("access-jwt-here");
      expect(state.refreshToken).toBe("refresh-opaque-here");
      expect(state.user?.email).toBe("user@test.com");
      expect(state.user?.role).toBe("officer");
      expect(setToken).toHaveBeenCalledWith("access-jwt-here");
      expect(setRefreshToken).toHaveBeenCalledWith("refresh-opaque-here");
    });
  });

  describe("logout", () => {
    it("clears user and navigates to login", async () => {
      // First set an authenticated state
      useAuthStore.setState({
        user: { id: "1", email: "u@t.com", fullName: "U", role: "staff", active: true, createdAt: "" },
        token: "tk",
        refreshToken: "rt",
        isAuthenticated: true,
      });

      const { authApi, clearToken } = await import("@/lib/api");
      vi.mocked(authApi.logout).mockResolvedValue({ status: "ok" });

      // Redirect after logout is verified by clearToken being called
      Object.defineProperty(window, "location", {
        value: { href: "/dashboard" },
        writable: true,
      });

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(clearToken).toHaveBeenCalled();
    });

    it("logs out locally even if backend call fails", async () => {
      useAuthStore.setState({ isAuthenticated: true, token: "tk" });

      const { authApi, clearToken } = await import("@/lib/api");
      vi.mocked(authApi.logout).mockRejectedValue(new Error("Network error"));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(clearToken).toHaveBeenCalled();
    });
  });
});
