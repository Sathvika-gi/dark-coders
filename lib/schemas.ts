/**
 * lib/schemas.ts
 * Zod v4 schemas for all API route inputs.
 * Centralized here so validation is consistent everywhere.
 * Note: Zod v4 uses z.string().min() etc. for error messages, not required_error param.
 */

import { z } from "zod";

// ── Telemetry ingest ────────────────────────────────────────────────────────
export const TelemetryReadingSchema = z.object({
  temp_c: z
    .number()
    .min(-20, "temp_c below -20°C is implausible")
    .max(60, "temp_c above 60°C is implausible"),
  humidity_pct: z
    .number()
    .min(0, "humidity_pct must be ≥ 0")
    .max(100, "humidity_pct must be ≤ 100"),
  recorded_at: z
    .string()
    .datetime({ message: "recorded_at must be ISO 8601" })
    .optional(),
});

export const TelemetryIngestSchema = z.object({
  shipment_code: z.string().min(1).max(20),
  readings: z
    .array(TelemetryReadingSchema)
    .min(1, "At least 1 reading required")
    .max(100, "Max 100 readings per batch"),
});

// ── Simulate ────────────────────────────────────────────────────────────────
export const SimulateSchema = z.object({
  shipment_id: z.string(),
  scenario: z.enum(["normal", "spike"]),
});

// ── Auth login ──────────────────────────────────────────────────────────────
export const LoginSchema = z.object({
  role: z.enum(["distributor", "retailer"]),
  password: z.string().min(1, "Password required"),
});

// ── Demo reset ──────────────────────────────────────────────────────────────
export const ResetSchema = z.object({
  shipment_id: z.string(),
});

// ── Exported types ──────────────────────────────────────────────────────────
export type TelemetryReading = z.infer<typeof TelemetryReadingSchema>;
export type TelemetryIngest = z.infer<typeof TelemetryIngestSchema>;
export type SimulateInput = z.infer<typeof SimulateSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
