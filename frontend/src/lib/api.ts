// ─────────────────────────────────────────────────────────────────────────────
// Unggul Axiom Hub — API Client
// Centralised fetch wrapper with JWT handling, auth redirects, and typed helpers.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ── Token management ─────────────────────────────────────────────────────────

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth-token");
}

export function setToken(token: string): void {
  localStorage.setItem("auth-token", token);
}

export function clearToken(): void {
  localStorage.removeItem("auth-token");
  localStorage.removeItem("auth-user");
}

// ── Admin token management (separate from user auth) ─────────────────────────

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin-token");
}

export function setAdminToken(token: string): void {
  localStorage.setItem("admin-token", token);
}

export function clearAdminToken(): void {
  localStorage.removeItem("admin-token");
  localStorage.removeItem("admin-user");
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  useAdminToken = false
): Promise<T> {
  const token = useAdminToken ? getAdminToken() : getToken();
  const headers: Record<string, string> = {};

  // Only set Content-Type for JSON bodies, not FormData (multipart)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...((options.headers as Record<string, string>) || {}) },
  });

  if (res.status === 401) {
    // Only redirect if we're NOT already on a login page —
    // a 401 from /api/auth/login means "wrong credentials", not "expired session".
    const isOnLoginPage =
      typeof window !== "undefined" &&
      window.location.pathname === "/login";
    if (!isOnLoginPage) {
      if (useAdminToken) {
        clearAdminToken();
        if (typeof window !== "undefined") {
          window.location.href = "/dev/admin";
        }
      } else {
        clearToken();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }
    throw new AuthError();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth API ─────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export const authApi = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  me(): Promise<UserProfile> {
    return apiFetch("/api/auth/me");
  },
};

// ── Files API ────────────────────────────────────────────────────────────────

export interface BackendFileNode {
  id: string;
  parentId: string | null;
  ownerId: string;
  name: string;
  isFolder: boolean;
  sizeBytes: number;
  mimeType: string | null;
  classification: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFolderPayload {
  name: string;
  parentId?: string | null;
  classification?: string;
}

export interface RenameFilePayload {
  newName: string;
}

export const filesApi = {
  list(parentId?: string | null): Promise<BackendFileNode[]> {
    const qs = parentId ? `?parentId=${parentId}` : "";
    return apiFetch(`/api/files${qs}`);
  },

  get(id: string): Promise<BackendFileNode> {
    return apiFetch(`/api/files/${id}`);
  },

  createFolder(payload: CreateFolderPayload): Promise<BackendFileNode> {
    return apiFetch("/api/files/folder", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  upload(formData: FormData): Promise<BackendFileNode> {
    return apiFetch("/api/files/upload", {
      method: "POST",
      body: formData,
    });
  },

  rename(id: string, payload: RenameFilePayload): Promise<BackendFileNode> {
    return apiFetch(`/api/files/${id}/rename`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string): Promise<void> {
    return apiFetch(`/api/files/${id}`, { method: "DELETE" });
  },
};

// ── Audit API ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  action: string;
  targetResource: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export const auditApi = {
  list(): Promise<AuditLogEntry[]> {
    return apiFetch("/api/audit");
  },
};

// ── Admin API ────────────────────────────────────────────────────────────────

export interface AdminLoginPayload {
  username: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  username: string;
}

export interface AdminUserEntry {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: string;
}

export interface AdminUpdateUserPayload {
  fullName?: string;
  role?: string;
  password?: string;
}

export const adminApi = {
  login(payload: AdminLoginPayload): Promise<AdminLoginResponse> {
    return apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listUsers(): Promise<AdminUserEntry[]> {
    return apiFetch("/api/admin/users", {}, true);
  },

  createUser(payload: AdminCreateUserPayload): Promise<AdminUserEntry> {
    return apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  updateUser(id: string, payload: AdminUpdateUserPayload): Promise<AdminUserEntry> {
    return apiFetch(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, true);
  },

  deleteUser(id: string): Promise<void> {
    return apiFetch(`/api/admin/users/${id}`, { method: "DELETE" }, true);
  },
};

// ── Utilities ────────────────────────────────────────────────────────────────

/** Format raw byte count into a human-readable size string. */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const val = bytes / Math.pow(1024, i);
  return `${i === 0 ? val.toFixed(0) : val.toFixed(1)} ${units[i]}`;
}

/** Format ISO 8601 timestamp to "YYYY-MM-DD HH:MM" display format. */
export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toISOString().slice(0, 16).replace("T", " ");
  } catch {
    return iso;
  }
}
