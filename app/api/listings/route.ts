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
    .select("*, shipments(code, produce_type, qty_kg, origin, destination), reservations(qty_kg)")
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

  // Compute available_kg based on reservations sum
  const enhanced = data?.map((l: { shipments?: { qty_kg?: number } | { qty_kg?: number }[], reservations?: { qty_kg?: number }[], [key: string]: unknown }) => {
    const reservedTotal = Array.isArray(l.reservations) 
      ? l.reservations.reduce((sum: number, r: { qty_kg?: number }) => sum + (r.qty_kg || 0), 0)
      : 0;
    
    // Check if shipments might be an array or object from Supabase (usually object for many-to-one, array for one-to-many)
    const shipObj = Array.isArray(l.shipments) ? l.shipments[0] : l.shipments;
    const available_kg = Math.max(0, (shipObj?.qty_kg || 0) - reservedTotal);
    
    delete l.reservations; // clean up payload
    return {
      ...l,
      available_kg
    };
  });

  return Response.json({
    listings: enhanced ?? [],
    fetched_at: new Date().toISOString(),
  });
}
