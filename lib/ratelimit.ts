/**
 * lib/ratelimit.ts
 * Postgres-backed rate limiter (no Redis required).
 * Uses a 60-second sliding window per key.
 *
 * Strategy: upsert a row for (key, window_start minutely bucket), increment count.
 * If count > limit, reject.
 */

import { db } from "./db";

const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 60; // requests per window

/** Returns true if the request is allowed, false if rate limited */
export async function checkRateLimit(
  key: string,
  limit = DEFAULT_LIMIT
): Promise<boolean> {
  // Round down to the start of the current window
  const now = new Date();
  const windowStart = new Date(
    Math.floor(now.getTime() / (WINDOW_SECONDS * 1000)) * (WINDOW_SECONDS * 1000)
  );

  // Upsert: insert with count=1, or increment existing
  const { data, error } = await db.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart.toISOString(),
  });

  if (error) {
    // On DB error, allow the request (fail open) — log for debugging
    console.error("[ratelimit] DB error:", error.message);
    return true;
  }

  // The RPC returns the new count
  const count = data as number;
  return count <= limit;
}
