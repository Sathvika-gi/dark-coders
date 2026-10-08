/**
 * tests/pricing.test.ts
 * Unit tests for the markdown pricing engine.
 */

import { describe, it, expect } from "vitest";
import { computeDiscount, tierWorsened } from "../lib/pricing";

describe("computeDiscount", () => {
  const BASE_PRICE = 40; // ₹40/kg (tomato demo price)
  const ETA_HOURS = 30;  // demo shipment ETA

  it("returns 45% flash markdown when remaining ≤ 18h", () => {
    const result = computeDiscount(18, ETA_HOURS, BASE_PRICE);
    expect(result.tier).toBe("critical");
    expect(result.discountPct).toBe(45);
    expect(result.newPrice).toBeCloseTo(22.0, 2); // 40 * 0.55 = 22
  });

  it("returns 45% for remaining = 10h (well below threshold)", () => {
    const result = computeDiscount(10, ETA_HOURS, BASE_PRICE);
    expect(result.tier).toBe("critical");
    expect(result.discountPct).toBe(45);
  });

  it("returns 28% markdown when remaining ≤ 36h and > 18h", () => {
    const result = computeDiscount(30, ETA_HOURS, BASE_PRICE);
    expect(result.tier).toBe("warning");
    expect(result.discountPct).toBe(28);
    expect(result.newPrice).toBeCloseTo(28.8, 2); // 40 * 0.72 = 28.80
  });

  it("returns 12% early markdown when remaining < 1.5×needHours", () => {
    // needHours = 30+24 = 54; 1.5×54 = 81h
    const result = computeDiscount(70, ETA_HOURS, BASE_PRICE);
    expect(result.tier).toBe("info");
    expect(result.discountPct).toBe(12);
    expect(result.newPrice).toBeCloseTo(35.2, 2); // 40 * 0.88 = 35.20
  });

  it("returns full price when remaining is well above need", () => {
    const result = computeDiscount(120, ETA_HOURS, BASE_PRICE);
    expect(result.tier).toBe("none");
    expect(result.discountPct).toBe(0);
    expect(result.newPrice).toBe(40);
  });

  it("rounds newPrice to 2 decimal places", () => {
    const result = computeDiscount(18, ETA_HOURS, 33);
    // 33 * 0.55 = 18.15
    expect(result.newPrice.toString()).toMatch(/^\d+\.\d{2}$/);
  });
});

describe("tierWorsened", () => {
  it("critical is not worse than critical", () => {
    expect(tierWorsened("critical", "critical")).toBe(false);
  });

  it("critical is worse than warning", () => {
    expect(tierWorsened("warning", "critical")).toBe(true);
  });

  it("warning is not worse than info", () => {
    expect(tierWorsened("info", "warning")).toBe(true);
  });

  it("none to info is worsening", () => {
    expect(tierWorsened("none", "info")).toBe(true);
  });

  it("info to none is not worsening", () => {
    expect(tierWorsened("info", "none")).toBe(false);
  });
});
