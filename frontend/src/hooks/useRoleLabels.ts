"use client";
import { useEffect, useState, useRef } from "react";
import { fetchRoleLabels } from "@/lib/api";

/** Global cache shared across all components using the hook. */
let cachedLabels: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;

/**
 * Returns a role_key → display label map fetched once from the server.
 * Falls back to the raw role key if no label is found.
 */
export function useRoleLabels(): { labels: Record<string, string>; loading: boolean } {
  const [labels, setLabels] = useState<Record<string, string>>(cachedLabels ?? {});
  const [loading, setLoading] = useState(!cachedLabels);
  const mounted = useRef(true);

  useEffect(() => {
    if (cachedLabels) {
      setLabels(cachedLabels);
      setLoading(false);
      return;
    }
    if (!fetchPromise) {
      fetchPromise = fetchRoleLabels()
        .then((map) => {
          cachedLabels = map;
          return map;
        })
        .catch(() => {
          // Return empty so callers gracefully fall back to raw keys
          return {} as Record<string, string>;
        });
    }
    fetchPromise.then((map) => {
      if (mounted.current) {
        setLabels(map);
        setLoading(false);
      }
    });
    return () => { mounted.current = false; };
  }, []);

  return { labels, loading };
}

/** Convenience: resolve a single role key to its display label. */
export function roleLabel(labels: Record<string, string>, key: string): string {
  return labels[key] || key;
}

/** Invalidate the global cache so the next useRoleLabels() call re-fetches from the server. */
export function invalidateRoleLabelsCache(): void {
  cachedLabels = null;
  fetchPromise = null;
}
