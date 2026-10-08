-- Migration 003: Orders Lifecycle

-- 1. Upgrade reservations to orders
ALTER TABLE IF EXISTS reservations RENAME TO orders;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    CREATE TABLE public.orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
      qty_kg NUMERIC NOT NULL,
      total_price NUMERIC NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS shipment_id UUID REFERENCES shipments(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS retailer_id UUID REFERENCES retailers(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC,
  ADD COLUMN IF NOT EXISTS fulfilment TEXT CHECK (fulfilment IN ('delivery','pickup')),
  ADD COLUMN IF NOT EXISTS pickup_point TEXT,
  ADD COLUMN IF NOT EXISTS eta_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'reserved' 
    CHECK (status IN ('reserved','confirmed','dispatched','delivered','accepted','rejected','paid','expired','cancelled')),
  ADD COLUMN IF NOT EXISTS reject_reason TEXT,
  ADD COLUMN IF NOT EXISTS reject_note TEXT,
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE SEQUENCE IF NOT EXISTS order_code_seq START 1001;
UPDATE public.orders SET code = 'ORD-' || nextval('order_code_seq')::text WHERE code IS NULL;
ALTER TABLE public.orders ALTER COLUMN code SET NOT NULL;

-- 2. Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 3. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
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
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Condition Records (Append-only)
CREATE TABLE IF NOT EXISTS public.condition_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  record JSONB NOT NULL,
  record_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.condition_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION prevent_condition_record_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $trigger$
BEGIN
  RAISE EXCEPTION 'Condition records are append-only and immutable.';
END;
$trigger$;

DROP TRIGGER IF EXISTS condition_records_no_update ON condition_records;
CREATE TRIGGER condition_records_no_update BEFORE UPDATE ON condition_records FOR EACH ROW EXECUTE FUNCTION prevent_condition_record_mutation();
DROP TRIGGER IF EXISTS condition_records_no_delete ON condition_records;
CREATE TRIGGER condition_records_no_delete BEFORE DELETE ON condition_records FOR EACH ROW EXECUTE FUNCTION prevent_condition_record_mutation();

-- 5. RPC function to reserve stock atomically
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
  -- Lock listing row
  SELECT * INTO v_listing FROM listings WHERE id = p_listing_id AND active = true AND approval_status = 'approved' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found or inactive';
  END IF;

  SELECT * INTO v_shipment FROM shipments WHERE id = v_listing.shipment_id;

  -- Compute available taking into account all non-released orders
  SELECT COALESCE(SUM(qty_kg), 0) INTO v_reserved_qty FROM orders 
  WHERE listing_id = p_listing_id 
    AND status IN ('reserved','confirmed','dispatched','delivered','accepted','paid');

  v_available := v_shipment.qty_kg - v_reserved_qty;

  IF v_available < p_qty_kg THEN
    RAISE EXCEPTION 'Insufficient stock';
  END IF;

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
