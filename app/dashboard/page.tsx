"use client";
/**
 * app/dashboard/page.tsx
 * Distributor dashboard — KPI strip + shipment cards + alert feed.
 * Polls every 2 seconds for fresh data.
 */

import { useEffect, useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { ShipmentCard } from "@/components/ShipmentCard";
import { AlertFeed } from "@/components/AlertFeed";
import { Package, AlertTriangle, TrendingUp, Clock } from "lucide-react";

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Alert = any;

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div
      className="glass-card"
      style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}
    >
      <div
        style={{
          background: color + "22",
          border: `1px solid ${color}44`,
          borderRadius: 10,
          padding: 10,
        }}
      >
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{label}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [sRes, aRes] = await Promise.all([
        fetch("/api/shipments"),
        fetch("/api/alerts"),
      ]);
      if (sRes.ok) {
        const { shipments } = await sRes.json();
        setShipments(shipments ?? []);
      }
      if (aRes.ok) {
        const { alerts } = await aRes.json();
        setAlerts(alerts ?? []);
      }
    } catch (e) {
      console.error("[dashboard] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // KPI computations
  const inTransit = shipments.filter((s) => s.status === "in_transit").length;
  const atRisk = shipments.filter(
    (s) => s.status === "at_risk" || s.status === "critical"
  ).length;
  const avgRemaining =
    shipments.length > 0
      ? shipments.reduce((sum, s) => sum + s.remaining_life_hours, 0) / shipments.length
      : 0;
  const totalValue = shipments.reduce(
    (sum, s) => sum + s.qty_kg * s.current_price_per_kg,
    0
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar role="distributor" />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
            Control Tower
          </h1>
          <p style={{ color: "#64748b", fontSize: 14, margin: "4px 0 0 0" }}>
            Live cold-chain overview — auto-refreshing every 2s
          </p>
        </div>

        {/* KPI strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 36,
          }}
        >
          <KpiCard icon={Package} label="In Transit" value={inTransit} color="#10b981" />
          <KpiCard icon={AlertTriangle} label="At Risk / Critical" value={atRisk} color="#ef4444" />
          <KpiCard
            icon={TrendingUp}
            label="Est. Produce Value"
            value={`₹${(totalValue / 1000).toFixed(1)}K`}
            color="#6366f1"
          />
          <KpiCard
            icon={Clock}
            label="Avg Remaining Life"
            value={`${avgRemaining.toFixed(0)}h`}
            color="#f59e0b"
          />
        </div>

        {/* Shipment grid */}
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", marginBottom: 18 }}>
          Active Shipments
        </h2>

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 20,
              marginBottom: 40,
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton" style={{ height: 280, borderRadius: 16 }} />
            ))}
          </div>
        ) : shipments.length === 0 ? (
          <div
            className="glass-card"
            style={{
              padding: 40,
              textAlign: "center",
              marginBottom: 40,
              color: "#475569",
              fontSize: 15,
            }}
          >
            No active shipments. Run the seed script to add demo data.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 20,
              marginBottom: 40,
            }}
          >
            {shipments.map((s) => (
              <ShipmentCard key={s.id} shipment={s} />
            ))}
          </div>
        )}

        {/* Alert feed */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: "0 0 18px 0" }}>
            Live Alert Feed
          </h2>
          <AlertFeed alerts={alerts} />
        </div>
      </main>
    </div>
  );
}
