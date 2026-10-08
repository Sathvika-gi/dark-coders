import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import "dotenv/config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function addKey() {
  const rawKey = "ags-" + randomBytes(24).toString("hex");
  const keyHash = createHash("sha256").update(rawKey).digest("hex");
  await supabase.from("ingest_keys").insert({
    name: "demo-key-2",
    key_hash: keyHash,
    active: true,
  });
  console.log("Here is your new key:");
  console.log(rawKey);
}
addKey();
