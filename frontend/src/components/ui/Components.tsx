"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Max width class, e.g. "max-w-sm", "max-w-lg", "max-w-2xl" */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

export function Modal({ open, onClose, title, children, size = "md", className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          "w-full rounded-sm border border-border/80 bg-background-panel shadow-lg",
          "animate-in fade-in zoom-in-95 duration-150",
          sizeMap[size],
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/20">
            <h3 className="text-sm font-semibold text-foreground font-serif">{title}</h3>
            <button
              onClick={onClose}
              className="h-6 w-6 flex items-center justify-center rounded-sm text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30 transition-colors -mr-1"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  /** "text" | "circle" | "rect" */
  variant?: "text" | "circle" | "rect";
}

export function Skeleton({ className, variant = "rect" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-foreground-subtle/10 rounded-sm",
        variant === "circle" && "rounded-full",
        variant === "text" && "h-4 w-full rounded",
        className
      )}
    />
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function Pagination({ page, totalPages, onPageChange, siblingCount = 1 }: PaginationProps) {
  if (totalPages <= 1) return null;

  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const generatePages = (): (number | "...")[] => {
    const totalNumbers = siblingCount * 2 + 5; // siblings + first + last + current + 2 ellipsis
    if (totalNumbers >= totalPages) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(page - siblingCount, 1);
    const rightSiblingIndex = Math.min(page + siblingCount, totalPages);

    const showLeftEllipsis = leftSiblingIndex > 2;
    const showRightEllipsis = rightSiblingIndex < totalPages - 1;

    if (!showLeftEllipsis && showRightEllipsis) {
      const leftItemCount = 3 + 2 * siblingCount;
      return [...range(1, leftItemCount), "...", totalPages];
    }

    if (showLeftEllipsis && !showRightEllipsis) {
      const rightItemCount = 3 + 2 * siblingCount;
      return [1, "...", ...range(totalPages - rightItemCount + 1, totalPages)];
    }

    return [1, "...", ...range(leftSiblingIndex, rightSiblingIndex), "...", totalPages];
  };

  const pages = generatePages();

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => page > 1 && onPageChange(page - 1)}
        disabled={page <= 1}
        className="h-7 w-7 flex items-center justify-center rounded-sm border border-border/30 bg-background/40 text-[10px] font-mono text-foreground-subtle hover:text-foreground hover:border-border/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="h-7 w-7 flex items-center justify-center text-[10px] text-foreground-subtle font-mono">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={cn(
              "h-7 w-7 flex items-center justify-center rounded-sm border text-[10px] font-mono transition-colors",
              p === page
                ? "border-accent/30 bg-accent/10 text-accent font-bold"
                : "border-transparent text-foreground-subtle hover:text-foreground hover:bg-background-subtle/30"
            )}
          >
            {p}
          </button>
        )
      )}
      <button
        onClick={() => page < totalPages && onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="h-7 w-7 flex items-center justify-center rounded-sm border border-border/30 bg-background/40 text-[10px] font-mono text-foreground-subtle hover:text-foreground hover:border-border/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── DataTable ─────────────────────────────────────────────────────────────────

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyMessage = "No data found.",
  isLoading = false,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="space-y-2 py-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-10 w-10 rounded-full border border-border/30 bg-background-subtle/20 flex items-center justify-center mb-3">
          <span className="text-foreground-subtle/50 font-mono text-[10px]">--</span>
        </div>
        <p className="text-xs text-foreground-subtle font-mono">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-border/20">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-3 py-2.5 text-[9px] font-bold font-mono uppercase tracking-wider text-foreground-subtle",
                  col.sortable && "cursor-pointer hover:text-foreground select-none",
                  col.className
                )}
              >
                {col.header}
                {col.sortable && <span className="ml-1 text-foreground-subtle/50">↕</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={() => onRowClick?.(row)}
              className={cn(
                "border-b border-border/10 transition-colors",
                onRowClick && "cursor-pointer hover:bg-background-subtle/20"
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className={cn("px-3 py-2.5 text-xs text-foreground font-sans", col.className)}>
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({ value, onChange, options, placeholder, disabled, className }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "h-9 px-3 pr-8 rounded-sm border border-input-border bg-input-bg text-xs text-foreground font-sans",
        "focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent",
        "disabled:opacity-50 disabled:cursor-not-allowed appearance-none",
        "bg-no-repeat bg-[length:10px] bg-[right_8px_center]",
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
      }}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
