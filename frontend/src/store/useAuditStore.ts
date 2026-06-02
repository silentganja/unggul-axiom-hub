import { create } from "zustand";
import { auditApi, AuditLogEntry, formatTimestamp } from "@/lib/api";

// ── Frontend-facing system event (UI shape) ──────────────────────────────────

export interface SystemEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  targetResource: string;
  ipAddress: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
}

// ── Transform backend → frontend ─────────────────────────────────────────────

function transformAuditEntry(entry: AuditLogEntry): SystemEvent {
  return {
    id: entry.id,
    timestamp: formatTimestamp(entry.createdAt),
    actor: entry.userId || "system",
    action: entry.action,
    targetResource: entry.targetResource || "",
    ipAddress: entry.ipAddress || "",
    status: "SUCCESS", // Backend audit logs only record successes
  };
}

// ── State shape ──────────────────────────────────────────────────────────────

interface AuditState {
  logs: SystemEvent[];
  isLoading: boolean;
  error: string | null;

  fetchLogs: () => Promise<void>;
  logEvent: (event: Omit<SystemEvent, "id" | "timestamp">) => void;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useAuditStore = create<AuditState>((set) => ({
  logs: [],
  isLoading: false,
  error: null,

  fetchLogs: async () => {
    set({ isLoading: true, error: null });
    try {
      const result = await auditApi.list();
      const entries = Array.isArray(result) ? result : result.entries;
      const transformed = entries.map(transformAuditEntry);
      set({ logs: transformed, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : "Failed to fetch audit logs",
      });
    }
  },

  logEvent: (event) =>
    set((state) => {
      const newEvent: SystemEvent = {
        ...event,
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
      return { logs: [newEvent, ...state.logs] };
    }),
}));
