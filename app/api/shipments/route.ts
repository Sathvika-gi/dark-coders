import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProfile } from "@/lib/produce";

export async function GET() {
  const authResult = await requireRole("distributor");
  if (authResult instanceof Response) return authResult;

  const { data, error } = await db
    .from("shipments")
    .select(`
      *,
      telemetry ( temp_c, recorded_at )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: "Failed to fetch shipments" }, { status: 500 });
  }

  // Calculate read-only UI fields
  const enhanced = data.map((s: { produce_type: string, created_at: string, eta_hours?: number, telemetry?: { temp_c: number, recorded_at: string }[], [key: string]: unknown }) => {
    const profile = getProfile(s.produce_type);
    
    // Sort telemetry to get the latest reading
    const sortedTele = Array.isArray(s.telemetry) 
      ? s.telemetry.sort((a: { recorded_at: string }, b: { recorded_at: string }) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
      : [];
      
    const latest_temp_c = sortedTele.length > 0 ? sortedTele[0].temp_c : null;
    
    // Elapsed time calculation in real hours based on first and last telemetry, or created_at
    let elapsedRealH = 0;
    if (sortedTele.length > 1) {
      const first = new Date(sortedTele[sortedTele.length - 1].recorded_at).getTime();
      const last = new Date(sortedTele[0].recorded_at).getTime();
      elapsedRealH = (last - first) / 3600000;
    } else {
      const created = new Date(s.created_at).getTime();
      elapsedRealH = (Date.now() - created) / 3600000;
    }
    
    // Progress %
    const etaH = s.eta_hours || 1;
    const progressPct = Math.min(100, Math.max(0, Math.round((elapsedRealH / etaH) * 100)));

    // Ensure we don't pass massive arrays of telemetry down to the grid list API response
    // (We only used it to get latest_temp_c)
    delete s.telemetry;

    return {
      ...s,
      latest_temp_c,
      ideal_temp_range: [profile.tRef - 2, profile.tRef + 2], // Arbitrary +/- 2 ideal band
      transit_progress_pct: progressPct
    };
  });

  return Response.json({ shipments: enhanced });
}
