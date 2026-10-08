# AgroSense Orders Lifecycle Implementation Plan (Part 2)

## Phase 1: Database (Migrations, Schema & RPC)
- **`003_orders.sql`**: Add `orders`, `payments`, `notifications`, and `condition_records` tables. Add triggers for append-only `condition_records`.
- **`reserve_stock` RPC**: Implement a PostgreSQL function using `SELECT ... FOR UPDATE` to securely lock the listing row, verify `available_kg` (computed dynamically as listing `qty_kg` minus reserved/sold orders), and insert the order row with a `hold_expires_at` timestamp.
- **Update `supabase/schema.sql`** with identical definitions.

## Phase 2: Core Domain Logic
- **`lib/orders.ts`**: Pure state machine identifying legal transitions (`reserved -> confirmed -> dispatched -> delivered -> inspected -> paid`, plus branching for rejection/cancellation). Implement `assertTransition(current, target, role)`. Thorough Vitest coverage.
- **`lib/condition.ts`**: Pure function to compute the condition record blob and sort its keys for deterministic SHA-256 hashing. Vitest coverage provided.

## Phase 3: APIs & Data Plumbing
- API routes for Role-based order transitioning (all protected by Zod schemas, auth, and state guards).
  - Retailer: `POST /api/orders` (Reserve), `POST /api/orders/[id]/inspect`, `POST /api/orders/[id]/pay`, `POST /api/orders/[id]/cancel`
  - Distributor: `POST /api/orders/[id]/confirm`, `POST /api/orders/[id]/dispatch`, `POST /api/orders/[id]/deliver`
- **Notifications Feed**: `GET /api/notifications` for real-time polling updates.
- **Concurrency Script**: Create `scripts/test-concurrency.js` to spam Reserve requests and verify precisely one succeeds if stock is depleted.

## Phase 4: UI Development (Role-Aware Order Management)
- **Navbar**: Add Notification bell with indicator and dropdown.
- **Marketplace Drawer**: Revamp stock reservation drawer with Delivery vs Pickup segment control, fetching actual remaining stock dynamically.
- **/orders**: Unified page with role divergence:
  - Distributor: "Needs action", "In progress", "Completed". Action drawers.
  - Retailer: Horizontal visual stepper (Reserved -> Dispatched -> Paid), inspection actions, mock payment drawer.
- **/orders/[id]/record**: Printable condition record, layout structured explicitly for CSS `print` rendering.

## Phase 5: Acceptance & Polish
- Ensure static builds (`npm run build`) and logic (`npm test`) fully pass.
- Demo verification covering end-to-end interactions and strict role boundaries.
