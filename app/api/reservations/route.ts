import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const reserveSchema = z.object({
  listing_id: z.string().uuid(),
  qty_kg: z.number().int().positive()
});

export async function POST(req: NextRequest) {
  const authResult = await requireRole("retailer");
  if (authResult instanceof Response) return authResult;

  try {
    const json = await req.json();
    const { listing_id, qty_kg } = reserveSchema.parse(json);

    // Fetch listing for prices and active status
    const { data: listing, error: listingErr } = await db
      .from("listings")
      .select("*, shipments(qty_kg)")
      .eq("id", listing_id)
      .eq("active", true)
      .single();

    if (listingErr || !listing) {
      return Response.json({ error: "Active listing not found" }, { status: 404 });
    }

    // Verify availability
    const { data: reservations } = await db
      .from("reservations")
      .select("qty_kg")
      .eq("listing_id", listing_id);
      
    const reservedTotal = reservations?.reduce((sum, r) => sum + r.qty_kg, 0) ?? 0;
    const shipmentQty = Array.isArray(listing.shipments) ? listing.shipments[0]?.qty_kg : (listing.shipments as { qty_kg?: number })?.qty_kg;
    const available_kg = Math.max(0, (shipmentQty || 0) - reservedTotal);

    if (qty_kg > available_kg) {
      return Response.json({ error: "Requested quantity exceeds available stock" }, { status: 400 });
    }

    // Calculate total on server using trusted listing price
    const total_price = qty_kg * listing.discounted_price;

    const { data: reservation, error: reserveErr } = await db
      .from("reservations")
      .insert({
        listing_id,
        qty_kg,
        total_price
      })
      .select()
      .single();

    if (reserveErr) throw new Error("Reservation insert failed: " + reserveErr.message);

    return Response.json({ success: true, reservation });
  } catch (e: unknown) {
    console.error("[api] Reservation Error:", e);
    return Response.json({ error: (e as Error).message || "Invalid request" }, { status: 400 });
  }
}
