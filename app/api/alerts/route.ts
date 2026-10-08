/**
 * app/api/alerts/route.ts
 * GET /api/alerts — latest alerts across all shipments (distributor only)
 */

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const authResult = await requireRole("distributor");
  if (authResult instanceof Response) return authResult;

  const { data, error } = await db
    .from("alerts")
    .select("*, shipments(code, produce_type)")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    return Response.json({ error: "Failed to fetch alerts" }, { status: 500 });
  }

  return Response.json({ alerts: data });
}
