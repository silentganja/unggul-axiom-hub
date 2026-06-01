import { create } from "zustand";
import {
  filesApi,
  BackendFileNode,
  formatFileSize,
  formatTimestamp,
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
  mimeType?: string | null;
}

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
    accessRole: "owner", // Backend enforces ownership — all owned files default to owner
    isFavorite: false,
    collaborators: [],
    parentId: bf.parentId,
    mimeType: bf.mimeType,
  };
}

// ── State shape ──────────────────────────────────────────────────────────────

interface FileState {
  files: FileNode[];
  selectedIds: string[];
  searchQuery: string;
  currentFolderId: string | null;
  activeFile: FileNode | null;
  isAccessSheetOpen: boolean;
  activeView: "overview" | "files" | "shared" | "recent" | "favorites" | "trash" | "governance";
  previewFileId: string | null;
  isLoading: boolean;
  error: string | null;

  // ── Data fetching ─────────────────────────────────────────────────────────
  fetchFiles: () => Promise<void>;
  fetchFileDetail: (id: string) => Promise<FileNode | null>;

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
  selectedIds: [],
  searchQuery: "",
  currentFolderId: null,
  activeFile: null,
  isAccessSheetOpen: false,
  activeView: "overview",
  previewFileId: null,
  isLoading: false,
  error: null,

  // ── Data fetching ─────────────────────────────────────────────────────────

  fetchFiles: async () => {
    const { currentFolderId } = get();
    set({ isLoading: true, error: null });
    try {
      const backendFiles = await filesApi.list(currentFolderId);
      const transformed = backendFiles.map(transformFile);
      set({ files: transformed, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch files",
      });
    }
  },

  fetchFileDetail: async (id: string) => {
    try {
      const bf = await filesApi.get(id);
      const tf = transformFile(bf);
      // Update the file in the local cache if present
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

    try {
      await filesApi.upload(formData);
      await fetchFiles();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to upload file" });
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

  toggleFavorite: (id) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
      ),
      activeFile:
        state.activeFile?.id === id
          ? { ...state.activeFile, isFavorite: !state.activeFile.isFavorite }
          : state.activeFile,
    })),

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
        id: `col-${Date.now()}`,
        name,
        email,
        role,
      };
      return {
        files: state.files.map((file) => {
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
        }),
        activeFile:
          state.activeFile?.id === fileId
            ? {
                ...state.activeFile,
                collaborators: (() => {
                  const file = state.files.find((f) => f.id === fileId);
                  if (!file) return state.activeFile.collaborators;
                  const exists = file.collaborators.some(
                    (c) => c.email.toLowerCase() === email.toLowerCase()
                  );
                  return exists
                    ? file.collaborators.map((c) =>
                        c.email.toLowerCase() === email.toLowerCase()
                          ? { ...c, role }
                          : c
                      )
                    : [...file.collaborators, newCollaborator];
                })(),
              }
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

  lockFile: (id, user, reason) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, lockedBy: user, lockReason: reason } : f
      ),
      activeFile:
        state.activeFile?.id === id
          ? { ...state.activeFile, lockedBy: user, lockReason: reason }
          : state.activeFile,
    })),

  unlockFile: (id) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, lockedBy: null, lockReason: null } : f
      ),
      activeFile:
        state.activeFile?.id === id
          ? { ...state.activeFile, lockedBy: null, lockReason: null }
          : state.activeFile,
    })),
}));
