import { describe, it, expect } from 'vitest';
import { assertTransition, allowedTransitions } from './orders';

describe('Order State Machine', () => {
  it('distributor transitions', () => {
    expect(allowedTransitions('reserved', 'distributor')).toEqual(['confirmed']);
    expect(allowedTransitions('confirmed', 'distributor')).toEqual(['dispatched']);
    expect(allowedTransitions('dispatched', 'distributor')).toEqual(['delivered']);
    expect(allowedTransitions('delivered', 'distributor')).toEqual([]); // Retailer handles next steps
  });

  it('retailer transitions', () => {
    expect(allowedTransitions('reserved', 'retailer')).toEqual(['cancelled']);
    expect(allowedTransitions('delivered', 'retailer')).toEqual(['accepted', 'rejected']);
    expect(allowedTransitions('accepted', 'retailer')).toEqual(['paid']);
    expect(allowedTransitions('confirmed', 'retailer')).toEqual([]); // Retailer cannot dispatch
  });

  it('assertTransition throws on invalid targets', () => {
    // Retailer trying a distributor step
    expect(() => assertTransition('reserved', 'confirmed', 'retailer')).toThrow('Invalid transition');
    // Skipping a status
    expect(() => assertTransition('reserved', 'dispatched', 'distributor')).toThrow('Invalid transition');
    // Success scenario does not throw
    expect(() => assertTransition('delivered', 'accepted', 'retailer')).not.toThrow();
  });
});
