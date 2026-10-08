/**
 * supabase/seed.ts
 * Run with: npx tsx supabase/seed.ts
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment.
 *
 * Inserts 4 shipments, a few historical telemetry readings, and one ingest key.
 * Prints the RAW ingest key once to console; only the SHA-256 hash is stored.
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import "dotenv/config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function sha256(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

async function main() {
  console.log("🌱 Seeding AgroSense database...\n");

  // ── 1. Clear existing seed data (idempotent re-runs) ──────────────────────
  await supabase.from("rate_limits").delete().neq("key", "___never___");
  await supabase.from("ai_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("listings").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("alerts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  // telemetry is append-only — we skip to avoid trigger; fresh DB only
  await supabase.from("ingest_keys").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("shipments").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // ── 2. Shipments ──────────────────────────────────────────────────────────
  const { data: ships, error: shipErr } = await supabase
    .from("shipments")
    .insert([
      {
        code: "AGS-101",
        produce_type: "tomato",
        qty_kg: 500,
        origin: "Nashik",
        destination: "Mumbai",
        eta_hours: 30,
        base_price_per_kg: 40,
        current_price_per_kg: 40,
        remaining_life_hours: 120,
        initial_life_hours: 120,
        status: "in_transit",
      },
      {
        code: "AGS-102",
        produce_type: "banana",
        qty_kg: 300,
        origin: "Jalgaon",
        destination: "Pune",
        eta_hours: 18,
        base_price_per_kg: 28,
        current_price_per_kg: 28,
        remaining_life_hours: 180,
        initial_life_hours: 240,
        status: "in_transit",
      },
      {
        code: "AGS-103",
        produce_type: "spinach",
        qty_kg: 80,
        origin: "Ooty",
        destination: "Chennai",
        eta_hours: 12,
        base_price_per_kg: 60,
        current_price_per_kg: 52.8,
        remaining_life_hours: 30,
        initial_life_hours: 72,
        status: "at_risk",
      },
      {
        code: "AGS-104",
        produce_type: "strawberry",
        qty_kg: 50,
        origin: "Mahabaleshwar",
        destination: "Bangalore",
        eta_hours: 10,
        base_price_per_kg: 220,
        current_price_per_kg: 220,
        remaining_life_hours: 42,
        initial_life_hours: 48,
        status: "in_transit",
      },
      {
        code: "AGS-105",
        produce_type: "mango",
        qty_kg: 400,
        origin: "Ratnagiri",
        destination: "Mumbai",
        eta_hours: 8,
        base_price_per_kg: 150,
        current_price_per_kg: 150,
        remaining_life_hours: 140,
        initial_life_hours: 168,
        status: "in_transit",
      },
      {
        code: "AGS-106",
        produce_type: "green_peas",
        qty_kg: 150,
        origin: "Surat",
        destination: "Ahmedabad",
        eta_hours: 14,
        base_price_per_kg: 85,
        current_price_per_kg: 85,
        remaining_life_hours: 80,
        initial_life_hours: 96,
        status: "in_transit",
      }
    ])
    .select("id, code");

  if (shipErr) throw new Error("Shipments insert: " + shipErr.message);
  console.log("✅ Inserted shipments:", ships?.map((s) => s.code).join(", "));

  // ── 3. Historical telemetry for non-demo shipments ─────────────────────────
  const agS102 = ships?.find((s) => s.code === "AGS-102")?.id;
  const agS103 = ships?.find((s) => s.code === "AGS-103")?.id;

  if (agS102 && agS103) {
    const now = new Date();
    const tRows = [
      // AGS-102: normal readings at 15°C
      {
        shipment_id: agS102,
        temp_c: 15,
        humidity_pct: 87,
        recorded_at: new Date(now.getTime() - 10 * 3600_000).toISOString(),
        burn_rate: 1.15,
        remaining_after: 190,
      },
      {
        shipment_id: agS102,
        temp_c: 14,
        humidity_pct: 88,
        recorded_at: new Date(now.getTime() - 5 * 3600_000).toISOString(),
        burn_rate: 1.0,
        remaining_after: 185,
      },
      // AGS-103: warm readings causing at_risk
      {
        shipment_id: agS103,
        temp_c: 22,
        humidity_pct: 85,
        recorded_at: new Date(now.getTime() - 8 * 3600_000).toISOString(),
        burn_rate: 4.0,
        remaining_after: 40,
      },
      {
        shipment_id: agS103,
        temp_c: 20,
        humidity_pct: 88,
        recorded_at: new Date(now.getTime() - 4 * 3600_000).toISOString(),
        burn_rate: 2.83,
        remaining_after: 32,
      },
    ];

    const { error: telErr } = await supabase.from("telemetry").insert(tRows);
    if (telErr) console.warn("⚠️  Telemetry seed:", telErr.message);
    else console.log("✅ Inserted historical telemetry rows");
  }

  // ── 4. Ingest key ──────────────────────────────────────────────────────────
  const rawKey = "ags-" + randomBytes(24).toString("hex");
  const keyHash = sha256(rawKey);

  const { error: keyErr } = await supabase.from("ingest_keys").insert({
    name: "default-ingest-key",
    key_hash: keyHash,
    active: true,
  });

  if (keyErr) throw new Error("Ingest key insert: " + keyErr.message);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔑 RAW INGEST KEY (shown ONCE — store securely):");
  console.log("   " + rawKey);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("✅ Seed complete.");
}

main().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
