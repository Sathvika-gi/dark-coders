"use client";
/**
 * components/ShipmentCard.tsx
 * Card shown on the dashboard grid for a single shipment.
 */

import { useRouter } from "next/navigation";
import { ShelfLifeGauge } from "./ShelfLifeGauge";
import { RouteProgress } from "./RouteProgress";
import { PRODUCE_PROFILES } from "@/lib/produce";
import { Thermometer, Clock } from "lucide-react";

interface Shipment {
  id: string;
  code: string;
  produce_type: string;
  qty_kg: number;
  origin: string;
  destination: string;
  eta_hours: number;
  base_price_per_kg: number;
  current_price_per_kg: number;
  remaining_life_hours: number;
  initial_life_hours: number;
  status: string;
  last_reading_at: string | null;
}

interface ShipmentCardProps {
  shipment: Shipment;
}

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  in_transit: { label: "In Transit", cls: "badge-fresh" },
  at_risk: { label: "At Risk", cls: "badge-warning" },
  critical: { label: "Critical", cls: "badge-critical" },
  delivered: { label: "Delivered", cls: "badge-info" },
};

export function ShipmentCard({ shipment }: ShipmentCardProps) {
  const router = useRouter();
  const profile = PRODUCE_PROFILES[shipment.produce_type] ?? {
    emoji: "📦", name: shipment.produce_type,
  };
  const status = STATUS_STYLES[shipment.status] ?? STATUS_STYLES.in_transit;
  const discountPct =
    shipment.current_price_per_kg < shipment.base_price_per_kg
      ? Math.round(
          ((shipment.base_price_per_kg - shipment.current_price_per_kg) /
            shipment.base_price_per_kg) *
            100
        )
      : 0;

  return (
    <div
      id={`shipment-card-${shipment.code}`}
      className="glass-card"
      style={{ padding: 20, cursor: "pointer", transition: "transform 0.18s" }}
      onClick={() => router.push(`/shipments/${shipment.id}`)}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.transform = "translateY(-3px)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.transform = "translateY(0)")
      }
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 28 }}>{profile.emoji}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
              {profile.name}
            </div>
            <div style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>
              {shipment.code} · {shipment.qty_kg}kg
            </div>
          </div>
        </div>
        <span className={status.cls} style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>
          {status.label}
        </span>
      </div>

      {/* Gauge + Price */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <ShelfLifeGauge
          remainingHours={shipment.remaining_life_hours}
          initialHours={shipment.initial_life_hours}
          size={100}
        />

        <div style={{ textAlign: "right" }}>
          {discountPct > 0 && (
            <div style={{ fontSize: 11, color: "var(--text-muted)", textDecoration: "line-through" }}>
              ₹{shipment.base_price_per_kg}/kg
            </div>
          )}
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: discountPct > 0 ? "#ef4444" : "#10b981",
            }}
          >
            ₹{shipment.current_price_per_kg.toFixed(2)}
            <span style={{ fontSize: 12, fontWeight: 500 }}>/kg</span>
          </div>
          {discountPct > 0 && (
            <span className="badge-critical" style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
              -{discountPct}%
            </span>
          )}
        </div>
      </div>

      {/* Temperature reading */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, fontSize: 13, color: "#94a3b8" }}>
        <Thermometer size={13} />
        <span>Last reading: {shipment.last_reading_at ? new Date(shipment.last_reading_at).toLocaleTimeString() : "No readings yet"}</span>
      </div>

      {/* Route progress */}
      <RouteProgress
        origin={shipment.origin}
        destination={shipment.destination}
        progressPct={Math.random() * 40 + 20} // visual only; no GPS
      />

      {/* ETA chip */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, fontSize: 12, color: "#64748b" }}>
        <Clock size={11} />
        <span>ETA: {shipment.eta_hours}h</span>
      </div>
    </div>
  );
}
