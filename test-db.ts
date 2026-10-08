import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  console.log("Testing Database Connection...");
  
  // 1. Test Read
  const { data: shipments, error: readError } = await supabase.from("shipments").select("id, code, status").limit(2);
  if (readError) {
    console.error("❌ DB Read Failed:", readError.message);
    process.exit(1);
  }
  console.log("✅ Read successful. Found shipments:", shipments?.length);

  // 2. Test Ingest Key (Auth/Middleware equivalent db check)
  const { data: keys, error: keyErr } = await supabase.from("ingest_keys").select("*").limit(1);
  if (keyErr) {
    console.error("❌ DB Keys Read Failed:", keyErr.message);
    process.exit(1);
  }
  console.log("✅ Authenticator Keys active:", keys?.length);

  console.log("Database connection is 100% healthy.");
}
main();
