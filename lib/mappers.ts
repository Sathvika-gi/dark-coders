import { UIShipment, UIAlert, UIListing } from '@/types/ui'
import { getProduceUI } from './produce-ui'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapShipmentRows(row: any): UIShipment {
  const ui = getProduceUI(row.produce_type)
  const isHighTemp = row.latest_temp_c !== undefined 
    ? row.latest_temp_c > (row.ideal_temp_range?.[1] ?? 999)
    : false

  return {
    id: row.id,
    code: row.code,
    produce: ui.label,
    emoji: ui.emoji,
    origin: row.origin,
    destination: row.destination,
    totalHours: row.initial_life_hours,
    remainingHours: row.remaining_life_hours,
    temperature: row.latest_temp_c ?? 0,
    tempStatus: isHighTemp ? 'high' : 'normal',
    progress: row.transit_progress_pct ?? 0,
    basePrice: row.base_price_per_kg,
    currentPrice: row.current_price_per_kg,
    status: row.status
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapAlertRows(row: any): UIAlert {
  // Compute relative time ago
  let timeAgo = 'Just now'
  if (row.created_at) {
    const diffMin = Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000)
    if (diffMin < 60) timeAgo = `${Math.max(1, diffMin)}m ago`
    else if (diffMin < 1440) timeAgo = `${Math.floor(diffMin / 60)}h ago`
    else timeAgo = `${Math.floor(diffMin / 1440)}d ago`
  }

  return {
    id: row.id,
    severity: row.severity === 'critical' ? 'critical' : row.severity === 'warning' ? 'warning' : 'info',
    message: row.message,
    timeAgo
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapListingRows(row: any, currentSessionStart: Date = new Date()): UIListing {
  const ui = getProduceUI(row.shipments?.produce_type ?? 'unknown')
  
  // A listing is flash sale if discount is at least 40%
  const isFlashSale = row.discount_pct >= 40
  
  // A listing is "new" if it was created after this user session started, OR less than 2 mins ago
  const createdDate = row.created_at ? new Date(row.created_at) : new Date()
  const createdRecently = (Date.now() - createdDate.getTime()) < 120_000
  const createdAfterSession = createdDate.getTime() > currentSessionStart.getTime()
  
  // Available units or kg
  const availableKg = row.available_units ?? row.available_kg ?? row.shipments?.qty_kg ?? 0

  return {
    id: row.id,
    produce: ui.label,
    emoji: ui.emoji,
    category: ui.category,
    quantityStr: row.qty_str || `${row.shipments?.qty_kg ?? 0} kg lot`,
    originalPrice: row.original_price,
    discountedPrice: row.discounted_price,
    discountPct: row.discount_pct,
    freshnessHours: row.remaining_life_hours,
    aiLine: row.retailer_message,
    isFlashSale,
    isNew: row.isNew ?? createdAfterSession ?? createdRecently,
    availableKg
  }
}
