export type OrderStatus = 'reserved' | 'confirmed' | 'dispatched' | 'delivered' | 'accepted' | 'rejected' | 'paid' | 'expired' | 'cancelled';
export type UserRole = 'distributor' | 'retailer';

export function allowedTransitions(status: OrderStatus, role: UserRole): OrderStatus[] {
  if (role === 'distributor') {
    switch (status) {
      case 'reserved': return ['confirmed'];
      case 'confirmed': return ['dispatched'];
      case 'dispatched': return ['delivered'];
      default: return [];
    }
  } else if (role === 'retailer') {
    switch (status) {
      case 'reserved': return ['cancelled'];
      case 'delivered': return ['accepted', 'rejected'];
      case 'accepted': return ['paid'];
      default: return [];
    }
  }
  return [];
}

export function assertTransition(current: OrderStatus, target: OrderStatus, role: UserRole): void {
  const allowed = allowedTransitions(current, role);
  if (!allowed.includes(target)) {
    throw new Error(`Invalid transition from ${current} to ${target} for role ${role}`);
  }
}
