/**
 * lib/pipeline.ts
 * Central telemetry processing pipeline.
 *
 * Flow:
 *  1. Zod-validate readings
 *  2. Per reading: compute burn, insert telemetry row
 *  3. Update shipment (remaining, status, current_price, last_reading_at)
 *  4. Run pricing — if tier changed/worsened: insert alert + upsert listing (template first)
 *  5. Async: call AI for insight + retailer message, update listing/alert
 *
 * The template listing is saved FIRST so the UI never blocks on AI.
 */

import { db } from "./db";
import {
  processReadings,
  formatRemainingLife,
  type TelemetryReading,
} from "./model";
import {
  computeDiscount,
  tierWorsened,
  tierToStatus,
  type DiscountTier,
} from "./pricing";
import { getProfile } from "./produce";
import { generateInsight, generateRetailerMessage, insightFallback, retailerMsgFallback } from "./ai";

export interface PipelineResult {
  remaining_life_hours: number;
  tier: DiscountTier;
  discount_pct: number;
  status: string;
  listing_id?: string;
  alert_id?: string;
}

export async function processIngestedReadings(
  shipmentCode: string,
  readings: TelemetryReading[]
): Promise<PipelineResult> {
  // ── 1. Fetch shipment ────────────────────────────────────────────────────
  const { data: shipment, error: fetchErr } = await db
    .from("shipments")
    .select("*")
    .eq("code", shipmentCode)
    .single();

  if (fetchErr || !shipment) {
    throw Object.assign(new Error(`Shipment not found: ${shipmentCode}`), {
      status: 404,
    });
  }

  return runPipeline(shipment, readings);
}

