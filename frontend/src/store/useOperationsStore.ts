import { create } from "zustand";
import { governanceApi, GovernanceRequest, formatTimestamp, ListGovernanceParams } from "@/lib/api";

// ── Frontend-facing task shape ──────────────────────────────────────────────

export interface ApprovalTask {
  id: string;
  title: string;
  type: string;
  requestedBy: string;
  requestedByEmail: string;
  amountValue: string; // Display value (file name, classification target, etc.)
  status: "PENDING" | "APPROVED" | "REJECTED";
  relatedFileId: string | null;
  relatedFileName: string | null;
  timestamp: string;
}

// ── Transform backend → frontend ────────────────────────────────────────────

function transformRequest(r: GovernanceRequest): ApprovalTask {
  // Build a descriptive amount value based on request type
  let amountValue = "";
  if (r.targetFileName) {
    amountValue = r.targetFileName;
  }
  if (r.metadata) {
    const meta = r.metadata as Record<string, string>;
    if (meta.newClassification) amountValue += ` → ${meta.newClassification}`;
    if (meta.lockReason) amountValue += ` — ${meta.lockReason}`;
  }

  const typeLabel: Record<string, string> = {
    FILE_LOCK: "FILE_LOCK",
    FILE_UNLOCK: "FILE_UNLOCK",
    CLASSIFICATION_UPGRADE: "CLASSIFICATION",
    CLASSIFICATION_DOWNGRADE: "CLASSIFICATION",
  };

  return {
    id: r.id,
    title: r.title,
    type: typeLabel[r.type] || r.type,
    requestedBy: r.requestedByName,
    requestedByEmail: r.requestedByEmail,
    amountValue: amountValue || "—",
    status: r.status,
    relatedFileId: r.targetFileId,
    relatedFileName: r.targetFileName,
    timestamp: formatTimestamp(r.createdAt),
  };
}

// ── State shape ─────────────────────────────────────────────────────────────

interface OperationsState {
  tasks: ApprovalTask[];
  isLoading: boolean;
  error: string | null;

  // Pagination
  page: number;
  totalPages: number;
  total: number;
  perPage: number;

  setPage: (page: number) => void;
  setPerPage: (perPage: number) => void;

  fetchTasks: (params?: ListGovernanceParams) => Promise<void>;
  approveTask: (id: string, reason?: string) => Promise<void>;
  rejectTask: (id: string, reason?: string) => Promise<void>;
  batchApproveTasks: (ids: string[], reason?: string) => Promise<void>;
  batchRejectTasks: (ids: string[], reason?: string) => Promise<void>;
  undoTask: (id: string) => Promise<void>;
  submitRequest: (payload: {
    type: string;
    title: string;
    description?: string;
    targetFileId?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useOperationsStore = create<OperationsState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  page: 1,
  totalPages: 1,
  total: 0,
  perPage: 20,

  setPage: (page: number) => {
    set({ page });
    get().fetchTasks({ page, perPage: get().perPage, status: "PENDING" });
  },

  setPerPage: (perPage: number) => {
    set({ perPage, page: 1 });
    get().fetchTasks({ page: 1, perPage, status: "PENDING" });
  },

  fetchTasks: async (params?: ListGovernanceParams) => {
    set({ isLoading: true, error: null });
    try {
      const result = await governanceApi.list(params);
      set({
        tasks: result.requests.map(transformRequest),
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch tasks",
      });
    }
  },

  approveTask: async (id: string, reason?: string) => {
    set({ error: null });
    try {
      await governanceApi.approve(id, reason);
      await get().fetchTasks({ page: get().page, perPage: get().perPage, status: "PENDING" });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to approve" });
    }
  },

  rejectTask: async (id: string, reason?: string) => {
    set({ error: null });
    try {
      await governanceApi.reject(id, reason);
      await get().fetchTasks({ page: get().page, perPage: get().perPage, status: "PENDING" });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to reject" });
    }
  },

  batchApproveTasks: async (ids: string[], reason?: string) => {
    set({ error: null });
    try {
      await governanceApi.batchApprove(ids, reason);
      await get().fetchTasks({ page: get().page, perPage: get().perPage, status: "PENDING" });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to batch approve" });
    }
  },

  batchRejectTasks: async (ids: string[], reason?: string) => {
    set({ error: null });
    try {
      await governanceApi.batchReject(ids, reason);
      await get().fetchTasks({ page: get().page, perPage: get().perPage, status: "PENDING" });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to batch reject" });
    }
  },

  undoTask: async (id: string) => {
    set({ error: null });
    try {
      await governanceApi.undo(id);
      await get().fetchTasks();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to undo" });
    }
  },

  submitRequest: async (payload) => {
    set({ error: null });
    try {
      await governanceApi.create({
        type: payload.type,
        title: payload.title,
        description: payload.description,
        targetFileId: payload.targetFileId,
        metadata: payload.metadata,
      });
      await get().fetchTasks({ page: 1, perPage: get().perPage, status: "PENDING" });
    } catch (err) {
      throw err; // Let callers handle the error display
    }
  },
}));
