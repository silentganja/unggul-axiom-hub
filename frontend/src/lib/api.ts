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
  active: boolean;
  createdAt: string;
}

export interface LoginResponse {
  token: string;
  user: UserProfile;
}

export interface UpdateProfilePayload {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
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

  updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    return apiFetch("/api/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  forgotPassword(email: string): Promise<{ message: string; token?: string }> {
    return apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  },

  requestMagicLink(email: string): Promise<{ message: string; token?: string }> {
    return apiFetch("/api/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyMagicLink(token: string): Promise<{ token: string }> {
    return apiFetch(`/api/auth/magic-link?token=${encodeURIComponent(token)}`);
  },
};

// ── WebAuthn helpers ─────────────────────────────────────────────────────────

function b64urlToBuffer(b64: string): ArrayBuffer {
  const b64u = b64.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64u.length % 4;
  const padded = pad ? b64u + "=".repeat(4 - pad) : b64u;
  const raw = atob(padded);
  const buf = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
  return buf.buffer;
}

export const webauthnApi = {
  async registerBegin(): Promise<{
    challenge: string;
    rpId: string;
    rpName: string;
    userId: string;
    userName: string;
    userDisplayName: string;
  }> {
    return apiFetch("/api/auth/webauthn/register/begin");
  },

  async registerComplete(credential: PublicKeyCredential): Promise<{ status: string }> {
    return apiFetch("/api/auth/webauthn/register/complete", {
      method: "POST",
      body: JSON.stringify(credential),
    });
  },

  async loginBegin(): Promise<{ challenge: string; rpId: string }> {
    return apiFetch("/api/auth/webauthn/login/begin");
  },

  async loginComplete(credential: PublicKeyCredential): Promise<{ token: string }> {
    return apiFetch("/api/auth/webauthn/login/complete", {
      method: "POST",
      body: JSON.stringify(credential),
    });
  },

  async startRegistration() {
    const opts = await this.registerBegin();
    const publicKey: PublicKeyCredentialCreationOptions = {
      challenge: b64urlToBuffer(opts.challenge),
      rp: { name: opts.rpName, id: opts.rpId },
      user: {
        id: b64urlToBuffer(opts.userId),
        name: opts.userName,
        displayName: opts.userDisplayName,
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "preferred",
      },
      timeout: 60000,
      attestation: "none",
    };
    const cred = await navigator.credentials.create({ publicKey });
    return this.registerComplete(cred as PublicKeyCredential);
  },

  async startLogin() {
    const opts = await this.loginBegin();
    const publicKey: PublicKeyCredentialRequestOptions = {
      challenge: b64urlToBuffer(opts.challenge),
      rpId: opts.rpId,
      timeout: 60000,
      userVerification: "preferred",
    };
    const cred = await navigator.credentials.get({ publicKey });
    return this.loginComplete(cred as PublicKeyCredential);
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
  lockedBy: string | null; // UUID of locking user
  lockedAt: string | null;
}

export interface FileListResponse {
  files: BackendFileNode[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface ListFilesParams {
  parentId?: string | null;
  q?: string;
  page?: number;
  perPage?: number;
  sort?: string;
  order?: string;
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
  list(params: ListFilesParams = {}): Promise<FileListResponse> {
    const qs = new URLSearchParams();
    if (params.parentId) qs.set("parentId", params.parentId);
    if (params.q) qs.set("q", params.q);
    if (params.page) qs.set("page", String(params.page));
    if (params.perPage) qs.set("perPage", String(params.perPage));
    if (params.sort) qs.set("sort", params.sort);
    if (params.order) qs.set("order", params.order);
    const str = qs.toString();
    return apiFetch("/api/files" + (str ? "?" + str : ""));
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

  listTrash(): Promise<BackendFileNode[]> {
    return apiFetch("/api/files/trash");
  },

  restore(id: string): Promise<BackendFileNode> {
    return apiFetch(`/api/files/${id}/restore`, { method: "POST" });
  },

  permanentDelete(id: string): Promise<void> {
    return apiFetch(`/api/files/${id}/permanent`, { method: "DELETE" });
  },

  getQuota(): Promise<QuotaResponse> {
    return apiFetch("/api/files/quota");
  },

  moveFiles(fileIds: string[], targetFolderId: string | null): Promise<{ moved: number }> {
    return apiFetch("/api/files/move", {
      method: "POST",
      body: JSON.stringify({ fileIds, targetFolderId }),
    });
  },

  downloadUrl(id: string): string {
    const token = localStorage.getItem("auth-token");
    return `${API_BASE}/api/files/${id}/download?token=${token || ""}`;
  },

  contentUrl(id: string): string {
    const token = localStorage.getItem("auth-token");
    return `${API_BASE}/api/files/${id}/content?token=${token || ""}`;
  },

  async getContent(id: string): Promise<{ data: ArrayBuffer; mimeType: string }> {
    const token = localStorage.getItem("auth-token");
    const res = await fetch(`${API_BASE}/api/files/${id}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch content");
    const mimeType = res.headers.get("Content-Type") || "application/octet-stream";
    const data = await res.arrayBuffer();
    return { data, mimeType };
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

// ── Governance API ───────────────────────────────────────────────────────────

export interface GovernanceRequest {
  id: string;
  type: "FILE_LOCK" | "FILE_UNLOCK" | "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE";
  title: string;
  description: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedBy: string;
  requestedByName: string;
  requestedByEmail: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  targetFileId: string | null;
  targetFileName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGovernancePayload {
  type: string;
  title: string;
  description?: string;
  targetFileId?: string;
  metadata?: Record<string, unknown>;
}

export const governanceApi = {
  list(): Promise<GovernanceRequest[]> {
    return apiFetch("/api/governance/requests");
  },

  create(payload: CreateGovernancePayload): Promise<GovernanceRequest> {
    return apiFetch("/api/governance/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  approve(id: string): Promise<{ status: string }> {
    return apiFetch(`/api/governance/requests/${id}/approve`, { method: "POST" });
  },

  reject(id: string): Promise<{ status: string }> {
    return apiFetch(`/api/governance/requests/${id}/reject`, { method: "POST" });
  },
};

// ── Shares API ───────────────────────────────────────────────────────────────

export interface ShareUserInfo {
  id: string;
  fullName: string;
  email: string;
}

export interface SharedFileNode {
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
  shareRole: string;
  sharedBy: ShareUserInfo;
}

export interface FileShareEntry {
  id: string;
  user: ShareUserInfo;
  role: string;
  createdAt: string;
}

export interface ShareFilePayload {
  email: string;
  role: string;
}

export interface QuotaResponse {
  usedBytes: number;
  quotaBytes: number;
  fileCount: number;
  folderCount: number;
}

// ── Activity API ─────────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  action: string;
  targetResource: string | null;
  actor: string;
  occurredAt: string;
}

export const activityApi = {
  getFeed(): Promise<ActivityEntry[]> {
    return apiFetch("/api/activity");
  },
};

export const sharesApi = {
  listShared(): Promise<SharedFileNode[]> {
    return apiFetch("/api/files/shared");
  },

  listFileShares(fileId: string): Promise<FileShareEntry[]> {
    return apiFetch(`/api/files/${fileId}/shares`);
  },

  shareFile(fileId: string, payload: ShareFilePayload): Promise<{ status: string }> {
    return apiFetch(`/api/files/${fileId}/share`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  removeShare(fileId: string, userId: string): Promise<void> {
    return apiFetch(`/api/files/${fileId}/share/${userId}`, { method: "DELETE" });
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
  active: boolean;
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

  getDashboard(): Promise<AdminDashboard> {
    return apiFetch("/api/admin/dashboard", {}, true);
  },

  getUserFiles(userId: string): Promise<BackendFileNode[]> {
    return apiFetch(`/api/admin/users/${userId}/files`, {}, true);
  },

  resetUserPassword(userId: string, newPassword: string): Promise<void> {
    return apiFetch(`/api/admin/users/${userId}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword }),
    }, true);
  },

  toggleUserActive(userId: string): Promise<void> {
    return apiFetch(`/api/admin/users/${userId}/toggle-active`, { method: "POST" }, true);
  },

  forceDeleteFile(fileId: string): Promise<void> {
    return apiFetch(`/api/admin/files/${fileId}/force`, { method: "DELETE" }, true);
  },

  getConfig(): Promise<Record<string, string>> {
    return apiFetch("/api/admin/config", {}, true);
  },

  updateConfig(key: string, value: string): Promise<void> {
    return apiFetch("/api/admin/config", { method: "PUT", body: JSON.stringify({ key, value }) }, true);
  },

  getAdminGovernance(): Promise<GovernanceRequest[]> {
    return apiFetch("/api/admin/governance", {}, true);
  },

  forceApprove(requestId: string, reviewerId: string): Promise<void> {
    return apiFetch(`/api/admin/governance/${requestId}/force-approve`, {
      method: "POST", body: JSON.stringify({ reviewerId }),
    }, true);
  },

  getStorageBreakdown(): Promise<UserStorageRow[]> {
    return apiFetch("/api/admin/storage-breakdown", {}, true);
  },

  bulkCreateUsers(users: Array<{ email: string; password: string; fullName: string; role: string }>): Promise<{ created: number; errors: string[] }> {
    return apiFetch("/api/admin/users/bulk", { method: "POST", body: JSON.stringify({ users }) }, true);
  },

  bulkRoleUpdate(userIds: string[], newRole: string): Promise<{ updated: number }> {
    return apiFetch("/api/admin/users/bulk-role", { method: "PUT", body: JSON.stringify({ userIds, newRole }) }, true);
  },
};

export interface UserStorageRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  fileCount: number;
  totalBytes: number;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  totalFiles: number;
  totalFolders: number;
  storageUsedBytes: number;
  pendingGovernance: number;
  lockedFiles: number;
  sharedFiles: number;
}

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
