/**
 * lib/produce.ts
 * Produce freshness profiles used by the Q10 shelf-life model.
 *
 * tRef  : reference temperature at which burn_rate = 1.0 (normal ageing)
 * q10   : for every 10°C above tRef, ageing rate multiplies by this factor
 * humidityBand: [min, max] — outside this range adds a humidity penalty
 */

export interface ProduceProfile {
  /** Display name */
  name: string;
  /** Typical emoji for UI */
  emoji: string;
  /** Base shelf life in hours at tRef */
  baseLifeH: number;
  /** Reference temperature (°C) */
  tRef: number;
  /** Q10 factor (dimensionless) */
  q10: number;
  /** Optimal relative humidity band [min%, max%] */
  humidityBand: [number, number];
}

export const PRODUCE_PROFILES: Record<string, ProduceProfile> = {
  tomato: {
    name: "Tomatoes",
    emoji: "🍅",
    baseLifeH: 120,
    tRef: 12,
    q10: 2.5,
    humidityBand: [85, 95],
  },
  banana: {
    name: "Bananas",
    emoji: "🍌",
    baseLifeH: 240,
    tRef: 14,
    q10: 2.2,
    humidityBand: [85, 90],
  },
  spinach: {
    name: "Spinach",
    emoji: "🥬",
    baseLifeH: 72,
    tRef: 2,
    q10: 3.0,
    humidityBand: [90, 98],
  },
  strawberry: {
    name: "Strawberries",
    emoji: "🍓",
    baseLifeH: 48,
    tRef: 2,
    q10: 3.5,
    humidityBand: [88, 95],
  },
};

export function getProfile(produceType: string): ProduceProfile {
  const p = PRODUCE_PROFILES[produceType.toLowerCase()];
  if (!p) throw new Error(`Unknown produce type: ${produceType}`);
  return p;
}
