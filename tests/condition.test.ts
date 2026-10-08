import { describe, it, expect } from 'vitest';
import { buildConditionRecord } from '../lib/condition';

describe('Condition Records Hash Stability', () => {
  it('builds canonical json and identical hashes for same content', () => {
    const input = {
      order: { id: 'ord-123', code: 'ORD-1001', qty_kg: 50 },
      shipment: { 
        produce_type: 'tomato', 
        truck_id: 'trk-1', 
        origin: 'A', destination: 'B', 
        ideal_temp_range: [10, 15], 
        initial_life_hours: 120, 
        current_tier: 'tier45' 
      },
      retailer: { name: 'FreshMart' },
      listing: { discounted_price: 30 },
      telemetry: [
        { temp_c: 12, burn_rate: 1, recorded_at: '2023-01-01T10:00:00Z', remaining_after: 120 },
        { temp_c: 20, burn_rate: 3, recorded_at: '2023-01-01T11:00:00Z', remaining_after: 116 },
        { temp_c: 25, burn_rate: 4, recorded_at: '2023-01-01T12:00:00Z', remaining_after: 110 },
      ],
      inspection: { verdict: 'rejected' as const, reason: 'Too warm' },
      aiInsightText: 'Spiked temps'
    };

    const out1 = buildConditionRecord(input);
    const out2 = buildConditionRecord(input);

    expect(out1.hash).toBe(out2.hash);
    expect(out1.record.min_temp).toBe(12);
    expect(out1.record.max_temp).toBe(25);
    expect(out1.record.hours_above_ideal).toBe(2);
    expect(out1.record.spike_windows).toBe(2);
    expect(Object.keys(out1.record)).toEqual(Object.keys(out1.record).sort());
  });
});
