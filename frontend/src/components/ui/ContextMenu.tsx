"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ContextMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

/** Renders a dropdown menu using fixed positioning. */
export default function ContextMenu({ trigger, children, onClose }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const handleTriggerClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      close();
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const btn = el.querySelector("button") || el;
    const rect = btn.getBoundingClientRect();
    const mw = 176;
    const top = rect.bottom + 4;
    let left = rect.right - mw;
    if (left < 8) left = 8;
    if (left + mw > window.innerWidth - 8) left = window.innerWidth - mw - 8;
    const mh = 320;
    const finalTop = top + mh > window.innerHeight - 8 ? rect.top - mh - 4 : top;
    setPos({ top: finalTop, left });
    setIsOpen(true);
  }, [isOpen, close]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        rootRef.current &&
        !rootRef.current.contains(e.target as Node)
      ) {
        close();
      }
    };
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
    <div ref={rootRef} onClick={handleTriggerClick} className="inline-flex">
      {trigger}
      {isOpen && (
        <div
          ref={menuRef}
          className="fixed z-[100] w-44 rounded border border-border/80 bg-background-panel shadow-lg p-1 space-y-0.5 text-left font-mono animate-in fade-in zoom-in-95 duration-100"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => {
            // Don't let menu clicks propagate to the trigger
            e.stopPropagation();
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
