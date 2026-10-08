import { createHash } from 'crypto';

export interface ConditionInput {
  order: any;
  shipment: any;
  retailer: any;
  listing: any;
  telemetry: any[]; 
  inspection: {
    verdict: 'accepted' | 'rejected';
    reason?: string | null;
    note?: string | null;
  };
  paymentReference?: string | null;
  aiInsightText?: string | null;
}

export function buildConditionRecord(input: ConditionInput) {
  const { order, shipment, retailer, listing, telemetry, inspection, paymentReference, aiInsightText } = input;

  let minTemp = null, maxTemp = null, sumTemp = 0;
  let hoursAboveIdeal = 0;
  let spikeWindows = 0;
  
  if (telemetry.length > 0) {
    minTemp = telemetry[0].temp_c;
    maxTemp = telemetry[0].temp_c;
    for (let i = 0; i < telemetry.length; i++) {
      const t = telemetry[i];
      if (t.temp_c < minTemp) minTemp = t.temp_c;
      if (t.temp_c > maxTemp) maxTemp = t.temp_c;
      sumTemp += t.temp_c;
      
      const idealRange = shipment.ideal_temp_range || [0, 100];
      if (t.temp_c > idealRange[1]) {
        // If telemetry is hourly, each point above ideal is ~1 hour
        hoursAboveIdeal += 1; 
      }
      if (t.burn_rate > 2) {
        spikeWindows += 1; 
      }
    }
  }
  
  const avgTemp = telemetry.length > 0 ? Number((sumTemp / telemetry.length).toFixed(1)) : null;
  const lifeRemainingBefore = shipment.initial_life_hours;
  const lifeRemainingAtDelivery = telemetry.length > 0 ? telemetry[telemetry.length-1].remaining_after : shipment.remaining_life_hours;
  
  const standardAgeingHours = telemetry.length > 1 ? 
    (new Date(telemetry[telemetry.length-1].recorded_at).getTime() - new Date(telemetry[0].recorded_at).getTime()) / 3600000 
    : 0;
    
  const extraLifeLost = (lifeRemainingBefore - lifeRemainingAtDelivery) - standardAgeingHours;

  const abstractRecord = {
    order_id: order.id,
    order_code: order.code,
    produce: shipment.produce_type,
    qty_kg: order.qty_kg,
    truck_id: shipment.truck_id || null,
    route: `${shipment.origin} -> ${shipment.destination}`,
    retailer: retailer.name,
    min_temp: minTemp,
    max_temp: maxTemp,
    avg_temp: avgTemp,
    hours_above_ideal: hoursAboveIdeal,
    spike_windows: spikeWindows,
    remaining_at_delivery: Math.max(0, Number(lifeRemainingAtDelivery.toFixed(1))),
    life_lost_vs_normal: Math.max(0, Number(extraLifeLost.toFixed(1))),
    markdown_tier: shipment.current_tier || 'none',
    reservation_price: listing.discounted_price,
    ai_insight: aiInsightText || null,
    inspection_verdict: inspection.verdict,
    inspection_reason: inspection.reason || null,
    inspection_note: inspection.note || null,
    payment_reference: paymentReference || null
  };

  // Sort keys conceptually guarantees stability for hashing
  const sortedKeys = Object.keys(abstractRecord).sort();
  const canonical: Record<string, any> = {};
  for (const k of sortedKeys) {
    canonical[k] = (abstractRecord as any)[k];
  }
  
  const jsonStr = JSON.stringify(canonical);
  const hash = createHash('sha256').update(jsonStr).digest('hex');

  return {
    record: canonical,
    hash
  };
}
