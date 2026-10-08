-- AgroSense Database Schema
-- Run this in your Supabase SQL editor.
-- RLS is ENABLED on all tables with NO public policies.
-- The service-role key bypasses RLS (used only server-side).

-- ─────────────────────────────────────────────
-- 1/0. TRUCKS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trucks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  plate        TEXT NOT NULL,
  driver_name  TEXT NOT NULL,
  driver_phone TEXT NOT NULL,
  origin       TEXT NOT NULL,
  destination  TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 1. SHIPMENTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shipments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                 TEXT NOT NULL UNIQUE,
  produce_type         TEXT NOT NULL,        -- 'tomato' | 'banana' | 'spinach' | 'strawberry'
  qty_kg               NUMERIC NOT NULL,
  origin               TEXT NOT NULL,
  destination          TEXT NOT NULL,
  eta_hours            NUMERIC NOT NULL,
  base_price_per_kg    NUMERIC NOT NULL,
  current_price_per_kg NUMERIC NOT NULL,
  remaining_life_hours NUMERIC NOT NULL,
  initial_life_hours   NUMERIC NOT NULL,
  status               TEXT NOT NULL DEFAULT 'in_transit'
                         CHECK (status IN ('in_transit','at_risk','critical','delivered')),
  last_reading_at      TIMESTAMPTZ,
  truck_id             UUID REFERENCES trucks(id) ON DELETE CASCADE,
  reset_at             TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
-- Intentionally NO public policies. Only service-role can access.

-- ─────────────────────────────────────────────
-- 2. TELEMETRY  (APPEND-ONLY via trigger)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS telemetry (
  id               BIGSERIAL PRIMARY KEY,
  shipment_id      UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  temp_c           NUMERIC NOT NULL,
  humidity_pct     NUMERIC NOT NULL,
  recorded_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  burn_rate        NUMERIC NOT NULL,         -- computed burn rate for this reading
  remaining_after  NUMERIC NOT NULL          -- remaining life hours after this reading
);

ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

-- Trigger: block UPDATE and DELETE to keep telemetry append-only
CREATE OR REPLACE FUNCTION prevent_telemetry_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Telemetry rows are append-only and cannot be % ', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS telemetry_no_update ON telemetry;
CREATE TRIGGER telemetry_no_update
  BEFORE UPDATE ON telemetry
  FOR EACH ROW EXECUTE FUNCTION prevent_telemetry_mutation();

DROP TRIGGER IF EXISTS telemetry_no_delete ON telemetry;
CREATE TRIGGER telemetry_no_delete
  BEFORE DELETE ON telemetry
  FOR EACH ROW EXECUTE FUNCTION prevent_telemetry_mutation();

