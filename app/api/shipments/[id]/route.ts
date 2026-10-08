/**
 * app/api/shipments/[id]/route.ts
 * GET /api/shipments/[id] — shipment detail with last 50 telemetry rows + model breakdown
 */

import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { explain } from "@/lib/model";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole("distributor");
  if (authResult instanceof Response) return authResult;

  const { id } = await params;

  // Fetch shipment
  const { data: shipment, error: shipErr } = await db
    .from("shipments")
    .select("*")
    .eq("id", id)
    .single();

  if (shipErr || !shipment) {
    return Response.json({ error: "Shipment not found" }, { status: 404 });
  }

  // Fetch last 50 telemetry readings
  const { data: telemetry, error: telErr } = await db
    .from("telemetry")
    .select("*")
    .eq("shipment_id", id)
    .order("recorded_at", { ascending: true })
    .limit(50);

  if (telErr) {
    return Response.json({ error: "Failed to fetch telemetry" }, { status: 500 });
  }

  // Fetch recent alerts
  const { data: alerts } = await db
    .from("alerts")
    .select("*")
    .eq("shipment_id", id)
    .order("created_at", { ascending: false })
    .limit(10);

  // Compute model breakdown for "Why it dropped" UI section
  const breakdown =
    telemetry && telemetry.length > 0
      ? explain(
          shipment.produce_type,
          shipment.initial_life_hours,
          telemetry.map((t) => ({
            temp_c: t.temp_c,
            humidity_pct: t.humidity_pct,
            recorded_at: t.recorded_at,
          }))
        )
      : [];

  // Fetch the active listing for this shipment (if any)
  const { data: activeListing } = await db
    .from("listings")
    .select("*")
    .eq("shipment_id", id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return Response.json({
    shipment,
    telemetry: telemetry ?? [],
    alerts: alerts ?? [],
    breakdown,
    active_listing: activeListing,
  });
}
