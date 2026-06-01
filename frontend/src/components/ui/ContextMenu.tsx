"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ContextMenuProps {
  trigger: (props: {
    ref: (el: HTMLButtonElement | null) => void;
    onClick: () => void;
    isOpen: boolean;
  }) => React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

/** Renders a dropdown using fixed positioning, outside overflow-hidden ancestors. */
export default function ContextMenu({ trigger, children, onClose }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerEl = useRef<HTMLButtonElement | null>(null);
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
    const btn = triggerEl.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 176;
    const top = rect.bottom + 4;
    let left = rect.right - menuWidth;
    if (left < 8) left = 8;
    if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - menuWidth - 8;
    const menuHeight = 300;
    const finalTop =
      top + menuHeight > window.innerHeight - 8 ? rect.top - menuHeight - 4 : top;
    setPosition({ top: finalTop, left });
    setIsOpen(true);
  }, [isOpen, close]);

  // Callback ref — stable across renders, no ref-forwarding issues
  const setTriggerRef = useCallback((el: HTMLButtonElement | null) => {
    triggerEl.current = el;
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerEl.current &&
        !triggerEl.current.contains(e.target as Node)
      ) {
        close();
      }
    };
    // Delay to avoid the opening click from also closing
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
      {trigger({ ref: setTriggerRef, onClick: toggle, isOpen })}
      {isOpen && position && (
        <div
          ref={menuRef}
          className="fixed z-[100] w-44 rounded border border-border/80 bg-background-panel shadow-lg p-1 space-y-0.5 text-left font-mono animate-in fade-in zoom-in-95 duration-100"
          style={{ top: position.top, left: position.left }}
        >
          {children}
        </div>
      )}
    </>
  );
}
