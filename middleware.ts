/**
 * middleware.ts
 * Next.js middleware — protects routes by role.
 *
 * Rules:
 *  - /dashboard, /shipments/*, /api/simulate, /api/demo/reset -> distributor only
 *  - /marketplace -> retailer only (or any authenticated user as a marketplace reader)
 *  - /api/listings -> retailer only
 *  - /login -> redirect to dashboard if already authenticated
 *  - /api/auth/* -> public (login/logout)
 *  - /api/telemetry -> public (key-authenticated separately)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

// Routes that require distributor role
const DISTRIBUTOR_PATHS = ["/dashboard", "/shipments", "/api/simulate", "/api/demo"];

// Routes that require retailer role
const RETAILER_PATHS = ["/marketplace", "/api/listings"];

// Public paths (no auth required)
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/telemetry"];

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Static files / next internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Root → redirect to login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Get session
  const session = await getSessionFromRequest(req);

  if (!session) {
    // Unauthenticated — redirect to login (or 401 for API routes)
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 }) as unknown as NextResponse;
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Check distributor paths
  if (DISTRIBUTOR_PATHS.some((p) => pathname.startsWith(p))) {
    if (session.role !== "distributor") {
      if (pathname.startsWith("/api/")) {
        return Response.json({ error: "Forbidden" }, { status: 403 }) as unknown as NextResponse;
      }
      return NextResponse.redirect(new URL("/marketplace", req.url));
    }
  }

  // Check retailer paths
  if (RETAILER_PATHS.some((p) => pathname.startsWith(p))) {
    if (session.role !== "retailer") {
      if (pathname.startsWith("/api/")) {
        return Response.json({ error: "Forbidden" }, { status: 403 }) as unknown as NextResponse;
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  // Already logged in, trying to access /login → redirect
  if (pathname === "/login") {
    const dest = session.role === "distributor" ? "/dashboard" : "/marketplace";
    return NextResponse.redirect(new URL(dest, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files, images, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
