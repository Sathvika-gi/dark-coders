# AgroSense Fleet Overview Implementation Plan

## Phase 1: Database Model & Seed Update (supabase/migrations, schema, seed)
- Add tables `trucks`, `retailers`, `settings` to `supabase/schema.sql`.
- Update `shipments` to include `truck_id` and `reset_at` (timestamptz) column.
- Update `listings` to include `approval_status` (approved, pending, rejected).
- Ensure queries and indexes are optimal.
- Modify `supabase/seed.ts` to include trucks (TRK-101, TRK-102, TRK-103), link shipments to those trucks, seed dummy retailers, and setup initial settings (`auto_list_critical = true`).
- Ensure `lib/produce.ts` has `mango` and `green_peas` vitest profiles matching new requirements.

## Phase 2: Core Domain Logic & Settings API
- Build `lib/trucks.ts` encapsulating pure logic functions for summarizing truck metrics. Write extensive unit tests.
- Modify `lib/pipeline.ts` to set `approval_status = 'approved'` if `settings.auto_list_critical` is true, else `'pending'`. Write unit tests for both branches.
- Implement API routes:
  - `GET /PUT /api/settings/auto-list`
  - `POST /api/listings/[id]/approve` and `/reject`
- Modify `lib/ai.ts` to pass truck context for anomaly insights.

## Phase 3: APIs update for Trucks, Shipments and Simulator
- Implement `GET /api/trucks` endpoint for dashboard listing.
- Implement `GET /api/trucks/[id]` endpoint.
- Implement `POST /api/trucks/[id]/simulate` for running parallel simulation scenarios (`spike`, `mild`) across all shipments mapped to the truck.
- Update `/api/demo/reset` to modify `reset_at` instead of deleting telemetry, and update queries everywhere to filter `recorded_at > reset_at`.

## Phase 4: Retailer & Auth Flow Updates
- Enhance `/api/retailers/public` to expose distances and names.
- Update login logic to record selected `retailer_id` on login when retailer is chosen.
- Modify the `GET /api/listings` retailer feed to join truck ETAs and retailer distances safely and only show `approved` + `active` ones.

## Phase 5: Distributor & Retailer UIs
- Update main Dashboard (`/dashboard`) -> Fleet view mapping Truck metrics, KPI tiles (Auto-list critical switch injected).
- Build `/trucks/[id]` with embedded Shipment cards + complete 4-step simulator for the truck.
- Preserve individual `/shipments/[id]` layout but fix breadcrumb.
- Add retailer store selector drop-down on `/login`.
- Update `/marketplace` polling and cards displaying truck distances + arrival info + fresh toast animations.

## Phase 6: Acceptance Testing & Cleanup
- Validate logic and tests using `npm test`, `npm run lint` and `npm run build`.
- Execute all manual validation behaviors in Phase 5 from prompt manually using simulator subagent.
- Final cleanups.
