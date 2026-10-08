"use client";
/**
 * app/shipments/[id]/ClientPage.tsx
 * Shipment detail page — gauge, charts, model breakdown, AI insight, simulate panel.
 */

import { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { ShelfLifeGauge } from "@/components/ShelfLifeGauge";
import { TempChart } from "@/components/TempChart";
import { SimulateSpikePanel } from "@/components/SimulateSpikePanel";
import { AIInsightCard } from "@/components/AIInsightCard";
import { RouteProgress } from "@/components/RouteProgress";
import { PRODUCE_PROFILES } from "@/lib/produce";
import { formatRemainingLife } from "@/lib/model";
import { ChevronLeft, TrendingDown, Thermometer, Droplets } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = any;

const STATUS_COLORS: Record<string, string> = {
  in_transit: "#10b981",
  at_risk: "#f59e0b",
  critical: "#ef4444",
  delivered: "#6366f1",
};

export default function ShipmentDetailClient({ id }: { id: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/shipments/${id}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error("[shipment-detail] fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Navbar role="distributor" />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
          <div className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        </main>
      </div>
    );
  }

  if (!data?.shipment) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Navbar role="distributor" />
        <main style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 24px", textAlign: "center", color: "#64748b" }}>
          Shipment not found.
        </main>
      </div>
    );
  }

  const { shipment, telemetry, alerts, breakdown, active_listing } = data;
  const profile = PRODUCE_PROFILES[shipment.produce_type] ?? { emoji: "📦", name: shipment.produce_type, tRef: 15 };
  const statusColor = STATUS_COLORS[shipment.status] ?? "#10b981";
  const aiInsight = alerts?.[0]?.message ?? null;

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar role="distributor" />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Breadcrumb */}
        <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#64748b", fontSize: 14, textDecoration: "none", marginBottom: 20 }}>
          <ChevronLeft size={14} /> Back to Dashboard
        </Link>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 48 }}>{profile.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <h1 style={{ fontSize: 26, fontWeight: 800, color: "#f1f5f9", margin: 0 }}>
                {profile.name}
              </h1>
              <span
                style={{
                  background: statusColor + "22",
                  color: statusColor,
                  border: `1px solid ${statusColor}44`,
                  padding: "3px 12px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {shipment.status.replace("_", " ")}
              </span>
            </div>
            <div style={{ color: "#64748b", fontSize: 14 }}>
              {shipment.code} · {shipment.qty_kg}kg · {shipment.origin} → {shipment.destination}
            </div>
          </div>
        </div>

        {/* Top row: gauge + pricing + route */}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: 20, marginBottom: 24, alignItems: "start" }}>
          {/* Gauge */}
          <div className="glass-card" style={{ padding: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <ShelfLifeGauge
              remainingHours={shipment.remaining_life_hours}
              initialHours={shipment.initial_life_hours}
              size={160}
            />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>Freshness Window</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: "#10b981" }}>
                  {formatRemainingLife(shipment.initial_life_hours)}
                </span>
                <span style={{ color: "#475569" }}>→</span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 700,
                    color: shipment.remaining_life_hours <= 18 ? "#ef4444" : shipment.remaining_life_hours <= 36 ? "#f59e0b" : "#10b981",
                  }}
                >
                  {formatRemainingLife(shipment.remaining_life_hours)}
                </span>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 14px 0", fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>
              Current Pricing
            </h3>
            {shipment.current_price_per_kg < shipment.base_price_per_kg ? (
              <>
                <div className="price-strikethrough" style={{ fontSize: 18, marginBottom: 6 }}>
                  ₹{shipment.base_price_per_kg}/kg
                </div>
                <div style={{ fontSize: 36, fontWeight: 800, color: "#ef4444", lineHeight: 1 }}>
                  ₹{shipment.current_price_per_kg}
                  <span style={{ fontSize: 16, fontWeight: 500 }}>/kg</span>
                </div>
                {active_listing && (
                  <span
                    className="badge-critical"
                    style={{ padding: "4px 12px", borderRadius: 12, fontSize: 13, fontWeight: 700, display: "inline-block", marginTop: 8 }}
                  >
                    −{active_listing.discount_pct}% FLASH MARKDOWN
                  </span>
                )}
              </>
            ) : (
              <div style={{ fontSize: 36, fontWeight: 800, color: "#10b981", lineHeight: 1 }}>
                ₹{shipment.current_price_per_kg}
                <span style={{ fontSize: 16, fontWeight: 500 }}>/kg</span>
              </div>
            )}
            {active_listing && (
              <p style={{ margin: "12px 0 0 0", fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                {active_listing.reason}
              </p>
            )}
          </div>

          {/* Route */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>
              Route Progress
            </h3>
            <RouteProgress
              origin={shipment.origin}
              destination={shipment.destination}
              progressPct={Math.random() * 40 + 20}
            />
            <div style={{ marginTop: 16, fontSize: 13, color: "#64748b" }}>
              ETA: <strong style={{ color: "#94a3b8" }}>{shipment.eta_hours}h</strong>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Thermometer size={15} color="#f87171" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>
                Temperature
              </h3>
            </div>
            <TempChart data={telemetry ?? []} tRef={profile.tRef ?? 12} />
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Droplets size={15} color="#60a5fa" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>
                Humidity
              </h3>
            </div>
            {/* Simple humidity display */}
            {telemetry?.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {telemetry.slice(-8).map((t: Data, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontSize: 11, color: "#475569", width: 42, flexShrink: 0 }}>
                      {new Date(t.recorded_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${t.humidity_pct}%`, height: "100%", background: "linear-gradient(90deg,#38bdf8,#60a5fa)", borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 12, color: "#60a5fa", width: 40, textAlign: "right" }}>
                      {t.humidity_pct}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", color: "#475569", fontSize: 14, paddingTop: 40 }}>
                No telemetry yet
              </div>
            )}
          </div>
        </div>

        {/* Model breakdown */}
        {breakdown?.length > 0 && (
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <TrendingDown size={15} color="#f59e0b" />
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#e2e8f0" }}>
                Why Shelf Life Dropped
              </h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {breakdown.slice(-10).map((b: Data) => (
                <div
                  key={b.index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: b.effectiveBurn > 3 ? "rgba(239,68,68,0.07)" : "rgba(255,255,255,0.03)",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: "#cbd5e1" }}>{b.label}</span>
                  <span style={{ color: b.effectiveBurn > 3 ? "#f87171" : "#94a3b8", fontWeight: 600, fontSize: 12 }}>
                    ×{b.effectiveBurn.toFixed(2)} burn
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Insight */}
        {aiInsight && (
          <div style={{ marginBottom: 24 }}>
            <AIInsightCard insight={aiInsight} />
          </div>
        )}

        {/* Simulate panel */}
        <SimulateSpikePanel shipmentId={id} onComplete={fetchData} />
      </main>
    </div>
  );
}
