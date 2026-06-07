// ─────────────────────────────────────────────────────────────────────────────
// Unggul Axiom Hub - API Client
// Centralised fetch wrapper with JWT handling, auth redirects, and typed helpers.
// ─────────────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Helper to set cookie client-side
function setCookie(name: string, value: string, maxAgeSecs: number): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSecs}; SameSite=Lax`;
}

// Helper to delete cookie client-side
function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

// ── Helper to resolve avatar URLs ──────────────────────────────────────────
export function getAvatarUrl(avatarData: string | null | undefined): string | null {
  if (!avatarData) return null;
  if (avatarData.startsWith("data:")) return avatarData;
  if (avatarData.startsWith("/")) return `${API_BASE}${avatarData}`;
  return avatarData;
}

// ── Token management ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth-token");
}

export function setToken(token: string): void {
  localStorage.setItem("auth-token", token);
  setCookie("auth-token", token, 7 * 24 * 3600);
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth-refresh-token");
}

export function setRefreshToken(token: string): void {
  localStorage.setItem("auth-refresh-token", token);
}

export function clearToken(): void {
  localStorage.removeItem("auth-token");
  localStorage.removeItem("auth-refresh-token");
  localStorage.removeItem("auth-user");
  localStorage.removeItem("unggul-favorites");
  deleteCookie("auth-token");
}

// ── Token refresh logic ──────────────────────────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns true if refresh succeeded, false otherwise.
 * Deduplicates concurrent refresh attempts — closes the TOCTOU window between
 * `isRefreshing` assignment and `refreshPromise` assignment by building the
 * promise before setting both flags.
 */
export async function attemptTokenRefresh(): Promise<boolean> {
  // If already refreshing, wait for the existing attempt
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  const rt = getRefreshToken();
  if (!rt) return false;

  // Build the promise FIRST, then set both guards atomically.
  // This closes the window where isRefreshing === true but refreshPromise is
  // still null, which previously allowed concurrent calls to start a second,
  // conflicting refresh request.
  const promise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      setToken(data.token);
      setRefreshToken(data.refreshToken);

      return true;
    } catch {
      return false;
    }
  })();

  isRefreshing = true;
  refreshPromise = promise;

  try {
    return await promise;
  } finally {
    isRefreshing = false;
    refreshPromise = null;
  }
}

// ── Admin token management (separate from user auth) ─────────────────────────

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin-token");
}

export function setAdminToken(token: string): void {
  localStorage.setItem("admin-token", token);
  setCookie("admin-token", token, 7 * 24 * 3600);
}

export function clearAdminToken(): void {
  localStorage.removeItem("admin-token");
  localStorage.removeItem("admin-user");
  deleteCookie("admin-token");
}

// ── Core fetch wrapper ───────────────────────────────────────────────────────

class AuthError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "AuthError";
  }
}

/**
 * Force-clear all auth state and redirect to the appropriate login page.
 * Called when the 401 handler determines the session is unrecoverable.
 * Uses a synchronous module-level dispatch so api.ts doesn't circular-import
 * from the Zustand stores.
 */
let onForceLogout: (() => void) | null = null;

export function registerForceLogoutHandler(handler: () => void): void {
  onForceLogout = handler;
}

function forceLogout(useAdminToken: boolean): void {
  if (useAdminToken) {
    clearAdminToken();
  } else {
    clearToken();
  }
  // Notify the auth stores to reset their in-memory state BEFORE the redirect
  if (onForceLogout) onForceLogout();
  if (typeof window !== "undefined") {
    window.location.href = useAdminToken ? "/dev/admin" : "/login";
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

  // Timeout: abort requests that take longer than 15 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { ...headers, ...((options.headers as Record<string, string>) || {}) },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("Request timed out - server may be unreachable");
    }
    throw err;
  }
  clearTimeout(timeoutId);

  if (res.status === 401) {
    // Only redirect if we're NOT already on a login page -
    // a 401 from /api/auth/login means "wrong credentials", not "expired session".
    const isOnLoginPage =
      typeof window !== "undefined" &&
      (window.location.pathname === "/login" || window.location.pathname === "/dev/admin");

    if (!isOnLoginPage) {
      // Try to refresh the access token first (silent renewal).
      // Admin tokens use an 8h expiry and are validated on hydrate — no refresh.
      if (!useAdminToken) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          // Retry the original request with the new token
          const newToken = getToken();
          const retryRes = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
              ...headers,
              ...((options.headers as Record<string, string>) || {}),
              Authorization: `Bearer ${newToken}`,
            },
          });

          if (retryRes.ok) {
            if (retryRes.status === 204) return undefined as T;
            return retryRes.json();
          }

          // If refresh succeeded but the request still fails, check if
          // it's another 401 (shouldn't happen normally)
          if (retryRes.status !== 401) {
            const body = await retryRes.json().catch(() => ({ error: "Request failed" }));
            throw new Error(body.error || `HTTP ${retryRes.status}`);
          }
        }
      }

      // Refresh failed or not applicable - redirect to login
      forceLogout(useAdminToken);
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
  avatarData?: string | null;
  department?: string | null;
  supervisorName?: string | null;
  notificationPrefs?: Record<string, boolean> | null;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: UserProfile;
}

export interface UpdateProfilePayload {
  fullName?: string;
  currentPassword?: string;
  newPassword?: string;
  department?: string;
  supervisorId?: string | null;
}

export interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  location: string;
  ip: string;
  isCurrent: boolean;
  lastActive: string;
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

  refresh(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    return apiFetch("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });
  },

  logout(refreshToken?: string): Promise<{ status: string }> {
    return apiFetch("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken: refreshToken || null }),
    });
  },

  forgotPassword(email: string): Promise<{ message: string }> {
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

  requestMagicLink(email: string): Promise<{ message: string }> {
    return apiFetch("/api/auth/magic-link", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  verifyMagicLink(token: string): Promise<{ token: string; refreshToken: string }> {
    return apiFetch(`/api/auth/magic-link?token=${encodeURIComponent(token)}`);
  },

  uploadAvatar(avatarData: string): Promise<UserProfile> {
    return apiFetch("/api/auth/avatar", {
      method: "POST",
      body: JSON.stringify({ avatarData }),
    });
  },

  deleteAvatar(): Promise<UserProfile> {
    return apiFetch("/api/auth/avatar", { method: "DELETE" });
  },

  getNotificationPrefs(): Promise<Record<string, boolean>> {
    return apiFetch("/api/auth/notification-prefs");
  },

  updateNotificationPrefs(prefs: Record<string, boolean>): Promise<Record<string, boolean>> {
    return apiFetch("/api/auth/notification-prefs", {
      method: "PUT",
      body: JSON.stringify(prefs),
    });
  },

  getSessions(): Promise<SessionInfo[]> {
    return apiFetch("/api/auth/sessions");
  },

  revokeSession(id: string): Promise<void> {
    return apiFetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
  },

  mePermissions(): Promise<EffectivePermissions> {
    return apiFetch("/api/auth/me/permissions");
  },

  myTeam(): Promise<TeamMember[]> {
    return apiFetch("/api/auth/team");
  },

  listColleagues(): Promise<ColleagueEntry[]> {
    return apiFetch("/api/auth/colleagues");
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

  async loginComplete(credential: PublicKeyCredential): Promise<{ token: string; refreshToken: string }> {
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
    const result = await this.loginComplete(cred as PublicKeyCredential);
    // Store tokens so the session is properly established
    setToken(result.token);
    setRefreshToken(result.refreshToken);
    return result;
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
  lockReason?: string | null;
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

  updateClassification(id: string, classification: string): Promise<BackendFileNode> {
    return apiFetch(`/api/files/${id}/classification`, {
      method: "PUT",
      body: JSON.stringify({ classification }),
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

  /** Returns a token-free URL for the download endpoint (auth handled via cookies/param in legacy mode). */
  downloadUrl(id: string): string {
    return `${API_BASE}/api/files/${id}/download`;
  },

  contentUrl(id: string): string {
    return `${API_BASE}/api/files/${id}/content`;
  },

  /** Fetch file content with auth + auto-refresh (no token in URL). */
  async getContent(id: string): Promise<{ data: ArrayBuffer; mimeType: string }> {
    const token = getToken();
    let res = await fetch(`${API_BASE}/api/files/${id}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // If 401, try refreshing the token first (uses shared attemptTokenRefresh)
    if (res.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        res = await fetch(`${API_BASE}/api/files/${id}/content`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      }
    }

    if (!res.ok) throw new Error("Failed to fetch content");
    const mimeType = res.headers.get("Content-Type") || "application/octet-stream";
    const data = await res.arrayBuffer();
    return { data, mimeType };
  },

  /** Download a file with auth header, 401 auto-refresh, and browser save dialog. */
  async downloadFile(id: string, filename: string): Promise<void> {
    const token = getToken();
    if (!token) throw new Error("Not authenticated");

    let res = await fetch(`${API_BASE}/api/files/${id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // If 401, try refreshing the token (same pattern as getContent)
    if (res.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        res = await fetch(`${API_BASE}/api/files/${id}/download`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      }
    }

    if (!res.ok) throw new Error("Download failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};

// ── Audit API ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  targetResource: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogListResponse {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface AuditLogParams {
  page?: number;
  perPage?: number;
  userId?: string;
  action?: string;
  from?: string;
  to?: string;
}

export const auditApi = {
  list(params?: AuditLogParams): Promise<AuditLogListResponse> {
    if (params) {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.perPage) qs.set("perPage", String(params.perPage));
      if (params.userId) qs.set("userId", params.userId);
      if (params.action) qs.set("action", params.action);
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
      const str = qs.toString();
      return apiFetch("/api/audit" + (str ? "?" + str : ""));
    }
    return apiFetch("/api/audit");
  },
};

// ── Governance API ───────────────────────────────────────────────────────────

export interface GovernanceRequest {
  id: string;
  type: "FILE_LOCK" | "FILE_UNLOCK" | "CLASSIFICATION_UPGRADE" | "CLASSIFICATION_DOWNGRADE" | "FILE_MOVE" | "FILE_DELETE";
  title: string;
  description: string | null;
  reviewNote: string | null;
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

export interface ListGovernanceParams {
  page?: number;
  perPage?: number;
  status?: string;
  type?: string;
}

export interface GovernanceListResponse {
  requests: GovernanceRequest[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const governanceApi = {
  list(params?: ListGovernanceParams): Promise<GovernanceListResponse> {
    if (params) {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.perPage) qs.set("perPage", String(params.perPage));
      if (params.status) qs.set("status", params.status);
      if (params.type) qs.set("type", params.type);
      const str = qs.toString();
      return apiFetch("/api/governance/requests" + (str ? "?" + str : ""));
    }
    return apiFetch("/api/governance/requests");
  },

  create(payload: CreateGovernancePayload): Promise<GovernanceRequest> {
    return apiFetch("/api/governance/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  approve(id: string, reason?: string): Promise<{ status: string }> {
    return apiFetch(`/api/governance/requests/${id}/approve`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  reject(id: string, reason?: string): Promise<{ status: string }> {
    return apiFetch(`/api/governance/requests/${id}/reject`, {
      method: "POST",
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  batchApprove(ids: string[], reason?: string): Promise<{ status: string; approved: number }> {
    return apiFetch("/api/governance/requests/batch/approve", {
      method: "POST",
      body: JSON.stringify(reason ? { ids, reason } : { ids }),
    });
  },

  batchReject(ids: string[], reason?: string): Promise<{ status: string; rejected: number }> {
    return apiFetch("/api/governance/requests/batch/reject", {
      method: "POST",
      body: JSON.stringify(reason ? { ids, reason } : { ids }),
    });
  },

  undo(id: string): Promise<{ status: string }> {
    return apiFetch(`/api/governance/requests/${id}/undo`, {
      method: "POST",
    });
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

export interface UserStorageRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  fileCount: number;
  totalBytes: number;
  quotaBytes: number | null;
}

export interface StorageAnalytics {
  byClassification: Array<{
    classification: string;
    bytes: number;
    fileCount: number;
  }>;
  largestFiles: Array<{
    id: string;
    name: string;
    sizeBytes: number;
    ownerId?: string;
    ownerName: string;
    classification: string;
  }>;
  storageTrend: Array<{
    date: string;
    bytes: number;
  }>;
  overQuotaUsers: Array<{
    userId: string;
    fullName: string;
    email?: string;
    usedBytes: number;
    quotaBytes: number;
  }>;
}

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
  storageQuotaBytes: number | null;
  supervisorId?: string | null;
  department?: string | null;
  createdAt: string;
}

export interface AdminCreateUserPayload {
  email: string;
  password: string;
  fullName: string;
  role: string;
  storageQuotaBytes?: number | null;
  supervisorId?: string;
  department?: string;
}

export interface AdminUpdateUserPayload {
  fullName?: string;
  role?: string;
  password?: string;
  storageQuotaBytes?: number | null;
  supervisorId?: string | null;
  department?: string;
}

export const adminApi = {
  login(payload: AdminLoginPayload): Promise<AdminLoginResponse> {
    return apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /** Lightweight token validation — single-row response, no aggregate queries. */
  validateToken(): Promise<{ status: string }> {
    return apiFetch("/api/admin/validate", {}, true);
  },

  listUsers(): Promise<AdminUserEntry[]> {
    return apiFetch("/api/admin/users", {}, true);
  },

  listUsersPaginated(options: { page: number; perPage: number; q?: string }): Promise<{
    users: AdminUserEntry[];
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();
    params.set("page", String(options.page));
    params.set("perPage", String(options.perPage));
    if (options.q) {
      params.set("q", options.q);
    }
    return apiFetch(`/api/admin/users?${params.toString()}`, {}, true);
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

  getAdminGovernance(): Promise<GovernanceListResponse> {
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

  listShares(): Promise<AllSharesRow[]> {
    return apiFetch("/api/admin/shares", {}, true);
  },

  revokeShare(shareId: string): Promise<void> {
    return apiFetch(`/api/admin/shares/${shareId}`, { method: "DELETE" }, true);
  },

  transferOwnership(fileId: string, newOwnerId: string): Promise<void> {
    return apiFetch(`/api/admin/files/${fileId}/transfer-ownership`, {
      method: "POST", body: JSON.stringify({ newOwnerId }),
    }, true);
  },

  getStorageAnalytics(): Promise<StorageAnalytics> {
    return apiFetch("/api/admin/storage-analytics", {}, true);
  },

  getUserDetail(userId: string): Promise<UserDetail> {
    return apiFetch(`/api/admin/users/${userId}/detail`, {}, true);
  },

  listAuditLogs(params?: AuditLogParams): Promise<AuditLogListResponse> {
    if (params) {
      const qs = new URLSearchParams();
      if (params.page) qs.set("page", String(params.page));
      if (params.perPage) qs.set("perPage", String(params.perPage));
      if (params.userId) qs.set("userId", params.userId);
      if (params.action) qs.set("action", params.action);
      if (params.from) qs.set("from", params.from);
      if (params.to) qs.set("to", params.to);
      const str = qs.toString();
      return apiFetch("/api/admin/audit" + (str ? "?" + str : ""), {}, true);
    }
    return apiFetch("/api/admin/audit", {}, true);
  },

  // ── Role Builder ──────────────────────────────────────────────────────────

  listPermissions(): Promise<Permission[]> {
    return apiFetch("/api/admin/permissions", {}, true);
  },

  listRoleGroups(): Promise<RoleGroupSummary[]> {
    return apiFetch("/api/admin/role-groups", {}, true);
  },

  createRoleGroup(payload: { name: string; description?: string }): Promise<RoleGroupDetail> {
    return apiFetch("/api/admin/role-groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  getRoleGroup(id: string): Promise<RoleGroupDetail> {
    return apiFetch(`/api/admin/role-groups/${id}`, {}, true);
  },

  updateRoleGroup(id: string, payload: { name?: string; description?: string }): Promise<RoleGroupDetail> {
    return apiFetch(`/api/admin/role-groups/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, true);
  },

  deleteRoleGroup(id: string): Promise<void> {
    return apiFetch(`/api/admin/role-groups/${id}`, { method: "DELETE" }, true);
  },

  setRoleGroupPermissions(id: string, permissionIds: string[]): Promise<RoleGroupDetail> {
    return apiFetch(`/api/admin/role-groups/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionIds }),
    }, true);
  },

  listRoleGroupUsers(id: string): Promise<RoleGroupUser[]> {
    return apiFetch(`/api/admin/role-groups/${id}/users`, {}, true);
  },

  setRoleGroupUsers(id: string, userIds: string[]): Promise<void> {
    return apiFetch(`/api/admin/role-groups/${id}/users`, {
      method: "PUT",
      body: JSON.stringify({ userIds }),
    }, true);
  },

  listUserGroups(userId: string): Promise<UserGroupEntry[]> {
    return apiFetch(`/api/admin/users/${userId}/groups`, {}, true);
  },

  duplicateRoleGroup(id: string, name?: string): Promise<RoleGroupDetail> {
    return apiFetch(`/api/admin/role-groups/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }, true);
  },

  listUserGroupSummaries(): Promise<Record<string, string[]>> {
    return apiFetch("/api/admin/users/group-summaries", {}, true);
  },

  // ── Permissions CRUD ───────────────────────────────────────────────────

  createPermission(payload: { key: string; description: string }): Promise<Permission> {
    return apiFetch("/api/admin/permissions", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  updatePermission(id: string, description: string): Promise<Permission> {
    return apiFetch(`/api/admin/permissions/${id}`, {
      method: "PUT",
      body: JSON.stringify({ description }),
    }, true);
  },

  deletePermission(id: string): Promise<void> {
    return apiFetch(`/api/admin/permissions/${id}`, { method: "DELETE" }, true);
  },

  // ── Custom Roles CRUD ──────────────────────────────────────────────────

  listCustomRoles(): Promise<CustomRoleEntry[]> {
    return apiFetch("/api/admin/roles", {}, true);
  },

  createCustomRole(payload: { roleKey: string; label: string; level: number }): Promise<CustomRoleEntry> {
    return apiFetch("/api/admin/roles", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  deleteCustomRole(roleKey: string): Promise<void> {
    return apiFetch(`/api/admin/roles/${roleKey}`, { method: "DELETE" }, true);
  },

  getRoleImplicitPermissions(roleKey: string): Promise<Permission[]> {
    return apiFetch(`/api/admin/roles/${roleKey}/permissions`, {}, true);
  },

  setRoleImplicitPermissions(roleKey: string, permissionIds: string[]): Promise<void> {
    return apiFetch(`/api/admin/roles/${roleKey}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionIds }),
    }, true);
  },

  // ── Per-user permission grants ─────────────────────────────────────────

  listUserPermissions(userId: string): Promise<Permission[]> {
    return apiFetch(`/api/admin/users/${userId}/permissions`, {}, true);
  },

  setUserPermissions(userId: string, permissionIds: string[]): Promise<void> {
    return apiFetch(`/api/admin/users/${userId}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissionIds }),
    }, true);
  },

  // ── Classifications Builder ──────────────────────────────────────────────

  listClassifications(): Promise<ClassificationEntry[]> {
    return apiFetch("/api/admin/classifications", {}, true);
  },

  createClassification(payload: {
    key: string;
    label: string;
    level?: number;
    description?: string;
    isDefault?: boolean;
  }): Promise<ClassificationEntry> {
    return apiFetch("/api/admin/classifications", {
      method: "POST",
      body: JSON.stringify(payload),
    }, true);
  },

  updateClassification(
    id: string,
    payload: {
      key?: string;
      label?: string;
      level?: number;
      description?: string;
      isDefault?: boolean;
    }
  ): Promise<ClassificationEntry> {
    return apiFetch(`/api/admin/classifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, true);
  },

  deleteClassification(id: string): Promise<void> {
    return apiFetch(`/api/admin/classifications/${id}`, { method: "DELETE" }, true);
  },

  getClassificationPermissions(
    id: string
  ): Promise<ClassificationAccessDetail> {
    return apiFetch(`/api/admin/classifications/${id}/permissions`, {}, true);
  },

  setClassificationPermissions(
    id: string,
    payload: { readPermissionIds: string[]; writePermissionIds: string[] }
  ): Promise<void> {
    return apiFetch(`/api/admin/classifications/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }, true);
  },

  getDefaultClassification(): Promise<ClassificationEntry> {
    return apiFetch("/api/admin/classifications/default", {}, true);
  },

  setDefaultClassification(classificationId: string): Promise<void> {
    return apiFetch("/api/admin/classifications/default", {
      method: "PUT",
      body: JSON.stringify({ classificationId }),
    }, true);
  },

  // ── Database Reset (danger zone) ────────────────────────────────────────

  getResetToken(): Promise<{ token: string; expiresInSeconds: number }> {
    return apiFetch("/api/admin/reset-token", {}, true);
  },

  resetDatabase(token: string): Promise<ResetDatabaseResponse> {
    return apiFetch("/api/admin/reset-database", {
      method: "POST",
      body: JSON.stringify({ token }),
    }, true);
  },
};

