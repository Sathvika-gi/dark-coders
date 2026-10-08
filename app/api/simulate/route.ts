/**
 * app/api/simulate/route.ts
 * POST /api/simulate
 * Session-protected endpoint for distributors.
 * Generates synthetic telemetry readings server-side and calls the pipeline.
 * The ingest API key NEVER touches the browser.
 *
 * Scenarios:
 *  "normal" — 10 readings at reference temperature (1h apart)
 *  "spike"  — 19 readings at 38°C, 30 min apart (the demo scenario)
 */

import { NextRequest } from "next/server";
import { SimulateSchema } from "@/lib/schemas";
import { requireRole } from "@/lib/auth";
import { processShipmentReadings } from "@/lib/pipeline";
import { db } from "@/lib/db";
import { PRODUCE_PROFILES } from "@/lib/produce";

export async function POST(req: NextRequest) {
  // ── 1. Require distributor session ─────────────────────────────────────
  const authResult = await requireRole("distributor");
  if (authResult instanceof Response) return authResult;

  // ── 2. Validate body ──────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SimulateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  const { shipment_id, scenario } = parsed.data;

  // ── 3. Fetch shipment to get produce type and reference temperature ────
  const { data: shipment, error: fetchErr } = await db
    .from("shipments")
    .select("produce_type, last_reading_at")
    .eq("id", shipment_id)
    .single();

  if (fetchErr || !shipment) {
    return Response.json({ error: "Shipment not found" }, { status: 404 });
  }

  const profile = PRODUCE_PROFILES[shipment.produce_type];
  if (!profile) {
    return Response.json({ error: "Unknown produce type" }, { status: 400 });
  }

  // ── 4. Generate synthetic readings ────────────────────────────────────
  const now = new Date();
  const readings = generateReadings(scenario, profile.tRef, now);

  // ── 5. Run pipeline ───────────────────────────────────────────────────
  try {
    const result = await processShipmentReadings(shipment_id, readings);
    return Response.json({ ...result, readings_count: readings.length });
  } catch (err) {
    const e = err as Error & { status?: number };
    return Response.json(
      { error: e.message ?? "Internal error" },
      { status: e.status ?? 500 }
    );
  }
}

interface SimReading {
  temp_c: number;
  humidity_pct: number;
  recorded_at: string;
}

function generateReadings(
  scenario: "normal" | "spike",
  tRef: number,
  now: Date
): SimReading[] {
  if (scenario === "normal") {
    // 10 readings, 1h apart, at reference temperature ±0.5°C jitter
    return Array.from({ length: 10 }, (_, i) => ({
      temp_c: Math.round((tRef + (Math.random() - 0.5)) * 10) / 10,
      humidity_pct: 90,
      recorded_at: new Date(now.getTime() - (9 - i) * 3_600_000).toISOString(),
    }));
  }

  // Spike: 19 readings, 30 min apart, at 38°C ±0.3°C jitter
  return Array.from({ length: 19 }, (_, i) => ({
    temp_c: Math.round((38 + (Math.random() - 0.5) * 0.6) * 10) / 10,
    humidity_pct: 90,
    recorded_at: new Date(now.getTime() - (18 - i) * 30 * 60_000).toISOString(),
  }));
}
