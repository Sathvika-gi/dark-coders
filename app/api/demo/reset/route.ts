/**
 * app/api/demo/reset/route.ts
 * POST /api/demo/reset
 * Distributor only — resets the demo shipment AGS-101 to its initial state.
 * Telemetry stays append-only (trigger prevents DELETE); we insert a reset event instead.
 */

import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const DEMO_CODE = "AGS-101";
const DEMO_INITIAL_LIFE = 120;
const DEMO_BASE_PRICE = 40;

export async function POST() {
  // ── 1. Require distributor ────────────────────────────────────────────
  const authResult = await requireRole("distributor");
  if (authResult instanceof Response) return authResult;

  // ── 2. Find demo shipment ─────────────────────────────────────────────
  const { data: shipment, error } = await db
    .from("shipments")
    .select("id")
    .eq("code", DEMO_CODE)
    .single();

  if (error || !shipment) {
    return Response.json({ error: "Demo shipment not found" }, { status: 404 });
  }

  const shipmentId = shipment.id;

  // ── 3. Reset shipment to initial state ────────────────────────────────
  const { error: resetErr } = await db
    .from("shipments")
    .update({
      remaining_life_hours: DEMO_INITIAL_LIFE,
      current_price_per_kg: DEMO_BASE_PRICE,
      status: "in_transit",
      last_reading_at: null,
    })
    .eq("id", shipmentId);

  if (resetErr) {
    return Response.json({ error: "Reset failed: " + resetErr.message }, { status: 500 });
  }

  // ── 4. Deactivate all listings for this shipment ───────────────────────
  await db
    .from("listings")
    .update({ active: false })
    .eq("shipment_id", shipmentId);

  // ── 5. Insert reset event as a telemetry annotation (append-only safe) ─
  // We record a "comment" row with burn_rate=0 to mark the reset in the timeline
  await db.from("alerts").insert({
    shipment_id: shipmentId,
    severity: "info",
    message: `Demo reset: AGS-101 returned to ${DEMO_INITIAL_LIFE}h / ₹${DEMO_BASE_PRICE}/kg at ${new Date().toISOString()}`,
  });

  // Telemetry rows remain — append-only integrity preserved.
  // The pipeline re-accumulates from the new last_reading_at=null baseline.

  return Response.json({
    ok: true,
    remaining_life_hours: DEMO_INITIAL_LIFE,
    current_price_per_kg: DEMO_BASE_PRICE,
    status: "in_transit",
  });
}
