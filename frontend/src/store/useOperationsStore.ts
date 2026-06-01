import { create } from "zustand";
import { governanceApi, GovernanceRequest, formatTimestamp } from "@/lib/api";

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

  fetchTasks: () => Promise<void>;
  approveTask: (id: string) => Promise<void>;
  rejectTask: (id: string) => Promise<void>;
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

  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const requests = await governanceApi.list();
      set({
        tasks: requests.map(transformRequest),
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch tasks",
      });
    }
  },

  approveTask: async (id: string) => {
    set({ error: null });
    try {
      await governanceApi.approve(id);
      await get().fetchTasks();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to approve" });
    }
  },

  rejectTask: async (id: string) => {
    set({ error: null });
    try {
      await governanceApi.reject(id);
      await get().fetchTasks();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to reject" });
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
      await get().fetchTasks();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to submit request" });
      throw err; // Re-throw so the modal can show the error too
    }
  },
}));
