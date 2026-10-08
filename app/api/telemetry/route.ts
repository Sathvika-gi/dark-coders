/**
 * app/api/telemetry/route.ts
 * POST /api/telemetry
 * Public ingest endpoint authenticated via x-api-key header.
 * Rate-limited to 60 req/min per key (Postgres-backed).
 */

import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { db } from "@/lib/db";
import { TelemetryIngestSchema } from "@/lib/schemas";
import { checkRateLimit } from "@/lib/ratelimit";
import { processIngestedReadings } from "@/lib/pipeline";

export async function POST(req: NextRequest) {
  // ── 1. Extract and validate API key ────────────────────────────────────
  const rawKey = req.headers.get("x-api-key");
  if (!rawKey) {
    return Response.json({ error: "Missing x-api-key header" }, { status: 401 });
  }

  const keyHash = createHash("sha256").update(rawKey).digest("hex");

  const { data: keyRow, error: keyErr } = await db
    .from("ingest_keys")
    .select("id, active")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .single();

  if (keyErr || !keyRow) {
    return Response.json({ error: "Invalid or inactive API key" }, { status: 401 });
  }

  // ── 2. Rate limiting (per key, 60 req/min) ─────────────────────────────
  const allowed = await checkRateLimit(`ingest:${keyRow.id}`, 60);
  if (!allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Max 60 requests per minute." },
      { status: 429 }
    );
  }

  // ── 3. Validate request body ───────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = TelemetryIngestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // ── 4. Process readings through pipeline ──────────────────────────────
  try {
    const result = await processIngestedReadings(
      parsed.data.shipment_code,
      parsed.data.readings
    );
    return Response.json(result);
  } catch (err) {
    const e = err as Error & { status?: number };
    const status = e.status ?? 500;
    // Never leak stack traces
    return Response.json({ error: e.message ?? "Internal error" }, { status });
  }
}