-- ─────────────────────────────────────────────
-- 3. ALERTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  severity    TEXT NOT NULL CHECK (severity IN ('info','warning','critical')),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 4. LISTINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS listings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id          UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  retailer_message     TEXT NOT NULL,
  original_price       NUMERIC NOT NULL,
  discounted_price     NUMERIC NOT NULL,
  discount_pct         NUMERIC NOT NULL,
  remaining_life_hours NUMERIC NOT NULL,
  reason               TEXT NOT NULL,
  active               BOOLEAN NOT NULL DEFAULT true,
  approval_status      TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved','pending','rejected')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE listings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 5. INGEST KEYS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ingest_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  key_hash   TEXT NOT NULL UNIQUE,   -- SHA-256 of the raw key
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ingest_keys ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 6. AI LOGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind          TEXT NOT NULL,      -- 'insight' | 'retailer_message'
  prompt        TEXT NOT NULL,
  response      TEXT NOT NULL,
  latency_ms    INTEGER NOT NULL,
  used_fallback BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 6.5. RETAILERS & SETTINGS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retailers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  area        TEXT NOT NULL,
  distance_km NUMERIC NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE retailers ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- 7. RATE LIMITS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  key          TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (key, window_start)
);

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- INDEXES for performance
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS telemetry_shipment_recorded
  ON telemetry (shipment_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS alerts_shipment_created
  ON alerts (shipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS listings_active_created
  ON listings (active, created_at DESC);

CREATE INDEX IF NOT EXISTS listings_shipment
  ON listings (shipment_id);

-- ─────────────────────────────────────────────
-- 8. CURRENT TIER column for shipments
-- (tracks last discount tier to detect tier changes)
-- ─────────────────────────────────────────────
ALTER TABLE shipments ADD COLUMN IF NOT EXISTS current_tier TEXT DEFAULT 'none';

-- ─────────────────────────────────────────────
-- 9. RATE LIMIT RPC (atomic increment)
-- ─────────────────────────────────────────────
-- This function atomically upserts a rate-limit counter and returns the new count.
-- Used by lib/ratelimit.ts.
CREATE OR REPLACE FUNCTION increment_rate_limit(p_key TEXT, p_window_start TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO rate_limits (key, window_start, count)
  VALUES (p_key, p_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_count;

  RETURN v_count;
END;
$$;

-- ─────────────────────────────────────────────
-- 10. ORDERS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT NOT NULL UNIQUE,
  listing_id   UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  shipment_id  UUID NOT NULL REFERENCES shipments(id) ON DELETE RESTRICT,
  retailer_id  UUID NOT NULL REFERENCES retailers(id) ON DELETE RESTRICT,
  qty_kg       NUMERIC NOT NULL,
  unit_price   NUMERIC NOT NULL,
  total_price  NUMERIC NOT NULL,
  fulfilment   TEXT NOT NULL CHECK (fulfilment IN ('delivery','pickup')),
  pickup_point TEXT,
  eta_minutes  INTEGER,
  status       TEXT NOT NULL DEFAULT 'reserved' 
    CHECK (status IN ('reserved','confirmed','dispatched','delivered','accepted','rejected','paid','expired','cancelled')),
  reject_reason TEXT,
  reject_note   TEXT,
  hold_expires_at TIMESTAMPTZ NOT NULL,
  reserved_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at  TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at  TIMESTAMPTZ,
  inspected_at  TIMESTAMPTZ,
  paid_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('distributor','retailer')),
  recipient_retailer_id UUID REFERENCES retailers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS condition_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  record JSONB NOT NULL,
  record_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE condition_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_condition_record_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Condition records are append-only';
END;
$$;
CREATE TRIGGER condition_no_upd BEFORE UPDATE ON condition_records FOR EACH ROW EXECUTE FUNCTION prevent_condition_record_mutation();
CREATE TRIGGER condition_no_del BEFORE DELETE ON condition_records FOR EACH ROW EXECUTE FUNCTION prevent_condition_record_mutation();

CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1001;

CREATE OR REPLACE FUNCTION reserve_stock(
  p_listing_id UUID,
  p_retailer_id UUID,
  p_qty_kg NUMERIC,
  p_fulfilment TEXT,
  p_hold_minutes INTEGER
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_listing RECORD;
  v_shipment RECORD;
  v_reserved_qty NUMERIC;
  v_available NUMERIC;
  v_order_id UUID;
  v_code TEXT;
  v_total NUMERIC;
BEGIN
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id AND active = true AND approval_status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing not found or inactive'; END IF;
  SELECT * INTO v_shipment FROM shipments WHERE id = v_listing.shipment_id;
  SELECT COALESCE(SUM(qty_kg), 0) INTO v_reserved_qty FROM orders 
  WHERE listing_id = p_listing_id AND status IN ('reserved','confirmed','dispatched','delivered','accepted','paid');
  v_available := v_shipment.qty_kg - v_reserved_qty;
  IF v_available < p_qty_kg THEN RAISE EXCEPTION 'Insufficient stock'; END IF;
  
  v_total := p_qty_kg * v_listing.discounted_price;
  v_code := 'ORD-' || nextval('order_code_seq')::text;
  
  INSERT INTO orders (
    code, listing_id, shipment_id, retailer_id, qty_kg, unit_price, total_price, 
    fulfilment, status, hold_expires_at, reserved_at
  ) VALUES (
    v_code, p_listing_id, v_listing.shipment_id, p_retailer_id, p_qty_kg, v_listing.discounted_price, v_total,
    p_fulfilment, 'reserved', now() + (p_hold_minutes || ' minutes')::interval, now()
  ) RETURNING id INTO v_order_id;
  RETURN json_build_object('id', v_order_id, 'code', v_code);
END;
$$;
