"use client";
/**
 * components/RouteProgress.tsx
 * Animated progress bar: origin → destination.
 * Percentage = 1 - (eta_hours / initial_eta_hours) — simplified visual.
 */

import { MapPin } from "lucide-react";

interface RouteProgressProps {
  origin: string;
  destination: string;
  /** 0-100 progress percentage */
  progressPct: number;
}

export function RouteProgress({ origin, destination, progressPct }: RouteProgressProps) {
  const pct = Math.min(100, Math.max(0, progressPct));

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontSize: 12,
          color: "#94a3b8",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={11} color="#10b981" />
          {origin}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <MapPin size={11} color="#f59e0b" />
          {destination}
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: 6,
          background: "rgba(255,255,255,0.07)",
          borderRadius: 4,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Fill */}
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: "linear-gradient(90deg, #10b981, #f59e0b)",
            borderRadius: 4,
            transition: "width 0.8s ease",
            boxShadow: "0 0 8px rgba(16,185,129,0.5)",
          }}
        />
        {/* Truck icon at current position */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            fontSize: 12,
            lineHeight: 1,
            filter: "drop-shadow(0 0 4px white)",
          }}
        >
          🚚
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: "#475569",
          marginTop: 4,
        }}
      >
        {pct.toFixed(0)}% complete
      </div>
    </div>
  );
}
