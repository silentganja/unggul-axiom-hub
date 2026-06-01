"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface ContextMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

/** Renders a dropdown using fixed positioning, outside overflow-hidden ancestors. */
export default function ContextMenu({ trigger, children, onClose }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
    onClose?.();
  }, [onClose]);

  const open = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const btn = el.querySelector("button") || el;
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
  }, []);

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
      <div ref={triggerRef} onClick={open} className="inline-flex">
        {trigger}
      </div>
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
