/**
 * app/api/shipments/route.ts
 * GET /api/shipments — list all shipments (distributor only)
 */

import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const authResult = await requireRole("distributor");
  if (authResult instanceof Response) return authResult;

  const { data, error } = await db
    .from("shipments")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Failed to fetch shipments" }, { status: 500 });
  }

  return Response.json({ shipments: data });
}
