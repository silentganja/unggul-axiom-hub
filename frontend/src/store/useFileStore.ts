import { create } from "zustand";

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
  size: string; // Pre-formatted or "--" for folders
  modifiedAt: string;
  classification: "RAHSIA" | "SULIT" | "TERBUKA";
  accessRole: "owner" | "editor" | "viewer";
  isFavorite?: boolean;
  collaborators: Collaborator[];
  parentId: string | null; // Phase 4 parent folder linking
  lockedBy?: string | null; // Phase 5 file locking
  lockReason?: string | null;
}

interface FileState {
  files: FileNode[];
  selectedIds: string[];
  searchQuery: string;
  currentFolderId: string | null;
  activeFile: FileNode | null;
  isAccessSheetOpen: boolean;
  activeView: "overview" | "files" | "shared" | "recent" | "favorites" | "trash" | "governance"; // Phase 5 view navigation
  previewFileId: string | null; // Phase 6 file preview overlay
  
  setSearchQuery: (query: string) => void;
  toggleSelection: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  deleteFile: (id: string) => void;
  deleteSelected: () => void;
  createFolder: (name: string) => void;
  uploadFile: (name: string, size: string, classification: "RAHSIA" | "SULIT" | "TERBUKA") => void;
  toggleFavorite: (id: string) => void;
  
  // Phase 3 & 4 Advanced Panel & Navigation Integrations
  setActiveFile: (file: FileNode | null) => void;
  setAccessSheetOpen: (open: boolean) => void;
  updateFileClassification: (id: string, classification: "RAHSIA" | "SULIT" | "TERBUKA") => void;
  addCollaborator: (fileId: string, name: string, email: string, role: "owner" | "editor" | "viewer") => void;
  updateCollaboratorRole: (fileId: string, collaboratorId: string, role: "owner" | "editor" | "viewer") => void;
  removeCollaborator: (fileId: string, collaboratorId: string) => void;
  renameFile: (id: string, newName: string) => void;
  
  // Phase 4 Navigation Mechanics
  mapsToFolder: (folderId: string | null) => void;
  goBack: () => void;
 
  // Phase 5 File Locking Actions & View Setter
  setActiveView: (view: "overview" | "files" | "shared" | "recent" | "favorites" | "trash" | "governance") => void;
  setPreviewFileId: (id: string | null) => void; // Phase 6 file preview overlay
  lockFile: (id: string, user: string, reason: string) => void;
  unlockFile: (id: string) => void;
}

