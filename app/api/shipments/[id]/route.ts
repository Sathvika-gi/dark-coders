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

  if (id.startsWith('mock-')) {
    const isSpike = id.includes('101');
    const produceMap: Record<string, any> = {
      'mock-shipment-101': { p: 'tomato', o: 'Nashik', d: 'Mumbai', init: 120, rem: 11, s: 'critical', t: 38.1, ideal: [10, 14] },
      'mock-shipment-104': { p: 'strawberry', o: 'Mahabaleshwar', d: 'Bangalore', init: 72, rem: 31, s: 'in_transit', t: 2.0, ideal: [0, 4] },
      'mock-shipment-102': { p: 'banana', o: 'Jalgaon', d: 'Pune', init: 240, rem: 101, s: 'at_risk', t: 13.9, ideal: [13, 15] }
    };
    
    const meta = produceMap[id] || produceMap['mock-shipment-101'];
    
    const mockTelemetry = [];
    const now = new Date();
    for (let i = 24; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600000).toISOString();
      const tempFloat = isSpike && i <= 8 
        ? 38.1 + Math.sin(i * 0.5) * 0.2 
        : meta.t + Math.sin(i * 0.8) * 0.6;
        
      mockTelemetry.push({
        recorded_at: d,
        temp_c: Number(tempFloat.toFixed(1)),
        humidity_pct: 90 + Math.round(Math.cos(i) * 3)
      });
    }

    const mockShipment = {
      id,
      code: id.replace('mock-shipment-', 'AGS-'),
      produce_type: meta.p,
      origin: meta.o,
      destination: meta.d,
      initial_life_hours: meta.init,
      remaining_life_hours: meta.rem,
      status: meta.s,
      current_price_per_kg: isSpike ? 22 : 40,
      base_price_per_kg: 40,
      current_tier: isSpike ? 'tier45' : 'none',
      ideal_temp_range: meta.ideal
    };

    return Response.json({
      shipment: mockShipment,
      telemetry: mockTelemetry,
      alerts: isSpike ? [{ severity: 'critical', message: 'Critical temperature spike logged — price markdown auto-applied', created_at: new Date().toISOString() }] : [],
      breakdown: [],
      active_listing: isSpike ? { original_price: 40, discounted_price: 22, discount_pct: 45, reason: 'AI: Sustained 38.1°C temperature causing rapid degradation.' } : null
    });
  }

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

  const { getProfile } = await import("@/lib/produce");
  const profile = getProfile(shipment.produce_type);

  return Response.json({
    shipment: {
      ...shipment,
      ideal_temp_range: [profile.tRef - 2, profile.tRef + 2]
    },
    telemetry: telemetry ?? [],
    alerts: alerts ?? [],
    breakdown,
    active_listing: activeListing,
  });
}

