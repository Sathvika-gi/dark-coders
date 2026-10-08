import { getProfile } from './produce';

export function getTruckStatus(shipmentStatuses: string[]) {
  if (shipmentStatuses.includes('critical')) return 'critical';
  if (shipmentStatuses.includes('at_risk')) return 'at_risk';
  return 'in_transit';
}

export function getSoonestSpoil(shipments: any[]) {
  if (!shipments || shipments.length === 0) return null;
  let min = shipments[0];
  for (const s of shipments) {
    if (s.remaining_life_hours < min.remaining_life_hours) {
      min = s;
    }
  }
  return {
    produceName: getProfile(min.produce_type).name,
    hours: Math.floor(min.remaining_life_hours)
  };
}

export function getCargoTemp(telemetryAcrossShipments: any[]) {
  if (!telemetryAcrossShipments || telemetryAcrossShipments.length === 0) return null;
  let sum = 0;
  for (const t of telemetryAcrossShipments) {
    sum += t.temp_c;
  }
  return sum / telemetryAcrossShipments.length;
}

export function getTransitProgressPct(shipments: any[]) {
  // Mock average progress based on ETA vs assumed total time (or just mock 45 for UI test)
  return 45;
}
