import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Classification badge styling (level-based, works for any tier) ─────────

/**
 * Returns Tailwind classes for a classification badge based on hierarchy level.
 * Higher levels = more restricted = warmer/more urgent colors.
 * Works with dynamic tiers, not just the 4 hardcoded ones.
 */
export function classificationBadgeClass(level: number): string {
  if (level >= 3)
    return "bg-destructive/15 text-destructive border-destructive/25";
  if (level >= 2)
    return "bg-warning/15 text-warning border-warning/25";
  if (level >= 1)
    return "bg-info/15 text-info border-info/25";
  return "bg-background-muted/40 text-foreground-subtle border-border/40";
}

/**
 * Lookup classification level from a Record<string, number> map and return
 * the appropriate badge class. Falls back to level 0 for unknown keys.
 */
export function classificationBadge(
  classificationKey: string,
  levels: Record<string, number>,
): string {
  return classificationBadgeClass(levels[classificationKey] ?? 0);
}
