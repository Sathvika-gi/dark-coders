import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getProfile } from '@/lib/produce';
import { getTruckStatus, getSoonestSpoil, getTransitProgressPct } from '@/lib/trucks';



export async function GET() {
  const { data: trucks, error } = await db
    .from('trucks')
    .select(`
      *,
      shipments (*)
    `);

  if (error || !trucks || trucks.length === 0) {
    // DB not updated or seeded yet, return mock truck data to keep UI workable
    return NextResponse.json({
      trucks: [
        {
          id: 'mock-trk-101',
          code: 'TRK-101',
          plate: 'TN-09-AB-1234',
          origin: 'Hosur',
          destination: 'Chennai',
          status: 'critical',
          productCount: 3,
          produceEmojis: ['🍅', '🥬', '🫛'],
          soonestSpoil: 'Spinach, 18h',
          cargo_temp: 38.0,
          progressPct: 65,
        },
        {
          id: 'mock-trk-102',
          code: 'TRK-102',
          plate: 'TN-10-XY-9876',
          origin: 'Krishnagiri',
          destination: 'Chennai',
          status: 'in_transit',
          productCount: 2,
          produceEmojis: ['🍌', '🥭'],
          soonestSpoil: 'Mangoes, 130h',
          cargo_temp: 14.2,
          progressPct: 45,
        },
        {
          id: 'mock-trk-103',
          code: 'TRK-103',
          plate: 'TN-04-ZZ-5555',
          origin: 'Theni',
          destination: 'Chennai',
          status: 'at_risk',
          productCount: 2,
          produceEmojis: ['🍓', '🍅'],
          soonestSpoil: 'Strawberries, 32h',
          cargo_temp: 22.0,
          progressPct: 80,
        }
      ]
    });
  }

  const mapped = trucks.map((t: any) => {
    const statuses = t.shipments.map((s: any) => s.status);
    const truckStatus = getTruckStatus(statuses);
    const spoil = getSoonestSpoil(t.shipments);
    
    // Produce emoji list array
    const produceEmojis = Array.from(new Set(t.shipments.map((s: any) => getProfile(s.produce_type).emoji)));
    
    return {
      id: t.id,
      code: t.code,
      plate: t.plate,
      origin: t.origin,
      destination: t.destination,
      status: truckStatus,
      productCount: t.shipments.length,
      produceEmojis,
      soonestSpoil: spoil ? `${spoil.produceName}, ${spoil.hours}h` : 'N/A',
      cargo_temp: 14.5, // Mock joined telemetry if missing
      progressPct: getTransitProgressPct(t.shipments)
    };
  });

  return NextResponse.json({ trucks: mapped });
}
