"use client";

import { useEffect, useCallback } from "react";
import { create } from "zustand";
import {
  CheckCircle,
  AlertCircle,
  Info,
  X,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number; // ms, default 5000, 0 = persistent
}

// ── Store ────────────────────────────────────────────────────────────────────

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  loading: (message: string) => string; // returns id so caller can remove it
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type = "info", duration = 5000) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    set((s) => ({
      toasts: [...s.toasts, { id, message, type, duration }],
    }));
    return id;
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  success: (message) => get().addToast(message, "success"),
  error: (message) => get().addToast(message, "error", 8000),
  info: (message) => get().addToast(message, "info"),
  loading: (message) => get().addToast(message, "loading", 0),
}));

// ── Toast Item Component ─────────────────────────────────────────────────────

const iconMap: Record<ToastType, React.ComponentType<{ className?: string; size?: number }>> = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  loading: Loader2,
};

const borderMap: Record<ToastType, string> = {
  success: "border-success/40",
  error: "border-destructive/40",
  info: "border-info/40",
  loading: "border-accent/40",
};

const bgMap: Record<ToastType, string> = {
  success: "bg-success/8",
  error: "bg-destructive/8",
  info: "bg-info/8",
  loading: "bg-accent/8",
};

const textMap: Record<ToastType, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-info",
  loading: "text-accent",
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  // Auto-dismiss
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onRemove, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onRemove]);

  const Icon = iconMap[toast.type];

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-sm border shadow-lg backdrop-blur-md min-w-[320px] max-w-[480px]",
        "animate-in slide-in-from-right duration-200",
        borderMap[toast.type],
        bgMap[toast.type]
      )}
      role="alert"
    >
      <Icon
        size={16}
        className={cn(
          "shrink-0 mt-0.5",
          textMap[toast.type],
          toast.type === "loading" && "animate-spin"
        )}
      />
      <span className="flex-1 text-xs text-foreground leading-relaxed font-mono">
        {toast.message}
      </span>
      <button
        onClick={onRemove}
        className="shrink-0 h-5 w-5 flex items-center justify-center rounded-sm text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors -mr-1"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Toast Container ──────────────────────────────────────────────────────────

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableRemove = useCallback((id: string) => removeToast(id), []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col-reverse gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => stableRemove(t.id)} />
        </div>
      ))}
    </div>
  );
}

// ── Convenience hook ─────────────────────────────────────────────────────────

/** Quick access to toast without importing both hook and store. */
export function useToast() {
  return {
    success: useToastStore((s) => s.success),
    error: useToastStore((s) => s.error),
    info: useToastStore((s) => s.info),
    loading: useToastStore((s) => s.loading),
    remove: useToastStore((s) => s.removeToast),
  };
}
