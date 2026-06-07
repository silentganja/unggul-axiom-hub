"use client";
import { useEffect, useState, useRef } from "react";
import { fetchRoleLabels } from "@/lib/api";

/** Global cache shared across all components using the hook. */
let cachedLabels: Record<string, string> | null = null;
let fetchPromise: Promise<Record<string, string>> | null = null;
/** Counter bumped on cache invalidation so mounted components re-subscribe. */
let cacheEpoch = 0;

/**
 * Returns a role_key → display label map fetched once from the server.
 * Falls back to the raw role key if no label is found.
 */
export function useRoleLabels(): { labels: Record<string, string>; loading: boolean } {
  const [labels, setLabels] = useState<Record<string, string>>(cachedLabels ?? {});
  const [loading, setLoading] = useState(!cachedLabels);
  const mounted = useRef(true);
  const seenEpoch = useRef(cacheEpoch);

  useEffect(() => {
    // If the cache is populated and hasn't been invalidated since mount,
    // initial useState values are already correct — nothing to do.
    if (cachedLabels && seenEpoch.current === cacheEpoch) {
      setLoading(false);
      return;
    }

    // Either no cache yet, or cache was invalidated — (re)fetch.
    let cancelled = false;
    setLoading(true);

    if (!fetchPromise || seenEpoch.current !== cacheEpoch) {
      // Reset fetch promise on invalidation so we re-fetch
      if (seenEpoch.current !== cacheEpoch) {
        fetchPromise = null;
        seenEpoch.current = cacheEpoch;
      }
      fetchPromise = fetchRoleLabels()
        .then((map) => {
          cachedLabels = map;
          return map;
        })
        .catch(() => {
          return {} as Record<string, string>;
        });
    }

    fetchPromise.then((map) => {
      if (cancelled) return;
      if (mounted.current) {
        setLabels(map);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheEpoch]);

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
  cacheEpoch++;
}
