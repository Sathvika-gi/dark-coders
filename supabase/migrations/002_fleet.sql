-- Migration 002: Fleet Architecture

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

-- Add truck_id and reset_at to shipments
ALTER TABLE shipments ADD COLUMN truck_id UUID REFERENCES trucks(id) ON DELETE CASCADE;
ALTER TABLE shipments ADD COLUMN reset_at TIMESTAMPTZ;

-- Add approval_status to listings
ALTER TABLE listings ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved' CHECK (approval_status IN ('approved','pending','rejected'));
