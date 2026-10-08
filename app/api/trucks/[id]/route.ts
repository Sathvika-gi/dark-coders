import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Since we are operating on mock data for the fleet (table missing/empty),
  // return hardcoded truck info + shipments identical to the screenshot.
  // We'll mimic the TRK-101 (critical) data since it matches the mockup.

  const truck = {
    id,
    code: 'TRK-101',
    origin: 'Nashik', // matching screenshot
    destination: 'Mumbai',
    status: 'critical'
  };

  const shipments = [
    {
      id: 'mock-shipment-101',
      code: 'AGS-101',
      produce_type: 'tomato',
      origin: 'Nashik',
      destination: 'Mumbai',
      initial_life_hours: 120,
      remaining_life_hours: 11,
      status: 'critical',
      latest_temp_c: 38.1,
      ideal_temp_range: [10, 14],
      transit_progress_pct: 34
    },
    {
      id: 'mock-shipment-104',
      code: 'AGS-104',
      produce_type: 'strawberry',
      origin: 'Mahabaleshwar',
      destination: 'Bangalore',
      initial_life_hours: 72,
      remaining_life_hours: 31,
      status: 'in_transit',
      latest_temp_c: 2.0,
      ideal_temp_range: [0, 4],
      transit_progress_pct: 90
    },
    {
      id: 'mock-shipment-102',
      code: 'AGS-102',
      produce_type: 'banana',
      origin: 'Jalgaon',
      destination: 'Pune',
      initial_life_hours: 240,
      remaining_life_hours: 101,
      status: 'at_risk',
      latest_temp_c: 13.9,
      ideal_temp_range: [13, 15],
      transit_progress_pct: 58
    }
  ];

  return NextResponse.json({ truck, shipments });
}
