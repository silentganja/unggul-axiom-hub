"use client";

import { useState, useRef, useEffect } from "react";
import { X, Key } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/components/ui/Toast";

interface PasswordResetModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  userName?: string;
}

export default function PasswordResetModal({
  open,
  onClose,
  onSubmit,
  userName,
}: PasswordResetModalProps) {
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPassword("");
      setIsSubmitting(false);
      // Focus the input after the modal renders
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = password.trim();
    if (trimmed.length < 8) {
      useToastStore.getState().error("Password must be at least 8 characters");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && !isSubmitting) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Reset password"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => !isSubmitting && onClose()}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm mx-4 bg-background border border-border/60 rounded-sm shadow-2xl p-6 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-accent" />
            <h3 className="text-sm font-semibold text-foreground font-sans">
              Reset Password
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="h-6 w-6 flex items-center justify-center rounded-sm text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {userName && (
          <p className="text-[10px] text-foreground-subtle font-mono mb-3">
            Setting password for <span className="text-foreground font-semibold">{userName}</span>
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="8+ chars, upper, lower, digit"
            disabled={isSubmitting}
            className={cn(
              "h-10 w-full rounded-sm border border-input-border bg-input-bg px-3 font-mono text-sm text-foreground",
              "placeholder:text-foreground-subtle/50",
              "focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 rounded-sm text-xs font-medium text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || password.trim().length < 8}
              className="h-9 px-4 rounded-sm text-xs font-medium bg-accent text-accent-foreground hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
