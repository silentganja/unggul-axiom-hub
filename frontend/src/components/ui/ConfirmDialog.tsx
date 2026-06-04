"use client";

import { useEffect, useRef, useCallback, createContext, useContext, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
}

interface ConfirmState extends ConfirmOptions {
  id: number;
  resolve: (value: boolean) => void;
}

// ── Context ──────────────────────────────────────────────────────────────────

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: () => Promise.resolve(false),
});

export function useConfirm() {
  return useContext(ConfirmContext);
}

// ── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmDialogProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<ConfirmState[]>([]);
  const nextId = useRef(0);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = nextId.current++;
      setStack((prev) => [...prev, { ...options, id, resolve }]);
    });
  }, []);

  const dismiss = useCallback((id: number, value: boolean) => {
    setStack((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) item.resolve(value);
      return prev.filter((s) => s.id !== id);
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, id: number) => {
      if (e.key === "Escape") dismiss(id, false);
    },
    [dismiss]
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {stack.map((item, index) => (
        <ConfirmDialogModal
          key={item.id}
          {...item}
          onDismiss={(v) => dismiss(item.id, v)}
          onKeyDown={(e) => handleKeyDown(e, item.id)}
          stackIndex={index}
        />
      ))}
    </ConfirmContext.Provider>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

const variantStyles: Record<string, { border: string; icon: string; button: string }> = {
  danger: {
    border: "border-destructive/40",
    icon: "text-destructive",
    button: "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
  },
  warning: {
    border: "border-amber-500/40",
    icon: "text-amber-500",
    button: "bg-amber-500 hover:bg-amber-600 text-white",
  },
  info: {
    border: "border-accent/40",
    icon: "text-accent",
    button: "bg-accent hover:bg-accent/90 text-accent-foreground",
  },
};

function ConfirmDialogModal({
  id,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onDismiss,
  onKeyDown,
  stackIndex,
}: ConfirmState & {
  onDismiss: (value: boolean) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  stackIndex: number;
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmBtnRef.current?.focus();
  }, []);

  const styles = variantStyles[variant] ?? variantStyles.danger;

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center"
      style={{ zIndex: 250 + stackIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`confirm-title-${id}`}
      aria-describedby={`confirm-desc-${id}`}
      onKeyDown={onKeyDown}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onDismiss(false)}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`relative w-full max-w-md mx-4 bg-background border ${styles.border} rounded-sm shadow-2xl p-6 animate-in zoom-in-95 duration-150`}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle size={20} className={`shrink-0 mt-0.5 ${styles.icon}`} aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <h3 id={`confirm-title-${id}`} className="text-sm font-semibold text-foreground">
              {title}
            </h3>
            <p id={`confirm-desc-${id}`} className="mt-1 text-xs text-foreground-subtle leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={() => onDismiss(false)}
            className="shrink-0 h-6 w-6 flex items-center justify-center rounded-sm text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors"
            aria-label="Close dialog"
          >
            <X size={14} />
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onDismiss(false)}
            className="h-9 px-4 rounded-sm text-xs font-medium text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmBtnRef}
            onClick={() => onDismiss(true)}
            className={`h-9 px-4 rounded-sm text-xs font-medium transition-colors ${styles.button}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
