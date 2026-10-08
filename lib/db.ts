/**
 * lib/db.ts
 * Server-only Supabase client using the service-role key.
 * The service-role key bypasses RLS — this file must NEVER be imported
 * in client components or sent to the browser.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
}

/**
 * Singleton Supabase client for server-side use.
 * autoRefreshToken and persistSession are disabled — this runs in a Node.js server
 * context, not a browser, so session persistence is irrelevant.
 */
export const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