// ── Public API (authenticated, not admin-gated) ─────────────────────────────

export interface PublicClassificationEntry {
  key: string;
  label: string;
  level: number;
}

export const publicApi = {
  /** Fetch all classification tiers for dashboard dropdowns. */
  listClassifications(): Promise<PublicClassificationEntry[]> {
    return apiFetch("/api/classifications", {}, false);
  },
};

// ── Auth: effective permissions ───────────────────────────────────────────

export interface EffectivePermissions {
  permissions: string[];
  groups: { id: string; name: string; description: string }[];
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  active: boolean;
  department?: string | null;
}

export interface ColleagueEntry {
  id: string;
  fullName: string;
  role: string;
  department?: string | null;
}

// ── Role Builder types ────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  key: string;
  description: string;
}

export interface RoleGroupSummary {
  id: string;
  name: string;
  description: string;
  permissionCount: number;
  userCount: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleGroupDetail {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface RoleGroupUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
}

export interface UserGroupEntry {
  id: string;
  name: string;
  description: string;
}

export interface CustomRoleEntry {
  roleKey: string;
  label: string;
  level: number;
}

// ── Classification Builder types ─────────────────────────────────────────

export interface ClassificationEntry {
  id: string;
  key: string;
  label: string;
  level: number;
  description: string;
  isDefault: boolean;
  fileCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassificationAccessDetail {
  classificationId: string;
  classificationKey: string;
  readPermissions: Permission[];
  writePermissions: Permission[];
}

// ── Database Reset types ─────────────────────────────────────────────────

export interface TableWipeResult {
  tableName: string;
  rowsDeleted: number;
}

export interface ResetDatabaseResponse {
  wiped: {
    tables: TableWipeResult[];
    totalRowsDeleted: number;
  };
  preserved: string[];
}

export interface UserStorageRow {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  fileCount: number;
  totalBytes: number;
  storageQuotaBytes: number | null;
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

export interface AllSharesRow {
  id: string;
  fileId: string;
  fileName: string;
  sharedById: string;
  sharedByName: string;
  sharedWithId: string;
  sharedWithName: string;
  sharedWithEmail: string;
  role: string;
  createdAt: string;
}



export interface UserDetailActivity {
  id: string;
  action: string;
  targetResource: string | null;
  createdAt: string;
}

export interface UserDetail {
  id: string;
  email: string;
  fullName: string;
  role: string;
  active: boolean;
  storageQuotaBytes: number | null;
  createdAt: string;
  lastLoginAt: string | null;
  storageUsedBytes: number;
  fileCount: number;
  folderCount: number;
  governanceTotal: number;
  governancePending: number;
  recentActivity: UserDetailActivity[];
}

// ── Favorites API ─────────────────────────────────────────────────────────────

export interface FavoriteFile {
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
  favoritedAt: string;
}

export const favoritesApi = {
  list(): Promise<FavoriteFile[]> {
    return apiFetch("/api/files/favorites");
  },

  add(fileId: string): Promise<{ status: string }> {
    return apiFetch("/api/files/favorites", {
      method: "POST",
      body: JSON.stringify({ fileId }),
    });
  },

  remove(fileId: string): Promise<{ status: string }> {
    return apiFetch(`/api/files/favorites/${fileId}`, { method: "DELETE" });
  },
};

// ── File Versions API ─────────────────────────────────────────────────────────

export interface FileVersion {
  id: string;
  fileId: string;
  versionNumber: number;
  sizeBytes: number;
  storagePath: string;
  uploadedBy: string | null;
  createdAt: string;
}

export const versionsApi = {
  list(fileId: string): Promise<FileVersion[]> {
    return apiFetch(`/api/files/${fileId}/versions`);
  },

  restore(fileId: string, versionId: string): Promise<{ status: string; versionNumber: number }> {
    return apiFetch(`/api/files/${fileId}/versions/${versionId}/restore`, { method: "POST" });
  },
};

// ── Notifications / SSE ───────────────────────────────────────────────────────

export interface NotificationEvent {
  type: "governance_update" | "share_added" | "file_locked" | "file_unlocked" | "file_uploaded";
  requestId?: string;
  status?: string;
  title?: string;
  fileName?: string;
  fileId?: string;
  sharedBy?: string;
  lockedBy?: string;
  sizeBytes?: number;
}

/**
 * Subscribe to server-sent events for real-time notifications.
 *
 * NOTE: EventSource does not support custom headers, so the JWT is passed
 * as a query parameter. This is a known limitation:
 *   - The token is visible in server access logs and browser devtools.
 *   - The token is never refreshed during an SSE connection. If the token
 *     expires before the connection drops, reconnection will fail.
 * Future improvement: use short-lived SSE-only tokens or a WebSocket with
 * proper header-based auth.
 */
export function subscribeToNotifications(
  onEvent: (event: NotificationEvent) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isClosed = false;
  let reconnectTimeout: NodeJS.Timeout | null = null;

  function connect() {
    if (isClosed) return;

    const token = getToken();
    if (!token) return;

    if (eventSource) {
      eventSource.close();
    }

    eventSource = new EventSource(
      `${API_BASE}/api/notifications/stream?token=${token}`
    );

    eventSource.onmessage = (msg) => {
      try {
        const event: NotificationEvent = JSON.parse(msg.data);
        onEvent(event);
      } catch {
        // Ignore parse errors on heartbeat/comment lines
      }
    };

    eventSource.onerror = () => {
      if (isClosed) return;

      // Close the current eventSource to avoid default reconnect
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }

      // Wait 5 seconds, attempt token refresh, then reconnect
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      reconnectTimeout = setTimeout(async () => {
        const refreshed = await attemptTokenRefresh();
        if (refreshed && !isClosed) {
          connect();
        } else if (!isClosed) {
          // If refresh failed, retry again after backoff
          connect();
        }
      }, 5000);
    };
  }

  connect();

  return () => {
    isClosed = true;
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (eventSource) {
      eventSource.close();
    }
  };
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

/** Format ISO 8601 timestamp to locale-aware display format. */
export function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return iso;
  }
}
