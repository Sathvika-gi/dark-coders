/**
 * lib/model.ts
 * Q10 kinetic shelf-life degradation model.
 *
 * FORMULA:
 *   burnRate = q10 ^ ((T - tRef) / 10)
 *   humidityPenalty = 0 if humidity in band; else +0.02 per % deviation
 *   effectiveBurn = burnRate + humidityPenalty
 *   remaining -= effectiveBurn * deltaHours
 *
 * At T = 38°C with tomato profile (tRef=12, q10=2.5):
 *   burnRate = 2.5 ^ ((38 - 12) / 10) = 2.5 ^ 2.6 ≈ 10.77
 *
 * Pure functions — no side-effects, no DB, fully unit-testable.
 */

import { getProfile } from "./produce";

export interface TelemetryReading {
  temp_c: number;
  humidity_pct: number;
  /** ISO timestamp; optional — defaults to now */
  recorded_at?: string;
}

export interface BurnResult {
  /** Effective burn rate (units: hours of life lost per real hour) */
  burnRate: number;
  /** Additional burn from humidity deviation */
  humidityPenalty: number;
  /** Effective total burn rate = burnRate + humidityPenalty */
  effectiveBurn: number;
  /** Hours of life lost for this reading's delta */
  lifeLost: number;
  /** Remaining shelf life after this reading */
  remainingAfter: number;
  /** Real-clock hours since the previous reading */
  deltaHours: number;
}

export interface ExplainEntry {
  index: number;
  temp_c: number;
  humidity_pct: number;
  burnRate: number;
  humidityPenalty: number;
  effectiveBurn: number;
  deltaHours: number;
  lifeLost: number;
  remainingAfter: number;
  /** Human-readable summary, e.g. "38.0°C aged produce 10.8× faster" */
  label: string;
}

/**
 * Compute the burn rate for a single reading.
 * Does NOT mutate state — caller tracks remaining.
 */
export function computeBurnRate(
  produceType: string,
  temp_c: number,
  humidity_pct: number
): { burnRate: number; humidityPenalty: number; effectiveBurn: number } {
  const profile = getProfile(produceType);

  // Q10 kinetic factor
  const burnRate = Math.pow(profile.q10, (temp_c - profile.tRef) / 10);

  // Humidity penalty: 0.02 per % outside optimal band
  const [hMin, hMax] = profile.humidityBand;
  let humidityPenalty = 0;
  if (humidity_pct < hMin) {
    humidityPenalty = (hMin - humidity_pct) * 0.02;
  } else if (humidity_pct > hMax) {
    humidityPenalty = (humidity_pct - hMax) * 0.02;
  }

  return {
    burnRate: Math.round(burnRate * 10000) / 10000,
    humidityPenalty: Math.round(humidityPenalty * 10000) / 10000,
    effectiveBurn:
      Math.round((burnRate + humidityPenalty) * 10000) / 10000,
  };
}

/**
 * Process a sequence of readings, updating remaining life iteratively.
 * Returns per-reading BurnResult array.
 *
 * @param produceType  e.g. "tomato"
 * @param startingLife Hours of life remaining BEFORE the first reading
 * @param readings     Ordered array of telemetry readings
 * @param prevTimestamp ISO string of the last persisted reading's timestamp (for first delta)
 */
export function processReadings(
  produceType: string,
  startingLife: number,
  readings: TelemetryReading[],
  prevTimestamp?: string
): BurnResult[] {
  const results: BurnResult[] = [];
  let remaining = startingLife;
  let prevTime: Date | null = prevTimestamp ? new Date(prevTimestamp) : null;

  for (const reading of readings) {
    const readingTime = reading.recorded_at
      ? new Date(reading.recorded_at)
      : new Date();

    // deltaHours = time since previous reading; default 1h if no prior timestamp
    const deltaHours =
      prevTime !== null
        ? Math.max(0, (readingTime.getTime() - prevTime.getTime()) / 3_600_000)
        : 1;

    const { burnRate, humidityPenalty, effectiveBurn } = computeBurnRate(
      produceType,
      reading.temp_c,
      reading.humidity_pct
    );

    const lifeLost = Math.round(effectiveBurn * deltaHours * 100) / 100;
    remaining = Math.max(0, remaining - lifeLost);

    results.push({
      burnRate,
      humidityPenalty,
      effectiveBurn,
      lifeLost,
      remainingAfter: Math.round(remaining * 100) / 100,
      deltaHours: Math.round(deltaHours * 1000) / 1000,
    });

    prevTime = readingTime;
  }

  return results;
}

/**
 * explain() — returns per-reading human-readable breakdown.
 * Used by the "Why it dropped" UI section.
 */
export function explain(
  produceType: string,
  startingLife: number,
  readings: TelemetryReading[],
  prevTimestamp?: string
): ExplainEntry[] {
  const burns = processReadings(
    produceType,
    startingLife,
    readings,
    prevTimestamp
  );

  return burns.map((b, i) => {
    const r = readings[i];
    const multiplier = b.effectiveBurn.toFixed(1);
    const label =
      b.effectiveBurn > 1.1
        ? `${r.temp_c}°C aged produce ${multiplier}× faster (−${b.lifeLost.toFixed(1)}h life lost)`
        : `${r.temp_c}°C — normal ageing (−${b.lifeLost.toFixed(1)}h)`;

    return {
      index: i,
      temp_c: r.temp_c,
      humidity_pct: r.humidity_pct,
      burnRate: b.burnRate,
      humidityPenalty: b.humidityPenalty,
      effectiveBurn: b.effectiveBurn,
      deltaHours: b.deltaHours,
      lifeLost: b.lifeLost,
      remainingAfter: b.remainingAfter,
      label,
    };
  });
}

/**
 * Format remaining hours as "5d 2h" or "18h" or "< 1h"
 */
export function formatRemainingLife(hours: number): string {
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  return h > 0 ? `${days}d ${h}h` : `${days}d`;
}
