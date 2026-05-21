"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "h-8 w-8 rounded-md border border-border bg-background-subtle",
          className
        )}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      id="theme-toggle"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "group flex h-8 w-8 items-center justify-center rounded-md",
        "border border-border bg-background-subtle",
        "text-foreground-muted transition-all duration-150",
        "hover:border-border-strong hover:bg-background-muted hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        className
      )}
    >
      {isDark ? (
        <Sun size={14} strokeWidth={1.75} />
      ) : (
        <Moon size={14} strokeWidth={1.75} />
      )}
    </button>
  );
}
