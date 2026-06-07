import { create } from "zustand";
import { subscribeToNotifications, NotificationEvent } from "@/lib/api";

// ── Frontend-facing notification shape ─────────────────────────────────────

export interface StoredNotification {
  id: string;
  event: NotificationEvent;
  timestamp: number;
  read: boolean;
}

// ── State shape ──────────────────────────────────────────────────────────────

interface NotificationState {
  notifications: StoredNotification[];
  unreadCount: number;
  isSubscribed: boolean;
  onGovernanceUpdate: (() => void) | null;

  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  subscribe: () => () => void;
  setOnGovernanceUpdate: (cb: (() => void) | null) => void;
}

// ── Module-level guard for synchronous deduplication ──────────────────────────
// Prevents double EventSource in React Strict Mode double-mount and rapid
// re-renders where Zustand state hasn't committed yet.
let subscriptionActive = false;

// ── Store ────────────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isSubscribed: false,
  onGovernanceUpdate: null,

  markAsRead: (id) =>
    set((state) => {
      const notifications = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
      };
    }),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  setOnGovernanceUpdate: (cb) => set({ onGovernanceUpdate: cb }),

  subscribe: () => {
    // Use module-level guard so rapid double-invocations (Strict Mode, re-render
    // before Zustand commit) never create duplicate EventSource connections.
    if (subscriptionActive) return () => {};
    subscriptionActive = true;

    const unsubscribe = subscribeToNotifications((event) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      set((state) => ({
        notifications: [
          { id, event, timestamp: Date.now(), read: false },
          ...state.notifications,
        ].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      }));

      // Trigger governance refresh callback when a governance_update arrives
      if (event.type === "governance_update") {
        const cb = get().onGovernanceUpdate;
        if (cb) cb();
      }
    });

    set({ isSubscribed: true });
    return () => {
      unsubscribe();
      subscriptionActive = false;
      set({ isSubscribed: false });
    };
  },
}));
