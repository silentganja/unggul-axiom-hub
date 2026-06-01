"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ContextMenuProps {
  trigger: (props: {
    ref: React.RefObject<HTMLButtonElement | null>;
    onClick: () => void;
    isOpen: boolean;
  }) => React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

/** Renders a dropdown menu using fixed positioning, outside any overflow-hidden ancestors. */
export default function ContextMenu({ trigger, children, onClose }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
      return;
    }
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    // Position dropdown below the button, aligned to the right edge
    const menuWidth = 176; // ~w-44
    const top = rect.bottom + 4;
    let left = rect.right - menuWidth;
    // Keep within viewport
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
    // If too close to bottom, flip above
    const menuHeight = 300; // estimate
    const finalTop =
      top + menuHeight > window.innerHeight - 8 ? rect.top - menuHeight - 4 : top;
    setPosition({ top: finalTop, left });
    setIsOpen(true);
  }, [isOpen, close]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    // Delay to avoid the same click that opened it from closing it
    const id = setTimeout(() => document.addEventListener("click", handler), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("click", handler);
    };
  }, [isOpen, close]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, close]);

  return (
    <>
      {trigger({ ref: triggerRef, onClick: toggle, isOpen })}
      {isOpen && position && (
        <div
          ref={menuRef}
          className="fixed z-[100] w-44 rounded border border-border/80 bg-background-panel shadow-md p-1 space-y-0.5 text-left font-mono animate-in fade-in zoom-in-95 duration-100"
          style={{ top: position.top, left: position.left }}
        >
          {children}
        </div>
      )}
    </>
  );
}
