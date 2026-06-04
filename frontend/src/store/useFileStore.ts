import { create } from "zustand";
import {
  filesApi,
  sharesApi,
  favoritesApi,
  BackendFileNode,
  FileListResponse,
  SharedFileNode,
  FileShareEntry,
  formatFileSize,
  formatTimestamp,
  getToken,
  attemptTokenRefresh,
} from "@/lib/api";

// ── Frontend FileNode (UI-facing shape) ──────────────────────────────────────

export interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
}

export interface FileNode {
  id: string;
  name: string;
  type: "file" | "folder";
  size: string; // Pre-formatted human-readable
  sizeBytes: number; // Raw bytes from backend
  modifiedAt: string;
  classification: string;
  accessRole: "owner" | "editor" | "viewer";
  isFavorite: boolean;
  collaborators: Collaborator[];
  parentId: string | null;
  lockedBy?: string | null;
  lockReason?: string | null;
  lockedAt?: string | null;
  mimeType?: string | null;
}

// ── Favorite persistence ─────────────────────────────────────────────────────

const FAVORITES_KEY = "unggul-favorites";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(ids: Set<string>): void {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...ids]));
}

/** Called on logout to clear cross-user cached favorites */
export function resetFavoriteIds(): void {
  favoriteIds.clear();
  saveFavorites(favoriteIds);
}

const favoriteIds = loadFavorites();

// ── Transform backend → frontend ─────────────────────────────────────────────

function transformFile(bf: BackendFileNode): FileNode {
  return {
    id: bf.id,
    name: bf.name,
    type: bf.isFolder ? "folder" : "file",
    size: bf.isFolder ? "--" : formatFileSize(bf.sizeBytes),
    sizeBytes: bf.sizeBytes,
    modifiedAt: formatTimestamp(bf.updatedAt),
    classification: bf.classification,
    accessRole: "owner",
    isFavorite: favoriteIds.has(bf.id),
    collaborators: [],
    parentId: bf.parentId,
    mimeType: bf.mimeType,
    lockedBy: bf.lockedBy ? "Governance Lock" : null,
    lockReason: bf.lockReason || "Governance lock",
    lockedAt: bf.lockedAt || null,
  };
}

function transformTrashFile(bf: BackendFileNode): FileNode {
  const f = transformFile(bf);
  f.lockedBy = "Trashed"; // Visual indicator in the table
  f.lockReason = "In trash";
  return f;
}

// ── Transform shared file → frontend ─────────────────────────────────────────

function transformSharedFile(sf: SharedFileNode): FileNode {
  return {
    id: sf.id,
    name: sf.name,
    type: sf.isFolder ? "folder" : "file",
    size: sf.isFolder ? "--" : formatFileSize(sf.sizeBytes),
    sizeBytes: sf.sizeBytes,
    modifiedAt: formatTimestamp(sf.updatedAt),
    classification: sf.classification,
    accessRole: sf.shareRole as "owner" | "editor" | "viewer",
    isFavorite: false,
    collaborators: [],
    parentId: sf.parentId,
    mimeType: sf.mimeType,
    // Store share metadata in lockedBy/lockReason fields for display (reuse existing UI)
    lockedBy: sf.sharedBy.fullName,
    lockReason: `Shared as ${sf.shareRole}`,
  };
}

// ── Transform FileShareEntry → Collaborator ──────────────────────────────────

function transformShareEntry(entry: FileShareEntry): Collaborator {
  return {
    id: entry.user.id,
    name: entry.user.fullName,
    email: entry.user.email,
    role: entry.role as "owner" | "editor" | "viewer",
  };
}

// ── State shape ──────────────────────────────────────────────────────────────

interface FileState {
  files: FileNode[];
  sharedFiles: FileNode[]; // Files shared WITH the current user
  trashFiles: FileNode[]; // Files in trash
  fileShares: Collaborator[]; // Shares for the currently active file
  selectedIds: string[];
  searchQuery: string;
  currentFolderId: string | null;
  activeFile: FileNode | null;
  isAccessSheetOpen: boolean;
  activeView: "overview" | "files" | "shared" | "recent" | "favorites" | "trash" | "governance";
  previewFileId: string | null;
  isLoading: boolean;
  isLoadingShared: boolean;
  isLoadingTrash: boolean;
  error: string | null;
  errorShared: string | null;
  errorTrash: string | null;

  // ── Pagination & sorting ──────────────────────────────────────────────────
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  sort: string;
  order: string;
  setPage: (page: number) => void;
  setSort: (sort: string) => void;
  setPerPage: (perPage: number) => void;

