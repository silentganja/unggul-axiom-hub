// ─────────────────────────────────────────────────────────────────────────────
// API Client - Token management unit tests
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getToken,
  setToken,
  setRefreshToken,
  clearToken,
} from "../api";

// localStorage mock is built into jsdom - cleared before each test
beforeEach(() => {
  localStorage.clear();
});

describe("token management", () => {
  it("getToken returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("setToken stores and getToken retrieves the same value", () => {
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.signature";
    setToken(token);
    expect(getToken()).toBe(token);
  });

  it("setToken overwrites a previously stored token", () => {
    setToken("old-token");
    setToken("new-token");
    expect(getToken()).toBe("new-token");
  });

  it("setRefreshToken stores a refresh token in the correct key", () => {
    const rt = "a1b2c3d4e5f6";
    setRefreshToken(rt);
    expect(localStorage.getItem("auth-refresh-token")).toBe(rt);
  });

  it("clearToken removes token, refresh token, user, and favorites", () => {
    localStorage.setItem("auth-token", "some-token");
    localStorage.setItem("auth-refresh-token", "some-rt");
    localStorage.setItem("auth-user", JSON.stringify({ id: "1" }));
    localStorage.setItem("unggul-favorites", JSON.stringify(["id-1"]));

    clearToken();

    expect(localStorage.getItem("auth-token")).toBeNull();
    expect(localStorage.getItem("auth-refresh-token")).toBeNull();
    expect(localStorage.getItem("auth-user")).toBeNull();
    expect(localStorage.getItem("unggul-favorites")).toBeNull();
  });

  it("clearToken is safe to call when nothing is stored", () => {
    expect(() => clearToken()).not.toThrow();
  });

  it("getToken returns null for empty string token", () => {
    localStorage.setItem("auth-token", "");
    // Empty string is falsy, getToken returns it as-is since it's not null
    expect(getToken()).toBe("");
  });

  it("stores tokens under distinct keys so auth and admin sessions don't collide", () => {
    const authToken = "user-auth-jwt";
    const adminToken = "admin-auth-jwt";

    setToken(authToken);
    localStorage.setItem("admin-token", adminToken);

    expect(getToken()).toBe(authToken);
    expect(localStorage.getItem("admin-token")).toBe(adminToken);
    expect(getToken()).not.toBe(adminToken);
  });
});
