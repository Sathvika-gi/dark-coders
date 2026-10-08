/**
 * app/api/auth/logout/route.ts
 * POST /api/auth/logout
 * Clears the session cookie and redirects to login.
 */

import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