  // ── Upload progress ───────────────────────────────────────────────────────
  uploadProgress: number | null;
  uploadFileName: string | null;

  // ── Quota ─────────────────────────────────────────────────────────────────
  quotaUsed: number;
  quotaTotal: number;
  quotaFileCount: number;
  quotaFolderCount: number;
  fetchQuota: () => Promise<void>;

  // ── Data fetching ─────────────────────────────────────────────────────────
  fetchFiles: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchSharedFiles: () => Promise<void>;
  fetchTrash: () => Promise<void>;
  fetchFileDetail: (id: string) => Promise<FileNode | null>;
  fetchFileShares: (fileId: string) => Promise<void>;

  // ── UI state ──────────────────────────────────────────────────────────────
  setSearchQuery: (query: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  setActiveFile: (file: FileNode | null) => void;
  setAccessSheetOpen: (open: boolean) => void;
  setActiveView: (view: FileState["activeView"]) => void;
  setPreviewFileId: (id: string | null) => void;
  mapsToFolder: (folderId: string | null) => void;
  goBack: () => void;

  // ── CRUD operations ───────────────────────────────────────────────────────
  createFolder: (name: string, classification?: string) => Promise<void>;
  uploadFileReal: (file: File, classification?: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;

  // ── Trash ─────────────────────────────────────────────────────────────────
  restoreFile: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;

  // ── Download ──────────────────────────────────────────────────────────────
  downloadFile: (id: string) => void;

  // ── Bulk move ────────────────────────────────────────────────────────────
  moveFiles: (fileIds: string[], targetFolderId: string | null) => Promise<void>;

  // ── Sharing ───────────────────────────────────────────────────────────────
  shareFile: (fileId: string, email: string, role: string) => Promise<void>;
  removeShare: (fileId: string, userId: string) => Promise<void>;

  // ── Client-side extras (backend support pending) ───────────────────────────
  toggleFavorite: (id: string) => void;
  updateFileClassification: (id: string, classification: string) => void;
  addCollaborator: (
    fileId: string,
    name: string,
    email: string,
    role: "owner" | "editor" | "viewer"
  ) => void;
  updateCollaboratorRole: (
    fileId: string,
    collaboratorId: string,
    role: "owner" | "editor" | "viewer"
  ) => void;
  removeCollaborator: (fileId: string, collaboratorId: string) => void;
  lockFile: (id: string, user: string, reason: string) => void;
  unlockFile: (id: string) => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  sharedFiles: [],
  trashFiles: [],
  fileShares: [],
  selectedIds: [],
  searchQuery: "",
  currentFolderId: null,
  activeFile: null,
  isAccessSheetOpen: false,
  activeView: "overview",
  previewFileId: null,
  isLoading: false,
  isLoadingShared: false,
  isLoadingTrash: false,
  error: null,
  errorShared: null,
  errorTrash: null,
  page: 1,
  perPage: 50,
  total: 0,
  totalPages: 0,
  sort: "name",
  order: "asc",
  uploadProgress: null,
  uploadFileName: null,
  quotaUsed: 0,
  quotaTotal: 107374182400, // 100 GB default
  quotaFileCount: 0,
  quotaFolderCount: 0,

  // ── Pagination / sorting setters ──────────────────────────────────────────

  setPage: (page: number) => {
    set({ page });
    get().fetchFiles();
  },

  setSort: (sort: string) => {
    const { sort: currentSort, order } = get();
    const newOrder = sort === currentSort && order === "asc" ? "desc" : "asc";
    set({ sort, order: newOrder, page: 1 });
    get().fetchFiles();
  },

  setPerPage: (perPage: number) => {
    set({ perPage, page: 1 });
    get().fetchFiles();
  },

  // ── Data fetching ─────────────────────────────────────────────────────────

  fetchFiles: async () => {
    const { currentFolderId, searchQuery, page, perPage, sort, order } = get();
    set({ isLoading: true, error: null });
    try {
      // Load favorites from backend first so transformFile uses latest data
      try {
        const favs = await favoritesApi.list();
        const backendIds = new Set(favs.map((f) => f.id));
        const localIds = loadFavorites();
        localIds.forEach((id) => backendIds.add(id));
        favoriteIds.clear();
        backendIds.forEach((id) => favoriteIds.add(id));
        saveFavorites(favoriteIds);
      } catch {
        // Use existing localStorage favorites as fallback
      }

      const res: FileListResponse = await filesApi.list({
        parentId: currentFolderId,
        q: searchQuery || undefined,
        page,
        perPage,
        sort,
        order,
      });
      set({
        files: res.files.map(transformFile),
        total: res.total,
        totalPages: res.totalPages,
        page: res.page,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch files",
      });
    }
  },

  fetchFavorites: async () => {
    try {
      const favs = await favoritesApi.list();
      const backendIds = new Set(favs.map((f) => f.id));
      const localIds = loadFavorites();
      localIds.forEach((id) => backendIds.add(id));
      favoriteIds.clear();
      backendIds.forEach((id) => favoriteIds.add(id));
      saveFavorites(favoriteIds);
      // Update files in store with new favorite status
      set((state) => ({
        files: state.files.map((f) => ({
          ...f,
          isFavorite: favoriteIds.has(f.id),
        })),
      }));
    } catch {
      // Use localStorage only as fallback
    }
  },

  fetchFileDetail: async (id: string) => {
    try {
      const bf = await filesApi.get(id);
      const tf = transformFile(bf);
      const { files } = get();
      const idx = files.findIndex((f) => f.id === id);
      if (idx >= 0) {
        const updated = [...files];
        updated[idx] = tf;
        set({ files: updated });
      }
      return tf;
    } catch {
      return null;
    }
  },

  fetchSharedFiles: async () => {
    set({ isLoadingShared: true, errorShared: null });
    try {
      const shared = await sharesApi.listShared();
      set({
        sharedFiles: shared.map(transformSharedFile),
        isLoadingShared: false,
      });
    } catch (err) {
      set({
        isLoadingShared: false,
        errorShared: err instanceof Error ? err.message : "Failed to fetch shared files",
      });
    }
  },

  fetchTrash: async () => {
    set({ isLoadingTrash: true, errorTrash: null });
    try {
      const trashed = await filesApi.listTrash();
      set({
        trashFiles: trashed.map(transformTrashFile),
        isLoadingTrash: false,
      });
    } catch (err) {
      set({
        isLoadingTrash: false,
        errorTrash: err instanceof Error ? err.message : "Failed to fetch trash",
      });
    }
  },

  restoreFile: async (id: string) => {
    await filesApi.restore(id);
    const { trashFiles } = get();
    set({ trashFiles: trashFiles.filter((f) => f.id !== id) });
  },

  permanentDelete: async (id: string) => {
    await filesApi.permanentDelete(id);
    const { trashFiles } = get();
    set({ trashFiles: trashFiles.filter((f) => f.id !== id) });
  },

  fetchFileShares: async (fileId: string) => {
    try {
      const entries = await sharesApi.listFileShares(fileId);
      set({ fileShares: entries.map(transformShareEntry) });
    } catch {
      set({ error: "Failed to load share list" });
    }
  },

  shareFile: async (fileId: string, email: string, role: string) => {
    await sharesApi.shareFile(fileId, { email, role });
    // Refresh the file's share list
    const { fetchFileShares } = get();
    await fetchFileShares(fileId);
  },

  removeShare: async (fileId: string, userId: string) => {
    await sharesApi.removeShare(fileId, userId);
    const { fileShares } = get();
    set({ fileShares: fileShares.filter((s) => s.id !== userId) });
  },

  // ── UI state setters ──────────────────────────────────────────────────────

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((sid) => sid !== id)
          : [...state.selectedIds, id],
      };
    }),

  selectAll: (ids) => set({ selectedIds: ids }),

  clearSelection: () => set({ selectedIds: [] }),

  setActiveFile: (file) => set({ activeFile: file }),

  setAccessSheetOpen: (open) => set({ isAccessSheetOpen: open }),

  setActiveView: (view) => set({ activeView: view }),

  setPreviewFileId: (id) => set({ previewFileId: id }),

  mapsToFolder: (folderId) =>
    set({
      currentFolderId: folderId,
      selectedIds: [],
      activeFile: null,
      isAccessSheetOpen: false,
    }),

  goBack: () => {
    const { currentFolderId, files } = get();
    if (!currentFolderId) return;
    const currentFolder = files.find(
      (f) => f.id === currentFolderId && f.type === "folder"
    );
    const parentId = currentFolder ? currentFolder.parentId : null;
    set({
      currentFolderId: parentId,
      selectedIds: [],
      activeFile: null,
      isAccessSheetOpen: false,
    });
  },

  // ── CRUD operations ───────────────────────────────────────────────────────

  createFolder: async (name, classification) => {
    const { currentFolderId, fetchFiles } = get();
    set({ error: null });
    try {
      await filesApi.createFolder({
        name: name.trim(),
        parentId: currentFolderId,
        classification: classification || "TERBUKA",
      });
      await fetchFiles();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create folder" });
    }
  },

  uploadFileReal: async (file, classification) => {
    const { currentFolderId, fetchFiles } = get();
    const formData = new FormData();
    if (currentFolderId) {
      formData.append("parentId", currentFolderId);
    }
    formData.append("classification", classification || "TERBUKA");
    formData.append("file", file);

    set({ uploadProgress: 0, uploadFileName: file.name, error: null });

    // Proactively refresh token to avoid 401 mid-upload
    await attemptTokenRefresh();

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
      xhr.open("POST", `${apiBase}/api/files/upload`);
      const token = getToken() || "";
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          set({ uploadProgress: Math.round((e.loaded / e.total) * 100) });
        }
      };

      xhr.onload = async () => {
        set({ uploadProgress: null, uploadFileName: null });
        if (xhr.status >= 200 && xhr.status < 300) {
          await fetchFiles();
          resolve();
        } else if (xhr.status === 401) {
          // Token expired during upload - try refreshing and retry
          const refreshed = await attemptTokenRefresh();
          if (refreshed) {
            const newToken = getToken() || "";
            const retryXhr = new XMLHttpRequest();
            retryXhr.open("POST", `${apiBase}/api/files/upload`);
            retryXhr.setRequestHeader("Authorization", `Bearer ${newToken}`);
            retryXhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                set({ uploadProgress: Math.round((e.loaded / e.total) * 100) });
              }
            };
            retryXhr.onload = () => {
              set({ uploadProgress: null, uploadFileName: null });
              if (retryXhr.status >= 200 && retryXhr.status < 300) {
                fetchFiles().then(resolve).catch(reject);
              } else {
                try {
                  const body = JSON.parse(retryXhr.responseText);
                  reject(new Error(body.error || "Upload failed"));
                } catch {
                  reject(new Error("Upload failed"));
                }
              }
            };
            retryXhr.onerror = () => {
              set({ uploadProgress: null, uploadFileName: null });
              reject(new Error("Network error during upload"));
            };
            retryXhr.send(formData);
          } else {
            reject(new Error("Session expired"));
          }
        } else {
          try {
            const body = JSON.parse(xhr.responseText);
            reject(new Error(body.error || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      };

      xhr.onerror = () => {
        set({ uploadProgress: null, uploadFileName: null });
        reject(new Error("Network error during upload"));
      };

      xhr.send(formData);
    }).catch((err) => {
      set({ error: err instanceof Error ? err.message : "Failed to upload file" });
    });
  },

  downloadFile: async (id: string) => {
    try {
      const file = get().files.find((f) => f.id === id);
      const filename = file?.name || "download";
      const { data, mimeType } = await filesApi.getContent(id);
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Download failed" });
    }
  },

  fetchQuota: async () => {
    try {
      const q = await filesApi.getQuota();
      set({
        quotaUsed: q.usedBytes,
        quotaTotal: q.quotaBytes,
        quotaFileCount: q.fileCount,
        quotaFolderCount: q.folderCount,
      });
    } catch {
      // Quota is non-critical - silently ignore errors
    }
  },

  moveFiles: async (fileIds: string[], targetFolderId: string | null) => {
    try {
      await filesApi.moveFiles(fileIds, targetFolderId);
      const { fetchFiles, clearSelection } = get();
      clearSelection();
      await fetchFiles();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to move files" });
    }
  },

  renameFile: async (id, newName) => {
    try {
      await filesApi.rename(id, { newName: newName.trim() });
      // Optimistic update
      set((state) => ({
        files: state.files.map((f) =>
          f.id === id ? { ...f, name: newName.trim() } : f
        ),
        activeFile:
          state.activeFile?.id === id
            ? { ...state.activeFile, name: newName.trim() }
            : state.activeFile,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to rename" });
    }
  },

  deleteFile: async (id) => {
    try {
      await filesApi.delete(id);
      set((state) => ({
        files: state.files.filter((f) => f.id !== id),
        selectedIds: state.selectedIds.filter((sid) => sid !== id),
        activeFile: state.activeFile?.id === id ? null : state.activeFile,
        isAccessSheetOpen:
          state.activeFile?.id === id ? false : state.isAccessSheetOpen,
        previewFileId:
          state.previewFileId === id ? null : state.previewFileId,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete" });
    }
  },

  deleteSelected: async () => {
    const { selectedIds, deleteFile } = get();
    // Delete sequentially to respect backend rate limits
    for (const id of selectedIds) {
      await deleteFile(id);
    }
  },

  // ── Client-side extras (no backend support yet) ───────────────────────────

  toggleFavorite: async (id) => {
    const state = get();
    const file = state.files.find((f) => f.id === id);
    const newValue = !file?.isFavorite;

    // Optimistic update
    set((s) => {
      if (newValue) favoriteIds.add(id);
      else favoriteIds.delete(id);
      saveFavorites(favoriteIds);
      return {
        files: s.files.map((f) =>
          f.id === id ? { ...f, isFavorite: newValue } : f
        ),
        sharedFiles: s.sharedFiles.map((f) =>
          f.id === id ? { ...f, isFavorite: newValue } : f
        ),
        activeFile:
          s.activeFile?.id === id
            ? { ...s.activeFile, isFavorite: newValue }
            : s.activeFile,
      };
    });

    // Call backend API
    try {
      if (newValue) {
        await favoritesApi.add(id);
      } else {
        await favoritesApi.remove(id);
      }
    } catch (err) {
      // Revert optimistic update on API error
      set((s) => {
        if (!newValue) favoriteIds.add(id);
        else favoriteIds.delete(id);
        saveFavorites(favoriteIds);
        return {
          files: s.files.map((f) =>
            f.id === id ? { ...f, isFavorite: !newValue } : f
          ),
          sharedFiles: s.sharedFiles.map((f) =>
            f.id === id ? { ...f, isFavorite: !newValue } : f
          ),
          activeFile:
            s.activeFile?.id === id
              ? { ...s.activeFile, isFavorite: !newValue }
              : s.activeFile,
        };
      });
      console.error("Failed to toggle favorite:", err);
    }
  },

  updateFileClassification: (id, classification) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, classification } : f
      ),
      activeFile:
        state.activeFile?.id === id
          ? { ...state.activeFile, classification }
          : state.activeFile,
    })),

  addCollaborator: (fileId, name, email, role) =>
    set((state) => {
      const newCollaborator: Collaborator = {
        id: `col-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        email,
        role,
      };
      // Build updated files array first, then derive activeFile from it
      const updatedFiles = state.files.map((file) => {
        if (file.id !== fileId) return file;
        const exists = file.collaborators.some(
          (c) => c.email.toLowerCase() === email.toLowerCase()
        );
        return {
          ...file,
          collaborators: exists
            ? file.collaborators.map((c) =>
                c.email.toLowerCase() === email.toLowerCase()
                  ? { ...c, role }
                  : c
              )
            : [...file.collaborators, newCollaborator],
        };
      });
      const updatedFile = updatedFiles.find((f) => f.id === fileId);
      return {
        files: updatedFiles,
        activeFile:
          state.activeFile?.id === fileId && updatedFile
            ? { ...state.activeFile, collaborators: updatedFile.collaborators }
            : state.activeFile,
      };
    }),

  updateCollaboratorRole: (fileId, collaboratorId, role) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === fileId
          ? {
              ...file,
              collaborators: file.collaborators.map((c) =>
                c.id === collaboratorId ? { ...c, role } : c
              ),
            }
          : file
      ),
      activeFile:
        state.activeFile?.id === fileId
          ? {
              ...state.activeFile,
              collaborators: state.activeFile.collaborators.map((c) =>
                c.id === collaboratorId ? { ...c, role } : c
              ),
            }
          : state.activeFile,
    })),

  removeCollaborator: (fileId, collaboratorId) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === fileId
          ? {
              ...file,
              collaborators: file.collaborators.filter(
                (c) => c.id !== collaboratorId
              ),
            }
          : file
      ),
      activeFile:
        state.activeFile?.id === fileId
          ? {
              ...state.activeFile,
              collaborators: state.activeFile.collaborators.filter(
                (c) => c.id !== collaboratorId
              ),
            }
          : state.activeFile,
    })),

  /** UI-only lock - does NOT persist to backend. Use governance API for real locking. */
  lockFile: (id, user, reason) => {
    console.warn("lockFile is UI-only - use governanceApi.create for real locking");
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, lockedBy: user, lockReason: reason } : f
      ),
      activeFile:
        state.activeFile?.id === id
          ? { ...state.activeFile, lockedBy: user, lockReason: reason }
          : state.activeFile,
    }));
  },

  /** UI-only unlock - does NOT persist to backend. Use governance API for real unlocking. */
  unlockFile: (id) => {
    console.warn("unlockFile is UI-only - use governanceApi.create for real unlocking");
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, lockedBy: null, lockReason: null } : f
      ),
      activeFile:
        state.activeFile?.id === id
          ? { ...state.activeFile, lockedBy: null, lockReason: null }
          : state.activeFile,
    }));
  },
}));
