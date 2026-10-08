"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

interface UsePollingOptions {
  intervalMs?: number;
}

export function usePolling<T>(url: string, options: UsePollingOptions = {}) {
  const { intervalMs = 2000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const router = useRouter();
  const mounted = useRef(true);

  const fetcher = useCallback(async () => {
    try {
      const res = await fetch(url);
      
      if (res.status === 401) {
        // Redirect on unauthorized
        if (mounted.current) router.replace("/login");
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = await res.json();
      if (mounted.current) {
        setData(json);
        setError(null);
      }
    } catch (e: unknown) {
      if (mounted.current) {
        if (e instanceof Error) {
          setError(e);
        } else {
          setError(new Error(String(e)));
        }
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, [url, router]);

  useEffect(() => {
    mounted.current = true;
    
    // Initial fetch
    setTimeout(() => {
      fetcher();
    }, 0);
    
    let interval: NodeJS.Timeout | null = null;
    
    const handleVisibility = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else {
        fetcher(); // fetch immediately when unhidden
        interval = setInterval(fetcher, intervalMs);
      }
    };
    
    // Setup interval initially if visible
    if (!document.hidden) {
      interval = setInterval(fetcher, intervalMs);
    }
    
    document.addEventListener("visibilitychange", handleVisibility);
    
    return () => {
      mounted.current = false;
      if (interval) clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetcher, intervalMs]);

  return { data, loading, error, refresh: fetcher };
}
