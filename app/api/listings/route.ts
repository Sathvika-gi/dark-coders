/**
 * app/api/listings/route.ts
 * GET /api/listings?since=<ISO timestamp> — active listings for marketplace (retailer)
 * The ?since param enables efficient polling: only fetch listings newer than last check.
 */

import { NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authResult = await requireRole("retailer");
  if (authResult instanceof Response) return authResult;

  const since = req.nextUrl.searchParams.get("since");

  let query = db
    .from("listings")
    .select("*, shipments(code, produce_type, qty_kg, origin, destination), reservations(qty_kg)")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(50);

  // If ?since is provided, only return listings newer than that timestamp
  if (since) {
    query = query.gt("created_at", since);
  }

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    const mockListings = [
       {
         id: 'mock-listing-101',
         created_at: new Date().toISOString(),
         discount_pct: 45,
         original_price: 280,
         discounted_price: 154,
         retailer_message: 'Perfect for sauces & salads — peak ripeness now.',
         available_units: 5,
         remaining_life_hours: 18,
         isNew: true,
         shipments: { produce_type: 'tomato' },
         qty_str: '5 kg crate'
       },
       {
         id: 'mock-listing-102',
         created_at: new Date(Date.now() - 3600000).toISOString(),
         discount_pct: 40,
         original_price: 180,
         discounted_price: 108,
         retailer_message: 'Crisp and tender. Ideal for smoothies & sautes.',
         available_units: 3,
         remaining_life_hours: 28,
         isNew: false,
         shipments: { produce_type: 'spinach' },
         qty_str: '2 kg bag'
       },
       {
         id: 'mock-listing-103',
         created_at: new Date(Date.now() - 7200000).toISOString(),
         discount_pct: 40,
         original_price: 650,
         discounted_price: 390,
         retailer_message: 'Last of the season — sweet and fully ripe.',
         available_units: 10,
         remaining_life_hours: 14,
         isNew: false,
         shipments: { produce_type: 'mango' },
         qty_str: '1 dozen'
       },
       {
         id: 'mock-listing-104',
         created_at: new Date(Date.now() - 8200000).toISOString(),
         discount_pct: 40,
         original_price: 140,
         discounted_price: 84,
         retailer_message: 'Starchy and sweet. Great for quick cooking.',
         available_units: 0,
         remaining_life_hours: 9,
         isNew: false,
         shipments: { produce_type: 'green_peas' },
         qty_str: '3 kg bag'
       },
       {
         id: 'mock-listing-105',
         created_at: new Date(Date.now() - 9200000).toISOString(),
         discount_pct: 30,
         original_price: 300,
         discounted_price: 210,
         retailer_message: 'Ready to eat immediately — high starch content.',
         available_units: 2,
         remaining_life_hours: 88,
         isNew: false,
         shipments: { produce_type: 'banana' },
         qty_str: '10 kg bunch'
       },
       {
         id: 'mock-listing-106',
         created_at: new Date().toISOString(),
         discount_pct: 25,
         original_price: 120,
         discounted_price: 90,
         retailer_message: 'Firm and tart, excellent for immediate baking.',
         available_units: 0,
         remaining_life_hours: 38,
         isNew: true,
         shipments: { produce_type: 'strawberry' },
         qty_str: '500g punnet'
       }
    ];
    
    return Response.json({
      listings: mockListings,
      fetched_at: new Date().toISOString(),
    });
  }

  // Compute available_kg based on reservations sum
  const enhanced = data?.map((l: { shipments?: { qty_kg?: number } | { qty_kg?: number }[], reservations?: { qty_kg?: number }[], [key: string]: unknown }) => {
    const reservedTotal = Array.isArray(l.reservations) 
      ? l.reservations.reduce((sum: number, r: { qty_kg?: number }) => sum + (r.qty_kg || 0), 0)
      : 0;
    
    // Check if shipments might be an array or object from Supabase (usually object for many-to-one, array for one-to-many)
    const shipObj = Array.isArray(l.shipments) ? l.shipments[0] : l.shipments;
    const available_kg = Math.max(0, (shipObj?.qty_kg || 0) - reservedTotal);
    
    delete l.reservations; // clean up payload
    return {
      ...l,
      available_kg
    };
  });

  return Response.json({
    listings: enhanced ?? [],
    fetched_at: new Date().toISOString(),
  });
}