const INITIAL_FILES: FileNode[] = [
  // --- Root Level Folders ---
  {
    id: "f-2",
    name: "Architecture_Blueprints",
    type: "folder",
    size: "--",
    modifiedAt: "2026-05-20 09:15",
    classification: "RAHSIA",
    accessRole: "editor",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "Elena Rostova", email: "elena.rostova@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "editor" },
    ],
    parentId: null,
  },
  {
    id: "f-4",
    name: "Operations_Handbook_2026",
    type: "folder",
    size: "--",
    modifiedAt: "2026-05-18 11:20",
    classification: "TERBUKA",
    accessRole: "viewer",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "viewer" },
    ],
    parentId: null,
  },
  {
    id: "f-8",
    name: "Legal_Contracts_Archived",
    type: "folder",
    size: "--",
    modifiedAt: "2026-05-01 10:12",
    classification: "SULIT",
    accessRole: "viewer",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "Marcus Vance", email: "marcus.vance@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "viewer" },
    ],
    parentId: null,
  },

  // --- Root Level Files ---
  {
    id: "f-1",
    name: "Q3_Financial_Projections.xlsx",
    type: "file",
    size: "4.2 MB",
    modifiedAt: "2026-05-21 14:32",
    classification: "SULIT",
    accessRole: "owner",
    isFavorite: true,
    collaborators: [
      { id: "col-owner", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "owner" },
      { id: "col-1", name: "Marcus Vance", email: "marcus.vance@unggulaxiom.com", role: "editor" },
      { id: "col-2", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "viewer" },
    ],
    parentId: null,
    lockedBy: "C-Suite Governance",
    lockReason: "Pending Corporate Approval",
  },
  {
    id: "f-3",
    name: "Platform_Security_Framework_v2.pdf",
    type: "file",
    size: "18.7 MB",
    modifiedAt: "2026-05-19 16:45",
    classification: "RAHSIA",
    accessRole: "owner",
    isFavorite: true,
    collaborators: [
      { id: "col-owner", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "owner" },
      { id: "col-3", name: "Elena Rostova", email: "elena.rostova@unggulaxiom.com", role: "editor" },
      { id: "col-2", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "viewer" },
    ],
    parentId: null,
  },
  {
    id: "f-5",
    name: "Investor_Pitch_Deck_Final.pptx",
    type: "file",
    size: "32.1 MB",
    modifiedAt: "2026-05-15 08:30",
    classification: "TERBUKA",
    accessRole: "owner",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "owner" },
      { id: "col-1", name: "Marcus Vance", email: "marcus.vance@unggulaxiom.com", role: "editor" },
    ],
    parentId: null,
  },
  {
    id: "f-6",
    name: "Corporate_Governance_Guidelines.docx",
    type: "file",
    size: "1.4 MB",
    modifiedAt: "2026-05-10 17:05",
    classification: "TERBUKA",
    accessRole: "editor",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "editor" },
    ],
    parentId: null,
  },
  {
    id: "f-7",
    name: "Secure_JV_Tokens_Log.csv",
    type: "file",
    size: "450 KB",
    modifiedAt: "2026-05-09 13:00",
    classification: "SULIT",
    accessRole: "owner",
    isFavorite: true,
    collaborators: [
      { id: "col-owner", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "owner" },
      { id: "col-2", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "viewer" },
    ],
    parentId: null,
  },

  // --- Sub-level files inside "Architecture_Blueprints" (parentId: "f-2") ---
  {
    id: "sub-1-1",
    name: "Blueprint_Q3_System.pdf",
    type: "file",
    size: "8.4 MB",
    modifiedAt: "2026-05-20 10:15",
    classification: "RAHSIA",
    accessRole: "owner",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "Elena Rostova", email: "elena.rostova@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "editor" },
    ],
    parentId: "f-2",
    lockedBy: "Architectural Board",
    lockReason: "Pending Architecture Review",
  },
  {
    id: "sub-1-2",
    name: "Database_Clustering_Specs.docx",
    type: "file",
    size: "3.1 MB",
    modifiedAt: "2026-05-20 11:45",
    classification: "SULIT",
    accessRole: "editor",
    isFavorite: true,
    collaborators: [
      { id: "col-owner", name: "Elena Rostova", email: "elena.rostova@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "editor" },
    ],
    parentId: "f-2",
  },

  // --- Sub-level files inside "Operations_Handbook_2026" (parentId: "f-4") ---
  {
    id: "sub-2-1",
    name: "Security_Protocols_v1.docx",
    type: "file",
    size: "1.2 MB",
    modifiedAt: "2026-05-18 14:00",
    classification: "TERBUKA",
    accessRole: "viewer",
    isFavorite: false,
    collaborators: [
      { id: "col-owner", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "viewer" },
    ],
    parentId: "f-4",
  },
  {
    id: "sub-2-2",
    name: "Emergency_Escalation_Matrix.xlsx",
    type: "file",
    size: "720 KB",
    modifiedAt: "2026-05-18 15:30",
    classification: "SULIT",
    accessRole: "editor",
    isFavorite: true,
    collaborators: [
      { id: "col-owner", name: "David Chen", email: "david.chen@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "editor" },
    ],
    parentId: "f-4",
  },

  // --- Sub-level files inside "Legal_Contracts_Archived" (parentId: "f-8") ---
  {
    id: "sub-3-1",
    name: "JV_Core_Agreement_Signed.pdf",
    type: "file",
    size: "12.5 MB",
    modifiedAt: "2026-05-02 09:12",
    classification: "SULIT",
    accessRole: "viewer",
    isFavorite: true,
    collaborators: [
      { id: "col-owner", name: "Marcus Vance", email: "marcus.vance@unggulaxiom.com", role: "owner" },
      { id: "col-admin", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "viewer" },
    ],
    parentId: "f-8",
  },
];

export const useFileStore = create<FileState>((set) => ({
  files: INITIAL_FILES,
  selectedIds: [],
  searchQuery: "",
  currentFolderId: null,
  activeFile: null,
  isAccessSheetOpen: false,
  activeView: "overview",
  previewFileId: null, // Phase 6 initial state

  setSearchQuery: (query) => set({ searchQuery: query }),

  toggleSelection: (id) =>
    set((state) => {
      const isSelected = state.selectedIds.includes(id);
      return {
        selectedIds: isSelected
          ? state.selectedIds.filter((selectedId) => selectedId !== id)
          : [...state.selectedIds, id],
      };
    }),

  selectAll: (ids) => set({ selectedIds: ids }),

  clearSelection: () => set({ selectedIds: [] }),

  deleteFile: (id) =>
    set((state) => {
      const updatedFiles = state.files.filter((file) => file.id !== id);
      const isCurrentActiveDeleted = state.activeFile?.id === id;
      return {
        files: updatedFiles,
        selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
        activeFile: isCurrentActiveDeleted ? null : state.activeFile,
        isAccessSheetOpen: isCurrentActiveDeleted ? false : state.isAccessSheetOpen,
      };
    }),

  deleteSelected: () =>
    set((state) => {
      const updatedFiles = state.files.filter((file) => !state.selectedIds.includes(file.id));
      const isActiveDeleted = state.activeFile && state.selectedIds.includes(state.activeFile.id);
      return {
        files: updatedFiles,
        selectedIds: [],
        activeFile: isActiveDeleted ? null : state.activeFile,
        isAccessSheetOpen: isActiveDeleted ? false : state.isAccessSheetOpen,
      };
    }),

  createFolder: (name) =>
    set((state) => {
      const newFolder: FileNode = {
        id: `f-${Date.now()}`,
        name: name.trim() || "New_Folder",
        type: "folder",
        size: "--",
        modifiedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        classification: "TERBUKA",
        accessRole: "owner",
        isFavorite: false,
        collaborators: [
          { id: "col-owner", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "owner" },
        ],
        parentId: state.currentFolderId, // Dynamic contextual creation
      };
      return { files: [newFolder, ...state.files] };
    }),

  uploadFile: (name, size, classification) =>
    set((state) => {
      const newFile: FileNode = {
        id: `f-${Date.now()}`,
        name: name.trim() || "Untitled_File",
        type: "file",
        size: size || "0 KB",
        modifiedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        classification: classification || "TERBUKA",
        accessRole: "owner",
        isFavorite: false,
        collaborators: [
          { id: "col-owner", name: "C-Suite Admin", email: "admin@unggul.axiom", role: "owner" },
        ],
        parentId: state.currentFolderId, // Dynamic contextual upload
      };
      return { files: [newFile, ...state.files] };
    }),

  toggleFavorite: (id) =>
    set((state) => {
      const updatedFiles = state.files.map((file) =>
        file.id === id ? { ...file, isFavorite: !file.isFavorite } : file
      );
      const updatedActiveFile = state.activeFile && state.activeFile.id === id
        ? updatedFiles.find((f) => f.id === id) || null
        : state.activeFile;
      return {
        files: updatedFiles,
        activeFile: updatedActiveFile,
      };
    }),

  // Phase 3 Advanced Panel Integrations
  setActiveFile: (file) => set({ activeFile: file }),
  
  setAccessSheetOpen: (open) => set({ isAccessSheetOpen: open }),

  updateFileClassification: (id, classification) =>
    set((state) => {
      const updatedFiles = state.files.map((file) =>
        file.id === id ? { ...file, classification } : file
      );
      const updatedActiveFile = state.activeFile && state.activeFile.id === id
        ? updatedFiles.find((f) => f.id === id) || null
        : state.activeFile;
      return {
        files: updatedFiles,
        activeFile: updatedActiveFile,
      };
    }),

  addCollaborator: (fileId, name, email, role) =>
    set((state) => {
      const newCollaborator: Collaborator = {
        id: `col-${Date.now()}`,
        name,
        email,
        role,
      };
      const updatedFiles = state.files.map((file) => {
        if (file.id === fileId) {
          const exists = file.collaborators.some((c) => c.email.toLowerCase() === email.toLowerCase());
          return {
            ...file,
            collaborators: exists
              ? file.collaborators.map((c) => c.email.toLowerCase() === email.toLowerCase() ? { ...c, role } : c)
              : [...file.collaborators, newCollaborator],
          };
        }
        return file;
      });
      const updatedActiveFile = state.activeFile && state.activeFile.id === fileId
        ? updatedFiles.find((f) => f.id === fileId) || null
        : state.activeFile;
      return {
        files: updatedFiles,
        activeFile: updatedActiveFile,
      };
    }),

  updateCollaboratorRole: (fileId, collaboratorId, role) =>
    set((state) => {
      const updatedFiles = state.files.map((file) => {
        if (file.id === fileId) {
          return {
            ...file,
            collaborators: file.collaborators.map((c) =>
              c.id === collaboratorId ? { ...c, role } : c
            ),
          };
        }
        return file;
      });
      const updatedActiveFile = state.activeFile && state.activeFile.id === fileId
        ? updatedFiles.find((f) => f.id === fileId) || null
        : state.activeFile;
      return {
        files: updatedFiles,
        activeFile: updatedActiveFile,
      };
    }),

  removeCollaborator: (fileId, collaboratorId) =>
    set((state) => {
      const updatedFiles = state.files.map((file) => {
        if (file.id === fileId) {
          return {
            ...file,
            collaborators: file.collaborators.filter((c) => c.id !== collaboratorId),
          };
        }
        return file;
      });
      const updatedActiveFile = state.activeFile && state.activeFile.id === fileId
        ? updatedFiles.find((f) => f.id === fileId) || null
        : state.activeFile;
      return {
        files: updatedFiles,
        activeFile: updatedActiveFile,
      };
    }),

  renameFile: (id, newName) =>
    set((state) => {
      const updatedFiles = state.files.map((file) =>
        file.id === id ? { ...file, name: newName.trim() } : file
      );
      const updatedActiveFile = state.activeFile && state.activeFile.id === id
        ? updatedFiles.find((f) => f.id === id) || null
        : state.activeFile;
      return {
        files: updatedFiles,
        activeFile: updatedActiveFile,
      };
    }),

  // Phase 4 Navigation Mechanics
  mapsToFolder: (folderId) =>
    set({
      currentFolderId: folderId,
      selectedIds: [], // Always clear selections on folder traversal
      activeFile: null,
      isAccessSheetOpen: false,
    }),

  goBack: () =>
    set((state) => {
      if (!state.currentFolderId) return {};
      const currentFolder = state.files.find((f) => f.id === state.currentFolderId && f.type === "folder");
      const parentId = currentFolder ? currentFolder.parentId : null;
      return {
        currentFolderId: parentId,
        selectedIds: [],
        activeFile: null,
        isAccessSheetOpen: false,
      };
    }),

  setActiveView: (view) => set({ activeView: view }),

  setPreviewFileId: (id) => set({ previewFileId: id }),

  lockFile: (id, user, reason) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, lockedBy: user, lockReason: reason } : file
      ),
      activeFile: state.activeFile && state.activeFile.id === id
        ? { ...state.activeFile, lockedBy: user, lockReason: reason }
        : state.activeFile,
    })),

  unlockFile: (id) =>
    set((state) => ({
      files: state.files.map((file) =>
        file.id === id ? { ...file, lockedBy: null, lockReason: null } : file
      ),
      activeFile: state.activeFile && state.activeFile.id === id
        ? { ...state.activeFile, lockedBy: null, lockReason: null }
        : state.activeFile,
    })),
}));
