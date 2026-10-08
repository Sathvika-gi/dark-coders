/**
 * tests/model.test.ts
 * Unit tests for the shelf-life degradation model.
 *
 * Critical test: DEMO SPIKE SCENARIO
 *   19 readings, each representing 30 simulated minutes, at 38°C.
 *   Tomato profile: tRef=12, q10=2.5
 *   burnRate = 2.5^((38-12)/10) = 2.5^2.6 ≈ 10.77
 *   Expected life lost = 19 * 0.5h * 10.77 ≈ 102.3h
 *   Starting at 120h -> remaining ≈ 17.7h
 *   Assertion: remaining in [16, 20] hours.
 */

import { describe, it, expect } from "vitest";
import { computeBurnRate, processReadings, formatRemainingLife } from "../lib/model";

describe("computeBurnRate", () => {
  it("returns 1.0 at reference temperature for tomato", () => {
    const { burnRate } = computeBurnRate("tomato", 12, 90);
    expect(burnRate).toBeCloseTo(1.0, 3);
  });

  it("returns ~10.77 at 38°C for tomato (Q10 spike burn rate)", () => {
    const { burnRate } = computeBurnRate("tomato", 38, 90);
    // 2.5 ^ ((38-12)/10) = 2.5^2.6
    const expected = Math.pow(2.5, 2.6);
    expect(burnRate).toBeCloseTo(expected, 1);
    expect(burnRate).toBeGreaterThan(10);
    expect(burnRate).toBeLessThan(12);
  });

  it("adds humidity penalty when humidity is below band", () => {
    const inBand = computeBurnRate("tomato", 12, 90);
    const lowHumidity = computeBurnRate("tomato", 12, 70); // 15% below min 85
    // penalty = (85-70) * 0.02 = 0.30
    expect(lowHumidity.humidityPenalty).toBeCloseTo(0.30, 2);
    expect(lowHumidity.effectiveBurn).toBeGreaterThan(inBand.effectiveBurn);
  });

  it("adds humidity penalty when humidity is above band", () => {
    const { humidityPenalty } = computeBurnRate("tomato", 12, 100); // 5% above max 95
    // penalty = (100-95) * 0.02 = 0.10
    expect(humidityPenalty).toBeCloseTo(0.10, 2);
  });

  it("has zero humidity penalty when humidity is within band", () => {
    const { humidityPenalty } = computeBurnRate("tomato", 12, 90);
    expect(humidityPenalty).toBe(0);
  });
});

describe("processReadings — DEMO SPIKE SCENARIO", () => {
  it("19 readings at 38°C, 0.5h each, starting at 120h -> remaining 16-20h", () => {
    // Build 19 readings, each 30 minutes apart
    const baseTime = new Date("2024-01-01T00:00:00Z");
    const readings = Array.from({ length: 19 }, (_, i) => ({
      temp_c: 38,
      humidity_pct: 90,
      recorded_at: new Date(baseTime.getTime() + i * 30 * 60_000).toISOString(),
    }));

    const results = processReadings(
      "tomato",
      120,           // starting life = 120h
      readings,
      new Date(baseTime.getTime() - 30 * 60_000).toISOString() // prev reading 30min before
    );

    const lastResult = results[results.length - 1];
    const remaining = lastResult.remainingAfter;

    console.log(`Spike demo: remaining after 19×0.5h@38°C = ${remaining.toFixed(2)}h`);

    // CRITICAL ASSERTION from spec: 16-20h range
    expect(remaining).toBeGreaterThanOrEqual(16);
    expect(remaining).toBeLessThanOrEqual(20);
  });

  it("normal readings at reference temperature preserve most shelf life", () => {
    const baseTime = new Date("2024-01-01T00:00:00Z");
    const readings = Array.from({ length: 10 }, (_, i) => ({
      temp_c: 12, // reference temp for tomato
      humidity_pct: 90,
      recorded_at: new Date(baseTime.getTime() + i * 60 * 60_000).toISOString(),
    }));

    const results = processReadings("tomato", 120, readings,
      new Date(baseTime.getTime() - 60 * 60_000).toISOString()
    );

    const remaining = results[results.length - 1].remainingAfter;
    // 10 hours at burn rate 1.0 = 10h lost -> 110h remaining
    expect(remaining).toBeCloseTo(110, 0);
  });
});

describe("formatRemainingLife", () => {
  it("formats hours less than 1 as '< 1h'", () => {
    expect(formatRemainingLife(0.5)).toBe("< 1h");
  });

  it("formats hours less than 24 as 'Nh'", () => {
    expect(formatRemainingLife(18)).toBe("18h");
  });

  it("formats 120h as '5d'", () => {
    expect(formatRemainingLife(120)).toBe("5d");
  });

  it("formats 121h as '5d 1h'", () => {
    expect(formatRemainingLife(121)).toBe("5d 1h");
  });
});
