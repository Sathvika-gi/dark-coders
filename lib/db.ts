/**
 * lib/db.ts
 * Server-only Supabase client using the service-role key.
 * The service-role key bypasses RLS — this file must NEVER be imported
 * in client components or sent to the browser.
 *
 * Client is created lazily so the build doesn't fail without env vars.
 */
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Get (or create) the singleton Supabase client.
 * Throws at runtime if env vars are not set — not at build time.
 */
function getDb(): SupabaseClient {
  if (_client) return _client;

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }

  _client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _client;
}

/**
 * Proxy object — all accesses delegate to the lazy client.
 * This avoids top-level module initialization with env vars.
 */
export const db = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getDb();
    const value = ((client as unknown) as Record<string | symbol, unknown>)[prop as string | symbol];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
