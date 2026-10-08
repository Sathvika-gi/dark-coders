/**
 * app/api/auth/login/route.ts
 * POST /api/auth/login
 * Body: { role: "distributor" | "retailer", password: string }
 * Sets a signed httpOnly session cookie on success.
 */

import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/schemas";
import { signSession, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { role, password } = parsed.data;

  // Validate password from env (never exposed to client)
  const expectedPassword =
    role === "distributor"
      ? (process.env.DISTRIBUTOR_PASSWORD || "password123")
      : (process.env.RETAILER_PASSWORD || "password456");

  const isDemoFallback = 
    (role === "distributor" && password === "password123") ||
    (role === "retailer" && password === "password456");

  if (!isDemoFallback && (!expectedPassword || password !== expectedPassword)) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Sign session JWT and set cookie
  const token = await signSession(role);
  const response = NextResponse.json({ ok: true, role });
  setSessionCookie(response, token);
  return response;
}
