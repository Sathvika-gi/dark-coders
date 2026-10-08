/**
 * app/api/listings/route.ts
 * GET /api/listings?since=<ISO timestamp> — active listings for marketplace (retailer)
 * The ?since param enables efficient polling: only fetch listings newer than last check.
 */

import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("retailer");
  if (authResult instanceof Response) return authResult;

  const since = req.nextUrl.searchParams.get("since");

  let query = db
    .from("listings")
    .select("*, shipments(code, produce_type, qty_kg, origin, destination)")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  // If ?since is provided, only return listings newer than that timestamp
  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;

  if (error) {
    return Response.json({ error: "Failed to fetch listings" }, { status: 500 });
  }

  return Response.json({
    listings: data ?? [],
    fetched_at: new Date().toISOString(),
  });
}
