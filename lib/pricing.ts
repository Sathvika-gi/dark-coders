/**
 * lib/pricing.ts
 * Rule-based markdown pricing engine.
 *
 * TIERS:
 *  critical  remaining ≤ 18h             → 45% flash markdown
 *  warning   remaining ≤ 36h             → 28% markdown
 *  info      remaining < 1.5 × needHours → 12% markdown
 *  none      else                        → full price, no listing
 *
 * needHours = eta_hours + 24   (transit + 24h retail sell-through buffer)
 *
 * Returns a DiscountResult. AI call is done separately (pipeline.ts).
 */

export type DiscountTier = "critical" | "warning" | "info" | "none";

export interface DiscountResult {
  tier: DiscountTier;
  discountPct: number;          // 0 | 12 | 28 | 45
  newPrice: number;             // rounded to 2 decimals
  reason: string;               // human-readable explanation for judges
}

/**
 * Compute the markdown for a shipment given current state.
 *
 * @param remainingLifeHours  Current remaining shelf life
 * @param etaHours            Hours until destination
 * @param basePricePerKg      Original base price (₹/kg)
 */
export function computeDiscount(
  remainingLifeHours: number,
  etaHours: number,
  basePricePerKg: number
): DiscountResult {
  // Sell-through buffer: retailer needs 24h after arrival to sell produce
  const needHours = etaHours + 24;

  let tier: DiscountTier;
  let discountPct: number;
  let reason: string;

  if (remainingLifeHours <= 18) {
    // Flash markdown — critical spoilage imminent
    tier = "critical";
    discountPct = 45;
    reason = `Only ${remainingLifeHours.toFixed(1)}h freshness left — flash markdown to clear stock`;
  } else if (remainingLifeHours <= 36) {
    // Significant markdown — warning level
    tier = "warning";
    discountPct = 28;
    reason = `${remainingLifeHours.toFixed(1)}h remaining — aggressive markdown to drive sales`;
  } else if (remainingLifeHours < 1.5 * needHours) {
    // Early markdown — approaching threshold
    tier = "info";
    discountPct = 12;
    reason = `${remainingLifeHours.toFixed(1)}h remaining vs ${needHours.toFixed(1)}h needed — early markdown`;
  } else {
    // Full price — no action needed
    tier = "none";
    discountPct = 0;
    reason = `${remainingLifeHours.toFixed(1)}h remaining — produce within safe window`;
  }

  const newPrice =
    discountPct > 0
      ? Math.round(basePricePerKg * (1 - discountPct / 100) * 100) / 100
      : basePricePerKg;

  return { tier, discountPct, newPrice, reason };
}

/**
 * Returns true if the new tier is the same OR WORSE than the existing tier.
 * Used by pipeline.ts to avoid duplicate listing spam.
 */
export function tierWorsened(
  existingTier: DiscountTier,
  newTier: DiscountTier
): boolean {
  const severity: Record<DiscountTier, number> = {
    none: 0,
    info: 1,
    warning: 2,
    critical: 3,
  };
  return severity[newTier] > severity[existingTier];
}

/**
 * Map tier to shipment status string.
 */
export function tierToStatus(
  tier: DiscountTier
): "in_transit" | "at_risk" | "critical" {
  switch (tier) {
    case "critical":
      return "critical";
    case "warning":
      return "at_risk";
    default:
      return "in_transit";
  }
}