export async function processShipmentReadings(
  shipmentId: string,
  readings: TelemetryReading[]
): Promise<PipelineResult> {
  // ── 1. Fetch shipment by ID ─────────────────────────────────────────────
  const { data: shipment, error: fetchErr } = await db
    .from("shipments")
    .select("*")
    .eq("id", shipmentId)
    .single();

  if (fetchErr || !shipment) {
    throw Object.assign(new Error(`Shipment not found: ${shipmentId}`), {
      status: 404,
    });
  }

  return runPipeline(shipment, readings);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function runPipeline(shipment: any, readings: TelemetryReading[]): Promise<PipelineResult> {
  // ── 2. Compute burn rates ────────────────────────────────────────────────
  const burnResults = processReadings(
    shipment.produce_type,
    shipment.remaining_life_hours,
    readings,
    shipment.last_reading_at ?? undefined
  );

  // ── 3. Insert telemetry rows (append-only) ───────────────────────────────
  const now = new Date();
  const telemetryRows = readings.map((r, i) => ({
    shipment_id: shipment.id,
    temp_c: r.temp_c,
    humidity_pct: r.humidity_pct,
    recorded_at: r.recorded_at ?? now.toISOString(),
    burn_rate: burnResults[i].effectiveBurn,
    remaining_after: burnResults[i].remainingAfter,
  }));

  const { error: telErr } = await db.from("telemetry").insert(telemetryRows);
  if (telErr) throw new Error("Telemetry insert failed: " + telErr.message);

  // ── 4. Compute final remaining life ─────────────────────────────────────
  const finalBurn = burnResults[burnResults.length - 1];
  const newRemaining = finalBurn.remainingAfter;

  // ── 5. Run pricing ───────────────────────────────────────────────────────
  const discountResult = computeDiscount(
    newRemaining,
    shipment.eta_hours,
    shipment.base_price_per_kg
  );

  const previousTier = (shipment.current_tier ?? "none") as DiscountTier;
  const tierChanged =
    discountResult.tier !== "none" &&
    (previousTier === "none" || tierWorsened(previousTier, discountResult.tier));

  // ── 6. Update shipment ───────────────────────────────────────────────────
  const newStatus =
    discountResult.tier === "none"
      ? "in_transit"
      : tierToStatus(discountResult.tier);

  const { error: updateErr } = await db
    .from("shipments")
    .update({
      remaining_life_hours: newRemaining,
      current_price_per_kg: discountResult.newPrice,
      current_tier: discountResult.tier,
      status: newStatus,
      last_reading_at: readings[readings.length - 1].recorded_at ?? now.toISOString(),
    })
    .eq("id", shipment.id);

  if (updateErr) throw new Error("Shipment update failed: " + updateErr.message);

  let listingId: string | undefined;
  let alertId: string | undefined;

  // ── 7. If tier changed/worsened: insert alert + listing (template first) ─
  if (tierChanged || discountResult.tier !== "none") {
    const profile = getProfile(shipment.produce_type);

    // Template fallback messages (immediate, before AI)
    const templateRetailerMsg = retailerMsgFallback(
      profile.name,
      newRemaining,
      discountResult.newPrice,
      discountResult.discountPct
    );

    const templateInsight = insightFallback(
      profile.name,
      newRemaining,
      discountResult.tier
    );

    // Deactivate old listings for this shipment
    await db
      .from("listings")
      .update({ active: false })
      .eq("shipment_id", shipment.id)
      .eq("active", true);

    // Insert new listing with template message
    const { data: listing, error: listingErr } = await db
      .from("listings")
      .insert({
        shipment_id: shipment.id,
        retailer_message: templateRetailerMsg,
        original_price: shipment.base_price_per_kg,
        discounted_price: discountResult.newPrice,
        discount_pct: discountResult.discountPct,
        remaining_life_hours: newRemaining,
        reason: discountResult.reason,
        active: true,
      })
      .select("id")
      .single();

    if (listingErr) console.error("[pipeline] listing insert:", listingErr.message);
    else listingId = listing?.id;

    // Insert alert
    const alertMsg =
      discountResult.tier === "critical"
        ? `CRITICAL: ${profile.name} (${shipment.code}) has only ${formatRemainingLife(newRemaining)} freshness left. Flash markdown triggered.`
        : discountResult.tier === "warning"
        ? `WARNING: ${profile.name} (${shipment.code}) at ${formatRemainingLife(newRemaining)} — markdown discount applied.`
        : `INFO: ${profile.name} (${shipment.code}) — early markdown at ${formatRemainingLife(newRemaining)} remaining.`;

    const { data: alert, error: alertErr } = await db
      .from("alerts")
      .insert({
        shipment_id: shipment.id,
        severity: discountResult.tier,
        message: alertMsg,
      })
      .select("id")
      .single();

    if (alertErr) console.error("[pipeline] alert insert:", alertErr.message);
    else alertId = alert?.id;

    // ── 8. Async AI enhancement (non-blocking) ───────────────────────────
    const readingsSummary = burnResults
      .slice(-5) // Last 5 readings for context
      .map(
        (b, i) =>
          `Reading ${i + 1}: ${readings[i]?.temp_c?.toFixed(1) ?? "?"}°C, ${readings[i]?.humidity_pct?.toFixed(0) ?? "?"}% RH — burn ${b.effectiveBurn.toFixed(2)}x`
      )
      .join("\n");

    // Fire-and-forget: AI updates listing and alert after they're already saved
    (async () => {
      try {
        const [insight, retailerMsg] = await Promise.all([
          generateInsight(
            profile.name,
            shipment.qty_kg,
            shipment.origin,
            shipment.destination,
            newRemaining,
            shipment.eta_hours,
            discountResult.tier,
            readingsSummary
          ),
          generateRetailerMessage(
            profile.name,
            shipment.qty_kg,
            newRemaining,
            shipment.base_price_per_kg,
            discountResult.newPrice,
            discountResult.discountPct
          ),
        ]);

        // Update listing with AI retailer message
        if (listingId) {
          await db
            .from("listings")
            .update({ retailer_message: retailerMsg })
            .eq("id", listingId);
        }

        // Update alert with AI insight
        if (alertId && insight) {
          await db
            .from("alerts")
            .update({ message: alertMsg + " | AI: " + insight })
            .eq("id", alertId);
        }
      } catch (e) {
        console.error("[pipeline] async AI update failed:", e);
      }
    })();
  }

  return {
    remaining_life_hours: newRemaining,
    tier: discountResult.tier,
    discount_pct: discountResult.discountPct,
    status: newStatus,
    listing_id: listingId,
    alert_id: alertId,
  };
}
